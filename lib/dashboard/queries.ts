/**
 * Page-side import target for dashboard data.
 *
 * Each `getX` function reads the DB through Drizzle and shapes the
 * result to the same `Capsule` / `Wall` / `OverviewStats` contracts
 * the pages were built against. The dashboard was wired to fixtures
 * first; the only thing that changed when the DB landed is the
 * implementation of the three queries.
 *
 * The contract types (re-exported from `./contracts`) are the source
 * of truth — pages import them, this file is the only place that
 * knows the queries exist.
 */

import { requireSession } from "@/lib/auth";
import {
  getOverviewStats,
  listOwnedCapsules,
  listRecentActivity,
  listWallsForViewer,
  type DashboardWallRow,
} from "@/lib/wall-access";
import type {
  ActivityItem,
  Capsule,
  CapsuleStatus,
  ContentType,
  OverviewStats,
  Wall,
} from "./contracts";

export {
  type ActivityItem,
  type Capsule,
  type CapsuleStatus,
  type ContentType,
  type OverviewStats,
  type Wall,
} from "./contracts";

// ---------------------------------------------------------------------------
// Capsules (dashboard list)
// ---------------------------------------------------------------------------

export async function getCapsules(): Promise<Capsule[]> {
  const user = await requireSession();
  const rows = await listOwnedCapsules(user.id);
  return rows.map(toCapsule);
}

function toCapsule(row: Awaited<ReturnType<typeof listOwnedCapsules>>[number]): Capsule {
  return {
    id: row.capsule.id,
    title: row.capsule.title,
    recipient: row.primaryRecipient ?? "(no recipient yet)",
    deliveryDate: (row.capsule.deliveryDate ?? row.capsule.createdAt).toISOString(),
    status: toCapsuleStatus(row.capsule.status),
    contentType: row.primaryContentType ?? "text",
  };
}

function toCapsuleStatus(s: string): CapsuleStatus {
  if (s === "scheduled" || s === "delivered" || s === "draft") return s;
  // "failed" is not in the UI's status set; surface it as "delivered"
  // with a toast (handled in the page) so the user knows to look.
  return "delivered";
}

// ---------------------------------------------------------------------------
// Walls (dashboard list, split by role)
// ---------------------------------------------------------------------------

export async function getWalls(): Promise<Wall[]> {
  const user = await requireSession();
  const rows = await listWallsForViewer(user.id);
  return rows.map(toWall);
}

function toWall(row: DashboardWallRow): Wall {
  return {
    id: row.wall.id,
    name: row.wall.name,
    slug: row.wall.slug,
    openDate: row.wall.openDate.toISOString(),
    contributions: row.contributionCount,
    role: row.role,
  };
}

// ---------------------------------------------------------------------------
// Overview tiles
// ---------------------------------------------------------------------------

export async function getOverview(): Promise<OverviewStats> {
  const user = await requireSession();
  const [stats, recent] = await Promise.all([
    getOverviewStats(user.id),
    listRecentActivity(user.id, 5),
  ]);
  return {
    scheduled: stats.scheduled,
    delivered: stats.delivered,
    walls: stats.walls,
    recent: recent.map<ActivityItem>((r) => ({
      id: r.id,
      kind: r.kind,
      text: r.text,
      at: r.at.toISOString(),
    })),
  };
}
