import React, { useState } from 'react';
import { useTasks } from '../context/TaskContext';
import { 
  X, 
  Minus, 
  Maximize2, 
  Minimize2, 
  Send, 
  Trash2, 
  Users, 
  Tag, 
  AlertCircle, 
  Sparkles, 
  Check, 
  Paperclip,
  Smile,
  List,
  Bold,
  Italic,
  Link2,
  BellRing
} from 'lucide-react';
import { getDepartmentBadge } from '../lib/demoData';

export default function ComposeNoticeModal({ isOpen, onClose, defaultRecipientId = null }) {
  const { 
    currentUser, 
    profiles, 
    createCalendarEvent 
  } = useTasks();

  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('general'); // 'hr_notice' | 'urgent' | 'task_alert' | 'general'
  const [selectedUserIds, setSelectedUserIds] = useState(defaultRecipientId ? [defaultRecipientId] : []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const isEveryone = selectedUserIds.length === 0;

  const toggleSelectMember = (id) => {
    if (selectedUserIds.includes(id)) {
      setSelectedUserIds(selectedUserIds.filter(uid => uid !== id));
    } else {
      setSelectedUserIds([...selectedUserIds, id]);
    }
  };

  const handleSelectEveryone = () => {
    setSelectedUserIds([]);
  };

  const handleSelectAllIndividual = () => {
    setSelectedUserIds(profiles.map(p => p.id));
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('Please enter a subject for the notice.');
      return;
    }

    try {
      setIsSubmitting(true);

      const targetProfiles = profiles.filter(p => selectedUserIds.includes(p.id));
      const targetNames = targetProfiles.map(p => p.full_name || p.username).join(', ');

      const payload = {
        title: title.trim(),
        description: body.trim(),
        event_type: 'reminder',
        user_ids: selectedUserIds,
        member_id: selectedUserIds.length === 1 ? selectedUserIds[0] : null,
        member_name: selectedUserIds.length === 1 ? (targetProfiles[0]?.full_name || targetProfiles[0]?.username) : (targetNames || null),
        start_date: new Date().toISOString(),
        all_day: true,
        status: 'approved',
        created_by: currentUser?.id || null
      };

      await createCalendarEvent(payload);

      setIsSubmitting(false);
      setTitle('');
      setBody('');
      setSelectedUserIds([]);
      onClose();
    } catch (err) {
      console.error('Error sending team notice:', err);
      setErrorMsg(err.message || 'Failed to dispatch notice. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleDiscard = () => {
    if (title.trim() || body.trim()) {
      if (window.confirm('Discard this draft notice?')) {
        setTitle('');
        setBody('');
        setSelectedUserIds([]);
        onClose();
      }
    } else {
      onClose();
    }
  };

  // Minimized Floating Pill View
  if (isMinimized) {
    return (
      <div className="fixed bottom-0 right-4 sm:right-8 z-50 bg-[#1f5c5a] text-white px-4 py-2.5 rounded-t-xl shadow-2xl flex items-center gap-3 border border-[#174644] cursor-pointer hover:bg-[#174644] transition-all">
        <div className="flex items-center gap-2" onClick={() => setIsMinimized(false)}>
          <BellRing size={16} className="text-amber-300 animate-pulse" />
          <span className="text-xs font-bold max-w-[220px] truncate">
            {title.trim() ? title : 'New Notice Draft'}
          </span>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={() => setIsMinimized(false)}
            className="p-1 hover:bg-white/20 rounded-md transition-colors"
            title="Expand"
          >
            <Maximize2 size={13} />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-rose-500 rounded-md transition-colors"
            title="Close"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    );
  }

  // Full Floating Compose Window (Exact Gmail Feel)
  return (
    <div 
      className={`fixed z-50 bg-white shadow-2xl border border-[#d8d1c2] flex flex-col transition-all duration-200 overflow-hidden ${
        isMaximized
          ? 'inset-4 sm:inset-10 rounded-2xl'
          : 'bottom-0 right-2 sm:right-8 w-[96vw] sm:w-[560px] max-h-[85vh] rounded-t-2xl'
      }`}
    >
      {/* Header Bar */}
      <div className="bg-[#1f5c5a] text-white px-4 py-2.5 flex items-center justify-between select-none">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-black tracking-wide truncate">
            {title.trim() ? title : 'New Team Notice / Message'}
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-white/20 text-[#e8f0ef]">
            By {currentUser?.full_name?.split(' ')[0] || currentUser?.username || 'You'}
          </span>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="p-1 text-white/80 hover:text-white hover:bg-white/15 rounded-md transition-colors"
            title="Minimize"
          >
            <Minus size={14} />
          </button>

          <button
            type="button"
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1 text-white/80 hover:text-white hover:bg-white/15 rounded-md transition-colors hidden sm:block"
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-white/80 hover:text-white hover:bg-rose-600 rounded-md transition-colors"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="px-4 py-2 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
          <AlertCircle size={14} className="flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form Content */}
      <form onSubmit={handleSend} className="flex-1 flex flex-col min-h-0 bg-white">
        {/* 1. "To / Send To" Field */}
        <div className="border-b border-[#e7e1d6] px-4 py-2.5 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#6f6a60] w-8">To:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSelectEveryone}
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                    isEveryone
                      ? 'bg-[#1f5c5a] text-white shadow-xs'
                      : 'bg-[#faf8f4] text-[#6f6a60] hover:text-[#20262e] border border-[#e7e1d6]'
                  }`}
                >
                  <span>👥 Everyone (All 6 Members)</span>
                  {isEveryone && <Check size={12} className="stroke-[3]" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (isEveryone) {
                      setSelectedUserIds(profiles[0] ? [profiles[0].id] : []);
                    }
                  }}
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                    !isEveryone
                      ? 'bg-[#1f5c5a] text-white shadow-xs'
                      : 'bg-[#faf8f4] text-[#6f6a60] hover:text-[#20262e] border border-[#e7e1d6]'
                  }`}
                >
                  <span>🎯 Specific Members ({selectedUserIds.length})</span>
                  {!isEveryone && <Check size={12} className="stroke-[3]" />}
                </button>
              </div>
            </div>

            {!isEveryone && (
              <button
                type="button"
                onClick={handleSelectAllIndividual}
                className="text-[11px] font-bold text-[#1f5c5a] hover:underline"
              >
                Select All
              </button>
            )}
          </div>

          {/* Member Chips for Multi-Select */}
          {!isEveryone && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {profiles.map(p => {
                const isSelected = selectedUserIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleSelectMember(p.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all border ${
                      isSelected
                        ? 'bg-[#e8f0ef] border-[#1f5c5a] text-[#1f5c5a] ring-1 ring-[#1f5c5a]'
                        : 'bg-[#faf8f4] border-[#d8d1c2] text-[#6f6a60] hover:border-[#1f5c5a]'
                    }`}
                  >
                    <img 
                      src={p.avatar_url} 
                      alt={p.full_name} 
                      className="w-4 h-4 rounded-full object-cover" 
                    />
                    <span>{p.full_name || p.username}</span>
                    {isSelected ? (
                      <Check size={11} className="stroke-[3] text-[#1f5c5a]" />
                    ) : (
                      <span className="text-[10px] text-[#8c827a] font-normal">({p.department})</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Category & Notice Type Selector */}
        <div className="border-b border-[#e7e1d6] px-4 py-2 flex items-center gap-2 flex-wrap text-xs">
          <span className="text-xs font-bold text-[#6f6a60] w-8">Type:</span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCategory('general')}
              className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition-colors ${
                category === 'general' ? 'bg-[#1f5c5a] text-white' : 'bg-[#faf8f4] text-[#6f6a60] hover:text-[#20262e] border border-[#e7e1d6]'
              }`}
            >
              🟢 General Notice
            </button>
            <button
              type="button"
              onClick={() => setCategory('hr_notice')}
              className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition-colors ${
                category === 'hr_notice' ? 'bg-[#6b21a8] text-white' : 'bg-[#faf8f4] text-[#6f6a60] hover:text-[#6b21a8] border border-[#e7e1d6]'
              }`}
            >
              🟣 HR Direct Notice
            </button>
            <button
              type="button"
              onClick={() => setCategory('urgent')}
              className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition-colors ${
                category === 'urgent' ? 'bg-[#a82e2e] text-white' : 'bg-[#faf8f4] text-[#6f6a60] hover:text-[#a82e2e] border border-[#e7e1d6]'
              }`}
            >
              🔴 Urgent Alert
            </button>
            <button
              type="button"
              onClick={() => setCategory('task_alert')}
              className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition-colors ${
                category === 'task_alert' ? 'bg-[#855b14] text-white' : 'bg-[#faf8f4] text-[#6f6a60] hover:text-[#855b14] border border-[#e7e1d6]'
              }`}
            >
              ⏰ Task / Meeting Sync
            </button>
          </div>
        </div>

        {/* 3. Subject Input */}
        <div className="border-b border-[#e7e1d6] px-4 py-2">
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Subject / Notice Heading"
            className="w-full text-xs font-bold text-[#20262e] placeholder:text-[#8c827a] outline-none border-none bg-transparent"
          />
        </div>

        {/* 4. Message Body */}
        <div className="flex-1 p-4 min-h-[160px] flex flex-col">
          <textarea
            rows={isMaximized ? 12 : 7}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message, kickoff instructions, links, or team update here..."
            className="w-full flex-1 text-xs text-[#20262e] placeholder:text-[#8c827a] outline-none border-none bg-transparent resize-none font-medium leading-relaxed"
          />
        </div>

        {/* 5. Bottom Action & Formatting Toolbar */}
        <div className="border-t border-[#e7e1d6] px-4 py-3 bg-[#faf8f4] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Primary Send Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#1f5c5a] hover:bg-[#174644] text-white text-xs font-bold transition-all shadow-sm hover:scale-[1.01] active:scale-[0.98]"
            >
              <Send size={14} />
              <span>{isSubmitting ? 'Sending Notice...' : 'Send Notice'}</span>
            </button>

            {/* Formatting helper icons */}
            <div className="flex items-center gap-1 text-[#6f6a60]">
              <button
                type="button"
                onClick={() => setBody(prev => prev + '\n• ')}
                className="p-1.5 hover:bg-[#e7e1d6] rounded-lg transition-colors"
                title="Add Bullet Point"
              >
                <List size={14} />
              </button>
              <button
                type="button"
                onClick={() => setBody(prev => prev + ' 🔗 ')}
                className="p-1.5 hover:bg-[#e7e1d6] rounded-lg transition-colors"
                title="Insert Link Icon"
              >
                <Link2 size={14} />
              </button>
              <button
                type="button"
                onClick={() => setBody(prev => prev + ' ✨ ')}
                className="p-1.5 hover:bg-[#e7e1d6] rounded-lg transition-colors"
                title="Add Sparkle Emoji"
              >
                <Smile size={14} />
              </button>
            </div>
          </div>

          {/* Discard Trash */}
          <button
            type="button"
            onClick={handleDiscard}
            className="p-2 text-[#6f6a60] hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
            title="Discard draft"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
