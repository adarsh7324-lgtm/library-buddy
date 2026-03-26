import { useState } from 'react';
import { useLibrary, Payment } from '@/context/LibraryContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Plus, IndianRupee, Calendar, Download, Check, ChevronsUpDown, Trash2, Search } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Payments = () => {
  const { members, payments, deletedPayments, addPayment, updatePayment, upgradeMember, deletePayment, clearDeletedPayments, updateMember } = useLibrary();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [openMemberSelect, setOpenMemberSelect] = useState(false);
  const [form, setForm] = useState<{
    memberId: string; amount: string; months: string; customDays: string; note: string; paymentMode: 'Cash' | 'Online';
    amountType: 'Regular' | 'Due' | 'Advanced';
    typeAmount: string;
    clearOutstanding: boolean;
    purpose: string;
    registrationFee: string;
    monthlyFee: string;
    discountAmount: string;
  }>({
    memberId: '', amount: '', months: '', customDays: '', note: '', paymentMode: 'Cash',
    amountType: 'Regular', typeAmount: '', clearOutstanding: false,
    purpose: 'Renewal', registrationFee: '', monthlyFee: '', discountAmount: ''
  });
  const [viewDeleted, setViewDeleted] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearPassword, setClearPassword] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [pdfStartDate, setPdfStartDate] = useState('');
  const [pdfEndDate, setPdfEndDate] = useState('');

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
      
      // Build a clean, readable note
      let noteParts = [`${form.purpose}`];
      if (form.note) noteParts.push(form.note);
      if (form.registrationFee && Number(form.registrationFee) > 0) noteParts.push(`Reg: ₹${form.registrationFee}`);
      if (form.monthlyFee && Number(form.monthlyFee) > 0) noteParts.push(`Monthly: ₹${form.monthlyFee}`);
      if (form.discountAmount && Number(form.discountAmount) > 0) noteParts.push(`Disc: ₹${form.discountAmount}`);
      
      const finalNote = noteParts.join(' | ');

      const paymentData: Omit<Payment, 'id' | 'libraryId'> = {
        memberId: form.memberId,
        amount: Number(form.amount),
        months: form.months === 'custom' ? 0 : Number(form.months),
        paymentMode: form.paymentMode,
        date: paymentDate,
        note: finalNote,
        dueAmount: form.amountType === 'Due' ? Number(form.typeAmount) : 0,
        advancedAmount: form.amountType === 'Advanced' ? Number(form.typeAmount) : 0,
      };

      if (form.clearOutstanding) {
        const pastPayments = payments.filter(p => p.memberId === form.memberId && ((p.dueAmount || 0) > 0 || (p.advancedAmount || 0) > 0));
        await Promise.all(pastPayments.map(p =>
          updatePayment(p.id, { dueAmount: 0, advancedAmount: 0 })
        ));
      }

      if (form.months === 'custom') {
        paymentData.customDays = Number(form.customDays);
      }

      await addPayment(paymentData);

      // Update Member Record with Registration Fee and Discount if applicable
      if (form.purpose === 'New Admission' || Number(form.registrationFee) > 0 || Number(form.discountAmount) > 0) {
        await updateMember(form.memberId, {
          registrationFee: Number(form.registrationFee) || 0,
          discountAmount: Number(form.discountAmount) || 0
        });
      }

      if (form.months === 'custom' && Number(form.customDays) > 0) {
        await upgradeMember(form.memberId, 0, Number(form.customDays));
      } else if (Number(form.months) > 0) {
        await upgradeMember(form.memberId, Number(form.months));
      }

      toast.success('Payment registered successfully');

      // WhatsApp Redirect
      const member = members.find(m => m.id === form.memberId);
      if (member && member.phone) {
        let message = `*Payment Confirmation* ✅\n\nDear ${member.fullName},\nWe have successfully received your payment for *${form.purpose}*.\n\n*Payment Details:*\n💰 Total Amount: ₹${form.amount}\n`;

        if (Number(form.registrationFee) > 0) message += `💳 Registration Fee: ₹${form.registrationFee}\n`;
        if (Number(form.monthlyFee) > 0) message += `📅 Monthly Fee: ₹${form.monthlyFee}\n`;
        if (Number(form.discountAmount) > 0) message += `🏷️ Discount on Monthly Fee: ₹${form.discountAmount}\n`;

        if (form.months === 'custom' && Number(form.customDays) > 0) {
          message += `⏳ Membership Duration: ${form.customDays} day(s)\n`;
        } else if (Number(form.months) > 0) {
          message += `⏳ Membership Duration: ${form.months} month(s)\n`;
        }

        if (paymentData.dueAmount > 0) message += `⏳ Due Amount Tracked: ₹${paymentData.dueAmount}\n`;
        if (paymentData.advancedAmount > 0) message += `💰 Advanced Deposit Tracked: ₹${paymentData.advancedAmount}\n`;
        if (form.clearOutstanding) message += `✨ Previous Outstanding Balances Cleared\n`;

        message += `💵 Payment Mode: ${form.paymentMode}\n`;
        message += `📅 Date: ${format(new Date(paymentDate), 'dd MMM yyyy')}\n`;
        if (form.note) message += `📝 Note: ${form.note}\n`;

        message += `\nThank you for choosing Library Buddy! 📚`;

        const encodedMessage = encodeURIComponent(message);
        const waNumber = `${(member.countryCode || '+91').replace('+', '')}${member.phone}`;
        window.open(`https://wa.me/${waNumber}?text=${encodedMessage}`, '_blank');
      }

      setDialogOpen(false);
      setForm({ memberId: '', amount: '', months: '', customDays: '', note: '', paymentMode: 'Cash', amountType: 'Regular', typeAmount: '', clearOutstanding: false, purpose: 'Renewal', registrationFee: '', monthlyFee: '', discountAmount: '' });
    } catch (error) {
      toast.error('Failed to register payment');
    }
  };

  const sortedPayments = [...payments].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  const sortedDeletedPayments = [...deletedPayments].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  const displayedPayments = (viewDeleted ? sortedDeletedPayments : sortedPayments).filter((payment) => {
    if (!searchTerm) return true;
    const member = members.find(m => m.id === payment.memberId);
    if (!member) return false;
    const searchLower = searchTerm.toLowerCase();
    return member.fullName.toLowerCase().includes(searchLower) || member.phone.includes(searchTerm);
  });

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
    let paymentsToExport = displayedPayments;

    if (pdfStartDate && pdfEndDate) {
      const start = new Date(pdfStartDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(pdfEndDate);
      end.setHours(23, 59, 59, 999);

      paymentsToExport = paymentsToExport.filter(p => {
        const pDate = new Date(p.date);
        return pDate >= start && pDate <= end;
      });
    } else if (pdfStartDate) {
      const start = new Date(pdfStartDate);
      start.setHours(0, 0, 0, 0);
      paymentsToExport = paymentsToExport.filter(p => new Date(p.date) >= start);
    } else if (pdfEndDate) {
      const end = new Date(pdfEndDate);
      end.setHours(23, 59, 59, 999);
      paymentsToExport = paymentsToExport.filter(p => new Date(p.date) <= end);
    }

    if (paymentsToExport.length === 0) {
      toast.error('No payments found in the selected date range.');
      return;
    }

    const doc = new jsPDF();
    let title = viewDeleted ? 'Deleted Payments History' : 'Payments History';
    if (pdfStartDate && pdfEndDate) {
      title += ` (${format(new Date(pdfStartDate), 'MMM d, yyyy')} to ${format(new Date(pdfEndDate), 'MMM d, yyyy')})`;
    } else if (pdfStartDate) {
      title += ` (From ${format(new Date(pdfStartDate), 'MMM d, yyyy')})`;
    } else if (pdfEndDate) {
      title += ` (Until ${format(new Date(pdfEndDate), 'MMM d, yyyy')})`;
    }

    doc.text(title, 14, 15);

    const tableData = paymentsToExport.map(p => {
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
    setPdfDialogOpen(false);
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
          <h1 className="text-2xl md:text-3xl font-bold font-display text-white">Payments</h1>
          <p className="text-white/70 mt-1">Register payments and view history</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end sm:justify-start">
          <Button size="sm" onClick={() => setViewDeleted(!viewDeleted)} variant="outline" className="gap-1.5 shrink-0 text-xs h-8 bg-white/5 border-white/10 text-white hover:bg-white/10 backdrop-blur-sm">
            {viewDeleted ? 'View Active' : 'View Deleted'}
          </Button>
          <Button size="sm" onClick={() => setPdfDialogOpen(true)} variant="outline" className="gap-1.5 shrink-0 text-xs h-8 bg-white/5 border-white/10 text-white hover:bg-white/10 backdrop-blur-sm">
            <Download className="w-3.5 h-3.5" /> Download PDF
          </Button>
          {!viewDeleted ? (
            <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5 shrink-0 text-xs h-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"><Plus className="w-3.5 h-3.5" /> New Payment</Button>
          ) : (
            <Button size="sm" onClick={() => setClearDialogOpen(true)} variant="destructive" className="gap-1.5 shrink-0 text-xs h-8 bg-destructive/80 hover:bg-destructive shadow-lg shadow-destructive/20"><Trash2 className="w-3.5 h-3.5" /> Clear All</Button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
          <Input
            placeholder="Search payments by member name or phone..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10 bg-black/20 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/20 backdrop-blur-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="glass-panel p-5 rounded-2xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] bg-gradient-to-br from-white/5 to-transparent">
            <h3 className="text-sm font-medium text-white/70 mb-1">Today's Cash Collection</h3>
            <div className="text-2xl font-bold text-white">₹{dailyStats.cash.toLocaleString()}</div>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] bg-gradient-to-br from-white/5 to-transparent">
            <h3 className="text-sm font-medium text-white/70 mb-1">Today's Online Collection</h3>
            <div className="text-2xl font-bold text-white">₹{dailyStats.online.toLocaleString()}</div>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-primary/30 shadow-[0_8px_32px_0_rgba(var(--primary),0.15)] bg-primary/10 backdrop-blur-md relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent pointer-events-none" />
            <h3 className="text-sm font-medium text-white/90 relative z-10">Today's Total Revenue</h3>
            <div className="text-2xl font-bold text-white drop-shadow-sm relative z-10">₹{dailyStats.total.toLocaleString()}</div>
        </div>
      </div>

      {/* Payment History */}
      <div className="hidden md:block glass-panel rounded-2xl overflow-hidden shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-black/20">
                <th className="text-left py-4 px-5 font-medium text-white/70">Date</th>
                <th className="text-left py-4 px-5 font-medium text-white/70">Member</th>
                <th className="text-left py-4 px-5 font-medium text-white/70">Months</th>
                <th className="text-left py-4 px-5 font-medium text-white/70">Mode</th>
                <th className="text-left py-4 px-5 font-medium text-white/70">Amount</th>
                <th className="text-left py-4 px-5 font-medium text-white/70">Note</th>
                {!viewDeleted && <th className="text-right py-4 px-5 font-medium text-white/70">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {displayedPayments.map((payment, i) => {
                const member = members.find(m => m.id === payment.memberId);
                const isDue = (payment.dueAmount || 0) > 0;
                const isAdv = (payment.advancedAmount || 0) > 0;

                let rowClass = "border-b border-white/5 hover:bg-white/5 transition-colors";
                if (isDue) rowClass += " bg-orange-500/10 hover:bg-orange-500/20";
                else if (isAdv) rowClass += " bg-yellow-500/10 hover:bg-yellow-500/20";

                return (
                  <motion.tr key={payment.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className={rowClass}>
                    <td className="py-3 px-5 text-white/70">{format(parseISO(payment.date), 'MMM d, yyyy')}</td>
                    <td className="py-3 px-5 font-medium text-white">{member?.fullName ?? 'Unknown'}</td>
                    <td className="py-3 px-5 text-white/70">{payment.customDays ? `${payment.customDays} day(s)` : `${payment.months} month(s)`}</td>
                    <td className="py-3 px-5 text-white/70">
                      <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium border", payment.paymentMode === 'Online' ? "bg-primary/80 text-primary-foreground border-primary/80" : "bg-white/80 text-black border-white/80")}>
                        {payment.paymentMode || 'Cash'}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-white font-medium">
                      ₹{payment.amount.toLocaleString()}
                      {isDue && <span className="block text-xs text-orange-400 font-bold drop-shadow-sm mt-0.5">Due: ₹{payment.dueAmount}</span>}
                      {isAdv && <span className="block text-xs text-yellow-400 font-bold drop-shadow-sm mt-0.5">Adv: ₹{payment.advancedAmount}</span>}
                    </td>
                    <td className="py-3 px-5 text-white/60">{payment.note || '—'}</td>
                    {!viewDeleted && (
                      <td className="py-3 px-5 text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDeletePayment(payment.id)} className="text-destructive hover:bg-destructive/20 hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    )}
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {displayedPayments.length === 0 && <p className="text-center text-white/50 py-8">No payments found</p>}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {displayedPayments.map((payment, i) => {
          const member = members.find(m => m.id === payment.memberId);
          const isDue = (payment.dueAmount || 0) > 0;
          const isAdv = (payment.advancedAmount || 0) > 0;

          let cardClass = "stat-card backdrop-blur-md bg-black/40 border-white/10";
          if (isDue) cardClass += " border-l-4 border-l-orange-500 bg-orange-500/10";
          else if (isAdv) cardClass += " border-l-4 border-l-yellow-500 bg-yellow-500/10";

          return (
            <motion.div key={payment.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={cardClass}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium text-white">{member?.fullName ?? 'Unknown'}</p>
                  {isDue && <span className="text-xs text-orange-400 font-bold drop-shadow-sm block mt-0.5">Due: ₹{payment.dueAmount}</span>}
                  {isAdv && <span className="text-xs text-yellow-400 font-bold drop-shadow-sm block mt-0.5">Adv: ₹{payment.advancedAmount}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">₹{payment.amount.toLocaleString()}</span>
                  {!viewDeleted && (
                    <Button variant="ghost" size="icon" onClick={() => handleDeletePayment(payment.id)} className="h-7 w-7 text-destructive hover:bg-destructive/20 hover:text-destructive bg-white/5">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-white/60">
                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{format(parseISO(payment.date), 'MMM d, yyyy')}</span>
                <span>{payment.customDays ? `${payment.customDays} day(s)` : `${payment.months} month(s)`}</span>
                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium border", payment.paymentMode === 'Online' ? "bg-primary/80 text-primary-foreground border-primary/80" : "bg-white/80 text-black border-white/80")}>
                  {payment.paymentMode || 'Cash'}
                </span>
              </div>
              {payment.note && <p className="text-xs text-white/50 mt-2 bg-black/20 p-2 rounded-md border border-white/5">{payment.note}</p>}
            </motion.div>
          );
        })}
        {displayedPayments.length === 0 && <p className="text-center text-white/50 py-8 glass-panel rounded-2xl">No payments found</p>}
      </div>

      {/* Register Payment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-black/80 backdrop-blur-2xl border-white/10 shadow-[0_16px_64px_0_rgba(0,0,0,0.5)] text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-xl font-display text-white">Register Payment</DialogTitle></DialogHeader>
          <div className="space-y-6 pt-2">
            <div>
              <Label className="text-white/90 mb-1.5 block">Purpose of Payment *</Label>
              <Select value={form.purpose} onValueChange={v => setForm(f => ({ ...f, purpose: v }))}>
                <SelectTrigger className="bg-black/20 border-white/10 text-white focus:ring-white/20"><SelectValue placeholder="Select purpose" /></SelectTrigger>
                <SelectContent className="bg-black/80 backdrop-blur-xl border-white/10 text-white">
                  <SelectItem value="New Admission" className="focus:bg-white/10 focus:text-white cursor-pointer">New Admission</SelectItem>
                  <SelectItem value="Renewal" className="focus:bg-white/10 focus:text-white cursor-pointer">Renewal / Extension</SelectItem>
                  <SelectItem value="Late Fee" className="focus:bg-white/10 focus:text-white cursor-pointer">Late Fee</SelectItem>
                  <SelectItem value="Locker Fee" className="focus:bg-white/10 focus:text-white cursor-pointer">Locker Fee</SelectItem>
                  <SelectItem value="Other" className="focus:bg-white/10 focus:text-white cursor-pointer">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-white/90">Select Student *</Label>
              <Popover open={openMemberSelect} onOpenChange={setOpenMemberSelect}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openMemberSelect}
                    className="justify-between w-full font-normal bg-black/20 border-white/10 text-white hover:bg-white/10 hover:text-white h-10"
                  >
                    {form.memberId
                      ? members.find((m) => m.id === form.memberId)?.fullName
                      : "Search student..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0 max-h-[300px] bg-black/80 backdrop-blur-xl border-white/10 rounded-xl overflow-hidden shadow-2xl" align="start">
                  <Command className="bg-transparent text-white">
                    <CommandInput placeholder="Search member..." className="text-white placeholder:text-white/40 border-none focus:ring-0" />
                    <CommandList className="custom-scrollbar">
                      <CommandEmpty className="text-white/50 p-4 text-center text-sm">No member found.</CommandEmpty>
                      <CommandGroup>
                        {members.map((m) => (
                          <CommandItem
                            key={m.id}
                            value={`${m.fullName} ${m.phone}`}
                            onSelect={() => {
                              setForm(f => ({ ...f, memberId: m.id }));
                              setOpenMemberSelect(false);
                            }}
                            className="text-white hover:bg-white/10 aria-selected:bg-white/10 aria-selected:text-white cursor-pointer py-2"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4 shrink-0 text-primary",
                                form.memberId === m.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{m.fullName}</span>
                              <span className="text-[10px] text-white/50">{m.phone}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label className="text-white/90 mb-1.5 block">Duration *</Label>
              <Select value={form.months} onValueChange={v => setForm(f => ({ ...f, months: v, customDays: '' }))}>
                <SelectTrigger className="bg-black/20 border-white/10 text-white focus:ring-white/20"><SelectValue placeholder="Select months" /></SelectTrigger>
                <SelectContent className="bg-black/80 backdrop-blur-xl border-white/10 text-white">
                  {[0, 1, 2, 3, 6, 12].map(m => <SelectItem key={m} value={String(m)} className="focus:bg-white/10 focus:text-white cursor-pointer">{m} month{m !== 1 ? 's' : ''}</SelectItem>)}
                  <SelectItem value="custom" className="focus:bg-white/10 focus:text-white cursor-pointer xl:border-t xl:border-white/10 xl:mt-1 xl:pt-1">Custom (Days)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.months === 'custom' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <Label className="text-white/90 mb-1.5 block">Number of Days *</Label>
                <Input type="number" min="1" value={form.customDays} onChange={e => setForm(f => ({ ...f, customDays: e.target.value }))} placeholder="e.g. 15" className="bg-black/20 border-white/10 text-white placeholder:text-white/30" />
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label className="text-white/90 mb-1.5 block">Registration Fee (₹)</Label>
                <Input type="number" value={form.registrationFee} onChange={e => setForm(f => ({ ...f, registrationFee: e.target.value }))} placeholder="0" className="bg-black/20 border-white/10 text-white placeholder:text-white/30" />
              </div>
              <div>
                <Label className="text-white/90 mb-1.5 block">Monthly Fee (₹)</Label>
                <Input type="number" value={form.monthlyFee} onChange={e => setForm(f => ({ ...f, monthlyFee: e.target.value }))} placeholder="0" className="bg-black/20 border-white/10 text-white placeholder:text-white/30" />
              </div>
              <div>
                <Label className="text-white/90 mb-1.5 block">Discount on Monthly Fee (₹)</Label>
                <Input type="number" value={form.discountAmount} onChange={e => setForm(f => ({ ...f, discountAmount: e.target.value }))} placeholder="0" className="bg-black/20 border-white/10 text-white placeholder:text-white/30" />
              </div>
            </div>

            {/* Auto-calculated display */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex justify-between items-center shadow-inner">
               <div className="text-xs uppercase tracking-wider text-white/50 font-bold">Registration Net Fee</div>
               <div className="text-xl font-bold text-primary italic drop-shadow-sm">
                 ₹{(Number(form.registrationFee || 0) + Number(form.monthlyFee || 0) - Number(form.discountAmount || 0)).toLocaleString()}
               </div>
            </div>

            {form.memberId && (outstanding.due > 0 || outstanding.adv > 0) && (
              <div className="bg-orange-500/5 p-4 rounded-xl border border-orange-500/20 space-y-2 shadow-inner">
                <p className="text-sm font-semibold mb-2 text-white/90 flex items-center gap-2"><IndianRupee className="w-3.5 h-3.5 text-orange-400" /> Outstanding Balances</p>
                <div className="flex flex-wrap gap-2">
                  {outstanding.due > 0 && <p className="text-xs text-orange-400 font-bold bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20">Total Due: ₹{outstanding.due}</p>}
                  {outstanding.adv > 0 && <p className="text-xs text-yellow-400 font-bold bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/20">Total Advanced: ₹{outstanding.adv}</p>}
                </div>
                <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-white/10">
                  <input
                    type="checkbox"
                    id="clearBalances"
                    checked={form.clearOutstanding}
                    onChange={(e) => setForm(f => ({ ...f, clearOutstanding: e.target.checked }))}
                    className="rounded border-white/20 bg-black/40 text-primary focus:ring-primary h-4 w-4"
                  />
                  <label htmlFor="clearBalances" className="text-sm font-medium leading-none cursor-pointer text-white/70 select-none">
                    Mark existing balances as cleared
                  </label>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white/90 mb-1.5 block">Payment Type</Label>
                <Select value={form.amountType} onValueChange={(v: 'Regular' | 'Due' | 'Advanced') => setForm(f => ({ ...f, amountType: v, typeAmount: '' }))}>
                  <SelectTrigger className="bg-black/20 border-white/10 text-white focus:ring-white/20"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-black/80 backdrop-blur-xl border-white/10 text-white">
                    <SelectItem value="Regular" className="focus:bg-white/10 focus:text-white cursor-pointer">Regular</SelectItem>
                    <SelectItem value="Due" className="focus:bg-white/10 focus:text-white cursor-pointer font-bold text-orange-400">Due Amount</SelectItem>
                    <SelectItem value="Advanced" className="focus:bg-white/10 focus:text-white cursor-pointer font-bold text-yellow-400">Advanced / Deposit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/90 mb-1.5 block">Total Payment Amount (₹) *</Label>
                <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="E.g. 500" className="bg-black/20 border-white/10 text-white placeholder:text-white/30 font-bold text-lg" />
              </div>
            </div>

            {form.amountType !== 'Regular' && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <Label className="text-white/90 mb-1.5 block">{form.amountType} Amount (₹) *</Label>
                <Input type="number" min="1" value={form.typeAmount} onChange={e => setForm(f => ({ ...f, typeAmount: e.target.value }))} placeholder={`Amount to track`} className="bg-black/20 border-white/10 text-white placeholder:text-white/30" />
              </motion.div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white/90 mb-1.5 block">Payment Mode *</Label>
                <Select value={form.paymentMode} onValueChange={(v: 'Cash' | 'Online') => setForm(f => ({ ...f, paymentMode: v }))}>
                  <SelectTrigger className="bg-black/20 border-white/10 text-white focus:ring-white/20"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-black/80 backdrop-blur-xl border-white/10 text-white">
                    <SelectItem value="Cash" className="focus:bg-white/10 focus:text-white cursor-pointer">Cash</SelectItem>
                    <SelectItem value="Online" className="focus:bg-white/10 focus:text-white cursor-pointer">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/90">Note (optional)</Label>
                <Input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Any extra remarks" className="bg-black/20 border-white/10 text-white placeholder:text-white/30" />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-8 gap-3 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="bg-white/5 border-white/10 text-white hover:bg-white/10 h-10 px-6">Cancel</Button>
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 h-10 px-8 font-bold">Confirm & Register</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Deleted Dialog */}
      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent className="bg-black/60 backdrop-blur-2xl border-white/10 shadow-[0_16px_64px_0_rgba(0,0,0,0.5)] text-white">
          <DialogHeader><DialogTitle className="text-xl font-display text-white">Clear Deleted Payments</DialogTitle></DialogHeader>
          <div className="space-y-4 my-2">
            <p className="text-sm text-white/70">Are you sure you want to permanently clear all deleted payments? Enter password to confirm.</p>
            <div>
              <Label className="text-white/90 mb-1.5 block">Password</Label>
              <Input type="password" value={clearPassword} onChange={e => setClearPassword(e.target.value)} className="bg-black/20 border-white/10 text-white focus:ring-white/20" />
            </div>
          </div>
          <DialogFooter className="gap-3 sm:gap-0 mt-2">
            <Button variant="outline" onClick={() => { setClearDialogOpen(false); setClearPassword(''); }} className="bg-white/5 border-white/10 text-white hover:bg-white/10">Cancel</Button>
            <Button variant="destructive" onClick={handleClearDeleted} className="bg-destructive/80 hover:bg-destructive shadow-lg shadow-destructive/20">Clear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Export Dialog */}
      <Dialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen}>
        <DialogContent className="bg-black/60 backdrop-blur-2xl border-white/10 shadow-[0_16px_64px_0_rgba(0,0,0,0.5)] text-white">
          <DialogHeader><DialogTitle className="text-xl font-display text-white">Download Payments PDF</DialogTitle></DialogHeader>
          <div className="space-y-4 my-2">
            <p className="text-sm text-white/70">Select a date range to filter the exported payments. Leave blank to export all displayed payments.</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white/90 mb-1.5 block">Start Date</Label>
                <Input type="date" value={pdfStartDate} onChange={e => setPdfStartDate(e.target.value)} className="bg-black/20 border-white/10 text-white focus:ring-white/20 [color-scheme:dark]" />
              </div>
              <div>
                <Label className="text-white/90 mb-1.5 block">End Date</Label>
                <Input type="date" value={pdfEndDate} onChange={e => setPdfEndDate(e.target.value)} className="bg-black/20 border-white/10 text-white focus:ring-white/20 [color-scheme:dark]" />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-3 sm:gap-0 mt-2">
            <Button variant="outline" onClick={() => setPdfDialogOpen(false)} className="bg-white/5 border-white/10 text-white hover:bg-white/10">Cancel</Button>
            <Button onClick={exportToPDF} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"><Download className="w-4 h-4" /> Export</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payments;
