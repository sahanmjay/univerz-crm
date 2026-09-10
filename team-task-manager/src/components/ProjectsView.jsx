import React, { useState, useMemo } from 'react';
import { useTasks } from '../context/TaskContext';
import { 
  PROJECT_TYPES, 
  PROJECT_STATUSES, 
  TEAM_MEMBERS,
  getProjectTypeBadge,
  getProjectStatusBadge,
  getDepartmentBadge
} from '../lib/demoData';
import CreateProjectModal from './CreateProjectModal';
import ProjectDetailsModal from './ProjectDetailsModal';
import { 
  Briefcase, 
  Plus, 
  Search, 
  Globe, 
  Calendar, 
  Users, 
  User, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  Layers, 
  LayoutGrid, 
  Kanban, 
  Sparkles,
  TrendingUp,
  Filter,
  ArrowUpRight,
  ShieldCheck,
  Check,
  ChevronRight
} from 'lucide-react';

export default function ProjectsView() {
  const { 
    projects = [], 
    profiles, 
    currentUser, 
    isAdmin, 
    updateProject 
  } = useTasks();

  const isHRorAdmin = currentUser?.role === 'HR' || currentUser?.role === 'admin' || currentUser?.role === 'Admin' || currentUser?.department === 'HR' || currentUser?.role === 'hr' || isAdmin;

  const [activeTab, setActiveTab] = useState('portfolio'); // 'portfolio' | 'grid'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedLead, setSelectedLead] = useState('all');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [leadForNewProject, setLeadForNewProject] = useState(null);
  const [selectedProjectForDetails, setSelectedProjectForDetails] = useState(null);
  const [projectToEdit, setProjectToEdit] = useState(null);

  const teamList = profiles && profiles.length > 0 ? profiles : TEAM_MEMBERS;

  // 1. KPI Metrics
  const totalProjects = projects.length;
  const webDevCount = projects.filter(p => p.project_type === 'Web Development').length;
  const socialVideoCount = projects.filter(p => p.project_type === 'Social Media Management' || p.project_type === 'Video Production').length;
  const inReviewCount = projects.filter(p => p.status === 'In Review').length;
  const completedCount = projects.filter(p => p.status === 'Completed').length;
  const inProgressCount = projects.filter(p => p.status === 'In Progress').length;

  // 2. Filtered Projects List
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = project.name?.toLowerCase().includes(q);
        const matchesClient = project.client_name?.toLowerCase().includes(q);
        const matchesDesc = project.description?.toLowerCase().includes(q);
        const matchesType = project.project_type?.toLowerCase().includes(q);
        if (!matchesName && !matchesClient && !matchesDesc && !matchesType) return false;
      }

      // Status
      if (selectedStatus !== 'all' && project.status !== selectedStatus) {
        return false;
      }

      // Type
      if (selectedType !== 'all' && project.project_type !== selectedType) {
        return false;
      }

      // Lead
      if (selectedLead !== 'all') {
        const isLead = project.lead_id === selectedLead || project.lead_name === selectedLead;
        const isSupporting = (project.supporting_member_ids || []).includes(selectedLead);
        if (!isLead && !isSupporting) return false;
      }

      return true;
    });
  }, [projects, searchQuery, selectedStatus, selectedType, selectedLead]);

  // Helper: Get projects for a specific member
  const getProjectsForMember = (member) => {
    return filteredProjects.filter(p => {
      const isLead = p.lead_id === member.id || p.lead_name === member.full_name || p.lead_name === member.username;
      const isSupporting = (p.supporting_member_ids || []).includes(member.id);
      return isLead || isSupporting;
    });
  };

  const handleOpenCreateForLead = (member) => {
    setLeadForNewProject(member);
    setProjectToEdit(null);
    setIsCreateModalOpen(true);
  };

  const handleEditProject = (project) => {
    setProjectToEdit(project);
    setIsCreateModalOpen(true);
  };

  const handleCycleStatus = async (e, project) => {
    e.stopPropagation();
    if (!isHRorAdmin) return;
    const currentIndex = PROJECT_STATUSES.indexOf(project.status);
    const nextIndex = (currentIndex + 1) % PROJECT_STATUSES.length;
    const nextStatus = PROJECT_STATUSES[nextIndex];
    await updateProject(project.id, { status: nextStatus });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="relative rounded-3xl p-6 sm:p-8 overflow-hidden bg-white border border-[#e7e1d6] shadow-sm">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-[#1f5c5a]/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-60 h-60 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold tracking-wide uppercase bg-[#e8f0ef] text-[#1f5c5a] border border-[#a3c7c4] flex items-center gap-1.5 shadow-xs">
                <Briefcase size={13} className="text-[#1f5c5a]" />
                <span>Projects &amp; Client Hub</span>
              </span>

              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#e6f0e8] text-[#2e6930] border border-[#c2dfc8] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span>Live Supabase Sync</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[#20262e]">
              Client Projects &amp; Lead Allocation
            </h1>
            <p className="text-xs sm:text-sm text-[#6f6a60] max-w-2xl leading-relaxed">
              Track client deliverables across Web Development, Social Media, Video Production, and Brand Marketing for all 6 company team members.
            </p>
          </div>

          {/* Action Area */}
          <div className="flex flex-wrap items-center gap-3">
            {isHRorAdmin && (
              <button
                onClick={() => {
                  setLeadForNewProject(null);
                  setProjectToEdit(null);
                  setIsCreateModalOpen(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#1f5c5a] hover:bg-[#174644] text-white text-xs font-bold transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus size={16} className="stroke-[3]" />
                <span>Add New Project</span>
              </button>
            )}
          </div>
        </div>

        {/* Top KPI Statistics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-[#e7e1d6]">
          <div className="p-3.5 rounded-2xl bg-[#faf8f4] border border-[#e7e1d6]">
            <div className="text-[#6f6a60] text-[11px] font-semibold">Total Projects</div>
            <div className="text-xl sm:text-2xl font-black text-[#20262e] mt-0.5 flex items-center gap-1.5">
              <Briefcase size={16} className="text-[#1f5c5a]" />
              {totalProjects}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#faf8f4] border border-[#e7e1d6]">
            <div className="text-[#6f6a60] text-[11px] font-semibold">🌐 Web Dev</div>
            <div className="text-xl sm:text-2xl font-black text-[#1e5e80] mt-0.5 flex items-center gap-1.5">
              {webDevCount}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#faf8f4] border border-[#e7e1d6]">
            <div className="text-[#6f6a60] text-[11px] font-semibold">📱 Social &amp; Video</div>
            <div className="text-xl sm:text-2xl font-black text-[#be185d] mt-0.5 flex items-center gap-1.5">
              {socialVideoCount}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#faf8f4] border border-[#e7e1d6]">
            <div className="text-[#6f6a60] text-[11px] font-semibold">🟡 In Review</div>
            <div className="text-xl sm:text-2xl font-black text-[#9a6a14] mt-0.5 flex items-center gap-1.5">
              {inReviewCount}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#faf8f4] border border-[#e7e1d6] col-span-2 sm:col-span-1">
            <div className="text-[#6f6a60] text-[11px] font-semibold">🔵 Completed</div>
            <div className="text-xl sm:text-2xl font-black text-[#155e75] mt-0.5 flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-[#155e75]" />
              {completedCount}
            </div>
          </div>
        </div>
      </div>

      {/* View Switcher Tabs & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#e7e1d6] shadow-xs">
        {/* Toggle between Portfolio vs All Projects Grid */}
        <div className="flex items-center gap-1 bg-[#f3f0e9] p-1 rounded-xl border border-[#e7e1d6]">
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'portfolio'
                ? 'bg-[#1f5c5a] text-white shadow-xs'
                : 'text-[#6f6a60] hover:text-[#20262e] hover:bg-white/80'
            }`}
          >
            <Kanban size={14} />
            <span>Member-Wise Portfolio</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${activeTab === 'portfolio' ? 'bg-white/20 text-white' : 'bg-[#e7e1d6] text-[#20262e]'}`}>
              6 Members
            </span>
          </button>

          <button
            onClick={() => setActiveTab('grid')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'grid'
                ? 'bg-[#1f5c5a] text-white shadow-xs'
                : 'text-[#6f6a60] hover:text-[#20262e] hover:bg-white/80'
            }`}
          >
            <LayoutGrid size={14} />
            <span>All Projects Grid</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${activeTab === 'grid' ? 'bg-white/20 text-white' : 'bg-[#e7e1d6] text-[#20262e]'}`}>
              {filteredProjects.length}
            </span>
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs flex-1 justify-end">
          {/* Search Box */}
          <div className="relative min-w-[200px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects, clients..."
              className="w-full pl-9 pr-4 py-2 rounded-xl glass-input text-xs text-[#20262e] placeholder:text-[#6f6a60]"
            />
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-xl glass-input px-3 py-2 text-xs text-[#20262e] bg-white cursor-pointer font-bold border-[#e7e1d6]"
          >
            <option value="all">All Types</option>
            {PROJECT_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-xl glass-input px-3 py-2 text-xs text-[#20262e] bg-white cursor-pointer font-bold border-[#e7e1d6]"
          >
            <option value="all">All Statuses</option>
            {PROJECT_STATUSES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Lead Filter */}
          <select
            value={selectedLead}
            onChange={(e) => setSelectedLead(e.target.value)}
            className="rounded-xl glass-input px-3 py-2 text-xs text-[#20262e] bg-white cursor-pointer font-bold border-[#e7e1d6]"
          >
            <option value="all">All Team Members</option>
            {teamList.map(m => (
              <option key={m.id} value={m.id}>{m.full_name || m.username}</option>
            ))}
          </select>
        </div>
      </div>

      {/* VIEW A: MEMBER-WISE PROJECT PORTFOLIO (6 COLUMNS) */}
      {activeTab === 'portfolio' && (
        <div className="overflow-x-auto pb-6 -mx-2 px-2 sm:mx-0 sm:px-0 scrollbar-thin">
          <div className="flex gap-4 items-start min-w-[1680px]">
            {teamList.map((member) => {
              const memberProjects = getProjectsForMember(member);
              const leadProjectsCount = memberProjects.filter(p => p.lead_id === member.id || p.lead_name === member.full_name).length;
              const supportingProjectsCount = memberProjects.length - leadProjectsCount;

              return (
                <div 
                  key={member.id}
                  className="w-[270px] min-w-[270px] max-w-[270px] rounded-3xl bg-white border border-[#e7e1d6] p-4 space-y-3.5 hover:border-[#1f5c5a] transition-all flex flex-col min-h-[480px] overflow-hidden shadow-xs"
                >
                  {/* Member Column Header */}
                  <div className="space-y-2 border-b border-[#e7e1d6] pb-3 min-w-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative flex-shrink-0">
                        <img 
                          src={member.avatar_url} 
                          alt={member.full_name} 
                          className="w-10 h-10 rounded-full object-cover border-2 border-[#1f5c5a]/40"
                        />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white absolute bottom-0 right-0" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h3 className="text-xs font-bold text-[#20262e] truncate">
                            {member.full_name || member.username}
                          </h3>
                          {member.role === 'admin' && (
                            <span className="text-[9px] font-black uppercase px-1 py-0.2 rounded bg-amber-500/20 text-[#855b14] border border-amber-500/30 flex-shrink-0">
                              Admin
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md border font-semibold inline-block mt-0.5 truncate max-w-full ${getDepartmentBadge(member.department)}`}>
                          {member.department}
                        </span>
                      </div>
                    </div>

                    {/* Member Project Workload Summary */}
                    <div className="flex items-center justify-between text-[11px] text-[#6f6a60] font-semibold px-1 pt-1 min-w-0">
                      <span className="truncate">{memberProjects.length} Active {memberProjects.length === 1 ? 'Project' : 'Projects'}</span>
                      <span className="text-[10px] text-[#1f5c5a] font-bold bg-[#e8f0ef] px-1.5 py-0.2 rounded flex-shrink-0">
                        {leadProjectsCount} Lead &bull; {supportingProjectsCount} Support
                      </span>
                    </div>

                    {/* Quick + Add Project to this Lead Button */}
                    {isHRorAdmin && (
                      <button
                        onClick={() => handleOpenCreateForLead(member)}
                        className="w-full py-1.5 px-3 rounded-xl bg-[#e8f0ef] hover:bg-[#1f5c5a] text-[#1f5c5a] hover:text-white border border-[#a3c7c4] text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-xs"
                      >
                        <Plus size={13} className="stroke-[3]" />
                        <span>+ Assign Project</span>
                      </button>
                    )}
                  </div>

                  {/* Column Project Cards Feed */}
                  <div className="space-y-3 flex-1 min-w-0">
                    {memberProjects.length === 0 ? (
                      <div className="text-center py-10 px-2 rounded-2xl bg-[#faf8f4] border border-dashed border-[#e7e1d6]">
                        <Briefcase size={20} className="mx-auto text-[#6f6a60] mb-1.5" />
                        <div className="text-xs font-bold text-[#6f6a60]">No active projects</div>
                        <p className="text-[10px] text-[#8c827a] mt-0.5">
                          {isHRorAdmin ? 'Click "+ Assign Project" above' : 'No projects assigned'}
                        </p>
                      </div>
                    ) : (
                      memberProjects.map((project) => {
                        const isLead = project.lead_id === member.id || project.lead_name === member.full_name;
                        const typeBadge = getProjectTypeBadge(project.project_type);
                        const statusBadge = getProjectStatusBadge(project.status);

                        return (
                          <div
                            key={project.id}
                            onClick={() => setSelectedProjectForDetails(project)}
                            className="group p-3.5 rounded-2xl bg-white border border-[#e7e1d6] hover:border-[#1f5c5a] transition-all cursor-pointer space-y-2.5 shadow-xs hover:shadow-sm relative overflow-hidden min-w-0"
                          >
                            {/* Top Badges */}
                            <div className="flex items-center justify-between gap-1.5 min-w-0">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 min-w-0 flex-1 truncate ${typeBadge.badge}`}>
                                <span className="flex-shrink-0">{typeBadge.icon}</span>
                                <span className="truncate">{project.project_type}</span>
                              </span>

                              <button
                                onClick={(e) => handleCycleStatus(e, project)}
                                disabled={!isHRorAdmin}
                                title={isHRorAdmin ? "Click to cycle status" : ""}
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border flex items-center gap-1 flex-shrink-0 transition-all ${statusBadge.badge} ${
                                  isHRorAdmin ? 'cursor-pointer hover:scale-105' : 'cursor-default'
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                                <span className="whitespace-nowrap">{project.status}</span>
                              </button>
                            </div>

                            {/* Project & Client Name */}
                            <div className="min-w-0 space-y-0.5">
                              <h4 className="text-xs font-black text-[#20262e] group-hover:text-[#1f5c5a] transition-colors truncate" title={project.name}>
                                {project.name}
                              </h4>
                              <p className="text-[11px] text-[#6f6a60] font-medium truncate" title={project.client_name}>
                                🏢 {project.client_name}
                              </p>
                            </div>

                            {/* Member Role Pill (Lead vs Contributor) */}
                            <div className="flex items-center justify-between pt-1 text-[10px] min-w-0">
                              {isLead ? (
                                <span className="px-2 py-0.5 rounded-md font-bold bg-[#f4ecd9] text-[#9a6a14] border border-[#e5d2ac] flex items-center gap-1 flex-shrink-0">
                                  <span>⭐ Primary Lead</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md font-bold bg-[#f1e8f8] text-[#6b21a8] border border-[#dec8f0] flex items-center gap-1 flex-shrink-0">
                                  <span>🤝 Contributor</span>
                                </span>
                              )}

                              {project.deadline && (
                                <span className="text-[#6f6a60] font-medium truncate text-right">
                                  📅 {project.deadline}
                                </span>
                              )}
                            </div>

                            {/* Live Website / Social Link Button */}
                            {project.website_url && (
                              <a
                                href={project.website_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="w-full min-w-0 flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-[#faf8f4] hover:bg-[#e8f0ef] border border-[#e7e1d6] hover:border-[#1f5c5a] text-[11px] text-[#1f5c5a] transition-all font-semibold overflow-hidden"
                              >
                                <span className="truncate flex items-center gap-1.5 min-w-0 flex-1">
                                  <Globe size={12} className="text-[#1f5c5a] flex-shrink-0" />
                                  <span className="truncate">{project.website_url.replace(/^https?:\/\//, '')}</span>
                                </span>
                                <ExternalLink size={11} className="flex-shrink-0 ml-1.5 text-[#6f6a60]" />
                              </a>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW B: ALL PROJECTS GRID */}
      {activeTab === 'grid' && (
        <div className="space-y-4">
          {filteredProjects.length === 0 ? (
            <div className="text-center py-16 rounded-3xl bg-white border border-[#e7e1d6] space-y-2">
              <Briefcase size={36} className="text-[#6f6a60] mx-auto mb-2" />
              <h3 className="text-sm font-bold text-[#20262e]">No projects found</h3>
              <p className="text-xs text-[#6f6a60] mt-1 max-w-sm mx-auto">
                {projects.length === 0 
                  ? (isHRorAdmin ? 'No active client projects. HR can add a new project using the button above.' : 'No active projects currently assigned.')
                  : 'No client projects match your current search and filter criteria.'}
              </p>
              {projects.length === 0 && isHRorAdmin && (
                <button
                  onClick={() => {
                    setLeadForNewProject(null);
                    setProjectToEdit(null);
                    setIsCreateModalOpen(true);
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1f5c5a] hover:bg-[#174644] text-white text-xs font-bold transition-all shadow-xs"
                >
                  <Plus size={14} />
                  <span>+ Add New Project</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((project) => {
                const typeBadge = getProjectTypeBadge(project.project_type);
                const statusBadge = getProjectStatusBadge(project.status);
                const leadMember = teamList.find(m => m.id === project.lead_id || m.full_name === project.lead_name || m.username === project.lead_name);
                const supportingMembers = teamList.filter(m => (project.supporting_member_ids || []).includes(m.id));

                return (
                  <div
                    key={project.id}
                    onClick={() => setSelectedProjectForDetails(project)}
                    className="p-5 rounded-3xl bg-white border border-[#e7e1d6] hover:border-[#1f5c5a] transition-all cursor-pointer space-y-4 shadow-xs hover:shadow-sm relative group"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold border ${typeBadge.badge}`}>
                          <span>{typeBadge.icon}</span>
                          <span>{project.project_type}</span>
                        </span>

                        <h3 className="text-base font-black text-[#20262e] group-hover:text-[#1f5c5a] transition-colors">
                          {project.name}
                        </h3>
                        <p className="text-xs font-semibold text-[#6f6a60]">
                          Client: <span className="text-[#20262e]">{project.client_name}</span>
                        </p>
                      </div>

                      <button
                        onClick={(e) => handleCycleStatus(e, project)}
                        disabled={!isHRorAdmin}
                        title={isHRorAdmin ? "Click to cycle status" : ""}
                        className={`text-xs font-extrabold px-3 py-1 rounded-xl border flex items-center gap-1.5 ${statusBadge.badge} ${
                          isHRorAdmin ? 'cursor-pointer hover:scale-105' : 'cursor-default'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${statusBadge.dot} animate-pulse`} />
                        <span>{project.status}</span>
                      </button>
                    </div>

                    {/* Description preview */}
                    {project.description && (
                      <p className="text-xs text-[#6f6a60] line-clamp-2 leading-relaxed bg-[#faf8f4] p-2.5 rounded-xl border border-[#e7e1d6]">
                        {project.description}
                      </p>
                    )}

                    {/* Team Allocations */}
                    <div className="flex items-center justify-between pt-2 border-t border-[#e7e1d6] text-xs">
                      {/* Lead */}
                      <div className="flex items-center gap-2">
                        {leadMember ? (
                          <>
                            <img 
                              src={leadMember.avatar_url} 
                              alt={leadMember.full_name} 
                              className="w-7 h-7 rounded-full object-cover border border-[#1f5c5a]/40"
                            />
                            <div>
                              <span className="text-[10px] text-[#6f6a60] block font-semibold">Lead</span>
                              <span className="font-bold text-[#20262e] text-[11px] truncate">{leadMember.full_name}</span>
                            </div>
                          </>
                        ) : (
                          <span className="text-[#6f6a60] italic">No Lead</span>
                        )}
                      </div>

                      {/* Supporting Avatars */}
                      {supportingMembers.length > 0 && (
                        <div className="flex items-center -space-x-1.5" title={`Contributors: ${supportingMembers.map(m => m.full_name).join(', ')}`}>
                          {supportingMembers.map(m => (
                            <img 
                              key={m.id}
                              src={m.avatar_url} 
                              alt={m.full_name} 
                              className="w-6 h-6 rounded-full object-cover border-2 border-white"
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer URL / Deadline */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      {project.website_url ? (
                        <a
                          href={project.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
                        >
                          <Globe size={13} />
                          <span>Visit Page</span>
                          <ArrowUpRight size={12} />
                        </a>
                      ) : (
                        <span className="text-slate-500 text-[11px]">No URL</span>
                      )}

                      {project.deadline && (
                        <span className="text-slate-400 text-[11px] font-medium flex items-center gap-1">
                          <Calendar size={12} className="text-purple-400" />
                          <span>{project.deadline}</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setLeadForNewProject(null);
          setProjectToEdit(null);
        }}
        initialLead={leadForNewProject}
        projectToEdit={projectToEdit}
      />

      <ProjectDetailsModal
        project={selectedProjectForDetails}
        onClose={() => setSelectedProjectForDetails(null)}
        onEdit={(p) => handleEditProject(p)}
      />
    </div>
  );
}
