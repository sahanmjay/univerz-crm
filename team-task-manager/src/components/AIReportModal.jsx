import React, { useState } from 'react';
import { X, Sparkles, Printer, FileText, Loader2, AlertCircle, Copy, Users, CheckCircle, Clock, Calendar } from 'lucide-react';
import { useTasks } from '../context/TaskContext';
import ReactMarkdown from 'react-markdown';

export default function AIReportModal({ isOpen, onClose }) {
  const { generateAIReport, tasks, scopedTasks, profiles, metrics, leaves } = useTasks();
  
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  // 1. Calculate live task distribution metrics (Scoped to active month)
  const taskSource = scopedTasks || tasks;
  const total = taskSource.length;
  const completed = taskSource.filter(t => t.status === 'done').length;
  const review = taskSource.filter(t => t.status === 'review').length;
  const pending = total - completed - review;
  const overallEfficiency = total > 0 ? Math.round((completed / total) * 100) : 0;

  // 2. Resolve department workloads and efficiency
  const getProfileDept = (assignedTo) => {
    const prof = profiles.find(p => 
      p.id === assignedTo || 
      p.full_name === assignedTo || 
      p.username === assignedTo ||
      p.full_name?.toLowerCase() === assignedTo?.toLowerCase() ||
      p.username?.toLowerCase() === assignedTo?.toLowerCase()
    );
    return prof ? prof.department : 'General';
  };

  const departmentsList = ['HR', 'Financial', 'Production team', 'Marketing'];
  const departmentStats = departmentsList.map(dept => {
    const deptTasks = taskSource.filter(t => {
      const d = getProfileDept(t.assigned_to);
      return d?.toLowerCase() === dept.toLowerCase();
    });
    const dTotal = deptTasks.length;
    const dCompleted = deptTasks.filter(t => t.status === 'done').length;
    const dRate = dTotal > 0 ? Math.round((dCompleted / dTotal) * 100) : 0;
    
    return {
      name: dept === 'Production team' ? 'Production' : (dept === 'Financial' ? 'Finance' : dept),
      total: dTotal,
      completed: dCompleted,
      rate: dRate
    };
  });

  // 3. Donut SVG dash array math (circumference 251.2 for radius 40 circle)
  const c = 251.2;
  const compDash = total > 0 ? (completed / total) * c : 0;
  const revDash = total > 0 ? (review / total) * c : 0;
  const pendDash = total > 0 ? (pending / total) * c : 0;

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setReport(null);

    try {
      const result = await generateAIReport();
      setReport(result);
    } catch (err) {
      setError(err.message || 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    if (!report) return;
    navigator.clipboard.writeText(report);
    alert("Executive commentary successfully copied to clipboard!");
  };

  const currentDate = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in print:bg-white print:p-0 print:block overflow-y-auto">
      
      {/* Dynamic CSS styles for standard white light-mode printing */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print-card {
            background: white !important;
            border: 1px solid #e2e8f0 !important;
            color: black !important;
          }
          .print-text-black {
            color: black !important;
          }
          .print-text-muted {
            color: #475569 !important;
          }
          .print-badge {
            background: #f1f5f9 !important;
            border: 1px solid #cbd5e1 !important;
            color: black !important;
          }
          .print-prose {
            color: black !important;
          }
          .print-prose p, .print-prose li, .print-prose strong, .print-prose h1, .print-prose h2, .print-prose h3 {
            color: black !important;
          }
        }
      `}} />

      <div 
        className="w-full max-w-6xl bg-slate-900 border border-slate-800 shadow-2xl rounded-3xl flex flex-col my-8 print:my-0 print:border-none print:shadow-none print:bg-white print:text-black"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800/80 flex flex-wrap gap-4 justify-between items-center bg-slate-900/50 print:border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold text-slate-400 print:text-slate-600">
              <span>UniVerz Task Board</span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
              <span>{currentDate}</span>
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-white flex items-center gap-2 mt-0.5 print:text-black">
              <Sparkles size={22} className="text-indigo-400 print:text-indigo-600" />
              Executive Productivity & Analytics Dashboard
            </h2>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            {report && (
              <>
                <button 
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all border border-slate-700/80"
                  title="Copy Report Text"
                >
                  <Copy size={13} />
                  Copy Summary
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/10"
                >
                  <Printer size={13} />
                  Print / Export PDF
                </button>
              </>
            )}
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh] print:max-h-none print:overflow-visible">
          
          {/* Key KPI Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 print-card">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium print-text-muted">
                <span>Team Members</span>
                <Users size={14} className="text-indigo-400" />
              </div>
              <div className="text-2xl font-black text-white mt-1.5 print:text-black">{profiles.length}</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 print-card">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium print-text-muted">
                <span>Total Task Volume</span>
                <FileText size={14} className="text-indigo-400" />
              </div>
              <div className="text-2xl font-black text-white mt-1.5 print:text-black">{total}</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 print-card">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium print-text-muted">
                <span>Overall Efficiency</span>
                <CheckCircle size={14} className="text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400 mt-1.5 flex items-baseline gap-1.5 print:text-emerald-600">
                {overallEfficiency}%
                <span className="text-[10px] text-slate-500 font-medium print-text-muted">({completed} completed)</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 print-card">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium print-text-muted">
                <span>Leaves & Events</span>
                <Calendar size={14} className="text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-400 mt-1.5 flex items-baseline gap-1.5 print:text-amber-600">
                {leaves.length} <span className="text-xs text-slate-500 font-medium ml-1 print-text-muted">Active leaves</span>
              </div>
            </div>
          </div>

          {/* Interactive Split View */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Column: Visual Charts */}
            <div className="space-y-6">
              
              {/* Task Breakdown Donut Chart */}
              <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800/80 flex flex-col md:flex-row items-center gap-6 print-card">
                <div className="relative w-40 h-40 flex-shrink-0">
                  {total > 0 ? (
                    <svg width="160" height="160" viewBox="0 0 120 120" className="transform -rotate-90">
                      <circle cx="60" cy="60" r="40" fill="transparent" stroke="#1e293b" strokeWidth="12" />
                      {/* Completed Segment */}
                      <circle cx="60" cy="60" r="40" fill="transparent" stroke="#10b981" strokeWidth="12"
                              strokeDasharray={`${compDash} ${c}`} strokeDashoffset={0} />
                      {/* In Review Segment */}
                      <circle cx="60" cy="60" r="40" fill="transparent" stroke="#f59e0b" strokeWidth="12"
                              strokeDasharray={`${revDash} ${c}`} strokeDashoffset={-compDash} />
                      {/* Pending Segment */}
                      <circle cx="60" cy="60" r="40" fill="transparent" stroke="#6366f1" strokeWidth="12"
                              strokeDasharray={`${pendDash} ${c}`} strokeDashoffset={-(compDash + revDash)} />
                    </svg>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">No tasks</div>
                  )}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-white print:text-black">{total}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider print-text-muted">Tasks</span>
                  </div>
                </div>

                <div className="flex-1 space-y-3 w-full">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 print-text-muted">Task Distribution Breakdown</h3>
                  
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-slate-300 font-medium print-text-black">Completed Tasks</span>
                    </div>
                    <span className="font-bold text-white print:text-black">{completed} ({total > 0 ? Math.round((completed / total) * 100) : 0}%)</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span className="text-slate-300 font-medium print-text-black">In-Review (Awaiting HR)</span>
                    </div>
                    <span className="font-bold text-white print:text-black">{review} ({total > 0 ? Math.round((review / total) * 100) : 0}%)</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      <span className="text-slate-300 font-medium print-text-black">Pending Checklist</span>
                    </div>
                    <span className="font-bold text-white print:text-black">{pending} ({total > 0 ? Math.round((pending / total) * 100) : 0}%)</span>
                  </div>
                </div>
              </div>

              {/* Departmental Efficiency Bar Chart */}
              <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800/80 space-y-4 print-card">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 print-text-muted">Departmental Workload & Completion Rate</h3>
                
                <div className="space-y-3.5">
                  {departmentStats.map((dept) => (
                    <div key={dept.name} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-200 print:text-black">{dept.name}</span>
                        <div className="text-[10px] text-slate-400 print-text-muted font-semibold">
                          {dept.completed}/{dept.total} tasks &bull; <strong className="text-emerald-400 print:text-emerald-600">{dept.rate}%</strong>
                        </div>
                      </div>

                      <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700/50 print:bg-slate-100">
                        <div 
                          className="h-full rounded-full bg-indigo-500"
                          style={{ width: `${dept.rate}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Member Performance Matrix */}
            <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800/80 flex flex-col print-card">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 print-text-muted">Team Performance Matrix</h3>
              
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 print:border-slate-200 print-text-muted">
                      <th className="pb-3 font-semibold">Team Member</th>
                      <th className="pb-3 font-semibold">Dept</th>
                      <th className="pb-3 font-semibold text-center">Tasks</th>
                      <th className="pb-3 font-semibold text-right">Completion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 print:divide-slate-200">
                    {metrics.memberStats.map((member) => (
                      <tr key={member.id} className="hover:bg-slate-900/10">
                        <td className="py-3 flex items-center gap-2">
                          <img 
                            src={member.avatar_url} 
                            alt={member.full_name} 
                            className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-800 print:ring-slate-200" 
                          />
                          <span className="font-bold text-slate-200 print:text-black">{member.full_name || member.username}</span>
                        </td>
                        <td className="py-3 text-slate-400 print-text-muted">{member.department}</td>
                        <td className="py-3 text-center text-slate-300 print:text-black">{member.completedTasks}/{member.totalTasks}</td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-bold text-emerald-400 print:text-emerald-600">{member.completionRate}%</span>
                            <div className="w-12 bg-slate-800 rounded-full h-1.5 overflow-hidden print:bg-slate-100 hidden sm:block">
                              <div 
                                className="h-full rounded-full bg-emerald-500" 
                                style={{ width: `${member.completionRate}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* AI Executive Commentary Section */}
          <div className="space-y-4">
            
            {/* Generate Trigger block (if not loaded) */}
            {!loading && !report && (
              <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 text-center space-y-4 print:hidden">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 mx-auto flex items-center justify-center border border-indigo-500/25">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">AI-Generated Director Insights</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    Securely package live board statistics, workload distribution, and calendar events to draft professional markdown commentary.
                  </p>
                </div>

                {error && (
                  <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold max-w-md mx-auto">
                    <AlertCircle size={14} />
                    {error}
                  </div>
                )}

                <button
                  onClick={handleGenerate}
                  className="inline-flex justify-center items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Sparkles size={14} />
                  Generate AI Summary & Meeting Report
                </button>
              </div>
            )}

            {/* Generating Loader */}
            {loading && (
              <div className="flex flex-col items-center justify-center p-12 space-y-4 bg-slate-950/20 border border-slate-800/80 rounded-2xl print:hidden">
                <Loader2 size={36} className="text-emerald-400 animate-spin" />
                <p className="text-slate-400 text-xs font-semibold animate-pulse">
                  AI Insights Engine is analyzing workload queues and generating commentary...
                </p>
              </div>
            )}

            {/* Generated Markdown Commentary */}
            {report && !loading && (
              <div className="p-5 sm:p-6 rounded-3xl bg-slate-950/60 border border-slate-800/80 space-y-4 print-card">
                <div className="flex justify-between items-center border-b border-slate-800/80 pb-3 print:border-slate-200">
                  <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 print:text-emerald-600">
                    <Sparkles size={14} />
                    AI Executive Strategic Commentary
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold uppercase tracking-wider print-badge">
                    Insights Live
                  </span>
                </div>

                <div className="prose prose-invert prose-emerald max-w-none text-slate-300 text-xs leading-relaxed print-prose">
                  <ReactMarkdown>{report}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
