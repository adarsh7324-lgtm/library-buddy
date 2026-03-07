import React, { useEffect, useState } from 'react';
import { useLibrary } from '@/context/LibraryContext';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Library, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SuperAdminDashboard() {
    const { switchLibrary, logout } = useLibrary();
    const [clientLibraries, setClientLibraries] = useState<{ id: string, email: string, hasUserId: boolean }[]>([]);

    useEffect(() => {
        const fetchLibraries = async () => {
            const { data } = await supabase.from('authorized_users').select('email, user_id');
            if (data) {
                // Filter out the superadmin themselves and only show registered ones
                const validLibs = data.filter(u => u.email !== 'adarsh7324@gmail.com');
                setClientLibraries(validLibs.map(user => ({
                    id: user.user_id || user.email, // fallback, but UI will warn if null
                    email: user.email,
                    hasUserId: !!user.user_id
                })));
            }
        };
        fetchLibraries();
    }, []);

    return (
        <div className="min-h-screen p-6 md:p-12" style={{ background: 'var(--gradient-hero)' }}>
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/60 backdrop-blur-md p-6 rounded-2xl border border-border/50 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold font-display text-foreground">Super Admin Portal</h1>
                            <p className="text-muted-foreground text-sm">Manage all registered libraries</p>
                        </div>
                    </div>
                    <Button variant="outline" onClick={logout} className="shrink-0">
                        Sign Out
                    </Button>
                </div>

                {/* Library Grid */}
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
                            <div className={`bg-card rounded-2xl border border-border p-6 shadow-sm transition-all duration-300 h-full flex flex-col items-start gap-4 ${lib.hasUserId ? 'hover:shadow-md hover:border-primary/30' : ''}`}>
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${lib.hasUserId ? 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                    <Library className="w-5 h-5" />
                                </div>

                                <div className="flex-1 w-full">
                                    <h3 className="font-semibold text-lg text-foreground mb-1 truncate">
                                        {lib.email}
                                    </h3>
                                    {!lib.hasUserId && (
                                        <p className="text-xs text-destructive font-medium mt-1">
                                            Library UUID missing. Please run SQL backfill.
                                        </p>
                                    )}
                                </div>

                                <div className={`mt-auto pt-4 w-full flex items-center justify-between text-sm font-medium transition-opacity ${lib.hasUserId ? 'text-primary opacity-80 group-hover:opacity-100' : 'text-muted-foreground'}`}>
                                    <span>{lib.hasUserId ? 'Manage Library' : 'Unlinked Library'}</span>
                                    {lib.hasUserId && <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

            </div>
        </div>
    );
}
