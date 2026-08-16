"use client";

// 실제 오디오 디코딩 없이도 각 효과음마다 고유하고 일관된 파형을 보여주기 위해
// id를 시드로 한 결정론적 의사난수로 막대 높이를 생성한다.
function seededBars(seed: string, count: number): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    const v = 0.18 + ((h >>> 8) % 100) / 100 * 0.82;
    bars.push(v);
  }
  return bars;
}

export default function Waveform({
  seed,
  progress = 0,
  playing = false,
  barCount = 40,
  className = "",
  onSeek,
}: {
  seed: string;
  progress?: number; // 0~1
  playing?: boolean;
  barCount?: number;
  className?: string;
  onSeek?: (ratio: number) => void;
}) {
  const bars = seededBars(seed, barCount);

  return (
    <div
      className={`flex items-center gap-[2px] h-10 ${onSeek ? "cursor-pointer" : ""} ${className}`}
      onClick={
        onSeek
          ? (e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              onSeek(Math.min(1, Math.max(0, ratio)));
            }
          : undefined
      }
      role={onSeek ? "slider" : undefined}
      aria-label={onSeek ? "재생 위치" : undefined}
    >
      {bars.map((h, i) => {
        const isActive = i / barCount < progress;
        return (
          <span
            key={i}
            className={`flex-1 rounded-full ${isActive ? "bg-signal" : "bg-text-faint/40"} ${
              playing && isActive ? "eq-bar" : ""
            }`}
            style={{
              height: `${h * 100}%`,
              animationDelay: playing ? `${(i % 7) * 0.08}s` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
