import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { addMonths, format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

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
  photoUrl?: string;
}

export interface Payment {
  id: string;
  libraryId: string;
  memberId: string;
  amount: number;
  months: number;
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
  activeLibraryId: string | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  addMember: (member: Omit<Member, 'id' | 'libraryId'>, photoBase64?: string) => Promise<string>;
  updateMember: (id: string, member: Partial<Member>) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  upgradeMember: (id: string, additionalMonths: number) => Promise<void>;
  addPayment: (payment: Omit<Payment, 'id' | 'libraryId'>) => Promise<void>;
  deletePayment: (id: string) => Promise<void>;
  clearDeletedPayments: (password: string) => Promise<void>;
  fetchData: () => Promise<void>;
  loading: boolean;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

const LIBRARIES = [
  { id: 'librarypro', email: 'admin@librarypro.com', password: 'admin123' },
  { id: 'alphalibrary', email: 'alphalibrary@coppercore.co', password: 'CopperCore#1' }
];

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [deletedPayments, setDeletedPayments] = useState<DeletedPayment[]>([]);
  const [activeLibraryId, setActiveLibraryId] = useState<string | null>(() => {
    return sessionStorage.getItem('librarypro_library_id');
  });
  const isAuthenticated = !!activeLibraryId;
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
    if (!activeLibraryId) {
      setMembers([]);
      setPayments([]);
      setDeletedPayments([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const membersQuery = query(collection(db, 'members'), where('libraryId', '==', activeLibraryId));
    const unsubscribeMembers = onSnapshot(membersQuery, (snapshot) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today

      const membersData = snapshot.docs.map(doc => {
        const data = doc.data() as Omit<Member, 'id'>;
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
          id: doc.id,
          ...data,
          status
        };
      }) as Member[];
      setMembers(membersData);
      setLoading(false); // Stop loading once first members arrive
    }, (error) => {
      console.error('Error listening to members:', error);
      toast.error('Failed to sync data from Firebase');
      setLoading(false);
    });

    const paymentsQuery = query(collection(db, 'payments'), where('libraryId', '==', activeLibraryId));
    const unsubscribePayments = onSnapshot(paymentsQuery, (snapshot) => {
      const paymentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Payment[];
      setPayments(paymentsData);
    }, (error) => {
      console.error('Error listening to payments:', error);
    });

    const deletedPaymentsQuery = query(collection(db, 'deleted_payments'), where('libraryId', '==', activeLibraryId));
    const unsubscribeDeletedPayments = onSnapshot(deletedPaymentsQuery, (snapshot) => {
      const dpData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DeletedPayment[];
      setDeletedPayments(dpData);
    }, (error) => {
      console.error('Error listening to deleted payments:', error);
    });

    return () => {
      unsubscribeMembers();
      unsubscribePayments();
      unsubscribeDeletedPayments();
    };
  }, [activeLibraryId]);

  const login = useCallback((email: string, password: string) => {
    const matchedAccount = LIBRARIES.find(lib => lib.email === email && lib.password === password);

    if (matchedAccount) {
      setActiveLibraryId(matchedAccount.id);
      sessionStorage.setItem('librarypro_library_id', matchedAccount.id);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setActiveLibraryId(null);
    sessionStorage.removeItem('librarypro_library_id');
  }, []);

  const addMember = useCallback(async (member: Omit<Member, 'id' | 'libraryId'>, photoBase64?: string) => {
    if (!activeLibraryId) throw new Error('Cannot add member: No active library session');
    try {
      const docRef = await addDoc(collection(db, 'members'), {
        ...member,
        libraryId: activeLibraryId,
        photoUrl: photoBase64 || null
      });

      return docRef.id;
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error('Failed to add member');
      throw error;
    }
  }, [activeLibraryId]);

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

  const addPayment = useCallback(async (payment: Omit<Payment, 'id' | 'libraryId'>) => {
    if (!activeLibraryId) throw new Error('Cannot register payment: No active library session');
    try {
      await addDoc(collection(db, 'payments'), {
        ...payment,
        libraryId: activeLibraryId
      });
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

      // Add to deleted_payments
      const { id: paymentId, ...paymentData } = paymentToDel;
      await addDoc(collection(db, 'deleted_payments'), {
        ...paymentData,
        originalPaymentId: paymentId,
        deletedAt: new Date().toISOString()
      });

      // Remove from payments
      const paymentRef = doc(db, 'payments', id);
      await deleteDoc(paymentRef);
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
      // Create a batch or iterate to delete
      const deletePromises = deletedPayments.map(dp => {
        const ref = doc(db, 'deleted_payments', dp.id);
        return deleteDoc(ref);
      });

      await Promise.all(deletePromises);

      toast.success('Deleted payments cleared');
    } catch (error) {
      console.error('Error clearing deleted payments:', error);
      toast.error('Failed to clear deleted payments');
      throw error;
    }
  }, [deletedPayments]);

  return (
    <LibraryContext.Provider value={{ members, payments, deletedPayments, isAuthenticated, activeLibraryId, login, logout, addMember, updateMember, deleteMember, upgradeMember, addPayment, deletePayment, clearDeletedPayments, fetchData, loading }}>
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (!context) throw new Error('useLibrary must be used within LibraryProvider');
  return context;
}

