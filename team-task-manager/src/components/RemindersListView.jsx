import React, { useState, useMemo } from 'react';
import { useTasks } from '../context/TaskContext';
import { 
  Bell, 
  BellRing, 
  AlertTriangle, 
  Clock, 
  Calendar as CalendarIcon, 
  Check, 
  CheckCircle2, 
  Plus, 
  Send, 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  X, 
  Users, 
  Sparkles, 
  AlertCircle, 
  ChevronRight,
  ShieldCheck,
  Tag,
  ExternalLink
} from 'lucide-react';
import CreateEventModal from './CreateEventModal';
import { getDepartmentBadge } from '../lib/demoData';
import { 
  toDateStringOnly, 
  formatDisplayDate, 
  formatEventDateRange, 
  formatEventTime,
  getCountdownLabel 
} from '../lib/dateUtils';

export default function RemindersListView() {
  const { 
    currentUser, 
    isAdmin, 
    calendarEvents, 
    tasks, 
    profiles, 
    toggleTaskStatus, 
    deleteCalendarEvent,
    setCurrentView 
  } = useTasks();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedNoticeDetails, setSelectedNoticeDetails] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMember, setFilterMember] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all'); // all, hr_reminder, task_alert, meeting_alert

  const todayStr = toDateStringOnly(new Date());

  const getProfileForAssignee = (assigneeId) => {
    return profiles.find(p => p.id === assigneeId);
  };

  // Helper for multiple member label display
  const getEventMemberDisplay = (evt) => {
    if (!evt) return { type: 'all', label: '👥 All Team', shortNames: 'All Team', profilesList: [] };

    const uids = (Array.isArray(evt.user_ids) && evt.user_ids.length > 0)
      ? evt.user_ids
      : (evt.member_id ? [evt.member_id] : []);

    if (evt.is_all_team || uids.length === 0) {
      return {
        type: 'all',
        label: '👥 All Team',
        shortNames: 'All Team',
        profilesList: []
      };
    }

    const assignedProfiles = uids.map(id => getProfileForAssignee(id)).filter(Boolean);

    if (assignedProfiles.length === 1) {
      const p = assignedProfiles[0];
      const firstName = p.full_name?.split(' ')[0] || p.username;
      return {
        type: 'single',
        label: firstName,
        shortNames: firstName,
        profilesList: assignedProfiles
      };
    }

    if (assignedProfiles.length > 1) {
      const firstNames = assignedProfiles.map(p => p.full_name?.split(' ')[0] || p.username).join(', ');
      return {
        type: 'multiple',
        label: firstNames,
        shortNames: firstNames,
        profilesList: assignedProfiles
      };
    }

    return {
      type: 'single',
      label: evt.member_name || 'Member',
      shortNames: evt.member_name || 'Member',
      profilesList: []
    };
  };

  // UNIFIED NOTIFICATIONS & REMINDERS FEED
  const allReminders = useMemo(() => {
    const list = [];
    const nowStr = todayStr;

    // 1. Calendar Reminders & Special Notices (from calendar_events)
    calendarEvents.forEach(evt => {
      if (evt.type === 'reminder' || evt.event_type === 'reminder') {
        const creatorProfile = profiles.find(p => p.id === evt.created_by);
        const isHRCreated = creatorProfile?.role === 'admin' || creatorProfile?.department === 'HR';
        const creatorLabel = isHRCreated 
          ? `Sent by HR (${creatorProfile.full_name || creatorProfile.username})` 
          : (creatorProfile?.full_name ? `Sent by ${creatorProfile.full_name}` : 'HR / Admin Notice');

        const targetDate = toDateStringOnly(evt.start_date || evt.date);
        const countdown = getCountdownLabel(targetDate, nowStr);

        list.push({
          id: `reminder-${evt.id}`,
          rawId: evt.id,
          isTaskAlert: false,
          category: 'hr_reminder', // hr_reminder, task_overdue, task_deadline, meeting_alert
          icon: '🟣',
          type: 'reminder',
          title: evt.title,
          description: evt.description || evt.notes || '',
          date: targetDate,
          endDate: evt.end_date ? toDateStringOnly(evt.end_date) : null,
          timeStr: formatEventTime(evt),
          senderInfo: creatorLabel,
          creatorProfile,
          userIds: evt.user_ids || (evt.member_id ? [evt.member_id] : []),
          isAllTeam: evt.is_all_team || (!evt.user_ids?.length && !evt.member_id),
          countdown,
          originalEvent: evt
        });
      } else if (evt.type === 'meeting') {
        const targetDate = toDateStringOnly(evt.start_date || evt.date);
        const countdown = getCountdownLabel(targetDate, nowStr);
        if (countdown.diffDays >= -1 && countdown.diffDays <= 7) {
          const creatorProfile = profiles.find(p => p.id === evt.created_by);
          list.push({
            id: `meeting-alert-${evt.id}`,
            rawId: evt.id,
            isTaskAlert: false,
            category: 'meeting_alert',
            icon: '🔵',
            type: 'meeting',
            title: `Meeting: ${evt.title}`,
            description: evt.description || 'Scheduled sync / scrum meeting',
            date: targetDate,
            endDate: evt.end_date ? toDateStringOnly(evt.end_date) : null,
            timeStr: formatEventTime(evt),
            senderInfo: creatorProfile ? `Scheduled by ${creatorProfile.full_name || creatorProfile.username}` : 'Team Meeting Alert',
            creatorProfile,
            userIds: evt.user_ids || (evt.member_id ? [evt.member_id] : []),
            isAllTeam: evt.is_all_team || (!evt.user_ids?.length && !evt.member_id),
            countdown,
            originalEvent: evt
          });
        }
      }
    });

    // 2. Overdue & Approaching Task Alerts (from tasks)
    if (Array.isArray(tasks)) {
      tasks.forEach(t => {
        if (t.status !== 'completed' && t.status !== 'done' && t.due_date) {
          const dueDateStr = toDateStringOnly(t.due_date);
          const countdown = getCountdownLabel(dueDateStr, nowStr);
          const assignee = profiles.find(p => p.id === t.assignee_id);
          const creator = profiles.find(p => p.id === t.created_by);
          const isOverdue = countdown.diffDays < 0;
          const isApproaching = countdown.diffDays >= 0 && countdown.diffDays <= 5;

          if (isOverdue || isApproaching) {
            list.push({
              id: `task-alert-${t.id}`,
              rawId: t.id,
              isTaskAlert: true,
              category: isOverdue ? 'task_overdue' : 'task_deadline',
              icon: isOverdue ? '🔴' : '⏰',
              type: 'task_alert',
              title: isOverdue ? `Overdue: ${t.title}` : `Deadline: ${t.title}`,
              description: t.description || `Task priority: ${t.priority.toUpperCase()}. Please complete and submit assets.`,
              date: dueDateStr,
              endDate: null,
              timeStr: 'Due Date',
              senderInfo: creator ? `Assigned by ${creator.full_name || creator.username}` : 'Automated Task System Alert',
              creatorProfile: creator,
              userIds: t.assignee_id ? [t.assignee_id] : [],
              isAllTeam: false,
              countdown,
              task: t
            });
          }
        }
      });
    }

    return list;
  }, [calendarEvents, tasks, profiles, todayStr]);

  // Filtered & Personalized Reminders
  const filteredReminders = useMemo(() => {
    return allReminders
      .filter(item => {
        // 1. Member scope filter
        if (filterMember !== 'all') {
          const matchMember = item.isAllTeam || (item.userIds && item.userIds.includes(filterMember));
          if (!matchMember) return false;
        } else if (!isAdmin && currentUser?.id) {
          // Regular staff member sees only direct or company-wide
          const matchSelf = item.isAllTeam || (item.userIds && item.userIds.includes(currentUser.id));
          if (!matchSelf) return false;
        }

        // 2. Category filter
        if (filterCategory === 'hr_reminder' && item.category !== 'hr_reminder') return false;
        if (filterCategory === 'task_alert' && item.category !== 'task_overdue' && item.category !== 'task_deadline') return false;
        if (filterCategory === 'meeting_alert' && item.category !== 'meeting_alert') return false;

        // 3. Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = item.title?.toLowerCase().includes(q);
          const matchDesc = item.description?.toLowerCase().includes(q);
          const matchSender = item.senderInfo?.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchSender) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Priority 1: Overdue notices first (most critical)
        if (a.countdown.diffDays < 0 && b.countdown.diffDays >= 0) return -1;
        if (b.countdown.diffDays < 0 && a.countdown.diffDays >= 0) return 1;
        // Priority 2: Due Today
        if (a.countdown.diffDays === 0 && b.countdown.diffDays > 0) return -1;
        if (b.countdown.diffDays === 0 && a.countdown.diffDays > 0) return 1;
        // Priority 3: Chronological
        return a.date.localeCompare(b.date);
      });
  }, [allReminders, filterMember, filterCategory, searchQuery, isAdmin, currentUser]);

  // Metrics
  const overdueCount = allReminders.filter(r => r.countdown.diffDays < 0).length;
  const todayCount = allReminders.filter(r => r.countdown.diffDays === 0).length;
  const hrNoticesCount = allReminders.filter(r => r.category === 'hr_reminder').length;

  const handleDeleteNotice = async (notice) => {
    if (notice.originalEvent && window.confirm(`Delete reminder "${notice.title}"?`)) {
      try {
        await deleteCalendarEvent(notice.originalEvent.id);
        setSelectedNoticeDetails(null);
      } catch (err) {
        alert("Failed to delete notice: " + err.message);
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      
      {/* 1. Header Banner */}
      <div className="rounded-3xl bg-white p-6 sm:p-7 border border-[#e7e1d6] relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#1f5c5a]/5 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#e8f0ef] border border-[#a3c7c4] flex items-center justify-center text-[#1f5c5a] shadow-xs flex-shrink-0">
              <BellRing size={28} />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#e8f0ef] border border-[#a3c7c4] text-[#1f5c5a] text-[11px] font-bold mb-1">
                <Sparkles size={12} />
                Notice &amp; Action Hub
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-[#20262e] tracking-tight">
                Reminders &amp; Action Alerts
              </h1>
              <p className="text-xs text-[#6f6a60] mt-0.5">
                {filterMember === 'all'
                  ? (!isAdmin && currentUser?.full_name ? `Personalized reminders & deadlines for ${currentUser.full_name}` : 'Direct HR notices, impending task deadlines, and team-wide alerts.')
                  : `Personalized view for ${profiles.find(p => p.id === filterMember)?.full_name || 'Selected Member'}`}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            {/* Quick Switch to Calendar */}
            <button
              onClick={() => setCurrentView('calendar')}
              className="px-3.5 py-2.5 rounded-xl bg-[#faf8f4] hover:bg-[#e8f0ef] text-[#20262e] text-xs font-bold border border-[#e7e1d6] transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <CalendarIcon size={14} className="text-[#1f5c5a]" />
              <span>View Calendar</span>
            </button>

            {/* HR / Admin Dispatch Button */}
            {isAdmin && (
              <button
                onClick={() => {
                  setEditingEvent(null);
                  setIsCreateModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-xs bg-[#1f5c5a] hover:bg-[#174644] hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus size={16} className="stroke-[3]" />
                <span>+ Add New Reminder / Alert</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-[#e7e1d6]">
          <div className="p-3 rounded-2xl bg-[#faf8f4] border border-[#e7e1d6] text-center">
            <div className="text-[11px] text-[#6f6a60] font-medium">Active Notices</div>
            <div className="text-lg font-black text-[#20262e] mt-0.5">{allReminders.length}</div>
          </div>

          <div className="p-3 rounded-2xl bg-[#f7e7e1] border border-[#f0cac0] text-center">
            <div className="text-[11px] text-[#a82e2e] font-medium flex items-center justify-center gap-1">
              <AlertTriangle size={11} /> Overdue Alerts
            </div>
            <div className="text-lg font-black text-[#a82e2e] mt-0.5">{overdueCount}</div>
          </div>

          <div className="p-3 rounded-2xl bg-[#f4ecd9] border border-[#e5d2ac] text-center">
            <div className="text-[11px] text-[#855b14] font-medium flex items-center justify-center gap-1">
              <Clock size={11} /> Due Today
            </div>
            <div className="text-lg font-black text-[#855b14] mt-0.5">{todayCount}</div>
          </div>

          <div className="p-3 rounded-2xl bg-[#f1e8f8] border border-[#dec8f0] text-center">
            <div className="text-[11px] text-[#6b21a8] font-medium flex items-center justify-center gap-1">
              <Send size={11} /> HR Direct Notices
            </div>
            <div className="text-lg font-black text-[#6b21a8] mt-0.5">{hrNoticesCount}</div>
          </div>
        </div>
      </div>

      {/* 2. Filter & Search Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reminders, instructions, staff..."
            className="w-full pl-9 pr-4 py-2 rounded-xl glass-input text-xs text-white placeholder:text-slate-500"
          />
        </div>

        {/* Category Pills & Member Dropdown */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Tabs */}
          <div className="flex items-center bg-slate-950/70 border border-slate-800 rounded-xl p-0.5 text-xs">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                filterCategory === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterCategory('hr_reminder')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                filterCategory === 'hr_reminder' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-purple-300'
              }`}
            >
              🟣 HR Notices
            </button>
            <button
              onClick={() => setFilterCategory('task_alert')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                filterCategory === 'task_alert' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-rose-300'
              }`}
            >
              🔴 Tasks/Deadlines
            </button>
            <button
              onClick={() => setFilterCategory('meeting_alert')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                filterCategory === 'meeting_alert' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-sky-300'
              }`}
            >
              🔵 Meetings
            </button>
          </div>

          {/* Member Dropdown (HR/Admin can filter by anyone, regular staff sees self/all) */}
          {isAdmin && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[11px] text-slate-400 font-medium">Target:</span>
              <select
                value={filterMember}
                onChange={(e) => setFilterMember(e.target.value)}
                className="rounded-xl glass-input px-3 py-1.5 text-xs text-slate-200 bg-slate-900 border border-slate-800 cursor-pointer"
              >
                <option value="all">Everyone (6 Staff)</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.full_name || p.username}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 3. Dedicated Reminders Cards List (Matching Task Board Layout) */}
      {filteredReminders.length === 0 ? (
        <div className="text-center py-20 rounded-3xl glass-panel border border-slate-800 bg-slate-950/60 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-400 mx-auto flex items-center justify-center mb-3.5 border border-purple-500/20 shadow-inner">
            <CheckCircle2 size={28} />
          </div>
          <h4 className="text-base font-bold text-slate-100">
            All caught up! No active reminders or action alerts.
          </h4>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            {searchQuery
              ? `No notices match "${searchQuery}". Try clearing your search.`
              : 'There are no pending deadlines or notices dispatched to this view.'}
          </p>
          {isAdmin && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 transition-all inline-flex items-center gap-1.5"
            >
              <Plus size={14} /> Send a New Notice
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {filteredReminders.map((rem) => {
            const isTask = rem.isTaskAlert && rem.task;
            const isCompleted = isTask ? (rem.task.status === 'completed' || rem.task.status === 'done') : false;
            const isPendingApproval = isTask && (rem.task.status === 'review');

            const isOverdue = rem.countdown.status === 'overdue' || rem.countdown.status === 'yesterday';
            const isToday = rem.countdown.status === 'today';

            // Category & Priority Badge
            const categoryBadge = 
              rem.category === 'task_overdue' ? { label: '🔴 Overdue Notice', badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30' } :
              rem.category === 'task_deadline' ? { label: '⏰ Urgent Deadline', badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30' } :
              rem.category === 'meeting_alert' ? { label: '🔵 Meeting Alert', badge: 'bg-sky-500/15 text-sky-300 border-sky-500/30' } :
              { label: '🟣 Special Reminder', badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30' };

            // Due Date indicator style
            const dueBadge = 
              isOverdue ? 'text-rose-300 bg-rose-500/15 px-2.5 py-0.5 rounded-full border border-rose-500/30 font-bold' :
              isToday ? 'text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30 font-bold animate-pulse' :
              'text-slate-300 bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-700/70 font-medium';

            const targetProfiles = rem.userIds.map(id => getProfileForAssignee(id)).filter(Boolean);

            return (
              <div
                key={`dedicated-rem-${rem.id}`}
                onClick={() => setSelectedNoticeDetails(rem)}
                className={`group relative rounded-2xl p-4 sm:p-5 transition-all duration-200 border cursor-pointer ${
                  isCompleted
                    ? 'bg-slate-900/40 border-slate-800/60 opacity-70'
                    : isOverdue
                    ? 'bg-slate-900/90 border-rose-500/40 hover:border-rose-500/60 shadow-lg shadow-rose-950/20'
                    : isToday
                    ? 'bg-slate-900/90 border-amber-500/40 hover:border-amber-500/60 shadow-lg shadow-amber-950/20'
                    : 'bg-slate-900/80 hover:bg-slate-900 border-slate-800 hover:border-purple-500/40 shadow-lg shadow-black/20'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {/* 1. Left Checkbox / Status Toggle */}
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (isTask) {
                        try {
                          await toggleTaskStatus(rem.task.id);
                        } catch (err) {
                          alert('Error updating task: ' + err.message);
                        }
                      } else {
                        setSelectedNoticeDetails(rem);
                      }
                    }}
                    className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 border ${
                      isCompleted
                        ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 scale-105'
                        : isPendingApproval
                        ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-md shadow-amber-500/20 scale-105 opacity-80'
                        : 'bg-slate-950/60 border-slate-700 text-transparent hover:border-purple-500 hover:text-purple-400 hover:bg-purple-950/40'
                    }`}
                    title={isTask ? (isCompleted ? 'Mark task as incomplete' : 'Mark task as complete') : 'View notice details'}
                  >
                    <Check size={14} className="stroke-[3]" />
                  </button>

                  {/* 2. Content Body */}
                  <div className="flex-1 min-w-0">
                    {/* Header: Priority pill + Due Date info */}
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${categoryBadge.badge}`}>
                        {categoryBadge.label}
                      </span>

                      <span className={`text-[10px] flex items-center gap-1 ${dueBadge}`}>
                        <CalendarIcon size={11} />
                        <span>{rem.countdown.label ? `${rem.countdown.label} • ${formatDisplayDate(rem.date)}` : formatDisplayDate(rem.date)}</span>
                      </span>

                      {rem.timeStr && rem.timeStr !== 'All Day' && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock size={11} />
                          {rem.timeStr}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h4 className={`text-sm sm:text-base font-bold leading-snug transition-colors ${
                      isCompleted 
                        ? 'text-slate-400 line-through' 
                        : 'text-slate-100 group-hover:text-purple-200'
                    }`}>
                      {rem.title}
                    </h4>

                    {/* Subtitle / Note: Full description message */}
                    {rem.description && (
                      <p className="text-xs text-slate-300 mt-1.5 leading-relaxed whitespace-pre-wrap bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60 italic">
                        "{rem.description}"
                      </p>
                    )}

                    {/* Footer Metadata: Target Member + Sender info */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-2.5 border-t border-slate-800/70 text-xs">
                      {/* Target Member Avatar & Department */}
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 font-medium">Target:</span>
                        {rem.isAllTeam ? (
                          <span className="text-[11px] font-bold text-slate-200 bg-slate-800/90 px-2 py-0.5 rounded-lg border border-slate-700">
                            👥 Entire Team (Company-wide)
                          </span>
                        ) : targetProfiles.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {targetProfiles.map(p => (
                              <div key={p.id} className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-800/80 border border-slate-700/70">
                                <img
                                  src={p.avatar_url}
                                  alt={p.full_name}
                                  className="w-4 h-4 rounded-full object-cover ring-1 ring-slate-700"
                                />
                                <span className="text-[11px] font-bold text-slate-200">
                                  {p.full_name || p.username}
                                </span>
                                <span className={`text-[9px] px-1.5 py-0.2 rounded border font-medium ${getDepartmentBadge(p.department)}`}>
                                  {p.department}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">General Staff</span>
                        )}
                      </div>

                      {/* Right Action / Sender attribution */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 text-[11px] text-purple-300 font-semibold bg-purple-950/30 px-2.5 py-0.5 rounded-lg border border-purple-500/20">
                          <Send size={11} className="text-purple-400" />
                          <span>{rem.senderInfo}</span>
                        </div>

                        {isAdmin && !isTask && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNotice(rem);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                            title="Delete notice"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Full Notice / Reminder Details Modal */}
      {selectedNoticeDetails && (() => {
        const item = selectedNoticeDetails;
        const isTaskAlert = item.isTaskAlert || item.type === 'task_alert';
        const rawEvent = item.rawEvent || item.originalEvent;
        const targetUids = item.userIds || (rawEvent?.user_ids) || (rawEvent?.member_id ? [rawEvent.member_id] : []);
        const assignedProfiles = targetUids.map(id => getProfileForAssignee(id)).filter(Boolean);

        const countdown = item.countdown;
        const isOverdue = countdown?.status === 'overdue' || countdown?.status === 'yesterday';
        const isToday = countdown?.status === 'today';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-scale-up">
              
              {/* Header */}
              <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg border ${
                    isOverdue ? 'bg-rose-500/15 border-rose-500/30' :
                    isToday ? 'bg-amber-500/15 border-amber-500/30' :
                    'bg-purple-500/15 border-purple-500/30'
                  }`}>
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white leading-snug">{item.title}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] uppercase font-extrabold text-purple-300">
                        {item.category === 'task_overdue' ? 'Overdue Alert' :
                         item.category === 'task_deadline' ? 'Task Deadline' :
                         item.category === 'meeting_alert' ? 'Meeting Notice' :
                         'HR Direct Reminder'}
                      </span>
                      {countdown?.label && (
                        <span className={`text-[9px] px-2 py-0.2 rounded-full font-bold border ${
                          isOverdue ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                          isToday ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                          'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                        }`}>
                          {countdown.label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedNoticeDetails(null)}
                  className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Content */}
              <div className="p-5 space-y-3.5 text-xs">
                {/* Sender */}
                {item.senderInfo && (
                  <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                    <Send size={15} className="text-purple-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-slate-300 block text-[11px]">Notice Source:</span>
                      <span className="text-purple-300 text-xs font-semibold block truncate">
                        {item.senderInfo}
                      </span>
                    </div>
                  </div>
                )}

                {/* Timing */}
                <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <Clock size={15} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="font-bold text-slate-300 block text-[11px]">Date & Schedule:</span>
                    <span className="text-slate-200 mt-0.5 font-medium block">
                      {rawEvent ? formatEventDateRange(rawEvent) : formatDisplayDate(item.date)}
                    </span>
                  </div>
                </div>

                {/* Target Staff */}
                <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <Users size={15} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                  <div className="w-full">
                    <span className="font-bold text-slate-300 block text-[11px] mb-1">Target Staff:</span>
                    {assignedProfiles.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {assignedProfiles.map(p => (
                          <div key={p.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700/80">
                            <img 
                              src={p.avatar_url} 
                              alt={p.full_name} 
                              className="w-4 h-4 rounded-full object-cover" 
                            />
                            <span className="text-slate-200 text-[11px] font-bold">
                              {p.full_name || p.username}
                            </span>
                            <span className="text-[9px] text-slate-400">
                              ({p.department})
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-300 font-semibold mt-0.5 block">👥 Entire Team (Company-wide)</span>
                    )}
                  </div>
                </div>

                {/* Full Message */}
                {item.description && (
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                    <span className="font-bold text-slate-300 block mb-1 text-[11px]">Instructions / Message:</span>
                    <p className="text-slate-300 whitespace-pre-wrap leading-relaxed italic bg-slate-900/70 p-2.5 rounded-xl border border-slate-800/80">
                      "{item.description}"
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
                {isTaskAlert && item.task ? (
                  <button
                    onClick={async () => {
                      try {
                        await toggleTaskStatus(item.task.id);
                        setSelectedNoticeDetails(null);
                      } catch (err) {
                        alert('Error updating task: ' + err.message);
                      }
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 size={15} />
                    <span>Toggle Task Status</span>
                  </button>
                ) : rawEvent && isAdmin ? (
                  <>
                    <button
                      onClick={() => handleDeleteNotice(item)}
                      className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Trash2 size={14} /> Delete
                    </button>

                    <button
                      onClick={() => {
                        setSelectedNoticeDetails(null);
                        setEditingEvent(rawEvent);
                        setIsCreateModalOpen(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-purple-600/20"
                    >
                      <Edit3 size={14} /> Edit Notice
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setSelectedNoticeDetails(null)}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* CREATE / EDIT MODAL */}
      <CreateEventModal 
        isOpen={isCreateModalOpen} 
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingEvent(null);
        }}
        editingEvent={editingEvent}
        defaultDate={todayStr}
      />
    </div>
  );
}
