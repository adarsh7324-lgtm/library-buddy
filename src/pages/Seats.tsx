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

const timeToMinutes = (time?: string) => {
    if (!time) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

const Seats = () => {
    const { settings, updateSettings, members } = useLibrary();
    const [numRoomsInput, setNumRoomsInput] = useState('');
    const [setupStep, setSetupStep] = useState<1 | 2>(1);
    const [roomCapacities, setRoomCapacities] = useState<{ [key: string]: number }>({});
    const [isEditing, setIsEditing] = useState(false);

    // Time filters state
    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, '0') + ':00';
    const nextHour = (now.getHours() + 1).toString().padStart(2, '0') + ':00';
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
            <div className="max-w-md mx-auto mt-20 p-8 stat-card text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Armchair className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold font-display mb-2">{isEditing ? 'Edit Rooms & Seats' : 'Initialize Rooms & Seats'}</h2>

                {setupStep === 1 ? (
                    <>
                        <p className="text-muted-foreground mb-6">Please enter the total number of rooms available in your library.</p>
                        <div className="space-y-4">
                            <div className="space-y-2 text-left">
                                <Label>Total Rooms</Label>
                                <Input
                                    type="number"
                                    placeholder="e.g. 3"
                                    value={numRoomsInput}
                                    onChange={e => setNumRoomsInput(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-3">
                                {isEditing && (
                                    <Button variant="outline" className="w-full" onClick={handleCancelEdit}>Cancel</Button>
                                )}
                                <Button className="w-full" onClick={handleSetupNumRooms}>Next Step</Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <p className="text-muted-foreground mb-6">Set the seat capacity for each room.</p>
                        <div className="space-y-4 text-left max-h-[40vh] overflow-y-auto pr-2 pb-2">
                            {Object.keys(roomCapacities).map((roomId, index) => (
                                <div key={roomId} className="space-y-2">
                                    <Label>Room {index + 1} Capacity</Label>
                                    <Input
                                        type="number"
                                        value={roomCapacities[roomId]}
                                        onChange={e => {
                                            const val = parseInt(e.target.value) || 0;
                                            setRoomCapacities(prev => ({ ...prev, [roomId]: val }));
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-3 mt-6">
                            <Button variant="outline" className="w-full" onClick={() => setSetupStep(1)}>Back</Button>
                            <Button className="w-full" onClick={handleFinalizeSetup}>{isEditing ? 'Save Changes' : 'Finalize Setup'}</Button>
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

            <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={handleEditSetup} className="text-muted-foreground">
                    <Armchair className="w-4 h-4 mr-2" /> Edit Room Layout
                </Button>
            </div>

            <div className="space-y-8">
                {roomsData.map((room) => (
                    <div key={room.id} className="stat-card p-5">
                        <h2 className="text-xl font-bold font-display mb-4 border-b pb-2 flex items-center justify-between">
                            {room.name}
                            <span className="text-sm font-normal text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">{room.capacity} Seats Total</span>
                        </h2>
                        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
                            {room.seats.map((seat, i) => {
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
                                        key={seat.seatIdStr}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: Math.min(i * 0.01, 0.5) }}
                                        onClick={() => setSelectedSeat(seat.seatIdStr)}
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
                    </div>
                ))}
            </div>

            <Dialog open={selectedSeat !== null} onOpenChange={() => setSelectedSeat(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-display">
                            <Armchair className="w-5 h-5 text-primary" /> {selectedSeat}
                        </DialogTitle>
                        <DialogDescription>
                            All students assigned to this seat
                        </DialogDescription>
                    </DialogHeader>

                    {seatOccupants.length > 0 ? (
                        <div className="mt-4 space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                            {seatOccupants.map(occupant => (
                                <div key={occupant.id} className="flex flex-col gap-3 p-4 border rounded-xl bg-card">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0 border border-background shadow-sm">
                                            {occupant.photoUrl ? (
                                                <img src={occupant.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="w-6 h-6 text-muted-foreground/50" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-base leading-tight">{occupant.fullName}</h3>
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                                                <Phone className="w-3 h-3" /> {occupant.countryCode || '+91'} {occupant.phone}
                                            </div>
                                        </div>
                                        <div className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${occupant.status === 'Active' ? 'bg-success/20 text-success' : occupant.status === 'Expiring Soon' ? 'bg-warning/20 text-warning' : 'bg-destructive/20 text-destructive'}`}>
                                            {occupant.status}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs border-t pt-3">
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                            <span className="font-medium">{occupant.startTime || '12:00'} - {occupant.endTime || '12:00'}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 justify-end">
                                            <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                                            <span className="font-medium">{occupant.expiryDate ? format(parseISO(occupant.expiryDate), 'MMM d, yyyy') : 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                <Armchair className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-medium text-lg">Unassigned Seat</h3>
                                <p className="text-sm text-muted-foreground mt-1">
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
