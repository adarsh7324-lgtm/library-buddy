import { useState, useRef, useEffect, useMemo } from 'react';
import { useLibrary } from '@/context/LibraryContext';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { addMonths, addDays, format } from 'date-fns';
import { toast } from 'sonner';
import { UserPlus, Camera, RefreshCcw, X, Video } from 'lucide-react';
import { motion } from 'framer-motion';

const timeToMinutes = (time?: string) => {
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const AddMember = () => {
  const { addMember, addPayment, settings, members } = useLibrary();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '', phone: '', countryCode: '+91', address: '', idProofNumber: '',
    months: '', customDays: '', feesPaid: '', registrationFee: '', paymentMode: 'Cash' as 'Cash' | 'Online', startDate: format(new Date(), 'yyyy-MM-dd'), seatNumber: '', startTime: '09:00', endTime: '18:00', lockerFacility: false
  });

  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Here we could compress the image if needed, but for simplicity we'll just use the base64
        // Ideally we compress it by drawing it to a canvas just like before.
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const MAX_WIDTH = 150;
            const scale = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scale;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            setPhotoBase64(canvas.toDataURL('image/webp', 0.5));
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const retakePhoto = () => {
    setPhotoBase64(null);
  };

  const startCamera = async () => {
    if (isMobile) {
      // Mobile relies on the <input capture="environment" />
      return;
    }
    try {
      setIsCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      toast.error('Failed to access camera. Please check permissions.');
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 150;
      const scale = MAX_WIDTH / videoRef.current.videoWidth;
      canvas.width = MAX_WIDTH;
      canvas.height = videoRef.current.videoHeight * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        setPhotoBase64(canvas.toDataURL('image/webp', 0.5));
      }
      stopCamera();
    }
  };


  const availableSeatsByRoom = useMemo(() => {
    if (!settings?.rooms || settings.rooms.length === 0) return {};

    const availableByRoom: { [key: string]: string[] } = {};
    const filterStartMins = timeToMinutes(form.startTime);
    const filterEndMins = timeToMinutes(form.endTime);

    settings.rooms.forEach(room => {
      const roomSeats = [];
      for (let i = 1; i <= room.capacity; i++) {
        const seatIdStr = `${room.name} - Seat ${i}`;
        const isOccupied = members.some(m => {
          if (m.status === 'Expired') return false;
          if (m.seatNumber !== seatIdStr) return false;
          if (!m.startTime || !m.endTime) return false;

          const memberStartMins = timeToMinutes(m.startTime);
          const memberEndMins = timeToMinutes(m.endTime);

          return Math.max(filterStartMins, memberStartMins) < Math.min(filterEndMins, memberEndMins);
        });

        if (!isOccupied) {
          roomSeats.push(seatIdStr);
        }
      }
      if (roomSeats.length > 0) {
        availableByRoom[room.name] = roomSeats;
      }
    });

    return availableByRoom;
  }, [settings?.rooms, members, form.startTime, form.endTime]);

  const expiryDate = useMemo(() => {
    if (!form.startDate || !form.months) return '';
    const baseDate = new Date(form.startDate);

    if (form.months === 'custom' && form.customDays) {
      return format(addDays(baseDate, Number(form.customDays)), 'yyyy-MM-dd');
    } else if (form.months !== 'custom') {
      return format(addMonths(baseDate, Number(form.months)), 'yyyy-MM-dd');
    }
    return '';
  }, [form.startDate, form.months, form.customDays]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.phone || !form.months || !form.startDate) {
      toast.error('Please fill all required fields');
      return;
    }
    if (form.months === 'custom' && !form.customDays) {
      toast.error('Please specify custom days count');
      return;
    }
    try {
      const memberData: any = {
        fullName: form.fullName,
        phone: form.phone,
        countryCode: form.countryCode,
        address: form.address,
        idProofNumber: form.idProofNumber,
        months: form.months === 'custom' ? 0 : Number(form.months),
        feesPaid: Number(form.feesPaid) || 0,
        startDate: form.startDate,
        expiryDate,
        status: 'Active',
        seatNumber: form.seatNumber,
        startTime: form.startTime,
        endTime: form.endTime,
        lockerFacility: form.lockerFacility,
      };

      if (form.registrationFee) {
        memberData.registrationFee = Number(form.registrationFee);
      }

      if (form.months === 'custom') {
        memberData.customDays = Number(form.customDays);
      }

      const newMemberId = await addMember(memberData, photoBase64 || undefined);

      if (Number(form.feesPaid) > 0) {
        const paymentData: any = {
          memberId: newMemberId,
          amount: Number(form.feesPaid) + (Number(form.registrationFee) || 0),
          months: form.months === 'custom' ? 0 : Number(form.months),
          paymentMode: form.paymentMode,
          date: form.startDate,
          note: form.registrationFee ? 'Initial Registration & Monthly Fees' : 'Initial Registration Fee',
        };
        if (form.months === 'custom') {
          paymentData.customDays = Number(form.customDays);
        }
        await addPayment(paymentData);
      }
      toast.success('Member added successfully!');

      const durationText = form.months === 'custom' ? `${form.customDays} day(s)` : `${form.months} month(s)`;
      const message = `*Congratulations ${form.fullName}!* 🎉\nYou are now a member of the library.\n\n*Membership Details:*\n📱 Phone: ${form.countryCode} ${form.phone}\n⏳ Duration: ${durationText}\n💰 Fees Paid: ₹${form.feesPaid || 0} (${form.paymentMode})${form.registrationFee ? `\n💳 Registration Fee: ₹${form.registrationFee}` : ''}\n📅 Join Date: ${format(new Date(form.startDate), 'dd MMM yyyy')}\n⌛ Expiry Date: ${format(new Date(expiryDate), 'dd MMM yyyy')}\n\nWelcome aboard! 📚`;

      const encodedMessage = encodeURIComponent(message);
      const waNumber = `${form.countryCode.replace('+', '')}${form.phone}`;
      window.open(`https://wa.me/${waNumber}?text=${encodedMessage}`, '_blank');

      navigate('/members');
    } catch (error) {
      toast.error('Failed to add member');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">Add New Member</h1>
        <p className="text-muted-foreground mt-1">Register a new library member</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="stat-card">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col items-center justify-center space-y-4 mb-6">
            <Label className="text-lg font-semibold cursor-default">Profile Photograph</Label>

            {!photoBase64 && !isCameraOpen && (
              <div className="w-32 h-32 sm:w-48 sm:h-48 border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center bg-muted/20 relative">
                <Camera className="w-10 h-10 text-muted-foreground mb-2" />
                {isMobile ? (
                  <Label htmlFor="camera-upload" className="cursor-pointer bg-background border border-input hover:bg-accent hover:text-accent-foreground h-9 px-3 py-2 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium shadow-sm transition-colors">
                    Open Camera
                  </Label>
                ) : (
                  <Button type="button" onClick={startCamera} variant="outline" size="sm">
                    Open Camera
                  </Button>
                )}
                {isMobile && (
                  <input
                    id="camera-upload"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                )}
              </div>
            )}

            {isCameraOpen && !photoBase64 && !isMobile && (
              <div className="relative w-full max-w-sm rounded-lg overflow-hidden border border-border bg-black aspect-video flex items-center justify-center">
                <video ref={videoRef} className="w-full text-white" playsInline muted></video>
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                  <Button type="button" variant="destructive" size="sm" onClick={stopCamera}>
                    Cancel
                  </Button>
                  <Button type="button" variant="default" size="sm" onClick={capturePhoto}>
                    Capture
                  </Button>
                </div>
              </div>
            )}

            {photoBase64 && (
              <div className="relative w-32 h-32 sm:w-48 sm:h-48 rounded-lg overflow-hidden border border-border shadow-sm">
                <img src={photoBase64} alt="Captured" className="w-full h-full object-cover" />
                <div className="absolute bottom-2 left-0 right-0 flex justify-center">
                  <Button type="button" variant="secondary" size="sm" className="opacity-90 hover:opacity-100 shadow-sm" onClick={retakePhoto}>
                    <RefreshCcw className="w-3 h-3 mr-2" /> Retake
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Full Name *</Label>
              <Input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="Enter full name" />
            </div>
            <div>
              <Label>Country Code</Label>
              <Select value={form.countryCode} onValueChange={v => setForm(f => ({ ...f, countryCode: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="+91">+91 (India)</SelectItem>
                  <SelectItem value="+1">+1 (US)</SelectItem>
                  <SelectItem value="+44">+44 (UK)</SelectItem>
                  <SelectItem value="+971">+971 (UAE)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Phone Number *</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="9876543210" />
            </div>
            <div className="sm:col-span-2">
              <Label>Address</Label>
              <Textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Enter address" rows={2} />
            </div>
            <div>
              <Label>ID Proof Number (optional)</Label>
              <Input value={form.idProofNumber} onChange={e => setForm(f => ({ ...f, idProofNumber: e.target.value }))} placeholder="Aadhaar / PAN / DL" />
            </div>
            <div className="flex flex-col space-y-2">
              <Label>Locker Facility</Label>
              <div className="flex items-center space-x-2 h-10">
                <Switch
                  checked={form.lockerFacility}
                  onCheckedChange={(checked) => setForm(f => ({ ...f, lockerFacility: checked }))}
                />
                <span className="text-sm font-medium text-muted-foreground">{form.lockerFacility ? 'Opted In' : 'Not Required'}</span>
              </div>
            </div>
            <div>
              <Label>Start Time</Label>
              <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value, seatNumber: '' }))} />
            </div>
            <div>
              <Label>End Time</Label>
              <Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value, seatNumber: '' }))} />
            </div>
            <div>
              <Label>Seat Number (optional)</Label>
              <Select value={form.seatNumber} onValueChange={v => setForm(f => ({ ...f, seatNumber: v }))}>
                <SelectTrigger><SelectValue placeholder="Select available seat" /></SelectTrigger>
                <SelectContent>
                  {Object.keys(availableSeatsByRoom).length === 0 && <SelectItem value="_disabled" disabled>No seats available for time</SelectItem>}
                  {Object.entries(availableSeatsByRoom).map(([roomName, seats]) => (
                    <SelectGroup key={roomName}>
                      <SelectLabel>{roomName}</SelectLabel>
                      {seats.map(seat => <SelectItem key={seat} value={seat}>{seat}</SelectItem>)}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Membership Duration *</Label>
              <Select value={form.months} onValueChange={v => setForm(f => ({ ...f, months: v, customDays: '' }))}>
                <SelectTrigger><SelectValue placeholder="Select months" /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 6, 12].map(m => <SelectItem key={m} value={String(m)}>{m} month{m > 1 ? 's' : ''}</SelectItem>)}
                  <SelectItem value="custom">Custom (Days)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.months === 'custom' && (
              <div>
                <Label>Number of Days *</Label>
                <Input type="number" min="1" value={form.customDays} onChange={e => setForm(f => ({ ...f, customDays: e.target.value }))} placeholder="e.g. 15" />
              </div>
            )}
            <div>
              <Label>Fees Paid (₹)</Label>
              <Input type="number" value={form.feesPaid} onChange={e => setForm(f => ({ ...f, feesPaid: e.target.value }))} placeholder="Amount paid" />
            </div>
            <div>
              <Label>Registration Fee (₹, optional)</Label>
              <Input type="number" value={form.registrationFee} onChange={e => setForm(f => ({ ...f, registrationFee: e.target.value }))} placeholder="Reg. Amount" />
            </div>
            <div>
              <Label>Payment Mode</Label>
              <Select value={form.paymentMode} onValueChange={(v: 'Cash' | 'Online') => setForm(f => ({ ...f, paymentMode: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Start Date *</Label>
              <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div>
              <Label>Expiry Date (auto)</Label>
              <Input type="date" value={expiryDate} disabled className="bg-muted" />
            </div>
          </div>
          <Button type="submit" className="w-full sm:w-auto gap-2">
            <UserPlus className="w-4 h-4" /> Add Member
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default AddMember;
