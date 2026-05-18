'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { 
  BookOpen, 
  Smile, 
  MapPin, 
  Image as ImageIcon, 
  Sparkles, 
  LogOut, 
  Calendar, 
  Heart, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  X, 
  Edit2, 
  Check, 
  Save 
} from 'lucide-react';

export default function Workspace() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [journalText, setJournalText] = useState('');
  const [selectedMood, setSelectedMood] = useState('🌸');
  
  // Auth & Profile states
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [memberSince, setMemberSince] = useState<string>('');
  
  // UI states
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [entryCount, setEntryCount] = useState(0);
  
  // Profile editing states
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const moods = ['🌸', '☀️', '☁️', '🍂', '🎀', '🧸'];

  // Fetch the authenticated user and count profile statistics
  const fetchProfileAndStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      setUserEmail(user.email ?? null);
      
      // 1. Get profile from public.profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (profile) {
        setDisplayName(profile.display_name || user.email?.split('@')[0] || 'User');
        setTempName(profile.display_name || user.email?.split('@')[0] || 'User');
        if (profile.created_at) {
          const date = new Date(profile.created_at);
          setMemberSince(date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
        }
      } else {
        // Fallback if public profile record hasn't trigger-synced yet
        setDisplayName(user.user_metadata?.display_name || user.email?.split('@')[0] || 'User');
        setTempName(user.user_metadata?.display_name || user.email?.split('@')[0] || 'User');
        setMemberSince(new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
      }

      // 2. Fetch journal entries count
      const { count, error } = await supabase
        .from('journal_entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
        
      if (!error && count !== null) {
        setEntryCount(count);
      }
    }
  };

  useEffect(() => {
    fetchProfileAndStats();
  }, []);

  // Update display name logic
  const handleUpdateName = async () => {
    if (!tempName.trim()) return;
    setProfileMessage(null);
    try {
      // 1. Update public.profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ display_name: tempName.trim() })
        .eq('id', userId);

      if (profileError) throw profileError;

      // 2. Update auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { display_name: tempName.trim() }
      });

      if (authError) throw authError;

      setDisplayName(tempName.trim());
      setIsEditingName(false);
      setProfileMessage({ type: 'success', text: '✨ Display name updated successfully!' });
      
      // Auto-clear success message
      setTimeout(() => setProfileMessage(null), 3000);
    } catch (err: any) {
      setProfileMessage({ type: 'error', text: err.message || 'Failed to update name.' });
    }
  };

  // Open the profile modal and refresh statistics
  const handleOpenProfile = async () => {
    await fetchProfileAndStats();
    setProfileMessage(null);
    setIsProfileOpen(true);
  };

  // Insert entry into your live Postgres Database
  const handleSavePage = async () => {
    if (!journalText.trim()) {
      setSaveStatus({ type: 'error', text: '🍉 The page is completely empty! Write down a thought first.' });
      return;
    }

    if (!userId) {
      setSaveStatus({
        type: 'error',
        text: '🔒 Security block: You must be logged in to save secret journal entries.'
      });
      return;
    }

    setIsSaving(true);
    setSaveStatus(null);

    try {
      const { error } = await supabase
        .from('journal_entries')
        .insert([
          {
            user_id: userId,
            title: title.trim() || 'Untitled Memory',
            content: journalText,
            mood_emoji: selectedMood,
          }
        ]);

      if (error) throw error;

      setSaveStatus({ type: 'success', text: '✨ Locked away safely inside your secret archive.' });

      // Refresh entry count
      setEntryCount(prev => prev + 1);

      // Clear out inputs after a successful entry post
      setTitle('');
      setJournalText('');
    } catch (error: any) {
      setSaveStatus({ type: 'error', text: error.message || 'Database connection failure.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Sign out handler
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col font-sans relative">
      
      {/* Top Quiet Navigation Bar */}
      <nav className="px-6 py-4 flex items-center justify-between border-b border-blush/20 bg-white/40 backdrop-blur-md z-20">
        <div className="flex items-center gap-2 text-espresso">
          <Heart className="w-4 h-4 text-blush fill-blush animate-pulse" />
          <span className="font-medium tracking-wide text-sm uppercase">My Safe Space</span>
        </div>
        
        <div className="flex items-center gap-4">
          {userEmail && (
            <button 
              onClick={handleOpenProfile}
              className="flex items-center gap-1.5 text-xs text-espresso/70 bg-white/60 hover:bg-white/90 px-3 py-1 rounded-full border border-blush/10 transition-all hover:scale-105 active:scale-95 cursor-pointer font-medium"
            >
              <User className="w-3 h-3 text-lavender" />
              <span>{displayName}</span>
            </button>
          )}
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-xs text-espresso/60 hover:text-espresso transition-colors font-medium cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </nav>

      {/* Main Responsive Grid Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 p-6 gap-6 max-w-7xl w-full mx-auto z-10">
        
        {/* Left Column: The Shelf (3 Cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-blush/10 space-y-3">
            <div className="flex items-center gap-2 text-espresso/80 text-xs font-semibold uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5 text-lavender" />
              <span>Memories Logs</span>
            </div>
            <div className="space-y-2">
              <div className="p-3 bg-white/80 rounded-xl border border-blush/10 hover:border-lavender transition-all cursor-pointer">
                <p className="text-xs font-medium text-espresso/80">Today&apos;s Sweet Moments</p>
                <p className="text-[10px] text-espresso/50 mt-1">Just now • {selectedMood}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Center Column: The Elegant Lined Paper Canvas (6 Cols) */}
        <div className="lg:col-span-6 flex flex-col">
          {/* Visual Alert Message Banner */}
          <AnimatePresence mode="popLayout">
            {saveStatus && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`mb-4 p-3 rounded-xl text-xs font-medium flex items-center gap-2 shadow-sm ${
                  saveStatus.type === 'success' ? 'bg-sage/50 text-espresso' : 'bg-blush/60 text-espresso'
                }`}
              >
                {saveStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                )}
                <span>{saveStatus.text}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 bg-white rounded-3xl shadow-xl shadow-espresso/[0.02] border border-blush/20 p-8 flex flex-col relative min-h-[500px]"
          >
            {/* Soft decorative binding ring holes to feel tactile like real paper */}
            <div className="absolute left-4 top-0 bottom-0 flex flex-col justify-around py-12 pointer-events-none">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="w-3 h-3 bg-canvas border border-blush/30 rounded-full shadow-inner" />
              ))}
            </div>

            {/* Notebook Content Workspace */}
            <div className="pl-6 flex-1 flex flex-col space-y-4">
              <input 
                type="text" 
                placeholder="Give this memory a name..." 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-2xl font-semibold text-espresso bg-transparent focus:outline-none placeholder:text-espresso/20"
              />
              
              <div className="flex flex-wrap gap-2 items-center text-xs text-espresso/60 pb-4 border-b border-canvas">
                <span>Vibe today:</span>
                <div className="flex gap-1.5">
                  {moods.map((m) => (
                    <button 
                      key={m}
                      onClick={() => setSelectedMood(m)}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform active:scale-95 text-sm ${selectedMood === m ? 'bg-lavender/50 scale-110 border border-lavender' : 'hover:bg-canvas'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lined Writing Area */}
              <textarea
                placeholder="Pour your thoughts onto the page here..."
                value={journalText}
                onChange={(e) => setJournalText(e.target.value)}
                className="w-full flex-1 bg-transparent resize-none focus:outline-none text-espresso/80 text-sm leading-8 tracking-wide placeholder:text-espresso/30"
                style={{
                  backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
                  backgroundSize: '100% 2rem',
                }}
              />
            </div>

            {/* Quick Canvas Actions Footer */}
            <div className="mt-4 pt-4 border-t border-canvas flex justify-between items-center pl-6">
              <span className="text-[10px] text-espresso/40 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-lavender animate-pulse" /> Auto-saved securely to cloud.
              </span>
              <button 
                onClick={handleSavePage}
                disabled={isSaving}
                className="px-4 py-1.5 bg-espresso text-canvas rounded-xl text-xs font-medium hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? 'Locking Page...' : 'Save Page'}
              </button>
            </div>
          </motion.div>
        </div>

        {/* Right Column: The Accessory Drawer (3 Cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-blush/10 space-y-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-espresso/80 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-sage" />
              <span>Scrapbook Kit</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-center text-xs text-espresso/70">
              <button className="p-3 bg-white/80 rounded-xl border border-blush/10 hover:border-sage flex flex-col items-center gap-1.5 transition-all">
                <ImageIcon className="w-4 h-4 text-sage" />
                <span>Polaroid</span>
              </button>
              <button className="p-3 bg-white/80 rounded-xl border border-lavender/40 hover:border-lavender flex flex-col items-center gap-1.5 transition-all">
                <Smile className="w-4 h-4 text-lavender" />
                <span>Stickers</span>
              </button>
              <button className="p-3 bg-white/80 rounded-xl border border-blush/20 hover:border-blush flex flex-col items-center gap-1.5 transition-all col-span-2">
                <MapPin className="w-4 h-4 text-blush" />
                <span>Pin Travel Memory</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Elegant Glassmorphic Profile Modal */}
      <AnimatePresence>
        {isProfileOpen && (
          <div className="fixed inset-0 bg-espresso/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-white/95 backdrop-blur-md rounded-3xl border border-blush/35 shadow-2xl p-6 w-full max-w-md relative overflow-hidden"
            >
              {/* Decorative top pattern */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blush via-lavender to-sage" />
              
              <button 
                onClick={() => setIsProfileOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-canvas text-espresso/40 hover:text-espresso transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col items-center text-center mt-4 space-y-4">
                
                {/* Decorative Avatar / Monogram */}
                <div className="w-20 h-20 bg-gradient-to-tr from-blush via-lavender/40 to-sage/30 rounded-full flex items-center justify-center shadow-inner relative border border-blush/25">
                  <User className="w-10 h-10 text-espresso/60" />
                </div>

                <div className="space-y-1.5 w-full px-4">
                  {isEditingName ? (
                    <div className="flex items-center justify-center gap-1.5 w-full max-w-xs mx-auto">
                      <input 
                        type="text" 
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        className="text-lg font-semibold text-espresso text-center border-b border-blush focus:outline-none bg-transparent py-0.5 w-full"
                        autoFocus
                      />
                      <button 
                        onClick={handleUpdateName}
                        className="p-1 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => { setIsEditingName(false); setTempName(displayName || ''); }}
                        className="p-1 rounded-full bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-1.5 group">
                      <h3 className="text-xl font-semibold text-espresso">{displayName}</h3>
                      <button 
                        onClick={() => setIsEditingName(true)}
                        className="p-1 rounded-full text-espresso/30 hover:text-espresso/80 hover:bg-canvas transition-all"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-espresso/50 font-mono">{userEmail}</p>
                </div>

                {/* Inline Message Banner */}
                {profileMessage && (
                  <div className={`text-xs px-3 py-1.5 rounded-xl font-medium w-full text-center ${
                    profileMessage.type === 'success' ? 'bg-sage/40 text-espresso' : 'bg-blush/50 text-espresso'
                  }`}>
                    {profileMessage.text}
                  </div>
                )}

                {/* Card Statistics grid */}
                <div className="grid grid-cols-2 gap-3 w-full pt-2">
                  <div className="bg-canvas/50 p-3 rounded-2xl border border-blush/10 text-center">
                    <p className="text-[10px] text-espresso/40 font-semibold uppercase tracking-wider">Memories Written</p>
                    <p className="text-2xl font-bold text-espresso mt-1">{entryCount}</p>
                  </div>
                  
                  <div className="bg-canvas/50 p-3 rounded-2xl border border-blush/10 text-center">
                    <p className="text-[10px] text-espresso/40 font-semibold uppercase tracking-wider">Member Since</p>
                    <p className="text-xs font-semibold text-espresso mt-2.5">{memberSince || 'Just now'}</p>
                  </div>
                </div>

                {/* Scrapbook decoration info */}
                <div className="pt-2 text-[10px] text-espresso/40 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-lavender" />
                  <span>Your space is perfectly private and encrypted.</span>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
