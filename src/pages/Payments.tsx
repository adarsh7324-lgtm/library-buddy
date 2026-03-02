import { useState } from 'react';
import { useLibrary } from '@/context/LibraryContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Plus, IndianRupee, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const Payments = () => {
  const { members, payments, addPayment, upgradeMember } = useLibrary();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ memberId: '', amount: '', months: '', note: '' });

  const handleSave = () => {
    if (!form.memberId || !form.amount || !form.months) {
      toast.error('Please fill all required fields');
      return;
    }
    addPayment({
      memberId: form.memberId,
      amount: Number(form.amount),
      months: Number(form.months),
      date: format(new Date(), 'yyyy-MM-dd'),
      note: form.note,
    });
    upgradeMember(form.memberId, Number(form.months));
    toast.success('Payment registered & membership extended');
    setDialogOpen(false);
    setForm({ memberId: '', amount: '', months: '', note: '' });
  };

  const sortedPayments = [...payments].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">Payments</h1>
          <p className="text-muted-foreground mt-1">Register payments and view history</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2"><Plus className="w-4 h-4" /> New Payment</Button>
      </div>

      {/* Payment History */}
      <div className="hidden md:block stat-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60">
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Member</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Months</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Amount</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Note</th>
            </tr>
          </thead>
          <tbody>
            {sortedPayments.map((payment, i) => {
              const member = members.find(m => m.id === payment.memberId);
              return (
                <motion.tr key={payment.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 text-muted-foreground">{format(parseISO(payment.date), 'MMM d, yyyy')}</td>
                  <td className="py-3 px-4 font-medium text-foreground">{member?.fullName ?? 'Unknown'}</td>
                  <td className="py-3 px-4 text-muted-foreground">{payment.months} month{payment.months > 1 ? 's' : ''}</td>
                  <td className="py-3 px-4 text-foreground font-medium">₹{payment.amount.toLocaleString()}</td>
                  <td className="py-3 px-4 text-muted-foreground">{payment.note || '—'}</td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
        {sortedPayments.length === 0 && <p className="text-center text-muted-foreground py-8">No payments yet</p>}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {sortedPayments.map((payment, i) => {
          const member = members.find(m => m.id === payment.memberId);
          return (
            <motion.div key={payment.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="stat-card">
              <div className="flex items-start justify-between mb-2">
                <p className="font-medium text-foreground">{member?.fullName ?? 'Unknown'}</p>
                <span className="text-sm font-bold text-foreground">₹{payment.amount.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(parseISO(payment.date), 'MMM d, yyyy')}</span>
                <span>{payment.months} month{payment.months > 1 ? 's' : ''}</span>
              </div>
              {payment.note && <p className="text-xs text-muted-foreground mt-1">{payment.note}</p>}
            </motion.div>
          );
        })}
        {sortedPayments.length === 0 && <p className="text-center text-muted-foreground py-8">No payments yet</p>}
      </div>

      {/* Register Payment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Register Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Member *</Label>
              <Select value={form.memberId} onValueChange={v => setForm(f => ({ ...f, memberId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>
                  {members.map(m => <SelectItem key={m.id} value={m.id}>{m.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Months to Add *</Label>
              <Select value={form.months} onValueChange={v => setForm(f => ({ ...f, months: v }))}>
                <SelectTrigger><SelectValue placeholder="Select months" /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 6, 12].map(m => <SelectItem key={m} value={String(m)}>{m} month{m > 1 ? 's' : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount Paid (₹) *</Label>
              <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g. 500" />
            </div>
            <div>
              <Label>Note (optional)</Label>
              <Input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="e.g. Renewal" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Register Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payments;
