import { useState, useRef, useEffect } from 'react';
import { useLibrary } from '@/context/LibraryContext';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { addMonths, format } from 'date-fns';
import { toast } from 'sonner';
import { UserPlus, Camera, RefreshCcw, X } from 'lucide-react';
import { motion } from 'framer-motion';

const AddMember = () => {
  const { addMember, addPayment } = useLibrary();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '', phone: '', countryCode: '+91', address: '', idProofNumber: '',
    months: '', feesPaid: '', startDate: format(new Date(), 'yyyy-MM-dd'), seatNumber: '',
  });

  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async (mode: 'user' | 'environment') => {
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
      setFacingMode(mode);
    } catch (err) {
      console.error("Error accessing camera:", err);
      toast.error('Could not access camera');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const flipCamera = () => {
    startCamera(facingMode === 'user' ? 'environment' : 'user');
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        const MAX_WIDTH = 300;
        const scale = MAX_WIDTH / videoRef.current.videoWidth;
        const targetWidth = MAX_WIDTH;
        const targetHeight = videoRef.current.videoHeight * scale;

        canvasRef.current.width = targetWidth;
        canvasRef.current.height = targetHeight;
        context.drawImage(videoRef.current, 0, 0, targetWidth, targetHeight);

        // Use lower quality for smaller base64 string to fit in Firestore
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.6);
        setPhotoBase64(dataUrl);
        stopCamera();
      }
    }
  };

  const retakePhoto = () => {
    setPhotoBase64(null);
    startCamera(facingMode);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const expiryDate = form.months && form.startDate
    ? format(addMonths(new Date(form.startDate), Number(form.months)), 'yyyy-MM-dd')
    : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.phone || !form.months || !form.startDate) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      const newMemberId = await addMember({
        fullName: form.fullName,
        phone: form.phone,
        countryCode: form.countryCode,
        address: form.address,
        idProofNumber: form.idProofNumber,
        months: Number(form.months),
        feesPaid: Number(form.feesPaid) || 0,
        startDate: form.startDate,
        expiryDate,
        status: 'Active',
        seatNumber: form.seatNumber,
      }, photoBase64 || undefined);

      if (Number(form.feesPaid) > 0) {
        await addPayment({
          memberId: newMemberId,
          amount: Number(form.feesPaid),
          months: Number(form.months),
          date: form.startDate,
          note: 'Initial Registration Fee',
        });
      }
      toast.success('Member added successfully!');

      const message = `*Congratulations ${form.fullName}!* 🎉\nYou are now a member of the library.\n\n*Membership Details:*\n📱 Phone: ${form.countryCode} ${form.phone}\n⏳ Duration: ${form.months} month(s)\n💰 Fees Paid: ₹${form.feesPaid || 0}\n📅 Join Date: ${format(new Date(form.startDate), 'dd MMM yyyy')}\n⌛ Expiry Date: ${format(new Date(expiryDate), 'dd MMM yyyy')}\n\nWelcome aboard! 📚`;

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

            {!cameraActive && !photoBase64 && (
              <div className="w-32 h-32 sm:w-48 sm:h-48 border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center bg-muted/20">
                <Camera className="w-10 h-10 text-muted-foreground mb-2" />
                <Button type="button" variant="outline" size="sm" onClick={() => startCamera('user')}>Open Camera</Button>
              </div>
            )}

            {cameraActive && !photoBase64 && (
              <div className="relative w-full max-w-[280px] sm:max-w-sm rounded-[2rem] sm:rounded-lg overflow-hidden bg-black aspect-[3/4] sm:aspect-video flex items-center justify-center shadow-lg mx-auto">
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                <div className="absolute inset-x-0 bottom-4 flex justify-center gap-6 px-4">
                  <Button type="button" variant="secondary" size="icon" className="rounded-full w-12 h-12 bg-white/20 hover:bg-white/30 backdrop-blur-md border-0 text-white" onClick={flipCamera}>
                    <RefreshCcw className="w-5 h-5" />
                  </Button>
                  <Button type="button" variant="default" className="rounded-full w-16 h-16 bg-white hover:bg-white/90 shadow-xl border-[4px] border-white/20 p-0" onClick={capturePhoto}>
                    <span className="sr-only">Capture</span>
                  </Button>
                  <Button type="button" variant="destructive" size="icon" className="rounded-full w-12 h-12 bg-red-500/80 hover:bg-red-500 backdrop-blur-md border-0 text-white" onClick={stopCamera}>
                    <X className="w-5 h-5" />
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

            <canvas ref={canvasRef} className="hidden" />
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
            <div>
              <Label>Seat Number (optional)</Label>
              <Input value={form.seatNumber} onChange={e => setForm(f => ({ ...f, seatNumber: e.target.value }))} placeholder="E.g., A12" />
            </div>
            <div>
              <Label>Membership Duration *</Label>
              <Select value={form.months} onValueChange={v => setForm(f => ({ ...f, months: v }))}>
                <SelectTrigger><SelectValue placeholder="Select months" /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 6, 12].map(m => <SelectItem key={m} value={String(m)}>{m} month{m > 1 ? 's' : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fees Paid (₹)</Label>
              <Input type="number" value={form.feesPaid} onChange={e => setForm(f => ({ ...f, feesPaid: e.target.value }))} placeholder="Amount paid" />
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
