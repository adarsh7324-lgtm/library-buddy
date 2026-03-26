import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LibraryProvider, useLibrary } from "@/context/LibraryContext";
import DashboardLayout from "@/components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Members from "./pages/Members";
import AddMember from "./pages/AddMember";
import Payments from "./pages/Payments";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Reminders from "./pages/Reminders";
import Seats from "./pages/Seats";
import StaffManagement from "./pages/StaffManagement";
import Expenses from "./pages/Expenses";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import { ThemeProvider } from "./components/theme-provider";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isSuperAdmin, activeLibraryId, isAuthChecking } = useLibrary();

  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-muted-foreground text-sm font-medium">Signing you in...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !isSuperAdmin) return <Navigate to="/login" replace />;

  if (isSuperAdmin && activeLibraryId === 'superadmin') {
    return <SuperAdminDashboard />;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/members" element={<ProtectedRoute><Members /></ProtectedRoute>} />
    <Route path="/add-member" element={<ProtectedRoute><AddMember /></ProtectedRoute>} />
    <Route path="/seats" element={<ProtectedRoute><Seats /></ProtectedRoute>} />
    <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
    <Route path="/reminders" element={<ProtectedRoute><Reminders /></ProtectedRoute>} />
    <Route path="/staff" element={<ProtectedRoute><StaffManagement /></ProtectedRoute>} />
    <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <TooltipProvider>
    <LibraryProvider>
      <Toaster />
      <Sonner />
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ThemeProvider>
    </LibraryProvider>
  </TooltipProvider>
);

export default App;
