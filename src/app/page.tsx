import Link from "next/link";
import { Search as SearchIcon } from "lucide-react";
import { listSounds } from "@/lib/queries";
import { CATEGORIES } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import SoundCard from "@/components/SoundCard";

export default async function HomePage() {
  const user = await getCurrentUser();
  const { items: popular } = await listSounds({ sort: "popular", pageSize: 8, currentUserId: user?.id ?? null });
  const { items: latest } = await listSounds({ sort: "latest", pageSize: 8, currentUserId: user?.id ?? null });

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <section className="pt-16 pb-14 sm:pt-24 sm:pb-20 text-center">
        <p className="font-tabular text-xs tracking-[0.2em] text-signal uppercase mb-4">
          SoundBox · Signal Library
        </p>
        <h1 className="font-display font-bold text-4xl sm:text-6xl leading-tight max-w-3xl mx-auto">
          필요한 효과음을 찾고,
          <br />
          직접 공유하세요.
        </h1>
        <p className="mt-5 text-text-muted text-base sm:text-lg max-w-xl mx-auto">
          누구나 효과음을 업로드하고 자유롭게 사용할 수 있는 효과음 공유 플랫폼
        </p>

        <form action="/search" className="mt-9 max-w-xl mx-auto">
          <div className="relative">
            <SearchIcon size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-text-faint" />
            <input
              name="q"
              placeholder="효과음을 검색해보세요... (예: 버튼, 폭발, 알림음)"
              className="w-full rounded-full border border-panel-border bg-panel pl-12 pr-32 py-4 text-sm sm:text-base outline-none focus:border-signal shadow-sm"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 rounded-full bg-signal text-bg-elevated text-sm font-medium hover:bg-signal-strong"
            >
              검색
            </button>
          </div>
        </form>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {CATEGORIES.slice(0, 7).map((c) => (
            <Link
              key={c}
              href={`/explore?category=${encodeURIComponent(c)}`}
              className="text-xs px-3 py-1.5 rounded-full border border-panel-border text-text-muted hover:border-signal hover:text-signal transition-colors"
            >
              {c}
            </Link>
          ))}
        </div>
      </section>

      <section className="pb-14">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-2xl">인기 효과음</h2>
          <Link href="/explore?sort=popular" className="text-sm text-signal hover:text-signal-strong">
            전체 보기 →
          </Link>
        </div>
        {popular.length === 0 ? (
          <EmptyState message="아직 업로드된 효과음이 없습니다. 첫 효과음을 올려보세요!" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {popular.map((s) => (
              <SoundCard key={s.id} sound={s} />
            ))}
          </div>
        )}
      </section>

      <section className="pb-20">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-2xl">최신 효과음</h2>
          <Link href="/explore?sort=latest" className="text-sm text-signal hover:text-signal-strong">
            전체 보기 →
          </Link>
        </div>
        {latest.length === 0 ? (
          <EmptyState message="최근 업로드된 효과음이 없습니다." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {latest.map((s) => (
              <SoundCard key={s.id} sound={s} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-panel-border py-16 text-center text-text-muted">
      {message}
    </div>
  );
}
