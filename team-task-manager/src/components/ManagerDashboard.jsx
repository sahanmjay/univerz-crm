import React, { useState } from 'react';
import { useTasks } from '../context/TaskContext';
import TeamProgressGrid from './TeamProgressGrid';
import TaskCard from './TaskCard';
import CreateTaskModal from './CreateTaskModal';
import MemberAllocationBoard from './MemberAllocationBoard';
import { 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  Layers, 
  Calendar, 
  HeartHandshake, 
  Sparkles,
  ShieldCheck,
  Zap,
  User,
  Users,
  LayoutGrid,
  ListFilter
} from 'lucide-react';
import { getDepartmentBadge } from '../lib/demoData';

export default function ManagerDashboard() {
  const {
    tasks,
    scopedTasks,
    selectedMonth,
    setSelectedMonth,
    monthOptions,
    formatMonthLabel,
    profiles,
    metrics,
    currentUser,
    isAdmin,
    selectedStatus,
    setSelectedStatus,
    selectedPriority,
    setSelectedPriority,
    selectedAssignee,
    setSelectedAssignee,
    searchQuery,
    setSearchQuery
  } = useTasks();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('all');
  const [dashboardViewMode, setDashboardViewMode] = useState('list'); // 'list' | 'allocation'

  const isHRorAdmin = currentUser?.role === 'HR' || currentUser?.role === 'Admin' || currentUser?.role === 'admin' || currentUser?.department === 'HR' || currentUser?.role === 'hr';

  const activeAssignee = !isHRorAdmin 
    ? currentUser?.id 
    : (selectedAssignee === 'mine' ? currentUser?.id : selectedAssignee);

  const getMemberValue = (shortName) => {
    const prof = profiles.find(p => p.full_name?.toLowerCase().includes(shortName.toLowerCase()) || p.username?.toLowerCase() === shortName.toLowerCase());
    return prof ? prof.id : 'all';
  };

  const memberList = [
    { value: 'all', label: '👥 All Team Members' },
    { value: getMemberValue('Ashan'), label: 'Ashan' },
    { value: getMemberValue('Pulasthi'), label: 'Pulasthi' },
    { value: getMemberValue('Sadeepa'), label: 'Sadeepa' },
    { value: getMemberValue('Sahan'), label: 'Sahan' },
    { value: getMemberValue('Subodha'), label: 'Subodha' },
    { value: getMemberValue('Widura'), label: 'Widura' }
  ];

  const isToday = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  const isThisWeek = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const today = new Date();
    const day = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    return d >= startOfWeek && d <= endOfWeek;
  };

  const isThisMonth = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const today = new Date();
    return (
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  // Filter tasks combining all filters: Member, Timeframe, Status, Priority, Search Query
  // Strictly scoped to selectedMonth (Current Month, Past Month Archive, or All Time)
  const filteredTasks = scopedTasks.filter((task) => {
    // 1. Member Filter
    if (activeAssignee !== 'all') {
      const targetProfile = profiles.find(p => p.id === activeAssignee);
      if (!targetProfile) return false;
      
      const isAssigned = (
        task.assigned_to === targetProfile.id ||
        task.assigned_to === targetProfile.full_name ||
        task.assigned_to === targetProfile.username ||
        task.assigned_to?.toLowerCase() === targetProfile.full_name?.toLowerCase() ||
        task.assigned_to?.toLowerCase() === targetProfile.username?.toLowerCase()
      );
      if (!isAssigned) return false;
    }

    // 2. Timeframe Filter
    if (selectedTimeframe !== 'all') {
      if (!task.due_date) return false;
      if (selectedTimeframe === 'today' && !isToday(task.due_date)) return false;
      if (selectedTimeframe === 'week' && !isThisWeek(task.due_date)) return false;
      if (selectedTimeframe === 'month' && !isThisMonth(task.due_date)) return false;
    }

    // 3. Status Filter
    if (selectedStatus === 'pending' && task.status === 'done') return false;
    if (selectedStatus === 'review' && task.status !== 'review') return false;
    if (selectedStatus === 'completed' && task.status !== 'done') return false;

    // 4. Priority Filter
    if (selectedPriority !== 'all' && (task.priority || '').toLowerCase() !== selectedPriority.toLowerCase()) return false;

    // 5. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (task.title || '').toLowerCase().includes(q);
      const matchDesc = (task.description || '').toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }

    return true;
  });

  // Logged-in user's personal KPIs (Scoped to selected month)
  const myTasks = scopedTasks.filter((t) => t.assigned_to === (currentUser?.full_name || currentUser?.username));
  const myTotal = myTasks.length;
  const myCompleted = myTasks.filter((t) => t.status === 'done').length;
  const myPending = myTotal - myCompleted;
  const myRate = myTotal > 0 ? Math.round((myCompleted / myTotal) * 100) : 0;

  // Dynamic counts for status dropdown options (filtered by current member + timeframe)
  const memberTasks = scopedTasks.filter((task) => {
    if (activeAssignee !== 'all') {
      const targetProfile = profiles.find(p => p.id === activeAssignee);
      if (targetProfile) {
        return (
          task.assigned_to === targetProfile.id ||
          task.assigned_to === targetProfile.full_name ||
          task.assigned_to === targetProfile.username ||
          task.assigned_to?.toLowerCase() === targetProfile.full_name?.toLowerCase() ||
          task.assigned_to?.toLowerCase() === targetProfile.username?.toLowerCase()
        );
      }
      return false;
    }
    return true;
  });

  const memberTimeframeTasks = memberTasks.filter((task) => {
    if (selectedTimeframe !== 'all') {
      if (!task.due_date) return false;
      if (selectedTimeframe === 'today' && !isToday(task.due_date)) return false;
      if (selectedTimeframe === 'week' && !isThisWeek(task.due_date)) return false;
      if (selectedTimeframe === 'month' && !isThisMonth(task.due_date)) return false;
    }
    return true;
  });

  const currentTotal = memberTimeframeTasks.length;
  const currentCompleted = memberTimeframeTasks.filter(t => t.status === 'done').length;
  const currentPending = currentTotal - currentCompleted;
  const currentReview = memberTimeframeTasks.filter(t => t.status === 'review').length;

  const allReviewTasks = scopedTasks.filter(t => t.status === 'review');

  const handleOpenCreate = () => {
    setIsCreateModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Admin Operations Banner */}
      <div className="rounded-3xl glass-panel p-6 sm:p-7 border border-slate-800 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold mb-3">
              <ShieldCheck size={14} />
              HR & Admin Management Panel ({currentUser?.full_name})
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Company Task & Workflow Hub
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
              Assign and monitor Daily Checklists, Weekly Goals, and HR tasks for all 6 company members in real time.
            </p>
          </div>

          {/* Action Buttons & Month Filter Dropdown */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Month Filter Dropdown */}
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="rounded-xl glass-input px-3.5 py-2.5 text-xs font-bold text-indigo-300 bg-slate-900 border border-indigo-500/40 hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40 cursor-pointer shadow-lg transition-all"
                title="Filter tasks strictly by active or historical month"
              >
                {monthOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-slate-900 text-slate-200">
                    🗓️ {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => handleOpenCreate()}
              disabled={!isAdmin}
              title={!isAdmin ? "Only HR/Admin can assign tasks" : ""}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-lg ${
                isAdmin 
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98]'
                  : 'bg-slate-700 opacity-50 cursor-not-allowed'
              }`}
            >
              <Plus size={16} className="stroke-[3]" />
              Assign New Task
            </button>
          </div>
        </div>

        {/* Personal KPIs for Logged-In User */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-slate-800/80">
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-slate-400 text-xs font-medium">My Assigned Tasks</div>
            <div className="text-xl sm:text-2xl font-black text-white mt-1">
              {myTotal}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-slate-400 text-xs font-medium">Completed</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1 flex items-center gap-1.5">
              <CheckCircle2 size={18} />
              {myCompleted}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-slate-400 text-xs font-medium">Pending Checklist</div>
            <div className="text-xl sm:text-2xl font-black text-amber-400 mt-1 flex items-center gap-1.5">
              <Clock size={18} />
              {myPending}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="text-slate-400 text-xs font-medium">Completion Rate</div>
            <div className="text-xl sm:text-2xl font-black text-indigo-400 mt-1">
              {myRate}%
            </div>
          </div>
        </div>
      </div>

      {/* View Toggle / Tabs for HR / Admins: [All Tasks List] vs [Member Allocation Board] */}
      {isHRorAdmin && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 p-2.5 rounded-2xl border border-slate-800 backdrop-blur-md shadow-xl">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDashboardViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                dashboardViewMode === 'list'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Layers size={14} />
              <span>All Tasks List</span>
            </button>

            <button
              onClick={() => setDashboardViewMode('allocation')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                dashboardViewMode === 'allocation'
                  ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-purple-600/30 ring-1 ring-purple-400/50'
                  : 'text-slate-400 hover:text-purple-300 hover:bg-slate-800/60'
              }`}
            >
              <Users size={14} className="text-purple-400" />
              <span>Member Allocation Board</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-extrabold bg-purple-500/30 text-purple-200 border border-purple-500/40">
                6 Members
              </span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 pr-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              {dashboardViewMode === 'allocation' 
                ? '6-Member Workload & Project Allocation Grid' 
                : 'Comprehensive Task Feed & Filters'}
            </span>
          </div>
        </div>
      )}

      {/* DYNAMIC VIEW: Member Allocation Board vs All Tasks List */}
      {dashboardViewMode === 'allocation' ? (
        <MemberAllocationBoard />
      ) : (
        <>
          {/* 6-Person Team Progress Grid */}
          <div className="rounded-3xl glass-panel p-5 border border-slate-800">
            <TeamProgressGrid />
          </div>

          {/* Awaiting Approval Section (For HR/Admin) */}
          {isAdmin && allReviewTasks.length > 0 && (
            <div className="space-y-4 mb-8">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/30 pb-3">
                <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                  </span>
                  Awaiting HR Approval ({allReviewTasks.length})
                </h3>
              </div>
              <div className="flex flex-col gap-3.5">
                {allReviewTasks.map((task) => (
                  <TaskCard key={`review-${task.id}`} task={task} />
                ))}
              </div>
            </div>
          )}

          {/* Task Filters & Feed */}
          <div className="space-y-4">
            {/* Status Tab (previously Categories) */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex flex-wrap items-center gap-4">
                <h3 className="text-lg font-bold text-white">Tasks Overview</h3>

                {/* Time Period Filters (HR / Admin Quick Tabs) */}
                {isHRorAdmin && (
                  <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setSelectedTimeframe('today')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        selectedTimeframe === 'today'
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>📅</span> Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTimeframe('week')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        selectedTimeframe === 'week'
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>🗓️</span> This Week
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTimeframe('month')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        selectedTimeframe === 'month'
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>📊</span> This Month
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTimeframe('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        selectedTimeframe === 'all'
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>⚡</span> All Tasks
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>
                  {!isHRorAdmin 
                    ? `Showing tasks for: ${currentUser?.full_name || currentUser?.username}`
                    : "HR / Admin Dashboard Overview"
                  }
                </span>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/70 p-3 rounded-2xl border border-slate-800">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isHRorAdmin ? "Search all tasks..." : "Search my assigned tasks..."}
                  className="w-full pl-9 pr-4 py-2 rounded-xl glass-input text-xs text-white placeholder:text-slate-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Role-Based Member Filter Dropdown (HR/Admin only) */}
                {isHRorAdmin && (
                  <select
                    value={activeAssignee}
                    onChange={(e) => setSelectedAssignee(e.target.value)}
                    className="rounded-xl glass-input px-3 py-2 text-xs text-slate-200 bg-slate-900 cursor-pointer font-bold border-indigo-500/30 hover:border-indigo-500/50 transition-colors"
                  >
                    {memberList.map((option) => (
                      <option key={option.value} value={option.value} className="bg-slate-900 text-slate-200">
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}

                {/* Status */}
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="rounded-xl glass-input px-3 py-2 text-xs text-slate-200 bg-slate-900 cursor-pointer"
                >
                  <option value="all">All Statuses ({currentTotal})</option>
                  <option value="pending">Pending Only ({currentPending})</option>
                  <option value="review">In Review ({currentReview})</option>
                  <option value="completed">Completed Only ({currentCompleted})</option>
                </select>

                {/* Priority */}
                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  className="rounded-xl glass-input px-3 py-2 text-xs text-slate-200 bg-slate-900 cursor-pointer"
                >
                  <option value="all">All Priorities</option>
                  <option value="Urgent">Urgent</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            {/* Task Filtering Summary Badge */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/40 px-4 py-2.5 rounded-xl border border-slate-800/80">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <span>
                  Month: <strong className="text-indigo-300">{formatMonthLabel(selectedMonth)}</strong> &bull; Showing {activeAssignee === 'all' ? "All Members'" : `${profiles.find(p => p.id === activeAssignee)?.full_name || 'My'}`} Tasks &bull;{' '}
                  {selectedTimeframe === 'all' && 'All Due Dates'}
                  {selectedTimeframe === 'today' && 'Due Today'}
                  {selectedTimeframe === 'week' && 'Due This Week'}
                  {selectedTimeframe === 'month' && 'Due This Month'}
                  {' '}({filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'})
                </span>
              </div>
              {selectedMonth !== 'current' && (
                <button
                  onClick={() => setSelectedMonth('current')}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 underline font-bold"
                >
                  Return to This Month
                </button>
              )}
            </div>

            {/* Task Cards Grid */}
            {filteredTasks.length === 0 ? (
              <div className="text-center py-16 rounded-3xl glass-panel border border-slate-800">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-3">
                  <CheckCircle2 size={24} />
                </div>
                <h4 className="text-sm font-bold text-slate-200">No tasks found</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  No tasks currently match your filter criteria. Click below to assign a new task.
                </p>
                <button
                  onClick={() => handleOpenCreate()}
                  disabled={!isAdmin}
                  title={!isAdmin ? "Only HR/Admin can assign tasks" : ""}
                  className={`mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold transition-colors shadow-md ${
                    isAdmin ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-slate-700 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <Plus size={14} />
                  Assign Task Now
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                {filteredTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Create Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
