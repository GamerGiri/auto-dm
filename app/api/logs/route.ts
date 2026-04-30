/**
 * DM Logs API
 *
 * GET /api/logs — Paginated DM logs with status filter
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserId } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const status = searchParams.get("status"); // SENT, FAILED, PENDING, etc.
  const skip = (page - 1) * limit;

  try {
    const where: Record<string, unknown> = { userId };
    if (status) {
      where.status = status;
    }

    const [logs, total] = await Promise.all([
      prisma.dmLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          automation: { select: { name: true, keywords: true } },
        },
      }),
      prisma.dmLog.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    console.error("[Logs API] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}
