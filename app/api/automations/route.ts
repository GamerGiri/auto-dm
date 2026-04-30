/**
 * Automations CRUD API
 *
 * GET    /api/automations         — List all automations for the user
 * POST   /api/automations         — Create a new automation
 * PATCH  /api/automations?id=...  — Update an automation
 * DELETE /api/automations?id=...  — Delete an automation
 *
 * All routes enforce row-level security by filtering on userId from session.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getCurrentUserId } from "@/lib/auth";
import { z } from "zod";

// ─── Plan Limits ────────────────────────────────────────────────────────────────

const PLAN_LIMITS = {
  FREE: { maxAutomations: 1, maxDMsPerMonth: 100 },
  PRO: { maxAutomations: 10, maxDMsPerMonth: 2000 },
  AGENCY: { maxAutomations: Infinity, maxDMsPerMonth: 10000 },
} as const;

// ─── Zod Schemas ────────────────────────────────────────────────────────────────

const createAutomationSchema = z.object({
  name: z.string().min(1).max(100),
  postId: z.string().min(1),
  postUrl: z.string().url().optional().nullable(),
  keywords: z
    .array(z.string().min(1).max(50))
    .min(1)
    .max(10),
  dmMessage: z.string().min(1).max(1000),
  isActive: z.boolean().optional().default(true),
  wholeWordMatch: z.boolean().optional().default(true),
});

const updateAutomationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  keywords: z
    .array(z.string().min(1).max(50))
    .min(1)
    .max(10)
    .optional(),
  dmMessage: z.string().min(1).max(1000).optional(),
  isActive: z.boolean().optional(),
  wholeWordMatch: z.boolean().optional(),
});

// ─── Helper: Get User ID from Session ───────────────────────────────────────────

async function getUserId(): Promise<string | null> {
  return getCurrentUserId();
}

// ─── Routes ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/automations — List all automations for the authenticated user
 */
export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const automations = await prisma.automation.findMany({
      where: { userId },
      include: {
        _count: {
          select: { dmLogs: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: automations });
  } catch (err) {
    console.error("[Automations GET] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch automations" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/automations — Create a new automation
 */
export async function POST(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const parsed = createAutomationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid input",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    // Check plan limits
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { _count: { select: { automations: true } } },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const limit = PLAN_LIMITS[user.plan as keyof typeof PLAN_LIMITS];
    if (user._count.automations >= limit.maxAutomations) {
      return NextResponse.json(
        {
          success: false,
          error: `Plan limit reached. Your ${user.plan} plan allows up to ${limit.maxAutomations} automation(s). Please upgrade to create more.`,
        },
        { status: 403 }
      );
    }

    const automation = await prisma.automation.create({
      data: {
        ...parsed.data,
        userId,
      },
    });

    return NextResponse.json(
      { success: true, data: automation },
      { status: 201 }
    );
  } catch (err) {
    console.error("[Automations POST] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to create automation" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/automations?id=... — Update an existing automation
 */
export async function PATCH(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const automationId = request.nextUrl.searchParams.get("id");
  if (!automationId) {
    return NextResponse.json(
      { success: false, error: "Missing automation ID" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const parsed = updateAutomationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid input",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    // Verify ownership (row-level security)
    const existing = await prisma.automation.findFirst({
      where: { id: automationId, userId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Automation not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.automation.update({
      where: { id: automationId },
      data: parsed.data,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("[Automations PATCH] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update automation" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/automations?id=... — Delete an automation
 */
export async function DELETE(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const automationId = request.nextUrl.searchParams.get("id");
  if (!automationId) {
    return NextResponse.json(
      { success: false, error: "Missing automation ID" },
      { status: 400 }
    );
  }

  try {
    // Verify ownership (row-level security)
    const existing = await prisma.automation.findFirst({
      where: { id: automationId, userId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Automation not found" },
        { status: 404 }
      );
    }

    await prisma.automation.delete({
      where: { id: automationId },
    });

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (err) {
    console.error("[Automations DELETE] Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to delete automation" },
      { status: 500 }
    );
  }
}
