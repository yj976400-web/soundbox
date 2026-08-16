"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatCount, formatDate } from "@/lib/format";

type AdminSound = {
  id: string;
  title: string;
  category: string;
  uploaderUsername: string;
  playCount: number;
  downloadCount: number;
  createdAt: string;
  pendingReports: number;
};

type AdminUser = {
  id: string;
  username: string;
  email: string;
  role: "user" | "admin";
  createdAt: string;
  soundCount: number;
};

type AdminReport = {
  id: string;
  soundId: string;
  soundTitle: string | null;
  reporterUsername: string | null;
  reason: string;
  detail: string;
  status: "pending" | "resolved";
  createdAt: string;
};

const TABS = [
  { key: "sounds", label: "전체 효과음" },
  { key: "users", label: "사용자 관리" },
  { key: "reports", label: "신고 내역" },
] as const;

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("sounds");

  const [sounds, setSounds] = useState<AdminSound[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [sRes, uRes, rRes] = await Promise.all([
      fetch("/api/admin/sounds"),
      fetch("/api/admin/users"),
      fetch("/api/admin/reports"),
    ]);
    if (sRes.ok) setSounds((await sRes.json()).items);
    if (uRes.ok) setUsers((await uRes.json()).items);
    if (rRes.ok) setReports((await rRes.json()).items);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login?next=/admin");
      return;
    }
    if (user.role !== "admin") return;
    loadAll();
  }, [authLoading, user, router, loadAll]);

  if (authLoading || (!user && !authLoading)) {
    return <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 text-text-muted">불러오는 중...</div>;
  }

  if (user && user.role !== "admin") {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <ShieldAlert size={32} className="mx-auto mb-4 text-danger" />
        <h1 className="font-display font-bold text-2xl mb-2">접근이 거부되었습니다.</h1>
        <p className="text-text-muted">관리자만 이 페이지에 접근할 수 있습니다.</p>
      </div>
    );
  }

  async function deleteSound(id: string) {
    if (!confirm("이 효과음을 삭제할까요?")) return;
    const res = await fetch("/api/admin/sounds", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) setSounds((prev) => prev.filter((s) => s.id !== id));
  }

  async function toggleRole(u: AdminUser) {
    const nextRole = u.role === "admin" ? "user" : "admin";
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: u.id, role: nextRole }),
    });
    if (res.ok) {
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: nextRole } : x)));
    }
  }

  async function resolveReport(r: AdminReport) {
    const nextStatus = r.status === "pending" ? "resolved" : "pending";
    const res = await fetch("/api/admin/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: r.id, status: nextStatus }),
    });
    if (res.ok) {
      setReports((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: nextStatus } : x)));
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <h1 className="font-display font-bold text-3xl mb-2">관리자 페이지</h1>
      <p className="text-text-muted mb-8">전체 사용자와 효과음, 신고 내역을 관리합니다.</p>

      <div className="flex gap-1 rounded-full border border-panel-border p-1 w-fit mb-8 text-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-full transition-colors ${
              tab === t.key ? "bg-signal text-bg-elevated font-medium" : "text-text-muted hover:text-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-text-muted">불러오는 중...</p>
      ) : tab === "sounds" ? (
        <div className="rounded-2xl border border-panel-border bg-panel overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-panel-border text-left text-text-muted">
                <th className="px-4 py-3 font-medium">제목</th>
                <th className="px-4 py-3 font-medium">업로더</th>
                <th className="px-4 py-3 font-medium text-right">재생/다운로드</th>
                <th className="px-4 py-3 font-medium text-right">신고</th>
                <th className="px-4 py-3 font-medium text-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {sounds.map((s) => (
                <tr key={s.id} className="border-b border-panel-border last:border-0 hover:bg-bg/50">
                  <td className="px-4 py-3">
                    <Link href={`/sound/${s.id}`} className="hover:text-signal font-medium">
                      {s.title}
                    </Link>
                    <span className="block text-xs text-text-faint">{s.category}</span>
                  </td>
                  <td className="px-4 py-3">@{s.uploaderUsername}</td>
                  <td className="px-4 py-3 text-right font-tabular">
                    {formatCount(s.playCount)} / {formatCount(s.downloadCount)}
                  </td>
                  <td className="px-4 py-3 text-right font-tabular">
                    {s.pendingReports > 0 ? (
                      <span className="text-danger">{s.pendingReports}</span>
                    ) : (
                      <span className="text-text-faint">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => deleteSound(s.id)}
                      className="text-xs px-3 py-1.5 rounded-full border border-danger/40 text-danger hover:bg-danger/10"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : tab === "users" ? (
        <div className="rounded-2xl border border-panel-border bg-panel overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-panel-border text-left text-text-muted">
                <th className="px-4 py-3 font-medium">사용자명</th>
                <th className="px-4 py-3 font-medium">가입일</th>
                <th className="px-4 py-3 font-medium text-right">업로드 수</th>
                <th className="px-4 py-3 font-medium">권한</th>
                <th className="px-4 py-3 font-medium text-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-panel-border last:border-0 hover:bg-bg/50">
                  <td className="px-4 py-3">
                    <Link href={`/profile/${u.username}`} className="hover:text-signal font-medium">
                      @{u.username}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-tabular text-text-muted">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3 text-right font-tabular">{formatCount(u.soundCount)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        u.role === "admin" ? "bg-signal/20 text-signal" : "bg-bg text-text-muted"
                      }`}
                    >
                      {u.role === "admin" ? "관리자" : "일반"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleRole(u)}
                      className="text-xs px-3 py-1.5 rounded-full border border-panel-border hover:border-signal hover:text-signal"
                    >
                      {u.role === "admin" ? "관리자 해제" : "관리자로 지정"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl border border-panel-border bg-panel overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-panel-border text-left text-text-muted">
                <th className="px-4 py-3 font-medium">효과음</th>
                <th className="px-4 py-3 font-medium">사유</th>
                <th className="px-4 py-3 font-medium">신고자</th>
                <th className="px-4 py-3 font-medium">상태</th>
                <th className="px-4 py-3 font-medium text-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-text-muted">
                    신고 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                reports.map((r) => (
                  <tr key={r.id} className="border-b border-panel-border last:border-0 hover:bg-bg/50">
                    <td className="px-4 py-3">
                      {r.soundTitle ? (
                        <Link href={`/sound/${r.soundId}`} className="hover:text-signal font-medium">
                          {r.soundTitle}
                        </Link>
                      ) : (
                        <span className="text-text-faint">삭제된 효과음</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.reason}
                      {r.detail && <span className="block text-xs text-text-faint">{r.detail}</span>}
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {r.reporterUsername ? `@${r.reporterUsername}` : "익명"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          r.status === "pending" ? "bg-amber/20 text-amber" : "bg-signal/20 text-signal"
                        }`}
                      >
                        {r.status === "pending" ? "대기중" : "처리완료"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => resolveReport(r)}
                        className="text-xs px-3 py-1.5 rounded-full border border-panel-border hover:border-signal hover:text-signal"
                      >
                        {r.status === "pending" ? "처리완료로 표시" : "대기중으로 되돌리기"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
