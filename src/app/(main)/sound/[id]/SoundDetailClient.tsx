"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Pause, Heart, Download, Flag } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import Waveform from "@/components/Waveform";
import { formatCount, formatTime } from "@/lib/format";
import type { SoundWithUploader } from "@/lib/types";

const REPORT_REASONS = ["부적절한 콘텐츠", "저작권 침해 의심", "스팸", "기타"];

export default function SoundDetailClient({
  sound,
  tags,
  isLoggedIn,
}: {
  sound: SoundWithUploader;
  tags: string[];
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const { track, isPlaying, currentTime, duration, play } = usePlayer();
  const isCurrent = track?.id === sound.id;
  const progress = isCurrent && duration > 0 ? currentTime / duration : 0;

  const [favorited, setFavorited] = useState(!!sound.isFavorited);
  const [favCount, setFavCount] = useState(sound.favoriteCount);
  const [busy, setBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
  const [reportDetail, setReportDetail] = useState("");
  const [reportStatus, setReportStatus] = useState<"idle" | "sent" | "error">("idle");

  function handlePlay() {
    play({
      id: sound.id,
      title: sound.title,
      uploaderUsername: sound.uploaderUsername,
      fileUrl: sound.fileUrl,
    });
  }

  async function handleFavorite() {
    if (!isLoggedIn) {
      router.push(`/login?next=/sound/${sound.id}`);
      return;
    }
    if (busy) return;
    setBusy(true);
    const next = !favorited;
    setFavorited(next);
    setFavCount((c) => (next ? c + 1 : c - 1));
    try {
      const res = await fetch(`/api/sounds/${sound.id}/favorite`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setFavorited(data.favorited);
        setFavCount(data.favoriteCount);
      }
    } finally {
      setBusy(false);
    }
  }

  async function submitReport(e: React.FormEvent) {
    e.preventDefault();
    setReportStatus("idle");
    const res = await fetch(`/api/sounds/${sound.id}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reportReason, detail: reportDetail }),
    });
    if (res.ok) {
      setReportStatus("sent");
      setReportDetail("");
      setTimeout(() => setReportOpen(false), 1200);
    } else {
      setReportStatus("error");
    }
  }

  return (
    <div className="rounded-2xl border border-panel-border bg-panel p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl">{sound.title}</h1>
          <p className="mt-2 text-text-muted max-w-2xl">
            {sound.description || "설명이 없습니다."}
          </p>
        </div>
        <button
          onClick={() => setReportOpen((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-text-faint hover:text-danger px-3 py-1.5 rounded-full border border-panel-border"
        >
          <Flag size={13} /> 신고
        </button>
      </div>

      <div className="mt-8 flex items-center gap-4">
        <button
          onClick={handlePlay}
          aria-label={isCurrent && isPlaying ? "일시정지" : "재생"}
          className="shrink-0 w-14 h-14 rounded-full bg-signal text-bg-elevated flex items-center justify-center hover:bg-signal-strong"
        >
          {isCurrent && isPlaying ? <Pause size={22} /> : <Play size={22} className="ml-1" />}
        </button>
        <div className="flex-1">
          <Waveform
            seed={sound.id}
            progress={progress}
            playing={isCurrent && isPlaying}
            barCount={64}
            className="h-14"
          />
          <div className="flex justify-between text-xs text-text-muted font-tabular mt-1">
            <span>{isCurrent ? formatTime(currentTime) : "0:00"}</span>
            <span>{isCurrent && duration ? formatTime(duration) : formatTime(sound.duration)}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <a
          href={`/api/sounds/${sound.id}/download`}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-signal text-bg-elevated text-sm font-medium hover:bg-signal-strong"
        >
          <Download size={16} /> 다운로드 ({formatCount(sound.downloadCount)})
        </a>
        <button
          onClick={handleFavorite}
          aria-pressed={favorited}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium border transition-colors ${
            favorited
              ? "border-danger text-danger bg-danger/10"
              : "border-panel-border text-text-muted hover:border-danger hover:text-danger"
          }`}
        >
          <Heart size={16} className={favorited ? "fill-danger" : ""} />
          찜 {formatCount(favCount)}
        </button>
        <span className="text-sm text-text-muted font-tabular ml-auto">
          ▶ 재생 {formatCount(sound.playCount)}회
        </span>
      </div>

      {reportOpen && (
        <form onSubmit={submitReport} className="mt-6 p-4 rounded-xl border border-panel-border bg-bg space-y-3">
          <p className="text-sm font-medium">이 효과음을 신고하는 이유를 선택해주세요.</p>
          <div className="flex flex-wrap gap-2">
            {REPORT_REASONS.map((r) => (
              <label
                key={r}
                className={`text-xs px-3 py-1.5 rounded-full border cursor-pointer ${
                  reportReason === r ? "bg-signal text-bg-elevated border-signal" : "border-panel-border text-text-muted"
                }`}
              >
                <input
                  type="radio"
                  name="reason"
                  value={r}
                  checked={reportReason === r}
                  onChange={() => setReportReason(r)}
                  className="hidden"
                />
                {r}
              </label>
            ))}
          </div>
          <textarea
            value={reportDetail}
            onChange={(e) => setReportDetail(e.target.value)}
            placeholder="추가 설명 (선택)"
            rows={2}
            className="w-full rounded-lg border border-panel-border bg-panel p-2 text-sm outline-none focus:border-signal"
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="px-4 py-2 rounded-full bg-danger text-white text-sm font-medium hover:opacity-90"
            >
              신고 접수
            </button>
            {reportStatus === "sent" && (
              <span className="text-xs text-signal">신고가 접수되었습니다. 감사합니다.</span>
            )}
            {reportStatus === "error" && (
              <span className="text-xs text-danger">신고 접수에 실패했습니다. 다시 시도해주세요.</span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
