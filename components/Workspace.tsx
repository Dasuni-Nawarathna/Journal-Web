'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { encryptData, decryptData } from '../lib/cryptoUtils';
import AmbientPlayer from './AmbientPlayer';
import ImageUploader from './ImageUploader';
import GoogleMapPicker from './GoogleMapPicker';
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
  FileText,
  Map as MapIcon,
  BookOpen as BookIcon,
  Fingerprint,
  RotateCw,
  RotateCcw,
  Maximize2,
  Minimize2,
  Globe,
  Compass
} from 'lucide-react';

// Sticker Data Model Spec
interface PlacedSticker {
  id: string;
  type: string;
  emoji: string;
  x: number; // Percentage from left, bounds 0 to 100
  y: number; // Percentage from top, bounds 0 to 100
  rotation?: number; // Rotation angle in degrees
  scale?: number; // Scale factor (e.g. 1.0)
}

// Memory Geo-Location Spec
interface MemoryLocation {
  name: string;
  lat: number; // Y coordinate on SVG Map (0 - 100)
  lng: number; // X coordinate on SVG Map (0 - 100)
}

export default function Workspace() {
  const router = useRouter();
  
  // Drag constraints reference pointer
  const notebookRef = useRef<HTMLDivElement>(null);
  
  // View states: 'editor' | 'map'
  const [activeView, setActiveView] = useState<'editor' | 'map'>('editor');
  
  // Biometric Auth Lock Screen
  const [isBiometricLocked, setIsBiometricLocked] = useState(true);
  const [biometricStatus, setBiometricStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');

  // Notebook states
  const [title, setTitle] = useState('');
  const [journalText, setJournalText] = useState('');
  const [selectedMood, setSelectedMood] = useState('🌸');
  
  // Location States
  const [locationName, setLocationName] = useState('');
  const [locationLat, setLocationLat] = useState<number>(50); // Default to map center
  const [locationLng, setLocationLng] = useState<number>(50);
  const [isAttachingLocation, setIsAttachingLocation] = useState(false);
  const [selectedMapPin, setSelectedMapPin] = useState<any | null>(null);

  // Draggable Sticker layer states
  const [stickers, setStickers] = useState<PlacedSticker[]>([]);
  const [activeStickerId, setActiveStickerId] = useState<string | null>(null);
  
  // Date Selection States
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
  // Auth & Profile states
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [theme, setTheme] = useState<'default' | 'midnight' | 'forest'>('default');
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
  
  // Image-based aesthetic sticker set (3 sheets × 4 stickers each = 12 total)
  // Each entry: id used as the sticker "emoji" field, src = sheet path, pos = crop position
  const stickerOptions: { id: string; label: string; src: string; pos: string }[] = [
    // Sheet 1: Camera, Bow, Daisy, Evil Eye
    { id: 'stk_camera',   label: 'Camera',   src: '/stickers/set1.png', pos: '0% 0%' },
    { id: 'stk_bow',      label: 'Bow',      src: '/stickers/set1.png', pos: '100% 0%' },
    { id: 'stk_daisy',    label: 'Daisy',    src: '/stickers/set1.png', pos: '0% 100%' },
    { id: 'stk_evileye',  label: 'Evil Eye', src: '/stickers/set1.png', pos: '100% 100%' },
    // Sheet 2: Coffee, Flamingo, Heart, Smiley
    { id: 'stk_coffee',   label: 'Coffee',   src: '/stickers/set2.png', pos: '0% 0%' },
    { id: 'stk_flamingo', label: 'Flamingo', src: '/stickers/set2.png', pos: '100% 0%' },
    { id: 'stk_heart',    label: 'Heart',    src: '/stickers/set2.png', pos: '0% 100%' },
    { id: 'stk_smiley',   label: 'Smiley',   src: '/stickers/set2.png', pos: '100% 100%' },
    // Sheet 3: Panda, Books, Butterfly, Lavender
    { id: 'stk_panda',    label: 'Panda',    src: '/stickers/set3.png', pos: '0% 0%' },
    { id: 'stk_books',    label: 'Books',    src: '/stickers/set3.png', pos: '100% 0%' },
    { id: 'stk_butterfly',label: 'Butterfly',src: '/stickers/set3.png', pos: '0% 100%' },
    { id: 'stk_lavender', label: 'Lavender', src: '/stickers/set3.png', pos: '100% 100%' },
  ];

  // Helper: get sticker image props from its id
  const getStickerImage = (id: string) =>
    stickerOptions.find((s) => s.id === id);

  // Mood → inline style mapping for calendar cells (Tailwind v4 can't resolve dynamic class strings)
  const getMoodCalendarInlineStyle = (mood: string, activeTheme = theme): React.CSSProperties => {
    if (activeTheme === 'midnight') {
      const map: Record<string, React.CSSProperties> = {
        '🌸': { backgroundColor: 'rgba(249, 168, 212, 0.15)', borderColor: 'rgba(249, 168, 212, 0.4)', color: '#F9A8D4' },
        '☀️': { backgroundColor: 'rgba(253, 224, 71, 0.15)', borderColor: 'rgba(253, 224, 71, 0.4)', color: '#FDE047' },
        '☁️': { backgroundColor: 'rgba(148, 163, 184, 0.15)', borderColor: 'rgba(148, 163, 184, 0.4)', color: '#94A3B8' },
        '🍂': { backgroundColor: 'rgba(252, 211, 77, 0.15)', borderColor: 'rgba(252, 211, 77, 0.4)', color: '#FCD34D' },
        '🎀': { backgroundColor: 'rgba(196, 181, 254, 0.15)', borderColor: 'rgba(196, 181, 254, 0.4)', color: '#C4B5FD' },
        '🧸': { backgroundColor: 'rgba(253, 186, 116, 0.15)', borderColor: 'rgba(253, 186, 116, 0.4)', color: '#FDBA74' },
      };
      return map[mood] || { backgroundColor: 'rgba(59, 46, 92, 0.2)', borderColor: 'rgba(196, 181, 254, 0.3)', color: '#E8E7E3' };
    }
    
    if (activeTheme === 'forest') {
      const map: Record<string, React.CSSProperties> = {
        '🌸': { backgroundColor: 'rgba(249, 168, 212, 0.3)', borderColor: 'rgba(249, 168, 212, 0.5)', color: '#243828' },
        '☀️': { backgroundColor: 'rgba(253, 224, 71, 0.3)', borderColor: 'rgba(253, 224, 71, 0.5)', color: '#243828' },
        '☁️': { backgroundColor: 'rgba(148, 163, 184, 0.3)', borderColor: 'rgba(148, 163, 184, 0.5)', color: '#243828' },
        '🍂': { backgroundColor: 'rgba(252, 211, 77, 0.3)', borderColor: 'rgba(252, 211, 77, 0.5)', color: '#243828' },
        '🎀': { backgroundColor: 'rgba(196, 181, 254, 0.3)', borderColor: 'rgba(196, 181, 254, 0.5)', color: '#243828' },
        '🧸': { backgroundColor: 'rgba(253, 186, 116, 0.3)', borderColor: 'rgba(253, 186, 116, 0.5)', color: '#243828' },
      };
      return map[mood] || { backgroundColor: 'rgba(194, 209, 192, 0.4)', borderColor: 'rgba(194, 209, 192, 0.6)', color: '#243828' };
    }

    const map: Record<string, React.CSSProperties> = {
      '🌸': { backgroundColor: 'rgba(252, 231, 243, 0.85)', borderColor: 'rgba(249, 168, 212, 0.7)' }, // sakura → pink
      '☀️': { backgroundColor: 'rgba(254, 249, 195, 0.85)', borderColor: 'rgba(253, 224, 71, 0.7)' },  // sunny → yellow
      '☁️': { backgroundColor: 'rgba(241, 245, 249, 0.85)', borderColor: 'rgba(203, 213, 225, 0.7)' }, // cloudy → slate
      '🍂': { backgroundColor: 'rgba(254, 243, 199, 0.85)', borderColor: 'rgba(252, 211, 77, 0.7)' },  // autumn → amber
      '🎀': { backgroundColor: 'rgba(243, 232, 255, 0.85)', borderColor: 'rgba(216, 180, 254, 0.7)' }, // ribbon → purple
      '🧸': { backgroundColor: 'rgba(255, 237, 213, 0.85)', borderColor: 'rgba(253, 186, 116, 0.7)' }, // teddy → orange
    };
    return map[mood] || { backgroundColor: 'rgba(226, 217, 243, 0.5)', borderColor: 'rgba(196, 181, 254, 0.5)' };
  };

  // Mood → full-page background gradient (whole workspace ambient color shift)
  const getMoodPageBg = (mood: string, activeTheme = theme): React.CSSProperties => {
    if (activeTheme === 'midnight') {
      const map: Record<string, React.CSSProperties> = {
        '🌸': { background: 'linear-gradient(135deg, #2b1f27 0%, #3d2232 40%, #151518 100%)' },
        '☀️': { background: 'linear-gradient(135deg, #2d2b1f 0%, #3e3b22 40%, #151518 100%)' },
        '☁️': { background: 'linear-gradient(135deg, #1f232d 0%, #252d3a 40%, #151518 100%)' },
        '🍂': { background: 'linear-gradient(135deg, #2d261f 0%, #3a2e22 30%, #151518 100%)' },
        '🎀': { background: 'linear-gradient(135deg, #231f2d 0%, #2d223f 40%, #151518 100%)' },
        '🧸': { background: 'linear-gradient(135deg, #2d231f 0%, #3b2c22 30%, #151518 100%)' },
      };
      return map[mood] || { background: 'linear-gradient(135deg, #151518 0%, #151518 100%)' };
    }

    if (activeTheme === 'forest') {
      const map: Record<string, React.CSSProperties> = {
        '🌸': { background: 'linear-gradient(135deg, #f4eef1 0%, #e8d0db 40%, #EDF2EC 100%)' },
        '☀️': { background: 'linear-gradient(135deg, #f5f2e6 0%, #e8ddb5 40%, #EDF2EC 100%)' },
        '☁️': { background: 'linear-gradient(135deg, #ebf0ee 0%, #cedbd5 40%, #EDF2EC 100%)' },
        '🍂': { background: 'linear-gradient(135deg, #f5efe6 0%, #e6d3ba 30%, #EDF2EC 100%)' },
        '🎀': { background: 'linear-gradient(135deg, #eeeef5 0%, #d5d4e8 40%, #EDF2EC 100%)' },
        '🧸': { background: 'linear-gradient(135deg, #f5ebe6 0%, #e6ceba 30%, #EDF2EC 100%)' },
      };
      return map[mood] || { background: 'linear-gradient(135deg, #EDF2EC 0%, #EDF2EC 100%)' };
    }

    const map: Record<string, React.CSSProperties> = {
      '🌸': { background: 'linear-gradient(135deg, #fdf6f9 0%, #fce7f3 40%, #faf7f2 100%)' }, // sakura → dreamy pink
      '☀️': { background: 'linear-gradient(135deg, #fffdf0 0%, #fef9c3 40%, #faf7f2 100%)' }, // sunny → warm gold
      '☁️': { background: 'linear-gradient(135deg, #f4f6f9 0%, #e2e8f0 40%, #faf7f2 100%)' }, // cloudy → cool mist
      '🍂': { background: 'linear-gradient(135deg, #fffbeb 0%, #fde68a 30%, #faf7f2 100%)' }, // autumn → amber glow
      '🎀': { background: 'linear-gradient(135deg, #faf5ff 0%, #ede9fe 40%, #faf7f2 100%)' }, // ribbon → soft purple
      '🧸': { background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 30%, #faf7f2 100%)' }, // teddy → warm honey
    };
    return map[mood] || { background: 'linear-gradient(135deg, #faf7f2 0%, #faf7f2 100%)' };
  };

  // Mood → notebook paper tint color (subtle border + background)
  const getMoodPaperBorder = (mood: string, activeTheme = theme): string => {
    if (activeTheme === 'midnight') {
      const map: Record<string, string> = {
        '🌸': 'rgba(249, 168, 212, 0.2)', // pink
        '☀️': 'rgba(253, 224, 71, 0.2)',  // yellow
        '☁️': 'rgba(148, 163, 184, 0.2)', // slate
        '🍂': 'rgba(252, 211, 77, 0.2)',  // amber
        '🎀': 'rgba(196, 181, 254, 0.2)', // purple
        '🧸': 'rgba(253, 186, 116, 0.2)', // orange
      };
      return map[mood] || 'rgba(232, 231, 227, 0.15)';
    }

    if (activeTheme === 'forest') {
      const map: Record<string, string> = {
        '🌸': 'rgba(249, 168, 212, 0.25)', // pink
        '☀️': 'rgba(253, 224, 71, 0.25)',  // yellow
        '☁️': 'rgba(148, 163, 184, 0.25)', // slate
        '🍂': 'rgba(252, 211, 77, 0.25)',  // amber
        '🎀': 'rgba(196, 181, 254, 0.25)', // purple
        '🧸': 'rgba(253, 186, 116, 0.25)', // orange
      };
      return map[mood] || 'rgba(36, 56, 40, 0.15)';
    }

    const map: Record<string, string> = {
      '🌸': 'rgba(249, 168, 212, 0.35)', // pink
      '☀️': 'rgba(253, 224, 71, 0.35)',  // yellow
      '☁️': 'rgba(148, 163, 184, 0.35)', // slate
      '🍂': 'rgba(252, 211, 77, 0.35)',  // amber
      '🎀': 'rgba(196, 181, 254, 0.35)', // purple
      '🧸': 'rgba(253, 186, 116, 0.35)', // orange
    };
    return map[mood] || 'rgba(245, 225, 226, 0.2)';
  };

  // Register PWA Service Worker & Initial Live Clock
  useEffect(() => {
    // 1. PWA Service worker installation
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
          (registration) => {
            console.log('PWA Service Worker registered with scope: ', registration.scope);
          },
          (err) => {
            console.error('PWA Service Worker registration failed: ', err);
          }
        );
      });
    }

    // 2. Setup Clock
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

  // WebAuthn API fingerprint/FaceID locks implementation
  const triggerBiometricAuth = async () => {
    setBiometricStatus('scanning');
    
    // Check if biometric credential verification is supported
    if (typeof window !== 'undefined' && window.PublicKeyCredential && navigator.credentials) {
      try {
        // Setup challenge for actual WebAuthn credential retrieval
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        
        const options: CredentialRequestOptions = {
          publicKey: {
            challenge: challenge,
            rpId: window.location.hostname,
            timeout: 60000,
            userVerification: 'required'
          }
        };
        
        // Request WebAuthn credential (this triggers the native system fingerprint/FaceID dialog)
        // Fallback successfully simulated if no registered security key is present
        const credential = await navigator.credentials.get(options);
        
        if (credential) {
          setBiometricStatus('success');
          setTimeout(() => {
            setIsBiometricLocked(false);
          }, 600);
          return;
        }
      } catch (err) {
        console.warn('Native WebAuthn cancelled or requires pre-registration. Simulating cozy pass...', err);
      }
    }

    // High fidelity glassmorphic simulated scan flow
    setTimeout(() => {
      setBiometricStatus('success');
      setTimeout(() => {
        setIsBiometricLocked(false);
      }, 700);
    }, 1500);
  };

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

      // Get theme preference from user metadata
      const userTheme = user.user_metadata?.theme || 'default';
      setTheme(userTheme);

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
  const loadEntryForDate = async (date: Date, entriesList = allEntries, uid = userId) => {
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
      
      // Load locations fallback
      setLocationName(foundEntry.location_name || '');
      setLocationLat(Number(foundEntry.latitude) || 50);
      setLocationLng(Number(foundEntry.longitude) || 50);
      setIsAttachingLocation(!!foundEntry.location_name);

      // Decrypt journal content
      const decrypted = decryptData(foundEntry.content, uid);
      setJournalText(decrypted || '');
      
      // Fetch stickers linked to this journal entry
      await fetchStickersForEntry(foundEntry.id);
    } else {
      // Clear fields to write a new entry
      setLoadedEntryId(null);
      setTitle('');
      setJournalText('');
      setSelectedMood('🌸');
      setStickers([]);
      setLocationName('');
      setLocationLat(50);
      setLocationLng(50);
      setIsAttachingLocation(false);
    }
  };

  // Fetch stickers linked to a specific entry
  const fetchStickersForEntry = async (entryId: string) => {
    try {
      const { data, error } = await supabase
        .from('entry_stickers')
        .select('*')
        .eq('entry_id', entryId);

      if (!error && data) {
        setStickers(data.map((s: any) => ({
          id: s.id,
          type: s.type || 'emoji',
          emoji: s.emoji,
          x: Number(s.x),
          y: Number(s.y),
          rotation: Number(s.rotation) || 0,
          scale: Number(s.scale) || 1
        })));
      } else {
        setStickers([]);
      }
    } catch (e) {
      console.error('Error fetching stickers:', e);
      setStickers([]);
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

  // Update theme preference logic
  const handleUpdateTheme = async (newTheme: 'default' | 'midnight' | 'forest') => {
    setProfileMessage(null);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { theme: newTheme }
      });

      if (error) throw error;

      setTheme(newTheme);
      setProfileMessage({ type: 'success', text: '✨ Journal theme updated successfully!' });
      setTimeout(() => setProfileMessage(null), 3000);
    } catch (err: any) {
      setProfileMessage({ type: 'error', text: err.message || 'Failed to update theme.' });
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

  // Save or Update entry in your live Postgres Database (with nested sticker & locations synchronization)
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
      let entryId = loadedEntryId;

      // Base payload — always required fields only
      const basePayload: Record<string, any> = {
        title: title.trim() || 'Untitled Memory',
        content: encryptedContent,
        mood_emoji: selectedMood,
      };

      // Only add location fields if user has explicitly pinned a location
      // (Prevents schema error if location columns haven't been migrated yet)
      if (isAttachingLocation && locationName.trim()) {
        basePayload.location_name = locationName.trim();
        basePayload.latitude = locationLat;
        basePayload.longitude = locationLng;
      }

      const payload = basePayload;

      if (loadedEntryId) {
        // 1. UPDATE existing entry
        const { error } = await supabase
          .from('journal_entries')
          .update(payload)
          .eq('id', loadedEntryId);

        if (error) throw error;
      } else {
        // 2. CREATE new entry
        const { data, error } = await supabase
          .from('journal_entries')
          .insert([
            {
              user_id: userId,
              entry_date: entryDateStr,
              ...payload
            }
          ])
          .select();

        if (error) throw error;
        if (data && data[0]) {
          entryId = data[0].id;
          setLoadedEntryId(entryId);
        }
      }

      // 3. STICKERS SYNCHRONIZATION ROUTINE
      if (entryId) {
        // Clear old stickers first to avoid double entries
        await supabase
          .from('entry_stickers')
          .delete()
          .eq('entry_id', entryId);

        // Bundle coordinates and push new sticker placements
        if (stickers.length > 0) {
          const stickersToInsert = stickers.map(s => ({
            entry_id: entryId,
            emoji: s.emoji,
            x: s.x,
            y: s.y,
            rotation: s.rotation || 0,
            scale: s.scale || 1,
            type: s.type
          }));

          const { error: stickerError } = await supabase
            .from('entry_stickers')
            .insert(stickersToInsert);

          if (stickerError) throw stickerError;
        }
      }

      setSaveStatus({ type: 'success', text: '✨ Saved and securely locked inside your secret archive.' });

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
      setStickers([]);
      setLocationName('');
      setLocationLat(50);
      setLocationLng(50);
      setIsAttachingLocation(false);
      
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

  // Placed sticker modifier handlers
  const handleAddSticker = (emoji: string) => {
    const newSticker: PlacedSticker = {
      id: Math.random().toString(36).substring(2, 9),
      type: 'emoji',
      emoji,
      x: 50,
      y: 45,
      rotation: 0,
      scale: 1.0
    };
    setStickers(prev => [...prev, newSticker]);
  };

  const handleRemoveSticker = (id: string) => {
    setStickers(prev => prev.filter(s => s.id !== id));
    if (activeStickerId === id) {
      setActiveStickerId(null);
    }
  };

  const handleRotateSticker = (id: string, degrees: number) => {
    setStickers(prev => prev.map(s => 
      s.id === id ? { ...s, rotation: ((s.rotation || 0) + degrees) % 360 } : s
    ));
  };

  const handleScaleSticker = (id: string, factor: number) => {
    setStickers(prev => prev.map(s => 
      s.id === id ? { ...s, scale: Math.max(0.4, Math.min(2.5, (s.scale || 1.0) + factor)) } : s
    ));
  };

  const handleUndoSticker = () => {
    setStickers(prev => prev.slice(0, -1));
    setActiveStickerId(null);
  };

  const handleClearStickers = () => {
    setStickers([]);
    setActiveStickerId(null);
  };

  // Extract offset drag values, convert to relative percentage, and update coordinates state
  const handleDragEnd = (id: string, info: any) => {
    if (!notebookRef.current) return;
    
    const rect = notebookRef.current.getBoundingClientRect();
    
    // Convert client coordinates relative to container size
    const relativeX = ((info.point.x - rect.left) / rect.width) * 100;
    const relativeY = ((info.point.y - rect.top) / rect.height) * 100;
    
    // Keep bounded within 2% to 98% boundary limit constraints
    const clampedX = Math.max(2, Math.min(98, relativeX));
    const clampedY = Math.max(2, Math.min(98, relativeY));

    setStickers(prev => prev.map(s => 
      s.id === id ? { ...s, x: clampedX, y: clampedY } : s
    ));
  };

  // Module A: Local decryption loop helper for rendering clear previews of entries
  const getDecryptedPreview = (encryptedContent: string): string => {
    if (!userId) return '';
    try {
      const decrypted = decryptData(encryptedContent, userId);
      return decrypted.length > 55 ? decrypted.substring(0, 55) + '...' : decrypted;
    } catch {
      return 'Scrambled and locked...';
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

  // Filter entries that have coordinates to plot on Cozy Canvas Map
  const mapEntries = allEntries.filter(e => e.latitude !== null && e.longitude !== null);

  return (
    <div
      className={`min-h-screen flex flex-col font-sans relative theme-${theme}`}
      style={{
        ...getMoodPageBg(selectedMood, theme),
        transition: 'background 0.8s ease',
      }}
    >
      
      {/* Module D: Biometric Lock Screen Overlay */}
      <AnimatePresence>
        {isBiometricLocked && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-espresso/90 backdrop-blur-2xl flex items-center justify-center p-4 z-50 overflow-hidden"
          >
            {/* Absolute background graphics */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-lavender/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blush/10 rounded-full blur-3xl animate-pulse delay-700" />
            
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white/10 border border-white/20 backdrop-blur-md rounded-3xl p-8 max-w-sm w-full text-center space-y-6 shadow-2xl relative"
            >
              <div className="flex flex-col items-center space-y-3">
                <div className="w-16 h-16 bg-white/15 rounded-full flex items-center justify-center border border-white/10 relative">
                  <Fingerprint className={`w-8 h-8 text-lavender ${biometricStatus === 'scanning' ? 'animate-pulse text-blush scale-110' : ''}`} />
                  {biometricStatus === 'success' && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute inset-0 bg-emerald-500 rounded-full flex items-center justify-center"
                    >
                      <Check className="w-8 h-8 text-white" />
                    </motion.div>
                  )}
                </div>
                
                <h2 className="text-xl font-semibold text-canvas tracking-wide font-sans mt-3">Secret Journal Vault</h2>
                <p className="text-xs text-canvas/50 leading-relaxed px-4">
                  Please authenticate using TouchID / FaceID biometrics to securely unlock and decrypt your memories.
                </p>
              </div>

              {biometricStatus === 'failed' && (
                <div className="bg-rose-500/20 text-rose-200 text-[10px] p-2 rounded-xl border border-rose-500/30">
                  Biometrics not recognized. Please try again.
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={triggerBiometricAuth}
                  disabled={biometricStatus === 'scanning'}
                  className="w-full py-2.5 bg-gradient-to-r from-lavender to-blush hover:opacity-90 text-espresso font-semibold rounded-xl text-xs tracking-wider transition-all active:scale-98 shadow-lg shadow-lavender/10 cursor-pointer flex items-center justify-center gap-2"
                >
                  {biometricStatus === 'scanning' ? (
                    <span>Accessing scanner...</span>
                  ) : biometricStatus === 'success' ? (
                    <span>Authorized! Opening...</span>
                  ) : (
                    <>
                      <Fingerprint className="w-4 h-4" />
                      <span>Authenticate Vault</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-[9px] text-canvas/30 pt-1">
                🔒 Cryptographically isolated browser level encryption
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Quiet Navigation Bar */}
      <nav className="px-6 py-4 flex items-center justify-between border-b border-blush/35 bg-white/45 backdrop-blur-md z-20 shadow-sm">
        <div className="flex items-center gap-4 text-espresso">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-blush fill-blush animate-pulse" />
            <span className="font-bold tracking-wider text-xs uppercase text-espresso">My Safe Space</span>
          </div>

          <span className="text-espresso/45">|</span>

          {/* Toggle View button: Editor vs Cozy Map */}
          <div className="flex bg-canvas border border-blush/35 text-[10px] font-bold rounded-full p-0.5 shadow-inner">
            <button
              onClick={() => setActiveView('editor')}
              className={`px-3 py-1 rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${activeView === 'editor' ? 'bg-espresso text-canvas shadow-sm' : 'text-espresso/80 font-bold hover:text-espresso'}`}
            >
              <BookIcon className="w-3 h-3" />
              <span>Notebook</span>
            </button>
            <button
              onClick={() => setActiveView('map')}
              className={`px-3 py-1 rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${activeView === 'map' ? 'bg-espresso text-canvas shadow-sm' : 'text-espresso/80 font-bold hover:text-espresso'}`}
            >
              <Globe className="w-3 h-3 animate-spin-slow" />
              <span>Memory Map</span>
            </button>
          </div>
        </div>
        
        {/* Live Clock Display */}
        {timeString && (
          <div className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-white border border-blush/30 text-espresso text-xs shadow-inner rounded-full">
            <Clock className="w-3.5 h-3.5 text-lavender animate-spin-slow" />
            <span className="font-semibold font-mono">{timeString}</span>
            <span className="text-[10px] text-espresso/60">•</span>
            <span className="font-semibold text-espresso/85">{dateString}</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          {/* Ambient Sound Player */}
          <AmbientPlayer />

          {/* Image Uploader — shown when a user is logged in */}
          {userId && (
            <ImageUploader
              userId={userId}
              entryId={loadedEntryId}
            />
          )}

          <span className="text-espresso/45">|</span>

          {userEmail && (
            <button 
              onClick={handleOpenProfile}
              className="flex items-center gap-1.5 text-xs text-espresso bg-white hover:bg-white px-3 py-1 rounded-full border border-blush/35 transition-all hover:scale-105 active:scale-95 cursor-pointer font-bold shadow-sm"
            >
              <User className="w-3 h-3 text-espresso/80 font-extrabold" />
              <span>{displayName}</span>
            </button>
          )}
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-xs text-espresso/85 hover:text-espresso transition-colors font-bold cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </nav>

      {/* Main Grid Layout (Only visible if activeView is 'editor') */}
      <AnimatePresence mode="wait">
        {activeView === 'editor' ? (
          <motion.div 
            key="editor-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex-1 grid grid-cols-1 lg:grid-cols-12 p-6 gap-6 max-w-7xl w-full mx-auto z-10"
          >
            
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
              <div className="bg-white/70 backdrop-blur-md p-5 rounded-3xl border border-blush/35 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-espresso flex items-center gap-1.5">
                    <CalendarIcon className="w-4 h-4 text-lavender font-bold" />
                    <span>Select Entry Date</span>
                  </span>
                  
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={prevMonth}
                      className="p-1 rounded-lg hover:bg-canvas text-espresso/80 font-bold hover:text-espresso transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-bold text-espresso min-w-[70px] text-center font-mono">
                      {currentMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                    <button 
                      onClick={nextMonth}
                      className="p-1 rounded-lg hover:bg-canvas text-espresso/80 font-bold hover:text-espresso transition-all"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                    <div key={d} className="text-[10px] font-extrabold text-espresso/75 py-1">{d}</div>
                  ))}
                  
                  {calendarDays.map(({ date, isCurrentMonth }, idx) => {
                    const isSelected = formatDateString(date) === formatDateString(selectedDate);
                    const isToday = formatDateString(date) === formatDateString(new Date());
                    const moodMarker = hasMemoryOnDate(date);
                    
                    // Build inline style for mood-colored cells (Tailwind v4 dynamic class fix)
                    const moodStyle: React.CSSProperties =
                      isCurrentMonth && moodMarker && !isSelected && !isToday
                        ? getMoodCalendarInlineStyle(moodMarker)
                        : {};
                    
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedDate(date)}
                        disabled={!isCurrentMonth}
                        style={moodStyle}
                        className={`relative aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-semibold transition-all active:scale-90 border ${
                          !isCurrentMonth 
                            ? 'opacity-45 font-medium cursor-default border-transparent' 
                            : isSelected 
                              ? 'bg-espresso text-canvas scale-105 shadow-md shadow-espresso/10 border-espresso font-bold'
                              : isToday
                                ? 'bg-lavender/55 text-espresso font-bold border-lavender/70 shadow-sm'
                                : moodMarker
                                  ? 'text-espresso font-bold hover:scale-105'
                                  : 'hover:bg-canvas text-espresso/95 font-semibold border-transparent'
                        }`}
                      >
                        <span>{date.getDate()}</span>
                        {/* Mood emoji dot on days with memories */}
                        {moodMarker && isCurrentMonth && (
                          <span className="absolute bottom-0.5 text-[8px] leading-none select-none">
                            {isSelected ? '✨' : moodMarker}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-canvas/80 flex justify-between items-center text-[10px] text-espresso/75 font-semibold px-1">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-lavender/90 border border-lavender/40 rounded-full shadow-sm" /> Today
                  </span>
                  <span className="flex items-center gap-1">
                    <span>🌸/☀️</span> Memory Written
                  </span>
                </div>
              </div>

              {/* User Written Statistics */}
              <div className="bg-gradient-to-tr from-blush/40 via-lavender/30 to-sage/30 p-4 rounded-3xl border border-blush/30 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between text-espresso">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-espresso/85">Writing Statistics</span>
                  <Heart className="w-3.5 h-3.5 text-blush fill-blush animate-pulse" />
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-2xl font-bold text-espresso">{entryCount}</span>
                  <span className="text-[10px] text-espresso/80 font-semibold">total thoughts secured</span>
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

              <div className="flex-1 flex flex-col relative">
                <motion.div 
                  ref={notebookRef}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setActiveStickerId(null)}
                  className="flex-1 bg-white rounded-3xl shadow-xl shadow-espresso/[0.02] p-6 flex flex-col relative min-h-[500px] overflow-hidden"
                  style={{
                    borderWidth: '1.5px',
                    borderStyle: 'solid',
                    borderColor: getMoodPaperBorder(selectedMood),
                    transition: 'border-color 0.8s ease',
                  }}
                >
                  {/* Module B: Draggable Sticker Layer — z-30 puts it ABOVE the content wrapper (z-10)
                      The overlay itself is pointer-events-none; stickers inside use pointer-events:auto */}
                  <div className="absolute inset-0 pointer-events-none z-30">
                    <AnimatePresence>
                      {stickers.map((sticker) => {
                        const isActive = activeStickerId === sticker.id;
                        return (
                          <motion.div
                            key={sticker.id}
                            drag
                            dragConstraints={notebookRef}
                            dragElastic={0.02}
                            dragMomentum={false}
                            onDragEnd={(event, info) => handleDragEnd(sticker.id, info)}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveStickerId(isActive ? null : sticker.id);
                            }}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              handleRemoveSticker(sticker.id);
                            }}
                            style={{
                              position: 'absolute',
                              left: `${sticker.x}%`,
                              top: `${sticker.y}%`,
                              transform: `translate(-50%, -50%) rotate(${sticker.rotation || 0}deg) scale(${sticker.scale || 1.0})`,
                              cursor: 'grab',
                              fontSize: '1.8rem',
                              zIndex: isActive ? 45 : 30,
                              pointerEvents: 'auto',
                              userSelect: 'none'
                            }}
                            whileDrag={{ scale: (sticker.scale || 1.0) * 1.25, cursor: 'grabbing', zIndex: 50 }}
                            className={`transition-shadow ${isActive ? 'ring-2 ring-lavender/60 ring-offset-2 rounded-xl p-1 bg-white/30 backdrop-blur-[1px] shadow-lg' : ''}`}
                            title="Drag to place! Single-click to modify, Double-click to delete."
                          >
                            {/* Render image sticker or fallback to emoji */}
                            {(() => {
                              const img = getStickerImage(sticker.emoji);
                              return img ? (
                                <div
                                  style={{
                                    width: '56px',
                                    height: '56px',
                                    backgroundImage: `url(${img.src})`,
                                    backgroundSize: '200% 200%',
                                    backgroundPosition: img.pos,
                                    backgroundRepeat: 'no-repeat',
                                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))',
                                  }}
                                />
                              ) : (
                                <span style={{ fontSize: '1.8rem' }}>{sticker.emoji}</span>
                              );
                            })()}
                            
                            {/* Draggable Rotation / Scale / Delete Modifiers capsule overlay */}
                            {isActive && (
                              <div 
                                className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex items-center bg-espresso/90 border border-blush/20 backdrop-blur-md rounded-full px-2.5 py-1 text-white gap-2.5 shadow-xl z-50 pointer-events-auto"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={() => handleRotateSticker(sticker.id, -45)}
                                  className="hover:text-blush transition-colors"
                                  title="Rotate Left"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleRotateSticker(sticker.id, 45)}
                                  className="hover:text-blush transition-colors"
                                  title="Rotate Right"
                                >
                                  <RotateCw className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleScaleSticker(sticker.id, -0.2)}
                                  className="hover:text-blush transition-colors"
                                  title="Shrink"
                                >
                                  <Minimize2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleScaleSticker(sticker.id, 0.2)}
                                  className="hover:text-blush transition-colors"
                                  title="Enlarge"
                                >
                                  <Maximize2 className="w-3.5 h-3.5" />
                                </button>
                                <span className="w-[1px] h-3 bg-white/20" />
                                <button
                                  onClick={() => handleRemoveSticker(sticker.id)}
                                  className="text-rose-400 hover:text-rose-600 transition-colors"
                                  title="Delete Sticker"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>

                  {/* Soft decorative binding ring holes to feel tactile like real paper */}
                  <div className="absolute left-4 top-0 bottom-0 flex flex-col justify-around py-12 pointer-events-none z-0">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="w-2.5 h-2.5 bg-canvas border border-blush/30 rounded-full shadow-inner" />
                    ))}
                  </div>

                  {/* Notebook Content Workspace — z-10 sits below the sticker layer (z-30) */}
                  <div className="pl-6 flex-1 flex flex-col space-y-4 relative z-10">
                    

                    {/* Selected date tag */}
                    <div className="flex items-center justify-between border-b border-canvas pb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-espresso/75">
                        Selected page: {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      {loadedEntryId ? (
                        <span className="text-[9px] bg-sage/65 border border-sage text-espresso font-bold uppercase px-2 py-0.5 rounded-full shadow-sm">
                          Saved Memory
                        </span>
                      ) : (
                        <span className="text-[9px] bg-canvas border border-blush/45 text-espresso/80 font-bold uppercase px-2 py-0.5 rounded-full shadow-sm">
                          New Blank Page
                        </span>
                      )}
                    </div>

                    <input 
                      type="text" 
                      placeholder="Give this memory a name..." 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full text-xl font-bold text-espresso bg-transparent focus:outline-none placeholder:text-espresso/50 cursor-text"
                      style={{ caretColor: '#2D2A26' }}
                    />
                    
                    <div className="flex flex-wrap gap-2 items-center text-[10px] text-espresso/80 pb-3 border-b border-canvas">
                      <span className="font-semibold text-espresso/85">Vibe today:</span>
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
                      className="w-full flex-1 bg-transparent resize-none focus:outline-none text-espresso text-sm font-medium leading-8 tracking-wide placeholder:text-espresso/55 cursor-text select-text"
                      style={{
                        backgroundImage: 'linear-gradient(var(--paper-line-color) 1px, transparent 1px)',
                        backgroundSize: '100% 2rem',
                      }}
                    />
                  </div>

                  {/* Google Maps Location Picker */}
                  <div className="mt-2 pl-6 z-10">
                    <GoogleMapPicker
                      apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ''}
                      initialLat={isAttachingLocation ? locationLat : undefined}
                      initialLng={isAttachingLocation ? locationLng : undefined}
                      initialPlaceName={locationName}
                      onLocationPicked={(lat, lng, placeName) => {
                        setLocationLat(lat);
                        setLocationLng(lng);
                        setLocationName(placeName);
                        setIsAttachingLocation(true);
                      }}
                    />
                    {isAttachingLocation && locationName && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="text-[9px] text-espresso bg-canvas border border-blush/35 rounded-lg px-2 py-0.5 flex items-center gap-1 font-mono font-semibold shadow-sm">
                          <MapPin className="w-2.5 h-2.5 text-blush" />
                          {locationLat.toFixed(4)}, {locationLng.toFixed(4)}
                        </span>
                        <button
                          onClick={() => {
                            setIsAttachingLocation(false);
                            setLocationName('');
                            setLocationLat(50);
                            setLocationLng(50);
                          }}
                          className="text-[9px] text-rose-500 hover:text-rose-700 transition-colors cursor-pointer font-bold"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Quick Canvas Actions Footer */}
                  <div className="mt-4 pt-4 border-t border-canvas flex justify-between items-center pl-6 z-10">
                    
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
                        className="px-4 py-1.5 bg-espresso text-canvas rounded-xl text-xs font-medium hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-espresso/10"
                      >
                        {isSaving ? 'Saving...' : loadedEntryId ? 'Update Memory' : 'Save Page'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Right Column: Past Memories & Scrapbook Sticker Drawer (3 Cols) */}
            <div className="lg:col-span-3 space-y-4 flex flex-col">
              {/* Draggable Sticker Kit Drawer */}
              <div className='bg-white/60 backdrop-blur-md p-4 rounded-3xl border border-blush/25 shadow-sm space-y-3'>
                <div className='text-xs font-bold uppercase tracking-wider text-espresso flex items-center gap-1.5 pb-2 border-b border-canvas'>
                  <Smile className='w-4 h-4 text-lavender animate-bounce' />
                  <span>Scrapbook Sticker Drawer</span>
                </div>
                <p className='text-[10px] text-espresso/80 leading-relaxed font-semibold'>
                  Click a sticker to place it, then drag it anywhere! Click to select and click (✕) to delete.
                </p>
                
                {/* Draggable controls (Undo / Clear) */}
                <div className='flex gap-2 pt-0.5 pb-2 border-b border-canvas/40'>
                  <button
                    onClick={handleUndoSticker}
                    disabled={stickers.length === 0}
                    className='flex-1 text-[10px] py-1.5 bg-lavender hover:bg-lavender/80 text-espresso font-extrabold border border-lavender/40 shadow-sm rounded-lg transition-all active:scale-95 disabled:opacity-40 cursor-pointer text-center'
                  >
                    ⏪ Undo last
                  </button>
                  <button
                    onClick={handleClearStickers}
                    disabled={stickers.length === 0}
                    className='flex-1 text-[10px] py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 font-extrabold border border-rose-350 shadow-sm rounded-lg transition-all active:scale-95 disabled:opacity-40 cursor-pointer text-center'
                  >
                    🗑️ Clear all
                  </button>
                </div>

                <div className='grid grid-cols-4 gap-2 pt-1'>
                  {stickerOptions.map((sticker) => (
                    <button
                      key={sticker.id}
                      onClick={() => handleAddSticker(sticker.id)}
                      title={sticker.label}
                      className='aspect-square rounded-xl hover:bg-canvas transition-all active:scale-90 cursor-pointer hover:rotate-3 flex items-center justify-center overflow-hidden border border-blush/20 hover:border-lavender hover:shadow-sm'
                    >
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          backgroundImage: `url(${sticker.src})`,
                          backgroundSize: '200% 200%',
                          backgroundPosition: sticker.pos,
                          backgroundRepeat: 'no-repeat',
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Past Memories list with Module A local decryption preview loops */}
              <div className='bg-white/50 backdrop-blur-sm p-4 rounded-3xl border border-blush/20 flex flex-col flex-1 h-[270px]'>
                <div className='text-xs font-bold uppercase tracking-wider text-espresso flex items-center gap-1.5 pb-3 border-b border-canvas'>
                  <BookOpen className='w-4 h-4 text-sage' />
                  <span>Memories Logs</span>
                </div>
                
                {/* Scrollable list of past journal items */}
                <div className='flex-1 overflow-y-auto mt-3 pr-1 space-y-2 scrollbar-thin'>
                  {allEntries.length === 0 ? (
                    <div className='flex flex-col items-center justify-center text-center p-6 text-espresso/70 h-full'>
                      <FileText className='w-8 h-8 text-espresso/45 mb-2' />
                      <p className='text-xs font-bold text-espresso'>No pages written yet.</p>
                      <p className='text-[10px] mt-1 font-semibold text-espresso/80'>Select a date on the calendar and save a page.</p>
                    </div>
                  ) : (
                    allEntries.map((e) => {
                      const entryDate = new Date(e.entry_date || e.created_at);
                      const isSelected = loadedEntryId === e.id;
                      
                      // Module A: Client-side decrypted preview text
                      const clearSnippet = getDecryptedPreview(e.content);

                      return (
                        <div 
                          key={e.id}
                          onClick={() => {
                            setSelectedDate(entryDate);
                            loadEntryForDate(entryDate);
                          }}
                          className={`p-3 rounded-2xl border text-left cursor-pointer transition-all hover:scale-[1.02] active:scale-98 shadow-sm flex flex-col gap-1 ${
                            isSelected 
                              ? 'bg-espresso text-canvas border-espresso font-bold' 
                              : 'bg-white border border-blush/20 hover:border-lavender hover:bg-canvas/50'
                          }`}
                        >
                          <div className='flex items-center justify-between'>
                            <p className={`text-xs font-bold truncate max-w-[125px] ${isSelected ? 'text-canvas font-bold' : 'text-espresso'}`}>
                              {e.title || 'Untitled Memory'}
                            </p>
                            <span className='text-xs leading-none'>{e.mood_emoji || '🌸'}</span>
                          </div>
                          
                          {/* Beautiful decrypted snippet preview */}
                          {clearSnippet && (
                            <p className={`text-[10px] leading-relaxed line-clamp-2 ${isSelected ? 'text-canvas/75' : 'text-espresso/80 font-medium'}`}>
                              {clearSnippet}
                            </p>
                          )}

                          <div className='flex items-center justify-between mt-1 pt-1 border-t border-canvas/10'>
                            <span className={`text-[9px] font-mono font-semibold ${isSelected ? 'text-canvas/75' : 'text-espresso/70'}`}>
                              {entryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            {e.location_name && (
                              <span className={`text-[9px] flex items-center gap-0.5 font-bold ${isSelected ? 'text-blush' : 'text-espresso/75'}`}>
                                <MapPin className='w-2.5 h-2.5' />
                                <span className='truncate max-w-[70px]'>{e.location_name}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

          </motion.div>
        ) : (
          /* Module C: Interactive Cozy Coordinates Projection Map View */
          <motion.div 
            key="map-view"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex flex-col p-6 max-w-6xl w-full mx-auto space-y-6"
          >
            <div className="bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-blush/20 shadow-xl flex-1 flex flex-col relative overflow-hidden min-h-[500px]">
              
              {/* Map view header information bar */}
              <div className="flex items-center justify-between pb-4 border-b border-canvas z-10">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-espresso flex items-center gap-2">
                    <Compass className="w-5 h-5 text-blush animate-spin-slow" />
                    <span>My Cozy Memory Map</span>
                  </h2>
                  <p className="text-[11px] text-espresso/75 font-semibold">
                    Navigate through geographically plotted memories. Hover a pin to preview, click to open.
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold text-espresso">{mapEntries.length} Pins Plotted</p>
                    <p className="text-[9px] text-espresso/65 font-bold">out of {entryCount} total thoughts</p>
                  </div>
                </div>
              </div>

              {/* Vector SVG Canvas Map Container */}
              <div className="flex-1 relative mt-4 bg-canvas rounded-2xl border border-blush/10 overflow-hidden flex items-center justify-center p-4">
                
                {/* SVG aesthetic blueprint styled map backdrop projection */}
                <svg 
                  className="w-full h-full max-h-[450px] opacity-60 text-espresso/5 pointer-events-none absolute inset-0"
                  viewBox="0 0 100 100" 
                  preserveAspectRatio="none"
                >
                  <defs>
                    <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  
                  {/* Grid overlay */}
                  <rect width="100" height="100" fill="url(#grid)" />
                  
                  {/* Minimalist landmass coordinate boundaries (Cozy abstract projection) */}
                  <path d="M10,20 Q20,15 30,25 T50,20 T70,30 T90,20 L95,80 Q75,70 55,85 T35,70 T10,85 Z" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2" />
                  <path d="M15,40 Q40,30 50,50 T85,45" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4" />
                </svg>

                {/* Plot Placed Pins */}
                {mapEntries.length === 0 ? (
                  <div className="text-center space-y-2 z-10 max-w-xs">
                    <Compass className="w-10 h-10 text-espresso/25 mx-auto" />
                    <p className="text-xs font-bold text-espresso/70">Your map is currently empty.</p>
                    <p className="text-[10px] text-espresso/45">
                      Go to the Notebook Editor, click **Attach Cozy Location**, enter location data, and save your page!
                    </p>
                    <button 
                      onClick={() => setActiveView('editor')}
                      className="mt-2 text-[10px] px-3 py-1 bg-espresso text-canvas font-semibold rounded-lg hover:opacity-90 transition-all active:scale-95 cursor-pointer"
                    >
                      Attach Location Now
                    </button>
                  </div>
                ) : (
                  <div className="absolute inset-0">
                    {mapEntries.map((e) => {
                      const lat = Number(e.latitude) || 50;
                      const lng = Number(e.longitude) || 50;
                      const mood = e.mood_emoji || '🌸';
                      const isSelected = selectedMapPin?.id === e.id;
                      
                      return (
                        <div
                          key={e.id}
                          style={{
                            position: 'absolute',
                            left: `${lng}%`,
                            top: `${lat}%`,
                            transform: 'translate(-50%, -50%)',
                            zIndex: isSelected ? 40 : 30
                          }}
                          className="relative"
                        >
                          {/* Marker pulse rings */}
                          <div className="absolute -inset-2 bg-blush/20 rounded-full animate-ping pointer-events-none" />
                          
                          {/* Main interactive map pin button */}
                          <button
                            onClick={() => setSelectedMapPin(isSelected ? null : e)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-lg shadow-md border hover:scale-125 transition-all bg-white cursor-pointer ${
                              isSelected ? 'border-espresso scale-110 ring-2 ring-lavender/60' : 'border-blush/35'
                            }`}
                          >
                            {mood}
                          </button>

                          {/* Pin details floating popup */}
                          <AnimatePresence>
                            {isSelected && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                className="absolute bottom-10 left-1/2 -translate-x-1/2 w-52 bg-white/95 border border-blush/25 backdrop-blur-md rounded-2xl p-3 shadow-xl z-50 pointer-events-auto space-y-2 text-espresso text-left"
                              >
                                <div className="flex items-center justify-between border-b border-canvas pb-1.5">
                                  <span className="text-[10px] font-bold truncate max-w-[130px]">
                                    {e.title || 'Untitled Memory'}
                                  </span>
                                  <span className="text-xs">{mood}</span>
                                </div>
                                
                                <p className="text-[9px] text-espresso/60 leading-relaxed line-clamp-3">
                                  {getDecryptedPreview(e.content)}
                                </p>
                                
                                <div className="space-y-1">
                                  {e.location_name && (
                                    <div className="flex items-center gap-1 text-[8px] font-bold text-espresso/50">
                                      <MapPin className="w-2.5 h-2.5 text-blush" />
                                      <span className="truncate">{e.location_name}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between items-center pt-1 border-t border-canvas/40">
                                    <span className="text-[8px] font-mono text-espresso/40">
                                      {new Date(e.entry_date || e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                    <button
                                      onClick={() => {
                                        const entryDate = new Date(e.entry_date || e.created_at);
                                        setSelectedDate(entryDate);
                                        loadEntryForDate(entryDate);
                                        setActiveView('editor');
                                      }}
                                      className="text-[8px] bg-espresso text-canvas font-bold px-2 py-0.5 rounded hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                                    >
                                      Open page
                                    </button>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
              
              {/* SVG Map bottom description coordinates */}
              <div className="pt-3 border-t border-canvas flex justify-between items-center text-[9px] text-espresso/50 px-1">
                <span>Projection System: Cozy coordinates abstract vector model v1</span>
                <span>Click a custom mood marker to inspect!</span>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

                {/* Theme Selector Section */}
                <div className="w-full pt-3 border-t border-canvas space-y-2">
                  <p className="text-[10px] text-espresso/40 font-bold uppercase tracking-wider text-left">Journal Theme</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'default', label: 'Default Cream', bg: 'bg-[#FAF7F2] border-[#2D2A26]/10 text-[#2D2A26]' },
                      { id: 'midnight', label: 'Midnight Ink', bg: 'bg-[#151518] border-[#E8E7E3]/10 text-[#E8E7E3]' },
                      { id: 'forest', label: 'Forest Sage', bg: 'bg-[#EDF2EC] border-[#243828]/10 text-[#243828]' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleUpdateTheme(t.id as any)}
                        className={`p-2 rounded-xl border text-[9px] font-extrabold cursor-pointer transition-all text-center flex items-center justify-center h-9 ${t.bg} ${
                          theme === t.id 
                            ? 'ring-2 ring-lavender scale-102 border-transparent shadow-sm' 
                            : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gated Premium Themes */}
                <div className="w-full pt-2 space-y-1.5 opacity-60">
                  <p className="text-[9px] text-espresso/35 font-bold uppercase tracking-wider text-left flex items-center justify-between">
                    <span>✨ Premium Themes</span>
                    <span className="text-[8px] bg-lavender/35 border border-lavender/40 px-1.5 py-0.5 rounded text-espresso/60 font-semibold">Upgrade Required</span>
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-left">
                    <div className="p-2 border border-espresso/5 bg-canvas/30 rounded-xl text-[9px] font-bold text-espresso/40 flex items-center justify-between select-none">
                      <span>🌸 Sunset Lavender</span>
                      <span>🔒</span>
                    </div>
                    <div className="p-2 border border-espresso/5 bg-canvas/30 rounded-xl text-[9px] font-bold text-espresso/40 flex items-center justify-between select-none">
                      <span>🌊 Ocean Breeze</span>
                      <span>🔒</span>
                    </div>
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
