/**
 * expiryStatus.js
 *
 * Single source of truth for "is this plan expired / about to expire?" — used on
 * both the client subscription page and the admin dashboard so the wording and
 * thresholds are identical everywhere.
 *
 *   null        → healthy (or perpetual / no expiry)
 *   { kind: 'expired', ... }  → already past expiry
 *   { kind: 'soon', ... }     → within `soonDays` of expiry
 */

export function getExpiryStatus(expirationDate, { unlimited = false, soonDays = 30 } = {}) {
  if (unlimited || !expirationDate) return null
  const exp = new Date(expirationDate)
  if (Number.isNaN(exp.getTime())) return null
  const days = Math.ceil((exp - new Date()) / 86400000)
  if (days <= 0) {
    return { kind: 'expired', label: 'Expired', days, cls: 'text-red-700 bg-red-50 border-red-200' }
  }
  if (days <= soonDays) {
    return {
      kind: 'soon',
      label: days <= 1 ? 'Expires today' : `Expires in ${days}d`,
      days,
      cls: 'text-amber-700 bg-amber-50 border-amber-200',
    }
  }
  return null
}
