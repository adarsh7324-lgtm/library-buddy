import { useLibrary } from '@/context/LibraryContext';
import { TrendingUp, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { motion } from 'framer-motion';

const COLORS = ['hsl(168, 60%, 32%)', 'hsl(38, 90%, 55%)', 'hsl(210, 80%, 52%)', 'hsl(280, 60%, 55%)'];

const Revenue = () => {
  const { members, plans } = useLibrary();

  const totalRevenue = members.reduce((sum, m) => sum + m.feesPaid, 0);
  const activeRevenue = members.filter(m => m.status === 'Active').reduce((sum, m) => sum + m.feesPaid, 0);

  const revenueByPlan = plans.map(plan => {
    const revenue = members.filter(m => m.planId === plan.id).reduce((sum, m) => sum + m.feesPaid, 0);
    const count = members.filter(m => m.planId === plan.id).length;
    return { name: plan.name, revenue, count };
  }).filter(r => r.revenue > 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">Revenue</h1>
        <p className="text-muted-foreground mt-1">Track your library's income</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Total Revenue</span>
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <p className="text-3xl font-bold font-display text-foreground">₹{totalRevenue.toLocaleString()}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Active Members Revenue</span>
            <TrendingUp className="w-5 h-5 text-success" />
          </div>
          <p className="text-3xl font-bold font-display text-foreground">₹{activeRevenue.toLocaleString()}</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="stat-card">
          <h3 className="font-semibold text-foreground mb-4">Revenue by Plan</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueByPlan}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
              <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                {revenueByPlan.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="stat-card">
          <h3 className="font-semibold text-foreground mb-4">Revenue Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={revenueByPlan} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="revenue" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {revenueByPlan.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="stat-card">
        <h3 className="font-semibold text-foreground mb-4">Breakdown by Plan</h3>
        <div className="space-y-3">
          {revenueByPlan.map((item, i) => (
            <div key={item.name} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <div>
                  <p className="font-medium text-sm text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.count} member{item.count !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <p className="font-semibold text-foreground">₹{item.revenue.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Revenue;
