import React, { useState } from 'react';
import { useTasks } from '../context/TaskContext';
import CreateTaskModal from './CreateTaskModal';
import { 
  Plus, 
  Search, 
  Check, 
  Clock, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Tag, 
  Trash2, 
  ShieldCheck, 
  Sparkles, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Flame,
  Filter
} from 'lucide-react';
import { TEAM_MEMBERS, getDepartmentBadge } from '../lib/demoData';

// Helper to extract project tag from task
export const extractProjectTag = (task) => {
  if (!task) return null;
  
  // 1. Bracket tag: [Oceana Trinco] Video Editing
  const bracketMatch = task.title?.match(/^\[(.*?)\]/);
  if (bracketMatch) return bracketMatch[1].trim();

  // 2. Colon tag: Oceana Trinco: Video Editing
  const colonMatch = task.title?.match(/^([a-zA-Z0-9\s]{3,20}):\s+/);
  if (colonMatch && !['urgent', 'reminder', 'meeting', 'task', 'todo', 'note'].includes(colonMatch[1].toLowerCase().trim())) {
    return colonMatch[1].trim();
  }

  // 3. Keyword matching for common team projects
  const text = `${task.title || ''} ${task.description || ''}`.toLowerCase();
  if (text.includes('oceana') || text.includes('trinco')) return 'Oceana Trinco';
  if (text.includes('social') || text.includes('marketing') || text.includes('campaign')) return 'Social Marketing';
  if (text.includes('financial') || text.includes('audit') || text.includes('invoice') || text.includes('q3')) return 'Finance & Audit';
  if (text.includes('video') || text.includes('footage') || text.includes('render') || text.includes('assets')) return 'Video Production';
  if (text.includes('roster') || text.includes('hr') || text.includes('hiring') || text.includes('interview')) return 'HR Operations';

  return null;
};

// Helper to clean title
export const extractCleanTitle = (task) => {
  if (!task || !task.title) return '';
  return task.title.replace(/^\[(.*?)\]\s*/, '').trim();
};

// Project tag color theme
export const getProjectTagTheme = (tag) => {
  if (!tag) return { badge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' };
  const t = tag.toLowerCase();
  if (t.includes('oceana') || t.includes('trinco')) return { badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-cyan-950/30' };
  if (t.includes('social') || t.includes('market')) return { badge: 'bg-pink-500/20 text-pink-300 border-pink-500/40 shadow-pink-950/30' };
  if (t.includes('financ') || t.includes('audit')) return { badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-emerald-950/30' };
  if (t.includes('video') || t.includes('product')) return { badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-purple-950/30' };
  if (t.includes('hr') || t.includes('ops')) return { badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-950/30' };
  return { badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' };
};

// Priority Theme Details
const getPriorityTheme = (prio) => {
  switch (prio?.toLowerCase()) {
    case 'urgent':
      return {
        label: 'Urgent',
        badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
        dot: 'bg-rose-500'
      };
    case 'high':
      return {
        label: 'High',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        dot: 'bg-amber-500'
      };
    case 'medium':
      return {
        label: 'Medium',
        badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
        dot: 'bg-sky-500'
      };
    default:
      return {
        label: 'Normal',
        badge: 'bg-slate-800 text-slate-400 border-slate-700',
        dot: 'bg-slate-500'
      };
  }
};

// Format Due Date
const formatDueDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  const diffHours = (d - now) / (1000 * 60 * 60);

  const dateFormatted = d.toLocaleDateString([], { month: 'short', day: 'numeric' });

  if (diffHours < 0) {
    return {
      label: `Overdue (${dateFormatted})`,
      badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30 font-bold'
    };
  } else if (diffHours <= 24) {
    return {
      label: `Due Today`,
      badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30 font-semibold animate-pulse'
    };
  } else if (diffHours <= 72) {
    return {
      label: `In ${Math.ceil(diffHours / 24)}d (${dateFormatted})`,
      badge: 'bg-sky-500/15 text-sky-300 border-sky-500/30 font-medium'
    };
  } else {
    return {
      label: `📅 ${dateFormatted}`,
      badge: 'bg-slate-800/80 text-slate-400 border-slate-700/70'
    };
  }
};

export default function MemberAllocationBoard() {
  const { 
    tasks, 
    scopedTasks,
    selectedMonth,
    setSelectedMonth,
    monthOptions,
    formatMonthLabel,
    profiles, 
    currentUser, 
    isAdmin, 
    toggleTaskStatus, 
    approveTask, 
    rejectTask, 
    deleteTask 
  } = useTasks();

  const isHRorAdmin = currentUser?.role === 'HR' || currentUser?.role === 'admin' || currentUser?.role === 'Admin' || currentUser?.department === 'HR' || currentUser?.role === 'hr' || isAdmin;

  const [selectedMemberForAssign, setSelectedMemberForAssign] = useState(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [boardSearch, setBoardSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, pending, review, completed
  const [priorityFilter, setPriorityFilter] = useState('all'); // all, urgent, high, medium, low
  const [selectedTaskDetails, setSelectedTaskDetails] = useState(null);

  // Use profiles or fallback to standard 6 members
  const memberList = profiles && profiles.length > 0 ? profiles : TEAM_MEMBERS;

  // Open modal pre-selected for specific member
  const handleOpenAssignModal = (member) => {
    setSelectedMemberForAssign(member.full_name || member.username);
    setIsAssignModalOpen(true);
  };

  // Check if a task belongs to a member
  const isTaskForMember = (task, member) => {
    if (!task || !member) return false;
    const a = task.assigned_to;
    return (
      a === member.id ||
      a === member.full_name ||
      a === member.username ||
      a?.toLowerCase() === member.full_name?.toLowerCase() ||
      a?.toLowerCase() === member.username?.toLowerCase() ||
      a?.toLowerCase()?.includes(member.username?.toLowerCase()) ||
      a?.toLowerCase()?.includes(member.full_name?.toLowerCase())
    );
  };

  // Filter tasks based on search, status, and priority (strictly scoped to selected month)
  const getTasksForMember = (member) => {
    return scopedTasks.filter((task) => {
      // 1. Assignee Match
      if (!isTaskForMember(task, member)) return false;

      // 2. Status filter
      if (statusFilter === 'pending' && (task.status === 'done' || task.status === 'review')) return false;
      if (statusFilter === 'review' && task.status !== 'review') return false;
      if (statusFilter === 'completed' && task.status !== 'done') return false;

      // 3. Priority filter
      if (priorityFilter !== 'all' && (task.priority || '').toLowerCase() !== priorityFilter.toLowerCase()) return false;

      // 4. Search Query (Title, Description, Project Tag)
      if (boardSearch.trim()) {
        const q = boardSearch.toLowerCase().trim();
        const title = (task.title || '').toLowerCase();
        const desc = (task.description || '').toLowerCase();
        const tag = (extractProjectTag(task) || '').toLowerCase();
        if (!title.includes(q) && !desc.includes(q) && !tag.includes(q)) return false;
      }

      return true;
    });
  };

  // Global KPI Calculations for the Allocation Board (Scoped to selected month)
  const totalTasksCount = scopedTasks.length;
  const completedTasksCount = scopedTasks.filter(t => t.status === 'done').length;
  const pendingTasksCount = scopedTasks.filter(t => t.status !== 'done' && t.status !== 'review').length;
  const reviewTasksCount = scopedTasks.filter(t => t.status === 'review').length;
  const overallRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Board Header Banner & KPI Summary */}
      <div className="rounded-3xl bg-white p-6 sm:p-7 border border-[#e7e1d6] shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#1f5c5a]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e8f0ef] border border-[#a3c7c4] text-[#1f5c5a] text-xs font-bold mb-3 shadow-xs">
              <ShieldCheck size={14} className="text-[#1f5c5a]" />
              HR Member-Wise Allocation &amp; Project Board
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#20262e] tracking-tight flex items-center gap-3">
              <span>6-Person Project Allocation Grid</span>
              <span className="text-xs px-2.5 py-1 rounded-lg bg-[#e6f0e8] text-[#2e6930] border border-[#c2dfc8] font-bold">
                Live Supabase Sync
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-[#6f6a60] mt-1 max-w-2xl">
              Real-time workload distribution, project tags, and live checklist progress across all 6 company team members for <strong className="text-[#1f5c5a]">{formatMonthLabel(selectedMonth)}</strong>.
            </p>
          </div>

          {/* Quick Create Task Action & Month Filter */}
          <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
            {/* Month Filter Dropdown */}
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="rounded-xl glass-input px-3.5 py-2.5 text-xs font-bold text-[#1f5c5a] bg-white border border-[#a3c7c4] hover:border-[#1f5c5a] focus:ring-2 focus:ring-[#1f5c5a]/20 cursor-pointer shadow-xs transition-all"
                title="Select Active or Past Month to Filter Board"
              >
                {monthOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-white text-[#20262e]">
                    🗓️ {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {isAdmin && (
              <button
                onClick={() => {
                  setSelectedMemberForAssign(null);
                  setIsAssignModalOpen(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-xs bg-[#1f5c5a] hover:bg-[#174644] hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus size={16} className="stroke-[3]" />
                <span>+ Quick Task Assignment</span>
              </button>
            )}
          </div>
        </div>

        {/* Workload Metric Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-[#e7e1d6]">
          <div className="p-3 rounded-2xl bg-[#faf8f4] border border-[#e7e1d6]">
            <div className="text-[#6f6a60] text-[11px] font-semibold">Total Allocated</div>
            <div className="text-xl sm:text-2xl font-black text-[#20262e] mt-0.5">
              {totalTasksCount}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#faf8f4] border border-[#e7e1d6]">
            <div className="text-[#6f6a60] text-[11px] font-semibold">In Progress / Todo</div>
            <div className="text-xl sm:text-2xl font-black text-[#9a6a14] mt-0.5 flex items-center gap-1.5">
              <Clock size={16} />
              {pendingTasksCount}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <div className="text-slate-400 text-[11px] font-semibold">Awaiting HR Review</div>
            <div className="text-xl sm:text-2xl font-black text-purple-400 mt-0.5 flex items-center gap-1.5">
              <AlertCircle size={16} />
              {reviewTasksCount}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <div className="text-slate-400 text-[11px] font-semibold">Completed</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-0.5 flex items-center gap-1.5">
              <CheckCircle2 size={16} />
              {completedTasksCount}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 col-span-2 sm:col-span-1">
            <div className="text-slate-400 text-[11px] font-semibold">Overall Progress</div>
            <div className="text-xl sm:text-2xl font-black text-indigo-400 mt-0.5 flex items-center gap-1.5">
              <TrendingUp size={16} />
              {overallRate}%
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar / Search & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800 backdrop-blur-md">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={boardSearch}
            onChange={(e) => setBoardSearch(e.target.value)}
            placeholder="Search project tags, tasks, instructions..."
            className="w-full pl-9 pr-4 py-2 rounded-xl glass-input text-xs text-white placeholder:text-slate-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Status Filter */}
          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
            {[
              { id: 'all', label: 'All Status' },
              { id: 'pending', label: 'Pending' },
              { id: 'review', label: 'In Review' },
              { id: 'completed', label: 'Done' }
            ].map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStatusFilter(s.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === s.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-xl glass-input px-3 py-1.5 text-xs text-slate-200 bg-slate-900 cursor-pointer font-bold border-slate-800"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">🔴 Urgent</option>
            <option value="high">🟠 High</option>
            <option value="medium">🔵 Medium</option>
            <option value="low">⚪ Low</option>
          </select>
        </div>
      </div>

      {/* 6-MEMBER ALLOCATION KANBAN COLUMNS */}
      <div className="overflow-x-auto pb-6 -mx-2 px-2 sm:mx-0 sm:px-0 scrollbar-thin">
        <div className="flex gap-4 items-start min-w-[1680px]">
          {memberList.map((member) => {
            const memberTasks = getTasksForMember(member);
            const totalMemberTasks = scopedTasks.filter(t => isTaskForMember(t, member)).length;
            const completedMemberTasks = scopedTasks.filter(t => isTaskForMember(t, member) && t.status === 'done').length;
            const pendingMemberTasks = totalMemberTasks - completedMemberTasks;
            const memberRate = totalMemberTasks > 0 ? Math.round((completedMemberTasks / totalMemberTasks) * 100) : 0;

          return (
            <div 
              key={member.id}
              className="w-[270px] min-w-[270px] max-w-[270px] rounded-3xl glass-panel border border-slate-800/90 bg-slate-950/70 shadow-xl overflow-hidden flex flex-col min-h-[500px]"
            >
              {/* MEMBER COLUMN HEADER */}
              <div className="p-4 border-b border-slate-800/80 bg-slate-900/60 relative">
                <div className="flex items-center gap-3 mb-2.5">
                  {/* Member Avatar */}
                  <div className="relative">
                    <img
                      src={member.avatar_url}
                      alt={member.full_name}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/40 shadow-md"
                    />
                    <span 
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${
                        member.role === 'admin' || member.role === 'HR' ? 'bg-amber-400' : 'bg-emerald-400'
                      }`} 
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-black text-white truncate">
                        {member.full_name || member.username}
                      </h3>
                      {(member.role === 'admin' || member.role === 'HR') && (
                        <span className="text-[8px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 flex-shrink-0">
                          Admin
                        </span>
                      )}
                    </div>
                    <span className={`inline-block text-[9px] font-semibold px-2 py-0.5 rounded border mt-0.5 ${getDepartmentBadge(member.department)}`}>
                      {member.department}
                    </span>
                  </div>
                </div>

                {/* Progress Mini Bar & Workload KPI */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="text-slate-400">
                      {totalMemberTasks} Tasks ({pendingMemberTasks} pending)
                    </span>
                    <span className="text-indigo-400 font-black">
                      {memberRate}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${memberRate}%` }}
                    />
                  </div>
                </div>

                {/* Quick "+ Assign Task to [Name]" Action */}
                {isHRorAdmin && (
                  <button
                    onClick={() => handleOpenAssignModal(member)}
                    className="w-full mt-3 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-[11px] font-bold transition-all hover:shadow-md hover:shadow-indigo-600/20"
                  >
                    <Plus size={13} className="stroke-[3]" />
                    <span>+ Assign Task to {member.full_name?.split(' ')[0] || member.username}</span>
                  </button>
                )}
              </div>

              {/* TASKS VERTICAL FEED */}
              <div className="p-3 flex-1 flex flex-col gap-3 overflow-y-auto max-h-[650px] scrollbar-thin">
                {memberTasks.length === 0 ? (
                  <div className="text-center py-10 px-3 rounded-2xl border border-dashed border-slate-800/80 bg-slate-900/20 my-auto">
                    <div className="w-8 h-8 rounded-xl bg-slate-800/60 text-slate-500 mx-auto flex items-center justify-center mb-2">
                      <CheckCircle2 size={16} />
                    </div>
                    <span className="text-[11px] font-bold text-slate-400 block">
                      No active tasks
                    </span>
                    <span className="text-[9px] text-slate-500 block mt-0.5">
                      {isAdmin ? 'Click "+ Assign Task" above' : 'All caught up!'}
                    </span>
                  </div>
                ) : (
                  memberTasks.map((task) => {
                    const isDone = task.status === 'done';
                    const isReview = task.status === 'review';
                    const projectTag = extractProjectTag(task);
                    const cleanTitle = extractCleanTitle(task);
                    const tagTheme = getProjectTagTheme(projectTag);
                    const prioTheme = getPriorityTheme(task.priority);
                    const dueInfo = formatDueDate(task.due_date);

                    return (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTaskDetails(task)}
                        className={`group relative rounded-2xl p-3 transition-all duration-200 border cursor-pointer ${
                          isDone
                            ? 'bg-slate-900/40 border-slate-800/60 opacity-65 hover:opacity-100'
                            : isReview
                            ? 'bg-slate-900/90 border-amber-500/40 shadow-lg shadow-amber-950/20'
                            : 'bg-slate-900/80 hover:bg-slate-900 border-slate-800 hover:border-indigo-500/40 shadow-md shadow-black/20'
                        }`}
                      >
                        {/* Header: Project Tag & Priority Badges */}
                        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
                          {/* Project Name / Tag Pill */}
                          {projectTag ? (
                            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-lg border flex items-center gap-1 shadow-sm ${tagTheme.badge}`}>
                              <Tag size={10} />
                              <span className="truncate max-w-[120px]">{projectTag}</span>
                            </span>
                          ) : (
                            <span className="text-[9px] font-semibold text-slate-500 bg-slate-950/60 px-1.5 py-0.5 rounded border border-slate-800">
                              Task
                            </span>
                          )}

                          {/* Priority Pill */}
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border flex items-center gap-1 ${prioTheme.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${prioTheme.dot}`} />
                            {prioTheme.label}
                          </span>
                        </div>

                        {/* Title with Checkbox Toggle */}
                        <div className="flex items-start gap-2.5">
                          {/* Live 1-Click Checkbox Toggle */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTaskStatus(task.id);
                            }}
                            className={`mt-0.5 w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 transition-all border ${
                              isDone
                                ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 scale-105'
                                : isReview
                                ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-md shadow-amber-500/20 scale-105'
                                : 'bg-slate-950/70 border-slate-700 text-transparent hover:border-indigo-500 hover:text-indigo-400 hover:bg-indigo-950/30'
                            }`}
                            title={isDone ? 'Mark as incomplete' : 'Mark as complete'}
                          >
                            <Check size={12} className="stroke-[3]" />
                          </button>

                          {/* Task Title */}
                          <div className="min-w-0 flex-1">
                            <h4 className={`text-xs font-bold leading-snug transition-colors ${
                              isDone 
                                ? 'text-slate-400 line-through' 
                                : isReview
                                ? 'text-amber-200'
                                : 'text-slate-100 group-hover:text-indigo-200'
                            }`}>
                              {cleanTitle || task.title}
                            </h4>

                            {/* Task Description / Note */}
                            {task.description && (
                              <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed bg-slate-950/40 p-1.5 rounded-lg border border-slate-800/60">
                                {task.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Footer Details: Due Date & Review Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-1.5 mt-2.5 pt-2 border-t border-slate-800/60 text-[10px]">
                          {/* Due Date Indicator */}
                          {dueInfo ? (
                            <span className={`px-1.5 py-0.5 rounded-md border text-[9px] flex items-center gap-1 ${dueInfo.badge}`}>
                              <Calendar size={10} />
                              <span>{dueInfo.label}</span>
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-500">No deadline</span>
                          )}

                          {/* Status Pill or HR Review Actions */}
                          {isReview && isAdmin ? (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => approveTask(task.id)}
                                className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[9px] transition-colors shadow-sm"
                                title="Approve Task"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => rejectTask(task.id)}
                                className="px-1.5 py-0.5 rounded bg-rose-900/60 hover:bg-rose-800 text-rose-300 font-bold text-[9px] transition-colors border border-rose-700/60"
                                title="Reject Task"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                              isDone 
                                ? 'bg-emerald-500/15 text-emerald-400' 
                                : isReview 
                                ? 'bg-amber-500/15 text-amber-300' 
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {isDone ? '✓ Completed' : isReview ? '⏳ In Review' : 'To Do'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
        </div>
      </div>

      {/* Task Details Popup Modal */}
      {selectedTaskDetails && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
          onClick={() => setSelectedTaskDetails(null)}
        >
          <div 
            className="w-full max-w-md rounded-3xl glass-panel border border-slate-700 p-6 shadow-2xl space-y-4 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">Task Details</span>
                {extractProjectTag(selectedTaskDetails) && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getProjectTagTheme(extractProjectTag(selectedTaskDetails)).badge}`}>
                    🏷️ {extractProjectTag(selectedTaskDetails)}
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedTaskDetails(null)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 rounded-lg hover:bg-slate-800"
              >
                ✕ Close
              </button>
            </div>

            <div>
              <h3 className="text-base font-bold text-white">
                {extractCleanTitle(selectedTaskDetails) || selectedTaskDetails.title}
              </h3>
              {selectedTaskDetails.description && (
                <p className="text-xs text-slate-300 mt-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800 whitespace-pre-wrap leading-relaxed">
                  {selectedTaskDetails.description}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2">
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Assigned Member</span>
                <span className="font-bold text-slate-200 mt-0.5 block truncate">
                  {selectedTaskDetails.assigned_to}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Priority</span>
                <span className="font-bold text-indigo-300 mt-0.5 block capitalize">
                  {selectedTaskDetails.priority || 'Normal'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              {isAdmin && (
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this task?')) {
                      deleteTask(selectedTaskDetails.id);
                      setSelectedTaskDetails(null);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 text-xs font-bold border border-rose-800/40 transition-colors"
                >
                  <Trash2 size={13} />
                  <span>Delete Task</span>
                </button>
              )}

              <button
                onClick={() => {
                  toggleTaskStatus(selectedTaskDetails.id);
                  setSelectedTaskDetails(null);
                }}
                className={`ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                  selectedTaskDetails.status === 'done'
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/30'
                }`}
              >
                <Check size={14} className="stroke-[3]" />
                <span>{selectedTaskDetails.status === 'done' ? 'Mark as Pending' : 'Mark as Completed'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Creation Modal */}
      <CreateTaskModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        initialAssignee={selectedMemberForAssign}
      />
    </div>
  );
}
