import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qjhdcnkykshdbjwrnygn.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqaGRjbmt5a3NoZGJqd3JueWduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1OTIxNjksImV4cCI6MjEwMzE2ODE2OX0.Rw8jMapQ1GbLskGxc52Nk-lDZqBLcXWvQSSHiIL34io';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export const getSupabaseConfig = () => ({
  url: supabaseUrl,
  key: supabaseAnonKey,
  isConfigured: true
});

export const getSupabaseClient = () => supabase;
export const resetSupabaseClient = () => supabase;

/**
 * Silent Supabase Keep-Alive & Activity Logger
 * Runs asynchronously in the background on login / auth change / dashboard mount
 */
export const logAppActivityPing = async (user) => {
  if (!user) return;
  try {
    const userId = user.id || null;
    const userEmail = user.email || (user.username ? `${user.username}@company.com` : null);

    // 1. Lightweight insert to public.app_activity_logs
    await supabase
      .from('app_activity_logs')
      .insert({
        user_id: userId,
        user_email: userEmail,
        action: 'dashboard_access_ping'
      });

    // 2. Quick count/read on public.profiles so read database activity is actively registered
    await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });
  } catch (err) {
    // Silent catch - ensure offline or network glitches never affect UI
    console.debug('Supabase keep-alive ping notice:', err?.message);
  }
};

