import React, { useState, useEffect } from 'react';
import { 
  Database, 
  X, 
  Check, 
  Copy, 
  ExternalLink, 
  ShieldCheck, 
  AlertTriangle, 
  RefreshCw,
  Sparkles,
  Zap
} from 'lucide-react';
import { getSupabaseConfig, resetSupabaseClient } from '../lib/supabase';
import { useTasks } from '../context/TaskContext';

export default function SupabaseConfigModal({ isOpen, onClose }) {
  const { isSupabaseLive, fetchSupabaseData, resetToDefaultData } = useTasks();
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const config = getSupabaseConfig();
      setUrl(config.url || '');
      setKey(config.key || '');
      setStatusMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveAndConnect = async (e) => {
    e.preventDefault();
    setIsTesting(true);
    setStatusMsg(null);

    try {
      localStorage.setItem('supabase_url', url.trim());
      localStorage.setItem('supabase_anon_key', key.trim());

      const client = resetSupabaseClient();
      if (!client) {
        setStatusMsg({ type: 'error', text: 'Invalid Supabase URL or Anon Key.' });
        setIsTesting(false);
        return;
      }

      await fetchSupabaseData();
      setStatusMsg({ type: 'success', text: 'Connected to Supabase successfully!' });
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Connection test failed.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem('supabase_url');
    localStorage.removeItem('supabase_anon_key');
    resetSupabaseClient();
    window.location.reload();
  };

  const copySqlSchema = () => {
    const schemaText = `-- Run this in Supabase SQL Editor:
create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text unique not null,
  role text not null check (role in ('manager', 'staff')),
  department text not null,
  title text not null,
  avatar_url text,
  color text default '#6366f1',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.tasks (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  category text not null check (category in ('daily', 'weekly', 'hr', 'general')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'pending' check (status in ('pending', 'completed')),
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  due_date timestamp with time zone,
  completed_at timestamp with time zone,
  completed_by uuid references public.profiles(id) on delete set null,
  completion_note text,
  tags text[] default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.app_activity_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete set null,
  user_email text,
  action text not null default 'dashboard_access_ping',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.app_activity_logs enable row level security;

create policy "Allow public all" on public.profiles for all using (true);
create policy "Allow public all" on public.tasks for all using (true);
create policy "Allow public all" on public.app_activity_logs for all using (true);

alter publication supabase_realtime add table public.tasks, public.profiles;`;

    navigator.clipboard.writeText(schemaText);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg rounded-3xl glass-panel border border-slate-700/80 shadow-2xl p-6 relative animate-slide-up max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <Database size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Supabase Backend & Realtime
            </h3>
            <p className="text-xs text-slate-400">
              Connect to your live Supabase cloud instance or use Local Multi-Tab Demo mode
            </p>
          </div>
        </div>

        {/* Current Mode Badge */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-3 h-3 rounded-full ${
                isSupabaseLive ? 'bg-emerald-400 animate-pulse' : 'bg-indigo-400'
              }`}
            />
            <div>
              <span className="text-xs font-bold text-slate-200 block">
                {isSupabaseLive ? 'Connected to Supabase Realtime' : 'Local Multi-Tab Demo Engine'}
              </span>
              <span className="text-[11px] text-slate-400">
                {isSupabaseLive
                  ? 'Real-time database triggers active on tasks & profiles'
                  : 'Syncing across tabs via BroadcastChannel & localStorage'}
              </span>
            </div>
          </div>

          <button
            onClick={copySqlSchema}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 transition-colors border border-slate-700"
          >
            {copiedSql ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            {copiedSql ? 'SQL Copied!' : 'Copy SQL'}
          </button>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSaveAndConnect} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Supabase Project URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-project.supabase.co"
              className="w-full rounded-xl glass-input px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Supabase Anon Key
            </label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full rounded-xl glass-input px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 font-mono"
            />
          </div>

          {statusMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-medium ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-950/50 border border-emerald-800 text-emerald-300'
                  : 'bg-rose-950/50 border border-rose-800 text-rose-300'
              }`}
            >
              {statusMsg.text}
            </div>
          )}

          <div className="pt-2 flex items-center justify-between border-t border-slate-800/80">
            <button
              type="button"
              onClick={resetToDefaultData}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              Reset Sample Demo Data
            </button>

            <div className="flex items-center gap-2">
              {isSupabaseLive && (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                >
                  Disconnect
                </button>
              )}
              <button
                type="submit"
                disabled={isTesting}
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Zap size={14} />
                {isTesting ? 'Connecting...' : 'Save & Connect'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
