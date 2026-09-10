import React, { useState, useRef, useEffect } from 'react';
import { useTasks } from '../context/TaskContext';
import { ChevronDown, Check, ShieldCheck, User, Users } from 'lucide-react';

export default function UserSwitcher() {
  const { profiles, currentUser, setCurrentUser } = useTasks();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Switcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/70 transition-all text-left group shadow-sm hover:border-indigo-500/50"
        title="Switch active user view"
      >
        <div className="relative">
          <img
            src={currentUser?.avatar_url}
            alt={currentUser?.name}
            className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/40 group-hover:ring-indigo-500 transition-all"
          />
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
              currentUser?.role === 'manager' ? 'bg-amber-400' : 'bg-emerald-400'
            }`}
          />
        </div>

        <div className="hidden sm:block text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-100 leading-none">
              {currentUser?.name}
            </span>
            {currentUser?.role === 'manager' ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                Manager
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium border border-slate-700">
                Staff
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400 block leading-tight truncate max-w-[120px]">
            {currentUser?.department}
          </span>
        </div>

        <ChevronDown
          size={14}
          className={`text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-indigo-400' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl glass-panel shadow-2xl border border-slate-700/80 p-2 z-50 animate-slide-up backdrop-blur-xl">
          <div className="px-3 py-2 border-b border-slate-800/80 mb-1">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Users size={13} className="text-indigo-400" />
                Switch Team View (6 Members)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Simulate dashboard as Manager or any staff member
            </p>
          </div>

          <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
            {profiles.map((profile) => {
              const isSelected = profile.id === currentUser?.id;
              const isManager = profile.role === 'manager';

              return (
                <button
                  key={profile.id}
                  onClick={() => {
                    setCurrentUser(profile);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-xl transition-all text-left ${
                    isSelected
                      ? 'bg-indigo-600/20 border border-indigo-500/40 text-white'
                      : 'hover:bg-slate-800/70 border border-transparent text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative flex-shrink-0">
                      <img
                        src={profile.avatar_url}
                        alt={profile.name}
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-700"
                      />
                      {isManager && (
                        <div className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 p-0.5 rounded-full">
                          <ShieldCheck size={10} className="stroke-[3]" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold truncate text-slate-100">
                          {profile.name}
                        </span>
                        {isManager && (
                          <span className="text-[9px] px-1 py-0.2 bg-amber-500/20 text-amber-300 rounded font-semibold">
                            Admin
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 block truncate">
                        {profile.title}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center flex-shrink-0">
                      <Check size={12} className="stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-2 pt-2 border-t border-slate-800/80 px-2 py-1 flex items-center justify-between text-[11px] text-slate-400">
            <span>Role: <strong className="text-slate-200">{currentUser?.role === 'manager' ? 'Full Admin Rights' : 'Staff Individual View'}</strong></span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
        </div>
      )}
    </div>
  );
}
