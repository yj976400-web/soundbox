"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import FormField from "@/components/FormField";

export default function SignupPage() {
  const router = useRouter();
  const { refresh } = useAuth();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password, passwordConfirm }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "회원가입에 실패했습니다.");
        return;
      }
      await refresh();
      router.push("/");
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:py-24">
      <h1 className="font-display font-bold text-2xl mb-1 text-center">회원가입</h1>
      <p className="text-text-muted text-sm text-center mb-8">
        효과음을 업로드하고 찜하려면 계정이 필요해요.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          label="이메일"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <FormField
          label="사용자명"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          minLength={3}
          maxLength={20}
          placeholder="영문, 숫자, _, - 사용 (3~20자)"
          autoComplete="username"
        />
        <FormField
          label="비밀번호"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
        <FormField
          label="비밀번호 확인"
          type="password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-signal text-bg-elevated font-medium hover:bg-signal-strong disabled:opacity-60"
        >
          {loading ? "가입 중..." : "회원가입"}
        </button>
      </form>

      <p className="text-sm text-text-muted text-center mt-6">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="text-signal hover:text-signal-strong font-medium">
          로그인
        </Link>
      </p>
    </div>
  );
}
