"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, Menu, X, UploadCloud, Heart, LayoutDashboard, ShieldCheck, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
    setMenuOpen(false);
  }

  const navLinks = [
    { href: "/explore", label: "효과음 탐색" },
    { href: "/explore?sort=popular", label: "인기 효과음" },
    { href: "/explore?sort=latest", label: "최신 효과음" },
    { href: "/explore#categories", label: "카테고리" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-panel-border bg-bg-elevated/90 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex h-16 items-center gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="w-8 h-8 rounded-lg bg-signal flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-sm bg-bg-elevated" />
            </span>
            <span className="font-display font-bold text-lg tracking-tight">SoundBox</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 text-sm text-text-muted">
            {navLinks.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="px-3 py-2 rounded-lg hover:bg-bg hover:text-text transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-sm ml-auto">
            <div className="relative w-full">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint"
              />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="효과음을 검색해보세요..."
                className="w-full rounded-full border border-panel-border bg-bg pl-9 pr-3 py-2 text-sm outline-none focus:border-signal"
              />
            </div>
          </form>

          <div className="hidden md:flex items-center gap-2 ml-2">
            <ThemeToggle />
            {!loading && !user && (
              <>
                <Link
                  href="/login"
                  className="px-3 py-2 text-sm rounded-lg hover:bg-bg text-text-muted"
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  className="px-3 py-2 text-sm rounded-lg bg-signal text-bg-elevated font-medium hover:bg-signal-strong"
                >
                  회원가입
                </Link>
              </>
            )}
            {!loading && user && (
              <div className="relative">
                <button
                  onClick={() => setProfileOpen((v) => !v)}
                  className="w-9 h-9 rounded-full bg-signal/20 border border-signal/40 text-signal font-display font-bold flex items-center justify-center text-sm"
                >
                  {user.username.slice(0, 1).toUpperCase()}
                </button>
                {profileOpen && (
                  <div
                    onMouseLeave={() => setProfileOpen(false)}
                    className="absolute right-0 mt-2 w-52 rounded-xl border border-panel-border bg-panel shadow-xl py-1.5 text-sm"
                  >
                    <div className="px-3 py-2 text-text-muted text-xs border-b border-panel-border mb-1">
                      @{user.username}
                    </div>
                    <Link href={`/profile/${user.username}`} className="flex items-center gap-2 px-3 py-2 hover:bg-bg" onClick={() => setProfileOpen(false)}>
                      <LayoutDashboard size={14} /> 내 프로필
                    </Link>
                    <Link href="/upload" className="flex items-center gap-2 px-3 py-2 hover:bg-bg" onClick={() => setProfileOpen(false)}>
                      <UploadCloud size={14} /> 효과음 업로드
                    </Link>
                    <Link href="/favorites" className="flex items-center gap-2 px-3 py-2 hover:bg-bg" onClick={() => setProfileOpen(false)}>
                      <Heart size={14} /> 찜한 효과음
                    </Link>
                    <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 hover:bg-bg" onClick={() => setProfileOpen(false)}>
                      <LayoutDashboard size={14} /> 대시보드
                    </Link>
                    {user.role === "admin" && (
                      <Link href="/admin" className="flex items-center gap-2 px-3 py-2 hover:bg-bg" onClick={() => setProfileOpen(false)}>
                        <ShieldCheck size={14} /> 관리자 페이지
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        logout().then(() => router.push("/"));
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-bg text-danger"
                    >
                      <LogOut size={14} /> 로그아웃
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            className="md:hidden ml-auto p-2 rounded-lg hover:bg-bg"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="메뉴"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden pb-4 flex flex-col gap-3">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="효과음을 검색해보세요..."
                  className="w-full rounded-full border border-panel-border bg-bg pl-9 pr-3 py-2 text-sm outline-none focus:border-signal"
                />
              </div>
            </form>
            <div className="flex flex-col text-sm">
              {navLinks.map((l) => (
                <Link key={l.label} href={l.href} className="py-2 text-text-muted" onClick={() => setMenuOpen(false)}>
                  {l.label}
                </Link>
              ))}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-panel-border">
              <ThemeToggle />
              {!user ? (
                <div className="flex gap-2">
                  <Link href="/login" className="px-3 py-2 text-sm rounded-lg border border-panel-border" onClick={() => setMenuOpen(false)}>로그인</Link>
                  <Link href="/signup" className="px-3 py-2 text-sm rounded-lg bg-signal text-bg-elevated font-medium" onClick={() => setMenuOpen(false)}>회원가입</Link>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Link href={`/profile/${user.username}`} className="px-3 py-2 text-sm rounded-lg border border-panel-border" onClick={() => setMenuOpen(false)}>내 프로필</Link>
                  <button
                    onClick={() => { setMenuOpen(false); logout().then(() => router.push("/")); }}
                    className="px-3 py-2 text-sm rounded-lg text-danger"
                  >
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
