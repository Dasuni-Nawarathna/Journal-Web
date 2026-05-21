'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Music, CloudRain, Wind, Coffee } from 'lucide-react';

interface AudioTrack {
  id: string;
  label: string;
  emoji: string;
  icon: React.ReactNode;
  // Using royalty-free audio from public sources
  src: string;
}

const TRACKS: AudioTrack[] = [
  {
    id: 'rain',
    label: 'Rain',
    emoji: '🌧️',
    icon: <CloudRain className="w-3.5 h-3.5" />,
    // Free rain sound from freesound.org (CC0)
    src: 'https://assets.mixkit.co/active_storage/sfx/212/212-preview.mp3',
  },
  {
    id: 'lofi',
    label: 'Lo-fi',
    emoji: '🎵',
    icon: <Music className="w-3.5 h-3.5" />,
    src: 'https://assets.mixkit.co/active_storage/sfx/2530/2530-preview.mp3',
  },
  {
    id: 'wind',
    label: 'Wind',
    emoji: '🍃',
    icon: <Wind className="w-3.5 h-3.5" />,
    src: 'https://assets.mixkit.co/active_storage/sfx/2397/2397-preview.mp3',
  },
  {
    id: 'cafe',
    label: 'Café',
    emoji: '☕',
    icon: <Coffee className="w-3.5 h-3.5" />,
    src: 'https://assets.mixkit.co/active_storage/sfx/2522/2522-preview.mp3',
  },
];

export default function AmbientPlayer() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.35);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playTrack = (track: AudioTrack) => {
    // If same track is active, stop it
    if (activeTrackId === track.id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setActiveTrackId(null);
      return;
    }

    // Stop any playing track first
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Create new audio instance
    const audio = new Audio(track.src);
    audio.loop = true;
    audio.volume = isMuted ? 0 : volume;
    audio.play().catch((err) => {
      console.warn('Audio playback blocked by browser autoplay policy:', err);
    });

    audioRef.current = audio;
    setActiveTrackId(track.id);
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (audioRef.current && !isMuted) {
      audioRef.current.volume = newVolume;
    }
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (audioRef.current) {
      audioRef.current.volume = newMuted ? 0 : volume;
    }
  };

  const activeTrack = TRACKS.find((t) => t.id === activeTrackId);

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
          activeTrackId
            ? 'bg-lavender/40 border-lavender text-espresso animate-pulse'
            : 'bg-white/60 border-blush/20 text-espresso/60 hover:bg-canvas hover:text-espresso'
        }`}
        title="Ambient sound player"
      >
        {activeTrackId ? (
          <>
            <span>{activeTrack?.emoji}</span>
            <span>{activeTrack?.label}</span>
          </>
        ) : (
          <>
            <Music className="w-3 h-3" />
            <span>Ambient</span>
          </>
        )}
      </button>

      {/* Floating Player Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="absolute top-9 right-0 w-56 bg-white/95 backdrop-blur-md border border-blush/25 rounded-2xl shadow-xl p-4 space-y-3 z-50"
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-espresso/60 flex items-center gap-1.5">
              <Music className="w-3 h-3 text-lavender" />
              <span>Ambient Sounds</span>
            </div>

            {/* Track Selection Grid */}
            <div className="grid grid-cols-2 gap-1.5">
              {TRACKS.map((track) => {
                const isActive = activeTrackId === track.id;
                return (
                  <button
                    key={track.id}
                    onClick={() => playTrack(track)}
                    className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-2 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-espresso text-canvas border-espresso shadow-sm'
                        : 'bg-canvas/50 border-blush/15 text-espresso/70 hover:border-lavender hover:bg-lavender/20'
                    }`}
                  >
                    <span className="text-sm">{track.emoji}</span>
                    <span>{track.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Volume Control */}
            <div className="space-y-1.5 pt-1 border-t border-canvas">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-espresso/50 font-semibold uppercase tracking-wide">Volume</span>
                <button
                  onClick={toggleMute}
                  className="p-0.5 rounded text-espresso/50 hover:text-espresso transition-colors cursor-pointer"
                >
                  {isMuted ? (
                    <VolumeX className="w-3 h-3" />
                  ) : (
                    <Volume2 className="w-3 h-3" />
                  )}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #2D2A26 ${(isMuted ? 0 : volume) * 100}%, #F5E1E2 ${(isMuted ? 0 : volume) * 100}%)`,
                  }}
                />
                <span className="text-[9px] font-mono text-espresso/40 w-6 text-right">
                  {Math.round((isMuted ? 0 : volume) * 100)}
                </span>
              </div>
            </div>

            {/* Active indicator */}
            {activeTrackId && (
              <div className="flex items-center gap-1.5 text-[9px] text-espresso/50 pt-0.5">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                <span>Now playing: {activeTrack?.label}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
