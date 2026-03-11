import { useLibrary } from '@/context/LibraryContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const Login = () => {
  const { loginWithGoogle, isAuthenticated } = useLibrary();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden dark">
      {/* Background Image with blur and dark overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=2000&auto=format&fit=crop")',
          filter: 'blur(8px)',
          transform: 'scale(1.05)'
        }}
      />
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 z-0 bg-black/60 mix-blend-multiply" />
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-black/90 via-black/40 to-black/80" />

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[420px]"
      >
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/20 p-8 sm:p-10 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.6)]">
          {/* Subtle top glare/gradient for glass effect */}
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          <div className="absolute -inset-x-20 top-0 h-[150px] bg-white/[0.03] blur-3xl rounded-full" />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center">
            {/* Logo */}
            <motion.div 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
              className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-6 shadow-inner border border-white/10 backdrop-blur-md"
            >
              <BookOpen className="w-8 h-8 text-white/90" />
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-center w-full"
            >
              <h1 className="text-3xl font-bold font-display text-white tracking-tight mb-2">Library Buddy</h1>
              <p className="text-white/60 text-sm mb-10">Operating System for Libraries</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="w-full"
            >
              <Button
                variant="outline"
                type="button"
                className="w-full h-12 text-base font-medium bg-white/5 border-white/10 text-white hover:bg-white/15 hover:text-white transition-all duration-300 gap-3 rounded-xl relative overflow-hidden group"
                onClick={() => loginWithGoogle()}
              >
                <div className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-[50%] transition-transform duration-1000 ease-in-out" />
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span className="relative z-10">Sign in with Google</span>
              </Button>
            </motion.div>

            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="text-[11px] text-white/40 text-center mt-8 tracking-wider uppercase font-medium"
            >
              Authorized Access Only
            </motion.p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
