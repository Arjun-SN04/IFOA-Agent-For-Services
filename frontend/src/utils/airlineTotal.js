/**
 * airlineTotal.js
 *
 * Single source of truth for computing the correct airline subscription total.
 *
 * The DB field `totalAmount` was historically stored with a bug where the
 * Unlimited Plan used the flat per-certificate price instead of
 * pricePerCertificate × holderCount. This function always recomputes from
 * the price-per-cert and committed count so the UI is always correct,
 * regardless of what was stored in the DB.
 *
 * Usage:
 *   import { getAirlineTotal } from '../utils/airlineTotal'
 *   const total = getAirlineTotal(record)   // → number (e.g. 795)
 *   const label = fmtAirlineTotal(record)   // → string (e.g. "$795.00")
 */

/**
 * Returns the correct airline total as a number.
 * Priority:
 *   1. pricePerCertificate × committedHolderCount  (always recalculated)
 *   2. falls back to DB totalAmount / totalServiceFees only when price or
 *      count is missing (legacy records with no pricePerCertificate stored)
 *
 * @param {object} record  - An airline subscription record from the API
 * @returns {number}
 */
export function getAirlineTotal(record) {
  if (!record) return 0

  const price = Number(
    record.pricePerCertificate ??
    record.pricePerCert ??
    0
  )

  const count = Number(
    record.holderCountValue ??
    record.committedCount ??
    record.certificateHolders?.length ??
    0
  )

  // If we have both a price and a count, recompute.
  if (price > 0 && count > 0) {
    // Multiple Years plans multiply by the year count (full contract value).
    const isMultiYear =
      (record.subscriptionPlan || '').includes('Multiple Year') &&
      Number(record.multiYearCount) > 1
    const years = isMultiYear ? Number(record.multiYearCount) : 1
    return price * count * years
  }

  // Fallback to whatever the DB stored (legacy / partial records).
  return Number(
    record.totalAmount ??
    record.totalServiceFees ??
    0
  )
}

/**
 * A holder-upgrade group is "active" when it still contributes to the current
 * subscription: a perpetual Unlimited plan, a group with no expiry, or a group
 * whose expiry is still in the future. Expired groups left in the array (e.g.
 * after a base-plan renewal) are NOT active.
 *
 * This is the SINGLE definition used everywhere (frontend + backend mirror) so the
 * invariant holds: baseCommitted = committedCount − activeGroupSlots.
 *
 * @param {object} g       - a holderGroup subdocument
 * @param {Date}   [asOf]  - reference time (defaults to now)
 * @returns {boolean}
 */
export function isActiveHolderGroup(g, asOf = new Date()) {
  if (!g) return false
  if (g.plan === 'Unlimited Plan') return true
  if (!g.expirationDate) return true
  return new Date(g.expirationDate) > asOf
}

/**
 * Sum of slots across all currently-active holder-upgrade groups.
 * @param {Array}  groups
 * @param {Date}   [asOf]
 * @returns {number}
 */
export function activeGroupSlots(groups, asOf = new Date()) {
  return (groups || [])
    .filter(g => isActiveHolderGroup(g, asOf))
    .reduce((sum, g) => sum + Number(g.count || 0), 0)
}

/**
 * Sum of slots across EVERY holder-upgrade group still in the array, active or
 * expired. committedCount accumulates each group's slots on purchase and is never
 * decremented on expiry, so committedCount = base + allGroupSlots always. The pure
 * base plan count is therefore committedCount − allGroupSlots; subtracting only the
 * active slots leaks an expired group's slots into the base count.
 * @param {Array} groups
 * @returns {number}
 */
export function allGroupSlots(groups) {
  return (groups || []).reduce((sum, g) => sum + Number(g.count || 0), 0)
}

/**
 * Does a group belong to the CURRENT base-plan period? Perpetual Unlimited plans
 * always do (they carry across base renewals). A non-Unlimited upgrade belongs only
 * if it is not expired AND was purchased on/after the current base period start
 * (`periodStart` = the base plan's subscriptionDate). Upgrades bought under a
 * previous base-plan period are NOT part of the current base count — they remain as
 * their own separate plans.
 *
 * @param {object} g
 * @param {Date|string} periodStart  - current base subscriptionDate
 * @param {Date}   [asOf]
 * @returns {boolean}
 */
export function isCurrentBaseGroup(g, periodStart, asOf = new Date()) {
  if (!g) return false
  if (g.plan === 'Unlimited Plan') return true
  if (g.expirationDate && new Date(g.expirationDate) <= asOf) return false
  if (!periodStart) return true
  const bought = g.subscriptionDate || g.createdAt
  return bought ? new Date(bought) >= new Date(periodStart) : true
}

/**
 * Slots belonging to the current base period: perpetual Unlimited + current-period
 * upgrades. Excludes previous-period upgrade plans.
 * @param {Array} groups
 * @param {Date|string} periodStart
 * @param {Date} [asOf]
 * @returns {number}
 */
export function currentBaseGroupSlots(groups, periodStart, asOf = new Date()) {
  return (groups || [])
    .filter(g => isCurrentBaseGroup(g, periodStart, asOf))
    .reduce((sum, g) => sum + Number(g.count || 0), 0)
}

/**
 * Stacked-position anchor for renewing ONE holder-upgrade group (mirror of the
 * backend utils/holderGroups.js renewTierAnchor).
 *
 * An add-on group's holders sit ON TOP of the currently-active coverage, so its
 * renewal tier is read at the CUMULATIVE position (active base own count + other
 * active add-ons), not the group's standalone count. Example: active base = 6,
 * this expired add-on renews to 3 → holders occupy positions 7-9, tier read at 9.
 * With no active base/other plan the anchor is 0 (tier starts from the group's
 * own count, i.e. from 1).
 *
 * @param {object} record  - airline subscription record
 * @param {object} group   - the group being renewed (excluded from the anchor)
 * @param {Date}   [asOf]
 * @returns {number} holders stacked BELOW this group's renewal
 */
export function renewTierAnchor(record, group, asOf = new Date()) {
  if (!record) return 0
  const committed = Number(record.committedCount || record.holderCountValue || record.certificateHolders?.length || 0)
  const baseOwn = Math.max(0, committed - allGroupSlots(record.holderGroups))
  const baseLive = (record.status === 'Active' || record.isPaid) &&
    (record.subscriptionPlan === 'Unlimited Plan' || !record.expirationDate || new Date(record.expirationDate) > asOf)
  const otherActiveSlots = (record.holderGroups || [])
    .filter(g => String(g._id) !== String(group?._id) && isActiveHolderGroup(g, asOf))
    .reduce((sum, g) => sum + Number(g.count || 0), 0)
  return (baseLive ? baseOwn : 0) + otherActiveSlots
}

/**
 * Returns a formatted USD string for the airline total.
 * @param {object} record
 * @returns {string}  e.g. "$795.00"
 */
export function fmtAirlineTotal(record) {
  const n = getAirlineTotal(record)
  if (!n && n !== 0) return '—'
  return '$' + Number(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
