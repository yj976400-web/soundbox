import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { listSounds } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { formatCount, formatDate } from "@/lib/format";
import SoundCard from "@/components/SoundCard";
import type { UserRow } from "@/lib/types";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return { title: `@${username}` };
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profileUser = (await db.prepare("SELECT * FROM users WHERE username = ?").get(username)) as
    | UserRow
    | undefined;
  if (!profileUser) notFound();

  const currentUser = await getCurrentUser();
  const isOwner = currentUser?.id === profileUser.id;

  const stats = (await db
    .prepare(
      "SELECT COUNT(*) as soundCount, COALESCE(SUM(downloadCount),0) as totalDownloads FROM sounds WHERE userId = ?"
    )
    .get(profileUser.id)) as { soundCount: number; totalDownloads: number };

  const { items } = await listSounds({
    userId: profileUser.id,
    sort: "latest",
    pageSize: 24,
    currentUserId: currentUser?.id ?? null,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <div className="flex items-start gap-5 mb-10 flex-wrap">
        <div className="w-20 h-20 rounded-full bg-signal/20 border border-signal/40 text-signal font-display font-bold text-2xl flex items-center justify-center shrink-0">
          {profileUser.username.slice(0, 1).toUpperCase()}
        </div>
        <div className="flex-1 min-w-[200px]">
          <h1 className="font-display font-bold text-2xl">@{profileUser.username}</h1>
          <p className="text-text-muted text-sm mt-1">
            {formatDate(profileUser.createdAt)} 가입
          </p>
          <div className="flex gap-5 mt-3 text-sm font-tabular">
            <span>
              <strong>{formatCount(stats.soundCount)}</strong>{" "}
              <span className="text-text-muted">업로드</span>
            </span>
            <span>
              <strong>{formatCount(stats.totalDownloads)}</strong>{" "}
              <span className="text-text-muted">총 다운로드</span>
            </span>
          </div>
        </div>
        {isOwner && (
          <a
            href="/dashboard"
            className="px-4 py-2.5 rounded-full border border-panel-border text-sm font-medium hover:border-signal hover:text-signal"
          >
            내가 업로드한 효과음 관리
          </a>
        )}
      </div>

      <h2 className="font-display font-bold text-xl mb-4">
        {isOwner ? "내 효과음" : `@${profileUser.username}님의 효과음`}
      </h2>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-panel-border py-16 text-center text-text-muted">
          아직 업로드된 효과음이 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((s) => (
            <SoundCard key={s.id} sound={s} />
          ))}
        </div>
      )}
    </div>
  );
}
