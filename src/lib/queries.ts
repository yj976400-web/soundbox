import { db, dbReady } from "./db";
import type { SoundWithUploader } from "./types";

const BASE_SELECT = `
  SELECT
    s.*,
    u.username AS uploaderUsername,
    u.profileImage AS uploaderProfileImage,
    (SELECT COUNT(*) FROM favorites f WHERE f.soundId = s.id) AS favoriteCount
  FROM sounds s
  JOIN users u ON u.id = s.userId
`;

export type SortKey = "latest" | "popular" | "downloads" | "favorites" | "plays";

const SORT_MAP: Record<SortKey, string> = {
  latest: "s.createdAt DESC",
  popular: "s.playCount DESC, s.createdAt DESC",
  downloads: "s.downloadCount DESC, s.createdAt DESC",
  favorites: "favoriteCount DESC, s.createdAt DESC",
  plays: "s.playCount DESC, s.createdAt DESC",
};

export async function listSounds(opts: {
  category?: string | null;
  q?: string | null;
  sort?: SortKey;
  page?: number;
  pageSize?: number;
  userId?: string | null; // 업로더 필터
  currentUserId?: string | null; // 찜 여부 표시용
}): Promise<{ items: SoundWithUploader[]; total: number }> {
  const {
    category,
    q,
    sort = "latest",
    page = 1,
    pageSize = 12,
    userId,
    currentUserId,
  } = opts;

  await dbReady;

  const where: string[] = [];
  const params: Record<string, unknown> = {};

  if (category && category !== "전체") {
    where.push("s.category = @category");
    params.category = category;
  }
  if (userId) {
    where.push("s.userId = @userId");
    params.userId = userId;
  }
  if (q && q.trim()) {
    where.push(
      "(s.title LIKE @q OR s.description LIKE @q OR s.tags LIKE @q OR s.category LIKE @q OR u.username LIKE @q)"
    );
    params.q = `%${q.trim()}%`;
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const orderSql = `ORDER BY ${SORT_MAP[sort] ?? SORT_MAP.latest}`;

  const countRow = (await db
    .prepare(`SELECT COUNT(*) as cnt FROM sounds s JOIN users u ON u.id = s.userId ${whereSql}`)
    .get(params)) as { cnt: number };

  const offset = (Math.max(1, page) - 1) * pageSize;

  const favSelect = currentUserId
    ? `, (SELECT COUNT(*) FROM favorites f2 WHERE f2.soundId = s.id AND f2.userId = @currentUserId) AS isFavorited`
    : "";

  const sql = `
    SELECT
      s.*,
      u.username AS uploaderUsername,
      u.profileImage AS uploaderProfileImage,
      (SELECT COUNT(*) FROM favorites f WHERE f.soundId = s.id) AS favoriteCount
      ${favSelect}
    FROM sounds s
    JOIN users u ON u.id = s.userId
    ${whereSql}
    ${orderSql}
    LIMIT @limit OFFSET @offset
  `;

  const items = (await db
    .prepare(sql)
    .all({ ...params, currentUserId: currentUserId ?? "", limit: pageSize, offset })) as SoundWithUploader[];

  return { items, total: countRow.cnt };
}

export async function getSoundById(id: string, currentUserId?: string | null): Promise<SoundWithUploader | undefined> {
  await dbReady;
  const favSelect = currentUserId
    ? `, (SELECT COUNT(*) FROM favorites f2 WHERE f2.soundId = s.id AND f2.userId = @currentUserId) AS isFavorited`
    : "";
  const sql = `${BASE_SELECT.replace(
    "(SELECT COUNT(*) FROM favorites f WHERE f.soundId = s.id) AS favoriteCount",
    "(SELECT COUNT(*) FROM favorites f WHERE f.soundId = s.id) AS favoriteCount" + favSelect
  )} WHERE s.id = @id`;
  return (await db.prepare(sql).get({ id, currentUserId: currentUserId ?? "" })) as
    | SoundWithUploader
    | undefined;
}

export async function getRelatedSounds(sound: SoundWithUploader, limit = 6): Promise<SoundWithUploader[]> {
  await dbReady;
  const sql = `
    ${BASE_SELECT}
    WHERE s.id != @id AND s.category = @category
    ORDER BY s.playCount DESC, s.createdAt DESC
    LIMIT @limit
  `;
  return (await db
    .prepare(sql)
    .all({ id: sound.id, category: sound.category, limit })) as SoundWithUploader[];
}
