import { useLibrary } from '@/context/LibraryContext';
import { Users, UserX, AlertTriangle, TrendingUp, MessageSquare } from 'lucide-react';
import { differenceInDays, parseISO, format } from 'date-fns';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const Dashboard = () => {
  const { members, plans } = useLibrary();
  const today = new Date();

  const activeMembers = members.filter(m => m.status === 'Active');
  const expiredMembers = members.filter(m => m.status === 'Expired');
  const expiringSoon = members.filter(m => {
    if (m.status !== 'Active') return false;
    const days = differenceInDays(parseISO(m.expiryDate), today);
    return days >= 0 && days <= 7;
  });

  const totalRevenue = members.reduce((sum, m) => sum + m.feesPaid, 0);

  const revenueByPlan = plans.map(plan => {
    const revenue = members.filter(m => m.planId === plan.id).reduce((sum, m) => sum + m.feesPaid, 0);
    return { name: plan.name, revenue };
  });

  const stats = [
    { label: 'Active Members', value: activeMembers.length, icon: Users, color: 'text-success' },
    { label: 'Expired Members', value: expiredMembers.length, icon: UserX, color: 'text-destructive' },
    { label: 'Expiring in 7 Days', value: expiringSoon.length, icon: AlertTriangle, color: 'text-warning' },
    { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-primary' },
  ];

  const recentMembers = [...members].sort((a, b) => parseISO(b.startDate).getTime() - parseISO(a.startDate).getTime()).slice(0, 5);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-display text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your library's performance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            className="stat-card"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold font-display text-foreground">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="stat-card">
          <h3 className="font-semibold text-foreground mb-4">Revenue by Plan</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={revenueByPlan}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="stat-card">
          <h3 className="font-semibold text-foreground mb-4">Recent Members</h3>
          <div className="space-y-3">
            {recentMembers.map(member => {
              const plan = plans.find(p => p.id === member.planId);
              return (
                <div key={member.id} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                  <div>
                    <p className="font-medium text-sm text-foreground">{member.fullName}</p>
                    <p className="text-xs text-muted-foreground">{plan?.name} • Joined {format(parseISO(member.startDate), 'MMM d, yyyy')}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${member.status === 'Active' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                    {member.status}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {expiringSoon.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="stat-card border-warning/30 bg-warning/5">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" /> Members Expiring Soon
          </h3>
          <div className="space-y-2">
            {expiringSoon.map(member => (
              <div key={member.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-sm text-foreground">{member.fullName}</p>
                  <p className="text-xs text-muted-foreground">Expires {format(parseISO(member.expiryDate), 'MMM d, yyyy')}</p>
                </div>
                <a
                  href={`https://wa.me/${member.countryCode.replace('+', '')}${member.phone}?text=${encodeURIComponent(`Hello ${member.fullName}, your library membership expires on ${format(parseISO(member.expiryDate), 'MMM d, yyyy')}. Please renew to continue access.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium text-success hover:text-success/80 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Remind
                </a>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Dashboard;
