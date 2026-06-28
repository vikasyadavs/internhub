import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import attendanceRoutes from './routes/attendance.js';
import tasksRoutes from './routes/tasks.js';
import reportsRoutes from './routes/reports.js';
import recruitmentRoutes from './routes/recruitment.js';
import clientsRoutes from './routes/clients.js';
import invoicesRoutes from './routes/invoices.js';
import documentsRoutes from './routes/documents.js';
import announcementsRoutes from './routes/announcements.js';
import dashboardRoutes from './routes/dashboard.js';
import projectsRoutes from './routes/projects.js';
import payrollRoutes from './routes/payroll.js';
import trackingRoutes from './routes/tracking.js';
import activityRoutes from './routes/activity.js';
import notificationsRoutes from './routes/notifications.js';
import analyticsRoutes from './routes/analytics.js';
import settingsRoutes from './routes/settings.js';
import searchRoutes from './routes/search.js';
import todayTasksRoutes from './routes/today-tasks.js';

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.URL,
  process.env.DEPLOY_PRIME_URL,
  'https://internhub7.netlify.app',
  'http://localhost:5173',
].filter(Boolean);

// Middleware
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
}));
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/recruitment', recruitmentRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/today-tasks', todayTasksRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/search', searchRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);

if (isDirectRun) {
  app.listen(PORT, () => {
    console.log(`InternHub server running on http://localhost:${PORT}`);
  });
}

export default app;
