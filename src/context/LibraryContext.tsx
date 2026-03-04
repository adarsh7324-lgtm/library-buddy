import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { addMonths, format } from 'date-fns';
import { toast } from 'sonner';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
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
    // This function is kept for backward compatibility with components that might call it,
    // but the actual fetching is now handled by the real-time listeners in useEffect.
    setLoading(true);
    // Mimic the delay of a fetch to ensure loading states still trigger
    await new Promise(resolve => setTimeout(resolve, 500));
    setLoading(false);
  }, []);

  useEffect(() => {
    setLoading(true);

    const unsubscribeMembers = onSnapshot(collection(db, 'members'), (snapshot) => {
      const membersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Member[];
      setMembers(membersData);
      setLoading(false); // Stop loading once first members arrive
    }, (error) => {
      console.error('Error listening to members:', error);
      toast.error('Failed to sync data from Firebase');
      setLoading(false);
    });

    const unsubscribePayments = onSnapshot(collection(db, 'payments'), (snapshot) => {
      const paymentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Payment[];
      setPayments(paymentsData);
    }, (error) => {
      console.error('Error listening to payments:', error);
    });

    return () => {
      unsubscribeMembers();
      unsubscribePayments();
    };
  }, []);

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
    } catch (error) {
      console.error('Error deleting member:', error);
      toast.error('Failed to delete member');
      throw error;
    }
  }, []);

  const upgradeMember = useCallback(async (id: string, additionalMonths: number) => {
    try {
      // Find the current member state locally to calculate the new expiry
      const member = members.find(m => m.id === id);
      if (!member) throw new Error('Member not found from local state');

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

    } catch (error) {
      console.error('Error upgrading member:', error);
      toast.error('Failed to upgrade member');
      throw error;
    }
  }, [members]);

  const addPayment = useCallback(async (payment: Omit<Payment, 'id'>) => {
    try {
      await addDoc(collection(db, 'payments'), payment);
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

