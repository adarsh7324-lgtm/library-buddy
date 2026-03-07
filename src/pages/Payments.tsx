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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Payments = () => {
  const { members, payments, deletedPayments, addPayment, updatePayment, upgradeMember, deletePayment, clearDeletedPayments } = useLibrary();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [openMemberSelect, setOpenMemberSelect] = useState(false);
  const [form, setForm] = useState<{
    memberId: string; amount: string; months: string; customDays: string; note: string; paymentMode: 'Cash' | 'Online';
    amountType: 'Regular' | 'Due' | 'Advanced';
    typeAmount: string;
    clearOutstanding: boolean;
  }>({
    memberId: '', amount: '', months: '', customDays: '', note: '', paymentMode: 'Cash',
    amountType: 'Regular', typeAmount: '', clearOutstanding: false
  });
  const [viewDeleted, setViewDeleted] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearPassword, setClearPassword] = useState('');

  const handleSave = async () => {
    if (!form.memberId || !form.amount || !form.months) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      if (form.months === 'custom' && !form.customDays) {
        toast.error('Please specify custom days count');
        return;
      }

      const paymentDate = format(new Date(), 'yyyy-MM-dd');
      const paymentData: any = {
        memberId: form.memberId,
        amount: Number(form.amount),
        months: form.months === 'custom' ? 0 : Number(form.months),
        paymentMode: form.paymentMode,
        date: paymentDate,
        note: form.note,
        dueAmount: form.amountType === 'Due' ? Number(form.typeAmount) : 0,
        advancedAmount: form.amountType === 'Advanced' ? Number(form.typeAmount) : 0,
      };

      if (form.clearOutstanding) {
        // Find existing outstanding balances to offset
        const pastPayments = payments.filter(p => p.memberId === form.memberId && ((p.dueAmount || 0) > 0 || (p.advancedAmount || 0) > 0));

        // Zero them out retrospectively in the database
        await Promise.all(pastPayments.map(p =>
          updatePayment(p.id, { dueAmount: 0, advancedAmount: 0 })
        ));
      }

      if (form.months === 'custom') {
        paymentData.customDays = Number(form.customDays);
      }
      await addPayment(paymentData);

      if (form.months === 'custom' && Number(form.customDays) > 0) {
        await upgradeMember(form.memberId, 0, Number(form.customDays));
      } else if (Number(form.months) > 0) {
        await upgradeMember(form.memberId, Number(form.months));
      }

      toast.success('Payment registered successfully');

      // WhatsApp Redirect
      const member = members.find(m => m.id === form.memberId);
      if (member && member.phone) {
        let message = `*Payment Confirmation* ✅\n\nDear ${member.fullName},\nWe have successfully received your payment.\n\n*Details:*\n💰 Amount: ₹${form.amount}\n`;

        if (form.months === 'custom' && Number(form.customDays) > 0) {
          message += `⏳ Membership Extended: ${form.customDays} day(s)\n`;
        } else if (Number(form.months) > 0) {
          message += `⏳ Membership Extended: ${form.months} month(s)\n`;
        }

        if (paymentData.dueAmount > 0) {
          message += `⏳ Due Amount Tracked: ₹${paymentData.dueAmount}\n`;
        }
        if (paymentData.advancedAmount > 0) {
          message += `💰 Advanced Deposit Tracked: ₹${paymentData.advancedAmount}\n`;
        }
        if (form.clearOutstanding) {
          message += `✨ Previous Outstanding Balances Cleared\n`;
        }

        message += `💵 Payment Mode: ${form.paymentMode}\n`;
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
      setForm({ memberId: '', amount: '', months: '', customDays: '', note: '', paymentMode: 'Cash', amountType: 'Regular', typeAmount: '', clearOutstanding: false });
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
        p.customDays ? `${p.customDays} day(s)` : `${p.months} month(s)`,
        p.paymentMode || 'Cash',
        `Rs. ${p.amount}`,
        p.note || '—'
      ];
    });

    autoTable(doc, {
      head: [['Date', 'Member Name', 'Duration', 'Mode', 'Amount', 'Note']],
      body: tableData,
      startY: 20,
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [46, 204, 113] }
    });

    doc.save('library_payments.pdf');
  };

  const calculateDailyCollections = () => {
    const now = new Date();
    // Start of the business day is 2 AM
    const startOfBusinessDay = new Date(now);
    if (now.getHours() < 2) {
      // If it's before 2 AM, the business day started at 2 AM yesterday
      startOfBusinessDay.setDate(startOfBusinessDay.getDate() - 1);
    }
    startOfBusinessDay.setHours(2, 0, 0, 0);

    let cash = 0;
    let online = 0;

    payments.forEach(payment => {
      if (!payment.createdAt) return;
      const paymentTime = new Date(payment.createdAt);
      if (paymentTime >= startOfBusinessDay) {
        if (payment.paymentMode === 'Online') {
          online += payment.amount;
        } else {
          // Default to Cash
          cash += payment.amount;
        }
      }
    });

    return { cash, online, total: cash + online };
  };

  const dailyStats = calculateDailyCollections();

  const calculateOutstanding = (memberId: string) => {
    if (!memberId) return { due: 0, adv: 0 };
    const memberPayments = payments.filter(p => p.memberId === memberId);
    const due = memberPayments.reduce((sum, p) => sum + (p.dueAmount || 0), 0);
    const adv = memberPayments.reduce((sum, p) => sum + (p.advancedAmount || 0), 0);
    return { due, adv };
  };

  const outstanding = calculateOutstanding(form.memberId);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">Payments</h1>
          <p className="text-muted-foreground mt-1">Register payments and view history</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end sm:justify-start">
          <Button size="sm" onClick={() => setViewDeleted(!viewDeleted)} variant="outline" className="gap-1.5 shrink-0 text-xs h-8">
            {viewDeleted ? 'View Active' : 'View Deleted'}
          </Button>
          <Button size="sm" onClick={exportToPDF} variant="outline" className="gap-1.5 shrink-0 text-xs h-8">
            <Download className="w-3.5 h-3.5" /> Download PDF
          </Button>
          {!viewDeleted ? (
            <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5 shrink-0 text-xs h-8"><Plus className="w-3.5 h-3.5" /> New Payment</Button>
          ) : (
            <Button size="sm" onClick={() => setClearDialogOpen(true)} variant="destructive" className="gap-1.5 shrink-0 text-xs h-8"><Trash2 className="w-3.5 h-3.5" /> Clear All</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Cash Collection</CardTitle>
            <div className="text-2xl font-bold text-foreground">₹{dailyStats.cash.toLocaleString()}</div>
          </CardHeader>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Online Collection</CardTitle>
            <div className="text-2xl font-bold text-foreground">₹{dailyStats.online.toLocaleString()}</div>
          </CardHeader>
        </Card>
        <Card className="bg-primary/10 border-primary/30">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-primary">Today's Total Revenue</CardTitle>
            <div className="text-2xl font-bold text-primary">₹{dailyStats.total.toLocaleString()}</div>
          </CardHeader>
        </Card>
      </div>

      {/* Payment History */}
      <div className="hidden md:block stat-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60">
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Member</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Months</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Mode</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Amount</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Note</th>
              {!viewDeleted && <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {displayedPayments.map((payment, i) => {
              const member = members.find(m => m.id === payment.memberId);
              const isDue = (payment.dueAmount || 0) > 0;
              const isAdv = (payment.advancedAmount || 0) > 0;

              let rowClass = "border-b border-border/30 hover:bg-muted/30 transition-colors";
              if (isDue) rowClass += " bg-orange-500/10 hover:bg-orange-500/20";
              else if (isAdv) rowClass += " bg-yellow-500/10 hover:bg-yellow-500/20";

              return (
                <motion.tr key={payment.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className={rowClass}>
                  <td className="py-3 px-4 text-muted-foreground">{format(parseISO(payment.date), 'MMM d, yyyy')}</td>
                  <td className="py-3 px-4 font-medium text-foreground">{member?.fullName ?? 'Unknown'}</td>
                  <td className="py-3 px-4 text-muted-foreground">{payment.customDays ? `${payment.customDays} day(s)` : `${payment.months} month(s)`}</td>
                  <td className="py-3 px-4 text-muted-foreground">
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", payment.paymentMode === 'Online' ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground")}>
                      {payment.paymentMode || 'Cash'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-foreground font-medium">
                    ₹{payment.amount.toLocaleString()}
                    {isDue && <span className="block text-xs text-orange-600 dark:text-orange-400 font-bold">Due: ₹{payment.dueAmount}</span>}
                    {isAdv && <span className="block text-xs text-yellow-600 dark:text-yellow-400 font-bold">Adv: ₹{payment.advancedAmount}</span>}
                  </td>
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
          const isDue = (payment.dueAmount || 0) > 0;
          const isAdv = (payment.advancedAmount || 0) > 0;

          let cardClass = "stat-card";
          if (isDue) cardClass += " border-l-4 border-orange-500 bg-orange-500/5";
          else if (isAdv) cardClass += " border-l-4 border-yellow-500 bg-yellow-500/5";

          return (
            <motion.div key={payment.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={cardClass}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-foreground">{member?.fullName ?? 'Unknown'}</p>
                  {isDue && <span className="text-xs text-orange-600 dark:text-orange-400 font-bold">Due: ₹{payment.dueAmount}</span>}
                  {isAdv && <span className="text-xs text-yellow-600 dark:text-yellow-400 font-bold">Adv: ₹{payment.advancedAmount}</span>}
                </div>
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
                <span>{payment.customDays ? `${payment.customDays} day(s)` : `${payment.months} month(s)`}</span>
                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", payment.paymentMode === 'Online' ? "bg-accent/40 text-foreground" : "bg-muted text-muted-foreground")}>
                  {payment.paymentMode || 'Cash'}
                </span>
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
            {form.memberId && (outstanding.due > 0 || outstanding.adv > 0) && (
              <div className="bg-muted p-3 rounded-md border border-border space-y-2">
                <p className="text-sm font-semibold mb-1">Outstanding Balances</p>
                {outstanding.due > 0 && <p className="text-xs text-orange-600 dark:text-orange-400 font-bold">Total Due: ₹{outstanding.due}</p>}
                {outstanding.adv > 0 && <p className="text-xs text-yellow-600 dark:text-yellow-400 font-bold">Total Advanced: ₹{outstanding.adv}</p>}
                <div className="flex items-center space-x-2 mt-2 pt-2 border-t border-border/50">
                  <input
                    type="checkbox"
                    id="clearBalances"
                    checked={form.clearOutstanding}
                    onChange={(e) => setForm(f => ({ ...f, clearOutstanding: e.target.checked }))}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="clearBalances" className="text-xs font-medium leading-none cursor-pointer">
                    Mark Cleared
                  </label>
                </div>
              </div>
            )}
            <div>
              <Label>Duration to Add *</Label>
              <Select value={form.months} onValueChange={v => setForm(f => ({ ...f, months: v, customDays: '' }))}>
                <SelectTrigger><SelectValue placeholder="Select duration" /></SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 6, 12].map(m => <SelectItem key={m} value={String(m)}>{m} month{m !== 1 ? 's' : ''}</SelectItem>)}
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
              <Label>Amount Paid (₹) *</Label>
              <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g. 500" />
            </div>
            <div>
              <Label>Payment Mode *</Label>
              <Select value={form.paymentMode} onValueChange={(v: 'Cash' | 'Online') => setForm(f => ({ ...f, paymentMode: v }))}>
                <SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Amount Tracking</Label>
                <Select value={form.amountType} onValueChange={(v: 'Regular' | 'Due' | 'Advanced') => setForm(f => ({ ...f, amountType: v, typeAmount: '' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Regular">Regular</SelectItem>
                    <SelectItem value="Due">Has Due Amount</SelectItem>
                    <SelectItem value="Advanced">Advanced Deposit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.amountType !== 'Regular' && (
                <div>
                  <Label>{form.amountType} Amount (₹) *</Label>
                  <Input type="number" min="1" value={form.typeAmount} onChange={e => setForm(f => ({ ...f, typeAmount: e.target.value }))} placeholder={`e.g. 100`} />
                </div>
              )}
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
