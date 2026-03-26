import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { addMonths, addDays, subMonths, subDays, format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

import { v4 as uuidv4 } from 'uuid';

export interface Member {
  id: string;
  libraryId: string;
  fullName: string;
  phone: string;
  countryCode: string;
  address: string;
  idProofNumber: string;
  months: number;
  feesPaid: number;
  startDate: string;
  expiryDate: string;
  status: 'Active' | 'Expired' | 'Expiring Soon';
  seatNumber?: string;
  startTime?: string;
  endTime?: string;
  lockerFacility?: boolean;
  registrationFee?: number;
  discountAmount?: number;
  customDays?: number;
  photoUrl?: string;
  targetExam?: string;
  shift?: 'Morning' | 'Afternoon' | 'Evening' | 'Night' | 'Full';
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
}

export interface LibrarySettings {
  totalSeats?: number;
  rooms?: Room[];
}

export interface Payment {
  id: string;
  libraryId: string;
  memberId: string;
  amount: number;
  months: number;
  customDays?: number;
  date: string;
  note: string;
  paymentMode?: 'Cash' | 'Online';
  createdAt?: string;
  dueAmount?: number;
  advancedAmount?: number;
}

export interface DeletedPayment extends Payment {
  deletedAt: string;
}

interface LibraryContextType {
  members: Member[];
  payments: Payment[];
  deletedPayments: DeletedPayment[];
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  activeLibraryId: string | null;
  login: (email: string, password: string) => boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  addMember: (member: Omit<Member, 'id' | 'libraryId'>, photoBase64?: string) => Promise<string>;
  updateMember: (id: string, member: Partial<Member>) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  upgradeMember: (id: string, additionalMonths: number, additionalDays?: number) => Promise<void>;
  addPayment: (payment: Omit<Payment, 'id' | 'libraryId'>) => Promise<void>;
  updatePayment: (id: string, updates: Partial<Payment>) => Promise<void>;
  deletePayment: (id: string) => Promise<void>;
  clearDeletedPayments: (password: string) => Promise<void>;
  updateSettings: (settings: Partial<LibrarySettings>) => Promise<void>;
  fetchData: () => Promise<void>;
  switchLibrary: (libraryId: string) => void;
  addStaff: (staff: Omit<Staff, 'id' | 'libraryId'>, photoBase64?: string) => Promise<string>;
  updateStaff: (id: string, staff: Partial<Staff>) => Promise<void>;
  deleteStaff: (id: string) => Promise<void>;
  addStaffSalaryPayment: (payment: Omit<StaffSalaryPayment, 'id' | 'libraryId'>) => Promise<void>;
  updateStaffSalaryPayment: (id: string, updates: Partial<StaffSalaryPayment>) => Promise<void>;
  deleteStaffSalaryPayment: (id: string) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id' | 'libraryId'>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  staff: Staff[];
  staffSalaryPayments: StaffSalaryPayment[];
  expenses: Expense[];
  loading: boolean;
  isAuthChecking: boolean;
  settings: LibrarySettings | null;
}

export interface Staff {
  id: string;
  libraryId: string;
  fullName: string;
  role: string;
  phone: string;
  countryCode?: string;
  salary: number;
  joiningDate: string;
  status: 'Active' | 'Inactive';
  address?: string;
  idProofNumber?: string;
  photoUrl?: string;
  createdAt?: string;
}

export interface StaffSalaryPayment {
  id: string;
  libraryId: string;
  staffId: string;
  amount: number;
  date: string;
  status: 'Paid' | 'Pending' | 'Partial';
  note?: string;
  paymentMode?: 'Cash' | 'Online';
  createdAt?: string;
}

export interface Expense {
  id: string;
  libraryId: string;
  category: string;
  amount: number;
  date: string;
  note?: string;
  createdAt?: string;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [deletedPayments, setDeletedPayments] = useState<DeletedPayment[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [staffSalaryPayments, setStaffSalaryPayments] = useState<StaffSalaryPayment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settings, setSettings] = useState<LibrarySettings | null>(null);
  const [activeLibraryId, setActiveLibraryId] = useState<string | null>(() => {
    return sessionStorage.getItem('librarypro_library_id');
  });
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(() => {
    return sessionStorage.getItem('librarypro_is_superadmin') === 'true';
  });
  const isAuthenticated = !!activeLibraryId;
  const [loading, setLoading] = useState(true);
  const [isAuthChecking, setIsAuthChecking] = useState(true);



  useEffect(() => {
    const handleAuthSession = async (session: any) => {
      if (!session?.user?.email) {
        setIsAuthChecking(false);
        return;
      }

      try {
        // Fetch user from authorized_users table
        const { data: authorizedUser, error } = await supabase
          .from('authorized_users')
          .select('*')
          .eq('email', session.user.email)
          .single();

        if (error || !authorizedUser) {
          // User is not authorized
          toast.error("Access Denied: Your email is not authorized.");
          await supabase.auth.signOut();
          setActiveLibraryId(null);
          setIsSuperAdmin(false);
          sessionStorage.removeItem('librarypro_library_id');
          sessionStorage.removeItem('librarypro_is_superadmin');
          return;
        }

        // Super Admin Check using the 'role' column
        if (authorizedUser.role === 'superadmin') {
          setIsSuperAdmin(true);
          sessionStorage.setItem('librarypro_is_superadmin', 'true');

          // If they don't have a specific library selected, default to 'superadmin' string
          const currentLib = sessionStorage.getItem('librarypro_library_id');
          if (!currentLib || currentLib === 'superadmin') {
            setActiveLibraryId('superadmin');
            sessionStorage.setItem('librarypro_library_id', 'superadmin');
          } else {
            setActiveLibraryId(currentLib);
          }
          toast.success(`Welcome back, Super Admin!`);
          return;
        }

        // Normal User Path
        // User is authorized, set their own unique ID for multi-tenancy
        const userId = session.user.id;

        // Automatically link their library UUID if missing
        if (authorizedUser.user_id !== userId) {
          await supabase.from('authorized_users').update({ user_id: userId }).eq('email', session.user.email);
        }

        setActiveLibraryId(userId);
        setIsSuperAdmin(false);
        sessionStorage.setItem('librarypro_library_id', userId);
        sessionStorage.removeItem('librarypro_is_superadmin');
        toast.success(`Welcome back, ${session.user.email}!`);
      } catch (err) {
        console.error('Authorization check failed:', err);
        toast.error("Failed to verify authorization.");
      } finally {
        setIsAuthChecking(false);
      }
    };

    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      await handleAuthSession(session);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        // Avoid double-checking if we just mounted
        if (!isAuthChecking) {
          setIsAuthChecking(true);
          await handleAuthSession(session);
        }
      } else {
        setActiveLibraryId(null);
        setIsSuperAdmin(false);
        sessionStorage.removeItem('librarypro_library_id');
        sessionStorage.removeItem('librarypro_is_superadmin');
        setIsAuthChecking(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const ensureSession = useCallback(async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      toast.error('Your session has expired. Please sign in again.');
      throw new Error('Session expired');
    }
  }, []);

  const fetchMembers = useCallback(async () => {
    if (!activeLibraryId) return;
    const { data: membersData, error } = await supabase
      .from('members')
      .select('*')
      .eq('libraryId', activeLibraryId);

    if (error) {
      console.error('Error fetching members:', error);
      toast.error('Failed to sync members from Supabase');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const processedMembers = membersData.map((data: any) => {
      const expiryDate = new Date(data.expiryDate);
      expiryDate.setHours(0, 0, 0, 0);

      const daysDiff = differenceInDays(expiryDate, today);

      let status = data.status;
      if (expiryDate < today) {
        status = 'Expired';
      } else if (daysDiff >= 0 && daysDiff <= 7) {
        status = 'Expiring Soon';
      } else {
        status = 'Active';
      }

      return {
        ...data,
        status
      };
    }) as Member[];

    setMembers(processedMembers);
  }, [activeLibraryId]);

  const fetchPayments = useCallback(async () => {
    if (!activeLibraryId) return;
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('libraryId', activeLibraryId);

    if (error) {
      console.error('Error fetching payments:', error);
      return;
    }
    setPayments(data as Payment[]);
  }, [activeLibraryId]);

  const fetchDeletedPayments = useCallback(async () => {
    if (!activeLibraryId) return;
    const { data, error } = await supabase
      .from('deleted_payments')
      .select('*')
      .eq('libraryId', activeLibraryId);

    if (error) {
      console.error('Error fetching deleted payments:', error);
      return;
    }
    setDeletedPayments(data as DeletedPayment[]);
  }, [activeLibraryId]);

  const fetchSettings = useCallback(async () => {
    if (!activeLibraryId) return;
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('id', activeLibraryId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is no rows returned
      console.error('Error fetching settings:', error);
      return;
    }
    setSettings(data ? (data as LibrarySettings) : {});
  }, [activeLibraryId]);

  const fetchStaff = useCallback(async () => {
    if (!activeLibraryId) return;
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('libraryId', activeLibraryId);

    if (error) {
      console.error('Error fetching staff:', error);
      return;
    }
    setStaff(data as Staff[]);
  }, [activeLibraryId]);

  const fetchStaffSalaryPayments = useCallback(async () => {
    if (!activeLibraryId) return;
    const { data, error } = await supabase
      .from('staff_salary_payments')
      .select('*')
      .eq('libraryId', activeLibraryId);

    if (error) {
      console.error('Error fetching staff salary payments:', error);
      return;
    }
    setStaffSalaryPayments(data as StaffSalaryPayment[]);
  }, [activeLibraryId]);

  const fetchExpenses = useCallback(async () => {
    if (!activeLibraryId) return;
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('libraryId', activeLibraryId);

    if (error) {
      console.error('Error fetching expenses:', error);
      return;
    }
    setExpenses(data as Expense[]);
  }, [activeLibraryId]);

  const fetchData = useCallback(async () => {
    if (!activeLibraryId || activeLibraryId === 'superadmin') return;
    setLoading(true);
    await Promise.all([
      fetchMembers(),
      fetchPayments(),
      fetchDeletedPayments(),
      fetchSettings(),
      fetchStaff(),
      fetchStaffSalaryPayments(),
      fetchExpenses()
    ]);
    setLoading(false);
  }, [activeLibraryId, fetchMembers, fetchPayments, fetchDeletedPayments, fetchSettings, fetchStaff, fetchStaffSalaryPayments, fetchExpenses]);

  useEffect(() => {
    if (!activeLibraryId || activeLibraryId === 'superadmin') {
      setMembers([]);
      setPayments([]);
      setDeletedPayments([]);
      setSettings(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Initial data fetch
    Promise.all([
      fetchMembers(),
      fetchPayments(),
      fetchDeletedPayments(),
      fetchSettings(),
      fetchStaff(),
      fetchStaffSalaryPayments(),
      fetchExpenses()
    ]).finally(() => setLoading(false));

    // Supabase Realtime Subscriptions
    const membersChannel = supabase.channel('members_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => {
        fetchMembers();
      }).subscribe();

    const paymentsChannel = supabase.channel('payments_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        fetchPayments();
      }).subscribe();

    const deletedPaymentsChannel = supabase.channel('deleted_payments_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deleted_payments' }, () => {
        fetchDeletedPayments();
      }).subscribe();

    const settingsChannel = supabase.channel('settings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => {
        fetchSettings();
      }).subscribe();

    const staffChannel = supabase.channel('staff_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, () => {
        fetchStaff();
      }).subscribe();

    const staffPaymentsChannel = supabase.channel('staff_salary_payments_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_salary_payments' }, () => {
        fetchStaffSalaryPayments();
      }).subscribe();

    const expensesChannel = supabase.channel('expenses_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => {
        fetchExpenses();
      }).subscribe();

    return () => {
      supabase.removeChannel(membersChannel);
      supabase.removeChannel(paymentsChannel);
      supabase.removeChannel(deletedPaymentsChannel);
      supabase.removeChannel(settingsChannel);
      supabase.removeChannel(staffChannel);
      supabase.removeChannel(staffPaymentsChannel);
      supabase.removeChannel(expensesChannel);
    };
  }, [activeLibraryId, fetchMembers, fetchPayments, fetchDeletedPayments, fetchSettings, fetchStaff, fetchStaffSalaryPayments, fetchExpenses]);

  const login = useCallback((email: string, password: string) => {
    // Legacy credentials login removed in favor of Google OAuth
    toast.error("Please sign in with Google.");
    return false;
  }, []);

  const loginWithGoogle = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error logging in with Google:', error);
      toast.error('Failed to log in with Google');
    }
  }, []);

  const logout = useCallback(async () => {
    setActiveLibraryId(null);
    setIsSuperAdmin(false);
    sessionStorage.removeItem('librarypro_library_id');
    sessionStorage.removeItem('librarypro_is_superadmin');
    await supabase.auth.signOut();
  }, []);

  const switchLibrary = useCallback((libraryId: string) => {
    setActiveLibraryId(libraryId);
    sessionStorage.setItem('librarypro_library_id', libraryId);
  }, []);

  const addMember = useCallback(async (member: Omit<Member, 'id' | 'libraryId'>, photoBase64?: string) => {
    if (!activeLibraryId) throw new Error('Cannot add member: No active library session');
    try {
      let finalPhotoUrl = null;

      if (photoBase64) {
        // Convert base64 to blob
        const base64Data = photoBase64.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/webp' });

        const fileName = `${activeLibraryId}/${uuidv4()}.webp`;

        const { error: uploadError } = await supabase.storage
          .from('member-photos')
          .upload(fileName, blob, {
            contentType: 'image/webp',
            upsert: false
          });

        if (uploadError) {
          console.error("Photo upload failed:", uploadError);
          toast.error("Failed to upload member photo, but will continue inserting member.");
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('member-photos')
            .getPublicUrl(fileName);
            
          finalPhotoUrl = publicUrlData.publicUrl;
        }
      }

      const { data, error } = await supabase.from('members').insert([{
        ...member,
        libraryId: activeLibraryId,
        photoUrl: finalPhotoUrl
      }]).select().single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error('Failed to add member');
      throw error;
    }
  }, [activeLibraryId]);

  const updateMember = useCallback(async (id: string, data: Partial<Member>) => {
    try {
      const { error } = await supabase.from('members').update(data).eq('id', id);
      if (error) throw error;
      setMembers(prev => prev.map(m => m.id === id ? { ...m, ...data } : m));
    } catch (error) {
      console.error('Error updating member:', error);
      toast.error('Failed to update member');
      throw error;
    }
  }, []);

  const deleteMember = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('members').delete().eq('id', id);
      if (error) throw error;
      setMembers(prev => prev.filter(m => m.id !== id));
    } catch (error) {
      console.error('Error deleting member:', error);
      toast.error('Failed to delete member');
      throw error;
    }
  }, []);

  const upgradeMember = useCallback(async (id: string, additionalMonths: number, additionalDays?: number) => {
    try {
      const member = members.find(m => m.id === id);
      if (!member) throw new Error('Member not found from local state');

      const currentExpiry = new Date(member.expiryDate);
      const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
      const newExpiry = additionalDays
        ? addDays(baseDate, additionalDays)
        : addMonths(baseDate, additionalMonths);

      const updateData: Partial<Member> = {
        months: member.months + additionalMonths,
        expiryDate: format(newExpiry, 'yyyy-MM-dd'),
        status: 'Active',
      };

      if (additionalDays) {
        updateData.customDays = (member.customDays || 0) + additionalDays;
      }

      const { error } = await supabase.from('members').update(updateData).eq('id', id);
      if (error) throw error;

    } catch (error) {
      console.error('Error upgrading member:', error);
      toast.error('Failed to upgrade member');
      throw error;
    }
  }, [members]);

  const addPayment = useCallback(async (payment: Omit<Payment, 'id' | 'libraryId'>) => {
    if (!activeLibraryId) throw new Error('Cannot register payment: No active library session');
    try {
      const { data, error } = await supabase.from('payments').insert([{
        ...payment,
        libraryId: activeLibraryId
      }]).select().single();
      if (error) throw error;
      setPayments(prev => [...prev, data as Payment]);
    } catch (error) {
      console.error('Error adding payment:', error);
      toast.error('Failed to add payment');
      throw error;
    }
  }, [activeLibraryId]);

  const deletePayment = useCallback(async (id: string) => {
    try {
      const paymentToDel = payments.find(p => p.id === id);
      if (!paymentToDel) throw new Error('Payment not found');

      const { id: paymentId, ...paymentData } = paymentToDel;

      const { data: insertedDeletedPayment, error: insertError } = await supabase.from('deleted_payments').insert([{
        ...paymentData,
        originalPaymentId: paymentId,
        deletedAt: new Date().toISOString()
      }]).select().single();

      if (insertError) throw insertError;

      const { error: deleteError } = await supabase.from('payments').delete().eq('id', id);
      if (deleteError) throw deleteError;

      setPayments(prev => prev.filter(p => p.id !== id));
      if (insertedDeletedPayment) {
        setDeletedPayments(prev => [insertedDeletedPayment as DeletedPayment, ...prev]);
      }

      // Reverse the duration added by this payment on the member's profile
      const member = members.find(m => m.id === paymentToDel.memberId);
      if (member && (paymentToDel.months > 0 || (paymentToDel.customDays ?? 0) > 0)) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let newExpiry = new Date(member.expiryDate);
        if (paymentToDel.customDays && paymentToDel.customDays > 0) {
          newExpiry = subDays(newExpiry, paymentToDel.customDays);
        } else if (paymentToDel.months > 0) {
          newExpiry = subMonths(newExpiry, paymentToDel.months);
        }

        const newExpiryFormatted = format(newExpiry, 'yyyy-MM-dd');
        const daysDiff = differenceInDays(newExpiry, today);
        const newStatus: Member['status'] = newExpiry < today ? 'Expired' : daysDiff <= 7 ? 'Expiring Soon' : 'Active';

        const newMonths = Math.max(0, member.months - (paymentToDel.months ?? 0));
        const newCustomDays = Math.max(0, (member.customDays ?? 0) - (paymentToDel.customDays ?? 0));

        const memberUpdate: Partial<Member> = {
          expiryDate: newExpiryFormatted,
          months: newMonths,
          status: newStatus,
          ...(member.customDays !== undefined ? { customDays: newCustomDays } : {}),
        };

        const { error: memberUpdateError } = await supabase.from('members').update(memberUpdate).eq('id', member.id);
        if (memberUpdateError) {
          console.error('Failed to reverse member duration after payment delete:', memberUpdateError);
          toast.error('Payment deleted, but failed to update member duration.');
        } else {
          setMembers(prev => prev.map(m => m.id === member.id ? { ...m, ...memberUpdate } : m));
        }
      }

      toast.success('Payment deleted and member duration updated');
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error('Failed to delete payment');
      throw error;
    }
  }, [payments, members]);

  const clearDeletedPayments = useCallback(async (_password: string) => {
    try {
      if (!activeLibraryId) return;
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        toast.error('You must be logged in to perform this action');
        throw new Error('Not authenticated');
      }

      const { error } = await supabase.from('deleted_payments').delete().eq('libraryId', activeLibraryId);
      if (error) throw error;

      setDeletedPayments([]);
      toast.success('Deleted payments cleared');
    } catch (error) {
      console.error('Error clearing deleted payments:', error);
      toast.error('Failed to clear deleted payments');
      throw error;
    }
  }, [activeLibraryId]);

  const updatePayment = useCallback(async (id: string, updates: Partial<Payment>) => {
    if (!activeLibraryId) throw new Error('No active library session');
    try {
      const { error } = await supabase
        .from('payments')
        .update(updates)
        .eq('id', id)
        .eq('libraryId', activeLibraryId);

      if (error) throw error;

      setPayments(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('Failed to update payment');
      throw error;
    }
  }, [activeLibraryId]);

  const updateSettings = useCallback(async (newSettings: Partial<LibrarySettings>) => {
    if (!activeLibraryId) throw new Error('No active library session');
    try {
      const { error } = await supabase.from('settings').upsert({
        id: activeLibraryId,
        ...newSettings
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
      throw error;
    }
  }, [activeLibraryId]);

  const addStaff = useCallback(async (staffMember: Omit<Staff, 'id' | 'libraryId'>, photoBase64?: string) => {
    if (!activeLibraryId) throw new Error('No active library session');
    try {
      await ensureSession();
      let finalPhotoUrl = null;

      if (photoBase64) {
        // Convert base64 to blob
        const base64Data = photoBase64.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/webp' });

        const fileName = `${activeLibraryId}/${uuidv4()}.webp`;

        const { error: uploadError } = await supabase.storage
          .from('staff-photos')
          .upload(fileName, blob, {
            contentType: 'image/webp',
            upsert: false
          });

        if (uploadError) {
          console.error("Staff photo upload failed:", uploadError);
          toast.error("Failed to upload staff photo, but will continue inserting staff.");
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('staff-photos')
            .getPublicUrl(fileName);
            
          finalPhotoUrl = publicUrlData.publicUrl;
        }
      }

      const { data, error } = await supabase.from('staff').insert([{
        ...staffMember,
        libraryId: activeLibraryId,
        photoUrl: finalPhotoUrl
      }]).select().single();
      
      if (error) throw error;
      setStaff(prev => [...prev, data as Staff]);
      return data.id;
    } catch (error: any) {
      console.error('Error adding staff:', error);
      toast.error(error.message || 'Failed to add staff');
      throw error;
    }
  }, [activeLibraryId, ensureSession]);

  const updateStaff = useCallback(async (id: string, data: Partial<Staff>) => {
    try {
      const { error } = await supabase.from('staff').update(data).eq('id', id);
      if (error) throw error;
      setStaff(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
    } catch (error) {
      console.error('Error updating staff:', error);
      toast.error('Failed to update staff');
      throw error;
    }
  }, []);

  const deleteStaff = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('staff').delete().eq('id', id);
      if (error) throw error;
      setStaff(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error deleting staff:', error);
      toast.error('Failed to delete staff');
      throw error;
    }
  }, []);

  const addStaffSalaryPayment = useCallback(async (payment: Omit<StaffSalaryPayment, 'id' | 'libraryId'>) => {
    if (!activeLibraryId) throw new Error('No active library session');
    try {
      await ensureSession();
      const { data, error } = await supabase.from('staff_salary_payments').insert([{
        ...payment,
        libraryId: activeLibraryId
      }]).select().single();
      if (error) throw error;
      setStaffSalaryPayments(prev => [...prev, data as StaffSalaryPayment]);
      toast.success('Salary payment recorded');
    } catch (error: any) {
      console.error('Error adding staff salary payment:', error);
      toast.error(error.message || 'Failed to add salary payment');
      throw error;
    }
  }, [activeLibraryId, ensureSession]);

  const updateStaffSalaryPayment = useCallback(async (id: string, updates: Partial<StaffSalaryPayment>) => {
    if (!activeLibraryId) throw new Error('No active library session');
    try {
      const { error } = await supabase
        .from('staff_salary_payments')
        .update(updates)
        .eq('id', id)
        .eq('libraryId', activeLibraryId);
      if (error) throw error;
      setStaffSalaryPayments(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    } catch (error) {
      console.error('Error updating staff salary payment:', error);
      toast.error('Failed to update salary payment');
      throw error;
    }
  }, [activeLibraryId]);

  const deleteStaffSalaryPayment = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('staff_salary_payments').delete().eq('id', id);
      if (error) throw error;
      setStaffSalaryPayments(prev => prev.filter(p => p.id !== id));
      toast.success('Salary payment deleted');
    } catch (error) {
      console.error('Error deleting staff salary payment:', error);
      toast.error('Failed to delete salary payment');
      throw error;
    }
  }, []);

  const addExpense = useCallback(async (expense: Omit<Expense, 'id' | 'libraryId'>) => {
    if (!activeLibraryId) throw new Error('No active library session');
    try {
      await ensureSession();
      const { data, error } = await supabase.from('expenses').insert([{
        ...expense,
        libraryId: activeLibraryId
      }]).select().single();
      if (error) throw error;
      if (data) setExpenses(prev => [...prev, data as Expense]);
      toast.success('Expense recorded');
    } catch (error: any) {
      console.error('Error adding expense:', error);
      toast.error(error.message || 'Failed to add expense');
      throw error;
    }
  }, [activeLibraryId, ensureSession]);

  const deleteExpense = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      setExpenses(prev => prev.filter(e => e.id !== id));
      toast.success('Expense deleted');
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
      throw error;
    }
  }, []);

  return (
    <LibraryContext.Provider value={{
      members, payments, deletedPayments, isAuthenticated, isSuperAdmin, activeLibraryId, login, loginWithGoogle, logout, addMember, updateMember, deleteMember,
      upgradeMember,
      addPayment,
      updatePayment,
      deletePayment, clearDeletedPayments, updateSettings, fetchData, switchLibrary, loading, isAuthChecking, settings,
      staff, staffSalaryPayments, addStaff, updateStaff, deleteStaff, addStaffSalaryPayment, updateStaffSalaryPayment, deleteStaffSalaryPayment,
      expenses, addExpense, deleteExpense
    }}>
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (!context) throw new Error('useLibrary must be used within LibraryProvider');
  return context;
}
