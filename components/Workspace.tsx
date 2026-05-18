'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { encryptData, decryptData } from '../lib/cryptoUtils';
import { 
  BookOpen, 
  Smile, 
  MapPin, 
  Image as ImageIcon, 
  Sparkles, 
  LogOut, 
  Calendar as CalendarIcon, 
  Heart, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  X, 
  Edit2, 
  Check, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  FileText 
} from 'lucide-react';

export default function Workspace() {
  const router = useRouter();
  
  // Notebook states
  const [title, setTitle] = useState('');
  const [journalText, setJournalText] = useState('');
  const [selectedMood, setSelectedMood] = useState('🌸');
  
  // Date Selection States
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
  // Auth & Profile states
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [memberSince, setMemberSince] = useState<string>('');
  
  // All journal entries list
  const [allEntries, setAllEntries] = useState<any[]>([]);
  const [loadedEntryId, setLoadedEntryId] = useState<string | null>(null);

  // UI states
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [entryCount, setEntryCount] = useState(0);
  
  // Profile editing states
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Live Clock state
  const [timeString, setTimeString] = useState<string>('');
  const [dateString, setDateString] = useState<string>('');

  const moods = ['🌸', '☀️', '☁️', '🍂', '🎀', '🧸'];

  // Update live clock every second
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTimeString(now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }));
      setDateString(now.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

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
        setDisplayName(user.user_metadata?.display_name || user.email?.split('@')[0] || 'User');
        setTempName(user.user_metadata?.display_name || user.email?.split('@')[0] || 'User');
        setMemberSince(new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
      }

      // 2. Fetch journal entries
      await fetchUserEntries(user.id);
    }
  };

  const fetchUserEntries = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', uid)
        .order('entry_date', { ascending: false });
        
      if (!error && data) {
        setAllEntries(data);
        setEntryCount(data.length);
        
        // Auto-load entry for today's selected date on initial mount
        loadEntryForDate(new Date(), data, uid);
      }
    } catch (e) {
      console.error('Error fetching journal entries:', e);
    }
  };

  useEffect(() => {
    fetchProfileAndStats();
  }, []);

  // Format date to local YYYY-MM-DD string
  const formatDateString = (date: Date): string => {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  };

  // Find and load memory for a selected date
  const loadEntryForDate = (date: Date, entriesList = allEntries, uid = userId) => {
    if (!uid) return;
    const targetDateStr = formatDateString(date);
    
    // Find entry with target date
    const foundEntry = entriesList.find(e => {
      const entryDateStr = e.entry_date || (e.created_at ? e.created_at.split('T')[0] : '');
      return entryDateStr === targetDateStr;
    });

    if (foundEntry) {
      setLoadedEntryId(foundEntry.id);
      setTitle(foundEntry.title || '');
      setSelectedMood(foundEntry.mood_emoji || '🌸');
      // Decrypt journal content
      const decrypted = decryptData(foundEntry.content, uid);
      setJournalText(decrypted || '');
    } else {
      // Clear fields to write a new entry
      setLoadedEntryId(null);
      setTitle('');
      setJournalText('');
      setSelectedMood('🌸');
    }
  };

  // Trigger loading when date selection changes
  useEffect(() => {
    loadEntryForDate(selectedDate);
  }, [selectedDate]);

  // Update display name logic
  const handleUpdateName = async () => {
    if (!tempName.trim()) return;
    setProfileMessage(null);
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ display_name: tempName.trim() })
        .eq('id', userId);

      if (profileError) throw profileError;

      const { error: authError } = await supabase.auth.updateUser({
        data: { display_name: tempName.trim() }
      });

      if (authError) throw authError;

      setDisplayName(tempName.trim());
      setIsEditingName(false);
      setProfileMessage({ type: 'success', text: '✨ Display name updated successfully!' });
      setTimeout(() => setProfileMessage(null), 3000);
    } catch (err: any) {
      setProfileMessage({ type: 'error', text: err.message || 'Failed to update name.' });
    }
  };

  // Open the profile modal and refresh statistics
  const handleOpenProfile = async () => {
    if (userId) {
      await fetchUserEntries(userId);
    }
    setProfileMessage(null);
    setIsProfileOpen(true);
  };

  // Save or Update entry in your live Postgres Database
  const handleSavePage = async () => {
    if (!journalText.trim()) {
      setSaveStatus({ type: 'error', text: '🍉 The page is completely empty! Write down a thought first.' });
      return;
    }

    if (!userId) {
      setSaveStatus({ type: 'error', text: '🔒 Security block: You must be logged in to save entries.' });
      return;
    }

    setIsSaving(true);
    setSaveStatus(null);

    try {
      const encryptedContent = encryptData(journalText, userId);
      const entryDateStr = formatDateString(selectedDate);

      if (loadedEntryId) {
        // UPDATE existing entry
        const { error } = await supabase
          .from('journal_entries')
          .update({
            title: title.trim() || 'Untitled Memory',
            content: encryptedContent,
            mood_emoji: selectedMood,
          })
          .eq('id', loadedEntryId);

        if (error) throw error;
        setSaveStatus({ type: 'success', text: '✨ Memory updated successfully in your archive.' });
      } else {
        // CREATE new entry
        const { data, error } = await supabase
          .from('journal_entries')
          .insert([
            {
              user_id: userId,
              entry_date: entryDateStr,
              title: title.trim() || 'Untitled Memory',
              content: encryptedContent,
              mood_emoji: selectedMood,
            }
          ])
          .select();

        if (error) throw error;
        if (data && data[0]) {
          setLoadedEntryId(data[0].id);
        }
        setSaveStatus({ type: 'success', text: '✨ Saved and securely locked inside your secret archive.' });
      }

      // Refresh list
      await fetchUserEntries(userId);
    } catch (error: any) {
      setSaveStatus({ type: 'error', text: error.message || 'Database saving failure.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete current entry
  const handleDeletePage = async () => {
    if (!loadedEntryId || !userId) return;
    
    const confirmDelete = window.confirm("Are you sure you want to permanently delete this secret page?");
    if (!confirmDelete) return;

    setIsDeleting(true);
    setSaveStatus(null);

    try {
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', loadedEntryId);

      if (error) throw error;

      setSaveStatus({ type: 'success', text: '🗑️ Memory deleted permanently from your space.' });
      
      // Clear fields
      setLoadedEntryId(null);
      setTitle('');
      setJournalText('');
      setSelectedMood('🌸');
      
      // Refresh list
      await fetchUserEntries(userId);
    } catch (error: any) {
      setSaveStatus({ type: 'error', text: error.message || 'Failed to delete entry.' });
    } finally {
      setIsDeleting(false);
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

  // Calendar builder helper logic
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    
    // Add padded days from prev month
    const prevMonthTotalDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthTotalDays - i),
        isCurrentMonth: false
      });
    }
    
    // Add current month days
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }
    
    return days;
  };

  const calendarDays = getDaysInMonth(currentMonth);

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const hasMemoryOnDate = (date: Date): string | null => {
    const dateStr = formatDateString(date);
    const found = allEntries.find(e => {
      const entryDateStr = e.entry_date || (e.created_at ? e.created_at.split('T')[0] : '');
      return entryDateStr === dateStr;
    });
    return found ? found.mood_emoji || '🌸' : null;
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col font-sans relative">
      
      {/* Top Quiet Navigation Bar */}
      <nav className="px-6 py-4 flex items-center justify-between border-b border-blush/20 bg-white/40 backdrop-blur-md z-20 shadow-sm">
        <div className="flex items-center gap-2 text-espresso">
          <Heart className="w-4 h-4 text-blush fill-blush animate-pulse" />
          <span className="font-medium tracking-wide text-sm uppercase">My Safe Space</span>
        </div>
        
        {/* Live Clock Display */}
        {timeString && (
          <div className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-white/50 backdrop-blur-sm rounded-full border border-blush/10 text-espresso/80 text-xs shadow-inner">
            <Clock className="w-3.5 h-3.5 text-lavender" />
            <span className="font-semibold font-mono">{timeString}</span>
            <span className="text-[10px] text-espresso/40">•</span>
            <span className="font-medium text-espresso/60">{dateString}</span>
          </div>
        )}

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

      {/* Main Grid Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 p-6 gap-6 max-w-7xl w-full mx-auto z-10">
        
        {/* Left Column: Clock (small devices) & Custom Calendar (4 Cols) */}
        <div className="lg:col-span-4 space-y-5 flex flex-col">
          
          {/* Small Device Clock Panel */}
          {timeString && (
            <div className="md:hidden bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-blush/10 flex items-center justify-between text-espresso/80">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-lavender" />
                <span className="text-sm font-semibold font-mono">{timeString}</span>
              </div>
              <span className="text-xs text-espresso/50">{dateString}</span>
            </div>
          )}

          {/* Interactive Custom Calendar Panel */}
          <div className="bg-white/60 backdrop-blur-md p-5 rounded-3xl border border-blush/15 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-espresso/80 flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4 text-lavender" />
                <span>Select Entry Date</span>
              </span>
              
              <div className="flex items-center gap-1">
                <button 
                  onClick={prevMonth}
                  className="p-1 rounded-lg hover:bg-canvas text-espresso/55 hover:text-espresso transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold text-espresso min-w-[70px] text-center font-mono">
                  {currentMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>
                <button 
                  onClick={nextMonth}
                  className="p-1 rounded-lg hover:bg-canvas text-espresso/55 hover:text-espresso transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                <div key={d} className="text-[10px] font-bold text-espresso/40 py-1">{d}</div>
              ))}
              
              {calendarDays.map(({ date, isCurrentMonth }, idx) => {
                const isSelected = formatDateString(date) === formatDateString(selectedDate);
                const isToday = formatDateString(date) === formatDateString(new Date());
                const moodMarker = hasMemoryOnDate(date);
                
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(date)}
                    disabled={!isCurrentMonth}
                    className={`relative aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-medium transition-all active:scale-90 ${
                      !isCurrentMonth 
                        ? 'opacity-20 cursor-default' 
                        : isSelected 
                          ? 'bg-espresso text-canvas scale-105 shadow-md shadow-espresso/10'
                          : isToday
                            ? 'bg-lavender/30 text-espresso border border-lavender/50'
                            : 'hover:bg-canvas text-espresso/80'
                    }`}
                  >
                    <span>{date.getDate()}</span>
                    {/* Visual marker of memory presence */}
                    {moodMarker && isCurrentMonth && (
                      <span className="absolute bottom-1 text-[9px] leading-none select-none">
                        {isSelected ? '✨' : moodMarker}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-canvas flex justify-between items-center text-[10px] text-espresso/50 px-1">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-lavender rounded-full" /> Today
              </span>
              <span className="flex items-center gap-1">
                <span>🌸/☀️</span> Memory Written
              </span>
            </div>
          </div>

          {/* User Written Statistics */}
          <div className="bg-gradient-to-tr from-blush/30 via-lavender/20 to-sage/20 p-4 rounded-3xl border border-blush/10 space-y-2.5">
            <div className="flex items-center justify-between text-espresso">
              <span className="text-[10px] font-bold uppercase tracking-wider text-espresso/60">Writing Statistics</span>
              <Heart className="w-3.5 h-3.5 text-blush fill-blush animate-pulse" />
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-2xl font-bold text-espresso">{entryCount}</span>
              <span className="text-[10px] text-espresso/50">total thoughts secured</span>
            </div>
          </div>
        </div>

        {/* Center Column: Lined Paper Canvas (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col">
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
            className="flex-1 bg-white rounded-3xl shadow-xl shadow-espresso/[0.02] border border-blush/20 p-6 flex flex-col relative min-h-[500px]"
          >
            {/* Soft decorative binding ring holes to feel tactile like real paper */}
            <div className="absolute left-4 top-0 bottom-0 flex flex-col justify-around py-12 pointer-events-none">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="w-2.5 h-2.5 bg-canvas border border-blush/30 rounded-full shadow-inner" />
              ))}
            </div>

            {/* Notebook Content Workspace */}
            <div className="pl-6 flex-1 flex flex-col space-y-4">
              
              {/* Selected date tag */}
              <div className="flex items-center justify-between border-b border-canvas pb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-espresso/40">
                  Selected page: {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                {loadedEntryId ? (
                  <span className="text-[9px] bg-sage/55 text-espresso font-semibold uppercase px-2 py-0.5 rounded-full">
                    Saved Memory
                  </span>
                ) : (
                  <span className="text-[9px] bg-canvas text-espresso/50 font-semibold uppercase px-2 py-0.5 rounded-full">
                    New Blank Page
                  </span>
                )}
              </div>

              <input 
                type="text" 
                placeholder="Give this memory a name..." 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xl font-semibold text-espresso bg-transparent focus:outline-none placeholder:text-espresso/20"
              />
              
              <div className="flex flex-wrap gap-2 items-center text-[10px] text-espresso/60 pb-3 border-b border-canvas">
                <span>Vibe today:</span>
                <div className="flex gap-1">
                  {moods.map((m) => (
                    <button 
                      key={m}
                      onClick={() => setSelectedMood(m)}
                      className={`w-5.5 h-5.5 rounded-full flex items-center justify-center transition-transform active:scale-95 text-xs ${selectedMood === m ? 'bg-lavender/50 scale-110 border border-lavender' : 'hover:bg-canvas'}`}
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
              
              {/* Delete button (displays only if editing an existing post) */}
              <div>
                {loadedEntryId && (
                  <button 
                    onClick={handleDeletePage}
                    disabled={isDeleting}
                    className="p-2 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-all active:scale-90 cursor-pointer"
                    title="Delete Memory permanently"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={handleSavePage}
                  disabled={isSaving}
                  className="px-4 py-1.5 bg-espresso text-canvas rounded-xl text-xs font-medium hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? 'Saving...' : loadedEntryId ? 'Update Memory' : 'Save Page'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Column: Past Memories list (3 Cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white/50 backdrop-blur-sm p-4 rounded-3xl border border-blush/10 flex flex-col h-[500px]">
            <div className="text-xs font-semibold uppercase tracking-wider text-espresso/80 flex items-center gap-1.5 pb-3 border-b border-canvas">
              <BookOpen className="w-4 h-4 text-sage" />
              <span>Memories Logs</span>
            </div>
            
            {/* Scrollable list of past journal items */}
            <div className="flex-1 overflow-y-auto mt-3 pr-1 space-y-2 scrollbar-thin">
              {allEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-6 text-espresso/40 h-full">
                  <FileText className="w-8 h-8 text-espresso/20 mb-2" />
                  <p className="text-xs font-medium">No pages written yet.</p>
                  <p className="text-[10px] mt-1">Select a date on the calendar and save a page.</p>
                </div>
              ) : (
                allEntries.map((e) => {
                  const entryDate = new Date(e.entry_date || e.created_at);
                  const isSelected = loadedEntryId === e.id;
                  
                  return (
                    <div 
                      key={e.id}
                      onClick={() => {
                        setSelectedDate(entryDate);
                        loadEntryForDate(entryDate);
                      }}
                      className={`p-3 rounded-2xl border text-left cursor-pointer transition-all hover:scale-[1.02] active:scale-98 ${
                        isSelected 
                          ? 'bg-espresso text-canvas border-espresso' 
                          : 'bg-white/80 border-blush/10 hover:border-lavender'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className={`text-xs font-bold truncate max-w-[120px] ${isSelected ? 'text-canvas' : 'text-espresso/90'}`}>
                          {e.title || 'Untitled Memory'}
                        </p>
                        <span className="text-xs leading-none">{e.mood_emoji || '🌸'}</span>
                      </div>
                      <p className={`text-[9px] mt-1 font-mono ${isSelected ? 'text-canvas/60' : 'text-espresso/40'}`}>
                        {entryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  );
                })
              )}
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
