import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { addMonths, format } from 'date-fns';

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
  addMember: (member: Omit<Member, 'id'>) => string;
  updateMember: (id: string, member: Partial<Member>) => void;
  deleteMember: (id: string) => void;
  upgradeMember: (id: string, additionalMonths: number) => void;
  addPayment: (payment: Omit<Payment, 'id'>) => void;
}

const today = new Date();
const defaultMembers: Member[] = [
  { id: '1', fullName: 'Aarav Sharma', phone: '9876543210', countryCode: '+91', address: '12 MG Road, Mumbai', idProofNumber: 'AADH1234', months: 12, feesPaid: 4500, startDate: format(addMonths(today, -2), 'yyyy-MM-dd'), expiryDate: format(addMonths(today, 10), 'yyyy-MM-dd'), status: 'Active' },
  { id: '2', fullName: 'Priya Patel', phone: '9123456780', countryCode: '+91', address: '45 Park Street, Delhi', idProofNumber: '', months: 1, feesPaid: 500, startDate: format(addMonths(today, -1), 'yyyy-MM-dd'), expiryDate: format(addMonths(today, 0), 'yyyy-MM-dd'), status: 'Active' },
  { id: '3', fullName: 'Rahul Verma', phone: '9988776655', countryCode: '+91', address: '8 Lake View, Bangalore', idProofNumber: 'PAN9876', months: 6, feesPaid: 2400, startDate: format(addMonths(today, -7), 'yyyy-MM-dd'), expiryDate: format(addMonths(today, -1), 'yyyy-MM-dd'), status: 'Expired' },
  { id: '4', fullName: 'Sneha Reddy', phone: '9012345678', countryCode: '+91', address: '22 Jubilee Hills, Hyderabad', idProofNumber: '', months: 3, feesPaid: 1300, startDate: format(addMonths(today, -1), 'yyyy-MM-dd'), expiryDate: format(addMonths(today, 2), 'yyyy-MM-dd'), status: 'Active' },
  { id: '5', fullName: 'Vikram Singh', phone: '9871234560', countryCode: '+91', address: '3 Civil Lines, Jaipur', idProofNumber: 'DL4455', months: 1, feesPaid: 500, startDate: format(addMonths(today, -2), 'yyyy-MM-dd'), expiryDate: format(addMonths(today, -1), 'yyyy-MM-dd'), status: 'Expired' },
  { id: '6', fullName: 'Ananya Gupta', phone: '9654321098', countryCode: '+91', address: '67 Sector 15, Noida', idProofNumber: '', months: 12, feesPaid: 4500, startDate: format(addMonths(today, -3), 'yyyy-MM-dd'), expiryDate: format(addMonths(today, 9), 'yyyy-MM-dd'), status: 'Active' },
];

const defaultPayments: Payment[] = [
  { id: '1', memberId: '1', amount: 4500, months: 12, date: format(addMonths(today, -2), 'yyyy-MM-dd'), note: 'Yearly subscription' },
  { id: '2', memberId: '2', amount: 500, months: 1, date: format(addMonths(today, -1), 'yyyy-MM-dd'), note: 'Monthly subscription' },
  { id: '3', memberId: '4', amount: 1300, months: 3, date: format(addMonths(today, -1), 'yyyy-MM-dd'), note: 'Quarterly subscription' },
];

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<Member[]>(defaultMembers);
  const [payments, setPayments] = useState<Payment[]>(defaultPayments);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = useCallback((email: string, password: string) => {
    if (email === 'admin@librarypro.com' && password === 'admin123') {
      setIsAuthenticated(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => setIsAuthenticated(false), []);

  const addMember = useCallback((member: Omit<Member, 'id'>) => {
    const newId = Date.now().toString();
    setMembers(prev => [...prev, { ...member, id: newId }]);
    return newId;
  }, []);

  const updateMember = useCallback((id: string, data: Partial<Member>) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, ...data } : m));
  }, []);

  const deleteMember = useCallback((id: string) => {
    setMembers(prev => prev.filter(m => m.id !== id));
  }, []);

  const upgradeMember = useCallback((id: string, additionalMonths: number) => {
    setMembers(prev => prev.map(m => {
      if (m.id !== id) return m;
      const currentExpiry = new Date(m.expiryDate);
      const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
      const newExpiry = addMonths(baseDate, additionalMonths);
      return {
        ...m,
        months: m.months + additionalMonths,
        expiryDate: format(newExpiry, 'yyyy-MM-dd'),
        status: 'Active' as const,
      };
    }));
  }, []);

  const addPayment = useCallback((payment: Omit<Payment, 'id'>) => {
    setPayments(prev => [...prev, { ...payment, id: Date.now().toString() }]);
  }, []);

  return (
    <LibraryContext.Provider value={{ members, payments, isAuthenticated, login, logout, addMember, updateMember, deleteMember, upgradeMember, addPayment }}>
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (!context) throw new Error('useLibrary must be used within LibraryProvider');
  return context;
}
