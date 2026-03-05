import { useState } from 'react';
import { useLibrary } from '@/context/LibraryContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Plus, IndianRupee, Calendar, Download, Check, ChevronsUpDown, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Payments = () => {
  const { members, payments, deletedPayments, addPayment, upgradeMember, deletePayment, clearDeletedPayments } = useLibrary();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [openMemberSelect, setOpenMemberSelect] = useState(false);
  const [form, setForm] = useState({ memberId: '', amount: '', months: '', note: '' });
  const [viewDeleted, setViewDeleted] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearPassword, setClearPassword] = useState('');

  const handleSave = async () => {
    if (!form.memberId || !form.amount || !form.months) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      const paymentDate = format(new Date(), 'yyyy-MM-dd');
      await addPayment({
        memberId: form.memberId,
        amount: Number(form.amount),
        months: Number(form.months),
        date: paymentDate,
        note: form.note,
      });

      if (Number(form.months) > 0) {
        await upgradeMember(form.memberId, Number(form.months));
      }

      toast.success('Payment registered successfully');

      // WhatsApp Redirect
      const member = members.find(m => m.id === form.memberId);
      if (member && member.phone) {
        let message = `*Payment Confirmation* ✅\n\nDear ${member.fullName},\nWe have successfully received your payment.\n\n*Details:*\n💰 Amount: ₹${form.amount}\n`;

        if (Number(form.months) > 0) {
          message += `⏳ Membership Extended: ${form.months} month(s)\n`;
        }

        message += `📅 Date: ${format(new Date(paymentDate), 'dd MMM yyyy')}\n`;

        if (form.note) {
          message += `📝 Note: ${form.note}\n`;
        }

        message += `\nThank you for choosing Library Buddy! 📚`;

        const encodedMessage = encodeURIComponent(message);
        const waNumber = `${(member.countryCode || '+91').replace('+', '')}${member.phone}`;
        window.open(`https://wa.me/${waNumber}?text=${encodedMessage}`, '_blank');
      }

      setDialogOpen(false);
      setForm({ memberId: '', amount: '', months: '', note: '' });
    } catch (error) {
      toast.error('Failed to register payment');
    }
  };

  const sortedPayments = [...payments].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  const sortedDeletedPayments = [...deletedPayments].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  const displayedPayments = viewDeleted ? sortedDeletedPayments : sortedPayments;

  const handleDeletePayment = async (id: string) => {
    if (confirm('Are you sure you want to delete this payment?')) {
      await deletePayment(id);
    }
  };

  const handleClearDeleted = async () => {
    try {
      await clearDeletedPayments(clearPassword);
      setClearDialogOpen(false);
      setClearPassword('');
    } catch (error) {
      // Error handled in context
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text(viewDeleted ? 'Deleted Payments History' : 'Payments History', 14, 15);

    const tableData = displayedPayments.map(p => {
      const member = members.find(m => m.id === p.memberId);
      return [
        format(parseISO(p.date), 'MMM d, yyyy'),
        member?.fullName ?? 'Unknown',
        `${p.months} month(s)`,
        `Rs. ${p.amount}`,
        p.note || '—'
      ];
    });

    autoTable(doc, {
      head: [['Date', 'Member Name', 'Duration', 'Amount', 'Note']],
      body: tableData,
      startY: 20,
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [46, 204, 113] }
    });

    doc.save('library_payments.pdf');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">Payments</h1>
          <p className="text-muted-foreground mt-1">Register payments and view history</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setViewDeleted(!viewDeleted)} variant="outline" className="gap-2 shrink-0">
            {viewDeleted ? 'View Active' : 'View Deleted'}
          </Button>
          <Button onClick={exportToPDF} variant="outline" className="gap-2 shrink-0">
            <Download className="w-4 h-4" /> Download PDF
          </Button>
          {!viewDeleted ? (
            <Button onClick={() => setDialogOpen(true)} className="gap-2 shrink-0"><Plus className="w-4 h-4" /> New Payment</Button>
          ) : (
            <Button onClick={() => setClearDialogOpen(true)} variant="destructive" className="gap-2 shrink-0"><Trash2 className="w-4 h-4" /> Clear All</Button>
          )}
        </div>
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
              {!viewDeleted && <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {displayedPayments.map((payment, i) => {
              const member = members.find(m => m.id === payment.memberId);
              return (
                <motion.tr key={payment.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 text-muted-foreground">{format(parseISO(payment.date), 'MMM d, yyyy')}</td>
                  <td className="py-3 px-4 font-medium text-foreground">{member?.fullName ?? 'Unknown'}</td>
                  <td className="py-3 px-4 text-muted-foreground">{payment.months} month{payment.months !== 1 ? 's' : ''}</td>
                  <td className="py-3 px-4 text-foreground font-medium">₹{payment.amount.toLocaleString()}</td>
                  <td className="py-3 px-4 text-muted-foreground">{payment.note || '—'}</td>
                  {!viewDeleted && (
                    <td className="py-3 px-4 text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDeletePayment(payment.id)} className="text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  )}
                </motion.tr>
              );
            })}
          </tbody>
        </table>
        {displayedPayments.length === 0 && <p className="text-center text-muted-foreground py-8">No payments found</p>}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {displayedPayments.map((payment, i) => {
          const member = members.find(m => m.id === payment.memberId);
          return (
            <motion.div key={payment.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="stat-card">
              <div className="flex items-start justify-between mb-2">
                <p className="font-medium text-foreground">{member?.fullName ?? 'Unknown'}</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">₹{payment.amount.toLocaleString()}</span>
                  {!viewDeleted && (
                    <Button variant="ghost" size="icon" onClick={() => handleDeletePayment(payment.id)} className="h-6 w-6 text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(parseISO(payment.date), 'MMM d, yyyy')}</span>
                <span>{payment.months} month{payment.months !== 1 ? 's' : ''}</span>
              </div>
              {payment.note && <p className="text-xs text-muted-foreground mt-1">{payment.note}</p>}
            </motion.div>
          );
        })}
        {displayedPayments.length === 0 && <p className="text-center text-muted-foreground py-8">No payments found</p>}
      </div>

      {/* Register Payment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Register Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label>Member *</Label>
              <Popover open={openMemberSelect} onOpenChange={setOpenMemberSelect}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openMemberSelect}
                    className="justify-between w-full font-normal"
                  >
                    {form.memberId
                      ? members.find((m) => m.id === form.memberId)?.fullName
                      : "Select member..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0 max-h-[300px]" align="start">
                  <Command>
                    <CommandInput placeholder="Search member..." />
                    <CommandList>
                      <CommandEmpty>No member found.</CommandEmpty>
                      <CommandGroup>
                        {members.map((m) => (
                          <CommandItem
                            key={m.id}
                            value={`${m.fullName} ${m.phone}`}
                            onSelect={() => {
                              setForm(f => ({ ...f, memberId: m.id }));
                              setOpenMemberSelect(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4 shrink-0",
                                form.memberId === m.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {m.fullName} {m.phone ? `(${m.phone})` : ''}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Months to Add *</Label>
              <Select value={form.months} onValueChange={v => setForm(f => ({ ...f, months: v }))}>
                <SelectTrigger><SelectValue placeholder="Select months" /></SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 6, 12].map(m => <SelectItem key={m} value={String(m)}>{m} month{m !== 1 ? 's' : ''}</SelectItem>)}
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

      {/* Clear Deleted Dialog */}
      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Clear Deleted Payments</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Are you sure you want to permanently clear all deleted payments? Enter password to confirm.</p>
            <div>
              <Label>Password</Label>
              <Input type="password" value={clearPassword} onChange={e => setClearPassword(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setClearDialogOpen(false); setClearPassword(''); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleClearDeleted}>Clear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payments;
