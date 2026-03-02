import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { addMonths, format } from 'date-fns';
import { supabase } from '@/lib/supabase';

export interface Member {
  id: string;
  fullName: string;
  phone: string;
  countryCode: string;
  address: string;
  idProofNumber: string;
  months: number;
  feesPaid: number;
  startDate: string;
  expiryDate: string;
  status: 'Active' | 'Expired';
}

export interface Payment {
  id: string;
  memberId: string;
  amount: number;
  months: number;
  date: string;
  note: string;
}

interface LibraryContextType {
  members: Member[];
  payments: Payment[];
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  addMember: (member: Omit<Member, 'id'>) => Promise<string>;
  updateMember: (id: string, member: Partial<Member>) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  upgradeMember: (id: string, additionalMonths: number) => Promise<void>;
  addPayment: (payment: Omit<Payment, 'id'>) => Promise<void>;
  fetchData: () => Promise<void>;
  loading: boolean;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [membersRes, paymentsRes] = await Promise.all([
        supabase.from('members').select('*'),
        supabase.from('payments').select('*'),
      ]);

      if (membersRes.data) {
        setMembers(membersRes.data as Member[]);
      }
      if (paymentsRes.data) {
        setPayments(paymentsRes.data as Payment[]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const login = useCallback((email: string, password: string) => {
    // Keep local simple auth for now unless requested
    if (email === 'admin@librarypro.com' && password === 'admin123') {
      setIsAuthenticated(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => setIsAuthenticated(false), []);

  const addMember = useCallback(async (member: Omit<Member, 'id'>) => {
    const { data, error } = await supabase.from('members').insert([member]).select().single();
    if (error) {
      console.error('Error adding member:', error);
      throw error;
    }

    setMembers(prev => [...prev, data]);
    return data.id;
  }, []);

  const updateMember = useCallback(async (id: string, data: Partial<Member>) => {
    const { error } = await supabase.from('members').update(data).eq('id', id);
    if (error) {
      console.error('Error updating member:', error);
      throw error;
    }
    setMembers(prev => prev.map(m => m.id === id ? { ...m, ...data } : m));
  }, []);

  const deleteMember = useCallback(async (id: string) => {
    const { error } = await supabase.from('members').delete().eq('id', id);
    if (error) {
      console.error('Error deleting member:', error);
      throw error;
    }
    setMembers(prev => prev.filter(m => m.id !== id));
  }, []);

  const upgradeMember = useCallback(async (id: string, additionalMonths: number) => {
    const member = members.find(m => m.id === id);
    if (!member) return;

    const currentExpiry = new Date(member.expiryDate);
    const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
    const newExpiry = addMonths(baseDate, additionalMonths);

    const updateData = {
      months: member.months + additionalMonths,
      expiryDate: format(newExpiry, 'yyyy-MM-dd'),
      status: 'Active' as const,
    };

    const { error } = await supabase.from('members').update(updateData).eq('id', id);
    if (error) {
      console.error('Error upgrading member:', error);
      throw error;
    }

    setMembers(prev => prev.map(m => {
      if (m.id !== id) return m;
      return { ...m, ...updateData };
    }));
  }, [members]);

  const addPayment = useCallback(async (payment: Omit<Payment, 'id'>) => {
    const { data, error } = await supabase.from('payments').insert([payment]).select().single();
    if (error) {
      console.error('Error adding payment:', error);
      throw error;
    }
    setPayments(prev => [...prev, data]);
  }, []);

  return (
    <LibraryContext.Provider value={{ members, payments, isAuthenticated, login, logout, addMember, updateMember, deleteMember, upgradeMember, addPayment, fetchData, loading }}>
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (!context) throw new Error('useLibrary must be used within LibraryProvider');
  return context;
}
