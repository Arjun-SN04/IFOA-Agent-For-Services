/**
 * invoiceStatus.js
 *
 * Single source of truth for the live status badge shown on an invoice.
 *
 * Used by BOTH the admin dashboard (AdminDashboard.jsx → InvoicePanel) and the
 * client subscription page (SubscriptionPage.jsx → ViewAllInvoices / individual
 * + airline cards). Keeping the logic here guarantees the badge is identical on
 * every surface and stays in sync as the registration's active/queued plan
 * changes over time.
 *
 * The badge is DYNAMIC and derived from the registration's live state:
 *   - `reg.invoiceNumber`  — always points to the currently ACTIVE plan's invoice.
 *                            When a queued renewal activates, the backend flips
 *                            this to the renewal's number, so the Active badge
 *                            automatically moves to the renewal invoice.
 *   - `reg.nextRenewal`    — a paid-but-future renewal (queued) → shows "Queued".
 *   - `reg.holderGroups`   — per-upgrade live status (active / expired / pending).
 *   - `reg.expirationDate` — drives whether the current period is still live.
 *
 * Usage:
 *   import { getInvoiceStatus } from '../utils/invoiceStatus'
 *   const badge = getInvoiceStatus(doc, reg, { isHolderUpgrade, activeInvoiceNum })
 *   if (badge) <span className={badge.cls}>{badge.label}</span>
 */

const BADGES = {
  active:     { label: 'Active',     cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  queued:     { label: 'Queued',     cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  expired:    { label: 'Expired',    cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  pending:    { label: 'Pending',    cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  superseded: { label: 'Renewed', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
}

/**
 * @param {object}  doc  An invoice/renewal/payment item from /invoices/by-registration
 * @param {object}  reg  The registration (airline / individual) it belongs to
 * @param {object}  [opts]
 * @param {boolean} [opts.isHolderUpgrade]  Whether the caller classified doc as a holder-upgrade
 * @param {string}  [opts.activeInvoiceNum] Admin-tracked active invoice number (falls back to reg.invoiceNumber)
 * @returns {{label: string, cls: string} | null}
 */
export function getInvoiceStatus(doc, reg, opts = {}) {
  if (!doc) return null
  // Custom one-off admin invoices have NO subscription lifecycle — they are standalone
  // documents, so they must never inherit the registration's expired/superseded/active
  // state (which is what made a fresh custom invoice show "Expired" under an expired base).
  if (doc.purpose === 'custom') return null
  const now = Date.now()

  const isHolderUpgrade = !!opts.isHolderUpgrade
  const activeNum = opts.activeInvoiceNum || reg?.invoiceNumber || null
  const isRenewalDoc = doc._source === 'renewal' || doc.purpose === 'renewal' || !!doc.plan

  // ── Holder-group live status (per-upgrade) ──────────────────────────────────
  const grp = (reg?.holderGroups || []).find(
    (g) => g.invoiceNumber && g.invoiceNumber === doc.invoiceNumber
  )
  const grpPending = !!(grp && grp.paymentStatus === 'pending')
  const grpExpired = !!(grp && grp.plan !== 'Unlimited Plan' && grp.expirationDate &&
    new Date(grp.expirationDate).getTime() <= now)
  const grpActive = !!(grp && !grpPending &&
    (grp.plan === 'Unlimited Plan' ||
      (grp.expirationDate && new Date(grp.expirationDate).getTime() > now)))

  // ── Queued renewal (paid, future activation) ────────────────────────────────
  const nr = reg?.nextRenewal
  const isQueued = doc.status === 'queued' || !!(
    nr?.paidAt && nr?.invoiceNumber && doc.invoiceNumber === nr.invoiceNumber &&
    nr?.activationDate && new Date(nr.activationDate).getTime() > now
  )

  // ── Current subscription period live? ───────────────────────────────────────
  const subActive = (reg?.isPaid || reg?.status === 'Active') &&
    (reg?.subscriptionPlan === 'Unlimited Plan' || !reg?.expirationDate ||
      new Date(reg.expirationDate).getTime() > now)

  // Base subscription invoice = the registration's live invoice number.
  const baseActive = !!(activeNum && doc.invoiceNumber === activeNum && subActive)
  // A holder-upgrade rides the subscription period unless its own group is expired/pending.
  const upgradeActive = isHolderUpgrade && subActive && !grpExpired && !grpPending

  // ── Priority: Queued > Active > Expired > Pending > Superseded ──────────────
  if (isQueued) return BADGES.queued
  if (baseActive || grpActive || upgradeActive) return BADGES.active
  if (grpExpired) return BADGES.expired
  if (grpPending) return BADGES.pending
  if (doc.status === 'superseded') return BADGES.superseded

  // Historical base / renewal invoice that is no longer the active one:
  //  - a newer plan is currently live  → Superseded
  //  - the whole subscription has ended → Expired
  if (isRenewalDoc || !isHolderUpgrade) {
    return subActive ? BADGES.superseded : BADGES.expired
  }
  return null
}
