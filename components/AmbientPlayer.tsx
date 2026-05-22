'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Music, CloudRain, Wind, Coffee, Droplets } from 'lucide-react';

// ─── Sound Generator Utilities ───────────────────────────────────────────────

/** Creates a looping white-noise buffer source */
function createNoiseBuffer(ctx: AudioContext, seconds = 8): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const frameCount = sampleRate * seconds;
  const buffer = ctx.createBuffer(1, frameCount, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

/** Creates brown noise buffer (random walk) — warm, deep rumble */
function createBrownBuffer(ctx: AudioContext, seconds = 8): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const frameCount = sampleRate * seconds;
  const buffer = ctx.createBuffer(1, frameCount, sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < frameCount; i++) {
    const white = (Math.random() * 2 - 1) * 0.02;
    last = (last + white) / 1.02;
    data[i] = last * 3.5;
  }
  return buffer;
}

interface SoundNodes {
  sources: AudioBufferSourceNode[];
  gainNode: GainNode;
  stop: () => void;
}

function createRain(ctx: AudioContext, masterGain: GainNode): SoundNodes {
  const gainNode = ctx.createGain();
  gainNode.gain.value = 0.7;
  gainNode.connect(masterGain);

  const buffer = createNoiseBuffer(ctx, 10);

  // Main rain: bandpass ~1.2kHz
  const src1 = ctx.createBufferSource();
  src1.buffer = buffer;
  src1.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1200;
  bp.Q.value = 0.4;
  src1.connect(bp);
  bp.connect(gainNode);
  src1.start();

  // Low rumble: lowpass for background rain wash
  const src2 = ctx.createBufferSource();
  src2.buffer = createBrownBuffer(ctx, 10);
  src2.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 300;
  const g2 = ctx.createGain();
  g2.gain.value = 0.4;
  src2.connect(lp);
  lp.connect(g2);
  g2.connect(gainNode);
  src2.start();

  return {
    sources: [src1, src2],
    gainNode,
    stop: () => { try { src1.stop(); src2.stop(); } catch {} },
  };
}

function createWind(ctx: AudioContext, masterGain: GainNode): SoundNodes {
  const gainNode = ctx.createGain();
  gainNode.gain.value = 0.55;
  gainNode.connect(masterGain);

  const buffer = createNoiseBuffer(ctx, 12);

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;

  // Soft lowpass filter — wind is all low-mid frequencies
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 600;
  lp.Q.value = 0.8;

  // LFO to make wind swell and fade naturally
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.07; // very slow cycle
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.3;
  lfo.connect(lfoGain);
  lfoGain.connect(gainNode.gain);
  lfo.start();

  src.connect(lp);
  lp.connect(gainNode);
  src.start();

  return {
    sources: [src],
    gainNode,
    stop: () => { try { src.stop(); lfo.stop(); } catch {} },
  };
}

function createCafe(ctx: AudioContext, masterGain: GainNode): SoundNodes {
  const gainNode = ctx.createGain();
  gainNode.gain.value = 0.5;
  gainNode.connect(masterGain);

  // Base: brown noise for room warmth
  const brownSrc = ctx.createBufferSource();
  brownSrc.buffer = createBrownBuffer(ctx, 10);
  brownSrc.loop = true;
  const brownGain = ctx.createGain();
  brownGain.gain.value = 0.6;
  brownSrc.connect(brownGain);
  brownGain.connect(gainNode);
  brownSrc.start();

  // Mid: band-passed white noise ~3kHz for background chatter texture
  const chatterSrc = ctx.createBufferSource();
  chatterSrc.buffer = createNoiseBuffer(ctx, 8);
  chatterSrc.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2800;
  bp.Q.value = 1.5;
  const chatterGain = ctx.createGain();
  chatterGain.gain.value = 0.18;

  // Slow LFO on chatter to simulate conversation rhythm
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.18;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.08;
  lfo.connect(lfoGain);
  lfoGain.connect(chatterGain.gain);
  lfo.start();

  chatterSrc.connect(bp);
  bp.connect(chatterGain);
  chatterGain.connect(gainNode);
  chatterSrc.start();

  return {
    sources: [brownSrc, chatterSrc],
    gainNode,
    stop: () => { try { brownSrc.stop(); chatterSrc.stop(); lfo.stop(); } catch {} },
  };
}

function createOcean(ctx: AudioContext, masterGain: GainNode): SoundNodes {
  const gainNode = ctx.createGain();
  gainNode.gain.value = 0.6;
  gainNode.connect(masterGain);

  const buffer = createNoiseBuffer(ctx, 12);

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;

  // Deep lowpass for ocean wash
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 450;

  // Slow wave LFO (~0.1Hz = one wave every ~10 seconds)
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.1;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.45;
  lfo.connect(lfoGain);
  lfoGain.connect(gainNode.gain);
  lfo.start();

  // High shimmer for sea spray
  const src2 = ctx.createBufferSource();
  src2.buffer = createNoiseBuffer(ctx, 8);
  src2.loop = true;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 5000;
  const shimmerGain = ctx.createGain();
  shimmerGain.gain.value = 0.08;
  src2.connect(hp);
  hp.connect(shimmerGain);
  shimmerGain.connect(gainNode);
  src2.start();

  src.connect(lp);
  lp.connect(gainNode);
  src.start();

  return {
    sources: [src, src2],
    gainNode,
    stop: () => { try { src.stop(); src2.stop(); lfo.stop(); } catch {} },
  };
}

// ─── Track Config ─────────────────────────────────────────────────────────────

type TrackId = 'rain' | 'wind' | 'cafe' | 'ocean';

interface Track {
  id: TrackId;
  label: string;
  emoji: string;
  icon: React.ReactNode;
  create: (ctx: AudioContext, master: GainNode) => SoundNodes;
  description: string;
}

const TRACKS: Track[] = [
  {
    id: 'rain',
    label: 'Rain',
    emoji: '🌧️',
    icon: <CloudRain className="w-3.5 h-3.5" />,
    create: createRain,
    description: 'Gentle rainfall',
  },
  {
    id: 'wind',
    label: 'Wind',
    emoji: '🍃',
    icon: <Wind className="w-3.5 h-3.5" />,
    create: createWind,
    description: 'Soft breeze',
  },
  {
    id: 'cafe',
    label: 'Café',
    emoji: '☕',
    icon: <Coffee className="w-3.5 h-3.5" />,
    create: createCafe,
    description: 'Cozy coffee shop',
  },
  {
    id: 'ocean',
    label: 'Waves',
    emoji: '🌊',
    icon: <Droplets className="w-3.5 h-3.5" />,
    create: createOcean,
    description: 'Ocean waves',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function AmbientPlayer() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTrackId, setActiveTrackId] = useState<TrackId | null>(null);
  const [volume, setVolume] = useState(0.4);
  const [isMuted, setIsMuted] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const soundNodesRef = useRef<SoundNodes | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      soundNodesRef.current?.stop();
      audioCtxRef.current?.close();
    };
  }, []);

  // Keep master gain in sync with volume/mute
  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.setTargetAtTime(
        isMuted ? 0 : volume,
        masterGainRef.current.context.currentTime,
        0.1 // 100ms smooth ramp
      );
    }
  }, [volume, isMuted]);

  const getOrCreateAudioContext = () => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const masterGain = ctx.createGain();
      masterGain.gain.value = isMuted ? 0 : volume;
      masterGain.connect(ctx.destination);
      audioCtxRef.current = ctx;
      masterGainRef.current = masterGain;
    }
    // Resume if suspended (browser autoplay policy)
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return { ctx: audioCtxRef.current, master: masterGainRef.current! };
  };

  const playTrack = useCallback((track: Track) => {
    // Toggle off if same track
    if (activeTrackId === track.id) {
      soundNodesRef.current?.stop();
      soundNodesRef.current = null;
      setActiveTrackId(null);
      return;
    }

    // Stop previous
    soundNodesRef.current?.stop();
    soundNodesRef.current = null;

    const { ctx, master } = getOrCreateAudioContext();
    const nodes = track.create(ctx, master);
    soundNodesRef.current = nodes;
    setActiveTrackId(track.id);
  }, [activeTrackId, isMuted, volume]);

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
  };

  const toggleMute = () => setIsMuted((m) => !m);

  const activeTrack = TRACKS.find((t) => t.id === activeTrackId);

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
          activeTrackId
            ? 'bg-lavender/40 border-lavender text-espresso'
            : 'bg-white/60 border-blush/20 text-espresso/60 hover:bg-canvas hover:text-espresso'
        }`}
        title="Ambient sound player"
      >
        {activeTrackId ? (
          <>
            <span className="animate-pulse">{activeTrack?.emoji}</span>
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
            className="absolute top-9 right-0 w-60 bg-white/96 backdrop-blur-md border border-blush/25 rounded-2xl shadow-xl p-4 space-y-3 z-50"
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-espresso/60 flex items-center gap-1.5">
              <Music className="w-3 h-3 text-lavender" />
              <span>Ambient Sounds</span>
              <span className="ml-auto text-[9px] font-normal text-espresso/30">Web Audio</span>
            </div>

            {/* Track Buttons */}
            <div className="grid grid-cols-2 gap-1.5">
              {TRACKS.map((track) => {
                const isActive = activeTrackId === track.id;
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
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                      <span>{track.emoji}</span>
                      <span>{track.label}</span>
                      {isActive && (
                        <span className="ml-auto flex gap-0.5">
                          {[0, 1, 2].map((i) => (
                            <span
                              key={i}
                              className="w-0.5 bg-canvas/70 rounded-full animate-bounce"
                              style={{ height: `${6 + i * 3}px`, animationDelay: `${i * 0.15}s` }}
                            />
                          ))}
                        </span>
                      )}
                    </div>
                    <span className={`text-[9px] ${isActive ? 'text-canvas/60' : 'text-espresso/40'}`}>
                      {track.description}
                    </span>
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
                  {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.02}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    setIsMuted(false);
                    handleVolumeChange(Number(e.target.value));
                  }}
                  className="flex-1 h-1 rounded-full appearance-none cursor-pointer accent-espresso"
                  style={{
                    background: `linear-gradient(to right, #2D2A26 ${(isMuted ? 0 : volume) * 100}%, #F5E1E2 ${(isMuted ? 0 : volume) * 100}%)`,
                  }}
                />
                <span className="text-[9px] font-mono text-espresso/40 w-6 text-right">
                  {Math.round((isMuted ? 0 : volume) * 100)}
                </span>
              </div>
            </div>

            {/* Now Playing */}
            {activeTrackId && (
              <div className="flex items-center gap-1.5 text-[9px] text-espresso/50 pt-0.5">
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
