import React, { useEffect } from 'react';
import { TaskProvider, useTasks } from './context/TaskContext';
import { logAppActivityPing } from './lib/supabase';
import Navbar from './components/Navbar';
import ManagerDashboard from './components/ManagerDashboard';
import StaffDashboard from './components/StaffDashboard';
import CalendarView from './components/CalendarView';
import RemindersListView from './components/RemindersListView';
import ProjectsView from './components/ProjectsView';
import AttendanceView from './components/AttendanceView';
import { ShieldCheck } from 'lucide-react';

function DashboardView() {
  const { currentUser, authLoading, isAdmin, currentView } = useTasks();

  // Automatic Keep-Alive & Activity ping whenever authenticated dashboard mounts
  useEffect(() => {
    if (currentUser) {
      logAppActivityPing(currentUser);
    }
  }, [currentUser?.id]);

  if (authLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-[#faf8f4] flex flex-col items-center justify-center text-[#20262e] gap-3">
        <div className="w-8 h-8 border-3 border-[#1f5c5a]/30 border-t-[#1f5c5a] rounded-full animate-spin" />
        <span className="text-xs font-semibold text-[#6f6a60]">Connecting to HR Workspace...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#faf8f4] text-[#20262e]">
      <div>
        <Navbar />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {currentView === 'attendance' ? (
            <AttendanceView />
          ) : currentView === 'reminders' ? (
            <RemindersListView />
          ) : currentView === 'projects' ? (
            <ProjectsView />
          ) : currentView === 'calendar' ? (
            <CalendarView />
          ) : isAdmin ? (
            <ManagerDashboard />
          ) : (
            <StaffDashboard />
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#e7e1d6] bg-white py-3.5 px-4 mt-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#6f6a60]">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-[#3c7a4e]" />
            <span>HR Workspace Active &bull; Logged in as <strong className="text-[#20262e] font-bold">{currentUser.full_name || currentUser.username}</strong> ({currentUser.department} &bull; {currentUser.role})</span>
          </div>

          <div className="text-[11px] text-[#6f6a60]">
            Supabase Live Database &bull; Realtime Sync Active
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <TaskProvider>
      <DashboardView />
    </TaskProvider>
  );
}
