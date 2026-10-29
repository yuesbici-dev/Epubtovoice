import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  X,
  Download,
} from 'lucide-react';
import { formatDuration } from '../utils/textCleaner';

interface AudioPlayerDrawerProps {
  title: string;
  subtitle: string;
  audioUrl: string;
  fileName?: string;
  onClose: () => void;
}

export const AudioPlayerDrawer: React.FC<AudioPlayerDrawerProps> = ({
  title,
  subtitle,
  audioUrl,
  fileName,
  onClose,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Setup Android 16 MediaSession integration
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    }

    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist: 'EpubToVoice',
        album: subtitle,
      });

      navigator.mediaSession.setActionHandler('play', () => {
        audioRef.current?.play();
        setIsPlaying(true);
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        audioRef.current?.pause();
        setIsPlaying(false);
      });
      navigator.mediaSession.setActionHandler('seekbackward', () => {
        skipSeconds(-15);
      });
      navigator.mediaSession.setActionHandler('seekforward', () => {
        skipSeconds(15);
      });
    }

    return () => {
      if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('seekbackward', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
      }
    };
  }, [audioUrl, title, subtitle]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const skipSeconds = (sec: number) => {
    if (audioRef.current) {
      const newTime = Math.max(0, Math.min(duration || 0, audioRef.current.currentTime + sec));
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = fileName || 'audiobook_chapter.mp3';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed bottom-16 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#E7E0D3] px-4 py-3 shadow-lg">
      <audio
        ref={audioRef}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="max-w-3xl mx-auto space-y-2">
        {/* Track Info & Quick Close */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-[#1C1917] truncate">{title}</div>
            <div className="text-[11px] text-[#78716C] truncate">{subtitle}</div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleDownload}
              className="p-1.5 rounded-lg bg-[#FAF7F2] hover:bg-[#F5F2EB] text-[#44403C] border border-[#E7E0D3] transition-none cursor-pointer"
              title="Download MP3"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAF7F2] transition-none cursor-pointer"
              title="Close player"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar & Timestamps */}
        <div className="space-y-1">
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="w-full accent-[#78350F] h-1.5 bg-[#F5F2EB] rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] font-mono text-[#78716C]">
            <span>{formatDuration(Math.floor(currentTime))}</span>
            <span>{formatDuration(Math.floor(duration))}</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => skipSeconds(-15)}
            className="p-2 rounded-xl text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAF7F2] transition-none cursor-pointer"
            title="Skip back 15s"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            className="w-11 h-11 rounded-full bg-[#78350F] hover:bg-[#692E0B] text-white flex items-center justify-center transition-none cursor-pointer shadow-md"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={() => skipSeconds(15)}
            className="p-2 rounded-xl text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAF7F2] transition-none cursor-pointer"
            title="Skip forward 15s"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
