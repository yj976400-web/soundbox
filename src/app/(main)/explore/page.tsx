import { Suspense } from "react";
import SoundBrowser from "@/components/SoundBrowser";

export const metadata = { title: "효과음 탐색" };

export default function ExplorePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <h1 className="font-display font-bold text-3xl mb-2">효과음 탐색</h1>
      <p className="text-text-muted mb-8">카테고리와 정렬 기준으로 원하는 효과음을 찾아보세요.</p>
      <Suspense fallback={<div className="text-text-muted">불러오는 중...</div>}>
        <SoundBrowser mode="explore" />
      </Suspense>
    </div>
  );
}
