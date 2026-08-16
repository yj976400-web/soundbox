"use client";

import Link from "next/link";
import { Play, Pause, X, Volume2, VolumeX } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { formatTime } from "@/lib/format";
import Waveform from "./Waveform";

export default function MiniPlayer() {
  const { track, isPlaying, currentTime, duration, volume, toggle, seek, setVolume, close } =
    usePlayer();

  if (!track) return null;

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-panel-border bg-bg-elevated/95 backdrop-blur">
      <div className="mx-auto max-w-6xl px-3 sm:px-6 py-2.5 flex items-center gap-3">
        <button
          onClick={toggle}
          aria-label={isPlaying ? "일시정지" : "재생"}
          className="shrink-0 w-9 h-9 rounded-full bg-signal text-bg-elevated flex items-center justify-center hover:bg-signal-strong"
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
        </button>

        <div className="min-w-0 hidden sm:block w-36 shrink-0">
          <Link href={`/sound/${track.id}`} className="block truncate text-sm font-medium hover:text-signal">
            {track.title}
          </Link>
          <Link href={`/profile/${track.uploaderUsername}`} className="block truncate text-xs text-text-muted hover:text-signal">
            @{track.uploaderUsername}
          </Link>
        </div>

        <span className="hidden sm:block text-xs text-text-muted font-tabular w-10 text-right shrink-0">
          {formatTime(currentTime)}
        </span>

        <Waveform
          seed={track.id}
          progress={progress}
          playing={isPlaying}
          barCount={60}
          className="flex-1"
          onSeek={(ratio) => seek(ratio * duration)}
        />

        <span className="hidden sm:block text-xs text-text-muted font-tabular w-10 shrink-0">
          {formatTime(duration)}
        </span>

        <div className="hidden md:flex items-center gap-1.5 w-24 shrink-0">
          <button
            onClick={() => setVolume(volume > 0 ? 0 : 0.8)}
            aria-label="음소거"
            className="text-text-muted hover:text-signal"
          >
            {volume > 0 ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label="볼륨"
            className="w-full accent-[var(--signal)]"
          />
        </div>

        <button
          onClick={close}
          aria-label="플레이어 닫기"
          className="shrink-0 p-1.5 rounded-lg text-text-muted hover:bg-bg hover:text-danger"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
