import Link from "next/link";

export default function SoundNotFound() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-24 text-center">
      <h1 className="font-display font-bold text-2xl mb-3">존재하지 않는 효과음입니다.</h1>
      <p className="text-text-muted mb-6">삭제되었거나 잘못된 주소일 수 있어요.</p>
      <Link href="/explore" className="text-signal hover:text-signal-strong font-medium">
        효과음 탐색으로 이동 →
      </Link>
    </div>
  );
}
