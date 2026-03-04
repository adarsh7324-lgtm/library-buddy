import { useState } from 'react';
import { useLibrary } from '@/context/LibraryContext';
import { Search, MessageSquare, AlertTriangle, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { motion } from 'framer-motion';

const Reminders = () => {
    const { members } = useLibrary();
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

    const getWhatsAppLink = (member: any, isExpired: boolean) => {
        const formattedDate = format(parseISO(member.expiryDate), 'MMM d, yyyy');
        let message = '';

        if (isExpired) {
            message = `Hello ${member.fullName}, your library membership with us expired on ${formattedDate}. Please renew your plan to continue your access securely. Thank you!`;
        } else {
            message = `Hello ${member.fullName}, this is a gentle reminder that your library membership is expiring soon on ${formattedDate}. Please consider renewing your plan to enjoy uninterrupted access. Thank you!`;
        }

        return `https://wa.me/${member.countryCode.replace('+', '')}${member.phone}?text=${encodeURIComponent(message)}`;
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">Reminders</h1>
                    <p className="text-muted-foreground mt-1">Manage soon-to-expire and expired memberships</p>
                </div>
            </div>

            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Search members by name or phone..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-10"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Expiring Soon Segment */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                        <Clock className="w-5 h-5 text-warning" />
                        <h2 className="text-lg font-semibold text-foreground">Expiring Soon ({filteredExpiring.length})</h2>
                    </div>

                    <div className="space-y-3">
                        {filteredExpiring.length === 0 ? (
                            <p className="text-sm text-muted-foreground p-4 text-center border border-dashed rounded-lg">No members expiring soon.</p>
                        ) : (
                            filteredExpiring.map((member, i) => (
                                <motion.div
                                    key={member.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="stat-card"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <p className="font-medium text-foreground">{member.fullName}</p>
                                            <p className="text-xs text-muted-foreground">{member.countryCode} {member.phone}</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-warning mb-3">Expires {format(parseISO(member.expiryDate), 'MMM d, yyyy')}</p>

                                    <div className="flex justify-end">
                                        <a
                                            href={getWhatsAppLink(member, false)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground gap-2 w-full sm:w-auto">
                                                <MessageSquare className="w-4 h-4" /> Send Reminder
                                            </Button>
                                        </a>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>

                {/* Expired Segment */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                        <AlertTriangle className="w-5 h-5 text-destructive" />
                        <h2 className="text-lg font-semibold text-foreground">Expired ({filteredExpired.length})</h2>
                    </div>

                    <div className="space-y-3">
                        {filteredExpired.length === 0 ? (
                            <p className="text-sm text-muted-foreground p-4 text-center border border-dashed rounded-lg">No expired members.</p>
                        ) : (
                            filteredExpired.map((member, i) => (
                                <motion.div
                                    key={member.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="stat-card border-destructive/20"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <p className="font-medium text-foreground">{member.fullName}</p>
                                            <p className="text-xs text-muted-foreground">{member.countryCode} {member.phone}</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-destructive mb-3">Expired {format(parseISO(member.expiryDate), 'MMM d, yyyy')}</p>

                                    <div className="flex justify-end">
                                        <a
                                            href={getWhatsAppLink(member, true)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground gap-2 w-full sm:w-auto">
                                                <MessageSquare className="w-4 h-4" /> Send Renewal Link
                                            </Button>
                                        </a>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reminders;
