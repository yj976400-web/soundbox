"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import SoundCard from "@/components/SoundCard";
import type { SoundWithUploader } from "@/lib/types";

export default function FavoritesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<SoundWithUploader[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login?next=/favorites");
      return;
    }
    fetch("/api/favorites")
      .then((res) => res.json())
      .then((data) => setItems(data.items || []))
      .finally(() => setLoading(false));
  }, [authLoading, user, router]);

  if (authLoading || loading) {
    return <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 text-text-muted">불러오는 중...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <h1 className="font-display font-bold text-3xl mb-2">찜한 효과음</h1>
      <p className="text-text-muted mb-8">마음에 드는 효과음을 모아뒀어요.</p>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-panel-border py-16 text-center text-text-muted">
          아직 찜한 효과음이 없습니다.
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
