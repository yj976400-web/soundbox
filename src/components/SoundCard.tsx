"use client";

import Link from "next/link";
import { useState } from "react";
import { Play, Pause, Download, Heart } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { useAuth } from "@/context/AuthContext";
import Waveform from "./Waveform";
import { formatCount, formatTime } from "@/lib/format";
import type { SoundWithUploader } from "@/lib/types";
import { useRouter } from "next/navigation";

export default function SoundCard({ sound }: { sound: SoundWithUploader }) {
  const { track, isPlaying, currentTime, duration, play } = usePlayer();
  const { user } = useAuth();
  const router = useRouter();
  const isCurrent = track?.id === sound.id;
  const [favorited, setFavorited] = useState(!!sound.isFavorited);
  const [favCount, setFavCount] = useState(sound.favoriteCount);
  const [busy, setBusy] = useState(false);

  const progress = isCurrent && duration > 0 ? currentTime / duration : 0;

  function handlePlay() {
    play({
      id: sound.id,
      title: sound.title,
      uploaderUsername: sound.uploaderUsername,
      fileUrl: sound.fileUrl,
    });
  }

  async function handleFavorite() {
    if (!user) {
      router.push(`/login?next=/sound/${sound.id}`);
      return;
    }
    if (busy) return;
    setBusy(true);
    setFavorited((f) => !f);
    setFavCount((c) => (favorited ? c - 1 : c + 1));
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

  function handleDownload(e: React.MouseEvent) {
    e.preventDefault();
    window.location.href = `/api/sounds/${sound.id}/download`;
  }

  return (
    <div className="group rounded-2xl border border-panel-border bg-panel p-4 flex flex-col gap-3 transition-colors hover:border-signal/50">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/sound/${sound.id}`} className="min-w-0 flex-1">
          <h3 className="font-display font-semibold text-[15px] truncate group-hover:text-signal transition-colors">
            {sound.title}
          </h3>
          <p className="text-xs text-text-muted truncate mt-0.5">
            {sound.description || "설명이 없습니다."}
          </p>
        </Link>
        <span className="shrink-0 text-[10px] uppercase tracking-wide px-2 py-1 rounded-full bg-bg text-text-muted border border-panel-border">
          {sound.category}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handlePlay}
          aria-label={isCurrent && isPlaying ? "일시정지" : "재생"}
          className="shrink-0 w-9 h-9 rounded-full bg-signal text-bg-elevated flex items-center justify-center hover:bg-signal-strong transition-colors"
        >
          {isCurrent && isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
        </button>
        <Waveform
          seed={sound.id}
          progress={progress}
          playing={isCurrent && isPlaying}
          barCount={28}
          className="flex-1"
        />
      </div>

      <div className="flex items-center justify-between text-xs text-text-muted font-tabular">
        <Link
          href={`/profile/${sound.uploaderUsername}`}
          className="hover:text-signal truncate max-w-[40%]"
        >
          @{sound.uploaderUsername}
        </Link>
        <span>
          {isCurrent && duration
            ? `${formatTime(currentTime)} / ${formatTime(duration)}`
            : formatTime(sound.duration)}
        </span>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-panel-border">
        <div className="flex items-center gap-3 text-xs text-text-muted font-tabular">
          <span title="재생 횟수">▶ {formatCount(sound.playCount)}</span>
          <span title="다운로드 횟수">⬇ {formatCount(sound.downloadCount)}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleFavorite}
            aria-label="찜"
            aria-pressed={favorited}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-bg text-xs font-tabular"
          >
            <Heart
              size={15}
              className={favorited ? "fill-danger text-danger" : "text-text-muted"}
            />
            {formatCount(favCount)}
          </button>
          <button
            onClick={handleDownload}
            aria-label="다운로드"
            className="p-2 rounded-lg hover:bg-bg text-text-muted hover:text-signal"
          >
            <Download size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
