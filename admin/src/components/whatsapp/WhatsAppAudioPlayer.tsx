import { Pause, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  src: string;
  isOutbound?: boolean;
};

function formatDuration(value: number): string {
  if (!Number.isFinite(value) || value < 0) {
    return "00:00";
  }

  const totalSeconds = Math.floor(value);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export default function WhatsAppAudioPlayer({ src, isOutbound }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setError(false);
  }, [src]);

  const progress = useMemo(() => {
    if (!duration) {
      return 0;
    }

    return Math.min(100, (currentTime / duration) * 100);
  }, [currentTime, duration]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (audio.paused) {
      try {
        await audio.play();
        setPlaying(true);
      } catch {
        setError(true);
      }
      return;
    }

    audio.pause();
    setPlaying(false);
  };

  const onSeek = (value: number) => {
    const audio = audioRef.current;
    if (!audio || !duration) {
      return;
    }

    const nextTime = (value / 100) * duration;
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  return (
    <div
      className={`w-full rounded-xl border px-2.5 py-2 ${
        isOutbound ? "border-blue-300/70 bg-blue-500/30" : "border-slate-200 bg-slate-50"
      }`}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        onEnded={() => {
          setPlaying(false);
          setCurrentTime(0);
        }}
        onError={() => setError(true)}
      />

      {error ? (
        <p className={`text-xs ${isOutbound ? "text-blue-100" : "text-slate-500"}`}>
          Nao foi possivel reproduzir o audio.
        </p>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void togglePlay()}
            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
              isOutbound ? "bg-white/20 text-white hover:bg-white/30" : "bg-white text-slate-700 hover:bg-slate-100"
            }`}
            title={playing ? "Pausar audio" : "Reproduzir audio"}
          >
            {playing ? <Pause size={15} /> : <Play size={15} className="translate-x-[1px]" />}
          </button>

          <div className="min-w-0 flex-1">
            <div className="relative">
              <div
                className={`h-1.5 w-full rounded-full ${
                  isOutbound ? "bg-white/25" : "bg-slate-200"
                }`}
              />
              <div
                className={`pointer-events-none absolute left-0 top-0 h-1.5 rounded-full ${
                  isOutbound ? "bg-white" : "bg-blue-600"
                }`}
                style={{ width: `${progress}%` }}
              />
              <input
                type="range"
                min={0}
                max={100}
                step={0.1}
                value={progress}
                onChange={(event) => onSeek(Number(event.target.value))}
                className="absolute inset-0 h-1.5 w-full cursor-pointer appearance-none bg-transparent"
                aria-label="Barra de progresso do audio"
              />
            </div>
            <div className={`mt-1 flex justify-between text-[11px] ${isOutbound ? "text-blue-100" : "text-slate-500"}`}>
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
