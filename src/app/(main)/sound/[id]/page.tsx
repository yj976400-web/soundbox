import { notFound } from "next/navigation";
import Link from "next/link";
import { getSoundById, getRelatedSounds } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import SoundCard from "@/components/SoundCard";
import SoundDetailClient from "./SoundDetailClient";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sound = await getSoundById(id);
  if (!sound) return { title: "효과음을 찾을 수 없음" };
  return {
    title: sound.title,
    description: sound.description || `${sound.title} - SoundBox 효과음`,
    openGraph: {
      title: sound.title,
      description: sound.description || `${sound.title} - SoundBox 효과음`,
      type: "music.song",
    },
  };
}

export default async function SoundDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  const sound = await getSoundById(id, currentUser?.id ?? null);
  if (!sound) notFound();

  const related = await getRelatedSounds(sound);
  const tags: string[] = JSON.parse(sound.tags || "[]");

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      <nav className="text-xs text-text-muted mb-6 font-tabular">
        <Link href="/explore" className="hover:text-signal">
          효과음 탐색
        </Link>
        <span className="mx-1.5">/</span>
        <span>{sound.category}</span>
      </nav>

      <SoundDetailClient sound={sound} tags={tags} isLoggedIn={!!currentUser} />

      <section className="mt-6 rounded-2xl border border-panel-border bg-panel p-6">
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <dt className="text-text-faint text-xs mb-1">업로더</dt>
            <dd>
              <Link href={`/profile/${sound.uploaderUsername}`} className="text-signal hover:text-signal-strong">
                @{sound.uploaderUsername}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-text-faint text-xs mb-1">업로드 날짜</dt>
            <dd className="font-tabular">{formatDate(sound.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-text-faint text-xs mb-1">카테고리</dt>
            <dd>{sound.category}</dd>
          </div>
          <div>
            <dt className="text-text-faint text-xs mb-1">태그</dt>
            <dd className="flex flex-wrap gap-1">
              {tags.length ? (
                tags.map((t) => (
                  <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-bg border border-panel-border">
                    #{t}
                  </span>
                ))
              ) : (
                <span className="text-text-faint">없음</span>
              )}
            </dd>
          </div>
        </dl>
      </section>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display font-bold text-xl mb-4">관련 효과음</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {related.map((s) => (
              <SoundCard key={s.id} sound={s} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
