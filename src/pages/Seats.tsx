import { useState, useMemo } from 'react';
import { useLibrary } from '@/context/LibraryContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { User, Armchair, Clock, Hash, MapPin, CalendarDays, Phone } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const timeToMinutes = (time?: string) => {
    if (!time) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

const Seats = () => {
    const { settings, updateSettings, members } = useLibrary();
    const [initializeInput, setInitializeInput] = useState('');

    // Time filters state, defaulting to current hour to next hour
    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, '0') + ':00';
    const nextHour = (now.getHours() + 1).toString().padStart(2, '0') + ':00';
    const [startTime, setStartTime] = useState(currentHour);
    const [endTime, setEndTime] = useState(nextHour);

    const [selectedSeat, setSelectedSeat] = useState<number | null>(null);

    const handleInitialize = async () => {
        const total = parseInt(initializeInput);
        if (!isNaN(total) && total > 0) {
            await updateSettings({ totalSeats: total });
        }
    };

    // Derive seat statuses based on selected time
    const seatData = useMemo(() => {
        if (!settings?.totalSeats) return [];

        const totalSeats = settings.totalSeats;
        const data = [];

        const filterStartMins = timeToMinutes(startTime);
        const filterEndMins = timeToMinutes(endTime);

        for (let i = 1; i <= totalSeats; i++) {
            const seatName = `Seat ${i}`;

            // Find an active/expired member occupying this seat during the filtered time
            const occupant = members.find(m => {
                if (m.seatNumber !== seatName && m.seatNumber !== String(i)) return false;

                // Time overlap logic
                if (!m.startTime || !m.endTime) return false;
                const memberStartMins = timeToMinutes(m.startTime);
                const memberEndMins = timeToMinutes(m.endTime);

                // Overlap condition: max(start1, start2) < min(end1, end2)
                return Math.max(filterStartMins, memberStartMins) < Math.min(filterEndMins, memberEndMins);
            });

            data.push({
                seatNumber: i,
                seatName,
                occupant,
                status: occupant ? occupant.status : 'Vacant'
            });
        }

        return data;
    }, [settings?.totalSeats, members, startTime, endTime]);

    if (settings?.totalSeats === undefined || settings?.totalSeats === 0) {
        return (
            <div className="max-w-md mx-auto mt-20 p-8 stat-card text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Armchair className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold font-display mb-2">Initialize Seats</h2>
                <p className="text-muted-foreground mb-6">Please enter the total number of seats available in your library to start managing them.</p>

                <div className="space-y-4">
                    <div className="space-y-2 text-left">
                        <Label>Total Seats</Label>
                        <Input
                            type="number"
                            placeholder="e.g. 50"
                            value={initializeInput}
                            onChange={e => setInitializeInput(e.target.value)}
                        />
                    </div>
                    <Button className="w-full" onClick={handleInitialize}>Setup Seats</Button>
                </div>
            </div>
        );
    }

    const selectedSeatData = seatData.find(s => s.seatNumber === selectedSeat);

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">Seats Dashboard</h1>
                <p className="text-muted-foreground mt-1">Manage seat availability based on time blocks</p>
            </div>

            <div className="stat-card p-4 flex flex-col sm:flex-row gap-4 items-center">
                <div className="flex-1 w-full max-w-sm flex items-center gap-3">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <div className="grid grid-cols-2 gap-2 flex-1">
                        <div className="space-y-1">
                            <Label className="text-xs">Start Time</Label>
                            <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="h-9" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">End Time</Label>
                            <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="h-9" />
                        </div>
                    </div>
                </div>
                <div className="flex gap-4 text-xs font-medium ml-auto">
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-success/20 border border-success"></span> Active</div>
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-warning/20 border border-warning"></span> Expiring Soon</div>
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-destructive/20 border border-destructive"></span> Expired</div>
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-muted border border-border"></span> Vacant</div>
                </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {seatData.map((seat, i) => {
                    let containerClass = "bg-muted/30 hover:bg-muted/50 border-border text-foreground";
                    let occupantClass = "text-muted-foreground font-medium";
                    let overlayClass = "bg-foreground/5";

                    if (seat.status === 'Active') {
                        containerClass = "bg-success border-success text-success-foreground shadow-[0_4px_14px_rgba(var(--success),0.4)] hover:shadow-[0_6px_20px_rgba(var(--success),0.5)]";
                        occupantClass = "text-success-foreground/90 font-bold";
                        overlayClass = "bg-white/20";
                    } else if (seat.status === 'Expiring Soon') {
                        containerClass = "bg-warning border-warning text-warning-foreground shadow-[0_4px_14px_rgba(var(--warning),0.4)] hover:shadow-[0_6px_20px_rgba(var(--warning),0.5)]";
                        occupantClass = "text-warning-foreground/90 font-bold";
                        overlayClass = "bg-black/10";
                    } else if (seat.status === 'Expired') {
                        containerClass = "bg-destructive border-destructive text-destructive-foreground shadow-[0_4px_14px_rgba(var(--destructive),0.4)] hover:shadow-[0_6px_20px_rgba(var(--destructive),0.5)]";
                        occupantClass = "text-destructive-foreground/90 font-bold";
                        overlayClass = "bg-black/10";
                    }

                    return (
                        <motion.div
                            key={seat.seatNumber}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: Math.min(i * 0.01, 0.5) }}
                            onClick={() => setSelectedSeat(seat.seatNumber)}
                            className={`border rounded-xl p-3 flex flex-col items-center justify-center aspect-square cursor-pointer transition-all duration-300 relative overflow-hidden ${containerClass}`}
                        >
                            <div className={`absolute inset-0 opacity-0 hover:opacity-100 transition-opacity ${overlayClass}`} />

                            <span className="text-2xl font-bold font-display z-10 drop-shadow-sm">{seat.seatNumber}</span>
                            <span className={`text-[10px] mt-1 uppercase tracking-wider z-10 drop-shadow-sm ${occupantClass}`}>
                                {seat.status === 'Vacant' ? 'Vacant' : seat.occupant?.fullName.split(' ')[0]}
                            </span>
                        </motion.div>
                    );
                })}
            </div>

            <Dialog open={selectedSeat !== null} onOpenChange={() => setSelectedSeat(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-display">
                            <Armchair className="w-5 h-5 text-primary" /> Seat {selectedSeat}
                        </DialogTitle>
                    </DialogHeader>

                    {selectedSeatData?.occupant ? (
                        <div className="mt-4 space-y-6">
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border/50">
                                <div className="w-16 h-16 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0 border-2 border-background shadow-sm">
                                    {selectedSeatData.occupant.photoUrl ? (
                                        <img src={selectedSeatData.occupant.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-8 h-8 text-muted-foreground/50" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg leading-tight">{selectedSeatData.occupant.fullName}</h3>
                                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                                        <Phone className="w-3.5 h-3.5" /> {selectedSeatData.occupant.countryCode} {selectedSeatData.occupant.phone}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-lg border border-border/50 bg-card">
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold uppercase mb-1">
                                        <Clock className="w-3.5 h-3.5" /> Assigned Time
                                    </div>
                                    <p className="font-medium text-sm">
                                        {selectedSeatData.occupant.startTime || '12:00'} - {selectedSeatData.occupant.endTime || '12:00'}
                                    </p>
                                </div>
                                <div className="p-3 rounded-lg border border-border/50 bg-card">
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold uppercase mb-1">
                                        <CalendarDays className="w-3.5 h-3.5" /> Valid Till
                                    </div>
                                    <p className="font-medium text-sm">
                                        {format(parseISO(selectedSeatData.occupant.expiryDate), 'MMM d, yyyy')}
                                    </p>
                                </div>
                                <div className="p-3 rounded-lg border border-border/50 bg-card col-span-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold uppercase">
                                            <Hash className="w-3.5 h-3.5" /> Status
                                        </div>
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${selectedSeatData.occupant.status === 'Active' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                                            }`}>
                                            {selectedSeatData.occupant.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                <MapPin className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-medium text-lg">Vacant Seat</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    This seat is currently available for the selected time range ({startTime} - {endTime}).
                                </p>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Seats;
