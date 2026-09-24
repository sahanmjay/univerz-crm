import React, { useState, useMemo } from 'react';
import { useTasks } from '../context/TaskContext';
import { 
  BellRing, 
  AlertTriangle, 
  Clock, 
  Calendar as CalendarIcon, 
  Check, 
  CheckCircle2, 
  Plus, 
  Send, 
  Search, 
  Trash2, 
  Edit3, 
  X, 
  Users, 
  Sparkles, 
  Inbox,
  Star,
  Archive,
  ArchiveRestore,
  Mail,
  MailOpen,
  CheckSquare,
  Square,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  RefreshCw,
  Eye,
  Info
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
    deleteCalendarEvent,
    setCurrentView,
    // Mailbox state & actions
    readNoticeIds = [],
    starredNoticeIds = [],
    archivedNoticeIds = [],
    unreadRemindersCount = 0,
    toggleStarNotice,
    archiveNotice,
    unarchiveNotice,
    markNoticeAsRead,
    markNoticeAsUnread,
    markMultipleAsRead,
    markMultipleAsUnread,
    archiveMultipleNotices,
    unarchiveMultipleNotices
  } = useTasks();

  const [mailboxTab, setMailboxTab] = useState('inbox'); // 'inbox' | 'starred' | 'archive' | 'sent'
  const [selectedNoticeIds, setSelectedNoticeIds] = useState([]);
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

  // UNIFIED NOTIFICATIONS & REMINDERS FEED
  const allReminders = useMemo(() => {
    const list = [];
    const nowStr = todayStr;

    // 1. Calendar Reminders & Special Notices (from calendar_events)
    (calendarEvents || []).forEach(evt => {
      if (evt.type === 'reminder' || evt.event_type === 'reminder') {
        const creatorProfile = profiles.find(p => p.id === evt.created_by);
        const isHRCreated = creatorProfile?.role === 'admin' || creatorProfile?.department === 'HR';
        const creatorLabel = isHRCreated 
          ? `Sent by HR (${creatorProfile.full_name || creatorProfile.username})` 
          : (creatorProfile?.full_name ? `Sent by ${creatorProfile.full_name}` : 'HR / Admin Notice');

        const targetDate = toDateStringOnly(evt.start_date || evt.date);
        const countdown = getCountdownLabel(targetDate, nowStr);
        const uids = (Array.isArray(evt.user_ids) && evt.user_ids.length > 0)
          ? evt.user_ids
          : (evt.member_id ? [evt.member_id] : []);

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
          userIds: uids,
          isAllTeam: evt.is_all_team || (uids.length === 0),
          countdown,
          originalEvent: evt,
          createdAt: evt.created_at || evt.start_date
        });
      } else if (evt.type === 'meeting') {
        const targetDate = toDateStringOnly(evt.start_date || evt.date);
        const countdown = getCountdownLabel(targetDate, nowStr);
        if (countdown.diffDays >= -1 && countdown.diffDays <= 7) {
          const creatorProfile = profiles.find(p => p.id === evt.created_by);
          const uids = (Array.isArray(evt.user_ids) && evt.user_ids.length > 0)
            ? evt.user_ids
            : (evt.member_id ? [evt.member_id] : []);

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
            userIds: uids,
            isAllTeam: evt.is_all_team || (uids.length === 0),
            countdown,
            originalEvent: evt,
            createdAt: evt.created_at || evt.start_date
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
              task: t,
              createdAt: t.created_at || t.due_date
            });
          }
        }
      });
    }

    return list;
  }, [calendarEvents, tasks, profiles, todayStr]);

  // Tab counts calculation
  const tabCounts = useMemo(() => {
    let inboxCount = 0;
    let unreadCount = 0;
    let starredCount = 0;
    let archiveCount = 0;
    let sentCount = 0;

    allReminders.forEach(item => {
      const isArchived = archivedNoticeIds.includes(item.id);
      const isStarred = starredNoticeIds.includes(item.id);
      const isRead = readNoticeIds.includes(item.id);

      // Visibility check for current user in inbox/starred
      const isTargetedToMe = !currentUser ? true : (
        isAdmin ? true : (item.isAllTeam || (item.userIds && item.userIds.includes(currentUser.id)))
      );

      if (isTargetedToMe) {
        if (!isArchived) {
          inboxCount++;
          if (!isRead) {
            unreadCount++;
          }
        }
        if (isStarred) {
          starredCount++;
        }
      }

      if (isArchived) {
        archiveCount++;
      }

      // Sent history for HR/Admin
      if (item.category === 'hr_reminder' || item.originalEvent?.created_by === currentUser?.id || item.type === 'reminder') {
        sentCount++;
      }
    });

    return { inboxCount, unreadCount, starredCount, archiveCount, sentCount };
  }, [allReminders, archivedNoticeIds, starredNoticeIds, readNoticeIds, currentUser, isAdmin]);

  // Filtered Reminders based on current Mailbox Tab & Search / Filter options
  const displayedReminders = useMemo(() => {
    return allReminders
      .filter(item => {
        const isArchived = archivedNoticeIds.includes(item.id);
        const isStarred = starredNoticeIds.includes(item.id);

        // 1. Mailbox Tab Filter
        if (mailboxTab === 'inbox') {
          if (isArchived) return false;
        } else if (mailboxTab === 'starred') {
          if (!isStarred) return false;
        } else if (mailboxTab === 'archive') {
          if (!isArchived) return false;
        } else if (mailboxTab === 'sent') {
          // Sent tab is HR/Admin view of notices
          if (item.category !== 'hr_reminder' && item.type !== 'reminder' && item.originalEvent?.created_by !== currentUser?.id) {
            return false;
          }
        }

        // 2. Member scope filter
        if (mailboxTab !== 'sent') {
          if (filterMember !== 'all') {
            const matchMember = item.isAllTeam || (item.userIds && item.userIds.includes(filterMember));
            if (!matchMember) return false;
          } else if (!isAdmin && currentUser?.id) {
            // Regular staff member sees only direct or company-wide notices
            const matchSelf = item.isAllTeam || (item.userIds && item.userIds.includes(currentUser.id));
            if (!matchSelf) return false;
          }
        } else {
          if (filterMember !== 'all') {
            const matchMember = item.isAllTeam || (item.userIds && item.userIds.includes(filterMember));
            if (!matchMember) return false;
          }
        }

        // 3. Category filter
        if (filterCategory === 'hr_reminder' && item.category !== 'hr_reminder') return false;
        if (filterCategory === 'task_alert' && item.category !== 'task_overdue' && item.category !== 'task_deadline') return false;
        if (filterCategory === 'meeting_alert' && item.category !== 'meeting_alert') return false;

        // 4. Search query
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
  }, [allReminders, mailboxTab, archivedNoticeIds, starredNoticeIds, filterMember, filterCategory, searchQuery, isAdmin, currentUser]);

  // Bulk Selection Handlers
  const isAllDisplayedSelected = displayedReminders.length > 0 && displayedReminders.every(r => selectedNoticeIds.includes(r.id));

  const handleToggleSelectAll = () => {
    if (isAllDisplayedSelected) {
      setSelectedNoticeIds([]);
    } else {
      setSelectedNoticeIds(displayedReminders.map(r => r.id));
    }
  };

  const handleToggleSelectOne = (id, e) => {
    e?.stopPropagation();
    setSelectedNoticeIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkMarkRead = () => {
    if (selectedNoticeIds.length === 0) return;
    markMultipleAsRead(selectedNoticeIds);
    setSelectedNoticeIds([]);
  };

  const handleBulkMarkUnread = () => {
    if (selectedNoticeIds.length === 0) return;
    markMultipleAsUnread(selectedNoticeIds);
    setSelectedNoticeIds([]);
  };

  const handleBulkStar = () => {
    if (selectedNoticeIds.length === 0) return;
    selectedNoticeIds.forEach(id => {
      if (!starredNoticeIds.includes(id)) {
        toggleStarNotice(id);
      }
    });
    setSelectedNoticeIds([]);
  };

  const handleBulkArchive = () => {
    if (selectedNoticeIds.length === 0) return;
    archiveMultipleNotices(selectedNoticeIds);
    setSelectedNoticeIds([]);
  };

  const handleBulkRestore = () => {
    if (selectedNoticeIds.length === 0) return;
    unarchiveMultipleNotices(selectedNoticeIds);
    setSelectedNoticeIds([]);
  };

  const handleOpenNotice = (notice) => {
    markNoticeAsRead(notice.id);
    setSelectedNoticeDetails(notice);
  };

  const handleDeleteNotice = async (notice) => {
    if (notice.originalEvent && window.confirm(`Permanently delete reminder "${notice.title}"?`)) {
      try {
        await deleteCalendarEvent(notice.originalEvent.id);
        setSelectedNoticeDetails(null);
      } catch (err) {
        alert("Failed to delete notice: " + err.message);
      }
    }
  };

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl mx-auto pb-10">
      
      {/* 1. Header Banner */}
      <div className="rounded-3xl bg-white p-6 sm:p-7 border border-[#e7e1d6] relative overflow-hidden shadow-xs">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#1f5c5a]/5 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-[#e8f0ef] border border-[#a3c7c4] flex items-center justify-center text-[#1f5c5a] shadow-xs flex-shrink-0">
              <BellRing size={26} />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#e8f0ef] border border-[#a3c7c4] text-[#1f5c5a] text-[11px] font-bold mb-1">
                <Sparkles size={12} />
                Team Mailbox &amp; Kickoff Alerts
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-[#20262e] tracking-tight">
                Reminders &amp; Action Alerts
              </h1>
              <p className="text-xs text-[#6f6a60] mt-0.5 font-medium">
                {currentUser?.full_name 
                  ? `Active inbox & kickoff notifications for ${currentUser.full_name}`
                  : 'Company-wide notices, task deadlines, and daily kickoff alerts.'}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setCurrentView('calendar')}
              className="px-3.5 py-2.5 rounded-xl bg-[#faf8f4] hover:bg-[#e8f0ef] text-[#20262e] text-xs font-bold border border-[#e7e1d6] transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <CalendarIcon size={14} className="text-[#1f5c5a]" />
              <span>Calendar</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => {
                  setEditingEvent(null);
                  setIsCreateModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-sm bg-[#1f5c5a] hover:bg-[#174644] hover:scale-[1.01] active:scale-[0.98]"
              >
                <Plus size={16} className="stroke-[3]" />
                <span>+ Add New Reminder / Alert</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Mailbox Tabs (Folder Navigation) */}
        <div className="mt-6 pt-5 border-t border-[#e7e1d6] flex flex-wrap items-center gap-2">
          {/* [📥 Inbox] */}
          <button
            onClick={() => {
              setMailboxTab('inbox');
              setSelectedNoticeIds([]);
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              mailboxTab === 'inbox'
                ? 'bg-[#1f5c5a] text-white shadow-sm'
                : 'bg-[#faf8f4] text-[#6f6a60] hover:text-[#20262e] hover:bg-[#f3f0e9] border border-[#e7e1d6]'
            }`}
          >
            <Inbox size={14} />
            <span>📥 Inbox</span>
            {tabCounts.unreadCount > 0 ? (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black flex items-center gap-1 ${
                mailboxTab === 'inbox' ? 'bg-rose-500 text-white' : 'bg-rose-600 text-white animate-pulse'
              }`}>
                🔴 {tabCounts.unreadCount}
              </span>
            ) : (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                mailboxTab === 'inbox' ? 'bg-white/20 text-white' : 'bg-[#e7e1d6] text-[#6f6a60]'
              }`}>
                {tabCounts.inboxCount}
              </span>
            )}
          </button>

          {/* [⭐ Starred] */}
          <button
            onClick={() => {
              setMailboxTab('starred');
              setSelectedNoticeIds([]);
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              mailboxTab === 'starred'
                ? 'bg-[#1f5c5a] text-white shadow-sm'
                : 'bg-[#faf8f4] text-[#6f6a60] hover:text-[#20262e] hover:bg-[#f3f0e9] border border-[#e7e1d6]'
            }`}
          >
            <Star size={14} className={tabCounts.starredCount > 0 ? 'text-amber-300 fill-amber-300' : ''} />
            <span>⭐ Starred</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
              mailboxTab === 'starred' ? 'bg-white/20 text-white' : 'bg-[#e7e1d6] text-[#6f6a60]'
            }`}>
              {tabCounts.starredCount}
            </span>
          </button>

          {/* [📦 Archive] */}
          <button
            onClick={() => {
              setMailboxTab('archive');
              setSelectedNoticeIds([]);
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              mailboxTab === 'archive'
                ? 'bg-[#1f5c5a] text-white shadow-sm'
                : 'bg-[#faf8f4] text-[#6f6a60] hover:text-[#20262e] hover:bg-[#f3f0e9] border border-[#e7e1d6]'
            }`}
          >
            <Archive size={14} />
            <span>📦 Archive</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
              mailboxTab === 'archive' ? 'bg-white/20 text-white' : 'bg-[#e7e1d6] text-[#6f6a60]'
            }`}>
              {tabCounts.archiveCount}
            </span>
          </button>

          {/* [✉️ Sent History] (HR / Admin only for Ashan & Widura) */}
          {isAdmin && (
            <button
              onClick={() => {
                setMailboxTab('sent');
                setSelectedNoticeIds([]);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                mailboxTab === 'sent'
                  ? 'bg-[#1f5c5a] text-white shadow-sm'
                  : 'bg-[#faf8f4] text-[#6f6a60] hover:text-[#20262e] hover:bg-[#f3f0e9] border border-[#e7e1d6]'
              }`}
            >
              <Send size={14} />
              <span>✉️ Sent History (HR Admin)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                mailboxTab === 'sent' ? 'bg-white/20 text-white' : 'bg-[#e7e1d6] text-[#6f6a60]'
              }`}>
                {tabCounts.sentCount}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Search & Category Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#e7e1d6] shadow-xs">
        {/* Search Box */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8c827a]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reminders, instructions, staff..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#faf8f4] border border-[#d8d1c2] text-xs text-[#20262e] placeholder:text-[#8c827a] focus:border-[#1f5c5a] focus:ring-1 focus:ring-[#1f5c5a] transition-all font-medium"
          />
        </div>

        {/* Category Tabs & Member Dropdown */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter Pills */}
          <div className="flex items-center bg-[#f3f0e9] border border-[#e7e1d6] rounded-xl p-0.5 text-xs">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                filterCategory === 'all' ? 'bg-[#1f5c5a] text-white shadow-xs' : 'text-[#6f6a60] hover:text-[#20262e]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterCategory('hr_reminder')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                filterCategory === 'hr_reminder' ? 'bg-[#6b21a8] text-white shadow-xs' : 'text-[#6f6a60] hover:text-[#6b21a8]'
              }`}
            >
              🟣 HR Notices
            </button>
            <button
              onClick={() => setFilterCategory('task_alert')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                filterCategory === 'task_alert' ? 'bg-[#a82e2e] text-white shadow-xs' : 'text-[#6f6a60] hover:text-[#a82e2e]'
              }`}
            >
              🔴 Tasks/Deadlines
            </button>
            <button
              onClick={() => setFilterCategory('meeting_alert')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                filterCategory === 'meeting_alert' ? 'bg-[#1f5c5a] text-white shadow-xs' : 'text-[#6f6a60] hover:text-[#1f5c5a]'
              }`}
            >
              🔵 Meetings
            </button>
          </div>

          {/* Member Dropdown (HR/Admin can filter by anyone) */}
          {isAdmin && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[11px] text-[#6f6a60] font-bold">Target:</span>
              <select
                value={filterMember}
                onChange={(e) => setFilterMember(e.target.value)}
                className="rounded-xl px-3 py-1.5 text-xs text-[#20262e] bg-[#faf8f4] border border-[#d8d1c2] cursor-pointer font-bold focus:border-[#1f5c5a] shadow-xs"
              >
                <option value="all">Everyone (All 6 Members)</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.full_name || p.username}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 4. Bulk Actions Toolbar (Active when 1+ checkboxes selected) */}
      {selectedNoticeIds.length > 0 && (
        <div className="bg-[#1f5c5a] text-white px-4 py-2.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md animate-fade-in">
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleSelectAll}
              className="flex items-center gap-1.5 text-xs font-bold bg-white/15 hover:bg-white/25 px-2.5 py-1 rounded-lg transition-colors"
            >
              {isAllDisplayedSelected ? <CheckSquare size={14} /> : <Square size={14} />}
              <span>{isAllDisplayedSelected ? 'Deselect All' : 'Select All'}</span>
            </button>
            <span className="text-xs font-bold text-[#e8f0ef]">
              {selectedNoticeIds.length} item{selectedNoticeIds.length > 1 ? 's' : ''} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Mark as Read */}
            <button
              onClick={handleBulkMarkRead}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-bold transition-colors"
              title="Mark selected as read"
            >
              <MailOpen size={13} />
              <span>Mark Read</span>
            </button>

            {/* Mark as Unread */}
            <button
              onClick={handleBulkMarkUnread}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-bold transition-colors"
              title="Mark selected as unread"
            >
              <Mail size={13} />
              <span>Mark Unread</span>
            </button>

            {/* Star Selected */}
            <button
              onClick={handleBulkStar}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-bold transition-colors"
              title="Star selected"
            >
              <Star size={13} className="text-amber-300 fill-amber-300" />
              <span>Star</span>
            </button>

            {/* Archive or Restore */}
            {mailboxTab === 'archive' ? (
              <button
                onClick={handleBulkRestore}
                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold transition-colors shadow-xs"
                title="Restore to Inbox"
              >
                <ArchiveRestore size={13} />
                <span>Restore to Inbox</span>
              </button>
            ) : (
              <button
                onClick={handleBulkArchive}
                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-bold transition-colors"
                title="Archive selected"
              >
                <Archive size={13} />
                <span>Archive</span>
              </button>
            )}

            {/* Clear Selection */}
            <button
              onClick={() => setSelectedNoticeIds([])}
              className="p-1 text-white/70 hover:text-white transition-colors"
              title="Clear selection"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* 5. Mailbox List of Notices */}
      {displayedReminders.length === 0 ? (
        <div className="text-center py-20 rounded-3xl bg-white border border-[#e7e1d6] shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-[#e8f0ef] text-[#1f5c5a] mx-auto flex items-center justify-center mb-3.5 border border-[#a3c7c4]">
            <CheckCircle2 size={28} />
          </div>
          <h4 className="text-base font-black text-[#20262e]">
            {mailboxTab === 'starred'
              ? 'No starred notices.'
              : mailboxTab === 'archive'
              ? 'Archive folder is empty.'
              : mailboxTab === 'sent'
              ? 'No sent notices history found.'
              : 'All caught up! No active reminders or action alerts.'}
          </h4>
          <p className="text-xs text-[#6f6a60] mt-1 max-w-md mx-auto">
            {searchQuery
              ? `No notices match "${searchQuery}". Try clearing your search.`
              : mailboxTab === 'inbox'
              ? 'There are no pending notices or deadlines dispatched to your inbox.'
              : 'Items you star or archive will appear in this folder.'}
          </p>
          {isAdmin && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-[#1f5c5a] hover:bg-[#174644] text-white text-xs font-bold shadow-xs transition-all inline-flex items-center gap-1.5"
            >
              <Plus size={14} /> Send a New Notice
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {displayedReminders.map((rem) => {
            const isTask = rem.isTaskAlert && rem.task;
            const isCompleted = isTask ? (rem.task.status === 'completed' || rem.task.status === 'done') : false;
            const isOverdue = rem.countdown.status === 'overdue' || rem.countdown.status === 'yesterday';
            const isToday = rem.countdown.status === 'today';

            const isStarred = starredNoticeIds.includes(rem.id);
            const isArchived = archivedNoticeIds.includes(rem.id);
            const isRead = readNoticeIds.includes(rem.id);
            const isSelected = selectedNoticeIds.includes(rem.id);

            // Category Badge styling
            const categoryBadge = 
              rem.category === 'task_overdue' ? { label: '🔴 Overdue Task', badge: 'bg-[#f7e7e1] text-[#a82e2e] border-[#f0cac0]' } :
              rem.category === 'task_deadline' ? { label: '⏰ Urgent Deadline', badge: 'bg-[#f4ecd9] text-[#855b14] border-[#e5d2ac]' } :
              rem.category === 'meeting_alert' ? { label: '🔵 Meeting Alert', badge: 'bg-[#e8f0ef] text-[#1f5c5a] border-[#a3c7c4]' } :
              { label: '🟣 HR Special Notice', badge: 'bg-[#f1e8f8] text-[#6b21a8] border-[#dec8f0]' };

            // Due Date indicator style
            const dueBadge = 
              isOverdue ? 'text-[#a82e2e] bg-[#f7e7e1] px-2.5 py-0.5 rounded-full border border-[#f0cac0] font-bold' :
              isToday ? 'text-[#855b14] bg-[#f4ecd9] px-2.5 py-0.5 rounded-full border border-[#e5d2ac] font-bold animate-pulse' :
              'text-[#6f6a60] bg-[#faf8f4] px-2.5 py-0.5 rounded-full border border-[#e7e1d6] font-medium';

            const targetProfiles = (rem.userIds || []).map(id => getProfileForAssignee(id)).filter(Boolean);

            return (
              <div
                key={`mailbox-item-${rem.id}`}
                onClick={() => handleOpenNotice(rem)}
                className={`group relative rounded-2xl p-4 sm:p-5 transition-all duration-200 border cursor-pointer ${
                  isSelected
                    ? 'bg-[#e8f0ef] border-[#1f5c5a] shadow-sm'
                    : !isRead
                    ? 'bg-white border-l-4 border-l-[#1f5c5a] border-[#e7e1d6] shadow-sm hover:border-[#1f5c5a]/60'
                    : 'bg-white hover:bg-[#faf8f4] border-[#e7e1d6] shadow-xs'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {/* 1. Selection Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleSelectOne(rem.id, e)}
                    className={`mt-0.5 w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 transition-all border ${
                      isSelected
                        ? 'bg-[#1f5c5a] border-[#1f5c5a] text-white'
                        : 'border-[#d8d1c2] bg-[#faf8f4] hover:border-[#1f5c5a] text-transparent'
                    }`}
                    title="Select notice"
                  >
                    <Check size={12} className="stroke-[3]" />
                  </button>

                  {/* 2. Star Toggle Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStarNotice(rem.id);
                    }}
                    className={`mt-0.5 p-1 rounded-lg transition-colors flex-shrink-0 ${
                      isStarred 
                        ? 'text-amber-500 hover:text-amber-600' 
                        : 'text-[#8c827a] hover:text-amber-500 opacity-60 group-hover:opacity-100'
                    }`}
                    title={isStarred ? 'Starred (Click to unstar)' : 'Star this notice'}
                  >
                    <Star size={16} className={isStarred ? 'fill-amber-400 text-amber-500' : ''} />
                  </button>

                  {/* 3. Card Content Body */}
                  <div className="flex-1 min-w-0">
                    {/* Top Row: Category pill + Due Date info + Unread dot */}
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${categoryBadge.badge}`}>
                        {categoryBadge.label}
                      </span>

                      <span className={`text-[10px] flex items-center gap-1 ${dueBadge}`}>
                        <CalendarIcon size={11} />
                        <span>{rem.countdown.label ? `${rem.countdown.label} • ${formatDisplayDate(rem.date)}` : formatDisplayDate(rem.date)}</span>
                      </span>

                      {rem.timeStr && rem.timeStr !== 'All Day' && (
                        <span className="text-[10px] text-[#6f6a60] flex items-center gap-1 font-medium">
                          <Clock size={11} />
                          {rem.timeStr}
                        </span>
                      )}

                      {!isRead && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full bg-rose-50 border border-rose-200 text-rose-600 text-[10px] font-black animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                          New
                        </span>
                      )}
                    </div>

                    {/* Notice Title */}
                    <h4 className={`text-sm sm:text-base font-bold leading-snug transition-colors ${
                      isCompleted 
                        ? 'text-[#8c827a] line-through' 
                        : !isRead
                        ? 'text-[#20262e] font-black'
                        : 'text-[#20262e]'
                    }`}>
                      {rem.title}
                    </h4>

                    {/* Subtitle / Note */}
                    {rem.description && (
                      <p className="text-xs text-[#524e47] mt-1.5 leading-relaxed whitespace-pre-wrap bg-[#faf8f4] p-2.5 rounded-xl border border-[#e7e1d6] font-medium">
                        "{rem.description}"
                      </p>
                    )}

                    {/* Card Footer: Target Audience + Sender Info + Mailbox Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-2.5 border-t border-[#e7e1d6] text-xs">
                      {/* Target Member Label */}
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[#6f6a60] font-bold">Target:</span>
                        {rem.isAllTeam ? (
                          <span className="text-[11px] font-bold text-[#1f5c5a] bg-[#e8f0ef] px-2.5 py-0.5 rounded-lg border border-[#a3c7c4] flex items-center gap-1 shadow-xs">
                            👥 Everyone (All 6 Members)
                          </span>
                        ) : targetProfiles.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {targetProfiles.map(p => (
                              <div key={p.id} className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#faf8f4] border border-[#d8d1c2]">
                                <img
                                  src={p.avatar_url}
                                  alt={p.full_name}
                                  className="w-4 h-4 rounded-full object-cover ring-1 ring-[#d8d1c2]"
                                />
                                <span className="text-[11px] font-bold text-[#20262e]">
                                  {p.full_name || p.username}
                                </span>
                                <span className={`text-[9px] px-1.5 py-0.2 rounded border font-medium ${getDepartmentBadge(p.department)}`}>
                                  {p.department}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#6f6a60] italic">General Staff</span>
                        )}
                      </div>

                      {/* Right Side: Sender Attribution & Quick Icons */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 text-[11px] text-[#1f5c5a] font-bold bg-[#e8f0ef] px-2.5 py-0.5 rounded-lg border border-[#a3c7c4]">
                          <Send size={11} className="text-[#1f5c5a]" />
                          <span>{rem.senderInfo}</span>
                        </div>

                        {/* Archive / Restore Button */}
                        {isArchived ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              unarchiveNotice(rem.id);
                            }}
                            className="p-1 text-[#6f6a60] hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all"
                            title="Restore to Inbox"
                          >
                            <ArchiveRestore size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              archiveNotice(rem.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-[#6f6a60] hover:text-[#20262e] hover:bg-[#f3f0e9] rounded-lg transition-all"
                            title="Archive this notice"
                          >
                            <Archive size={14} />
                          </button>
                        )}

                        {/* Delete Notice for HR / Admin */}
                        {isAdmin && !isTask && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNotice(rem);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-[#6f6a60] hover:text-[#a82e2e] hover:bg-[#f7e7e1] rounded-lg transition-all"
                            title="Delete notice"
                          >
                            <Trash2 size={14} />
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

      {/* 6. Full Notice / Reminder Details Modal */}
      {selectedNoticeDetails && (() => {
        const item = selectedNoticeDetails;
        const rawEvent = item.rawEvent || item.originalEvent;
        const targetUids = item.userIds || (rawEvent?.user_ids) || (rawEvent?.member_id ? [rawEvent.member_id] : []);
        const assignedProfiles = targetUids.map(id => getProfileForAssignee(id)).filter(Boolean);
        const countdown = item.countdown;
        const isOverdue = countdown?.status === 'overdue' || countdown?.status === 'yesterday';
        const isToday = countdown?.status === 'today';
        const isStarred = starredNoticeIds.includes(item.id);
        const isArchived = archivedNoticeIds.includes(item.id);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
            <div className="w-full max-w-md bg-white border border-[#e7e1d6] rounded-3xl shadow-2xl overflow-hidden animate-scale-up">
              
              {/* Header */}
              <div className="p-5 border-b border-[#e7e1d6] bg-[#faf8f4] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg border shadow-xs ${
                    isOverdue ? 'bg-[#f7e7e1] border-[#f0cac0]' :
                    isToday ? 'bg-[#f4ecd9] border-[#e5d2ac]' :
                    'bg-[#e8f0ef] border-[#a3c7c4]'
                  }`}>
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[#20262e] leading-snug">{item.title}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] uppercase font-extrabold text-[#1f5c5a]">
                        {item.category === 'task_overdue' ? 'Overdue Alert' :
                         item.category === 'task_deadline' ? 'Task Deadline' :
                         item.category === 'meeting_alert' ? 'Meeting Notice' :
                         'HR Direct Reminder'}
                      </span>
                      {countdown?.label && (
                        <span className={`text-[9px] px-2 py-0.2 rounded-full font-bold border ${
                          isOverdue ? 'bg-[#f7e7e1] text-[#a82e2e] border-[#f0cac0]' :
                          isToday ? 'bg-[#f4ecd9] text-[#855b14] border-[#e5d2ac]' :
                          'bg-[#e8f0ef] text-[#1f5c5a] border-[#a3c7c4]'
                        }`}>
                          {countdown.label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => toggleStarNotice(item.id)}
                    className="p-1.5 text-[#6f6a60] hover:text-amber-500 rounded-xl transition-colors"
                    title={isStarred ? 'Starred' : 'Star notice'}
                  >
                    <Star size={18} className={isStarred ? 'fill-amber-400 text-amber-500' : ''} />
                  </button>
                  <button
                    onClick={() => setSelectedNoticeDetails(null)}
                    className="p-1.5 text-[#6f6a60] hover:text-[#20262e] bg-[#f3f0e9] hover:bg-[#e7e1d6] rounded-xl transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 space-y-3.5 text-xs">
                {/* Notice Source */}
                {item.senderInfo && (
                  <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-[#faf8f4] border border-[#e7e1d6]">
                    <Send size={15} className="text-[#1f5c5a] flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-[#6f6a60] block text-[11px]">Notice Source:</span>
                      <span className="text-[#1f5c5a] text-xs font-bold block truncate">
                        {item.senderInfo}
                      </span>
                    </div>
                  </div>
                )}

                {/* Timing */}
                <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#faf8f4] border border-[#e7e1d6]">
                  <Clock size={15} className="text-[#1f5c5a] mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="font-bold text-[#6f6a60] block text-[11px]">Date &amp; Schedule:</span>
                    <span className="text-[#20262e] mt-0.5 font-bold block">
                      {rawEvent ? formatEventDateRange(rawEvent) : formatDisplayDate(item.date)}
                    </span>
                  </div>
                </div>

                {/* Target Audience */}
                <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#faf8f4] border border-[#e7e1d6]">
                  <Users size={15} className="text-[#1f5c5a] mt-0.5 flex-shrink-0" />
                  <div className="w-full">
                    <span className="font-bold text-[#6f6a60] block text-[11px] mb-1">Target Audience:</span>
                    {item.isAllTeam ? (
                      <span className="text-[#1f5c5a] font-bold text-xs bg-[#e8f0ef] px-2.5 py-1 rounded-xl border border-[#a3c7c4] inline-flex items-center gap-1.5">
                        👥 Entire Team (All 6 Members)
                      </span>
                    ) : assignedProfiles.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {assignedProfiles.map(p => (
                          <div key={p.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-[#d8d1c2]">
                            <img 
                              src={p.avatar_url} 
                              alt={p.full_name} 
                              className="w-4 h-4 rounded-full object-cover" 
                            />
                            <span className="text-[#20262e] text-[11px] font-bold">
                              {p.full_name || p.username}
                            </span>
                            <span className="text-[9px] text-[#6f6a60]">
                              ({p.department})
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[#6f6a60] font-semibold mt-0.5 block">General Staff</span>
                    )}
                  </div>
                </div>

                {/* Instructions / Message */}
                {item.description && (
                  <div className="p-3.5 rounded-2xl bg-[#faf8f4] border border-[#e7e1d6]">
                    <span className="font-bold text-[#6f6a60] block mb-1 text-[11px]">Instructions / Message:</span>
                    <p className="text-[#20262e] whitespace-pre-wrap leading-relaxed bg-white p-3 rounded-xl border border-[#d8d1c2] font-medium">
                      "{item.description}"
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-5 border-t border-[#e7e1d6] bg-[#faf8f4] flex items-center justify-between gap-2.5">
                {/* Archive / Restore Toggle */}
                {isArchived ? (
                  <button
                    onClick={() => {
                      unarchiveNotice(item.id);
                      setSelectedNoticeDetails(null);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <ArchiveRestore size={14} /> Restore to Inbox
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      archiveNotice(item.id);
                      setSelectedNoticeDetails(null);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#f3f0e9] text-[#6f6a60] border border-[#d8d1c2] text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <Archive size={14} /> Archive
                  </button>
                )}

                {/* Edit Notice for HR Admin */}
                {rawEvent && isAdmin ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDeleteNotice(item)}
                      className="px-3 py-2 rounded-xl bg-[#f7e7e1] hover:bg-[#f0cac0] text-[#a82e2e] border border-[#f0cac0] text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <Trash2 size={14} /> Delete
                    </button>

                    <button
                      onClick={() => {
                        setSelectedNoticeDetails(null);
                        setEditingEvent(rawEvent);
                        setIsCreateModalOpen(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-[#1f5c5a] hover:bg-[#174644] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                    >
                      <Edit3 size={14} /> Edit Notice
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedNoticeDetails(null)}
                    className="py-2 px-5 rounded-xl bg-[#1f5c5a] hover:bg-[#174644] text-white text-xs font-bold transition-all"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* CREATE / EDIT NOTICE MODAL */}
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
