import { useState, useEffect } from 'react';
import { useLibrary, Member } from '@/context/LibraryContext';
import { Search, MessageSquare, AlertTriangle, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { motion } from 'framer-motion';

const Reminders = () => {
    const { members, settings } = useLibrary();
    const [search, setSearch] = useState('');

    const expiringSoon = members.filter(m => m.status === 'Expiring Soon');
    const expired = members.filter(m => m.status === 'Expired');

    const filteredExpiring = expiringSoon.filter(m =>
        m.fullName.toLowerCase().includes(search.toLowerCase()) ||
        m.phone.includes(search)
    );

    const filteredExpired = expired.filter(m =>
        m.fullName.toLowerCase().includes(search.toLowerCase()) ||
        m.phone.includes(search)
    );

    const itemsPerPage = 10;
    const [pageExpiring, setPageExpiring] = useState(1);
    const [pageExpired, setPageExpired] = useState(1);

    useEffect(() => {
        setPageExpiring(1);
        setPageExpired(1);
    }, [search]);

    const paginatedExpiring = filteredExpiring.slice((pageExpiring - 1) * itemsPerPage, pageExpiring * itemsPerPage);
    const paginatedExpired = filteredExpired.slice((pageExpired - 1) * itemsPerPage, pageExpired * itemsPerPage);

    const getWhatsAppLink = (member: Member, isExpired: boolean) => {
        const formattedDate = member.expiryDate ? format(parseISO(member.expiryDate), 'MMM d, yyyy') : 'N/A';
        const libName = settings?.libraryName?.trim() || 'Library Buddy';
        let message = '';

        if (isExpired) {
            message = `Hello ${member.fullName}, your ${libName} membership expired on ${formattedDate}. Please renew your plan to continue your access securely. Thank you!`;
        } else {
            message = `Hello ${member.fullName}, this is a gentle reminder that your ${libName} membership is expiring soon on ${formattedDate}. Please consider renewing to enjoy uninterrupted access. Thank you!`;
        }

        return `https://wa.me/${(member.countryCode || '+91').replace('+', '')}${member.phone}?text=${encodeURIComponent(message)}`;
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold font-display text-white">Reminders</h1>
                    <p className="text-white/70 mt-1">Manage soon-to-expire and expired memberships</p>
                </div>
            </div>

            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                <Input
                    placeholder="Search members by name or phone..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-10 bg-black/20 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/20 backdrop-blur-sm"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Expiring Soon Segment */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                        <Clock className="w-5 h-5 text-warning" />
                        <h2 className="text-lg font-semibold text-white">Expiring Soon ({filteredExpiring.length})</h2>
                    </div>

                    <div className="space-y-3">
                        {filteredExpiring.length === 0 ? (
                            <p className="text-sm text-white/50 p-4 text-center border border-white/10 border-dashed rounded-lg bg-white/5 backdrop-blur-sm">No members expiring soon.</p>
                        ) : (
                            <>
                                {paginatedExpiring.map((member, i) => (
                                    <motion.div
                                        key={member.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="stat-card backdrop-blur-md bg-black/40 border-l-4 border-l-warning border-white/10 hover:bg-black/50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <p className="font-medium text-white">{member.fullName}</p>
                                                <p className="text-xs text-white/50">{member.countryCode} {member.phone}</p>
                                            </div>
                                        </div>
                                        <p className="text-xs text-warning mb-3 drop-shadow-sm font-medium">Expires {member.expiryDate ? format(parseISO(member.expiryDate), 'MMM d, yyyy') : 'N/A'}</p>

                                        <div className="flex justify-end">
                                            <a
                                                href={getWhatsAppLink(member, false)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground gap-2 w-full sm:w-auto shadow-lg shadow-success/20">
                                                    <MessageSquare className="w-4 h-4" /> Send Reminder
                                                </Button>
                                            </a>
                                        </div>
                                    </motion.div>
                                ))}
                                {filteredExpiring.length > itemsPerPage && (
                                    <div className="flex items-center justify-between pt-4 mt-2 border-t border-white/10">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPageExpiring(p => Math.max(1, p - 1))}
                                            disabled={pageExpiring === 1}
                                            className="text-white/80 border-white/10 bg-black/20 hover:bg-white/10"
                                        >
                                            Previous
                                        </Button>
                                        <span className="text-sm text-white/60">
                                            Page {pageExpiring} of {Math.ceil(filteredExpiring.length / itemsPerPage)}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPageExpiring(p => Math.min(Math.ceil(filteredExpiring.length / itemsPerPage), p + 1))}
                                            disabled={pageExpiring === Math.ceil(filteredExpiring.length / itemsPerPage)}
                                            className="text-white/80 border-white/10 bg-black/20 hover:bg-white/10"
                                        >
                                            Next
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Expired Segment */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                        <AlertTriangle className="w-5 h-5 text-destructive" />
                        <h2 className="text-lg font-semibold text-white">Expired ({filteredExpired.length})</h2>
                    </div>

                    <div className="space-y-3">
                        {filteredExpired.length === 0 ? (
                            <p className="text-sm text-white/50 p-4 text-center border border-white/10 border-dashed rounded-lg bg-white/5 backdrop-blur-sm">No expired members.</p>
                        ) : (
                            <>
                                {paginatedExpired.map((member, i) => (
                                    <motion.div
                                        key={member.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="stat-card backdrop-blur-md bg-black/40 border-l-4 border-l-destructive border-white/10 hover:bg-black/50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <p className="font-medium text-white">{member.fullName}</p>
                                                <p className="text-xs text-white/50">{member.countryCode} {member.phone}</p>
                                            </div>
                                        </div>
                                        <p className="text-xs text-destructive mb-3 drop-shadow-sm font-medium">Expired {member.expiryDate ? format(parseISO(member.expiryDate), 'MMM d, yyyy') : 'N/A'}</p>

                                        <div className="flex justify-end">
                                            <a
                                                href={getWhatsAppLink(member, true)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground gap-2 w-full sm:w-auto shadow-lg shadow-success/20">
                                                    <MessageSquare className="w-4 h-4" /> Send Renewal Link
                                                </Button>
                                            </a>
                                        </div>
                                    </motion.div>
                                ))}
                                {filteredExpired.length > itemsPerPage && (
                                    <div className="flex items-center justify-between pt-4 mt-2 border-t border-white/10">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPageExpired(p => Math.max(1, p - 1))}
                                            disabled={pageExpired === 1}
                                            className="text-white/80 border-white/10 bg-black/20 hover:bg-white/10"
                                        >
                                            Previous
                                        </Button>
                                        <span className="text-sm text-white/60">
                                            Page {pageExpired} of {Math.ceil(filteredExpired.length / itemsPerPage)}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPageExpired(p => Math.min(Math.ceil(filteredExpired.length / itemsPerPage), p + 1))}
                                            disabled={pageExpired === Math.ceil(filteredExpired.length / itemsPerPage)}
                                            className="text-white/80 border-white/10 bg-black/20 hover:bg-white/10"
                                        >
                                            Next
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reminders;
