/**
 * Page-side import target for dashboard data.
 *
 * Today: re-exports the fixture queries. When the DB is wired, swap the
 * bodies of the functions below to call Drizzle — pages don't need to change.
 */
export {
  getCapsules,
  getWalls,
  getOverview,
  type Capsule,
  type CapsuleStatus,
  type ContentType,
  type Wall,
  type ActivityItem,
  type OverviewStats,
} from "./fixtures"
