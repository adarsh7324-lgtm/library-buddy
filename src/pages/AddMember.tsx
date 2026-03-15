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
    months: '', customDays: '', feesPaid: '', registrationFee: '', discountAmount: '', paymentMode: 'Cash' as 'Cash' | 'Online', startDate: format(new Date(), 'yyyy-MM-dd'), seatNumber: '', startTime: '09:00', endTime: '18:00', lockerFacility: false,
    targetExam: '', shift: ''
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
        targetExam: form.targetExam,
        shift: form.shift || null,
        discountAmount: Number(form.discountAmount) || 0,
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
      const discountText = Number(form.discountAmount) > 0 ? `\n🏷️ Discount: ₹${form.discountAmount}` : '';
      const message = `*Congratulations ${form.fullName}!* 🎉\nYou are now a member of the library.\n\n*Membership Details:*\n📱 Phone: ${form.countryCode} ${form.phone}\n⏳ Duration: ${durationText}\n💰 Fees Paid: ₹${form.feesPaid || 0} (${form.paymentMode})${form.registrationFee ? `\n💳 Registration Fee: ₹${form.registrationFee}` : ''}${discountText}\n📅 Join Date: ${format(new Date(form.startDate), 'dd MMM yyyy')}\n⌛ Expiry Date: ${format(new Date(expiryDate), 'dd MMM yyyy')}\n\nWelcome aboard! 📚`;

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

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 sm:p-8 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center justify-center space-y-4 mb-8">
            <Label className="text-lg font-semibold text-white cursor-default">Profile Photograph</Label>

            {!photoBase64 && !isCameraOpen && (
              <div className="w-32 h-32 sm:w-48 sm:h-48 border-2 border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center bg-black/20 hover:bg-black/30 transition-colors relative">
                <Camera className="w-10 h-10 text-white/50 mb-3" />
                {isMobile ? (
                  <Label htmlFor="camera-upload" className="cursor-pointer bg-white/10 border border-white/10 hover:bg-white/20 text-white h-9 px-4 py-2 inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium shadow-sm transition-colors backdrop-blur-sm">
                    Open Camera
                  </Label>
                ) : (
                  <Button type="button" onClick={startCamera} variant="outline" size="sm" className="bg-white/10 border-white/10 hover:bg-white/20 text-white backdrop-blur-sm">
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
              <div className="relative w-full max-w-sm rounded-xl overflow-hidden border border-white/10 bg-black aspect-video flex items-center justify-center shadow-lg">
                <video ref={videoRef} className="w-full text-white" playsInline muted></video>
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                  <Button type="button" variant="destructive" size="sm" onClick={stopCamera} className="bg-destructive/80 hover:bg-destructive backdrop-blur-sm shadow-sm">
                    Cancel
                  </Button>
                  <Button type="button" variant="default" size="sm" onClick={capturePhoto} className="bg-white/20 hover:bg-white/30 text-white border border-white/20 backdrop-blur-sm shadow-sm">
                    Capture
                  </Button>
                </div>
              </div>
            )}

            {photoBase64 && (
              <div className="relative w-32 h-32 sm:w-48 sm:h-48 rounded-xl overflow-hidden border border-white/10 shadow-lg ring-2 ring-white/5">
                <img src={photoBase64} alt="Captured" className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent flex justify-center">
                  <Button type="button" variant="secondary" size="sm" className="bg-white/20 hover:bg-white/30 text-white border border-white/10 backdrop-blur-md shadow-sm opacity-90 hover:opacity-100" onClick={retakePhoto}>
                    <RefreshCcw className="w-3 h-3 mr-2" /> Retake
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-white/90">Full Name *</Label>
              <Input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="Enter full name" className="bg-black/20 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/20" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/90">Country Code</Label>
              <Select value={form.countryCode} onValueChange={v => setForm(f => ({ ...f, countryCode: v }))}>
                <SelectTrigger className="bg-black/20 border-white/10 text-white focus:ring-white/20"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-black/60 backdrop-blur-xl border-white/10 text-white">
                  <SelectItem value="+91" className="focus:bg-white/10 focus:text-white">+91 (India)</SelectItem>
                  <SelectItem value="+1" className="focus:bg-white/10 focus:text-white">+1 (US)</SelectItem>
                  <SelectItem value="+44" className="focus:bg-white/10 focus:text-white">+44 (UK)</SelectItem>
                  <SelectItem value="+971" className="focus:bg-white/10 focus:text-white">+971 (UAE)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/90">Phone Number *</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="9876543210" className="bg-black/20 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/20" />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-white/90">Address</Label>
              <Textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Enter address" rows={2} className="bg-black/20 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/20 resize-none" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/90">ID Proof Number (optional)</Label>
              <Input value={form.idProofNumber} onChange={e => setForm(f => ({ ...f, idProofNumber: e.target.value }))} placeholder="Aadhaar / PAN / DL" className="bg-black/20 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/20" />
            </div>
            <div className="flex flex-col space-y-3">
              <Label className="text-white/90">Locker Facility</Label>
              <div className="flex items-center space-x-3 h-10 p-2 rounded-lg bg-black/20 border border-white/5">
                <Switch
                  checked={form.lockerFacility}
                  onCheckedChange={(checked) => setForm(f => ({ ...f, lockerFacility: checked }))}
                  className="data-[state=checked]:bg-primary"
                />
                <span className="text-sm font-medium text-white/70">{form.lockerFacility ? 'Opted In' : 'Not Required'}</span>
              </div>
              <div className="md:col-span-2 space-y-1.5 pt-2">
                <Label htmlFor="targetExam" className="text-white/90">Target Exam (Optional)</Label>
                <Input
                  id="targetExam"
                  placeholder="e.g. UPSC, JEE, NEET, SSC"
                  value={form.targetExam}
                  onChange={(e) => setForm({ ...form, targetExam: e.target.value })}
                  className="bg-black/20 focus:-bg-black/30 transition-colors border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/20"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/90">Start Time</Label>
              <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value, seatNumber: '' }))} className="bg-black/20 border-white/10 text-white focus-visible:ring-white/20 [color-scheme:dark]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/90">End Time</Label>
              <Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value, seatNumber: '' }))} className="bg-black/20 border-white/10 text-white focus-visible:ring-white/20 [color-scheme:dark]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/90">Shift Details (optional)</Label>
              <Select value={form.shift} onValueChange={v => setForm(f => ({ ...f, shift: v }))}>
                <SelectTrigger className="bg-black/20 border-white/10 text-white focus:ring-white/20"><SelectValue placeholder="Select shift (optional)" /></SelectTrigger>
                <SelectContent className="bg-black/60 backdrop-blur-xl border-white/10 text-white">
                  <SelectItem value="Morning" className="focus:bg-white/10 focus:text-white">Morning</SelectItem>
                  <SelectItem value="Afternoon" className="focus:bg-white/10 focus:text-white">Afternoon</SelectItem>
                  <SelectItem value="Evening" className="focus:bg-white/10 focus:text-white">Evening</SelectItem>
                  <SelectItem value="Night" className="focus:bg-white/10 focus:text-white">Night</SelectItem>
                  <SelectItem value="Full" className="focus:bg-white/10 focus:text-white">Full</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/90">Seat Number (optional)</Label>
              <Select value={form.seatNumber} onValueChange={v => setForm(f => ({ ...f, seatNumber: v }))}>
                <SelectTrigger className="bg-black/20 border-white/10 text-white focus:ring-white/20"><SelectValue placeholder="Select available seat" /></SelectTrigger>
                <SelectContent className="bg-black/60 backdrop-blur-xl border-white/10 text-white">
                  {Object.keys(availableSeatsByRoom).length === 0 && <SelectItem value="_disabled" disabled className="text-white/50">No seats available for time</SelectItem>}
                  {Object.entries(availableSeatsByRoom).map(([roomName, seats]) => (
                    <SelectGroup key={roomName}>
                      <SelectLabel className="text-white/50 font-semibold">{roomName}</SelectLabel>
                      {seats.map(seat => <SelectItem key={seat} value={seat} className="focus:bg-white/10 focus:text-white">{seat}</SelectItem>)}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/90">Membership Duration *</Label>
              <Select value={form.months} onValueChange={v => setForm(f => ({ ...f, months: v, customDays: '' }))}>
                <SelectTrigger className="bg-black/20 border-white/10 text-white focus:ring-white/20"><SelectValue placeholder="Select months" /></SelectTrigger>
                <SelectContent className="bg-black/60 backdrop-blur-xl border-white/10 text-white">
                  {[1, 2, 3, 6, 12].map(m => <SelectItem key={m} value={String(m)} className="focus:bg-white/10 focus:text-white">{m} month{m > 1 ? 's' : ''}</SelectItem>)}
                  <SelectItem value="custom" className="focus:bg-white/10 focus:text-white">Custom (Days)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.months === 'custom' && (
              <div className="space-y-1.5">
                <Label className="text-white/90">Number of Days *</Label>
                <Input type="number" min="1" value={form.customDays} onChange={e => setForm(f => ({ ...f, customDays: e.target.value }))} placeholder="e.g. 15" className="bg-black/20 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/20" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-white/90">Fees Paid (₹)</Label>
              <Input type="number" value={form.feesPaid} onChange={e => setForm(f => ({ ...f, feesPaid: e.target.value }))} placeholder="Amount paid" className="bg-black/20 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/20" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/90">Registration Fee (₹, optional)</Label>
              <Input type="number" value={form.registrationFee} onChange={e => setForm(f => ({ ...f, registrationFee: e.target.value }))} placeholder="Reg. Amount" className="bg-black/20 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/20" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/90">Discount Amount (₹, optional)</Label>
              <Input type="number" value={form.discountAmount} onChange={e => setForm(f => ({ ...f, discountAmount: e.target.value }))} placeholder="Discount Amount" className="bg-black/20 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/20" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/90">Payment Mode</Label>
              <Select value={form.paymentMode} onValueChange={(v: 'Cash' | 'Online') => setForm(f => ({ ...f, paymentMode: v }))}>
                <SelectTrigger className="bg-black/20 border-white/10 text-white focus:ring-white/20"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-black/60 backdrop-blur-xl border-white/10 text-white">
                  <SelectItem value="Cash" className="focus:bg-white/10 focus:text-white">Cash</SelectItem>
                  <SelectItem value="Online" className="focus:bg-white/10 focus:text-white">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/90">Start Date *</Label>
              <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="bg-black/20 border-white/10 text-white focus-visible:ring-white/20 [color-scheme:dark]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/90">Expiry Date (auto)</Label>
              <Input type="date" value={expiryDate} disabled className="bg-black/40 border-white/5 text-white/50 cursor-not-allowed [color-scheme:dark]" />
            </div>
          </div>
          <div className="pt-4 border-t border-white/10">
            <Button type="submit" className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
              <UserPlus className="w-4 h-4" /> Add Member
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default AddMember;
