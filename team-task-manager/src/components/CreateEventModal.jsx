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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div 
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-scale-up relative my-8"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-950/40 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              eventType === 'roster' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
              eventType === 'leave' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
              eventType === 'meeting' ? 'bg-sky-500/10 border-sky-500/30 text-sky-400' :
              eventType === 'holiday' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
              'bg-purple-500/10 border-purple-500/30 text-purple-400'
            }`}>
              <CalendarIcon size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                {editingEvent ? 'Edit Calendar Event' : (isAdmin ? 'Add Event / Leave' : 'Request Leave')}
              </h2>
              <p className="text-[11px] text-slate-400">
                Synchronized with <code className="text-indigo-300 font-mono">calendar_events.user_ids</code>
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
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
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Tag size={13} className="text-indigo-400" /> Title / Name <span className="text-rose-400">*</span>
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
              />
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Daily Duty Roster
                </span>
                <span className="text-slate-400 text-[11px] font-medium">
                  (No title required — auto-assigned from selected staff)
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Auto-Titled
              </span>
            </div>
          )}

          {/* 2. Event Type */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Tag size={13} className="text-indigo-400" /> Event Type <span className="text-rose-400">*</span>
            </label>
            {isAdmin ? (
              <select
                value={eventType}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium cursor-pointer"
              >
                <option value="meeting">🔵 Scheduled Meetings</option>
                <option value="roster">🟢 Daily Duty Roster</option>
                <option value="leave">🔴 Approved Leaves</option>
                <option value="holiday">🟡 Company Holidays</option>
                <option value="reminder">🟣 Special Reminders</option>
              </select>
            ) : (
              <div className="px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-rose-300 font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Leave Request
              </div>
            )}
          </div>

          {/* 3. MULTI-SELECT MEMBER SELECTOR */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Users size={13} className="text-indigo-400" /> For Team Members
                {userIds.length > 0 ? (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                    {userIds.length} selected
                  </span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                    Entire Team
                  </span>
                )}
              </label>

              {isAdmin && eventType !== 'leave' && (
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  {isEntireTeam && userIds.length === 0 ? 'Select Individual Members' : isAllSelected ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            {isAdmin ? (
              <div className="space-y-2">
                {/* Entire Team Quick Option (for meetings/holidays/reminders) */}
                {eventType !== 'leave' && (
                  <button
                    type="button"
                    onClick={() => setUserIds([])}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left ${
                      userIds.length === 0
                        ? 'bg-indigo-600/15 border-indigo-500/50 text-white'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-900 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-xs font-bold">
                        👥
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-200 block">
                          Entire Team (All Members)
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Applies to company-wide schedule
                        </span>
                      </div>
                    </div>

                    {userIds.length === 0 && (
                      <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                        <Check size={12} className="stroke-[3]" />
                      </div>
                    )}
                  </button>
                )}

                {/* Grid of Team Members */}
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
                            ? 'bg-indigo-600/20 border-indigo-500/50 text-white'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={p.avatar_url}
                            alt={p.full_name}
                            className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-700 flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-bold truncate block text-slate-200 group-hover:text-white">
                              {p.full_name || p.username}
                            </span>
                            <span className="text-[9px] text-slate-500 truncate block">
                              {p.department}
                            </span>
                          </div>
                        </div>

                        <div className={`w-4 h-4 rounded-md flex items-center justify-center transition-colors flex-shrink-0 ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'border border-slate-700 bg-slate-900 group-hover:border-slate-600'
                        }`}>
                          {isSelected && <Check size={11} className="stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Non-Admin view: Locked to Current User */
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-2.5">
                <img 
                  src={currentUser?.avatar_url} 
                  alt={currentUser?.full_name} 
                  className="w-7 h-7 rounded-full object-cover" 
                />
                <div>
                  <span className="text-xs font-bold text-slate-200 block">
                    {currentUser?.full_name || currentUser?.username} (You)
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {currentUser?.department} &bull; {currentUser?.role}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 4. All Day Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-slate-400" />
              <span className="text-xs font-semibold text-slate-300">All-Day Event</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isAllDay}
                onChange={(e) => setIsAllDay(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* 5. Start & End Dates / Times */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Start Date & Time */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <CalendarIcon size={13} className="text-indigo-400" /> Start Date <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
              />
              {!isAllDay && (
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                />
              )}
            </div>

            {/* End Date & Time */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <CalendarIcon size={13} className="text-indigo-400" /> End Date <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="Same as start date"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
              />
              {!isAllDay && (
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                />
              )}
            </div>
          </div>

          {/* 6. Description / Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <AlignLeft size={13} className="text-indigo-400" /> Description / Notes
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add agenda, meeting link, leave reason, or additional details..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none font-medium"
            />
          </div>

          {/* 7. Leave Status (For Admins Editing Leaves) */}
          {isAdmin && eventType === 'leave' && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-xs font-bold text-slate-300">Approval Status</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStatus('approved')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    status === 'approved' 
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Approved
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('pending')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    status === 'pending' 
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' 
                      : 'bg-slate-800 text-slate-400 hover:text-white'
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
                className="px-4 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Trash2 size={15} />
                <span>Delete</span>
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 py-3 rounded-xl text-white text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${
                eventType === 'leave'
                  ? 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 shadow-rose-500/20'
                  : eventType === 'meeting'
                  ? 'bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 shadow-sky-500/20'
                  : eventType === 'holiday'
                  ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 shadow-amber-500/20'
                  : 'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 shadow-purple-500/20'
              }`}
            >
              <CheckCircle2 size={16} />
              <span>
                {isSubmitting
                  ? 'Saving to Supabase...'
                  : editingEvent
                  ? 'Update Event'
                  : isAdmin
                  ? 'Add to Calendar'
                  : 'Submit Leave Request'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
