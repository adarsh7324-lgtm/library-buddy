import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { addMonths, format } from 'date-fns';
import { toast } from 'sonner';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

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
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('librarypro_auth') === 'true';
  });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const membersSnapshot = await getDocs(collection(db, 'members'));
      const membersData = membersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Member[];

      const paymentsSnapshot = await getDocs(collection(db, 'payments'));
      const paymentsData = paymentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Payment[];

      setMembers(membersData);
      setPayments(paymentsData);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data from Firebase');
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
    try {
      const docRef = await addDoc(collection(db, 'members'), member);
      const newMember = { ...member, id: docRef.id };
      setMembers(prev => [...prev, newMember]);
      return docRef.id;
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error('Failed to add member');
      throw error;
    }
  }, []);

  const updateMember = useCallback(async (id: string, data: Partial<Member>) => {
    try {
      const memberRef = doc(db, 'members', id);
      await updateDoc(memberRef, data);
      setMembers(prev => prev.map(m => m.id === id ? { ...m, ...data } : m));
    } catch (error) {
      console.error('Error updating member:', error);
      toast.error('Failed to update member');
      throw error;
    }
  }, []);

  const deleteMember = useCallback(async (id: string) => {
    try {
      const memberRef = doc(db, 'members', id);
      await deleteDoc(memberRef);
      setMembers(prev => prev.filter(m => m.id !== id));
    } catch (error) {
      console.error('Error deleting member:', error);
      toast.error('Failed to delete member');
      throw error;
    }
  }, []);

  const upgradeMember = useCallback(async (id: string, additionalMonths: number) => {
    try {
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

      const memberRef = doc(db, 'members', id);
      await updateDoc(memberRef, updateData);

      setMembers(prev => prev.map(m => m.id === id ? { ...m, ...updateData } : m));
    } catch (error) {
      console.error('Error upgrading member:', error);
      toast.error('Failed to upgrade member');
      throw error;
    }
  }, [members]);

  const addPayment = useCallback(async (payment: Omit<Payment, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'payments'), payment);
      const newPayment = { ...payment, id: docRef.id };
      setPayments(prev => [...prev, newPayment]);
    } catch (error) {
      console.error('Error adding payment:', error);
      toast.error('Failed to add payment');
      throw error;
    }
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

