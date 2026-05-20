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
