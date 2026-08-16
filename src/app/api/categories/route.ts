import { NextResponse } from "next/server";
import { db, dbReady, CATEGORIES } from "@/lib/db";

export async function GET() {
  await dbReady;
  const rows = (await db
    .prepare("SELECT category, COUNT(*) as cnt FROM sounds GROUP BY category")
    .all()) as { category: string; cnt: number }[];
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.category] = r.cnt;
  return NextResponse.json({
    categories: CATEGORIES.map((c) => ({ name: c, count: counts[c] || 0 })),
  });
}
