import { Suspense } from "react";
import SoundBrowser from "@/components/SoundBrowser";

export const metadata = { title: "검색 결과" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <h1 className="font-display font-bold text-3xl mb-2">검색</h1>
      <p className="text-text-muted mb-8">
        제목, 설명, 태그, 카테고리, 업로더 이름으로 검색합니다.
      </p>
      <Suspense fallback={<div className="text-text-muted">불러오는 중...</div>}>
        <SoundBrowser mode="search" fixedQuery={q || ""} />
      </Suspense>
    </div>
  );
}
