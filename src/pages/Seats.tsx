import { useState, useMemo } from 'react';
import { useLibrary } from '@/context/LibraryContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { User, Armchair, Clock, Hash, MapPin, CalendarDays, Phone } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { Member } from '@/context/LibraryContext';
import { timeToMinutes } from '@/lib/utils';
const Seats = () => {
    const { settings, updateSettings, members } = useLibrary();
    const [numRoomsInput, setNumRoomsInput] = useState('');
    const [setupStep, setSetupStep] = useState<1 | 2>(1);
    const [roomCapacities, setRoomCapacities] = useState<{ [key: string]: number }>({});
    const [isEditing, setIsEditing] = useState(false);

    // Time filters state
    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, '0') + ':00';
    const nextHour = ((now.getHours() + 1) % 24).toString().padStart(2, '0') + ':00';
    const [startTime, setStartTime] = useState(currentHour);
    const [endTime, setEndTime] = useState(nextHour);

    const [selectedSeat, setSelectedSeat] = useState<string | null>(null);

    const handleSetupNumRooms = () => {
        const total = parseInt(numRoomsInput);
        if (!isNaN(total) && total > 0) {
            const initialCapacities: { [key: string]: number } = {};
            for (let i = 1; i <= total; i++) {
                const existingRoom = settings?.rooms?.find((r: any) => r.id === `room-${i}`);
                if (existingRoom) {
                    initialCapacities[`room-${i}`] = existingRoom.capacity;
                } else {
                    initialCapacities[`room-${i}`] = 20; // Default capacity
                }
            }
            setRoomCapacities(initialCapacities);
            setSetupStep(2);
        }
    };

    const handleEditSetup = () => {
        if (settings?.rooms) {
            setNumRoomsInput(settings.rooms.length.toString());
            const initialCapacities: { [key: string]: number } = {};
            settings.rooms.forEach((room: any) => {
                initialCapacities[room.id] = room.capacity;
            });
            setRoomCapacities(initialCapacities);
            setSetupStep(1);
        }
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setSetupStep(1);
    };

    const handleFinalizeSetup = async () => {
        const roomsToSave = Object.entries(roomCapacities).map(([id, cap], index) => ({
            id: id,
            name: `Room ${index + 1}`,
            capacity: cap
        }));
        await updateSettings({ rooms: roomsToSave });
        setIsEditing(false);
    };

    // Derive seat statuses based on selected time per room
    const roomsData = useMemo(() => {
        if (!settings?.rooms || settings.rooms.length === 0) return [];

        const filterStartMins = timeToMinutes(startTime);
        const filterEndMins = timeToMinutes(endTime);

        return settings.rooms.map(room => {
            const seats = [];
            for (let i = 1; i <= room.capacity; i++) {
                const seatIdStr = `${room.name} - Seat ${i}`; // e.g., "Room 1 - Seat 5"

                // Find an active/expired member occupying this exact composite seat string during the filtered time
                const occupant = members.find(m => {
                    // Backwards compatibility for old "Seat X" or "X" formats logic skipped, 
                    // assuming new members will use exact string matches.
                    if (m.seatNumber !== seatIdStr) return false;

                    // Time overlap logic
                    if (!m.startTime || !m.endTime) return false;
                    const memberStartMins = timeToMinutes(m.startTime);
                    const memberEndMins = timeToMinutes(m.endTime);

                    // Overlap condition: max(start1, start2) < min(end1, end2)
                    return Math.max(filterStartMins, memberStartMins) < Math.min(filterEndMins, memberEndMins);
                });

                seats.push({
                    seatNumber: i,
                    seatIdStr,
                    occupant,
                    status: occupant ? occupant.status : 'Vacant'
                });
            }
            return { ...room, seats };
        });

    }, [settings?.rooms, members, startTime, endTime]);

    const seatOccupants = useMemo(() => {
        if (!selectedSeat) return [];
        return members.filter(m => m.seatNumber === selectedSeat);
    }, [selectedSeat, members]);

    if (!settings?.rooms || settings.rooms.length === 0 || isEditing) {
        return (
            <div className="max-w-md mx-auto mt-20 p-8 glass-panel rounded-2xl text-center shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-white/20">
                    <Armchair className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold font-display mb-2 text-white">{isEditing ? 'Edit Rooms & Seats' : 'Initialize Rooms & Seats'}</h2>

                {setupStep === 1 ? (
                    <>
                        <p className="text-white/70 mb-6">Please enter the total number of rooms available in your library.</p>
                        <div className="space-y-4">
                            <div className="space-y-2 text-left">
                                <Label className="text-white/90">Total Rooms</Label>
                                <Input
                                    type="number"
                                    placeholder="e.g. 3"
                                    value={numRoomsInput}
                                    onChange={e => setNumRoomsInput(e.target.value)}
                                    className="bg-black/20 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/20"
                                />
                            </div>
                            <div className="flex gap-3">
                                {isEditing && (
                                    <Button variant="outline" className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10" onClick={handleCancelEdit}>Cancel</Button>
                                )}
                                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20" onClick={handleSetupNumRooms}>Next Step</Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <p className="text-white/70 mb-6">Set the seat capacity for each room.</p>
                        <div className="space-y-4 text-left max-h-[40vh] overflow-y-auto pr-2 pb-2 custom-scrollbar">
                            {Object.keys(roomCapacities).map((roomId, index) => (
                                <div key={roomId} className="space-y-2">
                                    <Label className="text-white/90">Room {index + 1} Capacity</Label>
                                    <Input
                                        type="number"
                                        value={roomCapacities[roomId]}
                                        onChange={e => {
                                            const val = parseInt(e.target.value) || 0;
                                            setRoomCapacities(prev => ({ ...prev, [roomId]: val }));
                                        }}
                                        className="bg-black/20 border-white/10 text-white focus-visible:ring-white/20"
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-3 mt-6">
                            <Button variant="outline" className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10" onClick={() => setSetupStep(1)}>Back</Button>
                            <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20" onClick={handleFinalizeSetup}>{isEditing ? 'Save Changes' : 'Finalize Setup'}</Button>
                        </div>
                    </>
                )}
            </div>
        );
    }

    let selectedSeatData: { seatIdStr: string, seatNumber: number, status: string } | undefined;
    if (selectedSeat) {
        for (const room of roomsData) {
            const found = room.seats.find(s => s.seatIdStr === selectedSeat);
            if (found) {
                selectedSeatData = {
                    seatIdStr: found.seatIdStr,
                    seatNumber: found.seatNumber,
                    status: found.status
                };
                break;
            }
        }
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold font-display text-white">Seats Dashboard</h1>
                <p className="text-white/70 mt-1">Manage seat availability based on time blocks</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row gap-4 items-center shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
                <div className="flex-1 w-full max-w-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                        <Clock className="w-5 h-5 text-white/70" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 flex-1">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-white/80">Start Time</Label>
                            <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="h-9 bg-black/30 border-white/10 text-white focus-visible:ring-white/20 [color-scheme:dark]" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-white/80">End Time</Label>
                            <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="h-9 bg-black/30 border-white/10 text-white focus-visible:ring-white/20 [color-scheme:dark]" />
                        </div>
                    </div>
                </div>
                <div className="flex gap-4 text-xs font-medium ml-auto">
                    <div className="flex items-center gap-1.5 text-white/90"><span className="w-3 h-3 rounded-full bg-success border border-success/50 shadow-[0_0_10px_rgba(var(--success),0.5)]"></span> Active</div>
                    <div className="flex items-center gap-1.5 text-white/90"><span className="w-3 h-3 rounded-full bg-warning border border-warning/50 shadow-[0_0_10px_rgba(var(--warning),0.5)]"></span> Expiring Soon</div>
                    <div className="flex items-center gap-1.5 text-white/90"><span className="w-3 h-3 rounded-full bg-destructive border border-destructive/50 shadow-[0_0_10px_rgba(var(--destructive),0.5)]"></span> Expired</div>
                    <div className="flex items-center gap-1.5 text-white/90"><span className="w-3 h-3 rounded-full bg-white/10 border border-white/20"></span> Vacant</div>
                </div>
            </div>

            <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={handleEditSetup} className="text-white/80 bg-white/5 border-white/10 hover:bg-white/10 hover:text-white backdrop-blur-sm">
                    <Armchair className="w-4 h-4 mr-2" /> Edit Room Layout
                </Button>
            </div>

            <div className="space-y-8">
                {roomsData.map((room) => (
                    <div key={room.id} className="glass-panel p-6 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] border border-white/10">
                        <h2 className="text-xl font-bold font-display mb-6 border-b border-white/10 pb-4 flex items-center justify-between text-white drop-shadow-sm">
                            {room.name}
                            <span className="text-sm font-normal text-white/70 bg-black/30 px-3 py-1 rounded-full border border-white/5">{room.capacity} Seats Total</span>
                        </h2>
                        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
                            {room.seats.map((seat, i) => {
                                let containerClass = "bg-black/30 hover:bg-black/50 border-white/10 text-white/90 shadow-inner";
                                let occupantClass = "text-white/50 font-medium";
                                let overlayClass = "bg-white/5";

                                if (seat.status === 'Active') {
                                    containerClass = "bg-success/80 border-success/80 text-success-foreground shadow-[0_4px_16px_rgba(var(--success),0.15)] hover:shadow-[0_6px_24px_rgba(var(--success),0.25)] hover:bg-success/90 backdrop-blur-md";
                                    occupantClass = "text-success-foreground/90 font-bold drop-shadow-sm";
                                    overlayClass = "bg-white/10";
                                } else if (seat.status === 'Expiring Soon') {
                                    containerClass = "bg-warning/80 border-warning/80 text-warning-foreground shadow-[0_4px_16px_rgba(var(--warning),0.15)] hover:shadow-[0_6px_24px_rgba(var(--warning),0.25)] hover:bg-warning/90 backdrop-blur-md";
                                    occupantClass = "text-warning-foreground/90 font-bold drop-shadow-sm";
                                    overlayClass = "bg-white/10";
                                } else if (seat.status === 'Expired') {
                                    containerClass = "bg-destructive/80 border-destructive/80 text-destructive-foreground shadow-[0_4px_16px_rgba(var(--destructive),0.15)] hover:shadow-[0_6px_24px_rgba(var(--destructive),0.25)] hover:bg-destructive/90 backdrop-blur-md";
                                    occupantClass = "text-destructive-foreground/90 font-bold drop-shadow-sm";
                                    overlayClass = "bg-white/10";
                                }

                                return (
                                    <motion.div
                                        key={seat.seatIdStr}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: Math.min(i * 0.01, 0.5) }}
                                        onClick={() => setSelectedSeat(seat.seatIdStr)}
                                        className={`border rounded-xl p-3 flex flex-col items-center justify-center aspect-square cursor-pointer transition-all duration-300 relative overflow-hidden group ${containerClass}`}
                                    >
                                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${overlayClass}`} />

                                        <span className="text-2xl font-bold font-display z-10 drop-shadow-md">{seat.seatNumber}</span>
                                        <span className={`text-[10px] sm:text-xs mt-1 uppercase tracking-wider z-10 truncate w-full text-center ${occupantClass}`}>
                                            {seat.status === 'Vacant' ? 'Vacant' : seat.occupant?.fullName.split(' ')[0]}
                                        </span>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <Dialog open={selectedSeat !== null} onOpenChange={() => setSelectedSeat(null)}>
                <DialogContent className="sm:max-w-md bg-black/60 backdrop-blur-2xl border-white/10 shadow-[0_16px_64px_0_rgba(0,0,0,0.5)]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-display text-white">
                            <Armchair className="w-5 h-5 text-primary" /> {selectedSeat}
                        </DialogTitle>
                        <DialogDescription className="text-white/60">
                            All students assigned to this seat
                        </DialogDescription>
                    </DialogHeader>

                    {seatOccupants.length > 0 ? (
                        <div className="mt-4 space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                            {seatOccupants.map(occupant => (
                                <div key={occupant.id} className="flex flex-col gap-3 p-4 border border-white/10 rounded-xl bg-white/5 backdrop-blur-sm shadow-inner hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full overflow-hidden bg-black/40 flex items-center justify-center shrink-0 border border-white/20 shadow-sm">
                                            {occupant.photoUrl ? (
                                                <img src={occupant.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="w-6 h-6 text-white/50" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-base leading-tight text-white">{occupant.fullName}</h3>
                                            <div className="flex items-center gap-1.5 text-xs text-white/60 mt-1">
                                                <Phone className="w-3 h-3" /> {occupant.countryCode || '+91'} {occupant.phone}
                                            </div>
                                        </div>
                                        <div className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border shadow-sm ${occupant.status === 'Active' ? 'bg-success/80 text-success-foreground border-success/80' : occupant.status === 'Expiring Soon' ? 'bg-warning/80 text-warning-foreground border-warning/80' : 'bg-destructive/80 text-destructive-foreground border-destructive/80'}`}>
                                            {occupant.status}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs border-t border-white/10 pt-3 text-white/80">
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5 text-white/50" />
                                            <span className="font-medium bg-black/20 px-2 py-0.5 rounded">{occupant.startTime || '12:00'} - {occupant.endTime || '12:00'}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 justify-end">
                                            <CalendarDays className="w-3.5 h-3.5 text-white/50" />
                                            <span className="font-medium bg-black/20 px-2 py-0.5 rounded">{occupant.expiryDate ? format(parseISO(occupant.expiryDate), 'MMM d, yyyy') : 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 bg-white/5 rounded-xl border border-white/5 backdrop-blur-sm mt-4">
                            <div className="w-14 h-14 rounded-full bg-black/30 flex items-center justify-center text-white/40 ring-1 ring-white/10">
                                <Armchair className="w-7 h-7" />
                            </div>
                            <div className="max-w-[80%]">
                                <h3 className="font-semibold text-lg text-white">Unassigned Seat</h3>
                                <p className="text-sm text-white/50 mt-1">
                                    No students are currently assigned to this seat across any time slots.
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
