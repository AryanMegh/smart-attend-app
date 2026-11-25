import React, { lazy, Suspense, useEffect, useContext } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
// Layout & Context
// NOTE: AppLayout is intentionally NOT imported/wrapped here — every page
// component below already wraps itself in <AppLayout>. Wrapping again at
// the route level produced two nested sidebars/shells at runtime.
import { AuthProvider, AuthContext } from "./context/AuthContext";
import { AttendanceProvider } from "./context/AttendanceContext";
import ProtectedRoute from "./components/custom/ProtectedRoute";
// Pages
const Login = lazy(() => import("./pages/LoginPage"));
const Register = lazy(() => import("./pages/RegisterPage"));
const VerifyEmailPage = lazy(() => import("./pages/VerifyEmail"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/DashboardPage"));
const Attendance = lazy(() => import("./pages/AttendancePage"));
const History = lazy(() => import("./pages/HistoryPage"));
const Reports = lazy(() => import("./pages/ReportsPage"));
const Assistant = lazy(() => import("./pages/AssistantPage"));
const Profile = lazy(() => import("./pages/ProfilePage"));
const AdminEmployees = lazy(() => import("./pages/AdminEmployeesPage"));
const AdminReports = lazy(() => import("./pages/AdminReportsPage"));
const AdminEmployeeAttendance = lazy(() => import("./pages/AdminEmployeeAttendancePage"));

const PageLoader = () => (
  <div className="h-screen flex items-center justify-center bg-slate-900">
    <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
  </div>
);

/* Admin Guard */
const AdminRoute = ({ children }) => {
  const { profile, loading } = useContext(AuthContext);
  if (loading) return <PageLoader />;
  return profile?.role === "admin" ? (
    children
  ) : (
    <Navigate to="/dashboard" replace />
  );
};

export default function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <AttendanceProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* ── AUTH ROUTES ── */}
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* ── APP ROUTES (Protected) ── */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendance"
              element={
                <ProtectedRoute>
                  <Attendance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <History />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/assistant"
              element={
                <ProtectedRoute>
                  <Assistant />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            {/* ── ADMIN ROUTES ── */}
            <Route
              path="/admin/employees"
              element={
                <AdminRoute>
                  <AdminEmployees />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <AdminRoute>
                  <AdminReports />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/employees/:uid/attendance"
              element={
                <AdminRoute>
                  <AdminEmployeeAttendance />
                </AdminRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
        </AttendanceProvider>
      </AuthProvider>
    </Router>
  );
}
