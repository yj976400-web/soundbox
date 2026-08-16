"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import SoundCard from "./SoundCard";
import type { SoundWithUploader } from "@/lib/types";
import { CATEGORIES } from "@/lib/categories";

const SORT_OPTIONS: { key: string; label: string }[] = [
  { key: "latest", label: "최신순" },
  { key: "popular", label: "인기순" },
  { key: "downloads", label: "다운로드순" },
  { key: "favorites", label: "찜순" },
  { key: "plays", label: "재생순" },
];

export default function SoundBrowser({
  mode,
  fixedQuery,
}: {
  mode: "explore" | "search";
  fixedQuery?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = fixedQuery ?? searchParams.get("q") ?? "";
  const category = searchParams.get("category") || "전체";
  const sort = searchParams.get("sort") || "latest";
  const page = Number(searchParams.get("page") || 1);

  const [items, setItems] = useState<SoundWithUploader[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category && category !== "전체") params.set("category", category);
    params.set("sort", sort);
    params.set("page", String(page));
    params.set("pageSize", "12");

    setLoading(true);
    setError("");
    fetch(`/api/sounds?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("서버 오류가 발생했습니다.");
        return res.json();
      })
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      })
      .catch(() => setError("효과음 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요."))
      .finally(() => setLoading(false));
  }, [q, category, sort, page]);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "전체") params.set(key, value);
    else params.delete(key);
    if (key !== "page") params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div>
      <div id="categories" className="flex flex-wrap gap-2 mb-4">
        <FilterChip active={category === "전체"} onClick={() => updateParam("category", "전체")}>
          전체
        </FilterChip>
        {CATEGORIES.map((c) => (
          <FilterChip key={c} active={category === c} onClick={() => updateParam("category", c)}>
            {c}
          </FilterChip>
        ))}
      </div>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <p className="text-sm text-text-muted font-tabular">
          {mode === "search" && q ? (
            <>
              <span className="text-text">&ldquo;{q}&rdquo;</span> 검색 결과 {total}개
            </>
          ) : (
            <>총 {total}개의 효과음</>
          )}
        </p>
        <div className="flex items-center gap-1 rounded-full border border-panel-border p-1 text-xs">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => updateParam("sort", opt.key)}
              className={`px-3 py-1.5 rounded-full transition-colors ${
                sort === opt.key ? "bg-signal text-bg-elevated font-medium" : "text-text-muted hover:text-text"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-44 rounded-2xl border border-panel-border bg-panel animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-danger/30 bg-danger/5 py-16 text-center text-danger">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-panel-border py-16 text-center text-text-muted">
          {mode === "search" ? "검색 결과가 없습니다." : "조건에 맞는 효과음이 없습니다."}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {items.map((s) => (
              <SoundCard key={s.id} sound={s} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              {Array.from({ length: totalPages }).map((_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => updateParam("page", String(p))}
                    className={`w-9 h-9 rounded-full text-sm font-tabular ${
                      p === page ? "bg-signal text-bg-elevated" : "border border-panel-border text-text-muted hover:text-text"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
        active
          ? "bg-signal border-signal text-bg-elevated font-medium"
          : "border-panel-border text-text-muted hover:border-signal hover:text-signal"
      }`}
    >
      {children}
    </button>
  );
}
