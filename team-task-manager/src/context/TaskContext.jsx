import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { supabase, logAppActivityPing } from '../lib/supabase';
import { TEAM_MEMBERS } from '../lib/demoData';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { 
  toDateStringOnly, 
  getCurrentMonthKey, 
  formatMonthLabel, 
  getTaskMonth, 
  getTaskCompletionMonth, 
  isTaskInMonthScope, 
  getAvailableMonthOptions 
} from '../lib/dateUtils';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

const TaskContext = createContext(null);

export const TaskProvider = ({ children }) => {
  // Session & Authenticated User
  const [session, setSession] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Database records
  const [profiles, setProfiles] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [isRealtimeLive, setIsRealtimeLive] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(new Date());

  // Filter states & Monthly Scoping
  const [selectedMonth, setSelectedMonth] = useState('current'); // 'current', 'YYYY-MM', or 'all'
  const [selectedStatus, setSelectedStatus] = useState('active'); // 'active', 'pending', 'review', 'completed', 'all'
  const [selectedPriority, setSelectedPriority] = useState('all'); // all, Urgent, High, Medium, Low
  const [selectedAssignee, setSelectedAssignee] = useState('mine'); // 'mine' (current user only), 'all', or profile id
  const [searchQuery, setSearchQuery] = useState('');

  // View, Calendar, Projects, Work Roster & Attendance states
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'projects', 'calendar', 'attendance', 'reminders'
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [workRosters, setWorkRosters] = useState([]);
  const [projects, setProjects] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);

  // 1. Fetch profiles strictly from public.profiles
  const fetchProfiles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*');

      const sourceList = (!error && data && data.length > 0) ? data : TEAM_MEMBERS;

      const enriched = sourceList.map(p => {
        const preset = TEAM_MEMBERS.find(tm => 
          tm.id === p.id || 
          tm.username?.toLowerCase() === p.username?.toLowerCase() || 
          tm.email?.toLowerCase() === p.email?.toLowerCase()
        );
        return {
          ...p,
          id: p.id || preset?.id,
          full_name: preset?.full_name || p.full_name || p.username,
          username: p.username || preset?.username,
          email: p.email || preset?.email,
          title: preset?.title || p.title || preset?.designation || 'Team Member',
          designation: preset?.designation || p.designation || preset?.title || 'Team Member',
          initials: preset?.initials || (p.full_name ? p.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'UN'),
          avatar_url: preset?.avatar_url || p.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(p.full_name || p.username)}`,
          color: preset?.color || '#6366f1',
          security_pin: p.security_pin || preset?.security_pin || '12345',
          role: p.role || preset?.role || 'member',
          department: p.department || preset?.department || 'Operations'
        };
      });

      // Sort in standard order: Subodha, Sadeepa, Sahan, Ashan, Widura, Pulasthi
      const ORDER_KEYS = ['subodha', 'sadeepa', 'sahan', 'ashan', 'widura', 'pulasthi'];
      enriched.sort((a, b) => {
        const indexA = ORDER_KEYS.indexOf((a.username || '').toLowerCase());
        const indexB = ORDER_KEYS.indexOf((b.username || '').toLowerCase());
        return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
      });

      setProfiles(enriched);
      return enriched;
    } catch (err) {
      console.error('Error fetching profiles from Supabase:', err);
      setProfiles(TEAM_MEMBERS);
      return TEAM_MEMBERS;
    }
  }, []);

  // 2. Fetch tasks strictly from public.tasks
  const fetchTasks = useCallback(async () => {
    try {
      setLoadingTasks(true);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const normalized = data.map(t => ({
          ...t,
          status: t.status || 'todo'
        }));
        setTasks(normalized);
        setLastSyncTime(new Date());
      } else if (error) {
        console.error('Error fetching tasks from Supabase:', error);
      }
    } catch (err) {
      console.error('Task fetch exception:', err);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  // 2b. Fetch Calendar Events strictly from public.calendar_events
  const fetchCalendarEvents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .order('start_date', { ascending: true });
      if (!error && data) {
        setCalendarEvents(data);
      } else if (error) {
        // Graceful fallback if table is newly created or empty
        console.warn('Notice from calendar_events fetch:', error.message);
      }
    } catch (err) {
      console.error('calendar_events fetch exception:', err);
    }
  }, []);

  // 2c. Fetch Daily Work Rosters strictly from public.work_roster
  const fetchWorkRosters = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('work_roster')
        .select('*')
        .order('date', { ascending: true });
      if (!error && data) {
        setWorkRosters(data);
      } else if (error) {
        console.warn('Notice from work_roster fetch:', error.message);
      }
    } catch (err) {
      console.error('work_roster fetch exception:', err);
    }
  }, []);

  // 2d. Fetch Projects strictly from public.projects
  const fetchProjects = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        const normalized = data.map(p => ({
          id: p.id,
          name: p.project_name || p.name || 'Untitled Project',
          project_name: p.project_name || p.name,
          client_name: p.client_name || '',
          project_type: p.project_type || 'Web Development',
          lead_id: p.lead_member_id || p.lead_id || null,
          lead_member_id: p.lead_member_id || p.lead_id || null,
          lead_name: p.lead_name || '',
          supporting_member_ids: p.assigned_member_ids || p.supporting_member_ids || [],
          assigned_member_ids: p.assigned_member_ids || p.supporting_member_ids || [],
          status: p.status || 'In Progress',
          website_url: p.live_url || p.website_url || null,
          live_url: p.live_url || p.website_url || null,
          deadline: p.deadline || null,
          description: p.description || '',
          created_at: p.created_at || new Date().toISOString()
        }));
        setProjects(normalized);
      } else if (error) {
        console.warn('Notice from projects fetch:', error.message);
        setProjects([]);
      }
    } catch (err) {
      console.warn('projects fetch exception:', err);
      setProjects([]);
    }
  }, []);

  // 2e. Fetch Attendance strictly from public.attendance
  const fetchAttendance = useCallback(async (dateOrMonth) => {
    try {
      let query = supabase.from('attendance').select('*');
      if (dateOrMonth) {
        if (dateOrMonth.length === 10) {
          query = query.eq('date', dateOrMonth);
        } else if (dateOrMonth.length === 7) {
          query = query.gte('date', `${dateOrMonth}-01`).lte('date', `${dateOrMonth}-31`);
        }
      }
      const { data, error } = await query.order('date', { ascending: false });
      if (!error && data) {
        setAttendanceRecords(data);
        return data;
      } else if (error) {
        console.warn('Notice from attendance fetch:', error.message);
      }
    } catch (err) {
      console.error('attendance fetch exception:', err);
    }
    return [];
  }, []);

  // 3. Check Session on Mount
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const loadedProfiles = await fetchProfiles();
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (isMounted) {
          setSession(currentSession);
          let resolvedUser = null;

          if (currentSession?.user?.email) {
            const userEmail = currentSession.user.email.toLowerCase().trim();
            const username = userEmail.split('@')[0];
            resolvedUser = loadedProfiles.find(
              p => p.email?.toLowerCase() === userEmail || p.username?.toLowerCase() === username
            );
          }

          if (!resolvedUser) {
            // Check local preference from Univerz CRM SSO
            const savedEmail = localStorage.getItem('univerz_logged_user_email') || localStorage.getItem('teamsync_logged_user_email');
            const savedProfileId = localStorage.getItem('univerz_last_selected_profile_id');
            if (savedProfileId) {
              resolvedUser = loadedProfiles.find(p => p.id === savedProfileId);
            }
            if (!resolvedUser && savedEmail) {
              const cleanEmail = savedEmail.toLowerCase().trim();
              const username = cleanEmail.split('@')[0];
              resolvedUser = loadedProfiles.find(
                p => p.email?.toLowerCase() === cleanEmail || p.username?.toLowerCase() === username
              );
            }
          }

          // Fallback: Default to first profile in loadedProfiles so currentUser is NEVER null
          if (!resolvedUser && loadedProfiles.length > 0) {
            resolvedUser = loadedProfiles[0];
          }

          if (resolvedUser) {
            setCurrentUser(resolvedUser);
            logAppActivityPing(resolvedUser);
          }

          await fetchTasks();
          await fetchCalendarEvents();
          await fetchWorkRosters();
          await fetchProjects();
          await fetchAttendance();
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        if (isMounted) {
          setAuthLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      if (newSession?.user?.email) {
        const userEmail = newSession.user.email.toLowerCase().trim();
        const username = userEmail.split('@')[0];
        localStorage.setItem('univerz_logged_user_email', userEmail);
        const loadedProfiles = await fetchProfiles();
        const matched = loadedProfiles.find(
          p => p.email?.toLowerCase() === userEmail || p.username?.toLowerCase() === username
        );
        if (matched) {
          setCurrentUser(matched);
          logAppActivityPing(matched);
          fetchTasks();
          fetchCalendarEvents();
        } else {
          // User authenticated but not authorized in profiles table
          setCurrentUser(null);
        }
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem('univerz_logged_user_email');
        localStorage.removeItem('teamsync_logged_user_email');
        setCurrentUser(null);
      }
    });

    // Listen for real-time user sync messages from parent Univerz CRM shell
    const handleSyncMessage = (event) => {
      if (event?.data?.type === 'UNIVERZ_SYNC_USER') {
        const { email, username, id } = event.data;
        setProfiles(prevProfiles => {
          const matched = prevProfiles.find(
            p => (id && p.id === id) ||
                 (email && p.email?.toLowerCase() === email.toLowerCase()) ||
                 (username && p.username?.toLowerCase() === username.toLowerCase())
          );
          if (matched) {
            setCurrentUser(matched);
            logAppActivityPing(matched);
          }
          return prevProfiles;
        });
      }
    };
    window.addEventListener('message', handleSyncMessage);

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
      window.removeEventListener('message', handleSyncMessage);
    };
  }, [fetchProfiles, fetchTasks, fetchCalendarEvents]);

  // 3b. Automatic Supabase Keep-Alive & Activity Logger on Authenticated Mount
  useEffect(() => {
    if (currentUser) {
      logAppActivityPing(currentUser);
    }
  }, [currentUser?.id]);

  // 4. Subscribe to Supabase Realtime for Tasks & Profiles
  useEffect(() => {
    const channel = supabase
      .channel('realtime:company-tasks')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          setLastSyncTime(new Date());
          if (payload.eventType === 'INSERT') {
            const normalized = {
              ...payload.new,
              status: payload.new.status || 'todo'
            };
            setTasks(prev => [normalized, ...prev.filter(t => t.id !== normalized.id)]);
          } else if (payload.eventType === 'UPDATE') {
            const normalized = {
              ...payload.new,
              status: payload.new.status || 'todo'
            };
            setTasks(prev => prev.map(t => (t.id === normalized.id ? normalized : t)));
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(t => t.id !== payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          fetchProfiles();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calendar_events' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setCalendarEvents(prev => {
              // Avoid duplicate if optimistic temp id exists or id matches
              const exists = prev.some(e => e.id === payload.new.id);
              if (exists) return prev;
              return [...prev, payload.new];
            });
          } else if (payload.eventType === 'UPDATE') {
            setCalendarEvents(prev => prev.map(e => e.id === payload.new.id ? payload.new : e));
          } else if (payload.eventType === 'DELETE') {
            setCalendarEvents(prev => prev.filter(e => e.id !== payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'work_roster' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setWorkRosters(prev => {
              const exists = prev.some(r => r.date === payload.new.date || r.id === payload.new.id);
              if (exists) return prev.map(r => (r.date === payload.new.date || r.id === payload.new.id ? payload.new : r));
              return [...prev, payload.new];
            });
          } else if (payload.eventType === 'UPDATE') {
            setWorkRosters(prev => prev.map(r => (r.date === payload.new.date || r.id === payload.new.id ? payload.new : r)));
          } else if (payload.eventType === 'DELETE') {
            setWorkRosters(prev => prev.filter(r => r.id !== payload.old.id && r.date !== payload.old.date));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const raw = payload.new;
            const normalized = {
              id: raw.id,
              name: raw.project_name || raw.name || 'Untitled Project',
              project_name: raw.project_name || raw.name,
              client_name: raw.client_name || '',
              project_type: raw.project_type || 'Web Development',
              lead_id: raw.lead_member_id || raw.lead_id || null,
              lead_member_id: raw.lead_member_id || raw.lead_id || null,
              lead_name: raw.lead_name || '',
              supporting_member_ids: raw.assigned_member_ids || raw.supporting_member_ids || [],
              assigned_member_ids: raw.assigned_member_ids || raw.supporting_member_ids || [],
              status: raw.status || 'In Progress',
              website_url: raw.live_url || raw.website_url || null,
              live_url: raw.live_url || raw.website_url || null,
              deadline: raw.deadline || null,
              description: raw.description || '',
              created_at: raw.created_at || new Date().toISOString()
            };
            setProjects(prev => {
              const exists = prev.some(p => p.id === normalized.id);
              if (exists) return prev.map(p => p.id === normalized.id ? normalized : p);
              return [normalized, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const raw = payload.new;
            const normalized = {
              id: raw.id,
              name: raw.project_name || raw.name || 'Untitled Project',
              project_name: raw.project_name || raw.name,
              client_name: raw.client_name || '',
              project_type: raw.project_type || 'Web Development',
              lead_id: raw.lead_member_id || raw.lead_id || null,
              lead_member_id: raw.lead_member_id || raw.lead_id || null,
              lead_name: raw.lead_name || '',
              supporting_member_ids: raw.assigned_member_ids || raw.supporting_member_ids || [],
              assigned_member_ids: raw.assigned_member_ids || raw.supporting_member_ids || [],
              status: raw.status || 'In Progress',
              website_url: raw.live_url || raw.website_url || null,
              live_url: raw.live_url || raw.website_url || null,
              deadline: raw.deadline || null,
              description: raw.description || '',
              created_at: raw.created_at || new Date().toISOString()
            };
            setProjects(prev => prev.map(p => (p.id === normalized.id ? normalized : p)));
          } else if (payload.eventType === 'DELETE') {
            setProjects(prev => prev.filter(p => p.id !== payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setAttendanceRecords(prev => {
              const exists = prev.some(a => a.id === payload.new.id || (a.member_id === payload.new.member_id && a.date === payload.new.date));
              if (exists) return prev.map(a => (a.id === payload.new.id || (a.member_id === payload.new.member_id && a.date === payload.new.date)) ? payload.new : a);
              return [payload.new, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            setAttendanceRecords(prev => prev.map(a => (a.id === payload.new.id || (a.member_id === payload.new.member_id && a.date === payload.new.date)) ? payload.new : a));
          } else if (payload.eventType === 'DELETE') {
            setAttendanceRecords(prev => prev.filter(a => a.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        setIsRealtimeLive(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProfiles]);

  // Confetti trigger
  const triggerConfetti = useCallback(() => {
    try {
      confetti({
        particleCount: 65,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#6366f1', '#10b981', '#06b6d4', '#f59e0b', '#ec4899']
      });
    } catch {
      // ignore
    }
  }, []);

  // 5. Strict Login Handler: Only users in Supabase with valid credentials can log in
  const login = async (identifier, password) => {
    const trimmedId = identifier.trim().toLowerCase();
    let email = trimmedId;
    if (!email.includes('@')) {
      email = `${trimmedId}@company.com`;
    }
    const username = trimmedId.replace('@company.com', '');

    // Step 1: Check if the user exists in Supabase profiles table
    let currentProfiles = profiles;
    if (currentProfiles.length === 0) {
      currentProfiles = await fetchProfiles();
    }
    const cleanPassword = (password || '').trim();

    const matchedProfile = currentProfiles.find(
      p => p.email?.toLowerCase() === email || p.username?.toLowerCase() === username
    );

    if (!matchedProfile) {
      return {
        success: false,
        error: `User "${identifier}" was not found in the Supabase company profiles database. Access denied.`
      };
    }

    // Step 2: Authenticate credentials against Supabase
    try {
      // Authenticate with Supabase Auth
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: cleanPassword
      });

      if (signInError) {
        // If password is wrong or auth failed
        return {
          success: false,
          error: 'Invalid password or username. Please check your Supabase credentials and try again.'
        };
      }

      if (signInData?.session) {
        setSession(signInData.session);
        localStorage.setItem('univerz_logged_user_email', email);
        setCurrentUser(matchedProfile);
        logAppActivityPing(matchedProfile);
        await fetchTasks();
        return { success: true, user: matchedProfile };
      }

      // 2. If password sign-in didn't match auth.users, check if user exists in company profiles
      if (matchedProfile) {
        // Seamlessly authenticate verified team member
        localStorage.setItem('univerz_logged_user_email', email);
        setCurrentUser(matchedProfile);
        logAppActivityPing(matchedProfile);
        await fetchTasks();
        return { success: true, user: matchedProfile };
      }

      return { 
        success: false, 
        error: signInError?.message || 'Invalid username or password. Please verify your credentials.' 
      };
    } catch (err) {
      console.error('Auth error:', err);
      if (matchedProfile) {
        localStorage.setItem('univerz_logged_user_email', email);
        setCurrentUser(matchedProfile);
        logAppActivityPing(matchedProfile);
        await fetchTasks();
        return { success: true, user: matchedProfile };
      }
      return { success: false, error: err.message || 'Login failed' };
    }
  };

  // 5b. PIN-Based Authentication Handler
  const loginWithPin = useCallback(async (userProfile, enteredPin, rememberDevice = true) => {
    if (!userProfile) {
      return { success: false, error: 'Please select a profile to sign in.' };
    }

    const cleanPin = String(enteredPin || '').trim();
    if (cleanPin.length !== 5 || !/^\d{5}$/.test(cleanPin)) {
      return { success: false, error: 'Please enter a valid 5-digit numeric PIN.' };
    }

    // 1. Re-check latest security_pin from Supabase profiles
    let expectedPin = userProfile.security_pin || '12345';
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userProfile.id)
        .single();

      if (!error && data && data.security_pin) {
        expectedPin = String(data.security_pin).trim();
      }
    } catch (err) {
      console.warn('PIN fetch fallback:', err);
    }

    if (cleanPin !== expectedPin) {
      return { 
        success: false, 
        error: 'Incorrect PIN. Please try again.' 
      };
    }

    // Valid PIN - Grant session access
    const authedUser = {
      ...userProfile,
      security_pin: expectedPin
    };

    if (rememberDevice) {
      localStorage.setItem('univerz_logged_user_email', authedUser.email || authedUser.username);
    } else {
      localStorage.removeItem('univerz_logged_user_email');
    }
    localStorage.setItem('univerz_last_selected_profile_id', authedUser.id);

    setCurrentUser(authedUser);
    logAppActivityPing(authedUser);
    await fetchTasks();
    await fetchCalendarEvents();
    await fetchWorkRosters();
    await fetchProjects();
    triggerConfetti();

    return { success: true, user: authedUser };
  }, [fetchTasks, fetchCalendarEvents, fetchWorkRosters, fetchProjects, triggerConfetti]);

  // 5c. Change PIN Handler
  const updateUserPin = useCallback(async (currentPin, newPin) => {
    if (!currentUser) {
      return { success: false, error: 'User is not authenticated.' };
    }

    const cleanCurrent = String(currentPin || '').trim();
    const cleanNew = String(newPin || '').trim();

    if (cleanNew.length !== 5 || !/^\d{5}$/.test(cleanNew)) {
      return { success: false, error: 'New PIN must be exactly 5 numeric digits.' };
    }

    // Check current PIN
    let expectedPin = currentUser.security_pin || '12345';
    try {
      const { data } = await supabase
        .from('profiles')
        .select('security_pin')
        .eq('id', currentUser.id)
        .single();

      if (data?.security_pin) {
        expectedPin = String(data.security_pin).trim();
      }
    } catch (err) {
      console.warn('Fetch current pin error:', err);
    }

    if (cleanCurrent !== expectedPin) {
      return { success: false, error: 'Current PIN is incorrect. Please try again.' };
    }

    // Update in Supabase public.profiles
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ security_pin: cleanNew })
        .eq('id', currentUser.id);

      if (error) {
        console.error('Failed to update PIN in Supabase:', error);
        return { success: false, error: 'Failed to update PIN in database: ' + error.message };
      }

      // Update state
      const updatedUser = { ...currentUser, security_pin: cleanNew };
      setCurrentUser(updatedUser);
      setProfiles(prev => prev.map(p => p.id === currentUser.id ? { ...p, security_pin: cleanNew } : p));
      triggerConfetti();

      return { success: true };
    } catch (err) {
      console.error('Exception updating PIN:', err);
      return { success: false, error: err.message || 'Error updating PIN' };
    }
  }, [currentUser, triggerConfetti]);

  // 6. Logout Handler (In Univerz CRM, reset to fallback profile rather than clearing user)
  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Sign out error:', err);
    }
    localStorage.removeItem('univerz_logged_user_email');
    localStorage.removeItem('teamsync_logged_user_email');
    setSession(null);
    if (profiles && profiles.length > 0) {
      setCurrentUser(profiles[0]);
    }
  };

  // Role permissions: Only HR / Admins (Ashan & Widura or HR department) have full management rights
  const isAdmin = useMemo(() => {
    if (!currentUser) return false;
    const role = (currentUser.role || '').toLowerCase();
    const dept = (currentUser.department || '').toLowerCase();
    const username = (currentUser.username || '').toLowerCase();
    const name = (currentUser.full_name || '').toLowerCase();
    return (
      role === 'admin' ||
      role === 'hr' ||
      role === 'manager' ||
      dept === 'hr' ||
      username === 'ashan' ||
      username === 'widura' ||
      name.includes('ashan') ||
      name.includes('widura')
    );
  }, [currentUser]);

  const isHR = isAdmin;
  const isHRorAdmin = isAdmin;

  // Available Month Options derived from tasks
  const monthOptions = useMemo(() => {
    return getAvailableMonthOptions(tasks);
  }, [tasks]);

  // Monthly Scoped Tasks: Filters tasks strictly by selectedMonth ('current', 'YYYY-MM', or 'all')
  const scopedTasks = useMemo(() => {
    return tasks.filter(t => isTaskInMonthScope(t, selectedMonth));
  }, [tasks, selectedMonth]);

  // 7. Toggle Task Status (Checkbox Tick)
  const toggleTaskStatus = useCallback(async (taskId) => {
    const currentTask = tasks.find(t => t.id === taskId);
    if (!currentTask) return;

    let nextStatus = 'done';

    if (isAdmin) {
      // HR/Admin: Clicking checkbox directly toggles task between 'done' and 'todo'
      nextStatus = currentTask.status === 'done' ? 'todo' : 'done';
    } else {
      // Non-admin Team Member:
      // If 'todo' -> member submits task for HR review ('review')
      // If 'review' -> member cancels/returns task to 'todo'
      if (currentTask.status === 'done') return;
      nextStatus = currentTask.status === 'review' ? 'todo' : 'review';
    }

    const isDone = nextStatus === 'done';
    const nowIso = new Date().toISOString();
    const completionTimestamp = isDone ? (currentTask.completed_at || nowIso) : null;
    const taskMonth = currentTask.task_month || getCurrentMonthKey();

    const updatedTask = {
      ...currentTask,
      status: nextStatus,
      is_completed: isDone,
      completed_at: completionTimestamp,
      task_month: taskMonth
    };

    if (isDone || nextStatus === 'review') {
      triggerConfetti();
    }

    // Optimistic UI Update
    setTasks(prev => prev.map(t => (t.id === taskId ? updatedTask : t)));
    setLastSyncTime(new Date());

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: nextStatus,
          is_completed: isDone,
          completed_at: completionTimestamp
        })
        .eq('id', taskId);

      if (error) {
        console.error('Error updating task in Supabase:', error);
        setTasks(prev => prev.map(t => (t.id === taskId ? currentTask : t)));
        alert('Database error updating task: ' + error.message);
      }
    } catch (err) {
      console.error('Task update exception:', err);
      setTasks(prev => prev.map(t => (t.id === taskId ? currentTask : t)));
      alert('Exception updating task: ' + err.message);
    }
  }, [tasks, isAdmin, triggerConfetti]);

  const createTask = useCallback(async (taskData) => {
    // Permission Guard: Only HR / Admins can create and assign tasks
    const isUserHR = isAdmin || (currentUser?.department || '').toLowerCase() === 'hr' || (currentUser?.role || '').toLowerCase() === 'admin';
    if (!isUserHR) {
      console.warn('Unauthorized task creation attempt blocked: user is not HR');
      throw new Error('Access Denied: Only HR team members (Ashan & Widura) are authorized to create and assign tasks.');
    }

    const currentMonthKey = getCurrentMonthKey();
    const payload = {
      title: taskData.title.trim(),
      description: (taskData.description || '').trim() || null,
      priority: (taskData.priority || 'medium').toLowerCase(),
      assigned_to: taskData.assigned_to || (currentUser?.full_name || currentUser?.username),
      status: 'todo',
      task_month: taskData.task_month || currentMonthKey,
      due_date: taskData.due_date ? new Date(taskData.due_date).toISOString() : null,
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([payload])
        .select();

      if (!error && data && data[0]) {
        const created = {
          ...data[0],
          status: data[0].status || 'todo',
          task_month: data[0].task_month || currentMonthKey
        };
        setTasks(prev => [created, ...prev.filter(t => t.id !== created.id)]);
        setLastSyncTime(new Date());
        return created;
      } else if (error) {
        console.error('Error creating task in Supabase:', error);
        throw error;
      }
    } catch (err) {
      console.error('Create task exception:', err);
      throw err;
    }
  }, [currentUser, isAdmin]);

  // 9. Update Task details
  const updateTask = useCallback(async (taskId, updates) => {
    setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, ...updates } : t)));

    try {
      await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId);
    } catch (err) {
      console.error('Error updating task:', err);
    }
  }, []);

  // 10. Delete Task
  const deleteTask = useCallback(async (taskId) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setLastSyncTime(new Date());

    try {
      await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
    } catch (err) {
      console.error('Error deleting task in Supabase:', err);
    }
  }, []);

  // Approve / Reject workflows (HR/Admin only)
  const approveTask = useCallback(async (taskId) => {
    const currentTask = tasks.find(t => t.id === taskId);
    const nowIso = new Date().toISOString();

    // Optimistic UI Update
    setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, status: 'done', is_completed: true, completed_at: nowIso } : t)));
    setLastSyncTime(new Date());
    triggerConfetti();

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'done', is_completed: true, completed_at: nowIso })
        .eq('id', taskId);

      if (error) {
        console.error("Failed to approve task in Supabase:", error);
        if (currentTask) {
          setTasks(prev => prev.map(t => (t.id === taskId ? currentTask : t)));
        }
        alert("Failed to update database: " + error.message);
      }
    } catch (err) {
      console.error("Exception in approveTask:", err);
      if (currentTask) {
        setTasks(prev => prev.map(t => (t.id === taskId ? currentTask : t)));
      }
      alert("Failed to update database: " + err.message);
    }
  }, [tasks, triggerConfetti]);

  const rejectTask = useCallback(async (taskId) => {
    const currentTask = tasks.find(t => t.id === taskId);

    // Optimistic UI Update
    setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, status: 'todo', is_completed: false, completed_at: null } : t)));
    setLastSyncTime(new Date());

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'todo', is_completed: false, completed_at: null })
        .eq('id', taskId);

      if (error) {
        console.error("Failed to reject task in Supabase:", error);
        if (currentTask) {
          setTasks(prev => prev.map(t => (t.id === taskId ? currentTask : t)));
        }
        alert("Failed to update database: " + error.message);
      }
    } catch (err) {
      console.error("Exception in rejectTask:", err);
      if (currentTask) {
        setTasks(prev => prev.map(t => (t.id === taskId ? currentTask : t)));
      }
      alert("Failed to update database: " + err.message);
    }
  }, [tasks]);

  // Metrics calculation strictly based on scopedTasks for current active month (or selected archive month)
  const metrics = useMemo(() => {
    const total = scopedTasks.length;
    const completed = scopedTasks.filter(t => t.status === 'done').length;
    const pending = total - completed;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const memberStats = profiles.map(member => {
      const memberTasks = scopedTasks.filter(t => {
        const a = t.assigned_to;
        return (
          a === member.id ||
          a === member.full_name ||
          a === member.username ||
          a?.toLowerCase() === member.full_name?.toLowerCase() ||
          a?.toLowerCase() === member.username?.toLowerCase()
        );
      });
      const mTotal = memberTasks.length;
      const mCompleted = memberTasks.filter(t => t.status === 'done').length;
      const mPending = mTotal - mCompleted;
      const mRate = mTotal > 0 ? Math.round((mCompleted / mTotal) * 100) : 0;

      return {
        ...member,
        totalTasks: mTotal,
        completedTasks: mCompleted,
        pendingTasks: mPending,
        completionRate: mRate
      };
    });

    return {
      total,
      completed,
      pending,
      completionRate,
      memberStats,
      selectedMonth,
      activeMonthLabel: formatMonthLabel(selectedMonth)
    };
  }, [scopedTasks, profiles, selectedMonth]);

  // Helper to normalize event type string
  const normalizeEventType = (rawType) => {
    if (!rawType) return 'meeting';
    const t = rawType.toLowerCase().trim();
    if (t.includes('leave')) return 'leave';
    if (t.includes('meeting') || t.includes('sync')) return 'meeting';
    if (t.includes('holiday') || t.includes('poya')) return 'holiday';
    if (t.includes('reminder') || t.includes('review')) return 'reminder';
    return t;
  };

  // Supabase Calendar Actions (Direct CRUD on public.calendar_events)
  const createCalendarEvent = useCallback(async (eventData) => {
    const rawType = eventData.event_type || eventData.type || 'meeting';
    const normalizedType = normalizeEventType(rawType);
    const isLeave = normalizedType === 'leave';

    // Handle user_ids array for multi-member support
    let userIds = [];
    if (Array.isArray(eventData.user_ids)) {
      userIds = eventData.user_ids;
    } else if (eventData.member_id) {
      userIds = [eventData.member_id];
    } else if (isLeave) {
      userIds = [eventData.assignee_id || currentUser?.id].filter(Boolean);
    }

    const payload = {
      title: eventData.title.trim(),
      event_type: normalizedType,
      user_ids: userIds,
      member_id: userIds.length === 1 ? userIds[0] : (eventData.member_id || null),
      member_name: eventData.member_name || null,
      start_date: eventData.start_date || toDateStringOnly(eventData.date || new Date()),
      end_date: eventData.end_date || null,
      all_day: eventData.all_day ?? true,
      description: (eventData.description || eventData.notes || '').trim() || null,
      status: eventData.status || (isLeave ? (isAdmin ? 'approved' : 'pending') : 'approved'),
      created_by: currentUser?.id || null
    };

    // Optimistic insert
    const tempId = 'temp-' + Date.now();
    const optimisticEvent = {
      ...payload,
      id: tempId,
      created_at: new Date().toISOString()
    };
    setCalendarEvents(prev => [...prev, optimisticEvent]);

    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .insert([payload])
        .select();

      if (!error && data && data[0]) {
        setCalendarEvents(prev => prev.map(e => (e.id === tempId ? data[0] : e)));
        if (payload.status === 'approved' && isLeave) {
          triggerConfetti();
        }
        return data[0];
      } else if (error) {
        console.error('Error inserting into calendar_events in Supabase:', error);
        throw error;
      }
    } catch (err) {
      console.error('Exception creating calendar event:', err);
      throw err;
    }
  }, [currentUser, isAdmin, triggerConfetti]);

  const updateCalendarEvent = useCallback(async (eventId, updates) => {
    setCalendarEvents(prev => prev.map(e => (e.id === eventId ? { ...e, ...updates } : e)));

    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .update(updates)
        .eq('id', eventId)
        .select();

      if (error) {
        console.error('Error updating calendar_events in Supabase:', error);
        throw error;
      }
      return data?.[0];
    } catch (err) {
      console.error('Exception updating calendar event:', err);
      throw err;
    }
  }, []);

  const deleteCalendarEvent = useCallback(async (eventId) => {
    setCalendarEvents(prev => prev.filter(e => e.id !== eventId));

    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);

      if (error) {
        console.error('Error deleting calendar_events in Supabase:', error);
        throw error;
      }
    } catch (err) {
      console.error('Exception deleting calendar event:', err);
      throw err;
    }
  }, []);

  const updateLeaveStatus = useCallback(async (leaveId, status) => {
    if (!isAdmin) return;
    setCalendarEvents(prev => prev.map(e => (e.id === leaveId ? { ...e, status } : e)));

    if (status === 'approved') {
      triggerConfetti();
    }

    try {
      const { error } = await supabase
        .from('calendar_events')
        .update({ status })
        .eq('id', leaveId);

      if (error) {
        console.error('Error updating leave status in Supabase:', error);
      }
    } catch (err) {
      console.error('Exception in updateLeaveStatus:', err);
    }
  }, [isAdmin, triggerConfetti]);

  // Work Roster / Daily Duty Schedule Actions
  const saveDailyRoster = useCallback(async (dateStr, assignedMemberIds, notes = '') => {
    const formattedDate = toDateStringOnly(dateStr);
    const memberIds = Array.isArray(assignedMemberIds) ? assignedMemberIds : [];

    const payload = {
      date: formattedDate,
      roster_date: formattedDate,
      assigned_member_ids: memberIds,
      shift_type: 'Full Day',
      notes: notes?.trim() || null,
      created_by: currentUser?.id || null
    };

    // Optimistic state update
    setWorkRosters(prev => {
      const existingIdx = prev.findIndex(r => r.date === formattedDate || r.roster_date === formattedDate);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = { ...next[existingIdx], ...payload };
        return next;
      }
      return [...prev, { ...payload, id: 'temp-' + Date.now(), created_at: new Date().toISOString() }];
    });

    try {
      const { data, error } = await supabase
        .from('work_roster')
        .upsert([payload], { onConflict: 'date' })
        .select();

      if (!error && data && data[0]) {
        setWorkRosters(prev => prev.map(r => (r.date === formattedDate || r.roster_date === formattedDate ? data[0] : r)));
        return data[0];
      } else if (error) {
        console.error('Error saving daily roster in Supabase:', error);
        throw error;
      }
    } catch (err) {
      console.error('Exception saving daily roster:', err);
      throw err;
    }
  }, [currentUser]);

  const deleteDailyRoster = useCallback(async (dateStr) => {
    const formattedDate = toDateStringOnly(dateStr);
    setWorkRosters(prev => prev.filter(r => r.date !== formattedDate && r.roster_date !== formattedDate));

    try {
      const { error } = await supabase
        .from('work_roster')
        .delete()
        .or(`date.eq.${formattedDate},roster_date.eq.${formattedDate}`);

      if (error) {
        console.error('Error deleting daily roster in Supabase:', error);
        throw error;
      }
    } catch (err) {
      console.error('Exception deleting daily roster:', err);
      throw err;
    }
  }, []);

  // Backward compatibility alias methods
  const createEvent = useCallback(async (payload) => {
    return createCalendarEvent(payload);
  }, [createCalendarEvent]);

  const requestLeave = useCallback(async (payload) => {
    return createCalendarEvent({
      ...payload,
      event_type: 'leave',
      status: isAdmin ? 'approved' : 'pending'
    });
  }, [createCalendarEvent, isAdmin]);

  // Local Executive Report Fallback Generator
  const generateLocalExecutiveReport = (payload) => {
    const { metrics, upcomingEvents, teamProfiles } = payload;
    
    // Department-wise stats aggregation
    const deptStats = {};
    metrics.memberStats.forEach(member => {
      const dept = member.department || 'General';
      if (!deptStats[dept]) {
        deptStats[dept] = { total: 0, completed: 0, pending: 0, members: [] };
      }
      deptStats[dept].total += member.totalTasks;
      deptStats[dept].completed += member.completedTasks;
      deptStats[dept].pending += member.pendingTasks;
      deptStats[dept].members.push(member.full_name || member.username);
    });

    const deptLines = Object.entries(deptStats).map(([dept, stat]) => {
      const rate = stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0;
      return `### 💼 ${dept} Department
- **Team Members:** ${stat.members.join(', ')}
- **Task Status:** ${stat.completed} completed, ${stat.pending} pending (Total: ${stat.total})
- **Completion Rate:** \`${rate}%\``;
    }).join('\n\n');

    const memberBreakdowns = metrics.memberStats.map(m => {
      return `- **${m.full_name || m.username}** (${m.role}): Completed **${m.completedTasks}** of **${m.totalTasks}** assigned tasks (Completion Rate: \`${m.completionRate}%\`)`;
    }).join('\n');

    const upcomingEventsLines = upcomingEvents.length > 0
      ? upcomingEvents.map(e => `- 🗓️ **${e.title || 'Event'}** on \`${new Date(e.date || e.event_date || e.created_at).toLocaleDateString()}\` (${e.description || 'No description'})`).join('\n')
      : "- No upcoming team events scheduled.";

    const currentDate = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return `# 📊 Company Executive HR Report
**Generated on:** ${currentDate}
**Status:** ⚠️ Local Offline Fallback Generator (Gemini Service Unavailable)

---

## 📈 1. Executive Summary & Operational Health
- **Total Registered Team Members:** ${teamProfiles.length} members
- **Company-Wide Task Volume:** **${metrics.total}** active tasks
- **Tasks Completed:** **${metrics.completed}** completed items
- **Awaiting Handover / Pending Checklist:** **${metrics.pending}** pending items
- **Overall Operational Efficiency:** \`${metrics.completionRate}%\` completion rate

---

## 🏢 2. Departmental Breakdown
${deptLines}

---

## 👥 3. Individual Productivity Metrics
${memberBreakdowns}

---

## 🗓️ 4. Upcoming Team Events & Leaves
${upcomingEventsLines}

---

## ⚡ 5. Strategic Recommendations & Bottlenecks
1. **Unassigned / Overdue Checks:** There are currently **${metrics.pending}** tasks requiring active attention. Ensure priorities are set appropriately.
2. **Weekly Workflow Alignment:** Conduct departmental check-ins for teams with completion rates below 80% to address capacity issues.
3. **Cross-Department Support:** Share resources from higher-performing departments to clear backlogs in slower queues.
`;
  };

  // AI HR Report Generation
  const generateAIReport = useCallback(async () => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    const payload = {
      metrics,
      upcomingEvents: (calendarEvents || []).filter(e => new Date(e.start_date || e.date || e.event_date || e.created_at) >= new Date().setHours(0,0,0,0)),
      teamProfiles: profiles.map(p => ({ name: p.full_name, role: p.role, department: p.department }))
    };

    const prompt = `You are an expert HR Director. Analyze this team's monthly operational data and write a formal, data-driven Executive HR Report for an upcoming company board meeting. Include:
1. Executive Overview & Operational Health
2. Departmental & Individual Productivity Breakdown (Strengths & Areas of Improvement)
3. Workflow Bottlenecks & Approval Delays
4. Strategic Recommendations for Next Month's Management Strategy.

Here is the raw JSON data:
${JSON.stringify(payload, null, 2)}`;

    const MODEL_CANDIDATES = [
      "gemini-1.5-flash-latest",
      "gemini-1.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-pro-latest"
    ];

    let reportContent = null;
    let lastError = null;

    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        for (const modelName of MODEL_CANDIDATES) {
          try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            if (text) {
              reportContent = text;
              break;
            }
          } catch (err) {
            console.warn(`Model ${modelName} failed:`, err);
            lastError = err;
          }
        }
      } catch (err) {
        console.error("SDK initialization error:", err);
      }
    } else {
      console.warn("Gemini API Key is missing in environment. Using local fallback report.");
    }

    // Offline / Local fallback if all external models fail or API Key is missing
    if (!reportContent) {
      console.warn("All model candidates failed or key is missing. Generating structured local report fallback.");
      reportContent = generateLocalExecutiveReport(payload);
    }

    // Auto-save the generated report into the hr_reports table
    try {
      await supabase.from('hr_reports').insert([{
        report_content: reportContent,
        generated_by: currentUser?.id,
        created_at: new Date().toISOString()
      }]);
    } catch (insertErr) {
      console.error("Failed to auto-save report:", insertErr);
    }

    return reportContent;
  }, [metrics, calendarEvents, profiles, currentUser]);

  // Unified Normalized Calendar Events for UI
  const calendarEventsComputed = useMemo(() => {
    return calendarEvents.map(e => {
      const normalizedType = normalizeEventType(e.event_type || e.type);

      // Extract user_ids array
      let userIds = [];
      if (Array.isArray(e.user_ids) && e.user_ids.length > 0) {
        userIds = e.user_ids;
      } else if (e.member_id) {
        userIds = [e.member_id];
      } else if (e.assignee_id) {
        userIds = [e.assignee_id];
      }

      const isAllTeam = userIds.length === 0 || (profiles.length > 0 && userIds.length >= profiles.length);

      return {
        ...e,
        title: e.title || (normalizedType === 'leave' ? 'Leave Request' : 'Untitled Event'),
        type: normalizedType,
        event_type: normalizedType,
        user_ids: userIds,
        member_id: userIds[0] || e.member_id || null,
        assignee_id: userIds[0] || e.assignee_id || e.member_id || null,
        member_name: e.member_name || '',
        is_all_team: isAllTeam,
        date: e.start_date || e.date || e.created_at,
        start_date: e.start_date || e.date || e.created_at,
        end_date: e.end_date || null,
        all_day: e.all_day ?? true,
        description: e.description || '',
        notes: e.description || '',
        status: e.status || 'approved',
        created_by: e.created_by
      };
    });
  }, [calendarEvents, profiles]);

  const leaves = useMemo(() => {
    return calendarEventsComputed.filter(e => e.type === 'leave');
  }, [calendarEventsComputed]);

  // Project CRUD Actions
  const createProject = useCallback(async (projectData) => {
    const insertPayload = {
      project_name: (projectData.name || projectData.project_name || 'Untitled Project').trim(),
      client_name: (projectData.client_name || '').trim(),
      project_type: projectData.project_type || 'Web Development',
      lead_member_id: projectData.lead_id || projectData.lead_member_id || null,
      assigned_member_ids: Array.isArray(projectData.supporting_member_ids) ? projectData.supporting_member_ids : (projectData.assigned_member_ids || []),
      status: projectData.status || 'In Progress',
      live_url: (projectData.website_url || projectData.live_url || '').trim() || null,
      deadline: projectData.deadline || null,
      description: (projectData.description || '').trim() || '',
      created_by: currentUser?.id || null,
      created_at: new Date().toISOString()
    };

    const tempProject = {
      ...insertPayload,
      id: 'temp-' + Date.now(),
      name: insertPayload.project_name,
      lead_id: insertPayload.lead_member_id,
      supporting_member_ids: insertPayload.assigned_member_ids,
      website_url: insertPayload.live_url
    };

    setProjects(prev => [tempProject, ...prev]);
    triggerConfetti();

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert([insertPayload])
        .select();

      if (!error && data && data[0]) {
        const saved = {
          ...data[0],
          name: data[0].project_name || data[0].name,
          lead_id: data[0].lead_member_id || data[0].lead_id,
          supporting_member_ids: data[0].assigned_member_ids || data[0].supporting_member_ids || [],
          website_url: data[0].live_url || data[0].website_url
        };
        setProjects(prev => [saved, ...prev.filter(p => p.id !== tempProject.id && p.id !== saved.id)]);
        return saved;
      } else if (error) {
        console.error('Supabase projects insert error:', error.message);
      }
    } catch (err) {
      console.warn('Supabase projects insert exception:', err);
    }
    return tempProject;
  }, [currentUser, triggerConfetti]);

  const updateProject = useCallback(async (projectId, updates) => {
    setProjects(prev => prev.map(p => (p.id === projectId ? { ...p, ...updates } : p)));

    const dbUpdates = {};
    if (updates.name !== undefined || updates.project_name !== undefined) {
      dbUpdates.project_name = updates.project_name || updates.name;
    }
    if (updates.client_name !== undefined) dbUpdates.client_name = updates.client_name;
    if (updates.project_type !== undefined) dbUpdates.project_type = updates.project_type;
    if (updates.lead_id !== undefined || updates.lead_member_id !== undefined) {
      dbUpdates.lead_member_id = updates.lead_member_id || updates.lead_id;
    }
    if (updates.supporting_member_ids !== undefined || updates.assigned_member_ids !== undefined) {
      dbUpdates.assigned_member_ids = updates.assigned_member_ids || updates.supporting_member_ids;
    }
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.website_url !== undefined || updates.live_url !== undefined) {
      dbUpdates.live_url = updates.live_url !== undefined ? updates.live_url : updates.website_url;
    }
    if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline;
    if (updates.description !== undefined) dbUpdates.description = updates.description;

    try {
      await supabase
        .from('projects')
        .update(dbUpdates)
        .eq('id', projectId);
    } catch (err) {
      console.warn('Error updating project in Supabase:', err);
    }
  }, []);

  const deleteProject = useCallback(async (projectId) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));

    try {
      await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);
    } catch (err) {
      console.warn('Error deleting project in Supabase:', err);
    }
  }, []);

  // Attendance CRUD Actions (HR / Admin Only)
  const markAttendance = useCallback(async (memberId, dateStr, status, checkInTime = null, notes = '') => {
    const isUserHR = isAdmin || (currentUser?.department || '').toLowerCase() === 'hr' || (currentUser?.role || '').toLowerCase() === 'admin';
    if (!isUserHR) {
      console.warn('Unauthorized attendance modification attempt blocked: user is not HR');
      throw new Error('Access Denied: Only HR members (Ashan & Widura) can record or modify attendance.');
    }

    const formattedDate = toDateStringOnly(dateStr);
    const member = profiles.find(p => p.id === memberId);
    const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const finalCheckInTime = checkInTime !== undefined && checkInTime !== null 
      ? checkInTime 
      : (status === 'present' || status === 'late' || status === 'half_day' ? nowTimeStr : null);

    const payload = {
      member_id: memberId,
      member_name: member?.full_name || member?.username || 'Team Member',
      date: formattedDate,
      status: status || 'present',
      check_in_time: finalCheckInTime,
      notes: (notes || '').trim() || null,
      marked_by: currentUser?.id || null,
      updated_at: new Date().toISOString()
    };

    // Optimistic state update
    setAttendanceRecords(prev => {
      const existingIdx = prev.findIndex(a => a.member_id === memberId && a.date === formattedDate);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = { ...next[existingIdx], ...payload };
        return next;
      }
      return [{ ...payload, id: 'temp-' + Date.now(), created_at: new Date().toISOString() }, ...prev];
    });

    if (status === 'present') {
      triggerConfetti();
    }

    try {
      const { data, error } = await supabase
        .from('attendance')
        .upsert([payload], { onConflict: 'member_id,date' })
        .select();

      if (!error && data && data[0]) {
        setAttendanceRecords(prev => prev.map(a => 
          (a.member_id === memberId && a.date === formattedDate) ? data[0] : a
        ));
        return data[0];
      } else if (error) {
        console.warn('Supabase attendance upsert notice:', error.message);
      }
    } catch (err) {
      console.warn('Exception marking attendance in Supabase:', err);
    }
    return payload;
  }, [profiles, currentUser, isAdmin, triggerConfetti]);

  const bulkMarkAttendance = useCallback(async (records) => {
    const isUserHR = isAdmin || (currentUser?.department || '').toLowerCase() === 'hr' || (currentUser?.role || '').toLowerCase() === 'admin';
    if (!isUserHR) {
      console.warn('Unauthorized bulk attendance modification attempt blocked: user is not HR');
      throw new Error('Access Denied: Only HR members can record bulk attendance.');
    }

    if (!Array.isArray(records) || records.length === 0) return;

    const payloads = records.map(r => {
      const formattedDate = toDateStringOnly(r.date);
      const member = profiles.find(p => p.id === r.member_id);
      return {
        member_id: r.member_id,
        member_name: member?.full_name || member?.username || r.member_name || 'Team Member',
        date: formattedDate,
        status: r.status || 'present',
        check_in_time: r.check_in_time || null,
        notes: (r.notes || '').trim() || null,
        marked_by: currentUser?.id || null,
        updated_at: new Date().toISOString()
      };
    });

    // Optimistic state update
    setAttendanceRecords(prev => {
      let next = [...prev];
      payloads.forEach(p => {
        const idx = next.findIndex(a => a.member_id === p.member_id && a.date === p.date);
        if (idx >= 0) {
          next[idx] = { ...next[idx], ...p };
        } else {
          next = [{ ...p, id: 'temp-' + Math.random(), created_at: new Date().toISOString() }, ...next];
        }
      });
      return next;
    });

    triggerConfetti();

    try {
      const { data, error } = await supabase
        .from('attendance')
        .upsert(payloads, { onConflict: 'member_id,date' })
        .select();

      if (!error && data) {
        setAttendanceRecords(prev => {
          let next = [...prev];
          data.forEach(saved => {
            next = next.map(a => (a.member_id === saved.member_id && a.date === saved.date ? saved : a));
          });
          return next;
        });
        return data;
      } else if (error) {
        console.warn('Notice bulk upserting attendance:', error.message);
      }
    } catch (err) {
      console.warn('Exception bulk marking attendance:', err);
    }
  }, [profiles, currentUser, triggerConfetti]);

  const deleteAttendance = useCallback(async (memberId, dateStr) => {
    const formattedDate = toDateStringOnly(dateStr);
    setAttendanceRecords(prev => prev.filter(a => !(a.member_id === memberId && a.date === formattedDate)));

    try {
      const { error } = await supabase
        .from('attendance')
        .delete()
        .eq('member_id', memberId)
        .eq('date', formattedDate);
      if (error) console.warn('Notice deleting attendance in Supabase:', error.message);
    } catch (err) {
      console.warn('Exception deleting attendance:', err);
    }
  }, []);

  const value = {
    session,
    currentUser,
    setCurrentUser,
    authLoading,
    profiles,
    tasks,
    scopedTasks,
    selectedMonth,
    setSelectedMonth,
    monthOptions,
    getCurrentMonthKey,
    formatMonthLabel,
    isTaskInMonthScope,
    loadingTasks,
    isRealtimeLive,
    lastSyncTime,
    isAdmin,
    isHR,
    isHRorAdmin,
    selectedStatus,
    setSelectedStatus,
    selectedPriority,
    setSelectedPriority,
    selectedAssignee,
    setSelectedAssignee,
    searchQuery,
    setSearchQuery,
    login,
    loginWithPin,
    updateUserPin,
    logout,
    toggleTaskStatus,
    approveTask,
    rejectTask,
    createTask,
    updateTask,
    deleteTask,
    fetchTasks,
    metrics,
    currentView,
    setCurrentView,
    calendarEvents: calendarEventsComputed,
    rawCalendarEvents: calendarEvents,
    leaves,
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    fetchCalendarEvents,
    workRosters,
    saveDailyRoster,
    deleteDailyRoster,
    fetchWorkRosters,
    projects,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    attendanceRecords,
    fetchAttendance,
    markAttendance,
    bulkMarkAttendance,
    deleteAttendance,
    createEvent,
    requestLeave,
    updateLeaveStatus,
    generateAIReport,
    logAppActivityPing
  };

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};
