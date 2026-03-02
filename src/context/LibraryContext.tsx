import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { addMonths, addDays, format } from 'date-fns';

export interface Plan {
  id: string;
  name: string;
  durationMonths: number;
  price: number;
}

export interface Member {
  id: string;
  fullName: string;
  phone: string;
  countryCode: string;
  address: string;
  idProofNumber: string;
  planId: string;
  feesPaid: number;
  startDate: string;
  expiryDate: string;
  status: 'Active' | 'Expired';
}

interface LibraryContextType {
  members: Member[];
  plans: Plan[];
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  addMember: (member: Omit<Member, 'id'>) => void;
  updateMember: (id: string, member: Partial<Member>) => void;
  deleteMember: (id: string) => void;
  addPlan: (plan: Omit<Plan, 'id'>) => void;
  updatePlan: (id: string, plan: Partial<Plan>) => void;
  deletePlan: (id: string) => void;
}

const defaultPlans: Plan[] = [
  { id: '1', name: 'Monthly', durationMonths: 1, price: 500 },
  { id: '2', name: 'Quarterly', durationMonths: 3, price: 1300 },
  { id: '3', name: 'Half-Yearly', durationMonths: 6, price: 2400 },
  { id: '4', name: 'Yearly', durationMonths: 12, price: 4500 },
];

const today = new Date();
const defaultMembers: Member[] = [
  { id: '1', fullName: 'Aarav Sharma', phone: '9876543210', countryCode: '+91', address: '12 MG Road, Mumbai', idProofNumber: 'AADH1234', planId: '4', feesPaid: 4500, startDate: format(addMonths(today, -2), 'yyyy-MM-dd'), expiryDate: format(addMonths(today, 10), 'yyyy-MM-dd'), status: 'Active' },
  { id: '2', fullName: 'Priya Patel', phone: '9123456780', countryCode: '+91', address: '45 Park Street, Delhi', idProofNumber: '', planId: '1', feesPaid: 500, startDate: format(addMonths(today, -1), 'yyyy-MM-dd'), expiryDate: format(addDays(today, 3), 'yyyy-MM-dd'), status: 'Active' },
  { id: '3', fullName: 'Rahul Verma', phone: '9988776655', countryCode: '+91', address: '8 Lake View, Bangalore', idProofNumber: 'PAN9876', planId: '3', feesPaid: 2400, startDate: format(addMonths(today, -7), 'yyyy-MM-dd'), expiryDate: format(addMonths(today, -1), 'yyyy-MM-dd'), status: 'Expired' },
  { id: '4', fullName: 'Sneha Reddy', phone: '9012345678', countryCode: '+91', address: '22 Jubilee Hills, Hyderabad', idProofNumber: '', planId: '2', feesPaid: 1300, startDate: format(addMonths(today, -1), 'yyyy-MM-dd'), expiryDate: format(addMonths(today, 2), 'yyyy-MM-dd'), status: 'Active' },
  { id: '5', fullName: 'Vikram Singh', phone: '9871234560', countryCode: '+91', address: '3 Civil Lines, Jaipur', idProofNumber: 'DL4455', planId: '1', feesPaid: 500, startDate: format(addMonths(today, -2), 'yyyy-MM-dd'), expiryDate: format(addDays(today, -10), 'yyyy-MM-dd'), status: 'Expired' },
  { id: '6', fullName: 'Ananya Gupta', phone: '9654321098', countryCode: '+91', address: '67 Sector 15, Noida', idProofNumber: '', planId: '4', feesPaid: 4500, startDate: format(addMonths(today, -3), 'yyyy-MM-dd'), expiryDate: format(addMonths(today, 9), 'yyyy-MM-dd'), status: 'Active' },
];

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<Member[]>(defaultMembers);
  const [plans, setPlans] = useState<Plan[]>(defaultPlans);
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
    setMembers(prev => [...prev, { ...member, id: Date.now().toString() }]);
  }, []);

  const updateMember = useCallback((id: string, data: Partial<Member>) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, ...data } : m));
  }, []);

  const deleteMember = useCallback((id: string) => {
    setMembers(prev => prev.filter(m => m.id !== id));
  }, []);

  const addPlan = useCallback((plan: Omit<Plan, 'id'>) => {
    setPlans(prev => [...prev, { ...plan, id: Date.now().toString() }]);
  }, []);

  const updatePlan = useCallback((id: string, data: Partial<Plan>) => {
    setPlans(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
  }, []);

  const deletePlan = useCallback((id: string) => {
    setPlans(prev => prev.filter(p => p.id !== id));
  }, []);

  return (
    <LibraryContext.Provider value={{ members, plans, isAuthenticated, login, logout, addMember, updateMember, deleteMember, addPlan, updatePlan, deletePlan }}>
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (!context) throw new Error('useLibrary must be used within LibraryProvider');
  return context;
}
