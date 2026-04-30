/**
 * Dashboard Stats API
 *
 * GET /api/dashboard/stats — Aggregated metrics for the dashboard
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserId } from "@/lib/auth";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalAutomations,
      activeAutomations,
      dmsSentToday,
      dmsSentWeek,
      dmsSentMonth,
      totalDMs,
      recentLogs,
    ] = await Promise.all([
      prisma.automation.count({ where: { userId } }),
      prisma.automation.count({ where: { userId, isActive: true } }),
      prisma.dmLog.count({
        where: { userId, status: "SENT", createdAt: { gte: todayStart } },
      }),
      prisma.dmLog.count({
        where: { userId, status: "SENT", createdAt: { gte: weekStart } },
      }),
      prisma.dmLog.count({
        where: { userId, status: "SENT", createdAt: { gte: monthStart } },
      }),
      prisma.dmLog.count({ where: { userId, status: "SENT" } }),
      prisma.dmLog.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { automation: { select: { name: true } } },
      }),
    ]);

    // DMs per day for last 7 days
    const dailyDMs: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(todayStart);
      dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const count = await prisma.dmLog.count({
        where: {
          userId,
          status: "SENT",
          createdAt: { gte: dayStart, lt: dayEnd },
        },
      });

      dailyDMs.push({
        date: dayStart.toLocaleDateString("en-US", { weekday: "short" }),
        count,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        totalAutomations,
        activeAutomations,
        dmsSentToday,
        dmsSentWeek,
        dmsSentMonth,
        totalDMs,
        dailyDMs,
        recentLogs,
      },
    });
  } catch (err) {
    console.error("[Dashboard Stats] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
