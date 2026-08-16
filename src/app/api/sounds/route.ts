import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listSounds, SortKey } from "@/lib/queries";
import { checkRateLimit, getClientIdentifier, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

const VALID_SORTS: SortKey[] = ["latest", "popular", "downloads", "favorites", "plays"];

export async function GET(req: NextRequest) {
  const limit = checkRateLimit(`search:ip:${getClientIdentifier(req)}`, RATE_LIMITS.search);
  if (!limit.allowed) return rateLimitResponse(limit);

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const q = searchParams.get("q");
  const sortParam = searchParams.get("sort") as SortKey | null;
  const sort: SortKey = sortParam && VALID_SORTS.includes(sortParam) ? sortParam : "latest";
  const page = Math.max(1, Number(searchParams.get("page") || 1) || 1);
  const pageSize = Math.min(48, Math.max(1, Number(searchParams.get("pageSize") || 12) || 12));
  const userIdFilter = searchParams.get("userId");

  const currentUser = await getCurrentUser();

  const { items, total } = await listSounds({
    category,
    q,
    sort,
    page,
    pageSize,
    userId: userIdFilter,
    currentUserId: currentUser?.id ?? null,
  });

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
