import { useLibrary } from '@/context/LibraryContext';
import { Users, UserX, AlertTriangle, TrendingUp, MessageSquare } from 'lucide-react';
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

  const recentMembers = [...members]
    .filter(m => m.startDate)
    .sort((a, b) => {
      try { return parseISO(b.startDate).getTime() - parseISO(a.startDate).getTime(); }
      catch { return 0; }
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

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="stat-card">
        <h3 className="font-semibold text-foreground mb-4">Recent Members</h3>
        <div className="space-y-3">
          {recentMembers.map(member => (
            <div key={member.id} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
              <div>
                <p className="font-medium text-sm text-foreground">{member.fullName}</p>
                <p className="text-xs text-muted-foreground">{member.months} month{member.months > 1 ? 's' : ''} • Joined {member.startDate ? format(parseISO(member.startDate), 'MMM d, yyyy') : 'N/A'}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${member.status === 'Active' ? 'bg-success/10 text-success' :
                  member.status === 'Expiring Soon' ? 'bg-warning/10 text-warning' :
                    'bg-destructive/10 text-destructive'
                }`}>
                {member.status}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {expiringSoon.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="stat-card border-warning/30 bg-warning/5">
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
