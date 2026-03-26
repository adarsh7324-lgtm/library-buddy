import { useState } from 'react';
import { useLibrary, Expense } from '@/context/LibraryContext';
import { Search, Trash2, Plus, Calendar, IndianRupee, Zap, User, Wifi, Landmark, Home, Monitor, Package, History, ArrowRight, Printer } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { escapeHtml } from '@/lib/utils';

const categories = [
  { name: 'Electricity', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  { name: "Owner's", icon: User, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  { name: 'Wifi', icon: Wifi, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  { name: 'EMI', icon: Landmark, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  { name: 'Rent', icon: Home, color: 'text-orange-400', bg: 'bg-orange-400/10' },
  { name: 'Salary', icon: IndianRupee, color: 'text-pink-400', bg: 'bg-pink-400/10' },
  { name: 'Software', icon: Monitor, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
  { name: 'Miscellaneous', icon: Package, color: 'text-zinc-400', bg: 'bg-zinc-400/10' },
];

const Expenses = () => {
  const { expenses, addExpense, deleteExpense, staff, addStaffSalaryPayment } = useLibrary();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isAddMode, setIsAddMode] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  
  const [newEntry, setNewEntry] = useState<Omit<Expense, 'id' | 'libraryId' | 'category'>>({
    amount: 0,
    date: format(new Date(), 'yyyy-MM-dd'),
    note: ''
  });

  const [selectedStaffId, setSelectedStaffId] = useState<string>('');

  const handleAddExpense = async () => {
    if (!newEntry.amount || !newEntry.date || !selectedCategory) {
      toast.error('Please enter amount and date');
      return;
    }

    if (selectedCategory === 'Salary' && !selectedStaffId) {
      toast.error('Please select a staff member');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedStaff = selectedCategory === 'Salary' ? staff.find(s => s.id === selectedStaffId) : null;
      const finalNote = selectedCategory === 'Salary' && selectedStaff 
        ? `Salary: ${selectedStaff.fullName}${newEntry.note ? ` - ${newEntry.note}` : ''}`
        : newEntry.note;

      await addExpense({
        ...newEntry,
        category: selectedCategory,
        note: finalNote
      });

      if (selectedCategory === 'Salary' && selectedStaffId) {
        await addStaffSalaryPayment({
          staffId: selectedStaffId,
          amount: newEntry.amount,
          date: newEntry.date,
          status: 'Paid',
          note: `Expense Entry${newEntry.note ? `: ${newEntry.note}` : ''}`,
          paymentMode: 'Cash'
        });
      }

      setIsAddMode(false);
      setNewEntry({
        amount: 0,
        date: format(new Date(), 'yyyy-MM-dd'),
        note: ''
      });
      setSelectedStaffId('');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to add expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateReport = () => {
    const sortedExpenses = [...expenses].sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
    const totalAmount = sortedExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    const reportWindow = window.open('', '_blank');
    if (!reportWindow) return;

    const html = `
      <html>
        <head>
          <title>Expense Report - ${format(new Date(), 'MMM d, yyyy')}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #1a1a1a; }
            h1 { font-size: 24px; margin-bottom: 8px; }
            p.meta { color: #666; font-size: 14px; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; background: #f4f4f4; padding: 12px; border: 1px solid #ddd; font-size: 13px; }
            td { padding: 12px; border: 1px solid #ddd; font-size: 13px; }
            tr:nth-child(even) { background: #fafafa; }
            .total-row { font-weight: bold; background: #eee !important; }
            .footer { margin-top: 40px; font-size: 12px; color: #888; text-align: center; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>Library Expense Report</h1>
          <p class="meta">Generated on ${format(new Date(), 'MMMM d, yyyy')}</p>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Category</th>
                <th>Amount (₹)</th>
                <th>Date</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${sortedExpenses.map((e, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${escapeHtml(e.category)}</td>
                  <td>${Number(e.amount).toLocaleString()}</td>
                  <td>${format(parseISO(e.date), 'MMM d, yyyy')}</td>
                  <td>${escapeHtml(e.note || '-')}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="2">GRAND TOTAL</td>
                <td colspan="3">₹${totalAmount.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
          <div class="footer">
            Library Buddy - Efficient Library Management
          </div>
          <script>
            window.onload = () => { window.print(); };
          </script>
        </body>
      </html>
    `;

    reportWindow.document.write(html);
    reportWindow.document.close();
  };

  const getCategoryStats = (categoryName: string) => {
    const categoryExpenses = expenses.filter(e => e.category === categoryName);
    const total = categoryExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const lastEntry = categoryExpenses.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())[0];
    return { total, lastDate: lastEntry?.date };
  };

  const filteredHistory = expenses
    .filter(e => e.category === selectedCategory)
    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

  const selectedCatInfo = categories.find(c => c.name === selectedCategory);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const thisMonthStr = format(new Date(), 'yyyy-MM');

  const totalToday = expenses
    .filter(e => e.date === todayStr)
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const totalThisMonth = expenses
    .filter(e => e.date.startsWith(thisMonthStr))
    .reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display text-white">Library Expenses</h1>
          <p className="text-white/60 mt-1">Track and manage your facility overheads</p>
        </div>
        <Button 
          onClick={generateReport}
          className="gap-2 shrink-0 bg-white/5 hover:bg-white/10 text-white border border-white/10 backdrop-blur-sm"
        >
          <Printer className="w-4 h-4 text-primary" /> Print Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-panel p-6 rounded-2xl border border-white/5 flex items-center gap-4"
        >
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <IndianRupee className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-white/50">Total Expenses Today</p>
            <p className="text-2xl font-bold text-white font-display">₹{totalToday.toLocaleString()}</p>
          </div>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-panel p-6 rounded-2xl border border-white/5 flex items-center gap-4"
        >
          <div className="p-3 rounded-xl bg-emerald-400/10 text-emerald-400">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-white/50">Total Expenses This Month</p>
            <p className="text-2xl font-bold text-white font-display">₹{totalThisMonth.toLocaleString()}</p>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {categories.map((cat, i) => {
          const stats = getCategoryStats(cat.name);
          return (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelectedCategory(cat.name)}
              className="glass-panel p-6 rounded-2xl border border-white/5 hover:border-primary/30 transition-all cursor-pointer group flex flex-col justify-between min-h-[160px]"
            >
              <div className="flex justify-between items-start">
                <div className={`p-2.5 rounded-xl ${cat.bg} ${cat.color} group-hover:scale-110 transition-transform`}>
                  <cat.icon className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-primary transition-colors" />
              </div>
              
              <div className="mt-4">
                <p className="text-sm font-medium text-white/50">{cat.name}</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl font-bold text-white font-display">₹{stats.total.toLocaleString()}</span>
                </div>
                <p className="text-[10px] uppercase tracking-wider text-white/30 mt-2 font-bold">
                  {stats.lastDate ? `Last: ${format(parseISO(stats.lastDate), 'MMM d, yyyy')}` : 'No entries yet'}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Category Details Dialog */}
      <Dialog open={!!selectedCategory} onOpenChange={(open) => { if(!open) { setSelectedCategory(null); setIsAddMode(false); } }}>
        <DialogContent className="max-w-xl bg-zinc-950/90 backdrop-blur-2xl border-white/10 text-white p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b border-white/5">
            <div className="flex items-center gap-4">
               {selectedCatInfo && (
                 <div className={`p-3 rounded-2xl ${selectedCatInfo.bg} ${selectedCatInfo.color}`}>
                    <selectedCatInfo.icon className="w-6 h-6" />
                 </div>
               )}
               <div>
                  <DialogTitle className="text-2xl font-bold font-display">{selectedCategory}</DialogTitle>
                  <p className="text-sm text-white/40">Expense History & Recording</p>
               </div>
            </div>
          </DialogHeader>

          <div className="p-6">
            <AnimatePresence mode="wait">
              {isAddMode ? (
                <motion.div
                  key="add-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <Label className="text-white/60">Amount (₹)</Label>
                       <Input 
                        type="number" 
                        placeholder="0.00" 
                        className="bg-white/5 border-white/10 h-11 text-lg font-bold"
                        value={newEntry.amount || ''} 
                        onChange={e => setNewEntry({...newEntry, amount: Number(e.target.value)})}
                       />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-white/60">Date</Label>
                       <Input 
                        type="date" 
                        className="bg-white/5 border-white/10 h-11 [color-scheme:dark]"
                        value={newEntry.date} 
                        onChange={e => setNewEntry({...newEntry, date: e.target.value})}
                       />
                    </div>
                  </div>

                  {selectedCategory === 'Salary' && (
                    <div className="space-y-2">
                      <Label className="text-white/60">Select Staff Member</Label>
                      <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                        <SelectTrigger className="bg-white/5 border-white/10 h-11">
                          <SelectValue placeholder="Select staff..." />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10 text-white">
                          {staff.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.fullName} ({s.role})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-white/60">Note (Optional)</Label>
                    <Input 
                      placeholder={selectedCategory === 'Salary' ? "e.g. March Bonus" : "Electric bill for March..."}
                      className="bg-white/5 border-white/10"
                      value={newEntry.note} 
                      onChange={e => setNewEntry({...newEntry, note: e.target.value})}
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                     <Button variant="ghost" className="flex-1 hover:bg-white/5" disabled={isSubmitting} onClick={() => setIsAddMode(false)}>Back to History</Button>
                     <Button className="flex-2 bg-primary hover:bg-primary/90 text-white px-8" disabled={isSubmitting} onClick={handleAddExpense}>
                       {isSubmitting ? 'Saving...' : 'Save Entry'}
                     </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="history-list"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold flex items-center gap-2 text-white/70">
                      <History className="w-4 h-4" /> Recent Entries
                    </h3>
                    <Button size="sm" className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20" onClick={() => setIsAddMode(true)}>
                      <Plus className="w-4 h-4 mr-1" /> New Entry
                    </Button>
                  </div>

                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                    {filteredHistory.map((item, idx) => (
                      <div key={item.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/30 text-xs font-mono">
                              {filteredHistory.length - idx}
                           </div>
                           <div>
                             <p className="font-bold text-lg">₹{Number(item.amount).toLocaleString()}</p>
                             <div className="flex items-center gap-2 text-[10px] text-white/40 uppercase font-bold tracking-wider">
                                <Calendar className="w-3 h-3" />
                                {format(parseISO(item.date), 'MMMM d, yyyy')}
                                {item.note && <span className="text-white/20 ml-1">• {item.note}</span>}
                             </div>
                           </div>
                        </div>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all"
                          onClick={() => setExpenseToDelete(item.id)}
                        >
                           <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    {filteredHistory.length === 0 && (
                      <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-2xl">
                         <p className="text-white/20 italic">No history found for this category</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!expenseToDelete}
        onOpenChange={(open) => !open && setExpenseToDelete(null)}
        title="Delete Expense Entry?"
        description="Are you sure you want to delete this expense record? This action cannot be undone."
        onConfirm={() => {
          if (expenseToDelete) {
            deleteExpense(expenseToDelete);
            setExpenseToDelete(null);
          }
        }}
        destructive
      />
    </div>
  );
};

export default Expenses;
