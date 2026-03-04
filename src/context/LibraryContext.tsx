import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { addMonths, format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

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

// --- Snake_case <-> camelCase mapping helpers ---
function memberFromDb(row: any): Member {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    countryCode: row.country_code,
    address: row.address,
    idProofNumber: row.id_proof_number,
    months: row.months,
    feesPaid: row.fees_paid,
    startDate: row.start_date,
    expiryDate: row.expiry_date,
    status: row.status,
  };
}

function memberToDb(member: Partial<Member>): Record<string, any> {
  const map: Record<string, any> = {};
  if (member.fullName !== undefined) map.full_name = member.fullName;
  if (member.phone !== undefined) map.phone = member.phone;
  if (member.countryCode !== undefined) map.country_code = member.countryCode;
  if (member.address !== undefined) map.address = member.address;
  if (member.idProofNumber !== undefined) map.id_proof_number = member.idProofNumber;
  if (member.months !== undefined) map.months = member.months;
  if (member.feesPaid !== undefined) map.fees_paid = member.feesPaid;
  if (member.startDate !== undefined) map.start_date = member.startDate;
  if (member.expiryDate !== undefined) map.expiry_date = member.expiryDate;
  if (member.status !== undefined) map.status = member.status;
  return map;
}

function paymentFromDb(row: any): Payment {
  return {
    id: row.id,
    memberId: row.member_id,
    amount: row.amount,
    months: row.months,
    date: row.date,
    note: row.note,
  };
}

function paymentToDb(payment: Partial<Payment>): Record<string, any> {
  const map: Record<string, any> = {};
  if (payment.memberId !== undefined) map.member_id = payment.memberId;
  if (payment.amount !== undefined) map.amount = payment.amount;
  if (payment.months !== undefined) map.months = payment.months;
  if (payment.date !== undefined) map.date = payment.date;
  if (payment.note !== undefined) map.note = payment.note;
  return map;
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
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('librarypro_auth') === 'true';
  });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const [membersResponse, paymentsResponse] = await Promise.all([
        supabase.from('members').select('*'),
        supabase.from('payments').select('*')
      ]);

      if (membersResponse.error) {
        console.error('Error fetching members:', membersResponse.error);
      } else if (membersResponse.data) {
        setMembers(membersResponse.data.map(memberFromDb));
      }

      if (paymentsResponse.error) {
        console.error('Error fetching payments:', paymentsResponse.error);
      } else if (paymentsResponse.data) {
        setPayments(paymentsResponse.data.map(paymentFromDb));
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const login = useCallback((email: string, password: string) => {
    if (email === 'admin@librarypro.com' && password === 'admin123') {
      setIsAuthenticated(true);
      sessionStorage.setItem('librarypro_auth', 'true');
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('librarypro_auth');
  }, []);

  const addMember = useCallback(async (member: Omit<Member, 'id'>) => {
    const dbData = memberToDb(member);
    console.log('Adding member with data:', dbData);
    const { data, error } = await supabase.from('members').insert([dbData]).select().single();
    if (error) {
      console.error('Error adding member:', error.message, error.details, error.hint);
      throw error;
    }
    console.log('Member added successfully:', data);
    const mapped = memberFromDb(data);
    setMembers(prev => [...prev, mapped]);
    return mapped.id;
  }, []);

  const updateMember = useCallback(async (id: string, data: Partial<Member>) => {
    const dbData = memberToDb(data);
    const { error } = await supabase.from('members').update(dbData).eq('id', id);
    if (error) {
      throw error;
    }

    setMembers(prev => prev.map(m => m.id === id ? { ...m, ...data } : m));
  }, []);

  const deleteMember = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    setMembers(prev => prev.filter(m => m.id !== id));
  }, []);

  const upgradeMember = useCallback(async (id: string, additionalMonths: number) => {
    const member = members.find(m => m.id === id);
    if (!member) throw new Error('Member not found');

    const currentExpiry = new Date(member.expiryDate);
    const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
    const newExpiry = addMonths(baseDate, additionalMonths);

    const updateData: Partial<Member> = {
      months: member.months + additionalMonths,
      expiryDate: format(newExpiry, 'yyyy-MM-dd'),
      status: 'Active',
    };

    const dbData = memberToDb(updateData);
    const { error } = await supabase.from('members').update(dbData).eq('id', id);
    if (error) {
      throw error;
    }

    setMembers(prev => prev.map(m => {
      if (m.id !== id) return m;
      return { ...m, ...updateData };
    }));
  }, [members]);

  const addPayment = useCallback(async (payment: Omit<Payment, 'id'>) => {
    const dbData = paymentToDb(payment);
    const { data, error } = await supabase.from('payments').insert([dbData]).select().single();
    if (error) {
      throw error;
    }
    setPayments(prev => [...prev, paymentFromDb(data)]);
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

