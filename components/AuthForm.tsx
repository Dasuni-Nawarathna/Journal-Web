'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { Heart, Sparkles, Lock, Mail, User, Eye, EyeOff, Music, X } from 'lucide-react';

// ─── Sticker Setup ────────────────────────────────────────────────────────────
const stickerOptions = [
  { id: 'stk_daisy',    label: 'Daisy',    src: '/stickers/set1.png', pos: '0% 100%' },
  { id: 'stk_coffee',   label: 'Coffee',   src: '/stickers/set2.png', pos: '0% 0%' },
  { id: 'stk_heart',    label: 'Heart',    src: '/stickers/set2.png', pos: '0% 100%' },
  { id: 'stk_bow',      label: 'Bow',      src: '/stickers/set1.png', pos: '100% 0%' },
];

const getStickerImage = (id: string) =>
  stickerOptions.find((s) => s.id === id);

const TEASER_STICKERS = [
  { id: 'teaser-daisy', emoji: 'stk_daisy', x: 18, y: 70, rotation: -12 },
  { id: 'teaser-coffee', emoji: 'stk_coffee', x: 74, y: 64, rotation: 15 },
  { id: 'teaser-heart', emoji: 'stk_heart', x: 44, y: 78, rotation: 8 },
];

export default function AuthForm() {
  const router = useRouter();
  const coverRef = useRef<HTMLDivElement>(null);
  
  // Auth states
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<'default' | 'midnight' | 'forest'>('default');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form helper states
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // Login Ambient Music player
  const [loginSound, setLoginSound] = useState<'none' | 'rain' | 'cafe'>('none');
  const loginAudioRef = useRef<HTMLAudioElement | null>(null);

  // Load remembered email on mount
  useEffect(() => {
    const saved = localStorage.getItem('remember_email');
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    }
  }, []);

  // Audio lifecycle cleanup
  useEffect(() => {
    return () => {
      if (loginAudioRef.current) {
        loginAudioRef.current.pause();
      }
    };
  }, []);

  const toggleLoginSound = (sound: 'none' | 'rain' | 'cafe') => {
    if (loginAudioRef.current) {
      loginAudioRef.current.pause();
      loginAudioRef.current = null;
    }

    if (sound === 'none' || loginSound === sound) {
      setLoginSound('none');
      return;
    }

    const audio = new Audio(`/audio/${sound}.mp3`);
    audio.loop = true;
    audio.volume = 0.25; // Calm, soft background volume
    audio.play().catch((err) => {
      console.warn(`Failed to play ambient sound:`, err);
    });
    loginAudioRef.current = audio;
    setLoginSound(sound);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Save/Clear remembered email
    if (rememberMe) {
      localStorage.setItem('remember_email', email);
    } else {
      localStorage.removeItem('remember_email');
    }

    try {
      if (isSignUp) {
        // 1. Create the auth user
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { 
              display_name: displayName,
              theme: selectedTheme
            },
          },
        });
        if (error) throw error;

        // 2. Update profile record theme/display_name if a session is returned
        // The profiles table is automatically populated with { id, display_name } by the database trigger.
        if (data.user && data.session) {
          await supabase.from('profiles').update({
            display_name: displayName,
            theme_preference: selectedTheme,
          }).eq('id', data.user.id);
        }

        // 3. Immediately log out the automatically logged-in session (since confirm is disabled)
        await supabase.auth.signOut();

        // 4. Reset form fields and switch to Sign In mode
        setIsSignUp(false);
        setMessage({
          type: 'success',
          text: '✨ Account created successfully! Please sign in with your credentials below.',
        });
      } else {
        // Sign In
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // Update profile display name and theme preference in case they need sync
        if (data.user) {
          await supabase.from('profiles').update({
            display_name: data.user.user_metadata?.display_name || email.split('@')[0],
            theme_preference: data.user.user_metadata?.theme || 'default',
          }).eq('id', data.user.id);
        }

        // Clean up ambient sound before redirecting
        if (loginAudioRef.current) {
          loginAudioRef.current.pause();
        }
        router.push('/workspace');
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Something went wrong.' });
    } finally {
      setLoading(false);
    }
  };

  // Password complexity helper for Sign Up
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { label: '', color: 'bg-transparent', score: 0 };
    if (pass.length < 6) return { label: 'Too short (min 6)', color: 'bg-rose-400', score: 1 };
    const hasLetter = /[a-zA-Z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    if (hasLetter && hasNumber && pass.length >= 8) {
      return { label: 'Strong ✨', color: 'bg-emerald-400', score: 3 };
    }
    return { label: 'Good', color: 'bg-amber-400', score: 2 };
  };

  const strength = getPasswordStrength(password);

  return (
    <div className={`flex min-h-screen bg-canvas items-center justify-center p-4 theme-${selectedTheme}`}>
      {/* Digital Open Notebook Card */}
      <div className="w-full max-w-4xl bg-paper/70 backdrop-blur-md rounded-3xl shadow-[0_15px_40px_rgba(45,42,38,0.12)] border border-blush/35 overflow-hidden grid md:grid-cols-2 min-h-[580px] relative">
        
        {/* ─── Spiral Binder Spine ─── */}
        <div className="absolute left-1/2 top-0 bottom-0 w-8 -ml-4 z-20 flex flex-col justify-around py-10 pointer-events-none hidden md:flex">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="relative flex items-center justify-between w-full h-4">
              {/* Left hole */}
              <div className="w-1.5 h-3 bg-espresso/35 rounded-full ml-1.5 shadow-inner" />
              {/* Silver ring body */}
              <div className="absolute left-[20%] right-[20%] h-3.5 bg-gradient-to-b from-stone-400 via-stone-200 to-stone-500 rounded-full border border-stone-600/30 shadow-[0_2px_4px_rgba(0,0,0,0.15)] flex items-center justify-center">
                <div className="w-full h-0.5 bg-white/40 absolute top-0.5 rounded-full" />
              </div>
              {/* Right hole */}
              <div className="w-1.5 h-3 bg-espresso/35 rounded-full mr-1.5 shadow-inner" />
            </div>
          ))}
        </div>

        {/* ─── Left Page: Cozy Scrapbook Cover ─── */}
        <div 
          ref={coverRef}
          className="relative p-8 flex flex-col justify-between overflow-hidden border-r border-espresso/10 select-none"
          style={{
            background: 'var(--cover-gradient)',
            backgroundImage: 'radial-gradient(circle, var(--paper-line-color) 1.5px, transparent 1.5px), var(--cover-gradient)',
            backgroundSize: '20px 20px',
          }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-lavender/30 rounded-full blur-3xl pointer-events-none" />

          {/* Logo Title */}
          <div className="flex items-center gap-2 text-espresso z-10">
            <Heart className="w-5 h-5 text-blush fill-blush animate-pulse" />
            <span className="font-bold tracking-wider text-xs uppercase text-espresso">Memory Space</span>
          </div>

          {/* Cozy Polaroid Frame with Mockup */}
          <div className="relative mx-auto my-auto py-4 z-10 flex flex-col items-center">
            {/* Washi Tape */}
            <div className="absolute -top-1.5 w-24 h-5.5 bg-lavender/50 backdrop-blur-[1px] border border-white/30 rotate-[-3deg] shadow-sm z-20" />
            
            {/* Polaroid container */}
            <motion.div 
              whileHover={{ rotate: 1, scale: 1.02 }}
              className="bg-white p-3 pb-7 shadow-lg border border-espresso/10 rotate-[-2deg] transition-all duration-300 w-52 relative"
            >
              <div className="aspect-square relative overflow-hidden rounded-sm bg-canvas border border-espresso/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src="/login-polaroid.png" 
                  alt="Cozy sanctuary diary desk" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="mt-3 text-center">
                <span className="font-serif italic text-[#2D2A26] font-semibold text-xs tracking-wide">
                  my sanctuary 📖
                </span>
              </div>
            </motion.div>
          </div>

          {/* Draggable Teaser Stickers (Teaser of Workspace features) */}
          <div className="absolute inset-0 pointer-events-none">
            {TEASER_STICKERS.map((sticker) => {
              const img = getStickerImage(sticker.emoji);
              return (
                <motion.div
                  key={sticker.id}
                  drag
                  dragConstraints={coverRef}
                  dragElastic={0.15}
                  dragMomentum={false}
                  initial={{ 
                    left: `${sticker.x}%`, 
                    top: `${sticker.y}%`, 
                    rotate: sticker.rotation 
                  }}
                  style={{
                    position: 'absolute',
                    cursor: 'grab',
                    zIndex: 30,
                    pointerEvents: 'auto',
                    userSelect: 'none'
                  }}
                  whileDrag={{ scale: 1.25, cursor: 'grabbing', zIndex: 40 }}
                  className="active:cursor-grabbing"
                  title="Drag me anywhere on the cover!"
                >
                  {img ? (
                    <div
                      style={{
                        width: '46px',
                        height: '46px',
                        backgroundImage: `url(${img.src})`,
                        backgroundSize: '200% 200%',
                        backgroundPosition: img.pos,
                        backgroundRepeat: 'no-repeat',
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))',
                      }}
                    />
                  ) : (
                    <span className="text-2xl">{sticker.emoji}</span>
                  )}
                </motion.div>
              );
            })}
          </div>

          <div className="text-[10px] text-espresso/75 font-semibold flex items-center gap-1.5 z-10">
            <Sparkles className="w-3.5 h-3.5 text-lavender" />
            <span>Interactive sandbox. Drag stickers to decorate!</span>
          </div>
        </div>

        {/* ─── Right Page: Form & Ruled Lined Page ─── */}
        <div 
          className="p-8 flex flex-col justify-center bg-canvas relative"
          style={{
            backgroundImage: 'linear-gradient(var(--paper-line-color) 1px, transparent 1px)',
            backgroundSize: '100% 28px',
          }}
        >
          {/* Mini Ambient sound player */}
          <div className="absolute top-4 right-4 z-30 flex items-center gap-1.5 bg-paper border border-blush/45 rounded-full px-2.5 py-1 text-espresso shadow-md text-[9px] font-bold">
            <Music className="w-3 h-3 text-lavender animate-pulse" />
            <span>Sounds:</span>
            <button
              type="button"
              onClick={() => toggleLoginSound('rain')}
              className={`px-1.5 py-0.5 rounded-full transition-all cursor-pointer ${
                loginSound === 'rain'
                  ? 'bg-espresso text-canvas font-bold'
                  : 'hover:bg-canvas text-espresso/90 font-semibold'
              }`}
            >
              🌧️ Rain
            </button>
            <button
              type="button"
              onClick={() => toggleLoginSound('cafe')}
              className={`px-1.5 py-0.5 rounded-full transition-all cursor-pointer ${
                loginSound === 'cafe'
                  ? 'bg-espresso text-canvas font-bold'
                  : 'hover:bg-canvas text-espresso/90 font-semibold'
              }`}
            >
              ☕ Café
            </button>
            {loginSound !== 'none' && (
              <button
                type="button"
                onClick={() => toggleLoginSound('none')}
                className="ml-1 p-0.5 text-rose-400 hover:text-rose-600 transition-colors cursor-pointer"
                title="Stop Sound"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>

          <form onSubmit={handleAuth} className="space-y-5 z-10">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-espresso tracking-tight">
                {isSignUp ? 'Begin your diary journey' : 'Welcome Back'}
              </h2>
              <p className="text-xs text-espresso/75 font-semibold">
                {isSignUp ? 'Create a calm refuge for your daily moments' : 'Please log in to your peaceful workspace'}
              </p>
            </div>

            <AnimatePresence mode="popLayout">
              {message && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-3 rounded-xl text-xs font-bold ${
                    message.type === 'success' ? 'bg-sage/40 text-espresso' : 'bg-blush/55 text-espresso'
                  }`}
                >
                  {message.text}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-3">
              {/* Display Name & Theme Selector (Only on Sign Up, Animated cleanly) */}
              <AnimatePresence initial={false}>
                {isSignUp && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="space-y-3 pb-3"
                  >
                    <div className="relative">
                      <User className="absolute left-3 top-3.5 h-4 w-4 text-espresso/65" />
                      <input
                        type="text"
                        placeholder="Display Name"
                        required={isSignUp}
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-canvas/90 border border-blush/40 rounded-xl text-sm focus:outline-none focus:border-espresso/40 text-espresso transition-all placeholder:text-espresso/50 font-medium shadow-inner"
                      />
                    </div>
                    
                    {/* Theme selector */}
                    <div className="space-y-1.5 pb-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-espresso/60 block">
                        Choose Journal Theme
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'default', label: 'Default Cream', bg: 'bg-[#FAF7F2] border-[#2D2A26]/10 text-[#2D2A26]' },
                          { id: 'midnight', label: 'Midnight Ink', bg: 'bg-[#151518] border-[#E8E7E3]/10 text-[#E8E7E3]' },
                          { id: 'forest', label: 'Forest Sage', bg: 'bg-[#EDF2EC] border-[#243828]/10 text-[#243828]' },
                        ].map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setSelectedTheme(t.id as any)}
                            className={`p-2 rounded-xl border text-[9px] font-extrabold cursor-pointer transition-all text-center flex items-center justify-center h-9 ${t.bg} ${
                              selectedTheme === t.id 
                                ? 'ring-2 ring-lavender scale-102 border-transparent shadow-sm' 
                                : 'opacity-70 hover:opacity-100'
                            }`}
                          >
                            <span>{t.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email Input */}
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-espresso/65" />
                <input
                  type="email"
                  placeholder="Your Email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-canvas/90 border border-blush/40 rounded-xl text-sm focus:outline-none focus:border-espresso/40 text-espresso transition-all placeholder:text-espresso/50 font-medium shadow-inner"
                />
              </div>

              {/* Password Input */}
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-espresso/65" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-canvas/90 border border-blush/40 rounded-xl text-sm focus:outline-none focus:border-espresso/40 text-espresso transition-all placeholder:text-espresso/50 font-medium shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-espresso/60 hover:text-espresso transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength (Only on Sign Up) */}
              {isSignUp && password && (
                <div className="space-y-1 py-1">
                  <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider text-espresso/60">
                    <span>Password Strength</span>
                    <span className={
                      strength.score === 1 ? 'text-rose-600' :
                      strength.score === 2 ? 'text-amber-600' : 'text-emerald-600'
                    }>{strength.label}</span>
                  </div>
                  <div className="h-1.5 w-full bg-canvas border border-blush/30 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${strength.color} transition-all duration-300`} 
                      style={{ width: `${(strength.score / 3) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Remember Me & Forgot Password panel */}
            <div className="flex items-center justify-between text-xs py-1">
              <label className="flex items-center gap-1.5 text-espresso/80 hover:text-espresso cursor-pointer select-none font-semibold">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-blush/50 bg-white text-espresso focus:ring-espresso focus:ring-offset-0 w-3.5 h-3.5"
                />
                <span>Remember me</span>
              </label>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-espresso text-canvas rounded-xl font-bold text-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-md"
            >
              {loading ? 'Processing...' : isSignUp ? 'Create Safe Havens' : 'Enter Safe Space'}
            </button>

            {/* State toggle links */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setMessage(null);
                }}
                className="text-xs text-espresso/85 hover:text-espresso font-bold underline transition-colors cursor-pointer"
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}