import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TrackingProvider } from './contexts/TrackingContext';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AttendancePage from './pages/AttendancePage';
import TasksPage from './pages/TasksPage';
import DailyReportPage from './pages/DailyReportPage';
import RecruitmentPage from './pages/RecruitmentPage';
import ClientsPage from './pages/ClientsPage';
import InvoicesPage from './pages/InvoicesPage';
import DocumentsPage from './pages/DocumentsPage';
import TeamPage from './pages/TeamPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import ProfilePage from './pages/ProfilePage';
import ProjectsPage from './pages/ProjectsPage';
import PayrollPage from './pages/PayrollPage';
import LiveTrackingPage from './pages/LiveTrackingPage';
import ReportsPage from './pages/ReportsPage';
import ActivityLogPage from './pages/ActivityLogPage';
import SettingsPage from './pages/SettingsPage';
import CallingSheetPage from './pages/CallingSheetPage';
import EmailComposePage from './pages/EmailComposePage';
import GoogleIntegrationsPage from './pages/GoogleIntegrationsPage';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-purple-blue animate-spin border-4 border-white border-t-transparent" />
        <p className="text-sm text-gray-500 font-medium">Loading InternHub...</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="projects" element={
          <ProtectedRoute roles={['admin', 'it_intern']}><ProjectsPage /></ProtectedRoute>
        } />
        <Route path="reports" element={<DailyReportPage />} />
        <Route path="recruitment" element={
          <ProtectedRoute roles={['admin', 'recruitment_intern']}><RecruitmentPage /></ProtectedRoute>
        } />
        <Route path="clients" element={
          <ProtectedRoute roles={['admin', 'bd_intern']}><ClientsPage /></ProtectedRoute>
        } />
        <Route path="invoices" element={
          <ProtectedRoute roles={['admin', 'bd_intern']}><InvoicesPage /></ProtectedRoute>
        } />
        <Route path="payroll" element={
          <ProtectedRoute roles={['admin']}><PayrollPage /></ProtectedRoute>
        } />
        <Route path="tracking" element={
          <ProtectedRoute roles={['admin']}><LiveTrackingPage /></ProtectedRoute>
        } />
        <Route path="analytics" element={
          <ProtectedRoute roles={['admin']}><ReportsPage /></ProtectedRoute>
        } />
        <Route path="activity" element={
          <ProtectedRoute roles={['admin']}><ActivityLogPage /></ProtectedRoute>
        } />
        <Route path="documents" element={
          <ProtectedRoute roles={['admin']}><DocumentsPage /></ProtectedRoute>
        } />
        <Route path="team" element={
          <ProtectedRoute roles={['admin']}><TeamPage /></ProtectedRoute>
        } />
        <Route path="settings" element={
          <ProtectedRoute roles={['admin']}><SettingsPage /></ProtectedRoute>
        } />
        <Route path="calling-sheet" element={
          <ProtectedRoute roles={['admin', 'bd_intern']}><CallingSheetPage /></ProtectedRoute>
        } />
        <Route path="email-composer" element={
          <ProtectedRoute roles={['admin', 'bd_intern', 'recruitment_intern']}><EmailComposePage /></ProtectedRoute>
        } />
        <Route path="google-integrations" element={<GoogleIntegrationsPage />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TrackingProvider>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              style: { borderRadius: '12px', fontFamily: 'Inter, sans-serif', fontSize: '14px' },
              success: { iconTheme: { primary: '#7C3AED', secondary: '#fff' } },
            }}
          />
        </TrackingProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
