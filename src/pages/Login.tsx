import { useState } from 'react';
import { useLibrary } from '@/context/LibraryContext';
import { useNavigate } from 'react-router-dom';
import { BookOpen, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';

const Login = () => {
  const [email, setEmail] = useState('admin@librarypro.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const { login } = useLibrary();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(email, password)) {
      navigate('/');
    } else {
      setError('Invalid credentials. Try admin@librarypro.com / admin123');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--gradient-hero)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-card rounded-2xl border border-border/40 p-8 shadow-lg" style={{ boxShadow: 'var(--shadow-lg)' }}>
          <div className="flex items-center gap-3 mb-2 justify-center">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold font-display text-foreground">Library Buddy</h1>
          </div>
          <p className="text-center text-muted-foreground text-sm mb-8">Smart Library Management System</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@librarypro.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" className="w-full gap-2">
              <LogIn className="w-4 h-4" /> Sign In
            </Button>
          </form>
          <p className="text-xs text-muted-foreground text-center mt-6">Demo: admin@librarypro.com / admin123</p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
