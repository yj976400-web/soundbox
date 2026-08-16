"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export type PlayerTrack = {
  id: string;
  title: string;
  uploaderUsername: string;
  fileUrl: string;
};

type PlayerContextValue = {
  track: PlayerTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  play: (track: PlayerTrack) => void;
  toggle: () => void;
  seek: (time: number) => void;
  setVolume: (v: number) => void;
  close: () => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [track, setTrack] = useState<PlayerTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;

    const onTime = () => setCurrentTime(audio.currentTime);
    const onLoaded = () => setDuration(audio.duration || 0);
    const onEnd = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.pause();
    };
  }, []);

  const play = useCallback((newTrack: PlayerTrack) => {
    const audio = audioRef.current;
    if (!audio) return;

    setTrack((prev) => {
      if (prev?.id === newTrack.id) {
        // 같은 트랙이면 이어서 재생/일시정지 토글
        if (audio.paused) audio.play().catch(() => {});
        else audio.pause();
        return prev;
      }
      audio.src = newTrack.fileUrl;
      audio.currentTime = 0;
      audio.play().catch(() => {});
      fetch(`/api/sounds/${newTrack.id}/play`, { method: "POST" }).catch(() => {});
      return newTrack;
    });
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }, [track]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  const setVolume = useCallback((v: number) => {
    const audio = audioRef.current;
    setVolumeState(v);
    if (audio) audio.volume = v;
  }, []);

  const close = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = "";
    }
    setTrack(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  return (
    <PlayerContext.Provider
      value={{ track, isPlaying, currentTime, duration, volume, play, toggle, seek, setVolume, close }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer는 PlayerProvider 내부에서만 사용할 수 있습니다.");
  return ctx;
}
