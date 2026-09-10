import React from 'react';
import { useTasks } from '../context/TaskContext';
import { 
  getProjectTypeBadge, 
  getProjectStatusBadge, 
  getDepartmentBadge,
  TEAM_MEMBERS 
} from '../lib/demoData';
import { 
  X, 
  Briefcase, 
  Globe, 
  Calendar, 
  User, 
  Users, 
  ExternalLink, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Layers,
  Sparkles
} from 'lucide-react';

export default function ProjectDetailsModal({ 
  project, 
  onClose, 
  onEdit 
}) {
  const { profiles, tasks, isAdmin, currentUser, deleteProject, toggleTaskStatus } = useTasks();

  const isHRorAdmin = currentUser?.role === 'HR' || currentUser?.role === 'admin' || currentUser?.role === 'Admin' || currentUser?.department === 'HR' || currentUser?.role === 'hr' || isAdmin;

  if (!project) return null;

  const teamList = profiles && profiles.length > 0 ? profiles : TEAM_MEMBERS;
  const leadMember = teamList.find(m => m.id === project.lead_id || m.full_name === project.lead_name || m.username === project.lead_name);
  const supportingMembers = teamList.filter(m => (project.supporting_member_ids || []).includes(m.id));

  const typeInfo = getProjectTypeBadge(project.project_type);
  const statusInfo = getProjectStatusBadge(project.status);

  // Find linked tasks from tasks list
  const linkedTasks = tasks.filter(t => {
    const titleMatch = t.title?.toLowerCase().includes(project.name.toLowerCase());
    const descMatch = t.description?.toLowerCase().includes(project.name.toLowerCase());
    return titleMatch || descMatch;
  });

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete project "${project.name}"?`)) {
      await deleteProject(project.id);
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl rounded-3xl glass-panel border border-slate-700/80 p-6 sm:p-7 shadow-2xl space-y-5 my-8 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Type & Status */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${typeInfo.badge}`}>
                <span>{typeInfo.icon}</span>
                <span>{project.project_type}</span>
              </span>

              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${statusInfo.badge}`}>
                <span className={`w-2 h-2 rounded-full ${statusInfo.dot} animate-pulse`} />
                <span>{project.status}</span>
              </span>
            </div>

            <div>
              <h2 className="text-xl font-black text-white">
                {project.name}
              </h2>
              <div className="text-xs font-semibold text-slate-400 mt-0.5 flex items-center gap-1.5">
                <span>Client:</span>
                <strong className="text-slate-200">{project.client_name}</strong>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isHRorAdmin && (
              <>
                <button
                  onClick={() => {
                    onClose();
                    onEdit(project);
                  }}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Edit Project"
                >
                  <Edit3 size={15} />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors border border-rose-500/20"
                  title="Delete Project"
                >
                  <Trash2 size={15} />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Live URL & Deadline Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {project.website_url ? (
            <a
              href={project.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-900/40 hover:text-white transition-all group"
            >
              <div className="flex items-center gap-2 truncate">
                <Globe size={16} className="text-indigo-400 flex-shrink-0" />
                <span className="text-xs font-bold truncate">{project.website_url}</span>
              </div>
              <ExternalLink size={14} className="group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
            </a>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-500 text-xs font-medium">
              <Globe size={15} />
              <span>No live URL configured</span>
            </div>
          )}

          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs">
            <Calendar size={16} className="text-purple-400 flex-shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block">Target Deadline</span>
              <span className="font-bold text-slate-200">
                {project.deadline ? project.deadline : 'Continuous Deliverables'}
              </span>
            </div>
          </div>
        </div>

        {/* Project Scope / Description */}
        {project.description && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Scope of Work & Deliverables
            </h4>
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
              {project.description}
            </div>
          </div>
        )}

        {/* Team Allocation (Lead + Contributors) */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Team Allocation & Leads
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Primary Lead */}
            <div className="p-3 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 flex items-center gap-3">
              {leadMember ? (
                <>
                  <img 
                    src={leadMember.avatar_url} 
                    alt={leadMember.full_name} 
                    className="w-10 h-10 rounded-full object-cover border-2 border-indigo-500/50 flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                      Primary Project Lead
                    </span>
                    <div className="text-xs font-bold text-white truncate mt-1">
                      {leadMember.full_name}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {leadMember.department}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-xs text-slate-400">No primary lead assigned</div>
              )}
            </div>

            {/* Supporting Contributors */}
            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                Supporting Contributors ({supportingMembers.length})
              </span>
              {supportingMembers.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  {supportingMembers.map(m => (
                    <div 
                      key={m.id}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300"
                    >
                      <img 
                        src={m.avatar_url} 
                        alt={m.full_name} 
                        className="w-5 h-5 rounded-full object-cover"
                      />
                      <span className="font-semibold text-[11px]">{m.full_name || m.username}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-slate-500 italic">No supporting contributors assigned</span>
              )}
            </div>
          </div>
        </div>

        {/* Associated Project Tasks */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={13} className="text-indigo-400" />
              <span>Live Associated Tasks ({linkedTasks.length})</span>
            </h4>
          </div>

          {linkedTasks.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {linkedTasks.map(t => (
                <div 
                  key={t.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-xs transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={() => toggleTaskStatus(t.id)}
                      className="text-slate-400 hover:text-emerald-400 transition-colors"
                    >
                      <CheckCircle2 size={15} className={t.status === 'done' ? 'text-emerald-400' : 'text-slate-600'} />
                    </button>
                    <span className={`font-semibold truncate ${t.status === 'done' ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                      {t.title}
                    </span>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    t.status === 'done' 
                      ? 'bg-emerald-500/20 text-emerald-300' 
                      : t.status === 'review'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-indigo-500/20 text-indigo-300'
                  }`}>
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic p-3 rounded-xl bg-slate-900/30 border border-slate-800/60">
              No tasks currently contain "{project.name}" in their title or notes.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
