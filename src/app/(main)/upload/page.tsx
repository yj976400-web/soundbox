"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, Music, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { CATEGORIES } from "@/lib/categories";

const ALLOWED_EXT = [".mp3", ".wav", ".ogg", ".m4a"];
const MAX_SIZE = 15 * 1024 * 1024;

export default function UploadPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [tags, setTags] = useState("");
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function validateAndSetFile(f: File) {
    setError("");
    const ext = "." + f.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      setError("MP3, WAV, OGG, M4A 형식만 업로드할 수 있습니다.");
      return;
    }
    if (f.size > MAX_SIZE) {
      setError("파일 크기는 15MB를 초과할 수 없습니다.");
      return;
    }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ""));

    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => setDuration(audio.duration || 0);
    audio.src = URL.createObjectURL(f);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) validateAndSetFile(f);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!authLoading && !user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-display font-bold text-2xl mb-3">로그인이 필요합니다.</h1>
        <p className="text-text-muted mb-6">효과음을 업로드하려면 먼저 로그인해주세요.</p>
        <button
          onClick={() => router.push("/login?next=/upload")}
          className="px-5 py-2.5 rounded-full bg-signal text-bg-elevated font-medium hover:bg-signal-strong"
        >
          로그인하러 가기
        </button>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!file) {
      setError("효과음 파일을 선택해주세요.");
      return;
    }
    if (!title.trim()) {
      setError("제목을 입력해주세요.");
      return;
    }

    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title.trim());
    formData.append("description", description.trim());
    formData.append("category", category);
    formData.append("tags", tags);
    formData.append("duration", String(duration));

    try {
      const id = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload");
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100));
        };
        xhr.onload = () => {
          try {
            const data = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) resolve(data.id);
            else reject(new Error(data.error || "업로드에 실패했습니다."));
          } catch {
            reject(new Error("업로드에 실패했습니다."));
          }
        };
        xhr.onerror = () => reject(new Error("네트워크 오류로 업로드에 실패했습니다."));
        xhr.send(formData);
      });
      router.push(`/sound/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드에 실패했습니다.");
      setUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 sm:px-6 py-12">
      <h1 className="font-display font-bold text-3xl mb-2">효과음 업로드</h1>
      <p className="text-text-muted mb-8">MP3, WAV, OGG, M4A 형식을 지원합니다. (최대 15MB)</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors ${
            dragOver ? "border-signal bg-signal/5" : "border-panel-border hover:border-signal/60"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".mp3,.wav,.ogg,.m4a,audio/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && validateAndSetFile(e.target.files[0])}
          />
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <Music size={20} className="text-signal" />
              <span className="text-sm">{file.name}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="text-text-faint hover:text-danger"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <>
              <UploadCloud size={28} className="mx-auto mb-3 text-text-faint" />
              <p className="text-sm text-text-muted">
                파일을 드래그해서 놓거나 클릭해서 선택하세요
              </p>
              <p className="text-xs text-text-faint mt-1">MP3 · WAV · OGG · M4A</p>
            </>
          )}
        </div>

        <label className="block">
          <span className="block text-sm font-medium mb-1.5">제목</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={100}
            className="w-full rounded-xl border border-panel-border bg-bg px-3.5 py-2.5 text-sm outline-none focus:border-signal"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-medium mb-1.5">설명</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            rows={3}
            className="w-full rounded-xl border border-panel-border bg-bg px-3.5 py-2.5 text-sm outline-none focus:border-signal"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-medium mb-1.5">카테고리</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border border-panel-border bg-bg px-3.5 py-2.5 text-sm outline-none focus:border-signal"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-sm font-medium mb-1.5">태그 (쉼표로 구분)</span>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="예: 클릭, UI, 짧은"
            className="w-full rounded-xl border border-panel-border bg-bg px-3.5 py-2.5 text-sm outline-none focus:border-signal"
          />
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}

        {uploading && (
          <div className="w-full h-2 rounded-full bg-bg overflow-hidden">
            <div
              className="h-full bg-signal transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={uploading}
          className="w-full py-3 rounded-xl bg-signal text-bg-elevated font-medium hover:bg-signal-strong disabled:opacity-60"
        >
          {uploading ? `업로드 중... ${progress}%` : "업로드"}
        </button>
      </form>
    </div>
  );
}
