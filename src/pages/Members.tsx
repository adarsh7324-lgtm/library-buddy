import { useState } from 'react';
import { useLibrary } from '@/context/LibraryContext';
import { Search, Trash2, MessageSquare, Download, User, CreditCard } from 'lucide-react';
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
  const { members, deleteMember } = useLibrary();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('All');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

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
      m.shift || '-',
      m.startTime ? `${m.startTime} - ${m.endTime}` : '-',
      m.startDate ? format(parseISO(m.startDate), 'MMM d, yyyy') : '-',
      format(parseISO(m.expiryDate), 'MMM d, yyyy'),
      m.status
    ]);

    autoTable(doc, {
      head: [['Name', 'Phone', 'Seat', 'Shift', 'Time', 'Join Date', 'Expiry', 'Status']],
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
          <h1 className="text-2xl md:text-3xl font-bold font-display text-white">Members</h1>
          <p className="text-white/70 mt-1">Manage your library members</p>
        </div>
        <Button onClick={exportToPDF} variant="outline" className="gap-2 shrink-0">
          <Download className="w-4 h-4" /> Download PDF
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
          <Input placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-black/20 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/20 backdrop-blur-sm" />
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
      <div className="hidden md:block glass-panel rounded-2xl overflow-hidden shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-black/20">
                <th className="text-left py-4 px-5 font-medium text-white/70">Name</th>
                <th className="text-left py-4 px-5 font-medium text-white/70">Phone</th>
                <th className="text-left py-4 px-5 font-medium text-white/70">Seat</th>
                <th className="text-left py-4 px-5 font-medium text-white/70">Shift</th>
                <th className="text-left py-4 px-5 font-medium text-white/70">Time</th>
                <th className="text-left py-4 px-5 font-medium text-white/70">Join Date</th>
                <th className="text-left py-4 px-5 font-medium text-white/70">Expiry</th>
                <th className="text-left py-4 px-5 font-medium text-white/70">Status</th>
                <th className="text-right py-4 px-5 font-medium text-white/70">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((member, i) => (
                <motion.tr key={member.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-5 font-medium text-white">{member.fullName}</td>
                  <td className="py-3 px-5 text-white/70">{member.countryCode} {member.phone}</td>
                  <td className="py-3 px-5 text-white/70">{member.seatNumber || '-'}</td>
                  <td className="py-3 px-5 text-white/70">{member.shift || '-'}</td>
                  <td className="py-3 px-5 text-white/70">{member.startTime ? `${member.startTime} - ${member.endTime}` : '-'}</td>
                  <td className="py-3 px-5 text-white/70">{member.startDate ? format(parseISO(member.startDate), 'MMM d, yyyy') : '-'}</td>
                  <td className="py-3 px-5 text-white/70">{format(parseISO(member.expiryDate), 'MMM d, yyyy')}</td>
                  <td className="py-3 px-5">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${member.status === 'Active' ? 'bg-success/80 text-success-foreground border-success/80' :
                      member.status === 'Expiring Soon' ? 'bg-warning/80 text-warning-foreground border-warning/80' :
                        'bg-destructive/80 text-destructive-foreground border-destructive/80'
                      }`}>
                      {member.status}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white hover:text-black" onClick={() => setSelectedMemberId(member.id)}><User className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/20 hover:text-destructive" onClick={() => handleDelete(member.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      <a
                        href={`https://wa.me/${member.countryCode.replace('+', '')}${member.phone}?text=${encodeURIComponent(`Hello ${member.fullName}, your library membership expires on ${format(parseISO(member.expiryDate), 'MMM d, yyyy')}. Please renew to continue access.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-success hover:bg-success/20 hover:text-success"><MessageSquare className="w-3.5 h-3.5" /></Button>
                      </a>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="text-center text-white/50 py-8">No members found</p>}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filtered.map((member, i) => (
          <motion.div key={member.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="stat-card">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-medium text-white">{member.fullName}</p>
                <p className="text-xs text-white/60">{member.countryCode} {member.phone} {member.seatNumber ? `• Seat: ${member.seatNumber}` : ''} {member.shift ? `• Shift: ${member.shift}` : ''} {member.startTime ? `• Time: ${member.startTime} - ${member.endTime}` : ''}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${member.status === 'Active' ? 'bg-success/80 text-success-foreground border-success/80' :
                member.status === 'Expiring Soon' ? 'bg-warning/80 text-warning-foreground border-warning/80' :
                  'bg-destructive/80 text-destructive-foreground border-destructive/80'
                }`}>
                {member.status}
              </span>
            </div>
            <p className="text-xs text-white/50 mb-3">Joined {member.startDate ? format(parseISO(member.startDate), 'MMM d, yyyy') : '-'} • Expires {format(parseISO(member.expiryDate), 'MMM d, yyyy')}</p>
            <div className="flex gap-2">
              <Button size="sm" className="text-xs bg-white/40 text-white hover:bg-white/50 border-0" onClick={() => setSelectedMemberId(member.id)}><User className="w-3 h-3 mr-1" /> ID Card</Button>
              <Button size="sm" variant="outline" className="text-xs text-destructive bg-destructive/10 border-destructive/20 hover:bg-destructive/20 hover:text-destructive" onClick={() => handleDelete(member.id)}><Trash2 className="w-3 h-3 mr-1" /> Delete</Button>
              <a href={`https://wa.me/${member.countryCode.replace('+', '')}${member.phone}?text=${encodeURIComponent(`Hello ${member.fullName}, your library membership expires on ${format(parseISO(member.expiryDate), 'MMM d, yyyy')}. Please renew to continue access.`)}`} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="text-xs text-success bg-success/10 border-success/20 hover:bg-success/20 hover:text-success"><MessageSquare className="w-3 h-3 mr-1" /> WhatsApp</Button>
              </a>
            </div>
          </motion.div>
        ))}
        {filtered.length === 0 && <p className="text-center text-white/50 py-8">No members found</p>}
      </div>

      {/* ID Card Dialog */}
      <Dialog open={!!selectedMemberId} onOpenChange={() => setSelectedMemberId(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-transparent border-none shadow-none">
          {(() => {
            const member = members.find(m => m.id === selectedMemberId);
            if (!member) return null;

            return (
              <div className="bg-black/60 backdrop-blur-2xl w-full rounded-2xl overflow-hidden shadow-[0_16px_64px_0_rgba(0,0,0,0.5)] flex flex-col md:flex-row relative border border-white/10">
                <div className="w-full md:w-1/3 bg-black/20 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/10">
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] mb-4 bg-black/40 flex items-center justify-center">
                    {member.photoUrl ? (
                      <img src={member.photoUrl} alt={member.fullName} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-16 h-16 text-white/30" />
                    )}
                  </div>
                  <h3 className="font-bold text-lg text-white text-center leading-tight mb-1">{member.fullName}</h3>
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${member.status === 'Active' ? 'bg-success/80 text-success-foreground' : member.status === 'Expiring Soon' ? 'bg-warning/80 text-warning-foreground' : 'bg-destructive/80 text-destructive-foreground'}`}>
                    {member.status}
                  </span>
                </div>

                <div className="w-full md:w-2/3 p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-display font-bold text-primary">LIBRARY BUDDY</h2>
                      <p className="text-xs text-white/50 tracking-widest uppercase font-semibold">Member Identity Card</p>
                    </div>
                    <CreditCard className="w-8 h-8 text-primary/30" />
                  </div>

                  <div className="pt-2 border-t border-white/10 space-y-3">
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                      <div className="col-span-1">
                        <p className="text-[10px] text-white/50 uppercase font-semibold mb-0.5">Phone</p>
                        <p className="font-medium text-sm text-white/90">{member.countryCode} {member.phone}</p>
                      </div>
                      <div className="col-span-1">
                        <p className="text-[10px] text-white/50 uppercase font-semibold mb-0.5">Seat Number</p>
                        <p className="font-medium text-sm text-white/90">{member.seatNumber || 'N/A'}</p>
                      </div>
                      <div className="col-span-1">
                        <p className="text-[10px] text-white/50 uppercase font-semibold mb-0.5">Shift</p>
                        <p className="font-medium text-sm text-white/90">{member.shift || 'N/A'}</p>
                      </div>
                      <div className="col-span-1">
                        <p className="text-[10px] text-white/50 uppercase font-semibold mb-0.5">Time Slot</p>
                        <p className="font-medium text-sm text-white/90">{member.startTime ? `${member.startTime} - ${member.endTime}` : 'N/A'}</p>
                      </div>
                      <div className="col-span-1">
                        <p className="text-[10px] text-white/50 uppercase font-semibold mb-0.5">Address</p>
                        <p className="font-medium text-sm text-white/90 truncate" title={member.address}>{member.address || 'N/A'}</p>
                      </div>
                      <div className="col-span-1">
                        <p className="text-[10px] text-white/50 uppercase font-semibold mb-0.5">Locker</p>
                        <p className="font-medium text-sm font-bold text-white">{member.lockerFacility ? 'Yes' : 'No'}</p>
                      </div>
                      <div className="col-span-1">
                        <p className="text-[10px] text-white/50 uppercase font-semibold mb-0.5">ID Proof</p>
                        <p className="font-medium text-sm text-white/90">{member.idProofNumber || 'N/A'}</p>
                      </div>
                      <div className="col-span-1">
                        <p className="text-[10px] text-white/50 uppercase font-semibold mb-0.5">Target Exam</p>
                        <p className="font-medium text-sm text-white/90">{member.targetExam || 'N/A'}</p>
                      </div>
                      <div className="col-span-1">
                        <p className="text-[10px] text-white/50 uppercase font-semibold mb-0.5">Duration</p>
                        <p className="font-medium text-sm text-white/90">{member.customDays ? `${member.customDays} Day(s)` : `${member.months} Month(s)`}</p>
                      </div>
                      <div className="col-span-1">
                        <p className="text-[10px] text-white/50 uppercase font-semibold mb-0.5">Reg. Fee</p>
                        <p className="font-medium text-sm text-white/90">{member.registrationFee ? `₹${member.registrationFee}` : 'N/A'}</p>
                      </div>
                      <div className="col-span-1">
                        <p className="text-[10px] text-white/50 uppercase font-semibold mb-0.5">Joined</p>
                        <p className="font-medium text-sm text-white/90">{member.startDate ? format(parseISO(member.startDate), 'MMM d, yyyy') : 'N/A'}</p>
                      </div>
                      <div className="col-span-1">
                        <p className="text-[10px] text-white/50 uppercase font-semibold mb-0.5">Valid Till</p>
                        <p className="font-medium text-sm text-primary">{format(parseISO(member.expiryDate), 'MMM d, yyyy')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Members;
