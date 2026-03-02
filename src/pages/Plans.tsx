import { useState } from 'react';
import { useLibrary, Plan } from '@/context/LibraryContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit2, Trash2, CreditCard } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const Plans = () => {
  const { plans, addPlan, updatePlan, deletePlan, members } = useLibrary();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', durationMonths: '', price: '' });

  const openAdd = () => { setForm({ name: '', durationMonths: '', price: '' }); setEditingId(null); setDialogOpen(true); };
  const openEdit = (plan: Plan) => { setForm({ name: plan.name, durationMonths: String(plan.durationMonths), price: String(plan.price) }); setEditingId(plan.id); setDialogOpen(true); };

  const handleSave = () => {
    if (!form.name || !form.durationMonths || !form.price) { toast.error('Fill all fields'); return; }
    const data = { name: form.name, durationMonths: Number(form.durationMonths), price: Number(form.price) };
    if (editingId) { updatePlan(editingId, data); toast.success('Plan updated'); }
    else { addPlan(data); toast.success('Plan added'); }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    const inUse = members.some(m => m.planId === id);
    if (inUse) { toast.error('Cannot delete plan in use by members'); return; }
    deletePlan(id);
    toast.success('Plan deleted');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">Subscription Plans</h1>
          <p className="text-muted-foreground mt-1">Manage membership plans and pricing</p>
        </div>
        <Button onClick={openAdd} className="gap-2"><Plus className="w-4 h-4" /> Add Plan</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan, i) => {
          const memberCount = members.filter(m => m.planId === plan.id).length;
          return (
            <motion.div key={plan.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="stat-card flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground">{plan.name}</h3>
              </div>
              <p className="text-2xl font-bold font-display text-foreground mb-1">₹{plan.price.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mb-1">{plan.durationMonths} month{plan.durationMonths > 1 ? 's' : ''}</p>
              <p className="text-xs text-muted-foreground mb-4">{memberCount} member{memberCount !== 1 ? 's' : ''}</p>
              <div className="mt-auto flex gap-2">
                <Button size="sm" variant="outline" className="text-xs flex-1" onClick={() => openEdit(plan)}><Edit2 className="w-3 h-3 mr-1" /> Edit</Button>
                <Button size="sm" variant="outline" className="text-xs text-destructive flex-1" onClick={() => handleDelete(plan.id)}><Trash2 className="w-3 h-3 mr-1" /> Delete</Button>
              </div>
            </motion.div>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? 'Edit Plan' : 'Add New Plan'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Plan Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Monthly" /></div>
            <div><Label>Duration (months)</Label><Input type="number" value={form.durationMonths} onChange={e => setForm(f => ({ ...f, durationMonths: e.target.value }))} placeholder="e.g. 1" /></div>
            <div><Label>Price (₹)</Label><Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="e.g. 500" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingId ? 'Update' : 'Add'} Plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Plans;
