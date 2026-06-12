/**
 * holderGroups.js
 *
 * Shared definition of an "active" holder-upgrade group, mirrored on the frontend
 * (see frontend/src/utils/airlineTotal.js). A group is active when it still
 * contributes to the current subscription: a perpetual Unlimited plan, a group with
 * no expiry, or a group whose expiry is still in the future.
 *
 * Expired groups left in the holderGroups array (e.g. after a base-plan renewal)
 * are NOT active and must be excluded from committed-count math, so the invariant
 * holds everywhere:  baseCommitted = committedCount − activeHolderGroupSlots.
 */

function isActiveHolderGroup(g, asOf = new Date()) {
  if (!g) return false;
  if (g.plan === 'Unlimited Plan') return true;
  if (!g.expirationDate) return true;
  return new Date(g.expirationDate) > asOf;
}

/**
 * Sum of slots across all currently-active holder-upgrade groups.
 * @param {Array} holderGroups
 * @param {Date}  [asOf]
 * @returns {number}
 */
function activeHolderGroupSlots(holderGroups, asOf = new Date()) {
  return (holderGroups || [])
    .filter(g => isActiveHolderGroup(g, asOf))
    .reduce((sum, g) => sum + Number(g.count || 0), 0);
}

/**
 * Sum of slots across EVERY holder-upgrade group still in the array, active or
 * expired. committedCount accumulates each group's slots on purchase and is never
 * decremented on expiry, so committedCount = base + allHolderGroupSlots always.
 * The pure base plan count is therefore committedCount − allHolderGroupSlots.
 * Subtracting only active slots leaks an expired group's slots into the base.
 */
function allHolderGroupSlots(holderGroups) {
  return (holderGroups || []).reduce((sum, g) => sum + Number(g.count || 0), 0);
}

/**
 * Does a group belong to the CURRENT base-plan period? Perpetual Unlimited plans
 * always do (they carry across base renewals). A non-Unlimited upgrade belongs only
 * if it is not expired AND was purchased on/after the current base period start
 * (periodStart = the base plan's subscriptionDate). Upgrades from a previous
 * base-plan period are NOT part of the current base count.
 */
function isCurrentBaseGroup(g, periodStart, asOf = new Date()) {
  if (!g) return false;
  if (g.plan === 'Unlimited Plan') return true;
  if (g.expirationDate && new Date(g.expirationDate) <= asOf) return false;
  if (!periodStart) return true;
  const bought = g.subscriptionDate || g.createdAt;
  return bought ? new Date(bought) >= new Date(periodStart) : true;
}

/**
 * Slots belonging to the current base period: perpetual Unlimited + current-period
 * upgrades. Excludes previous-period upgrade plans.
 */
function currentBaseGroupSlots(holderGroups, periodStart, asOf = new Date()) {
  return (holderGroups || [])
    .filter(g => isCurrentBaseGroup(g, periodStart, asOf))
    .reduce((sum, g) => sum + Number(g.count || 0), 0);
}

/**
 * The airline's "current base slots" = base plan count + current-period upgrade
 * slots (perpetual + current). Derived defensively from the stored committedCount
 * (which = base + all not-expired groups) so previous-period upgrade plans left in
 * the array do not inflate it.
 */
function currentBaseSlots(doc, asOf = new Date()) {
  const committed = Number(doc.committedCount || doc.holderCountValue || doc.certificateHolders?.length || 0);
  const base = Math.max(0, committed - allHolderGroupSlots(doc.holderGroups));
  return base + currentBaseGroupSlots(doc.holderGroups, doc.subscriptionDate, asOf);
}

/**
 * Stacked-position anchor for renewing ONE holder-upgrade group.
 *
 * An add-on group's holders sit ON TOP of the currently-active coverage, so the
 * volume-pricing tier for its renewal is decided by the CUMULATIVE position
 * (active base own count + other active add-ons), not the group's standalone
 * count. Example: active base = 6 holders, this expired add-on renews to 3 →
 * its holders occupy positions 7-9, so the tier is read at 9 ("5 to 10"), not 3.
 *
 * When no active base / other active plan exists the group stands alone and the
 * anchor is 0, so the tier starts from the group's own count (from 1).
 *
 * @param {object} doc          - airline registration
 * @param {object} group        - the group being renewed (excluded from the anchor)
 * @param {Date}   [asOf]
 * @returns {number} number of holders stacked BELOW this group's renewal
 */
function renewTierAnchor(doc, group, asOf = new Date()) {
  const committed = Number(doc.committedCount || doc.holderCountValue || doc.certificateHolders?.length || 0);
  const baseOwn = Math.max(0, committed - allHolderGroupSlots(doc.holderGroups));
  const baseLive = (doc.status === 'Active' || doc.isPaid) &&
    (doc.subscriptionPlan === 'Unlimited Plan' || !doc.expirationDate || new Date(doc.expirationDate) > asOf);
  const otherActiveSlots = (doc.holderGroups || [])
    .filter(g => String(g._id) !== String(group?._id) && isActiveHolderGroup(g, asOf))
    .reduce((sum, g) => sum + Number(g.count || 0), 0);
  return (baseLive ? baseOwn : 0) + otherActiveSlots;
}

module.exports = {
  isActiveHolderGroup,
  activeHolderGroupSlots,
  allHolderGroupSlots,
  isCurrentBaseGroup,
  currentBaseGroupSlots,
  currentBaseSlots,
  renewTierAnchor,
};
