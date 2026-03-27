import { useState, useEffect, useMemo } from 'react';
import { useLibrary } from '@/context/LibraryContext';
import { Search, Trash2, MessageSquare, Download, User, Printer } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Member } from '@/context/LibraryContext';

type FilterType = 'All' | 'Morning' | 'Afternoon' | 'Evening' | 'Night' | 'Full Day' | 'Active' | 'Expired' | 'Expiring Soon';

const Members = () => {
  const { members, payments, deleteMember, updateMember } = useLibrary();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('All');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [isEditingIdCard, setIsEditingIdCard] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Member>>({});
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filter]);
  
  const printIdCardPdf = (member: Member) => {
    try {
      const doc = new jsPDF();
      
      // Helper to sanitize text for PDF (removes non-ASCII and replaces Rupee symbol)
      const sanitizeText = (text: string) => {
        if (!text) return '';
        // Replace Rupee symbol and strip non-ASCII to prevent jsPDF encoding glitches
        return text.toString().replace(/₹/g, 'Rs.').replace(/[^\x00-\x7F]/g, '');
      };

      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, 210, 297, 'F');
      
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('LIBRARY BUDDY', 105, 15, { align: 'center' });
      doc.setFontSize(10);
      doc.text('MEMBER IDENTITY CARD', 105, 20, { align: 'center' });

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);

      const startY = 25;
      const rowH = 10;
      
      const drawTextInCell = (text: string, x: number, y: number, w: number, h: number, isLabel: boolean = false) => {
        doc.setFont('helvetica', isLabel ? 'bold' : 'normal');
        doc.setFontSize(isLabel ? 9 : 8);
        const pad = 1;
        const sanitized = sanitizeText(text);
        const textLines = doc.splitTextToSize(sanitized, w - pad * 2);
        doc.text(textLines, x + pad, y + 5.5, { maxWidth: w - pad * 2 });
      };

      // Block 1 Box
      doc.rect(10, startY, 190, 50); 
      doc.line(45, startY, 45, startY + 50);
      doc.line(85, startY, 85, startY + 50);
      doc.line(120, startY, 120, startY + 50);
      doc.line(160, startY, 160, startY + 50);
      
      for (let i = 1; i < 5; i++) {
        doc.line(10, startY + i * rowH, 160, startY + i * rowH);
      }

      drawTextInCell('Candidate Name:', 10, startY, 35, rowH, true);
      drawTextInCell(member.fullName || 'N/A', 45, startY, 40, rowH);
      drawTextInCell('Phone Number:', 85, startY, 35, rowH, true);
      drawTextInCell(`${member.countryCode} ${member.phone}`, 120, startY, 40, rowH);
      
      drawTextInCell('ID Proof:', 10, startY + rowH, 35, rowH, true);
      drawTextInCell(member.idProofNumber || '-', 45, startY + rowH, 40, rowH);
      drawTextInCell('Target Exam:', 85, startY + rowH, 35, rowH, true);
      drawTextInCell(member.targetExam || '-', 120, startY + rowH, 40, rowH);
      
      drawTextInCell('Joined Date:', 10, startY + rowH*2, 35, rowH, true);
      drawTextInCell(member.startDate ? format(parseISO(member.startDate), 'dd.MM.yyyy') : '-', 45, startY + rowH*2, 40, rowH);
      drawTextInCell('Valid Till:', 85, startY + rowH*2, 35, rowH, true);
      drawTextInCell(member.expiryDate ? format(parseISO(member.expiryDate), 'dd.MM.yyyy') : '-', 120, startY + rowH*2, 40, rowH);

      drawTextInCell('Status:', 10, startY + rowH*3, 35, rowH, true);
      drawTextInCell(member.status || 'N/A', 45, startY + rowH*3, 40, rowH);
      drawTextInCell('Duration:', 85, startY + rowH*3, 35, rowH, true);
      drawTextInCell(member.customDays ? `${member.customDays} Day(s)` : `${member.months} Month(s)`, 120, startY + rowH*3, 40, rowH);
      
      drawTextInCell('Address:', 10, startY + rowH*4, 35, rowH, true);
      drawTextInCell(member.address || '-', 45, startY + rowH*4, 40, rowH);
      drawTextInCell('Locker:', 85, startY + rowH*4, 35, rowH, true);
      drawTextInCell(member.lockerFacility ? 'Yes' : 'No', 120, startY + rowH*4, 40, rowH);

      try {
        if (member.photoUrl) {
          doc.addImage(member.photoUrl, 'WEBP', 161, startY + 1, 28, 48);
        } else {
          doc.text('PHOTO', 180, startY + 25, { align: 'center' });
        }
      } catch (e) {
        doc.text('PHOTO', 180, startY + 25, { align: 'center' });
      }

      const startY2 = startY + 50 + 5;
      doc.setFillColor(240, 240, 240);
      doc.rect(10, startY2, 190, 8, 'FD');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Library & Payment Details', 105, startY2 + 5.5, { align: 'center' });
      
      const startY3 = startY2 + 8;
      doc.rect(10, startY3, 190, 30);
      
      const c1 = 10, c2 = 57.5, c3 = 105, c4 = 152.5;
      doc.line(c2, startY3, c2, startY3 + 30);
      doc.line(c3, startY3, c3, startY3 + 30);
      doc.line(c4, startY3, c4, startY3 + 30);
      doc.line(10, startY3 + 10, 200, startY3 + 10);
      doc.line(10, startY3 + 20, 200, startY3 + 20);
      
      const wD = 47.5;
      drawTextInCell('Seat Number:', c1, startY3, wD, rowH, true);
      drawTextInCell(member.seatNumber || '-', c2, startY3, wD, rowH);
      drawTextInCell('Shift:', c3, startY3, wD, rowH, true);
      drawTextInCell(member.shift || '-', c4, startY3, wD, rowH);
      
      drawTextInCell('Time Slot:', c1, startY3 + rowH, wD, rowH, true);
      drawTextInCell(member.startTime ? `${member.startTime} - ${member.endTime}` : '-', c2, startY3 + rowH, wD, rowH);
      drawTextInCell('Duration:', c3, startY3 + rowH, wD, rowH, true);
      drawTextInCell(member.customDays ? `${member.customDays} Day(s)` : `${member.months} Month(s)`, c4, startY3 + rowH, wD, rowH);
      
      drawTextInCell('Joined Date:', c1, startY3 + rowH*2, wD, rowH, true);
      drawTextInCell(member.startDate ? format(parseISO(member.startDate), 'dd.MM.yyyy') : '-', c2, startY3 + rowH*2, wD, rowH);
      drawTextInCell('Valid Till:', c3, startY3 + rowH*2, wD, rowH, true);
      drawTextInCell(member.expiryDate ? format(parseISO(member.expiryDate), 'dd.MM.yyyy') : '-', c4, startY3 + rowH*2, wD, rowH);

      let startY4 = startY3 + 30 + 5;
      const memberPayments = payments.filter(p => p.memberId === member.id);
      const totalDue = memberPayments.reduce((sum, p) => sum + (p.dueAmount || 0), 0);
      const totalAdv = memberPayments.reduce((sum, p) => sum + (p.advancedAmount || 0), 0);

      if (totalDue > 0 || totalAdv > 0) {
        doc.setFillColor(255, 245, 235);
        doc.rect(10, startY4, 190, 8, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        let balanceText = '';
        if (totalDue > 0) balanceText += `TOTAL DUE: Rs. ${totalDue}    `;
        if (totalAdv > 0) balanceText += `TOTAL ADVANCED: Rs. ${totalAdv}`;
        doc.text(sanitizeText(balanceText), 105, startY4 + 5.5, { align: 'center' });
        startY4 += 12;
      } else {
        startY4 += 5;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text('PAYMENT HISTORY', 14, startY4);

      if (memberPayments.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.text('No payment records found.', 14, startY4 + 7);
      } else {
        const tableBody = memberPayments
          .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
          .map(p => [
            format(parseISO(p.date), 'dd/MM/yy'),
            `Rs. ${p.amount}`,
            p.customDays ? `${p.customDays}d` : `${p.months}m`,
            sanitizeText(p.paymentMode || 'Cash'),
            p.dueAmount ? `Rs. ${p.dueAmount}` : '-',
            p.advancedAmount ? `Rs. ${p.advancedAmount}` : '-',
            sanitizeText(p.note || '-')
          ]);

        autoTable(doc, {
          startY: startY4 + 2,
          head: [['Date', 'Amount', 'Dur.', 'Mode', 'Due', 'Adv.', 'Note']],
          body: tableBody,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255] },
          columnStyles: {
            6: { cellWidth: 50 }
          }
        });
      }
      
      doc.save(`ID_${member.fullName.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
       console.error(error);
       toast.error('Failed to generate PDF');
    }
  };

  const today = new Date();

  const sortedAllMembers = [...members].sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : (a.startDate ? parseISO(a.startDate).getTime() : 0);
    const timeB = b.created_at ? new Date(b.created_at).getTime() : (b.startDate ? parseISO(b.startDate).getTime() : 0);
    return timeB - timeA;
  });

  const indexMap = useMemo(() => {
    const m = new Map<string, number>();
    sortedAllMembers.forEach((member, i) => m.set(member.id, i + 1));
    return m;
  }, [sortedAllMembers]);

  const filtered = sortedAllMembers.filter(m => {
    const matchSearch = m.fullName.toLowerCase().includes(search.toLowerCase()) || m.phone.includes(search);
    if (!matchSearch) return false;
    if (filter === 'Active') return m.status === 'Active';
    if (filter === 'Expired') return m.status === 'Expired';
    if (filter === 'Expiring Soon') return m.status === 'Expiring Soon';
    
    if (filter === 'Morning') return m.shift === 'Morning';
    if (filter === 'Afternoon') return m.shift === 'Afternoon';
    if (filter === 'Evening') return m.shift === 'Evening';
    if (filter === 'Night') return m.shift === 'Night';
    if (filter === 'Full Day') return m.shift === 'Full';
    return true;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedMembers = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
      m.expiryDate ? format(parseISO(m.expiryDate), 'MMM d, yyyy') : 'N/A',
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

  const filters: FilterType[] = ['All', 'Morning', 'Afternoon', 'Evening', 'Night', 'Full Day', 'Active', 'Expired', 'Expiring Soon'];

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
        <div className="w-full sm:w-[200px] shrink-0">
          <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
            <SelectTrigger className="w-full bg-black/20 border-white/10 text-white h-10">
              <SelectValue placeholder="Filter..." />
            </SelectTrigger>
            <SelectContent>
              {filters.map(f => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block glass-panel rounded-2xl overflow-hidden shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-black/20">
                <th className="text-left py-4 px-5 font-medium text-white/70">#</th>
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
              {paginatedMembers.map((member, i) => {
                const globalIndex = indexMap.get(member.id) ?? 0;
                return (
                <motion.tr key={member.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-5 text-white/70">{globalIndex}</td>
                  <td className="py-3 px-5 font-medium text-white">{member.fullName}</td>
                  <td className="py-3 px-5 text-white/70">{member.countryCode} {member.phone}</td>
                  <td className="py-3 px-5 text-white/70">{member.seatNumber || '-'}</td>
                  <td className="py-3 px-5 text-white/70">{member.shift || '-'}</td>
                  <td className="py-3 px-5 text-white/70">{member.startTime ? `${member.startTime} - ${member.endTime}` : '-'}</td>
                  <td className="py-3 px-5 text-white/70">{member.startDate ? format(parseISO(member.startDate), 'MMM d, yyyy') : '-'}</td>
                  <td className="py-3 px-5 text-white/70">{member.expiryDate ? format(parseISO(member.expiryDate), 'MMM d, yyyy') : 'N/A'}</td>
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
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/20 hover:text-destructive" onClick={() => setMemberToDelete(member.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      <a
                        href={`https://wa.me/${member.countryCode.replace('+', '')}${member.phone}?text=${encodeURIComponent(`Hello ${member.fullName}, your library membership expires on ${member.expiryDate ? format(parseISO(member.expiryDate), 'MMM d, yyyy') : 'N/A'}. Please renew to continue access.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-success hover:bg-success/20 hover:text-success"><MessageSquare className="w-3.5 h-3.5" /></Button>
                      </a>
                    </div>
                  </td>
                </motion.tr>
              );})}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="text-center text-white/50 py-8">No members found</p>}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {paginatedMembers.map((member, i) => {
          const globalIndex = indexMap.get(member.id) ?? 0;
          return (
          <motion.div key={member.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="stat-card">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-medium text-white"><span className="text-white/50 mr-2">#{globalIndex}</span>{member.fullName}</p>
                <p className="text-xs text-white/60">{member.countryCode} {member.phone} {member.seatNumber ? `• Seat: ${member.seatNumber}` : ''} {member.shift ? `• Shift: ${member.shift}` : ''} {member.startTime ? `• Time: ${member.startTime} - ${member.endTime}` : ''}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${member.status === 'Active' ? 'bg-success/80 text-success-foreground border-success/80' :
                member.status === 'Expiring Soon' ? 'bg-warning/80 text-warning-foreground border-warning/80' :
                  'bg-destructive/80 text-destructive-foreground border-destructive/80'
                }`}>
                {member.status}
              </span>
            </div>
            <p className="text-xs text-white/50 mb-3">Joined {member.startDate ? format(parseISO(member.startDate), 'MMM d, yyyy') : '-'} • Expires {member.expiryDate ? format(parseISO(member.expiryDate), 'MMM d, yyyy') : 'N/A'}</p>
            <div className="flex gap-2">
              <Button size="sm" className="text-xs bg-white/40 text-white hover:bg-white/50 border-0" onClick={() => setSelectedMemberId(member.id)}><User className="w-3 h-3 mr-1" /> ID Card</Button>
              <Button size="sm" variant="outline" className="text-xs text-destructive bg-destructive/10 border-destructive/20 hover:bg-destructive/20 hover:text-destructive" onClick={() => setMemberToDelete(member.id)}><Trash2 className="w-3 h-3 mr-1" /> Delete</Button>
              <a href={`https://wa.me/${member.countryCode.replace('+', '')}${member.phone}?text=${encodeURIComponent(`Hello ${member.fullName}, your library membership expires on ${member.expiryDate ? format(parseISO(member.expiryDate), 'MMM d, yyyy') : 'N/A'}. Please renew to continue access.`)}`} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="text-xs text-success bg-success/10 border-success/20 hover:bg-success/20 hover:text-success"><MessageSquare className="w-3 h-3 mr-1" /> WhatsApp</Button>
              </a>
            </div>
          </motion.div>
        );})}
        {filtered.length === 0 && <p className="text-center text-white/50 py-8">No members found</p>}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center bg-black/20 border border-white/10 rounded-2xl p-4 mt-6">
          <Button 
            variant="outline" 
            className="border-white/10 text-white bg-white/5 disabled:opacity-50"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          >
            Previous
          </Button>
          <span className="text-white/70 text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button 
            variant="outline" 
            className="border-white/10 text-white bg-white/5 disabled:opacity-50"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          >
            Next
          </Button>
        </div>
      )}

      {/* ID Card Dialog */}
      <Dialog open={!!selectedMemberId} onOpenChange={() => setSelectedMemberId(null)}>
        <DialogContent className="max-w-2xl p-0 bg-transparent border-none shadow-none overflow-y-auto max-h-[90vh]">
          {(() => {
            const member = members.find(m => m.id === selectedMemberId);
            if (!member) return null;

            return (
              <div id="printable-id-card" className="bg-black/60 backdrop-blur-2xl w-full rounded-2xl overflow-hidden shadow-[0_16px_64px_0_rgba(0,0,0,0.5)] flex flex-col md:flex-row relative border border-white/10">
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
                    {!isEditingIdCard ? (
                      <div className="flex gap-2">
                        <Button id="print-btn" size="sm" variant="outline" className="h-8 border-white/20 text-white bg-white/5 hover:bg-white/10" onClick={() => printIdCardPdf(member)}>
                          <Printer className="w-4 h-4 mr-1" /> Print
                        </Button>
                        <Button id="edit-btn" size="sm" variant="outline" className="h-8 border-white/20 text-white bg-white/5 hover:bg-white/10" onClick={() => {
                          setIsEditingIdCard(true);
                          setEditForm({
                            fullName: member.fullName,
                            phone: member.phone,
                            address: member.address || '',
                            seatNumber: member.seatNumber || '',
                            shift: member.shift,
                            startTime: member.startTime || '',
                            endTime: member.endTime || '',
                            lockerFacility: member.lockerFacility || false,
                            idProofNumber: member.idProofNumber || '',
                            targetExam: member.targetExam || '',
                            discountAmount: member.discountAmount || undefined,
                          });
                        }}>
                          Edit
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" className="h-8 text-white hover:bg-white/10" onClick={() => setIsEditingIdCard(false)}>Cancel</Button>
                        <Button size="sm" className="h-8 bg-primary hover:bg-primary/90 text-white" onClick={async () => {
                          try {
                            await updateMember(member.id, editForm);
                            setIsEditingIdCard(false);
                            toast.success('Member updated');
                          } catch (e) {
                            // Error is handled in context
                          }
                        }}>Save</Button>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/10 space-y-3">
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                      {isEditingIdCard ? (
                        <>
                          <div className="col-span-2">
                            <Label className="text-[10px] text-white/50 uppercase font-semibold mb-0.5">Full Name</Label>
                            <Input value={editForm.fullName} onChange={e => setEditForm({ ...editForm, fullName: e.target.value })} className="h-8 bg-black/20 text-sm" />
                          </div>
                          <div className="col-span-1">
                            <Label className="text-[10px] text-white/50 uppercase font-semibold mb-0.5">Phone</Label>
                            <Input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="h-8 bg-black/20 text-sm" />
                          </div>
                          <div className="col-span-1">
                            <Label className="text-[10px] text-white/50 uppercase font-semibold mb-0.5">Seat Number</Label>
                            <Input value={editForm.seatNumber} onChange={e => setEditForm({ ...editForm, seatNumber: e.target.value })} className="h-8 bg-black/20 text-sm" />
                          </div>
                          <div className="col-span-1">
                            <Label className="text-[10px] text-white/50 uppercase font-semibold mb-0.5">Shift</Label>
                            <Select value={editForm.shift} onValueChange={v => setEditForm({ ...editForm, shift: v as Member['shift'] })}>
                              <SelectTrigger className="h-8 bg-black/20 text-sm"><SelectValue placeholder="Shift" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Morning">Morning</SelectItem>
                                <SelectItem value="Afternoon">Afternoon</SelectItem>
                                <SelectItem value="Evening">Evening</SelectItem>
                                <SelectItem value="Night">Night</SelectItem>
                                <SelectItem value="Full">Full</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-1 flex gap-2">
                            <div className="flex-1">
                              <Label className="text-[10px] text-white/50 uppercase font-semibold mb-0.5">Start Time</Label>
                              <Input type="time" value={editForm.startTime} onChange={e => setEditForm({ ...editForm, startTime: e.target.value })} className="h-8 bg-black/20 text-sm [color-scheme:dark]" />
                            </div>
                            <div className="flex-1">
                              <Label className="text-[10px] text-white/50 uppercase font-semibold mb-0.5">End Time</Label>
                              <Input type="time" value={editForm.endTime} onChange={e => setEditForm({ ...editForm, endTime: e.target.value })} className="h-8 bg-black/20 text-sm [color-scheme:dark]" />
                            </div>
                          </div>
                          <div className="col-span-2">
                            <Label className="text-[10px] text-white/50 uppercase font-semibold mb-0.5">Address</Label>
                            <Input value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} className="h-8 bg-black/20 text-sm" />
                          </div>
                          <div className="col-span-1 flex items-center gap-2">
                            <Switch checked={editForm.lockerFacility} onCheckedChange={c => setEditForm({ ...editForm, lockerFacility: c })} />
                            <Label className="text-[10px] text-white/50 uppercase font-semibold">Locker</Label>
                          </div>
                          <div className="col-span-1">
                            <Label className="text-[10px] text-white/50 uppercase font-semibold mb-0.5">ID Proof</Label>
                            <Input value={editForm.idProofNumber} onChange={e => setEditForm({ ...editForm, idProofNumber: e.target.value })} className="h-8 bg-black/20 text-sm" />
                          </div>
                          <div className="col-span-1">
                            <Label className="text-[10px] text-white/50 uppercase font-semibold mb-0.5">Target Exam</Label>
                            <Input value={editForm.targetExam} onChange={e => setEditForm({ ...editForm, targetExam: e.target.value })} className="h-8 bg-black/20 text-sm" />
                          </div>
                        </>
                      ) : (
                        <>
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
                        </>
                      )}
                      <div className="col-span-2 border-t border-white/10 mt-2 mb-1"></div>
                      <div className="col-span-1">
                        <p className="text-[10px] text-white/50 uppercase font-semibold mb-0.5">Duration</p>
                        <p className="font-medium text-sm text-white/90">{member.customDays ? `${member.customDays} Day(s)` : `${member.months} Month(s)`}</p>
                      </div>
                      <div className="col-span-1">
                        <p className="text-[10px] text-white/50 uppercase font-semibold mb-0.5">Joined</p>
                        <p className="font-medium text-sm text-white/90">{member.startDate ? format(parseISO(member.startDate), 'MMM d, yyyy') : 'N/A'}</p>
                      </div>
                      <div className="col-span-2 border-t border-white/10 mt-2 pt-2">
                        <p className="text-[10px] text-white/50 uppercase font-semibold mb-0.5">Valid Till</p>
                        <p className="font-medium text-sm text-primary">{member.expiryDate ? format(parseISO(member.expiryDate), 'MMM d, yyyy') : 'N/A'}</p>
                      </div>

                      {/* Payment History Section */}
                      <div className="col-span-2 mt-4 pt-4 border-t border-white/10">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-[10px] uppercase tracking-widest font-bold text-white/50">Payment History</h4>
                          <div className="flex gap-3">
                            {(() => {
                              const memberPayments = payments.filter(p => p.memberId === member.id);
                              const totalDue = memberPayments.reduce((sum, p) => sum + (p.dueAmount || 0), 0);
                              const totalAdv = memberPayments.reduce((sum, p) => sum + (p.advancedAmount || 0), 0);
                              return (
                                <>
                                  {totalDue > 0 && <span className="text-[10px] font-bold text-orange-400">Due: ₹{totalDue}</span>}
                                  {totalAdv > 0 && <span className="text-[10px] font-bold text-yellow-400">Adv: ₹{totalAdv}</span>}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                          {payments.filter(p => p.memberId === member.id).length === 0 ? (
                            <p className="text-[10px] text-white/30 italic text-center py-4">No payments recorded yet</p>
                          ) : (
                            payments
                              .filter(p => p.memberId === member.id)
                              .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
                              .map((p) => (
                                <div key={p.id} className="bg-white/5 rounded-lg p-2.5 border border-white/5 flex flex-col gap-1">
                                  <div className="flex justify-between items-start">
                                    <span className="text-[10px] text-white/50">{format(parseISO(p.date), 'MMM d, yyyy')}</span>
                                    <span className="text-[11px] font-bold text-white">₹{p.amount}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-white/70">{p.customDays ? `${p.customDays} Day(s)` : `${p.months} Month(s)`} • {p.paymentMode || 'Cash'}</span>
                                    <div className="flex gap-2">
                                      {(p.dueAmount || 0) > 0 && <span className="text-orange-400 font-bold">Due: ₹{p.dueAmount}</span>}
                                      {(p.advancedAmount || 0) > 0 && <span className="text-yellow-400 font-bold">Adv: ₹{p.advancedAmount}</span>}
                                    </div>
                                  </div>
                                  {p.note && <p className="text-[9px] text-white/40 italic truncate">{p.note}</p>}
                                </div>
                              ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!memberToDelete}
        onOpenChange={(open) => !open && setMemberToDelete(null)}
        title="Delete Member?"
        description="Are you sure you want to delete this member? This action cannot be undone."
        onConfirm={() => {
          if (memberToDelete) {
            handleDelete(memberToDelete);
            setMemberToDelete(null);
          }
        }}
        destructive
      />
    </div>
  );
};

export default Members;
