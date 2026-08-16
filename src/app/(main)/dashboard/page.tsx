"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, Pencil, ExternalLink } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatCount, formatDate } from "@/lib/format";
import type { SoundWithUploader } from "@/lib/types";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<SoundWithUploader[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<SoundWithUploader | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const res = await fetch(`/api/sounds?userId=${user.id}&sort=latest&pageSize=48`);
    const data = await res.json();
    setItems(data.items || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login?next=/dashboard");
      return;
    }
    load();
  }, [authLoading, user, router, load]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/sounds/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((s) => s.id !== deleteTarget.id));
    }
    setDeleting(false);
    setDeleteTarget(null);
  }

  if (authLoading || loading) {
    return <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 text-text-muted">불러오는 중...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-3xl mb-1">대시보드</h1>
          <p className="text-text-muted">내가 업로드한 효과음을 관리하세요.</p>
        </div>
        <Link
          href="/upload"
          className="px-4 py-2.5 rounded-full bg-signal text-bg-elevated text-sm font-medium hover:bg-signal-strong"
        >
          + 새 효과음 업로드
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-panel-border py-16 text-center text-text-muted">
          아직 업로드한 효과음이 없습니다.
        </div>
      ) : (
        <div className="rounded-2xl border border-panel-border bg-panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-panel-border text-text-muted text-left">
                <th className="px-4 py-3 font-medium">제목</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">업로드 날짜</th>
                <th className="px-4 py-3 font-medium text-right">재생</th>
                <th className="px-4 py-3 font-medium text-right">다운로드</th>
                <th className="px-4 py-3 font-medium text-right">찜</th>
                <th className="px-4 py-3 font-medium text-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-b border-panel-border last:border-0 hover:bg-bg/50">
                  <td className="px-4 py-3">
                    <Link href={`/sound/${s.id}`} className="font-medium hover:text-signal flex items-center gap-1.5">
                      {s.title}
                      <ExternalLink size={12} className="text-text-faint" />
                    </Link>
                    <span className="text-xs text-text-faint">{s.category}</span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell font-tabular text-text-muted">
                    {formatDate(s.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right font-tabular">{formatCount(s.playCount)}</td>
                  <td className="px-4 py-3 text-right font-tabular">{formatCount(s.downloadCount)}</td>
                  <td className="px-4 py-3 text-right font-tabular">{formatCount(s.favoriteCount)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        href={`/sound/${s.id}`}
                        className="p-1.5 rounded-lg hover:bg-bg text-text-muted hover:text-signal"
                        aria-label="수정"
                      >
                        <Pencil size={14} />
                      </Link>
                      <button
                        onClick={() => setDeleteTarget(s)}
                        className="p-1.5 rounded-lg hover:bg-bg text-text-muted hover:text-danger"
                        aria-label="삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4">
          <div className="bg-panel border border-panel-border rounded-2xl p-6 max-w-sm w-full">
            <h2 className="font-display font-bold text-lg mb-2">효과음을 삭제할까요?</h2>
            <p className="text-sm text-text-muted mb-6">
              &ldquo;{deleteTarget.title}&rdquo; 효과음이 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-panel-border text-sm font-medium hover:bg-bg"
              >
                취소
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-danger text-white text-sm font-medium hover:opacity-90 disabled:opacity-60"
              >
                {deleting ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
