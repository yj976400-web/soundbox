import Link from "next/link";

export default function UserNotFound() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-24 text-center">
      <h1 className="font-display font-bold text-2xl mb-3">존재하지 않는 사용자입니다.</h1>
      <Link href="/" className="text-signal hover:text-signal-strong font-medium">
        홈으로 이동 →
      </Link>
    </div>
  );
}
