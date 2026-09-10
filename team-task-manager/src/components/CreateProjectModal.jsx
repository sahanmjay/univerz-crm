import React, { useState, useEffect } from 'react';
import { useTasks } from '../context/TaskContext';
import { 
  PROJECT_TYPES, 
  PROJECT_STATUSES, 
  TEAM_MEMBERS,
  getProjectTypeBadge,
  getProjectStatusBadge,
  getDepartmentBadge
} from '../lib/demoData';
import { 
  X, 
  Briefcase, 
  Globe, 
  Calendar, 
  User, 
  Users, 
  Layers, 
  Sparkles,
  ExternalLink,
  Check
} from 'lucide-react';

export default function CreateProjectModal({ 
  isOpen, 
  onClose, 
  initialLead = null,
  projectToEdit = null 
}) {
  const { profiles, createProject, updateProject, currentUser } = useTasks();

  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [projectType, setProjectType] = useState('Web Development');
  const [leadId, setLeadId] = useState('');
  const [supportingMemberIds, setSupportingMemberIds] = useState([]);
  const [status, setStatus] = useState('In Progress');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 6 team profiles
  const teamList = profiles && profiles.length > 0 ? profiles : TEAM_MEMBERS;

  useEffect(() => {
    if (isOpen) {
      if (projectToEdit) {
        setName(projectToEdit.name || '');
        setClientName(projectToEdit.client_name || '');
        setProjectType(projectToEdit.project_type || 'Web Development');
        setLeadId(projectToEdit.lead_id || '');
        setSupportingMemberIds(projectToEdit.supporting_member_ids || []);
        setStatus(projectToEdit.status || 'In Progress');
        setWebsiteUrl(projectToEdit.website_url || '');
        setDeadline(projectToEdit.deadline || '');
        setDescription(projectToEdit.description || '');
      } else {
        setName('');
        setClientName('');
        setProjectType('Web Development');
        setLeadId(initialLead ? (initialLead.id || initialLead) : (currentUser?.id || ''));
        setSupportingMemberIds([]);
        setStatus('In Progress');
        setWebsiteUrl('');
        setDeadline('');
        setDescription('');
      }
      setError('');
    }
  }, [isOpen, projectToEdit, initialLead, currentUser]);

  if (!isOpen) return null;

  const toggleSupportingMember = (memberId) => {
    if (memberId === leadId) return; // Lead is already assigned
    setSupportingMemberIds(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId) 
        : [...prev, memberId]
    );
  };

  const handleLeadChange = (newLeadId) => {
    setLeadId(newLeadId);
    // Remove new lead from supporting members if present
    setSupportingMemberIds(prev => prev.filter(id => id !== newLeadId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project Name is required');
      return;
    }
    if (!clientName.trim()) {
      setError('Client Name is required');
      return;
    }

    const leadMember = teamList.find(m => m.id === leadId);

    setIsSubmitting(true);
    setError('');

    try {
      const payload = {
        name: name.trim(),
        client_name: clientName.trim(),
        project_type: projectType,
        lead_id: leadId || null,
        lead_name: leadMember ? (leadMember.full_name || leadMember.username) : '',
        supporting_member_ids: supportingMemberIds,
        status,
        website_url: websiteUrl.trim() || null,
        deadline: deadline || null,
        description: description.trim()
      };

      if (projectToEdit) {
        await updateProject(projectToEdit.id, payload);
      } else {
        await createProject(payload);
      }

      onClose();
    } catch (err) {
      console.error('Error saving project:', err);
      setError('Failed to save project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div 
        className="w-full max-w-2xl rounded-3xl glass-panel border border-slate-700/80 p-6 sm:p-7 shadow-2xl space-y-5 my-8 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Briefcase size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">
                {projectToEdit ? 'Edit Client Project' : 'Create & Launch New Project'}
              </h2>
              <p className="text-xs text-slate-400">
                Assign leads, supporting contributors, deadlines, and client deliverables
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Row 1: Project Name & Client Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Project Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Oceana Trinco, Jayappriya Filters"
                required
                className="w-full rounded-xl glass-input px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Client / Company Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g., Oceana Resorts Ltd, Aura Blanc Group"
                required
                className="w-full rounded-xl glass-input px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Row 2: Project Type & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Project Category / Type
              </label>
              <select
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                className="w-full rounded-xl glass-input px-3.5 py-2.5 text-xs text-slate-200 bg-slate-900 font-semibold"
              >
                {PROJECT_TYPES.map(type => (
                  <option key={type} value={type} className="bg-slate-900 text-slate-200">
                    {getProjectTypeBadge(type).icon} {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Project Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl glass-input px-3.5 py-2.5 text-xs text-slate-200 bg-slate-900 font-semibold"
              >
                {PROJECT_STATUSES.map(st => (
                  <option key={st} value={st} className="bg-slate-900 text-slate-200">
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Main Owner / Lead Member */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Primary Project Lead / Owner <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {teamList.map((member) => {
                const isSelected = leadId === member.id;
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => handleLeadChange(member.id)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all text-left ${
                      isSelected
                        ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-md shadow-indigo-600/20 ring-1 ring-indigo-400'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <img 
                      src={member.avatar_url} 
                      alt={member.full_name} 
                      className="w-7 h-7 rounded-full object-cover border border-slate-700 flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate">
                        {member.full_name || member.username}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {member.department}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 4: Supporting Contributors (Multi-Select) */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Supporting Contributors & Collaborators (Multi-Select)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {teamList
                .filter(m => m.id !== leadId)
                .map((member) => {
                  const isChecked = supportingMemberIds.includes(member.id);
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => toggleSupportingMember(member.id)}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all text-left ${
                        isChecked
                          ? 'bg-purple-600/25 border-purple-500/60 text-purple-200 ring-1 ring-purple-400/40'
                          : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                        isChecked ? 'bg-purple-600 border-purple-500 text-white' : 'border-slate-700 bg-slate-950'
                      }`}>
                        {isChecked && <Check size={11} className="stroke-[3]" />}
                      </div>
                      <img 
                        src={member.avatar_url} 
                        alt={member.full_name} 
                        className="w-6 h-6 rounded-full object-cover border border-slate-700 flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold truncate">
                          {member.full_name || member.username}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {member.department}
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Row 5: URL & Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Globe size={13} className="text-indigo-400" />
                <span>Live Website / Social Page URL</span>
              </label>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://oceanatrinco.com or https://instagram.com/..."
                className="w-full rounded-xl glass-input px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Calendar size={13} className="text-purple-400" />
                <span>Target Deadline / Delivery Date</span>
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-xl glass-input px-3.5 py-2.5 text-xs text-white [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Row 6: Description / Scope of Work */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Project Scope, Deliverables & Notes
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Key project objectives, scope of deliverables, client requirements, milestones..."
              rows={3}
              className="w-full rounded-xl glass-input px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:opacity-95 transition-all flex items-center gap-2"
            >
              <Briefcase size={14} />
              <span>{isSubmitting ? 'Saving...' : projectToEdit ? 'Update Project' : 'Launch Project'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
