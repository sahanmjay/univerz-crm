import React, { useState, useMemo } from 'react';
import { useTasks } from '../context/TaskContext';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon, 
  Bell, 
  BellRing,
  AlertTriangle,
  Users, 
  Clock, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  XCircle, 
  X, 
  Info, 
  Filter, 
  Check, 
  Sparkles,
  MapPin,
  CalendarDays,
  ShieldCheck,
  UserCheck,
  UserX,
  Send,
  Tag,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import CreateEventModal from './CreateEventModal';
import AssignRosterModal from './AssignRosterModal';
import RemindersListView from './RemindersListView';
import { getDepartmentBadge } from '../lib/demoData';
import { 
  toDateStringOnly, 
  formatDisplayDate, 
  formatEventDateRange, 
  formatEventTime,
  getCountdownLabel 
} from '../lib/dateUtils';

export default function CalendarView() {
  const { 
    currentUser, 
    isAdmin, 
    calendarEvents, 
    tasks,
    leaves, 
    updateLeaveStatus, 
    deleteCalendarEvent,
    profiles,
    workRosters,
    toggleTaskStatus,
    setCurrentView 
  } = useTasks();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedDayForAdd, setSelectedDayForAdd] = useState(null);
  const [selectedDayForRoster, setSelectedDayForRoster] = useState(null);
  const [selectedItemDetails, setSelectedItemDetails] = useState(null);

  // Filters
  const [filterType, setFilterType] = useState('all'); // all, roster, leave, meeting, holiday, reminder
  const [filterMember, setFilterMember] = useState('all');

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getProfileForAssignee = (assigneeId) => {
    return profiles.find(p => p.id === assigneeId);
  };

  const today = new Date();
  const isCurrentMonth = today.getMonth() === currentMonth && today.getFullYear() === currentYear;
  const todayStr = toDateStringOnly(today);

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

  // Helper to fetch roster for a specific date cell
  const getRosterForDate = (day) => {
    const monthStr = String(currentMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const cellDateStr = `${currentYear}-${monthStr}-${dayStr}`;
    return workRosters.find(r => r.date === cellDateStr);
  };

  // UNIFIED REMINDERS & NOTIFICATIONS PIPELINE
  const allRemindersFeed = useMemo(() => {
    const list = [];
    const nowStr = todayStr;

    // 1. Calendar Reminders & Special Notices (from calendar_events)
    calendarEvents.forEach(evt => {
      if (evt.type === 'reminder' || evt.event_type === 'reminder') {
        const creatorProfile = profiles.find(p => p.id === evt.created_by);
        const isHRCreated = creatorProfile?.role === 'admin' || creatorProfile?.department === 'HR';
        const creatorLabel = isHRCreated 
          ? `Sent by HR (${creatorProfile.full_name || creatorProfile.username})` 
          : (creatorProfile?.full_name ? `Sent by ${creatorProfile.full_name}` : 'HR Notice');

        const targetDate = toDateStringOnly(evt.start_date || evt.date);
        const countdown = getCountdownLabel(targetDate, nowStr);

        list.push({
          id: `reminder-${evt.id}`,
          rawId: evt.id,
          isTaskAlert: false,
          category: 'hr_reminder', // hr_reminder, task_overdue, task_deadline, meeting_alert
          icon: '🟣',
          badgeColor: 'purple',
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
        if (countdown.diffDays >= 0 && countdown.diffDays <= 5) {
          const creatorProfile = profiles.find(p => p.id === evt.created_by);
          list.push({
            id: `meeting-alert-${evt.id}`,
            rawId: evt.id,
            isTaskAlert: false,
            category: 'meeting_alert',
            icon: '⏰',
            badgeColor: 'sky',
            type: 'meeting',
            title: `Meeting: ${evt.title}`,
            description: evt.description || 'Scheduled team sync meeting',
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
        if (t.status !== 'completed' && t.due_date) {
          const dueDateStr = toDateStringOnly(t.due_date);
          const countdown = getCountdownLabel(dueDateStr, nowStr);
          const assignee = profiles.find(p => p.id === t.assignee_id);
          const creator = profiles.find(p => p.id === t.created_by);
          const isOverdue = countdown.diffDays < 0;
          const isApproaching = countdown.diffDays >= 0 && countdown.diffDays <= 4;

          if (isOverdue || isApproaching) {
            list.push({
              id: `task-alert-${t.id}`,
              rawId: t.id,
              isTaskAlert: true,
              category: isOverdue ? 'task_overdue' : 'task_deadline',
              icon: isOverdue ? '⚠️' : '⏰',
              badgeColor: isOverdue ? 'rose' : 'amber',
              type: 'task_alert',
              title: isOverdue ? `Overdue Notice: ${t.title}` : `Urgent Deadline: ${t.title}`,
              description: t.description || `Task priority: ${t.priority.toUpperCase()}. Please complete and submit for approval.`,
              date: dueDateStr,
              endDate: null,
              timeStr: 'Due Date',
              senderInfo: creator ? `Assigned by ${creator.full_name || creator.username}` : 'Automated Task Alert',
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

  // Filtered Reminders List (Personalized for Logged-In Member or Explicit Filter)
  const filteredReminders = useMemo(() => {
    return allRemindersFeed
      .filter(item => {
        // If explicitly filtered by member dropdown
        if (filterMember !== 'all') {
          return item.isAllTeam || (item.userIds && item.userIds.includes(filterMember));
        }
        // If logged-in as regular staff member (non-admin), prioritize items targeting their profile
        if (!isAdmin && currentUser?.id) {
          return item.isAllTeam || (item.userIds && item.userIds.includes(currentUser.id));
        }
        // If Admin and "Everyone" selected, show all team-wide notices
        return true;
      })
      .sort((a, b) => {
        // Priority 1: Overdue items first (most urgent)
        if (a.countdown.diffDays < 0 && b.countdown.diffDays >= 0) return -1;
        if (b.countdown.diffDays < 0 && a.countdown.diffDays >= 0) return 1;
        // Priority 2: Due Today
        if (a.countdown.diffDays === 0 && b.countdown.diffDays > 0) return -1;
        if (b.countdown.diffDays === 0 && a.countdown.diffDays > 0) return 1;
        // Priority 3: Chronological by date
        return a.date.localeCompare(b.date);
      });
  }, [allRemindersFeed, filterMember, isAdmin, currentUser]);

  // Helper to check if an event falls on a specific date (supports multi-day without timezone drift)
  const getEventsForDate = (day) => {
    const monthStr = String(currentMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const cellDateStr = `${currentYear}-${monthStr}-${dayStr}`;

    // If 'reminder' filter is selected, also inject task alerts falling on this date
    if (filterType === 'reminder') {
      const matchingReminders = filteredReminders.filter(r => r.date === cellDateStr);
      return matchingReminders.map(r => ({
        id: r.id,
        title: r.title,
        type: 'reminder',
        category: r.category,
        icon: r.icon,
        start_date: r.date,
        end_date: r.endDate,
        all_day: true,
        user_ids: r.userIds,
        description: r.description,
        senderInfo: r.senderInfo,
        countdown: r.countdown,
        isTaskAlert: r.isTaskAlert,
        task: r.task,
        rawEvent: r.originalEvent
      }));
    }

    return calendarEvents.filter(event => {
      // Pending leaves visibility: only HR/Admin or the applicant sees pending leaves
      if (event.type === 'leave' && event.status !== 'approved') {
        const uids = event.user_ids || (event.member_id ? [event.member_id] : []);
        const isApplicant = uids.includes(currentUser?.id) || event.created_by === currentUser?.id;
        if (!isAdmin && !isApplicant) return false;
      }

      // Filter by Type
      if (filterType !== 'all' && event.type !== filterType) {
        return false;
      }

      // Filter by Member
      if (filterMember !== 'all') {
        const uids = event.user_ids || (event.member_id ? [event.member_id] : []);
        const matchesMember = uids.includes(filterMember) || event.member_id === filterMember || event.is_all_team || uids.length === 0;
        if (!matchesMember) {
          return false;
        }
      }

      const sDateStr = toDateStringOnly(event.start_date || event.date);
      const eDateStr = event.end_date ? toDateStringOnly(event.end_date) : null;

      if (!sDateStr) return false;

      if (eDateStr) {
        return cellDateStr >= sDateStr && cellDateStr <= eDateStr;
      } else {
        return cellDateStr === sDateStr;
      }
    });
  };

  // Today's On-Duty Workers computation
  const todayRoster = useMemo(() => {
    return workRosters.find(r => r.date === todayStr);
  }, [workRosters, todayStr]);

  const todayOnDutyMembers = useMemo(() => {
    if (todayRoster && Array.isArray(todayRoster.assigned_member_ids) && todayRoster.assigned_member_ids.length > 0) {
      return profiles.filter(p => todayRoster.assigned_member_ids.includes(p.id));
    }
    return [];
  }, [todayRoster, profiles]);

  const todayOffDutyMembers = useMemo(() => {
    if (todayRoster && Array.isArray(todayRoster.assigned_member_ids) && todayRoster.assigned_member_ids.length > 0) {
      return profiles.filter(p => !todayRoster.assigned_member_ids.includes(p.id));
    }
    return [];
  }, [todayRoster, profiles]);

  // Pending leaves for HR/Admin approval
  const pendingLeaves = useMemo(() => {
    return calendarEvents.filter(e => e.type === 'leave' && e.status === 'pending');
  }, [calendarEvents]);

  const handleOpenAddModal = (day = null) => {
    setEditingEvent(null);
    if (day) {
      const monthStr = String(currentMonth + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      setSelectedDayForAdd(`${currentYear}-${monthStr}-${dayStr}`);
    } else {
      setSelectedDayForAdd(toDateStringOnly(new Date()));
    }
    setIsEventModalOpen(true);
  };

  const handleOpenRosterModal = (day = null) => {
    if (day) {
      const monthStr = String(currentMonth + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      setSelectedDayForRoster(`${currentYear}-${monthStr}-${dayStr}`);
    } else {
      setSelectedDayForRoster(toDateStringOnly(new Date()));
    }
    setIsRosterModalOpen(true);
  };

  const handleOpenEditModal = (event) => {
    setSelectedItemDetails(null);
    setEditingEvent(event);
    setIsEventModalOpen(true);
  };

  const handleDeleteEvent = async (event) => {
    if (window.confirm(`Are you sure you want to delete "${event.title}"?`)) {
      try {
        await deleteCalendarEvent(event.id);
        setSelectedItemDetails(null);
      } catch (err) {
        alert("Failed to delete event: " + err.message);
      }
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 animate-fade-in">
      
      {/* LEFT COLUMN: Calendar & Controls */}
      <div className="flex-1 space-y-4">
        {/* Calendar Header Card */}
        <div className="rounded-3xl glass-panel p-5 sm:p-6 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400 flex-shrink-0 shadow-inner">
              <CalendarIcon size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Team Calendar & Reminders</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Live Notifications
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Personalized reminders, duty rosters, task deadlines, and company syncs.
              </p>
            </div>
          </div>

          {/* Actions & Month Navigation */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
            {/* Today Jump */}
            <button
              onClick={goToToday}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold border border-slate-800 transition-colors"
            >
              Today
            </button>

            {/* Month Navigation */}
            <div className="flex items-center bg-slate-900/90 rounded-xl border border-slate-800 p-1">
              <button 
                onClick={prevMonth} 
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                title="Previous Month"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="w-32 text-center text-xs font-bold text-slate-200">
                {monthNames[currentMonth]} {currentYear}
              </span>
              <button 
                onClick={nextMonth} 
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                title="Next Month"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* 🗓️ Set Duty Roster Button */}
            {isAdmin && (
              <button
                onClick={() => handleOpenRosterModal()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white font-bold text-xs shadow-lg transition-all hover:scale-105 active:scale-95 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-emerald-500/20"
                title="Assign daily duty schedule"
              >
                <ShieldCheck size={16} />
                <span>Set Duty Roster</span>
              </button>
            )}

            {/* + Add Event / Leave Button */}
            <button
              onClick={() => handleOpenAddModal()}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white font-bold text-xs shadow-lg transition-all hover:scale-105 active:scale-95 ${
                isAdmin 
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 shadow-indigo-500/20' 
                  : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 shadow-indigo-500/20'
              }`}
            >
              <Plus size={16} className="stroke-[3]" />
              <span>{isAdmin ? '+ Add Event / Leave' : '+ Request Leave'}</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="rounded-2xl glass-panel p-3 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-950/40">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Filter size={12} /> Filter:
            </span>
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                filterType === 'all' 
                  ? 'bg-slate-800 text-white border border-slate-700' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              All Events
            </button>
            <button
              onClick={() => setFilterType('roster')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1.5 ${
                filterType === 'roster' 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                  : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Daily Roster
            </button>
            <button
              onClick={() => setFilterType('meeting')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1.5 ${
                filterType === 'meeting' 
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' 
                  : 'text-slate-400 hover:text-sky-300 hover:bg-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              Meetings
            </button>
            <button
              onClick={() => setFilterType('leave')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1.5 ${
                filterType === 'leave' 
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                  : 'text-slate-400 hover:text-rose-300 hover:bg-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Leaves
            </button>
            <button
              onClick={() => setFilterType('holiday')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1.5 ${
                filterType === 'holiday' 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                  : 'text-slate-400 hover:text-amber-300 hover:bg-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Holidays
            </button>
          </div>

          {/* Member Filter Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-medium">Member:</span>
            <select
              value={filterMember}
              onChange={(e) => setFilterMember(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:border-indigo-500 focus:ring-0 cursor-pointer"
            >
              <option value="all">Everyone</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.full_name || p.username}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Calendar Grid Card */}
        <div className="rounded-3xl glass-panel p-4 sm:p-6 border border-slate-800 bg-slate-950/60 shadow-2xl">
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5 mb-2.5">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                <div 
                  key={day} 
                  className={`text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider py-1.5 ${
                    idx === 0 || idx === 6 ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Month Cells */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
              {/* Empty slots for days before 1st of month */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div 
                  key={`empty-${i}`} 
                  className="min-h-[105px] sm:min-h-[125px] p-2 rounded-2xl bg-slate-950/20 border border-slate-900/40 opacity-30" 
                />
              ))}

              {/* Days of current month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isToday = isCurrentMonth && day === today.getDate();
                const events = getEventsForDate(day);
                const dayRoster = getRosterForDate(day);
                
                const dayOfWeek = new Date(currentYear, currentMonth, day).getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const isHoliday = events.some(e => e.type === 'holiday');

                // Roster data calculations - ONLY for dates with explicit roster entries in Supabase
                const hasCustomRoster = dayRoster && Array.isArray(dayRoster.assigned_member_ids) && dayRoster.assigned_member_ids.length > 0;
                const assignedIds = hasCustomRoster ? dayRoster.assigned_member_ids : [];
                const assignedMembers = profiles.filter(p => assignedIds.includes(p.id));
                const offMembers = profiles.filter(p => !assignedIds.includes(p.id));
                const isFullTeamOnDuty = profiles.length > 0 && assignedIds.length === profiles.length;

                const monthStr = String(currentMonth + 1).padStart(2, '0');
                const dayStr = String(day).padStart(2, '0');
                const cellDateFormatted = formatDisplayDate(`${currentYear}-${monthStr}-${dayStr}`);

                const rosterTooltipText = hasCustomRoster 
                  ? `Duty Schedule (${cellDateFormatted}):\n🟢 On Duty (${assignedMembers.length}): ${assignedMembers.map(p => p.full_name || p.username).join(', ')}${offMembers.length > 0 ? `\n⚪ Off Duty (${offMembers.length}): ${offMembers.map(p => p.full_name || p.username).join(', ')}` : ''}${dayRoster?.notes ? `\nNotes: ${dayRoster.notes}` : ''}`
                  : '';

                return (
                  <div 
                    key={`day-${day}`} 
                    onClick={() => handleOpenAddModal(day)}
                    className={`group relative min-h-[105px] sm:min-h-[125px] p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isToday 
                        ? 'bg-indigo-950/40 border-indigo-500/60 ring-1 ring-indigo-500/40 shadow-lg shadow-indigo-950/50' 
                        : isHoliday
                        ? 'bg-amber-950/20 border-amber-500/30'
                        : isWeekend
                        ? 'bg-slate-950/40 border-slate-900/80 hover:border-slate-700/80'
                        : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900/90 hover:border-slate-700 shadow-sm'
                    }`}
                  >
                    {/* Day Header */}
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-xs font-black rounded-lg px-1.5 py-0.5 transition-colors ${
                        isToday 
                          ? 'bg-indigo-600 text-white' 
                          : isHoliday
                          ? 'text-amber-400 font-extrabold'
                          : isWeekend 
                          ? 'text-slate-500' 
                          : 'text-slate-300 group-hover:text-white'
                      }`}>
                        {day}
                      </span>

                      <div className="flex items-center gap-1">
                        {isAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenRosterModal(day);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-emerald-950 text-emerald-400 hover:text-emerald-300 transition-opacity"
                            title="Configure duty roster for this date"
                          >
                            <ShieldCheck size={12} />
                          </button>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenAddModal(day);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-opacity"
                          title="Add event on this date"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>

                    {/* 🟢 WORK ROSTER BADGE (Only renders when explicitly added) */}
                    {hasCustomRoster && (filterType === 'all' || filterType === 'roster') && (filterMember === 'all' || assignedIds.includes(filterMember)) && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenRosterModal(day);
                        }}
                        className={`group/roster flex items-center justify-between gap-1 px-1.5 py-0.5 rounded-lg border text-[9px] font-bold transition-all truncate cursor-pointer select-none mb-1.5 ${
                          isFullTeamOnDuty
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                            : 'bg-emerald-600/20 border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/30'
                        }`}
                        title={rosterTooltipText}
                      >
                        <div className="flex items-center gap-1 min-w-0 flex-1 truncate">
                          <span className="flex-shrink-0 text-[8px]">🟢</span>
                          <span className="truncate text-emerald-200 group-hover/roster:text-white font-extrabold">
                            {isFullTeamOnDuty 
                              ? `Full Team (${profiles.length})` 
                              : `${assignedIds.length} On Duty: ${assignedMembers.map(p => p.full_name?.split(' ')[0] || p.username).join(', ')}`}
                          </span>
                        </div>

                        {/* Mini Avatar Stack */}
                        <div className="flex -space-x-1 overflow-hidden flex-shrink-0">
                          {assignedMembers.slice(0, 3).map(p => (
                            <img
                              key={p.id}
                              src={p.avatar_url}
                              alt={p.full_name}
                              className="inline-block h-3.5 w-3.5 rounded-full ring-1 ring-slate-900 object-cover"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Event Badges on the Day */}
                    <div className="space-y-1 flex-1 flex flex-col justify-start overflow-hidden">
                      {events.slice(0, 2).map(evt => {
                        const memberInfo = getEventMemberDisplay(evt);
                        const timeStr = formatEventTime(evt);
                        const isPending = evt.type === 'leave' && evt.status === 'pending';
                        
                        const icon = evt.icon || (
                          evt.type === 'leave' ? (isPending ? '⏳' : '🔴') :
                          evt.type === 'meeting' ? '🔵' :
                          evt.type === 'holiday' ? '🟡' : '🟣'
                        );

                        const typeLabel = 
                          evt.category === 'task_overdue' ? '⚠️ Overdue Task Alert' :
                          evt.category === 'task_deadline' ? '⏰ Approaching Task Deadline' :
                          evt.type === 'leave' ? 'Approved Leaves' :
                          evt.type === 'meeting' ? 'Scheduled Meetings' :
                          evt.type === 'holiday' ? 'Company Holidays' : '🟣 Special Reminder';

                        const assignedLabel = 
                          memberInfo.type === 'all' 
                            ? 'Entire Team (All Members)' 
                            : memberInfo.profilesList.length > 0 
                            ? memberInfo.profilesList.map(p => p.full_name || p.username).join(', ') 
                            : (memberInfo.label || 'None');

                        const tooltipText = `${evt.title}${!evt.all_day && timeStr ? ` (${timeStr})` : ''}\nType: ${typeLabel}\nAssigned: ${assignedLabel}${evt.description ? `\nNotes: ${evt.description}` : ''}`;

                        const badgeStyle = 
                          evt.category === 'task_overdue' ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 hover:bg-rose-500/30' :
                          evt.category === 'task_deadline' ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30' :
                          evt.type === 'leave'
                            ? isPending
                              ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25'
                              : 'bg-rose-500/15 border-rose-500/30 text-rose-300 hover:bg-rose-500/25 shadow-sm shadow-rose-950/30'
                            : evt.type === 'meeting'
                            ? 'bg-sky-500/15 border-sky-500/30 text-sky-300 hover:bg-sky-500/25 shadow-sm shadow-sky-950/30'
                            : evt.type === 'holiday'
                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25 shadow-sm shadow-amber-950/30'
                            : 'bg-purple-500/15 border-purple-500/30 text-purple-300 hover:bg-purple-500/25 shadow-sm shadow-purple-950/30';

                        return (
                          <div
                            key={evt.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItemDetails(evt);
                            }}
                            className={`group/badge flex flex-col justify-center px-1.5 py-1 rounded-lg border text-[10px] transition-all cursor-pointer select-none w-full overflow-hidden ${badgeStyle}`}
                            title={tooltipText}
                          >
                            {/* 1. Primary Line: Icon + Actual Event Title */}
                            <div className="flex items-center gap-1 w-full min-w-0">
                              <span className="flex-shrink-0 text-[10px]">
                                {icon}
                              </span>
                              <span className="font-bold truncate flex-1 min-w-0 text-slate-100 group-hover/badge:text-white">
                                {evt.title}
                              </span>
                            </div>

                            {/* 2. Sub-info: Assigned Member(s) / Time info */}
                            {(memberInfo.type !== 'all' || (!evt.all_day && timeStr)) && (
                              <div className="flex items-center justify-between gap-1 text-[9px] opacity-75 pl-3.5 -mt-0.5 w-full min-w-0">
                                {memberInfo.type !== 'all' && (
                                  <span className="truncate flex-1 min-w-0 text-slate-300">
                                    {memberInfo.shortNames}
                                  </span>
                                )}
                                {!evt.all_day && timeStr && (
                                  <span className="flex-shrink-0 font-medium text-slate-300">
                                    {timeStr}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {events.length > 2 && (
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItemDetails(events[0]);
                          }}
                          className="text-[9px] text-slate-400 hover:text-white font-bold text-center py-0.5 rounded bg-slate-800/60 transition-colors cursor-pointer"
                        >
                          +{events.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
      </div>

      {/* RIGHT COLUMN: Today's On Duty + Unified Reminders & Action Alerts + Pending Leaves + Legend */}
      <div className="w-full xl:w-80 flex-shrink-0 space-y-4">
        
        {/* 1. 🟢 TODAY'S DUTY ROSTER WIDGET */}
        <div className="rounded-3xl glass-panel p-5 border border-emerald-500/30 bg-slate-900/90 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3.5 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                <ShieldCheck size={16} />
              </div>
              <div>
                <h2 className="text-xs font-black text-white uppercase tracking-wider">Today's Duty Roster</h2>
                <span className="text-[10px] text-slate-400 font-medium">{formatDisplayDate(todayStr)}</span>
              </div>
            </div>

            {isAdmin && (
              <button
                onClick={() => handleOpenRosterModal()}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 transition-colors flex items-center gap-1"
              >
                <Edit3 size={11} /> Edit
              </button>
            )}
          </div>

          {/* Status Header Pill */}
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800/90 mb-3 text-xs">
            <span className="text-emerald-300 font-bold flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${todayOnDutyMembers.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
              {todayOnDutyMembers.length > 0 ? `${todayOnDutyMembers.length} Working Today` : 'No Roster Set for Today'}
            </span>
            <span className="text-slate-400 text-[11px] font-medium">
              {todayOffDutyMembers.length > 0 ? `${todayOffDutyMembers.length} Off Duty` : todayOnDutyMembers.length > 0 ? 'Full Team Active' : 'Unassigned'}
            </span>
          </div>

          {/* Scheduled Workers List */}
          <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
            {todayOnDutyMembers.length === 0 ? (
              <div className="text-center py-5 text-slate-500 text-xs flex flex-col items-center gap-2">
                <ShieldCheck size={22} className="opacity-30 text-emerald-400" />
                <span>No duty schedule assigned for today.</span>
                {isAdmin && (
                  <button
                    onClick={() => handleOpenRosterModal()}
                    className="mt-1 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition-all flex items-center gap-1.5"
                  >
                    <Plus size={13} /> Set Today's Roster
                  </button>
                )}
              </div>
            ) : (
              todayOnDutyMembers.map(member => (
                <div 
                  key={`duty-${member.id}`}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-950/50 border border-slate-800/80 hover:border-emerald-500/30 transition-all group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative flex-shrink-0">
                      <img
                        src={member.avatar_url}
                        alt={member.full_name}
                        className="w-7 h-7 rounded-full object-cover ring-1 ring-emerald-500/50"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-slate-900" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-200 group-hover:text-white truncate block">
                        {member.full_name || member.username}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate block">
                        {member.department}
                      </span>
                    </div>
                  </div>

                  <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex-shrink-0">
                    On Duty
                  </span>
                </div>
              ))
            )}

            {/* Off Duty Team Section */}
            {todayOffDutyMembers.length > 0 && (
              <div className="pt-2.5 border-t border-slate-800/70 mt-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Off Duty Today ({todayOffDutyMembers.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {todayOffDutyMembers.map(off => (
                    <div key={`off-${off.id}`} className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-950/40 border border-slate-800 text-[10px] text-slate-400">
                      <img src={off.avatar_url} alt={off.full_name} className="w-3.5 h-3.5 rounded-full grayscale opacity-60" />
                      <span className="truncate font-medium">{off.full_name?.split(' ')[0] || off.username}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* 2. 🟣 PERSONALIZED REMINDERS & ACTION ALERTS WIDGET */}
        <div className="rounded-3xl glass-panel p-5 border border-purple-500/30 bg-slate-900/90 shadow-xl relative overflow-hidden">
          {/* Subtle purple background glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between mb-3.5 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-inner">
                <BellRing size={16} />
              </div>
              <div>
                <h2 className="text-xs font-black text-white uppercase tracking-wider">
                  Reminders & Alerts
                </h2>
                <span className="text-[10px] text-purple-300/80 font-medium">
                  {filterMember === 'all' ? 'Team-wide feed' : `Filtered for ${profiles.find(p => p.id === filterMember)?.full_name?.split(' ')[0] || 'Member'}`}
                </span>
              </div>
            </div>

            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
              {filteredReminders.length} Active
            </span>
          </div>

          {/* Reminders Feed */}
          <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
            {filteredReminders.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                <CalendarDays size={28} className="mx-auto mb-2 opacity-40 text-purple-400" />
                No active reminders or alerts for the selected filter.
              </div>
            ) : (
              filteredReminders.map(rem => {
                const isOverdue = rem.countdown.status === 'overdue' || rem.countdown.status === 'yesterday';
                const isToday = rem.countdown.status === 'today';

                const countdownBadgeStyle = 
                  isOverdue ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                  isToday ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse' :
                  'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';

                return (
                  <div 
                    key={`rem-feed-${rem.id}`} 
                    onClick={() => setSelectedItemDetails(rem)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer group shadow-sm hover:shadow-md ${
                      isOverdue 
                        ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-500/60' 
                        : isToday 
                        ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-500/60' 
                        : 'bg-slate-950/70 border-slate-800/90 hover:border-purple-500/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <span className="text-sm mt-0.5 flex-shrink-0">
                          {rem.icon}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs font-bold text-slate-100 group-hover:text-white truncate">
                              {rem.title}
                            </h4>
                          </div>

                          {/* Sender Info */}
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                            <Send size={10} className="text-purple-400 flex-shrink-0" />
                            <span className="truncate">{rem.senderInfo}</span>
                          </span>

                          {/* Message snippet if available */}
                          {rem.description && (
                            <p className="text-[10px] text-slate-400 line-clamp-1 italic mt-1 bg-slate-900/60 px-2 py-0.5 rounded-md">
                              "{rem.description}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Countdown badge */}
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase border flex-shrink-0 ${countdownBadgeStyle}`}>
                        {rem.countdown.label || 'Notice'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-medium text-slate-400 mt-2.5 pt-2 border-t border-slate-900/80">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Clock size={11} className="text-purple-400 flex-shrink-0" />
                        <span>{formatDisplayDate(rem.date)}</span>
                        {rem.timeStr && rem.timeStr !== 'All Day' && (
                          <span className="text-slate-400">({rem.timeStr})</span>
                        )}
                      </div>

                      {/* Targeted Members */}
                      <div className="flex items-center gap-1">
                        {rem.isAllTeam ? (
                          <span className="text-[9px] font-bold text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded">
                            👥 All Team
                          </span>
                        ) : (
                          <div className="flex -space-x-1 overflow-hidden">
                            {rem.userIds.slice(0, 3).map(uid => {
                              const p = getProfileForAssignee(uid);
                              if (!p) return null;
                              return (
                                <img
                                  key={p.id}
                                  src={p.avatar_url}
                                  alt={p.full_name}
                                  title={p.full_name}
                                  className="inline-block h-3.5 w-3.5 rounded-full ring-1 ring-slate-900 object-cover"
                                />
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 3. PENDING LEAVES APPROVAL (HR / Admins Ashan & Widura) */}
        {isAdmin && pendingLeaves.length > 0 && (
          <div className="rounded-3xl glass-panel p-5 border border-amber-800/40 bg-amber-950/20 shadow-xl animate-fade-in">
            <div className="flex items-center justify-between mb-3 border-b border-amber-800/40 pb-2.5">
              <div className="flex items-center gap-2">
                <Users size={15} className="text-amber-400" />
                <h2 className="text-xs font-black text-amber-300 uppercase tracking-wider">Pending Leave Requests</h2>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                {pendingLeaves.length} Action Needed
              </span>
            </div>

            <div className="space-y-3">
              {pendingLeaves.map(leave => {
                const memberInfo = getEventMemberDisplay(leave);

                return (
                  <div key={leave.id} className="p-3 rounded-2xl bg-slate-900/90 border border-amber-700/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        {memberInfo.profilesList.length > 0 ? (
                          <div className="flex -space-x-1 overflow-hidden">
                            {memberInfo.profilesList.map(p => (
                              <img key={p.id} src={p.avatar_url} alt="avatar" className="w-5 h-5 rounded-full object-cover ring-1 ring-slate-900" />
                            ))}
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold flex items-center justify-center">L</div>
                        )}
                        <span className="text-xs font-bold text-slate-100 truncate">
                          {memberInfo.shortNames || 'Team Member'}
                        </span>
                      </div>
                      <span className="text-[10px] text-amber-400 font-bold">
                        Pending
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-300">
                      <strong>{leave.title}</strong>
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        🗓️ {formatEventDateRange(leave)}
                      </span>
                      {leave.description && (
                        <p className="text-[10px] text-slate-400 italic mt-1 bg-slate-950/60 p-1.5 rounded-lg">
                          "{leave.description}"
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => updateLeaveStatus(leave.id, 'approved')}
                        className="flex-1 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold transition-all flex items-center justify-center gap-1"
                      >
                        <CheckCircle2 size={12} /> Approve
                      </button>
                      <button
                        onClick={() => updateLeaveStatus(leave.id, 'rejected')}
                        className="flex-1 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-[11px] font-bold transition-all flex items-center justify-center gap-1"
                      >
                        <XCircle size={12} /> Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. CALENDAR GUIDE & LEGEND COLORS */}
        <div className="rounded-3xl glass-panel p-5 border border-slate-800 bg-slate-900/80 shadow-xl">
          <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Info size={14} className="text-indigo-400" />
            Calendar Guide & Legend
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-200">
              <span className="text-sm">🟣</span>
              <div className="min-w-0">
                <strong className="block text-xs font-bold text-purple-300">Special Reminders & Alerts</strong>
                <span className="text-[10px] text-purple-400/80">Direct HR notices, deadlines, task alerts</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200">
              <span className="text-sm">🟢</span>
              <div className="min-w-0">
                <strong className="block text-xs font-bold text-emerald-300">Daily Duty Roster</strong>
                <span className="text-[10px] text-emerald-400/80">Scheduled on-duty staff for the shift</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-200">
              <span className="text-sm">🔴</span>
              <div className="min-w-0">
                <strong className="block text-xs font-bold text-rose-300">Approved Leaves</strong>
                <span className="text-[10px] text-rose-400/80">Staff days off, sick leave, vacations</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-200">
              <span className="text-sm">🔵</span>
              <div className="min-w-0">
                <strong className="block text-xs font-bold text-sky-300">Scheduled Meetings</strong>
                <span className="text-[10px] text-sky-400/80">Client calls, sync meetings, scrums</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200">
              <span className="text-sm">🟡</span>
              <div className="min-w-0">
                <strong className="block text-xs font-bold text-amber-300">Company Holidays</strong>
                <span className="text-[10px] text-amber-400/80">Poya days, public & mercantile holidays</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* EVENT & REMINDER DETAILS MODAL */}
      {selectedItemDetails && (() => {
        const item = selectedItemDetails;
        const isTaskAlert = item.isTaskAlert || item.type === 'task_alert';
        const rawEvent = item.rawEvent || (item.originalEvent ? item.originalEvent : (item.type !== 'task_alert' ? item : null));
        const modalMemberInfo = rawEvent ? getEventMemberDisplay(rawEvent) : null;
        const targetUids = item.userIds || (rawEvent?.user_ids) || (rawEvent?.member_id ? [rawEvent.member_id] : []);
        const assignedProfiles = targetUids.map(id => getProfileForAssignee(id)).filter(Boolean);

        const countdown = item.countdown || (item.start_date ? getCountdownLabel(item.start_date, todayStr) : null);
        const isOverdue = countdown?.status === 'overdue' || countdown?.status === 'yesterday';
        const isToday = countdown?.status === 'today';

        const modalIcon = item.icon || (
          item.type === 'leave' ? '🔴' :
          item.type === 'meeting' ? '🔵' :
          item.type === 'holiday' ? '🟡' : '🟣'
        );

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-scale-up">
              
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg border ${
                    isOverdue ? 'bg-rose-500/15 border-rose-500/30' :
                    isToday ? 'bg-amber-500/15 border-amber-500/30' :
                    'bg-purple-500/15 border-purple-500/30'
                  }`}>
                    {modalIcon}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white leading-snug">{item.title}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] uppercase font-extrabold text-purple-300">
                        {item.category === 'task_overdue' ? 'Overdue Alert' :
                         item.category === 'task_deadline' ? 'Task Deadline' :
                         item.category === 'meeting_alert' ? 'Meeting Notice' :
                         (item.type || 'Reminder')}
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
                  onClick={() => setSelectedItemDetails(null)}
                  className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-5 space-y-3.5 text-xs">
                
                {/* 1. Sender Info Card */}
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

                {/* 2. Timing & Countdown */}
                <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <Clock size={15} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="font-bold text-slate-300 block text-[11px]">Date & Schedule:</span>
                    <span className="text-slate-200 mt-0.5 font-medium block">
                      {rawEvent ? formatEventDateRange(rawEvent) : formatDisplayDate(item.date || item.start_date)}
                    </span>
                  </div>
                </div>

                {/* 3. Assigned Member(s) / Team */}
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

                {/* 4. Full Message / Description */}
                {item.description && (
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                    <span className="font-bold text-slate-300 block mb-1 text-[11px]">Message / Description:</span>
                    <p className="text-slate-300 whitespace-pre-wrap leading-relaxed italic bg-slate-900/70 p-2.5 rounded-xl border border-slate-800/80">
                      "{item.description}"
                    </p>
                  </div>
                )}

                {/* Status indicator */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <span className="font-bold text-slate-300">Notice Status:</span>
                  <span className={`px-2.5 py-0.5 rounded-full font-extrabold uppercase text-[10px] ${
                    isOverdue ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                    isToday ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                    'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {isOverdue ? 'Action Required' : isToday ? 'Due Today' : 'Active'}
                  </span>
                </div>
              </div>

              {/* Actions for Details Modal */}
              <div className="p-5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
                {isTaskAlert && item.task ? (
                  <button
                    onClick={async () => {
                      try {
                        await toggleTaskStatus(item.task.id);
                        setSelectedItemDetails(null);
                      } catch (err) {
                        alert('Error updating task: ' + err.message);
                      }
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 size={15} />
                    <span>Mark Task Completed</span>
                  </button>
                ) : rawEvent && isAdmin ? (
                  <>
                    <button
                      onClick={() => handleDeleteEvent(rawEvent)}
                      className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Trash2 size={14} /> Delete
                    </button>

                    <div className="flex items-center gap-2">
                      {rawEvent.type === 'leave' && rawEvent.status === 'pending' && (
                        <button
                          onClick={() => {
                            updateLeaveStatus(rawEvent.id, 'approved');
                            setSelectedItemDetails(null);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                        >
                          <Check size={14} /> Approve Leave
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenEditModal(rawEvent)}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                      >
                        <Edit3 size={14} /> Edit
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => setSelectedItemDetails(null)}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all"
                  >
                    Close Notice
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* CREATE / EDIT EVENT MODAL */}
      <CreateEventModal 
        isOpen={isEventModalOpen} 
        onClose={() => {
          setIsEventModalOpen(false);
          setEditingEvent(null);
          setSelectedDayForAdd(null);
        }}
        editingEvent={editingEvent}
        defaultDate={selectedDayForAdd}
      />

      {/* 🗓️ ASSIGN DAILY ROSTER MODAL */}
      <AssignRosterModal
        isOpen={isRosterModalOpen}
        onClose={() => {
          setIsRosterModalOpen(false);
          setSelectedDayForRoster(null);
        }}
        selectedDate={selectedDayForRoster}
      />
    </div>
  );
}
