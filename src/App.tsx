import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, AppRole } from "@/contexts/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Complaints from "./pages/Complaints";
import Customers from "./pages/Customers";
import Branches from "./pages/Branches";
import Invoices from "./pages/Invoices";
import Attendance from "./pages/Attendance";
import Inventory from "./pages/Inventory";
import Financial from "./pages/Financial";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Staff from "./pages/Staff";
import UserActivity from "./pages/UserActivity";
import ServicesProducts from "./pages/ServicesProducts";
import CustomerReviews from "@/pages/CustomerReviews";
import Payroll from "./pages/Payroll";
import Payments from "./pages/Payments";
import PublicVerify from "./pages/PublicVerify";
import ServiceRequests from "./pages/ServiceRequests";
import DashboardLayout from "./components/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";
import MaintenanceOverlay from "./components/MaintenanceOverlay";

// Landing Pages
import Home from "./pages/landing/Home";
import About from "./pages/landing/About";
import ContactPage from "./pages/landing/Contact";
import Services from "./pages/landing/Services";
import VerificationPage from "./pages/landing/Verification";

const queryClient = new QueryClient();

const DashboardPage = ({ children, requiredRoles }: { children: React.ReactNode, requiredRoles?: AppRole | AppRole[] }) => (
  <ProtectedRoute requiredRoles={requiredRoles}>
    <DashboardLayout>{children}</DashboardLayout>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <MaintenanceOverlay />
          <Routes>
            {/* Landing Pages */}
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/services" element={<Services />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/verification" element={<VerificationPage />} />

            {/* Auth */}
            <Route path="/login" element={<Login />} />
            <Route path="/verify" element={<Home />} />
            <Route path="/verify/:id" element={<Home />} />

            {/* Dashboard */}
            <Route path="/dashboard" element={<DashboardPage><Dashboard /></DashboardPage>} />
            <Route path="/dashboard/complaints" element={<DashboardPage requiredRoles={["super_admin", "branch_admin"]}><Complaints /></DashboardPage>} />
            <Route path="/dashboard/customers" element={<DashboardPage requiredRoles={["super_admin", "branch_admin"]}><Customers /></DashboardPage>} />
            <Route path="/dashboard/branches" element={<DashboardPage requiredRoles={["super_admin"]}><Branches /></DashboardPage>} />
            <Route path="/dashboard/services-products" element={<DashboardPage requiredRoles={["super_admin", "branch_admin"]}><ServicesProducts /></DashboardPage>} />
            <Route path="/dashboard/staff" element={<DashboardPage requiredRoles={["super_admin", "branch_admin"]}><Staff /></DashboardPage>} />
            <Route path="/dashboard/invoices" element={<DashboardPage requiredRoles={["super_admin", "branch_admin"]}><Invoices /></DashboardPage>} />
            <Route path="/dashboard/attendance" element={<DashboardPage requiredRoles={["super_admin", "branch_admin", "staff"]}><Attendance /></DashboardPage>} />
            <Route path="/dashboard/inventory" element={<DashboardPage requiredRoles={["super_admin", "branch_admin"]}><Inventory /></DashboardPage>} />
            <Route path="/dashboard/financial" element={<DashboardPage requiredRoles={["super_admin", "branch_admin"]}><Financial /></DashboardPage>} />
            <Route path="/dashboard/reports" element={<DashboardPage requiredRoles={["super_admin"]}><Reports /></DashboardPage>} />
            <Route path="/dashboard/payroll" element={<DashboardPage requiredRoles={["super_admin", "manager"]}><Payroll /></DashboardPage>} />
            <Route path="/dashboard/payments" element={<DashboardPage requiredRoles={["super_admin", "branch_admin"]}><Payments /></DashboardPage>} />
            <Route path="/dashboard/user-activity" element={<DashboardPage requiredRoles={["super_admin"]}><UserActivity /></DashboardPage>} />
            <Route path="/dashboard/customer-reviews" element={<DashboardPage requiredRoles={["super_admin", "branch_admin"]}><CustomerReviews /></DashboardPage>} />
            <Route path="/dashboard/settings" element={<DashboardPage requiredRoles={["super_admin"]}><Settings /></DashboardPage>} />
            <Route path="/dashboard/service-requests" element={<DashboardPage requiredRoles={["super_admin", "branch_admin"]}><ServiceRequests /></DashboardPage>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
