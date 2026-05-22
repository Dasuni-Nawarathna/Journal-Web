'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Music } from 'lucide-react';

// ─── Track Config ─────────────────────────────────────────────────────────────

type TrackId = 'rain' | 'wind' | 'cafe' | 'ocean';
interface Track {
  id: TrackId;
  label: string;
  emoji: string;
  description: string;
}

const TRACKS: Track[] = [
  { id: 'rain',  label: 'Rain',  emoji: '🌧️', description: 'Gentle rainfall' },
  { id: 'wind',  label: 'Wind',  emoji: '🍃', description: 'Soft distant breeze' },
  { id: 'cafe',  label: 'Café',  emoji: '☕', description: 'Cozy coffee shop' },
  { id: 'ocean', label: 'Waves', emoji: '🌊', description: 'Ocean waves' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function AmbientPlayer() {
  const [isOpen, setIsOpen]           = useState(false);
  const [activeId, setActiveId]       = useState<TrackId | null>(null);
  const [volume, setVolume]           = useState(0.5);
  const [isMuted, setIsMuted]         = useState(false);

  const audioElementsRef = useRef<{ [key in TrackId]?: HTMLAudioElement }>({});

  useEffect(() => {
    // Pre-create and configure Audio objects for each ambient sound track
    TRACKS.forEach((track) => {
      const audio = new Audio(`/audio/${track.id}.mp3`);
      audio.loop = true;
      audio.preload = 'auto';
      audioElementsRef.current[track.id] = audio;
    });

    // Cleanup: Pause and unload all audio objects on unmount to prevent memory leaks
    return () => {
      Object.values(audioElementsRef.current).forEach((audio) => {
        if (audio) {
          audio.pause();
          audio.src = ''; // Unload the file from browser memory
        }
      });
    };
  }, []);

  // Sync volume and mute state directly to the currently playing audio element
  useEffect(() => {
    const activeAudio = activeId ? audioElementsRef.current[activeId] : null;
    if (activeAudio) {
      activeAudio.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted, activeId]);

  const playTrack = useCallback((track: Track) => {
    const nextAudio = audioElementsRef.current[track.id];
    if (!nextAudio) return;

    if (activeId === track.id) {
      nextAudio.pause();
      setActiveId(null);
      return;
    }

    // Stop currently active audio if there is one
    if (activeId) {
      const currentAudio = audioElementsRef.current[activeId];
      if (currentAudio) {
        currentAudio.pause();
      }
    }

    // Set correct volume before playing to avoid loud burst
    nextAudio.volume = isMuted ? 0 : volume;
    
    // Play the chosen ambient sound
    nextAudio.play().catch((err) => {
      console.warn(`Failed to play audio for ${track.id}:`, err);
    });
    
    setActiveId(track.id);
  }, [activeId, isMuted, volume]);

  const activeTrack = TRACKS.find((t) => t.id === activeId);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
          activeId
            ? 'bg-lavender/40 border-lavender text-espresso'
            : 'bg-white/60 border-blush/20 text-espresso/60 hover:bg-canvas hover:text-espresso'
        }`}
        title="Ambient sound player"
      >
        {activeId ? (
          <><span className="animate-pulse">{activeTrack?.emoji}</span><span>{activeTrack?.label}</span></>
        ) : (
          <><Music className="w-3 h-3" /><span>Ambient</span></>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="absolute top-9 right-0 w-60 bg-white/96 backdrop-blur-md border border-blush/25 rounded-2xl shadow-xl p-4 space-y-3 z-50"
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-espresso/60 flex items-center gap-1.5">
              <Music className="w-3 h-3 text-lavender" />
              <span>Ambient Sounds</span>
            </div>

            {/* Track Grid */}
            <div className="grid grid-cols-2 gap-1.5">
              {TRACKS.map((track) => {
                const isActive = activeId === track.id;
                return (
                  <button
                    key={track.id}
                    onClick={() => playTrack(track)}
                    className={`flex flex-col items-start gap-0.5 text-left px-2.5 py-2 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-espresso text-canvas border-espresso shadow-sm'
                        : 'bg-canvas/50 border-blush/15 text-espresso/70 hover:border-lavender hover:bg-lavender/15'
                    }`}
                  >
                    <div className="flex items-center gap-1 text-[11px] font-semibold w-full">
                      <span>{track.emoji}</span>
                      <span>{track.label}</span>
                      {isActive && (
                        <span className="ml-auto flex items-end gap-0.5 h-3">
                          {[4, 6, 5].map((h, i) => (
                            <span
                              key={i}
                              className="w-0.5 bg-canvas/60 rounded-full animate-bounce"
                              style={{ height: `${h}px`, animationDelay: `${i * 0.1}s` }}
                            />
                          ))}
                        </span>
                      )}
                    </div>
                    <span className={`text-[9px] ${isActive ? 'text-canvas/50' : 'text-espresso/40'}`}>
                      {track.description}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Volume */}
            <div className="space-y-1.5 pt-1 border-t border-canvas">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-espresso/50 font-semibold uppercase tracking-wide">Volume</span>
                <button
                  onClick={() => setIsMuted((m) => !m)}
                  className="p-0.5 rounded text-espresso/50 hover:text-espresso transition-colors cursor-pointer"
                >
                  {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0} max={1} step={0.01}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => { setIsMuted(false); setVolume(Number(e.target.value)); }}
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

            {activeId && (
              <div className="flex items-center gap-1.5 text-[9px] text-espresso/50">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse flex-shrink-0" />
                <span>Now playing · {activeTrack?.description}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
