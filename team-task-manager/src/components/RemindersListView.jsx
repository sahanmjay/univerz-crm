import React, { useState, useMemo } from 'react';
import { useTasks } from '../context/TaskContext';
import { 
  Inbox, 
  Star, 
  Send, 
  Archive, 
  ArchiveRestore, 
  Trash2, 
  Edit3, 
  Search, 
  Plus, 
  Check, 
  CheckSquare, 
  Square, 
  Mail, 
  MailOpen, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  ArrowLeft, 
  Sparkles, 
  BellRing, 
  Clock, 
  Calendar as CalendarIcon, 
  Users, 
  Tag, 
  AlertCircle, 
  AlertTriangle, 
  MoreVertical, 
  CheckCircle2, 
  ExternalLink,
  MessageSquare,
  Paperclip,
  Pencil,
  X,
  Filter
} from 'lucide-react';
import ComposeNoticeModal from './ComposeNoticeModal';
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
    fetchCalendarEvents,
    setCurrentView,
    readNoticeIds = [],
    starredNoticeIds = [],
    archivedNoticeIds = [],
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

  const [activeFolder, setActiveFolder] = useState('inbox'); // 'inbox' | 'starred' | 'sent' | 'archive'
  const [selectedNoticeIds, setSelectedNoticeIds] = useState([]);
  const [activeNoticeDetail, setActiveNoticeDetail] = useState(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all'); // all, hr_notice, task_alert, meeting, urgent
  const [filterMember, setFilterMember] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const todayStr = toDateStringOnly(new Date());

  const getProfileForAssignee = (assigneeId) => {
    return profiles.find(p => p.id === assigneeId);
  };

  // UNIFIED NOTIFICATIONS FEED
  const allNotices = useMemo(() => {
    const list = [];
    const nowStr = todayStr;

    // 1. Calendar Reminders & Special Notices (from calendar_events)
    (calendarEvents || []).forEach(evt => {
      if (evt.type === 'reminder' || evt.event_type === 'reminder') {
        const creatorProfile = profiles.find(p => p.id === evt.created_by);
        const targetDate = toDateStringOnly(evt.start_date || evt.date);
        const countdown = getCountdownLabel(targetDate, nowStr);
        const uids = (Array.isArray(evt.user_ids) && evt.user_ids.length > 0)
          ? evt.user_ids
          : (evt.member_id ? [evt.member_id] : []);

        const isHR = creatorProfile?.role === 'admin' || creatorProfile?.department === 'HR';
        const senderLabel = creatorProfile?.full_name || creatorProfile?.username || (isHR ? 'HR Notice' : 'Team Notice');

        list.push({
          id: `reminder-${evt.id}`,
          rawId: evt.id,
          isTaskAlert: false,
          category: isHR ? 'hr_notice' : 'general',
          icon: '🟣',
          type: 'reminder',
          title: evt.title,
          description: evt.description || evt.notes || '',
          date: targetDate,
          endDate: evt.end_date ? toDateStringOnly(evt.end_date) : null,
          timeStr: formatEventTime(evt),
          senderInfo: senderLabel,
          creatorProfile,
          createdBy: evt.created_by,
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
            category: 'meeting',
            icon: '🔵',
            type: 'meeting',
            title: `Meeting: ${evt.title}`,
            description: evt.description || 'Scheduled sync / scrum meeting',
            date: targetDate,
            endDate: evt.end_date ? toDateStringOnly(evt.end_date) : null,
            timeStr: formatEventTime(evt),
            senderInfo: creatorProfile ? (creatorProfile.full_name || creatorProfile.username) : 'Team Meeting Alert',
            creatorProfile,
            createdBy: evt.created_by,
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
              category: isOverdue ? 'urgent' : 'task_alert',
              icon: isOverdue ? '🔴' : '⏰',
              type: 'task_alert',
              title: isOverdue ? `Overdue Task: ${t.title}` : `Upcoming Deadline: ${t.title}`,
              description: t.description || `Priority: ${t.priority.toUpperCase()}. Please complete and submit deliverables.`,
              date: dueDateStr,
              endDate: null,
              timeStr: 'Due Date',
              senderInfo: creator ? (creator.full_name || creator.username) : 'Task System',
              creatorProfile: creator,
              createdBy: t.created_by,
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

  // Folder Counts Calculation
  const folderCounts = useMemo(() => {
    let inbox = 0;
    let unreadInbox = 0;
    let starred = 0;
    let sent = 0;
    let archive = 0;

    allNotices.forEach(item => {
      const isArchived = archivedNoticeIds.includes(item.id);
      const isStarred = starredNoticeIds.includes(item.id);
      const isRead = readNoticeIds.includes(item.id);

      // Check if for current logged-in user
      const isTargetedToMe = !currentUser ? true : (
        item.isAllTeam || (item.userIds && item.userIds.includes(currentUser.id)) || (item.createdBy === currentUser.id)
      );

      // Inbox
      if (isTargetedToMe && !isArchived) {
        inbox++;
        if (!isRead) unreadInbox++;
      }

      // Starred
      if (isStarred) {
        starred++;
      }

      // Sent
      if (currentUser && item.createdBy === currentUser.id) {
        sent++;
      }

      // Archive
      if (isArchived) {
        archive++;
      }
    });

    return { inbox, unreadInbox, starred, sent, archive };
  }, [allNotices, archivedNoticeIds, starredNoticeIds, readNoticeIds, currentUser]);

  // Filtered List based on Folder and Search Filters
  const displayedMessages = useMemo(() => {
    return allNotices
      .filter(item => {
        const isArchived = archivedNoticeIds.includes(item.id);
        const isStarred = starredNoticeIds.includes(item.id);

        // 1. Folder Navigation Filter
        if (activeFolder === 'inbox') {
          if (isArchived) return false;
          // Normal staff sees items sent to them, to everyone, or created by them
          if (currentUser) {
            const isForMe = item.isAllTeam || (item.userIds && item.userIds.includes(currentUser.id)) || (item.createdBy === currentUser.id);
            if (!isForMe) return false;
          }
        } else if (activeFolder === 'starred') {
          if (!isStarred) return false;
        } else if (activeFolder === 'sent') {
          if (currentUser && item.createdBy !== currentUser.id) return false;
        } else if (activeFolder === 'archive') {
          if (!isArchived) return false;
        }

        // 2. Member filter
        if (filterMember !== 'all') {
          const match = item.isAllTeam || (item.userIds && item.userIds.includes(filterMember)) || (item.createdBy === filterMember);
          if (!match) return false;
        }

        // 3. Category filter
        if (filterCategory !== 'all') {
          if (filterCategory === 'hr_notice' && item.category !== 'hr_notice') return false;
          if (filterCategory === 'urgent' && item.category !== 'urgent') return false;
          if (filterCategory === 'task_alert' && item.category !== 'task_alert' && item.category !== 'urgent') return false;
          if (filterCategory === 'meeting' && item.category !== 'meeting') return false;
          if (filterCategory === 'general' && item.category !== 'general') return false;
        }

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
        // Priority 1: Overdue notices
        if (a.countdown.diffDays < 0 && b.countdown.diffDays >= 0) return -1;
        if (b.countdown.diffDays < 0 && a.countdown.diffDays >= 0) return 1;
        // Priority 2: Due Today
        if (a.countdown.diffDays === 0 && b.countdown.diffDays > 0) return -1;
        if (b.countdown.diffDays === 0 && a.countdown.diffDays > 0) return 1;
        // Priority 3: Chronological by creation or date
        return (b.createdAt || b.date).localeCompare(a.createdAt || a.date);
      });
  }, [allNotices, activeFolder, archivedNoticeIds, starredNoticeIds, filterMember, filterCategory, searchQuery, currentUser]);

  // Bulk Selection Handlers
  const isAllDisplayedSelected = displayedMessages.length > 0 && displayedMessages.every(r => selectedNoticeIds.includes(r.id));

  const handleToggleSelectAll = () => {
    if (isAllDisplayedSelected) {
      setSelectedNoticeIds([]);
    } else {
      setSelectedNoticeIds(displayedMessages.map(r => r.id));
    }
  };

  const handleToggleSelectOne = (id, e) => {
    e?.stopPropagation();
    setSelectedNoticeIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (fetchCalendarEvents) {
      await fetchCalendarEvents();
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleOpenNotice = (notice) => {
    markNoticeAsRead(notice.id);
    setActiveNoticeDetail(notice);
  };

  const handleDeleteNotice = async (notice, e) => {
    e?.stopPropagation();
    if (notice.originalEvent && window.confirm(`Permanently delete notice "${notice.title}"?`)) {
      try {
        await deleteCalendarEvent(notice.originalEvent.id);
        if (activeNoticeDetail?.id === notice.id) {
          setActiveNoticeDetail(null);
        }
      } catch (err) {
        alert("Failed to delete notice: " + err.message);
      }
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 animate-fade-in pb-12">
      
      {/* 1. Main Gmail Mailbox Window */}
      <div className="bg-white rounded-3xl border border-[#e7e1d6] shadow-xs overflow-hidden flex flex-col md:flex-row min-h-[680px]">
        
        {/* Left Sidebar (Gmail Style) */}
        <div className={`w-full md:w-60 lg:w-64 bg-[#faf8f4] border-b md:border-b-0 md:border-r border-[#e7e1d6] p-4 flex flex-col justify-between flex-shrink-0 transition-all ${
          isSidebarCollapsed ? 'md:w-20' : ''
        }`}>
          <div className="space-y-4">
            
            {/* ✏️ + Compose Button (Gmail Style Pill Button) */}
            <button
              onClick={() => setIsComposeOpen(true)}
              className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl bg-white hover:bg-[#e8f0ef] text-[#1f5c5a] border border-[#d8d1c2] hover:border-[#1f5c5a] font-black text-xs sm:text-sm shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] group"
            >
              <div className="w-6 h-6 rounded-lg bg-[#e8f0ef] group-hover:bg-[#1f5c5a] group-hover:text-white flex items-center justify-center text-[#1f5c5a] transition-colors">
                <Pencil size={13} className="stroke-[2.5]" />
              </div>
              {!isSidebarCollapsed && <span>Compose Notice</span>}
            </button>

            {/* Folder Navigation Links */}
            <div className="space-y-1">
              {/* 📥 Inbox */}
              <button
                onClick={() => {
                  setActiveFolder('inbox');
                  setActiveNoticeDetail(null);
                  setSelectedNoticeIds([]);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeFolder === 'inbox'
                    ? 'bg-[#e8f0ef] text-[#1f5c5a] font-black shadow-xs'
                    : 'text-[#6f6a60] hover:text-[#20262e] hover:bg-white/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Inbox size={16} className={activeFolder === 'inbox' ? 'text-[#1f5c5a]' : 'text-[#8c827a]'} />
                  {!isSidebarCollapsed && <span>Inbox</span>}
                </div>
                {folderCounts.unreadInbox > 0 ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-rose-600 text-white animate-pulse">
                    🔴 {folderCounts.unreadInbox}
                  </span>
                ) : folderCounts.inbox > 0 ? (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-medium text-[#6f6a60] bg-white border border-[#e7e1d6]">
                    {folderCounts.inbox}
                  </span>
                ) : null}
              </button>

              {/* ⭐ Starred */}
              <button
                onClick={() => {
                  setActiveFolder('starred');
                  setActiveNoticeDetail(null);
                  setSelectedNoticeIds([]);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeFolder === 'starred'
                    ? 'bg-[#e8f0ef] text-[#1f5c5a] font-black shadow-xs'
                    : 'text-[#6f6a60] hover:text-[#20262e] hover:bg-white/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Star size={16} className={folderCounts.starred > 0 ? 'text-amber-500 fill-amber-400' : 'text-[#8c827a]'} />
                  {!isSidebarCollapsed && <span>Starred</span>}
                </div>
                {folderCounts.starred > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold text-amber-800 bg-amber-100 border border-amber-200">
                    {folderCounts.starred}
                  </span>
                )}
              </button>

              {/* 📤 Sent */}
              <button
                onClick={() => {
                  setActiveFolder('sent');
                  setActiveNoticeDetail(null);
                  setSelectedNoticeIds([]);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeFolder === 'sent'
                    ? 'bg-[#e8f0ef] text-[#1f5c5a] font-black shadow-xs'
                    : 'text-[#6f6a60] hover:text-[#20262e] hover:bg-white/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Send size={16} className={activeFolder === 'sent' ? 'text-[#1f5c5a]' : 'text-[#8c827a]'} />
                  {!isSidebarCollapsed && <span>Sent Messages</span>}
                </div>
                {folderCounts.sent > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-medium text-[#6f6a60] bg-white border border-[#e7e1d6]">
                    {folderCounts.sent}
                  </span>
                )}
              </button>

              {/* 📦 Archive */}
              <button
                onClick={() => {
                  setActiveFolder('archive');
                  setActiveNoticeDetail(null);
                  setSelectedNoticeIds([]);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeFolder === 'archive'
                    ? 'bg-[#e8f0ef] text-[#1f5c5a] font-black shadow-xs'
                    : 'text-[#6f6a60] hover:text-[#20262e] hover:bg-white/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Archive size={16} className={activeFolder === 'archive' ? 'text-[#1f5c5a]' : 'text-[#8c827a]'} />
                  {!isSidebarCollapsed && <span>Archive</span>}
                </div>
                {folderCounts.archive > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-medium text-[#6f6a60] bg-white border border-[#e7e1d6]">
                    {folderCounts.archive}
                  </span>
                )}
              </button>
            </div>

            {/* Labels / Categories */}
            {!isSidebarCollapsed && (
              <div className="pt-4 border-t border-[#e7e1d6] space-y-1.5">
                <div className="text-[10px] font-black uppercase tracking-wider text-[#8c827a] px-3">
                  Notice Types
                </div>
                <div className="space-y-0.5 text-xs">
                  <button
                    onClick={() => setFilterCategory('all')}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                      filterCategory === 'all' ? 'bg-white text-[#1f5c5a] shadow-xs' : 'text-[#6f6a60] hover:text-[#20262e]'
                    }`}
                  >
                    <span>All Types</span>
                  </button>
                  <button
                    onClick={() => setFilterCategory('hr_notice')}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                      filterCategory === 'hr_notice' ? 'bg-[#f1e8f8] text-[#6b21a8]' : 'text-[#6f6a60] hover:text-[#6b21a8]'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-[#6b21a8]" />
                    <span>HR Direct Notices</span>
                  </button>
                  <button
                    onClick={() => setFilterCategory('urgent')}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                      filterCategory === 'urgent' ? 'bg-[#f7e7e1] text-[#a82e2e]' : 'text-[#6f6a60] hover:text-[#a82e2e]'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-[#a82e2e]" />
                    <span>Urgent Alerts</span>
                  </button>
                  <button
                    onClick={() => setFilterCategory('meeting')}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                      filterCategory === 'meeting' ? 'bg-[#e8f0ef] text-[#1f5c5a]' : 'text-[#6f6a60] hover:text-[#1f5c5a]'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-[#1f5c5a]" />
                    <span>Meeting Syncs</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill at Bottom of Sidebar */}
          {!isSidebarCollapsed && currentUser && (
            <div className="pt-4 border-t border-[#e7e1d6] flex items-center gap-2.5">
              <img
                src={currentUser.avatar_url}
                alt={currentUser.full_name}
                className="w-8 h-8 rounded-full object-cover ring-1 ring-[#d8d1c2]"
              />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-[#20262e] block truncate">
                  {currentUser.full_name || currentUser.username}
                </span>
                <span className="text-[10px] text-[#6f6a60] block truncate">
                  {currentUser.department} &bull; {currentUser.role}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Main Panel (Message List or Detail View) */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          
          {/* Top Search & Toolbar */}
          <div className="border-b border-[#e7e1d6] p-3 sm:p-4 bg-white flex flex-wrap items-center justify-between gap-3">
            
            {/* Search Input Bar (Google Style) */}
            <div className="relative flex-1 min-w-[220px] max-w-lg">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8c827a]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search in notices, subjects, team members..."
                className="w-full pl-9 pr-4 py-2 rounded-full bg-[#faf8f4] border border-[#d8d1c2] text-xs text-[#20262e] placeholder:text-[#8c827a] focus:bg-white focus:border-[#1f5c5a] focus:ring-1 focus:ring-[#1f5c5a] transition-all font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8c827a] hover:text-[#20262e]"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Quick Actions / Refresh / Target Filter */}
            <div className="flex items-center gap-2">
              {/* Target Member Filter */}
              <select
                value={filterMember}
                onChange={(e) => setFilterMember(e.target.value)}
                className="rounded-xl px-2.5 py-1.5 text-xs text-[#20262e] bg-[#faf8f4] border border-[#d8d1c2] cursor-pointer font-bold focus:border-[#1f5c5a] shadow-xs"
              >
                <option value="all">👥 All 6 Members</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.full_name || p.username}</option>
                ))}
              </select>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                className="p-2 rounded-xl bg-[#faf8f4] hover:bg-[#e8f0ef] text-[#6f6a60] hover:text-[#1f5c5a] border border-[#e7e1d6] transition-all shadow-xs"
                title="Refresh notices"
              >
                <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-[#1f5c5a]' : ''} />
              </button>

              {/* Quick Switch to Calendar */}
              <button
                onClick={() => setCurrentView('calendar')}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#faf8f4] hover:bg-[#e8f0ef] text-[#20262e] text-xs font-bold border border-[#e7e1d6] transition-colors shadow-xs"
                title="Open Calendar Schedule"
              >
                <CalendarIcon size={13} className="text-[#1f5c5a]" />
                <span>Calendar</span>
              </button>
            </div>
          </div>

          {/* Bulk Action Toolbar (Active when 1+ checkboxes selected) */}
          {selectedNoticeIds.length > 0 && !activeNoticeDetail && (
            <div className="bg-[#1f5c5a] text-white px-4 py-2 flex items-center justify-between gap-3 text-xs font-bold animate-fade-in">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleToggleSelectAll}
                  className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-lg transition-colors"
                >
                  {isAllDisplayedSelected ? <CheckSquare size={13} /> : <Square size={13} />}
                  <span>{isAllDisplayedSelected ? 'Deselect' : 'Select All'}</span>
                </button>
                <span>{selectedNoticeIds.length} selected</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    markMultipleAsRead(selectedNoticeIds);
                    setSelectedNoticeIds([]);
                  }}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  title="Mark as Read"
                >
                  <MailOpen size={14} />
                </button>

                <button
                  onClick={() => {
                    markMultipleAsUnread(selectedNoticeIds);
                    setSelectedNoticeIds([]);
                  }}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  title="Mark as Unread"
                >
                  <Mail size={14} />
                </button>

                <button
                  onClick={() => {
                    selectedNoticeIds.forEach(id => {
                      if (!starredNoticeIds.includes(id)) toggleStarNotice(id);
                    });
                    setSelectedNoticeIds([]);
                  }}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  title="Star Selected"
                >
                  <Star size={14} className="text-amber-300 fill-amber-300" />
                </button>

                {activeFolder === 'archive' ? (
                  <button
                    onClick={() => {
                      unarchiveMultipleNotices(selectedNoticeIds);
                      setSelectedNoticeIds([]);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 transition-colors"
                    title="Restore to Inbox"
                  >
                    <ArchiveRestore size={13} />
                    <span>Restore</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      archiveMultipleNotices(selectedNoticeIds);
                      setSelectedNoticeIds([]);
                    }}
                    className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                    title="Archive Selected"
                  >
                    <Archive size={14} />
                  </button>
                )}

                <button
                  onClick={() => setSelectedNoticeIds([])}
                  className="p-1 text-white/70 hover:text-white"
                  title="Clear Selection"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Content Area: Either Detailed Message View OR List Feed */}
          {activeNoticeDetail ? (
            /* 2. FULL GMAIL-STYLE MESSAGE DETAIL VIEW */
            <div className="p-5 sm:p-7 space-y-5 animate-fade-in flex-1 overflow-y-auto">
              
              {/* Back Button & Top Actions */}
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#e7e1d6]">
                <button
                  onClick={() => setActiveNoticeDetail(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#faf8f4] hover:bg-[#e8f0ef] text-[#20262e] text-xs font-bold border border-[#e7e1d6] transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span>Back to {activeFolder.charAt(0).toUpperCase() + activeFolder.slice(1)}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleStarNotice(activeNoticeDetail.id)}
                    className="p-2 rounded-xl border border-[#d8d1c2] hover:bg-[#faf8f4] transition-colors text-amber-500"
                    title={starredNoticeIds.includes(activeNoticeDetail.id) ? 'Starred' : 'Star this notice'}
                  >
                    <Star size={16} className={starredNoticeIds.includes(activeNoticeDetail.id) ? 'fill-amber-400' : ''} />
                  </button>

                  {archivedNoticeIds.includes(activeNoticeDetail.id) ? (
                    <button
                      onClick={() => {
                        unarchiveNotice(activeNoticeDetail.id);
                        setActiveNoticeDetail(null);
                      }}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors"
                      title="Restore to Inbox"
                    >
                      <ArchiveRestore size={14} />
                      <span>Restore to Inbox</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        archiveNotice(activeNoticeDetail.id);
                        setActiveNoticeDetail(null);
                      }}
                      className="p-2 rounded-xl border border-[#d8d1c2] hover:bg-[#faf8f4] text-[#6f6a60] transition-colors"
                      title="Archive notice"
                    >
                      <Archive size={16} />
                    </button>
                  )}

                  {(isAdmin || activeNoticeDetail.createdBy === currentUser?.id) && (
                    <button
                      onClick={(e) => handleDeleteNotice(activeNoticeDetail, e)}
                      className="p-2 rounded-xl border border-[#f0cac0] bg-[#f7e7e1] text-[#a82e2e] hover:bg-[#f0cac0] transition-colors"
                      title="Delete notice"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Message Header */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-lg sm:text-xl font-black text-[#20262e] leading-snug">
                    {activeNoticeDetail.title}
                  </h2>
                  <span className="text-xs text-[#6f6a60] font-medium whitespace-nowrap pt-1">
                    {formatDisplayDate(activeNoticeDetail.date)} &bull; {activeNoticeDetail.timeStr}
                  </span>
                </div>

                {/* Sender & Recipient Information */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#faf8f4] border border-[#e7e1d6]">
                  <div className="flex items-center gap-3">
                    <img
                      src={activeNoticeDetail.creatorProfile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                      alt={activeNoticeDetail.senderInfo}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-[#d8d1c2]"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-black text-[#20262e]">
                          {activeNoticeDetail.senderInfo}
                        </span>
                        {activeNoticeDetail.creatorProfile?.department && (
                          <span className={`text-[9px] px-1.5 py-0.2 rounded border font-bold ${getDepartmentBadge(activeNoticeDetail.creatorProfile.department)}`}>
                            {activeNoticeDetail.creatorProfile.department}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#6f6a60] block mt-0.5 font-medium">
                        {activeNoticeDetail.creatorProfile?.email || 'internal-notice@company.com'}
                      </span>
                    </div>
                  </div>

                  {/* Target Audience Pill */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-[11px] font-bold text-[#6f6a60]">To:</span>
                    {activeNoticeDetail.isAllTeam ? (
                      <span className="text-[11px] font-black text-[#1f5c5a] bg-[#e8f0ef] px-2.5 py-1 rounded-xl border border-[#a3c7c4]">
                        👥 Everyone (All 6 Members)
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {(activeNoticeDetail.userIds || []).map(uid => {
                          const p = getProfileForAssignee(uid);
                          return p ? (
                            <span key={uid} className="text-[10px] font-bold text-[#20262e] bg-white px-2 py-0.5 rounded-lg border border-[#d8d1c2]">
                              {p.full_name || p.username}
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Message Body Content */}
              <div className="p-6 rounded-2xl bg-white border border-[#e7e1d6] text-xs sm:text-sm text-[#20262e] font-medium leading-relaxed whitespace-pre-wrap shadow-xs">
                {activeNoticeDetail.description || 'No additional details provided with this notice.'}
              </div>

              {/* Quick Reply / Acknowledge Action */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  onClick={() => setIsComposeOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[#1f5c5a] hover:bg-[#174644] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Send size={13} />
                  <span>Send Follow-up Notice</span>
                </button>

                <button
                  onClick={() => setActiveNoticeDetail(null)}
                  className="px-4 py-2 rounded-xl bg-[#faf8f4] hover:bg-[#e8f0ef] text-[#6f6a60] text-xs font-bold border border-[#e7e1d6] transition-colors"
                >
                  Close Message
                </button>
              </div>
            </div>
          ) : (
            /* 3. ROW-BY-ROW GMAIL LIST FEED */
            <div className="flex-1 overflow-y-auto divide-y divide-[#e7e1d6]/70">
              {displayedMessages.length === 0 ? (
                <div className="text-center py-24 px-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#e8f0ef] text-[#1f5c5a] mx-auto flex items-center justify-center mb-3.5 border border-[#a3c7c4]">
                    <CheckCircle2 size={26} />
                  </div>
                  <h4 className="text-sm sm:text-base font-black text-[#20262e]">
                    {activeFolder === 'starred'
                      ? 'No starred messages.'
                      : activeFolder === 'sent'
                      ? 'No sent notices dispatched by you.'
                      : activeFolder === 'archive'
                      ? 'Archive is empty.'
                      : 'Your inbox is clear! No active notices or action alerts.'}
                  </h4>
                  <p className="text-xs text-[#6f6a60] mt-1 max-w-sm mx-auto">
                    {searchQuery
                      ? `No notices match "${searchQuery}". Try clearing search.`
                      : 'Notices sent to you or company-wide updates will appear here.'}
                  </p>
                  <button
                    onClick={() => setIsComposeOpen(true)}
                    className="mt-4 px-4 py-2 rounded-xl bg-[#1f5c5a] hover:bg-[#174644] text-white text-xs font-bold shadow-xs transition-all inline-flex items-center gap-1.5"
                  >
                    <Plus size={14} /> Compose New Notice
                  </button>
                </div>
              ) : (
                displayedMessages.map((msg) => {
                  const isRead = readNoticeIds.includes(msg.id);
                  const isStarred = starredNoticeIds.includes(msg.id);
                  const isArchived = archivedNoticeIds.includes(msg.id);
                  const isSelected = selectedNoticeIds.includes(msg.id);

                  // Priority / Category Badge
                  const categoryBadge = 
                    msg.category === 'urgent' ? { label: '🔴 Urgent', bg: 'bg-[#f7e7e1] text-[#a82e2e] border-[#f0cac0]' } :
                    msg.category === 'task_alert' ? { label: '⏰ Deadline', bg: 'bg-[#f4ecd9] text-[#855b14] border-[#e5d2ac]' } :
                    msg.category === 'meeting' ? { label: '🔵 Meeting', bg: 'bg-[#e8f0ef] text-[#1f5c5a] border-[#a3c7c4]' } :
                    msg.category === 'hr_notice' ? { label: '🟣 HR Notice', bg: 'bg-[#f1e8f8] text-[#6b21a8] border-[#dec8f0]' } :
                    { label: '🟢 General', bg: 'bg-[#e6f0e8] text-[#2e6930] border-[#c2dfc8]' };

                  return (
                    <div
                      key={msg.id}
                      onClick={() => handleOpenNotice(msg)}
                      className={`group relative flex items-center gap-2.5 sm:gap-3.5 px-3.5 sm:px-4 py-3 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#e8f0ef]'
                          : !isRead
                          ? 'bg-white font-bold hover:bg-[#faf8f4]'
                          : 'bg-[#faf8f4]/60 hover:bg-[#faf8f4] text-[#6f6a60]'
                      }`}
                    >
                      {/* 1. Selection Checkbox */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleSelectOne(msg.id, e)}
                        className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all border ${
                          isSelected
                            ? 'bg-[#1f5c5a] border-[#1f5c5a] text-white'
                            : 'border-[#d8d1c2] bg-white hover:border-[#1f5c5a] text-transparent'
                        }`}
                        title="Select"
                      >
                        <Check size={10} className="stroke-[3]" />
                      </button>

                      {/* 2. Star Toggle Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStarNotice(msg.id);
                        }}
                        className={`p-0.5 rounded transition-colors flex-shrink-0 ${
                          isStarred 
                            ? 'text-amber-500' 
                            : 'text-[#8c827a] hover:text-amber-500 opacity-40 group-hover:opacity-100'
                        }`}
                        title={isStarred ? 'Starred' : 'Star'}
                      >
                        <Star size={15} className={isStarred ? 'fill-amber-400 text-amber-500' : ''} />
                      </button>

                      {/* 3. Sender Avatar & Name */}
                      <div className="flex items-center gap-2 w-32 sm:w-44 flex-shrink-0">
                        <img
                          src={msg.creatorProfile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                          alt={msg.senderInfo}
                          className="w-5 h-5 rounded-full object-cover ring-1 ring-[#d8d1c2] flex-shrink-0"
                        />
                        <span className={`text-xs truncate block ${
                          !isRead ? 'font-black text-[#20262e]' : 'font-medium text-[#524e47]'
                        }`}>
                          {msg.senderInfo}
                        </span>
                      </div>

                      {/* 4. Subject + Snippet Preview (Exact Gmail Style) */}
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        {/* Category tag */}
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border flex-shrink-0 ${categoryBadge.bg}`}>
                          {categoryBadge.label}
                        </span>

                        <span className={`text-xs truncate ${
                          !isRead ? 'font-black text-[#20262e]' : 'font-semibold text-[#20262e]'
                        }`}>
                          {msg.title}
                        </span>

                        {msg.description && (
                          <span className="text-xs text-[#8c827a] font-normal truncate hidden sm:inline">
                            &ndash; {msg.description}
                          </span>
                        )}
                      </div>

                      {/* 5. Right Side: Date / Time Pill OR Hover Quick Action Buttons */}
                      <div className="flex items-center justify-end flex-shrink-0 ml-2">
                        {/* Date/Time (Shown normally) */}
                        <div className="group-hover:hidden text-[11px] text-[#6f6a60] font-medium whitespace-nowrap">
                          {formatDisplayDate(msg.date)}
                        </div>

                        {/* Quick Action Icons (Revealed on Hover) */}
                        <div className="hidden group-hover:flex items-center gap-1 bg-[#faf8f4] px-1 py-0.5 rounded-lg border border-[#e7e1d6] shadow-xs">
                          {isArchived ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                unarchiveNotice(msg.id);
                              }}
                              className="p-1 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                              title="Restore to Inbox"
                            >
                              <ArchiveRestore size={13} />
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                archiveNotice(msg.id);
                              }}
                              className="p-1 hover:text-[#1f5c5a] hover:bg-white rounded transition-colors"
                              title="Archive"
                            >
                              <Archive size={13} />
                            </button>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isRead) markNoticeAsUnread(msg.id);
                              else markNoticeAsRead(msg.id);
                            }}
                            className="p-1 hover:text-[#1f5c5a] hover:bg-white rounded transition-colors"
                            title={isRead ? 'Mark as Unread' : 'Mark as Read'}
                          >
                            {isRead ? <Mail size={13} /> : <MailOpen size={13} />}
                          </button>

                          {(isAdmin || msg.createdBy === currentUser?.id) && (
                            <button
                              onClick={(e) => handleDeleteNotice(msg, e)}
                              className="p-1 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating Compose Notice Modal (Exact Gmail Bottom-Right Compose) */}
      <ComposeNoticeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
      />

      {/* Event Modal for Calendar Schedule */}
      <CreateEventModal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        defaultDate={todayStr}
      />
    </div>
  );
}
