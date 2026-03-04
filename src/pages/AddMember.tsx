import { useState } from 'react';
import { useLibrary } from '@/context/LibraryContext';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { addMonths, format } from 'date-fns';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';

const AddMember = () => {
  const { addMember, addPayment } = useLibrary();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '', phone: '', countryCode: '+91', address: '', idProofNumber: '',
    months: '', feesPaid: '', startDate: format(new Date(), 'yyyy-MM-dd'), seatNumber: '',
  });

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
      });

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
