import { useState } from 'react';
import { useLibrary, Staff, StaffSalaryPayment } from '@/context/LibraryContext';
import { Search, Trash2, User, Printer, Plus, CreditCard, Calendar, Phone, Briefcase, IndianRupee, Camera, Upload, MapPin, Hash, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const StaffManagement = () => {
  const { staff, staffSalaryPayments, addStaff, updateStaff, deleteStaff, addStaffSalaryPayment, deleteStaffSalaryPayment } = useLibrary();
  const [search, setSearch] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  const [newStaff, setNewStaff] = useState<Omit<Staff, 'id' | 'libraryId'>>({
    fullName: '',
    role: 'Librarian',
    phone: '',
    countryCode: '+91',
    salary: 0,
    joiningDate: format(new Date(), 'yyyy-MM-dd'),
    status: 'Active',
    address: '',
    idProofNumber: ''
  });

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 150;
          const scale = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const compressed = canvas.toDataURL('image/webp', 0.5);
            setPhotoPreview(compressed);
            setPhotoBase64(compressed);
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const clearPhoto = () => {
    setPhotoPreview(null);
    setPhotoBase64(null);
  };

  const handleAddStaff = async () => {
    if (!newStaff.fullName || !newStaff.phone || !newStaff.salary) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      await addStaff(newStaff, photoBase64 || undefined);
      toast.success('Staff member added successfully');
      setIsAddDialogOpen(false);
      setNewStaff({
        fullName: '',
        role: 'Librarian',
        phone: '',
        countryCode: '+91',
        salary: 0,
        joiningDate: format(new Date(), 'yyyy-MM-dd'),
        status: 'Active',
        address: '',
        idProofNumber: ''
      });
      setPhotoPreview(null);
      setPhotoBase64(null);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to add staff');
    }
  };

  const filteredStaff = staff.filter(s => 
    s.fullName.toLowerCase().includes(search.toLowerCase()) || 
    s.phone.includes(search)
  );

  const selectedStaff = staff.find(s => s.id === selectedStaffId);
  const relevantPayments = staffSalaryPayments
    .filter(p => p.staffId === selectedStaffId)
    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

  const totalPaid = relevantPayments.reduce((sum, p) => sum + p.amount, 0);
  const lastPayment = relevantPayments[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display text-white">Staff Management</h1>
          <p className="text-white/70 mt-1">Manage your library staff and salary payments</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shrink-0 bg-primary hover:bg-primary/90 text-white shadow-primary/20 shadow-lg">
              <Plus className="w-4 h-4" /> Add Staff
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-panel border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold font-display">Add New Staff</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              {/* Photo Upload Widget */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-32 h-32 rounded-2xl bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden group">
                  {photoPreview ? (
                    <>
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        onClick={clearPhoto}
                        className="absolute top-1 right-1 p-1 bg-destructive/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <div className="text-center p-4">
                      <User className="w-8 h-8 text-white/20 mx-auto mb-2" />
                      <p className="text-[10px] text-white/40 font-medium leading-tight">No Photo</p>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 w-full justify-center">
                  <div className="relative">
                    <Button type="button" variant="outline" size="sm" className="bg-white/5 border-white/10 text-white hover:bg-white/10 h-8 text-xs">
                      <Camera className="w-3 h-3 mr-1.5" /> Use Camera
                    </Button>
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="user"
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      onChange={handlePhotoChange}
                    />
                  </div>
                  
                  <div className="relative">
                    <Button type="button" variant="outline" size="sm" className="bg-white/5 border-white/10 text-white hover:bg-white/10 h-8 text-xs">
                      <Upload className="w-3 h-3 mr-1.5" /> Upload File
                    </Button>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      onChange={handlePhotoChange}
                    />
                  </div>
                </div>
                
                {photoPreview && <p className="text-[10px] text-success font-medium uppercase tracking-wider">Photo Ready</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" placeholder="Enter staff name" className="bg-white/5 border-white/10" value={newStaff.fullName} onChange={e => setNewStaff({...newStaff, fullName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={newStaff.role} onValueChange={v => setNewStaff({...newStaff, role: v})}>
                    <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Select role" /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10 text-white">
                      <SelectItem value="Librarian">Librarian</SelectItem>
                      <SelectItem value="Helper">Helper</SelectItem>
                      <SelectItem value="Manager">Manager</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salary">Monthly Salary (₹)</Label>
                  <Input id="salary" type="number" placeholder="Enter amount" className="bg-white/5 border-white/10" value={newStaff.salary || ''} onChange={e => setNewStaff({...newStaff, salary: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Joining Date</Label>
                  <Input id="date" type="date" className="bg-white/5 border-white/10 [color-scheme:dark]" value={newStaff.joiningDate} onChange={e => setNewStaff({...newStaff, joiningDate: e.target.value})} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="flex gap-2">
                  <Input className="w-16 bg-white/5 border-white/10" value={newStaff.countryCode} onChange={e => setNewStaff({...newStaff, countryCode: e.target.value})} />
                  <Input id="phone" placeholder="Enter phone number" className="flex-1 bg-white/5 border-white/10" value={newStaff.phone} onChange={e => setNewStaff({...newStaff, phone: e.target.value})} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="idProof">ID Proof Number (Aadhaar/PAN)</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                  <Input id="idProof" placeholder="Enter ID number" className="pl-10 bg-white/5 border-white/10" value={newStaff.idProofNumber} onChange={e => setNewStaff({...newStaff, idProofNumber: e.target.value})} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-3.5 h-3.5 text-white/30" />
                  <Textarea id="address" placeholder="Enter staff home address" className="pl-10 bg-white/5 border-white/10 min-h-[80px]" value={newStaff.address} onChange={e => setNewStaff({...newStaff, address: e.target.value})} />
                </div>
              </div>

              <Button className="w-full bg-primary hover:bg-primary/90 text-white mt-4 h-11 font-bold" onClick={handleAddStaff}>Register Staff Member</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
        <Input placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-black/20 border-white/10 text-white placeholder:text-white/30 backdrop-blur-sm" />
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block glass-panel rounded-2xl overflow-hidden shadow-lg border border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left py-4 px-5 font-medium text-white/70">Name</th>
                <th className="text-left py-4 px-5 font-medium text-white/70">Role</th>
                <th className="text-left py-4 px-5 font-medium text-white/70">Phone</th>
                <th className="text-left py-4 px-5 font-medium text-white/70">Joining Date</th>
                <th className="text-left py-4 px-5 font-medium text-white/70">Status</th>
                <th className="text-right py-4 px-5 font-medium text-white/70">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((s, i) => (
                <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-4 px-5 font-medium text-white">{s.fullName}</td>
                  <td className="py-4 px-5 text-white/70 text-xs"><span className="px-2 py-0.5 rounded-md bg-white/10">{s.role}</span></td>
                  <td className="py-4 px-5 text-white/70">{s.countryCode} {s.phone}</td>
                  <td className="py-4 px-5 text-white/70">{format(parseISO(s.joiningDate), 'MMM d, yyyy')}</td>
                  <td className="py-4 px-5">
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${s.status === 'Active' ? 'bg-success/80 text-success-foreground' : 'bg-white/10 text-white/50'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-right">
                    <Button size="sm" variant="outline" className="h-8 border-white/20 text-white hover:bg-white/10" onClick={() => setSelectedStaffId(s.id)}>
                      <CreditCard className="w-3.5 h-3.5 mr-1.5" /> View ID Card
                    </Button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredStaff.length === 0 && <p className="text-center text-white/50 py-12">No staff members found</p>}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filteredStaff.map((s, i) => (
          <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="stat-card">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-bold text-white">{s.fullName}</p>
                <p className="text-xs text-primary font-medium">{s.role}</p>
              </div>
              <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${s.status === 'Active' ? 'bg-success/80 text-success-foreground' : 'bg-white/10 text-white/50'}`}>
                {s.status}
              </span>
            </div>
            <div className="space-y-1 mb-4">
              <p className="text-xs text-white/60 flex items-center gap-2"><Phone className="w-3 h-3" /> {s.countryCode} {s.phone}</p>
              <p className="text-xs text-white/60 flex items-center gap-2"><Calendar className="w-3 h-3" /> Joined {format(parseISO(s.joiningDate), 'MMM d, yyyy')}</p>
            </div>
            <Button className="w-full text-xs h-9 bg-white/10 border-white/10 text-white hover:bg-white/20" onClick={() => setSelectedStaffId(s.id)}>
               View ID Card
            </Button>
          </motion.div>
        ))}
      </div>

      {/* Staff ID Card / Profile Dialog */}
      <Dialog open={!!selectedStaffId} onOpenChange={(open) => !open && setSelectedStaffId(null)}>
        <DialogContent className="max-w-3xl p-0 bg-transparent border-none shadow-none overflow-y-auto max-h-[95vh]">
          {selectedStaff && (
            <div className="bg-zinc-950/90 backdrop-blur-2xl w-full rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row relative border border-white/10 text-white">
              {/* Left Profile Panel */}
              <div className="w-full md:w-1/3 bg-white/5 p-8 flex flex-col items-center border-b md:border-b-0 md:border-r border-white/10 overflow-y-auto">
                <div className="w-32 h-32 rounded-2xl bg-primary/20 border-4 border-primary/30 flex items-center justify-center mb-6 shadow-xl overflow-hidden shrink-0">
                  {selectedStaff.photoUrl ? (
                    <img src={selectedStaff.photoUrl} alt={selectedStaff.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-16 h-16 text-primary" />
                  )}
                </div>
                <h3 className="font-bold text-xl text-center mb-1 leading-tight">{selectedStaff.fullName}</h3>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80 mb-6 px-2 py-0.5 rounded bg-primary/10 border border-primary/20">{selectedStaff.role}</span>
                
                <div className="w-full pt-6 border-t border-white/10 space-y-4">
                   <div className="flex flex-col gap-1">
                      <Label className="text-[9px] uppercase tracking-widest text-white/30 font-bold">Contact Info</Label>
                      <div className="flex items-center gap-2 text-sm text-white/70">
                        <Phone className="w-3.5 h-3.5 text-primary" />
                        <span>{selectedStaff.countryCode} {selectedStaff.phone}</span>
                      </div>
                   </div>
                   
                   <div className="flex flex-col gap-1">
                      <Label className="text-[9px] uppercase tracking-widest text-white/30 font-bold">Joining Date</Label>
                      <div className="flex items-center gap-2 text-sm text-white/70">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        <span>{format(parseISO(selectedStaff.joiningDate), 'MMMM d, yyyy')}</span>
                      </div>
                   </div>

                   <div className="flex flex-col gap-1">
                      <Label className="text-[9px] uppercase tracking-widest text-white/30 font-bold">Base Salary</Label>
                      <div className="flex items-center gap-2 text-sm text-white/70">
                        <IndianRupee className="w-3.5 h-3.5 text-primary" />
                        <span>₹{selectedStaff.salary.toLocaleString()} / mo</span>
                      </div>
                   </div>

                   {selectedStaff.idProofNumber && (
                     <div className="flex flex-col gap-1">
                        <Label className="text-[9px] uppercase tracking-widest text-white/30 font-bold">ID Proof</Label>
                        <div className="flex items-center gap-2 text-sm text-white/70">
                          <Hash className="w-3.5 h-3.5 text-primary" />
                          <span>{selectedStaff.idProofNumber}</span>
                        </div>
                     </div>
                   )}

                   {selectedStaff.address && (
                     <div className="flex flex-col gap-1">
                        <Label className="text-[9px] uppercase tracking-widest text-white/30 font-bold">Address</Label>
                        <div className="flex items-start gap-2 text-xs text-white/60 bg-white/5 p-2 rounded-lg border border-white/5 italic">
                          <MapPin className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                          <span>{selectedStaff.address}</span>
                        </div>
                     </div>
                   )}
                </div>

                <Button variant="ghost" className="mt-8 w-full text-[10px] text-destructive/60 hover:bg-destructive/10 hover:text-destructive transition-colors uppercase font-bold tracking-widest" onClick={() => {
                  if(confirm("Are you sure you want to delete this staff member?")) {
                    deleteStaff(selectedStaff.id);
                    setSelectedStaffId(null);
                  }
                }}>
                  <Trash2 className="w-3 h-3 mr-2" /> Delete Record
                </Button>
              </div>

              {/* Right Content Panel */}
              <div className="w-full md:w-2/3 p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-display font-bold text-primary italic">LIBRARY BUDDY</h2>
                    <p className="text-[10px] tracking-[0.2em] uppercase font-bold text-white/40">Staff Identity Card</p>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 border-white/10 hover:bg-white/5 text-white/70" onClick={() => window.print()}>
                    <Printer className="w-4 h-4 mr-2" /> Print
                  </Button>
                </div>

                <div className="space-y-8">
                  {/* Salary Summary Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                      <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1 font-bold">Total Paid to Date</p>
                      <p className="text-xl font-bold font-display">₹{totalPaid.toLocaleString()}</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                      <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1 font-bold">Last Payment</p>
                      <p className="text-xl font-bold font-display">
                        {lastPayment ? `₹${lastPayment.amount.toLocaleString()}` : 'No records'}
                      </p>
                      {lastPayment && <p className="text-[10px] text-white/30 uppercase mt-1">{format(parseISO(lastPayment.date), 'MMM d, yyyy')}</p>}
                    </div>
                  </div>

                  {/* Payment History Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold flex items-center gap-2"><IndianRupee className="w-4 h-4 text-primary" /> Salary Payments</h4>
                    </div>

                    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                       {relevantPayments.map((p, idx) => (
                         <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors group">
                           <div>
                             <p className="text-sm font-bold">₹{p.amount.toLocaleString()}</p>
                             <p className="text-[10px] text-white/40 uppercase font-medium">{format(parseISO(p.date), 'MMMM d, yyyy')} • {p.paymentMode}</p>
                           </div>
                           <div className="flex items-center gap-3">
                             <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${p.status === 'Paid' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                               {p.status}
                             </span>
                             <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10" onClick={() => {
                               if(confirm("Delete this payment record?")) deleteStaffSalaryPayment(p.id);
                             }}>
                                <Trash2 className="w-3.5 h-3.5" />
                             </Button>
                           </div>
                         </div>
                       ))}
                       {relevantPayments.length === 0 && (
                         <div className="text-center py-12 text-white/20 border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.02]">
                           <p className="text-sm italic">No payment history recorded</p>
                         </div>
                       )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffManagement;
