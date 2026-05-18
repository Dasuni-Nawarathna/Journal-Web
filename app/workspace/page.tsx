'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import Workspace from '../../components/Workspace';

export default function WorkspacePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                // If not authenticated, redirect to the home page (login screen)
                router.replace('/');
            } else {
                setLoading(false);
            }
        };

        checkUser();

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT' || !session) {
                router.replace('/');
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-canvas flex flex-col items-center justify-center font-sans">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-blush border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-espresso/60 text-sm font-medium">Entering your safe space...</p>
                </div>
            </div>
        );
    }

    return <Workspace />;
}
