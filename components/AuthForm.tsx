'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { Heart, Sparkles, Lock, Mail, User } from 'lucide-react';

export default function AuthForm() {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { display_name: displayName },
                    },
                });
                if (error) throw error;
                setMessage({ type: 'success', text: '✨ Check your email for the confirmation link!' });
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                setMessage({ type: 'success', text: '🌸 Welcome back to your cozy space!' });
                // We will route them to the dashboard here later!
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Something went wrong.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-canvas items-center justify-center p-4">
            <div className="w-full max-w-4xl bg-white/60 backdrop-blur-md rounded-3xl shadow-xl border border-blush/30 overflow-hidden grid md:grid-cols-2 min-h-[550px]">

                {/* Left Side: Aesthetic Welcome Panel */}
                <div className="bg-gradient-to-tr from-blush via-lavender/40 to-sage/30 p-8 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-lavender/30 rounded-full blur-3xl" />

                    <div className="flex items-center gap-2 text-espresso/80 z-10">
                        <Heart className="w-5 h-5 text-blush fill-blush animate-pulse" />
                        <span className="font-medium tracking-wide text-sm uppercase">Memory Space</span>
                    </div>

                    <div className="my-auto space-y-4 z-10">
                        <motion.h1
                            key={isSignUp ? 'signup-title' : 'login-title'}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-3xl font-semibold text-espresso tracking-tight leading-tight"
                        >
                            {isSignUp ? 'Begin your beautiful journey.' : 'Your quiet mind, safely tucked away.'}
                        </motion.h1>
                        <p className="text-espresso/70 text-sm leading-relaxed">
                            {isSignUp
                                ? 'Create a safe haven for your daily memories, sweet reflections, and visual scrapbooks.'
                                : 'Take a deep breath, unlock your digital sanctuary, and continue styling your thoughts.'}
                        </p>
                    </div>

                    <div className="text-xs text-espresso/50 flex items-center gap-1 z-10">
                        <Sparkles className="w-3.5 h-3.5 text-lavender" />
                        <span>Encrypted & secure with biometric readiness.</span>
                    </div>
                </div>

                {/* Right Side: Clean Form */}
                <div className="p-8 flex flex-col justify-center bg-white/40">
                    <form onSubmit={handleAuth} className="space-y-5">
                        <div className="space-y-1">
                            <h2 className="text-xl font-medium text-espresso">{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
                            <p className="text-xs text-espresso/60">Please enter your details below.</p>
                        </div>

                        <AnimatePresence mode="popLayout">
                            {message && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className={`p-3 rounded-xl text-xs font-medium ${message.type === 'success' ? 'bg-sage/40 text-espresso' : 'bg-blush/50 text-espresso'
                                        }`}
                                >
                                    {message.text}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="space-y-3">
                            {isSignUp && (
                                <div className="relative">
                                    <User className="absolute left-3 top-3 h-4 w-4 text-espresso/40" />
                                    <input
                                        type="text"
                                        placeholder="Display Name"
                                        required
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-canvas/60 border border-blush/20 rounded-xl text-sm focus:outline-none focus:border-lavender text-espresso transition-all placeholder:text-espresso/30"
                                    />
                                </div>
                            )}

                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-espresso/40" />
                                <input
                                    type="email"
                                    placeholder="Your Email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-canvas/60 border border-blush/20 rounded-xl text-sm focus:outline-none focus:border-lavender text-espresso transition-all placeholder:text-espresso/30"
                                />
                            </div>

                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-espresso/40" />
                                <input
                                    type="password"
                                    placeholder="Password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-canvas/60 border border-blush/20 rounded-xl text-sm focus:outline-none focus:border-lavender text-espresso transition-all placeholder:text-espresso/30"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 bg-espresso text-canvas rounded-xl font-medium text-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                        >
                            {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
                        </button>

                        <div className="text-center">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsSignUp(!isSignUp);
                                    setMessage(null);
                                }}
                                className="text-xs text-espresso/60 hover:text-espresso underline transition-colors"
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