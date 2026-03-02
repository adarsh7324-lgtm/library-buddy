import { useState } from 'react';
import { useLibrary } from '@/context/LibraryContext';
import { Search, Trash2, Edit2, MessageSquare, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format, parseISO, differenceInDays } from 'date-fns';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

type FilterType = 'All' | 'Active' | 'Expired' | 'Expiring Soon';

const Members = () => {
  const { members, plans, deleteMember, updateMember } = useLibrary();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('All');
  const [editMember, setEditMember] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ fullName: string; phone: string; planId: string; status: string }>({ fullName: '', phone: '', planId: '', status: '' });

  const today = new Date();

  const filtered = members.filter(m => {
    const matchSearch = m.fullName.toLowerCase().includes(search.toLowerCase()) || m.phone.includes(search);
    if (!matchSearch) return false;
    if (filter === 'Active') return m.status === 'Active';
    if (filter === 'Expired') return m.status === 'Expired';
    if (filter === 'Expiring Soon') {
      const days = differenceInDays(parseISO(m.expiryDate), today);
      return m.status === 'Active' && days >= 0 && days <= 7;
    }
    return true;
  });

  const handleEdit = (id: string) => {
    const m = members.find(m => m.id === id);
    if (m) {
      setEditForm({ fullName: m.fullName, phone: m.phone, planId: m.planId, status: m.status });
      setEditMember(id);
    }
  };

  const handleSaveEdit = () => {
    if (editMember) {
      updateMember(editMember, editForm as any);
      setEditMember(null);
      toast.success('Member updated successfully');
    }
  };

  const handleDelete = (id: string) => {
    deleteMember(id);
    toast.success('Member deleted');
  };

  const filters: FilterType[] = ['All', 'Active', 'Expired', 'Expiring Soon'];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">Members</h1>
        <p className="text-muted-foreground mt-1">Manage your library members</p>
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
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Plan</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Expiry</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((member, i) => {
              const plan = plans.find(p => p.id === member.planId);
              return (
                <motion.tr key={member.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 font-medium text-foreground">{member.fullName}</td>
                  <td className="py-3 px-4 text-muted-foreground">{member.countryCode} {member.phone}</td>
                  <td className="py-3 px-4 text-muted-foreground">{plan?.name}</td>
                  <td className="py-3 px-4 text-muted-foreground">{format(parseISO(member.expiryDate), 'MMM d, yyyy')}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${member.status === 'Active' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                      {member.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(member.id)}><Edit2 className="w-3.5 h-3.5" /></Button>
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
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No members found</p>}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filtered.map((member, i) => {
          const plan = plans.find(p => p.id === member.planId);
          return (
            <motion.div key={member.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="stat-card">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-foreground">{member.fullName}</p>
                  <p className="text-xs text-muted-foreground">{member.countryCode} {member.phone}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${member.status === 'Active' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                  {member.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{plan?.name} • Expires {format(parseISO(member.expiryDate), 'MMM d, yyyy')}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-xs" onClick={() => handleEdit(member.id)}><Edit2 className="w-3 h-3 mr-1" /> Edit</Button>
                <Button size="sm" variant="outline" className="text-xs text-destructive" onClick={() => handleDelete(member.id)}><Trash2 className="w-3 h-3 mr-1" /> Delete</Button>
                <a href={`https://wa.me/${member.countryCode.replace('+', '')}${member.phone}?text=${encodeURIComponent(`Hello ${member.fullName}, your library membership expires on ${format(parseISO(member.expiryDate), 'MMM d, yyyy')}. Please renew to continue access.`)}`} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="text-xs text-success"><MessageSquare className="w-3 h-3 mr-1" /> WhatsApp</Button>
                </a>
              </div>
            </motion.div>
          );
        })}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No members found</p>}
      </div>

      <Dialog open={!!editMember} onOpenChange={() => setEditMember(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Member</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Full Name</Label><Input value={editForm.fullName} onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))} /></div>
            <div><Label>Phone</Label><Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div>
              <Label>Plan</Label>
              <Select value={editForm.planId} onValueChange={v => setEditForm(f => ({ ...f, planId: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMember(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Members;
