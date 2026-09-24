import React, { useState } from 'react';
import { useTasks } from '../context/TaskContext';
import CreateTaskModal from './CreateTaskModal';
import AIReportModal from './AIReportModal';
import { 
  CheckSquare, 
  Plus, 
  Calendar as CalendarIcon,
  BellRing,
  Briefcase,
  UserCheck
} from 'lucide-react';

export default function Navbar() {
  const { 
    currentUser, 
    isAdmin, 
    isRealtimeLive,
    currentView,
    setCurrentView,
    calendarEvents,
    tasks
  } = useTasks();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  // Active reminders count
  const remindersCount = (calendarEvents || []).filter(e => e.type === 'reminder').length;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#e7e1d6] bg-white/95 backdrop-blur-md shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          
          {/* Left: View Switcher Tabs (Tasks | Projects | Calendar | Reminders) */}
          <div className="flex items-center bg-[#f3f0e9] border border-[#e7e1d6] rounded-xl p-1 shadow-xs">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currentView === 'dashboard'
                  ? 'bg-[#1f5c5a] text-white shadow-sm'
                  : 'text-[#6f6a60] hover:text-[#20262e] hover:bg-white/80'
              }`}
            >
              <CheckSquare size={13} />
              <span>Tasks</span>
            </button>
            <button
              onClick={() => setCurrentView('projects')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currentView === 'projects'
                  ? 'bg-[#1f5c5a] text-white shadow-sm'
                  : 'text-[#6f6a60] hover:text-[#20262e] hover:bg-white/80'
              }`}
            >
              <Briefcase size={13} />
              <span>Projects</span>
            </button>
            <button
              onClick={() => setCurrentView('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currentView === 'calendar'
                  ? 'bg-[#1f5c5a] text-white shadow-sm'
                  : 'text-[#6f6a60] hover:text-[#20262e] hover:bg-white/80'
              }`}
            >
              <CalendarIcon size={13} />
              <span>Calendar</span>
            </button>
            <button
              onClick={() => setCurrentView('attendance')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currentView === 'attendance'
                  ? 'bg-[#1f5c5a] text-white shadow-sm'
                  : 'text-[#6f6a60] hover:text-[#20262e] hover:bg-white/80'
              }`}
            >
              <UserCheck size={13} />
              <span>Attendance</span>
            </button>
            <button
              onClick={() => setCurrentView('reminders')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currentView === 'reminders'
                  ? 'bg-[#1f5c5a] text-white shadow-sm'
                  : 'text-[#6f6a60] hover:text-[#20262e] hover:bg-white/80'
              }`}
            >
              <BellRing size={13} />
              <span>Reminders</span>
              {remindersCount > 0 && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full font-black bg-[#9a6a14] text-white">
                  {remindersCount}
                </span>
              )}
            </button>
          </div>

          {/* Right: Actions & Realtime Status */}
          <div className="flex items-center gap-2.5">
            {/* Realtime Status Indicator */}
            <div 
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#e6f0e8] border border-[#c2dfc8] text-xs font-semibold text-[#2e6930]"
              title="Supabase Realtime Live Active"
            >
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isRealtimeLive ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isRealtimeLive ? 'bg-emerald-600' : 'bg-amber-600'
                  }`}
                />
              </span>
              <span className="text-[11px]">
                {isRealtimeLive ? 'Live Sync' : 'Connecting'}
              </span>
            </div>

            {/* AI Report Button (Admin / HR) */}
            {isAdmin && (
              <button
                onClick={() => setIsAIModalOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#e8f0ef] hover:bg-[#d1e3e1] text-[#1f5c5a] border border-[#a3c7c4] text-xs font-bold transition-all shadow-xs"
              >
                <span>✨ AI Report</span>
              </button>
            )}

            {/* + New Task Button (HR Members Only) */}
            {isAdmin && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1f5c5a] hover:bg-[#174644] text-xs font-bold text-white transition-all shadow-xs"
              >
                <Plus size={14} className="stroke-[3]" />
                <span>New Task</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {isAdmin && (
        <CreateTaskModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}

      <AIReportModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
      />
    </>
  );
}
