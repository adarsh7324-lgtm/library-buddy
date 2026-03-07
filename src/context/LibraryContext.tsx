import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { addMonths, addDays, format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

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
  customDays?: number;
  photoUrl?: string;
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
  deletePayment: (id: string) => Promise<void>;
  clearDeletedPayments: (password: string) => Promise<void>;
  updateSettings: (settings: Partial<LibrarySettings>) => Promise<void>;
  fetchData: () => Promise<void>;
  switchLibrary: (libraryId: string) => void;
  loading: boolean;
  isAuthChecking: boolean;
  settings: LibrarySettings | null;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [deletedPayments, setDeletedPayments] = useState<DeletedPayment[]>([]);
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setLoading(false);
  }, []);

  useEffect(() => {
    const handleAuthSession = async (session: any) => {
      if (!session?.user?.email) {
        setIsAuthChecking(false);
        return;
      }

      try {
        // Super Admin Check
        if (session.user.email === 'adarsh7324@gmail.com') {
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

        // Normal User Check against authorized_users table
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
        } else {
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
        }
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
      fetchSettings()
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

    return () => {
      supabase.removeChannel(membersChannel);
      supabase.removeChannel(paymentsChannel);
      supabase.removeChannel(deletedPaymentsChannel);
      supabase.removeChannel(settingsChannel);
    };
  }, [activeLibraryId, fetchMembers, fetchPayments, fetchDeletedPayments, fetchSettings]);

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
      const { data, error } = await supabase.from('members').insert([{
        ...member,
        libraryId: activeLibraryId,
        photoUrl: photoBase64 || null
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
      const { error } = await supabase.from('payments').insert([{
        ...payment,
        libraryId: activeLibraryId
      }]);
      if (error) throw error;
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

      const { error: insertError } = await supabase.from('deleted_payments').insert([{
        ...paymentData,
        originalPaymentId: paymentId,
        deletedAt: new Date().toISOString()
      }]);

      if (insertError) throw insertError;

      const { error: deleteError } = await supabase.from('payments').delete().eq('id', id);
      if (deleteError) throw deleteError;

      toast.success('Payment deleted');
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error('Failed to delete payment');
      throw error;
    }
  }, [payments]);

  const clearDeletedPayments = useCallback(async (password: string) => {
    if (password !== 'Password@813') {
      toast.error('Incorrect password');
      throw new Error('Incorrect password');
    }

    try {
      if (!activeLibraryId) return;
      const { error } = await supabase.from('deleted_payments').delete().eq('libraryId', activeLibraryId);
      if (error) throw error;

      toast.success('Deleted payments cleared');
    } catch (error) {
      console.error('Error clearing deleted payments:', error);
      toast.error('Failed to clear deleted payments');
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

  return (
    <LibraryContext.Provider value={{ members, payments, deletedPayments, isAuthenticated, isSuperAdmin, activeLibraryId, login, loginWithGoogle, logout, addMember, updateMember, deleteMember, upgradeMember, addPayment, deletePayment, clearDeletedPayments, updateSettings, fetchData, switchLibrary, loading, isAuthChecking, settings }}>
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (!context) throw new Error('useLibrary must be used within LibraryProvider');
  return context;
}
