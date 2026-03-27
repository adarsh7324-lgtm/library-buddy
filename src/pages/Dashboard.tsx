import { useLibrary } from '@/context/LibraryContext';
import { Users, UserX, AlertTriangle, TrendingUp, MessageSquare, Sun, Sunset, Moon, Sunrise, Clock } from 'lucide-react';
import { differenceInDays, parseISO, format } from 'date-fns';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { members, payments } = useLibrary();
  const navigate = useNavigate();
  const today = new Date();

  const activeMembers = members.filter(m => m.status === 'Active');
  const expiredMembers = members.filter(m => m.status === 'Expired');
  const expiringSoon = members.filter(m => m.status === 'Expiring Soon');

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

  const stats = [
    { label: 'Active Members', value: activeMembers.length, icon: Users, color: 'text-success', path: '/members' },
    { label: 'Expired Members', value: expiredMembers.length, icon: UserX, color: 'text-destructive', path: '/reminders' },
    { label: 'Expiring in 7 Days', value: expiringSoon.length, icon: AlertTriangle, color: 'text-warning', path: '/reminders' },
    { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-primary' },
  ];

  const shiftCounts = {
    Morning: activeMembers.filter(m => m.shift === 'Morning').length,
    Afternoon: activeMembers.filter(m => m.shift === 'Afternoon').length,
    Evening: activeMembers.filter(m => m.shift === 'Evening').length,
    Night: activeMembers.filter(m => m.shift === 'Night').length,
    Full: activeMembers.filter(m => m.shift === 'Full').length,
  };

  const shiftStats = [
    { label: 'Morning', value: shiftCounts.Morning, icon: Sunrise, color: 'text-amber-400' },
    { label: 'Afternoon', value: shiftCounts.Afternoon, icon: Sun, color: 'text-orange-400' },
    { label: 'Evening', value: shiftCounts.Evening, icon: Sunset, color: 'text-rose-400' },
    { label: 'Night', value: shiftCounts.Night, icon: Moon, color: 'text-indigo-400' },
    { label: 'Full Day', value: shiftCounts.Full, icon: Clock, color: 'text-emerald-400' },
  ];

  const recentMembers = [...members]
    .sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : (a.startDate ? parseISO(a.startDate).getTime() : 0);
      const timeB = b.created_at ? new Date(b.created_at).getTime() : (b.startDate ? parseISO(b.startDate).getTime() : 0);
      return timeB - timeA;
    })
    .slice(0, 5);

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
            className={`stat-card ${stat.path ? 'cursor-pointer hover:border-primary/50' : ''}`}
            onClick={() => stat.path && navigate(stat.path)}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold font-display text-foreground">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-panel p-6 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
        <h3 className="font-semibold text-white mb-4">Students by Shift (Active)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {shiftStats.map((stat, i) => (
            <div key={stat.label} className="flex flex-col items-center justify-center p-4 rounded-xl bg-black/20 border border-white/5">
              <stat.icon className={`w-6 h-6 mb-2 ${stat.color}`} />
              <span className="text-2xl font-bold text-white">{stat.value}</span>
              <span className="text-xs text-white/60 mt-1">{stat.label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-panel p-6 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
        <h3 className="font-semibold text-white mb-4">Recent Members</h3>
        <div className="space-y-3">
          {recentMembers.map(member => (
            <div key={member.id} className="flex items-center justify-between py-2 border-b border-white/10 last:border-0 hover:bg-white/5 px-2 rounded-lg transition-colors">
              <div>
                <p className="font-medium text-sm text-white">{member.fullName}</p>
                <p className="text-xs text-white/60">{member.customDays ? `${member.customDays} day(s)` : `${member.months} month(s)`} • Joined {member.startDate ? format(parseISO(member.startDate), 'MMM d, yyyy') : 'N/A'}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${member.status === 'Active' ? 'bg-success/80 text-success-foreground border-success/80' :
                member.status === 'Expiring Soon' ? 'bg-warning/80 text-warning-foreground border-warning/80' :
                  'bg-destructive/80 text-destructive-foreground border-destructive/80'
                }`}>
                {member.status}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {expiringSoon.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-panel p-6 rounded-2xl border-warning/30 bg-warning/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" /> Members Expiring Soon
          </h3>
          <div className="space-y-2">
            {expiringSoon.map(member => (
              <div key={member.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <p className="font-medium text-sm text-white">{member.fullName}</p>
                  <p className="text-xs text-white/60">Expires {member.expiryDate ? format(parseISO(member.expiryDate), 'MMM d, yyyy') : 'N/A'}</p>
                </div>
                <a
                  href={`https://wa.me/${(member.countryCode || '+91').replace('+', '')}${member.phone}?text=${encodeURIComponent(`Hello ${member.fullName}, your library membership expires on ${member.expiryDate ? format(parseISO(member.expiryDate), 'MMM d, yyyy') : 'N/A'}. Please renew to continue access.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-white transition-colors"
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
