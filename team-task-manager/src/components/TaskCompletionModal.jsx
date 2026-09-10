import React, { useState } from 'react';
import { CheckCircle2, MessageSquare, X, Sparkles, Clock, User } from 'lucide-react';
import { useTasks } from '../context/TaskContext';

export default function TaskCompletionModal({ task, isOpen, onClose, onConfirm }) {
  const [note, setNote] = useState(task?.completion_note || '');
  const { profiles } = useTasks();

  if (!isOpen || !task) return null;

  const isCurrentlyCompleted = task.status === 'completed';
  const assignedProfile = profiles.find((p) => 
    p.id === task.assigned_to || 
    p.full_name?.toLowerCase() === task.assigned_to?.toLowerCase() ||
    p.username?.toLowerCase() === task.assigned_to?.toLowerCase() ||
    task.assigned_to?.toLowerCase().includes(p.username?.toLowerCase()) ||
    task.assigned_to?.toLowerCase().includes(p.full_name?.toLowerCase())
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(note);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md rounded-2xl glass-panel border border-slate-700/80 shadow-2xl p-6 relative animate-slide-up">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <CheckCircle2 size={22} className="stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              {isCurrentlyCompleted ? 'Task Completion Note' : 'Complete Task & Add Note'}
            </h3>
            <p className="text-xs text-slate-400">
              {isCurrentlyCompleted ? 'Update or review completion details' : 'Mark task complete with optional handover details'}
            </p>
          </div>
        </div>

        {/* Task Summary Banner */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 mb-4">
          <div className="text-xs font-semibold text-slate-200 line-clamp-2">
            {task.title}
          </div>
          <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <User size={12} className="text-indigo-400" />
              {assignedProfile?.name || 'Unassigned'}
            </span>
            {task.completed_at && (
              <span className="flex items-center gap-1 text-emerald-400">
                <Clock size={12} />
                {new Date(task.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MessageSquare size={13} className="text-indigo-400" />
                Completion Note / Result (Optional)
              </span>
              <span className="text-[10px] text-slate-500">Visible to team</span>
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Code reviewed and merged into main branch, docs updated..."
              className="w-full rounded-xl glass-input p-3 text-xs placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 resize-none"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles size={13} />
              {isCurrentlyCompleted ? 'Save Note' : 'Complete Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
