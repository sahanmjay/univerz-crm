import React from 'react';
import { useTasks } from '../context/TaskContext';
import { CheckCircle2, Clock, ListTodo, TrendingUp, ShieldCheck } from 'lucide-react';
import { getDepartmentBadge } from '../lib/demoData';

export default function TeamProgressGrid() {
  const { metrics, selectedAssignee, setSelectedAssignee } = useTasks();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-indigo-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>6-Member Team Progress & Workload</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30 normal-case">
              {metrics.activeMonthLabel || 'This Month'}
            </span>
          </h3>
        </div>
        {selectedAssignee !== 'all' && (
          <button
            onClick={() => setSelectedAssignee('all')}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
          >
            Clear filter (Show All)
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {metrics.memberStats.map((member) => {
          const isSelected = selectedAssignee === member.id;
          const rate = member.completionRate;
          const isAdmin = member.role === 'admin' || member.department === 'HR';

          let progressColor = 'from-indigo-500 to-indigo-600';
          let textColor = 'text-indigo-400';
          if (rate === 100 && member.totalTasks > 0) {
            progressColor = 'from-emerald-400 to-emerald-600';
            textColor = 'text-emerald-400';
          } else if (rate >= 50) {
            progressColor = 'from-sky-400 to-indigo-500';
            textColor = 'text-sky-400';
          } else if (rate > 0) {
            progressColor = 'from-amber-400 to-indigo-500';
            textColor = 'text-amber-400';
          }

          return (
            <div
              key={member.id}
              onClick={() => setSelectedAssignee(isSelected ? 'all' : member.id)}
              className={`p-3.5 rounded-2xl transition-all cursor-pointer border ${
                isSelected
                  ? 'bg-indigo-950/40 border-indigo-500 shadow-lg shadow-indigo-500/10 ring-2 ring-indigo-500/30'
                  : 'bg-slate-900/70 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Profile details */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative">
                    <img
                      src={member.avatar_url}
                      alt={member.full_name}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-700/80"
                    />
                    {isAdmin && (
                      <span className="absolute -top-1 -right-1 text-[8px] font-black px-1 bg-amber-500 text-slate-950 rounded-full">
                        HR
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-100 truncate flex items-center gap-1">
                      {member.full_name || member.username}
                    </h4>
                    <span className={`inline-block text-[9px] px-1.5 py-0.2 rounded border font-medium mt-0.5 ${getDepartmentBadge(member.department)}`}>
                      {member.department}
                    </span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className={`text-base font-black ${textColor}`}>
                    {rate}%
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden mb-3 border border-slate-700/40">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${progressColor} transition-all duration-500`}
                  style={{ width: `${rate}%` }}
                />
              </div>

              {/* Metrics counts */}
              <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-800/60 text-slate-400">
                <span className="flex items-center gap-1">
                  <ListTodo size={12} className="text-slate-400" />
                  <strong>{member.totalTasks}</strong> total
                </span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 size={12} />
                  <strong>{member.completedTasks}</strong> done
                </span>
                <span className="flex items-center gap-1 text-amber-400">
                  <Clock size={12} />
                  <strong>{member.pendingTasks}</strong> pending
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
