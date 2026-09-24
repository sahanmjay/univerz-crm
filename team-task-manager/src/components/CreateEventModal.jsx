import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar as CalendarIcon, 
  User, 
  Tag, 
  Clock, 
  AlignLeft, 
  Users, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Check
} from 'lucide-react';
import { useTasks } from '../context/TaskContext';
import { getDepartmentBadge } from '../lib/demoData';
import { toDateStringOnly, parseLocalDate } from '../lib/dateUtils';

export default function CreateEventModal({ isOpen, onClose, editingEvent = null, defaultDate = null }) {
  const { 
    createCalendarEvent, 
    updateCalendarEvent, 
    deleteCalendarEvent, 
    saveDailyRoster,
    profiles, 
    currentUser, 
    isAdmin 
  } = useTasks();

  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState('meeting');
  const [userIds, setUserIds] = useState([]); // Array of selected profile IDs
  const [isAllDay, setIsAllDay] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('10:00');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('approved');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Format date helper (YYYY-MM-DD) without timezone drift
  const formatDateForInput = (d) => {
    if (!d) return '';
    return toDateStringOnly(d);
  };

  // Format time helper (HH:mm)
  const formatTimeForInput = (d) => {
    if (!d) return '09:00';
    try {
      if (typeof d === 'string' && d.includes('T')) {
        const timePart = d.split('T')[1]?.slice(0, 5);
        if (timePart && timePart.length === 5) return timePart;
      }
      const dateObj = parseLocalDate(d);
      if (!dateObj) return '09:00';
      const hours = String(dateObj.getHours()).padStart(2, '0');
      const minutes = String(dateObj.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch {
      return '09:00';
    }
  };

  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      if (editingEvent) {
        // Edit mode
        setTitle(editingEvent.title || '');
        setEventType(editingEvent.type || editingEvent.event_type || 'meeting');
        
        let initialUserIds = [];
        if (Array.isArray(editingEvent.user_ids) && editingEvent.user_ids.length > 0) {
          initialUserIds = editingEvent.user_ids;
        } else if (editingEvent.member_id) {
          initialUserIds = [editingEvent.member_id];
        } else if (editingEvent.assignee_id) {
          initialUserIds = [editingEvent.assignee_id];
        }
        setUserIds(initialUserIds);

        setIsAllDay(editingEvent.all_day ?? true);
        setStartDate(formatDateForInput(editingEvent.start_date || editingEvent.date));
        setStartTime(formatTimeForInput(editingEvent.start_date || editingEvent.date));
        setEndDate(formatDateForInput(editingEvent.end_date) || '');
        setEndTime(formatTimeForInput(editingEvent.end_date));
        setDescription(editingEvent.description || editingEvent.notes || '');
        setStatus(editingEvent.status || 'approved');
      } else {
        // Create mode
        const initialDateStr = defaultDate ? formatDateForInput(defaultDate) : formatDateForInput(new Date());
        setTitle('');
        const defaultType = isAdmin ? 'meeting' : 'leave';
        setEventType(defaultType);
        
        if (defaultType === 'leave') {
          setUserIds(currentUser?.id ? [currentUser.id] : []);
        } else {
          setUserIds([]); // Empty means "Entire Team"
        }

        setIsAllDay(true);
        setStartDate(initialDateStr);
        setStartTime('09:00');
        setEndDate('');
        setEndTime('10:00');
        setDescription('');
        setStatus(isAdmin ? 'approved' : 'pending');
      }
    }
  }, [isOpen, editingEvent, defaultDate, isAdmin, currentUser]);

  // When switching event type
  const handleTypeChange = (newType) => {
    setEventType(newType);
    if (newType === 'leave') {
      if (userIds.length === 0) {
        setUserIds(currentUser?.id ? [currentUser.id] : (profiles[0] ? [profiles[0].id] : []));
      }
    } else if (newType === 'holiday') {
      setUserIds([]); // Entire company for holidays
    }
  };

  // Toggle individual member
  const toggleMember = (id) => {
    if (userIds.includes(id)) {
      setUserIds(userIds.filter(uid => uid !== id));
    } else {
      setUserIds([...userIds, id]);
    }
  };

  // Select all or clear
  const toggleSelectAll = () => {
    if (userIds.length === profiles.length) {
      setUserIds([]);
    } else {
      setUserIds(profiles.map(p => p.id));
    }
  };

  const isAllSelected = profiles.length > 0 && userIds.length === profiles.length;
  const isEntireTeam = userIds.length === 0 || isAllSelected;

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (eventType !== 'roster' && !title.trim()) {
      setErrorMessage('Please enter an event title.');
      return;
    }

    if (!startDate) {
      setErrorMessage('Please select a start date.');
      return;
    }

    if (eventType === 'leave' && userIds.length === 0) {
      setErrorMessage('Please select at least one team member for the leave.');
      return;
    }

    try {
      setIsSubmitting(true);

      // Build start & end date strings without timezone shifts
      const startVal = isAllDay 
        ? startDate 
        : `${startDate}T${startTime || '00:00'}:00`;

      const endVal = endDate 
        ? (isAllDay ? endDate : `${endDate}T${endTime || '23:59'}:00`)
        : null;

      const selectedProfiles = profiles.filter(p => userIds.includes(p.id));
      const memberNames = selectedProfiles.map(p => p.full_name || p.username).join(', ');

      const finalMemberIds = userIds.length > 0 ? userIds : profiles.map(p => p.id);
      const autoTitle = title.trim() || (
        finalMemberIds.length === profiles.length 
          ? 'Full Team Duty Roster' 
          : `${finalMemberIds.length} Members On Duty`
      );

      const payload = {
        title: eventType === 'roster' ? autoTitle : title.trim(),
        event_type: eventType,
        user_ids: userIds,
        member_id: userIds.length === 1 ? userIds[0] : null,
        member_name: userIds.length === 1 ? (selectedProfiles[0]?.full_name || selectedProfiles[0]?.username) : (memberNames || null),
        start_date: startVal,
        end_date: endVal,
        all_day: isAllDay,
        description: description.trim() || null,
        status: !isAdmin && eventType === 'leave' ? 'pending' : (status || 'approved'),
      };

      // If Duty Roster, sync directly to public.work_roster
      if (eventType === 'roster' && saveDailyRoster) {
        await saveDailyRoster(startDate, finalMemberIds, description);
      }

      if (editingEvent?.id) {
        await updateCalendarEvent(editingEvent.id, payload);
      } else {
        await createCalendarEvent(payload);
      }

      setIsSubmitting(false);
      onClose();
    } catch (err) {
      console.error('Error saving calendar event:', err);
      setErrorMessage(err.message || 'Failed to save event. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingEvent?.id) return;
    if (window.confirm(`Are you sure you want to remove "${editingEvent.title}" from the calendar?`)) {
      try {
        setIsSubmitting(true);
        await deleteCalendarEvent(editingEvent.id);
        setIsSubmitting(false);
        onClose();
      } catch (err) {
        console.error('Error deleting calendar event:', err);
        setErrorMessage(err.message || 'Failed to delete event.');
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div 
        className="w-full max-w-lg bg-white border border-[#e7e1d6] rounded-3xl shadow-2xl overflow-hidden animate-scale-up relative my-8"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-[#e7e1d6] bg-[#faf8f4] flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs ${
              eventType === 'roster' ? 'bg-[#e6f0e8] border-[#c2dfc8] text-[#2e6930]' :
              eventType === 'leave' ? 'bg-[#f7e7e1] border-[#f0cac0] text-[#a82e2e]' :
              eventType === 'meeting' ? 'bg-[#e8f0ef] border-[#a3c7c4] text-[#1f5c5a]' :
              eventType === 'holiday' ? 'bg-[#f4ecd9] border-[#e5d2ac] text-[#855b14]' :
              'bg-[#f1e8f8] border-[#dec8f0] text-[#6b21a8]'
            }`}>
              <CalendarIcon size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#20262e]">
                {editingEvent ? 'Edit Calendar Event' : (isAdmin ? 'Add Event / Notice' : 'Request Leave')}
              </h2>
              <p className="text-[11px] text-[#6f6a60]">
                Target audience &amp; schedule dispatch
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 text-[#6f6a60] hover:text-[#20262e] bg-[#f3f0e9] hover:bg-[#e7e1d6] rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {/* 1. Title (Hidden/Optional when Daily Roster is selected) */}
          {eventType !== 'roster' ? (
            <div>
              <label className="block text-xs font-bold text-[#20262e] mb-1.5 flex items-center gap-1.5">
                <Tag size={13} className="text-[#1f5c5a]" /> Title / Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required={eventType !== 'roster'}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  eventType === 'leave' ? 'e.g. Sahan Annual Leave / Medical Off' :
                  eventType === 'meeting' ? 'e.g. Weekly Sync Meeting / Client Briefing' :
                  eventType === 'holiday' ? 'e.g. Full Moon Poya Day / Christmas' :
                  'e.g. Monthly KPI Review / Audit Reminder'
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#d8d1c2] text-xs text-[#20262e] placeholder:text-[#8c827a] focus:border-[#1f5c5a] focus:ring-1 focus:ring-[#1f5c5a] transition-all font-semibold"
              />
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Daily Duty Roster
                </span>
                <span className="text-[#6f6a60] text-[11px] font-medium">
                  (No title required — auto-assigned from selected staff)
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Auto-Titled
              </span>
            </div>
          )}

          {/* 2. Event Type */}
          <div>
            <label className="block text-xs font-bold text-[#20262e] mb-1.5 flex items-center gap-1.5">
              <Tag size={13} className="text-[#1f5c5a]" /> Event Type <span className="text-rose-500">*</span>
            </label>
            {isAdmin ? (
              <select
                value={eventType}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#d8d1c2] text-xs text-[#20262e] font-bold focus:border-[#1f5c5a] focus:ring-1 focus:ring-[#1f5c5a] transition-all cursor-pointer shadow-xs"
              >
                <option value="meeting" className="bg-white text-[#20262e] font-bold py-2">🔵 Scheduled Meetings</option>
                <option value="roster" className="bg-white text-[#20262e] font-bold py-2">🟢 Daily Duty Roster</option>
                <option value="leave" className="bg-white text-[#20262e] font-bold py-2">🔴 Approved Leaves</option>
                <option value="holiday" className="bg-white text-[#20262e] font-bold py-2">🟡 Company Holidays</option>
                <option value="reminder" className="bg-white text-[#20262e] font-bold py-2">🟣 Special Reminders</option>
              </select>
            ) : (
              <div className="px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Leave Request
              </div>
            )}
          </div>

          {/* 3. MULTI-SELECT MEMBER SELECTOR */}
          <div>
          {/* 3. MULTI-SELECT MEMBER / TARGET AUDIENCE SELECTOR */}
          <div className="rounded-2xl p-4 bg-[#faf8f4] border border-[#e7e1d6] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-[#20262e] flex items-center gap-1.5">
                <Users size={14} className="text-[#1f5c5a]" /> Send To / Target Audience <span className="text-rose-500">*</span>
              </label>

              {isAdmin && eventType !== 'leave' && userIds.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-[11px] font-bold text-[#1f5c5a] hover:underline transition-colors"
                >
                  {isAllSelected ? 'Clear All' : 'Select All 6 Members'}
                </button>
              )}
            </div>

            {isAdmin ? (
              <div className="space-y-3">
                {/* Target Mode Quick Options */}
                {eventType !== 'leave' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Option 1: Everyone (All 6 Members) */}
                    <button
                      type="button"
                      onClick={() => setUserIds([])}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                        userIds.length === 0
                          ? 'bg-[#e8f0ef] border-[#1f5c5a] text-[#1f5c5a] ring-2 ring-[#1f5c5a]/20 shadow-xs'
                          : 'bg-white border-[#d8d1c2] hover:bg-[#f3f0e9] text-[#6f6a60]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                          userIds.length === 0 ? 'bg-[#1f5c5a] text-white' : 'bg-[#e7e1d6] text-[#20262e]'
                        }`}>
                          👥
                        </div>
                        <div>
                          <span className="text-xs font-black text-[#20262e] block">
                            Option 1: Everyone
                          </span>
                          <span className="text-[10px] text-[#6f6a60] font-medium">
                            All 6 Members
                          </span>
                        </div>
                      </div>

                      {userIds.length === 0 && (
                        <div className="w-5 h-5 rounded-full bg-[#1f5c5a] text-white flex items-center justify-center">
                          <Check size={12} className="stroke-[3]" />
                        </div>
                      )}
                    </button>

                    {/* Option 2: Specific Members Indicator */}
                    <button
                      type="button"
                      onClick={() => {
                        if (userIds.length === 0) {
                          setUserIds(profiles[0] ? [profiles[0].id] : []);
                        }
                      }}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                        userIds.length > 0
                          ? 'bg-[#e8f0ef] border-[#1f5c5a] text-[#1f5c5a] ring-2 ring-[#1f5c5a]/20 shadow-xs'
                          : 'bg-white border-[#d8d1c2] hover:bg-[#f3f0e9] text-[#6f6a60]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                          userIds.length > 0 ? 'bg-[#1f5c5a] text-white' : 'bg-[#e7e1d6] text-[#20262e]'
                        }`}>
                          🎯
                        </div>
                        <div>
                          <span className="text-xs font-black text-[#20262e] block">
                            Option 2: Specific Members
                          </span>
                          <span className="text-[10px] text-[#6f6a60] font-medium">
                            {userIds.length > 0 ? `${userIds.length} Selected` : 'Multi-Select'}
                          </span>
                        </div>
                      </div>

                      {userIds.length > 0 && (
                        <div className="w-5 h-5 rounded-full bg-[#1f5c5a] text-white flex items-center justify-center">
                          <Check size={12} className="stroke-[3]" />
                        </div>
                      )}
                    </button>
                  </div>
                )}

                {/* Grid of Team Members (Multi-Select) */}
                {(eventType === 'leave' || userIds.length > 0) && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-bold text-[#6f6a60] flex items-center justify-between">
                      <span>Select individual team members:</span>
                      <span className="text-[#1f5c5a]">{userIds.length} of {profiles.length} selected</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {profiles.map(p => {
                        const isSelected = userIds.includes(p.id);

                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => toggleMember(p.id)}
                            className={`flex items-center justify-between p-2 rounded-xl border transition-all text-left group ${
                              isSelected
                                ? 'bg-white border-[#1f5c5a] ring-1 ring-[#1f5c5a] shadow-xs'
                                : 'bg-white border-[#d8d1c2] hover:border-[#1f5c5a]/50 text-[#20262e]'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={p.avatar_url}
                                alt={p.full_name}
                                className="w-7 h-7 rounded-full object-cover ring-1 ring-[#d8d1c2] flex-shrink-0"
                              />
                              <div className="min-w-0">
                                <span className="text-xs font-bold truncate block text-[#20262e]">
                                  {p.full_name || p.username}
                                </span>
                                <span className="text-[10px] text-[#6f6a60] truncate block">
                                  {p.department}
                                </span>
                              </div>
                            </div>

                            <div className={`w-4 h-4 rounded-md flex items-center justify-center transition-colors flex-shrink-0 ${
                              isSelected
                                ? 'bg-[#1f5c5a] text-white'
                                : 'border border-[#d8d1c2] bg-[#faf8f4] group-hover:border-[#1f5c5a]'
                            }`}>
                              {isSelected && <Check size={11} className="stroke-[3]" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Non-Admin view: Locked to Current User */
              <div className="p-2.5 rounded-xl bg-white border border-[#d8d1c2] flex items-center gap-2.5">
                <img 
                  src={currentUser?.avatar_url} 
                  alt={currentUser?.full_name} 
                  className="w-7 h-7 rounded-full object-cover" 
                />
                <div>
                  <span className="text-xs font-bold text-[#20262e] block">
                    {currentUser?.full_name || currentUser?.username} (You)
                  </span>
                  <span className="text-[10px] text-[#6f6a60]">
                    {currentUser?.department} &bull; {currentUser?.role}
                  </span>
                </div>
              </div>
            )}
          </div>
          </div>

          {/* 4. All Day Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#faf8f4] border border-[#e7e1d6]">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-[#1f5c5a]" />
              <span className="text-xs font-bold text-[#20262e]">All-Day Event</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isAllDay}
                onChange={(e) => setIsAllDay(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-[#d8d1c2] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1f5c5a]"></div>
            </label>
          </div>

          {/* 5. Start & End Dates / Times */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Start Date & Time */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#20262e] flex items-center gap-1.5">
                <CalendarIcon size={13} className="text-[#1f5c5a]" /> Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#d8d1c2] text-xs text-[#20262e] font-semibold focus:border-[#1f5c5a] focus:ring-1 focus:ring-[#1f5c5a] transition-all"
              />
              {!isAllDay && (
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#d8d1c2] text-xs text-[#20262e] font-semibold focus:border-[#1f5c5a] focus:ring-1 focus:ring-[#1f5c5a] transition-all"
                />
              )}
            </div>

            {/* End Date & Time */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#20262e] flex items-center gap-1.5">
                <CalendarIcon size={13} className="text-[#1f5c5a]" /> End Date <span className="text-[#6f6a60] font-normal">(Optional)</span>
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="Same as start date"
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#d8d1c2] text-xs text-[#20262e] font-semibold focus:border-[#1f5c5a] focus:ring-1 focus:ring-[#1f5c5a] transition-all"
              />
              {!isAllDay && (
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#d8d1c2] text-xs text-[#20262e] font-semibold focus:border-[#1f5c5a] focus:ring-1 focus:ring-[#1f5c5a] transition-all"
                />
              )}
            </div>
          </div>

          {/* 6. Description / Notes */}
          <div>
            <label className="block text-xs font-bold text-[#20262e] mb-1.5 flex items-center gap-1.5">
              <AlignLeft size={13} className="text-[#1f5c5a]" /> Description / Instructions
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notice details, agenda, links, or instructions for the team..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#d8d1c2] text-xs text-[#20262e] placeholder:text-[#8c827a] focus:border-[#1f5c5a] focus:ring-1 focus:ring-[#1f5c5a] transition-all resize-none font-medium"
            />
          </div>

          {/* 7. Leave Status (For Admins Editing Leaves) */}
          {isAdmin && eventType === 'leave' && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#faf8f4] border border-[#e7e1d6]">
              <span className="text-xs font-bold text-[#20262e]">Approval Status</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStatus('approved')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    status === 'approved' 
                      ? 'bg-[#1f5c5a] text-white shadow-xs' 
                      : 'bg-white border border-[#d8d1c2] text-[#6f6a60] hover:text-[#20262e]'
                  }`}
                >
                  Approved
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('pending')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    status === 'pending' 
                      ? 'bg-[#f4ecd9] border border-[#e5d2ac] text-[#855b14] font-bold shadow-xs' 
                      : 'bg-white border border-[#d8d1c2] text-[#6f6a60] hover:text-[#20262e]'
                  }`}
                >
                  Pending
                </button>
              </div>
            </div>
          )}

          {/* Actions Button Row */}
          <div className="pt-3 flex items-center gap-3">
            {editingEvent && (isAdmin || editingEvent.created_by === currentUser?.id) && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-[#f7e7e1] hover:bg-[#f0cac0] border border-[#f0cac0] text-[#a82e2e] text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Trash2 size={15} />
                <span>Delete</span>
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl bg-[#1f5c5a] hover:bg-[#174644] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={16} />
              <span>
                {isSubmitting
                  ? 'Saving to Supabase...'
                  : editingEvent
                  ? 'Update Event'
                  : isAdmin
                  ? 'Dispatch Notice / Add to Calendar'
                  : 'Submit Leave Request'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
