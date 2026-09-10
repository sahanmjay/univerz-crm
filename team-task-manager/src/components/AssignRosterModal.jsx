import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar as CalendarIcon, 
  Users, 
  Check, 
  CheckCircle2, 
  Trash2, 
  AlertCircle, 
  Sparkles,
  Clock,
  ShieldCheck,
  UserCheck,
  UserX
} from 'lucide-react';
import { useTasks } from '../context/TaskContext';
import { toDateStringOnly, formatDisplayDate } from '../lib/dateUtils';

export default function AssignRosterModal({ 
  isOpen, 
  onClose, 
  selectedDate = null 
}) {
  const { 
    profiles, 
    workRosters, 
    saveDailyRoster, 
    deleteDailyRoster, 
    isAdmin 
  } = useTasks();

  const [date, setDate] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Sync date and load existing roster for selected date
  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setSuccessMessage('');
      const targetDate = selectedDate ? toDateStringOnly(selectedDate) : toDateStringOnly(new Date());
      setDate(targetDate);

      // Check if roster already exists for this date
      const existingRoster = workRosters.find(r => r.date === targetDate);
      if (existingRoster && Array.isArray(existingRoster.assigned_member_ids) && existingRoster.assigned_member_ids.length > 0) {
        setSelectedMemberIds(existingRoster.assigned_member_ids);
        setNotes(existingRoster.notes || '');
      } else {
        // 100% Manual: starts empty unless user clicks Select All or chooses members
        setSelectedMemberIds([]);
        setNotes('');
      }
    }
  }, [isOpen, selectedDate, workRosters, profiles]);

  // When date input changes, load that date's existing roster
  const handleDateChange = (newDateStr) => {
    setDate(newDateStr);
    const existingRoster = workRosters.find(r => r.date === newDateStr);
    if (existingRoster && Array.isArray(existingRoster.assigned_member_ids) && existingRoster.assigned_member_ids.length > 0) {
      setSelectedMemberIds(existingRoster.assigned_member_ids);
      setNotes(existingRoster.notes || '');
    } else {
      setSelectedMemberIds([]);
      setNotes('');
    }
  };

  // Toggle individual member
  const toggleMember = (id) => {
    if (selectedMemberIds.includes(id)) {
      setSelectedMemberIds(selectedMemberIds.filter(mid => mid !== id));
    } else {
      setSelectedMemberIds([...selectedMemberIds, id]);
    }
  };

  // Quick Action: Select All 6
  const selectAll = () => {
    setSelectedMemberIds(profiles.map(p => p.id));
  };

  // Quick Action: Clear
  const clearAll = () => {
    setSelectedMemberIds([]);
  };

  if (!isOpen) return null;

  const isFullTeam = profiles.length > 0 && selectedMemberIds.length === profiles.length;
  const onDutyCount = selectedMemberIds.length;
  const offDutyCount = profiles.length - onDutyCount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!date) {
      setErrorMessage('Please select a date.');
      return;
    }

    try {
      setIsSubmitting(true);
      await saveDailyRoster(date, selectedMemberIds, notes);
      setIsSubmitting(false);
      setSuccessMessage('Duty roster saved successfully!');
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err) {
      console.error('Error saving duty roster:', err);
      setErrorMessage(err.message || 'Failed to save duty roster.');
      setIsSubmitting(false);
    }
  };

  const handleClearRoster = async () => {
    if (!date) return;
    if (window.confirm(`Are you sure you want to remove the duty roster for ${formatDisplayDate(date)}?`)) {
      try {
        setIsSubmitting(true);
        await deleteDailyRoster(date);
        setIsSubmitting(false);
        onClose();
      } catch (err) {
        console.error('Error clearing duty roster:', err);
        setErrorMessage(err.message || 'Failed to clear duty roster.');
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
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-inner">
              <Users size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">Assign Daily Roster</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Duty Schedule
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Configure on-duty staff for <strong className="text-slate-200">{formatDisplayDate(date) || 'Selected Date'}</strong>
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

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 size={16} className="flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          
          {/* 1. Date Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <CalendarIcon size={13} className="text-emerald-400" /> Roster Date <span className="text-rose-400">*</span>
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
            />
          </div>

          {/* 2. Team Member Checkboxes Header & Quick Actions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-400" /> Select On-Duty Members
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                  isFullTeam 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                    : onDutyCount > 0 
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {isFullTeam ? '🟢 Full Team (6/6)' : `${onDutyCount} / ${profiles.length} On Duty`}
                </span>
              </label>

              {/* Quick Action Buttons: Select All (6) / Clear */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Select All ({profiles.length})
                </button>
                <span className="text-slate-600 text-xs">&bull;</span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[11px] font-bold text-slate-400 hover:text-rose-300 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Grid of all 6 team members */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
              {profiles.map(p => {
                const isOnDuty = selectedMemberIds.includes(p.id);

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleMember(p.id)}
                    className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all text-left group ${
                      isOnDuty
                        ? 'bg-emerald-950/30 border-emerald-500/50 text-white shadow-sm shadow-emerald-950/40 ring-1 ring-emerald-500/20'
                        : 'bg-slate-950/60 border-slate-800/90 hover:border-slate-700 text-slate-400 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative flex-shrink-0">
                        <img
                          src={p.avatar_url}
                          alt={p.full_name}
                          className={`w-7 h-7 rounded-full object-cover ring-1 ${
                            isOnDuty ? 'ring-emerald-500' : 'ring-slate-700'
                          }`}
                        />
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
                          isOnDuty ? 'bg-emerald-500' : 'bg-slate-600'
                        }`} />
                      </div>

                      <div className="min-w-0">
                        <span className={`text-xs font-bold truncate block ${
                          isOnDuty ? 'text-slate-100 group-hover:text-white' : 'text-slate-400'
                        }`}>
                          {p.full_name || p.username}
                        </span>
                        <span className="text-[10px] text-slate-500 truncate block">
                          {p.department}
                        </span>
                      </div>
                    </div>

                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${
                      isOnDuty
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                        : 'border border-slate-700 bg-slate-900 group-hover:border-slate-600'
                    }`}>
                      {isOnDuty && <Check size={13} className="stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Summary Pill */}
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <UserCheck size={14} /> {onDutyCount} Working
              </span>
              <span className="text-slate-600">&bull;</span>
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <UserX size={14} /> {offDutyCount} Off
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              {isFullTeam ? '🟢 Full Capacity' : onDutyCount >= 4 ? '🔵 Standard Shift' : '🟡 Partial Shift'}
            </span>
          </div>

          {/* 4. Notes (Optional) */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Shift Notes / Remarks <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Morning coverage, Saturday shift rotation, special assignment..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none font-medium"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={handleClearRoster}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Trash2 size={15} />
              <span>Reset Roster</span>
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold transition-all shadow-lg bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={16} />
              <span>{isSubmitting ? 'Saving to Database...' : 'Save Daily Roster'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
