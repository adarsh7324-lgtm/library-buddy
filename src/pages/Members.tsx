import { useState } from 'react';
import { useLibrary } from '@/context/LibraryContext';
import { Search, Trash2, ArrowUpCircle, MessageSquare, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format, parseISO, differenceInDays } from 'date-fns';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type FilterType = 'All' | 'Active' | 'Expired' | 'Expiring Soon';

const Members = () => {
  const { members, deleteMember, upgradeMember } = useLibrary();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('All');
  const [upgradingId, setUpgradingId] = useState<string | null>(null);
  const [upgradeMonths, setUpgradeMonths] = useState('');

  const today = new Date();

  const filtered = members.filter(m => {
    const matchSearch = m.fullName.toLowerCase().includes(search.toLowerCase()) || m.phone.includes(search);
    if (!matchSearch) return false;
    if (filter === 'Active') return m.status === 'Active';
    if (filter === 'Expired') return m.status === 'Expired';
    if (filter === 'Expiring Soon') {
      return m.status === 'Expiring Soon';
    }
    return true;
  });

  const handleUpgrade = async () => {
    if (!upgradingId || !upgradeMonths) { toast.error('Select months'); return; }
    try {
      await upgradeMember(upgradingId, Number(upgradeMonths));
      toast.success(`Membership extended by ${upgradeMonths} month(s)`);
      setUpgradingId(null);
      setUpgradeMonths('');
    } catch (error) {
      toast.error('Failed to extend membership');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMember(id);
      toast.success('Member deleted');
    } catch (error) {
      toast.error('Failed to delete member');
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text(`Members List (${filter})`, 14, 15);

    const tableData = filtered.map(m => [
      m.fullName,
      `${m.countryCode} ${m.phone}`,
      m.seatNumber || '-',
      format(parseISO(m.expiryDate), 'MMM d, yyyy'),
      m.status
    ]);

    autoTable(doc, {
      head: [['Name', 'Phone', 'Seat', 'Expiry', 'Status']],
      body: tableData,
      startY: 20,
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [41, 128, 185] }
    });

    doc.save('library_members.pdf');
  };

  const filters: FilterType[] = ['All', 'Active', 'Expired', 'Expiring Soon'];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">Members</h1>
          <p className="text-muted-foreground mt-1">Manage your library members</p>
        </div>
        <Button onClick={exportToPDF} variant="outline" className="gap-2 shrink-0">
          <Download className="w-4 h-4" /> Download PDF
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {filters.map(f => (
            <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)} className="text-xs">
              {f}
            </Button>
          ))}
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block stat-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60">
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Phone</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Seat</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Expiry</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((member, i) => (
              <motion.tr key={member.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                <td className="py-3 px-4 font-medium text-foreground">{member.fullName}</td>
                <td className="py-3 px-4 text-muted-foreground">{member.countryCode} {member.phone}</td>
                <td className="py-3 px-4 text-muted-foreground">{member.seatNumber || '-'}</td>
                <td className="py-3 px-4 text-muted-foreground">{format(parseISO(member.expiryDate), 'MMM d, yyyy')}</td>
                <td className="py-3 px-4">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${member.status === 'Active' ? 'bg-success/10 text-success' :
                    member.status === 'Expiring Soon' ? 'bg-warning/10 text-warning' :
                      'bg-destructive/10 text-destructive'
                    }`}>
                    {member.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setUpgradingId(member.id); setUpgradeMonths(''); }}><ArrowUpCircle className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(member.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    <a
                      href={`https://wa.me/${member.countryCode.replace('+', '')}${member.phone}?text=${encodeURIComponent(`Hello ${member.fullName}, your library membership expires on ${format(parseISO(member.expiryDate), 'MMM d, yyyy')}. Please renew to continue access.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-success hover:text-success"><MessageSquare className="w-3.5 h-3.5" /></Button>
                    </a>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No members found</p>}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filtered.map((member, i) => (
          <motion.div key={member.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="stat-card">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-medium text-foreground">{member.fullName}</p>
                <p className="text-xs text-muted-foreground">{member.countryCode} {member.phone} {member.seatNumber ? `• Seat: ${member.seatNumber}` : ''}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${member.status === 'Active' ? 'bg-success/10 text-success' :
                member.status === 'Expiring Soon' ? 'bg-warning/10 text-warning' :
                  'bg-destructive/10 text-destructive'
                }`}>
                {member.status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Expires {format(parseISO(member.expiryDate), 'MMM d, yyyy')}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-xs" onClick={() => { setUpgradingId(member.id); setUpgradeMonths(''); }}><ArrowUpCircle className="w-3 h-3 mr-1" /> Upgrade</Button>
              <Button size="sm" variant="outline" className="text-xs text-destructive" onClick={() => handleDelete(member.id)}><Trash2 className="w-3 h-3 mr-1" /> Delete</Button>
              <a href={`https://wa.me/${member.countryCode.replace('+', '')}${member.phone}?text=${encodeURIComponent(`Hello ${member.fullName}, your library membership expires on ${format(parseISO(member.expiryDate), 'MMM d, yyyy')}. Please renew to continue access.`)}`} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="text-xs text-success"><MessageSquare className="w-3 h-3 mr-1" /> WhatsApp</Button>
              </a>
            </div>
          </motion.div>
        ))}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No members found</p>}
      </div>

      {/* Upgrade Dialog */}
      <Dialog open={!!upgradingId} onOpenChange={() => setUpgradingId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upgrade Membership</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Extend membership for <strong className="text-foreground">{members.find(m => m.id === upgradingId)?.fullName}</strong>
            </p>
            <div>
              <Label>Add Months</Label>
              <Select value={upgradeMonths} onValueChange={setUpgradeMonths}>
                <SelectTrigger><SelectValue placeholder="Select months" /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 6, 12].map(m => <SelectItem key={m} value={String(m)}>{m} month{m > 1 ? 's' : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpgradingId(null)}>Cancel</Button>
            <Button onClick={handleUpgrade}>Upgrade</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Members;
