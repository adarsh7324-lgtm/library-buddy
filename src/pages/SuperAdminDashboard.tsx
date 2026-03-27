import React, { useEffect, useState } from 'react';
import { useLibrary } from '@/context/LibraryContext';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Library, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SuperAdminDashboard() {
    const { switchLibrary, logout } = useLibrary();
    const [clientLibraries, setClientLibraries] = useState<{ id: string, email: string, hasUserId: boolean }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    useEffect(() => {
        const fetchLibraries = async () => {
            setIsLoading(true);
            setFetchError(null);
            try {
                const { data, error } = await supabase.from('authorized_users').select('email, user_id, role');
                if (error) throw error;
                if (data) {
                    const validLibs = data.filter(u => u.role !== 'superadmin');
                    setClientLibraries(validLibs.map(user => ({
                        id: user.user_id || user.email,
                        email: user.email,
                        hasUserId: !!user.user_id
                    })));
                }
            } catch (err) {
                console.error('Failed to fetch libraries:', err);
                setFetchError('Failed to load libraries. Please try refreshing.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchLibraries();
    }, []);

    return (
        <div className="min-h-screen p-6 md:p-12 relative z-10">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] border-white/10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold font-display text-white">Super Admin Portal</h1>
                            <p className="text-white/70 text-sm">Manage all registered libraries</p>
                        </div>
                    </div>
                    <Button variant="outline" onClick={logout} className="shrink-0 bg-black/20 border-white/10 text-white hover:bg-white/10 hover:text-white">
                        Sign Out
                    </Button>
                </div>

                {/* Library Grid */}
                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                            <p className="text-white/60 text-sm">Loading libraries...</p>
                        </div>
                    </div>
                ) : fetchError ? (
                    <div className="glass-panel p-8 rounded-2xl border-destructive/30 text-center">
                        <p className="text-destructive font-medium">{fetchError}</p>
                        <Button variant="outline" className="mt-4 border-white/10 text-white hover:bg-white/10" onClick={() => window.location.reload()}>
                            Retry
                        </Button>
                    </div>
                ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {clientLibraries.map((lib, index) => (
                        <motion.div
                            key={lib.email}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.1 }}
                            className={`group ${lib.hasUserId ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                            onClick={() => {
                                if (lib.hasUserId) {
                                    switchLibrary(lib.id);
                                }
                            }}
                        >
                            <div className={`stat-card h-full flex flex-col items-start gap-4 ${lib.hasUserId ? 'hover:border-primary/50' : ''}`}>
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${lib.hasUserId ? 'bg-primary/20 text-primary border border-primary/30 group-hover:bg-primary group-hover:text-primary-foreground' : 'bg-white/10 text-white/50 border border-white/5'}`}>
                                    <Library className="w-5 h-5" />
                                </div>

                                <div className="flex-1 w-full">
                                    <h3 className="font-semibold text-lg text-white mb-1 truncate">
                                        {lib.email}
                                    </h3>
                                    {!lib.hasUserId && (
                                        <p className="text-xs text-destructive font-medium mt-1 bg-destructive/10 px-2 py-1 rounded inline-block">
                                            Library UUID missing
                                        </p>
                                    )}
                                </div>

                                <div className={`mt-auto pt-4 w-full flex items-center justify-between text-sm font-medium transition-opacity ${lib.hasUserId ? 'text-primary opacity-80 group-hover:opacity-100' : 'text-white/50'}`}>
                                    <span>{lib.hasUserId ? 'Manage Library' : 'Unlinked Library'}</span>
                                    {lib.hasUserId && <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
                )}
            </div>
        </div>
    );
}
