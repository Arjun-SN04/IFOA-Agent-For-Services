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
  // Admin-controlled kill switch: a group flipped Inactive in the edit modal stops
  // contributing to coverage/pricing, regardless of expiry. Default (undefined/true)
  // is active, so legacy groups are unaffected.
  if (g.isActive === false) return false;
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
  if (g.isActive === false) return false;   // admin-deactivated add-on plan
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
 * ── SINGLE SOURCE OF TRUTH for stacked holder pricing ────────────────────────
 *
 * activeCoverageAnchor = holders ALREADY covered by every currently-ACTIVE plan,
 * EXCEPT the one being renewed/expanded. A renewal/expansion stacks ON TOP of this,
 * so the volume-pricing tier is read at (anchor + new holders), and the airline's
 * 3-holder floor is already met whenever anchor > 0.
 *
 * The unit being acted on is excluded so it never anchors on itself:
 *   - Renewing the BASE plan      → { excludeBase: true }
 *   - Renewing an add-on group g  → { excludeGroupId: g._id }
 *
 * Mirror of frontend utils/airlineTotal.js activeCoverageAnchor — keep in sync.
 *
 * @param {object} doc
 * @param {{ excludeBase?: boolean, excludeGroupId?: string }} [opts]
 * @param {Date} [asOf]
 * @returns {number} holders stacked BELOW the unit being acted on
 */
function activeCoverageAnchor(doc, opts = {}, asOf = new Date()) {
  if (!doc) return 0;
  const { excludeBase = false, excludeGroupId = null } = opts;
  const committed = Number(doc.committedCount || doc.holderCountValue || doc.certificateHolders?.length || 0);
  const baseOwn = Math.max(0, committed - allHolderGroupSlots(doc.holderGroups));
  const baseLive = (doc.status === 'Active' || doc.isPaid) &&
    (doc.subscriptionPlan === 'Unlimited Plan' || !doc.expirationDate || new Date(doc.expirationDate) > asOf);
  const baseSlots = (!excludeBase && baseLive) ? baseOwn : 0;
  const groupSlots = (doc.holderGroups || [])
    .filter(g => String(g._id) !== String(excludeGroupId || '') && isActiveHolderGroup(g, asOf))
    .reduce((sum, g) => sum + Number(g.count || 0), 0);
  return baseSlots + groupSlots;
}

/**
 * Stacked-position anchor for renewing ONE holder-upgrade group. Thin wrapper over
 * activeCoverageAnchor (base counts as coverage; this group is excluded).
 *
 * @param {object} doc
 * @param {object} group   - the group being renewed (excluded from the anchor)
 * @param {Date}   [asOf]
 * @returns {number}
 */
function renewTierAnchor(doc, group, asOf = new Date()) {
  return activeCoverageAnchor(doc, { excludeGroupId: group?._id || null }, asOf);
}

module.exports = {
  isActiveHolderGroup,
  activeHolderGroupSlots,
  allHolderGroupSlots,
  isCurrentBaseGroup,
  currentBaseGroupSlots,
  currentBaseSlots,
  activeCoverageAnchor,
  renewTierAnchor,
};
