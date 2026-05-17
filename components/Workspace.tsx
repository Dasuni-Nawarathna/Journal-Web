'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Smile, MapPin, Image as ImageIcon, Sparkles, LogOut, Calendar, Heart } from 'lucide-react';

export default function Workspace() {
  const [journalText, setJournalText] = useState('');
  const [selectedMood, setSelectedMood] = useState('🌸');
  const [title, setTitle] = useState('');

  const moods = ['🌸', '☀️', '☁️', '🍂', '🎀', '🧸'];

  return (
    <div className="min-h-screen bg-canvas flex flex-col font-sans">
      
      {/* Top Quiet Navigation Bar */}
      <nav className="px-6 py-4 flex items-center justify-between border-b border-blush/20 bg-white/40 backdrop-blur-md">
        <div className="flex items-center gap-2 text-espresso">
          <Heart className="w-4 h-4 text-blush fill-blush" />
          <span className="font-medium tracking-wide text-sm uppercase">My Safe Space</span>
        </div>
        <button className="flex items-center gap-1.5 text-xs text-espresso/60 hover:text-espresso transition-colors">
          <LogOut className="w-3.5 h-3.5" />
          <span>Close Journal</span>
        </button>
      </nav>

      {/* Main Responsive Grid Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 p-6 gap-6 max-w-7xl w-full mx-auto">
        
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
                <p className="text-[10px] text-espresso/50 mt-1">May 17, 2026 • {selectedMood}</p>
              </div>
              <div className="p-3 bg-white/30 rounded-xl border border-transparent hover:bg-white/50 transition-all cursor-pointer opacity-70">
                <p className="text-xs font-medium text-espresso/80">Rainy day thoughts</p>
                <p className="text-[10px] text-espresso/50 mt-1">May 16, 2026 • ☁️</p>
              </div>
            </div>
          </div>
        </div>

        {/* Center Column: The Elegant Lined Paper Canvas (6 Cols) */}
        <div className="lg:col-span-6 flex flex-col">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 bg-white rounded-3xl shadow-xl shadow-espresso/[0.02] border border-blush/20 p-8 flex flex-col relative min-h-[500px]"
          >
            {/* Soft decorative binding ring holes */}
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
                <Sparkles className="w-3 h-3 text-lavender" /> Auto-saved securely to cloud.
              </span>
              <button className="px-4 py-1.5 bg-espresso text-canvas rounded-xl text-xs font-medium hover:opacity-90 active:scale-95 transition-all">
                Save Page
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
              <button className="p-3 bg-white/80 rounded-xl border border-blush/10 hover:border-lavender flex flex-col items-center gap-1.5 transition-all">
                <Smile className="w-4 h-4 text-lavender" />
                <span>Stickers</span>
              </button>
              <button className="p-3 bg-white/80 rounded-xl border border-blush/10 hover:border-blush flex flex-col items-center gap-1.5 transition-all col-span-2">
                <MapPin className="w-4 h-4 text-blush" />
                <span>Pin Travel Memory</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
