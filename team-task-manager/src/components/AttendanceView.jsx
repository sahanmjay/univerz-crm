import React, { useState, useMemo } from 'react';
import { useTasks } from '../context/TaskContext';
import { 
  toDateStringOnly, 
  formatDisplayDate, 
  getCurrentMonthKey, 
  formatMonthLabel,
  getAvailableMonthOptions
} from '../lib/dateUtils';
import {
  UserCheck,
  UserX,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Users,
  Search,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Filter,
  BarChart3,
  CalendarDays,
  FileText,
  HelpCircle,
  SunMedium,
  Check
} from 'lucide-react';

const STATUS_CONFIG = {
  present: {
    label: 'Present',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    activeBg: 'bg-emerald-600',
    activeText: 'text-white',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    icon: CheckCircle2,
    shortCode: 'P'
  },
  absent: {
    label: 'Absent',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-700',
    activeBg: 'bg-rose-600',
    activeText: 'text-white',
    badgeBg: 'bg-rose-100 text-rose-800 border-rose-300',
    icon: UserX,
    shortCode: 'A'
  },
  late: {
    label: 'Late',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    activeBg: 'bg-amber-500',
    activeText: 'text-white',
    badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
    icon: Clock,
    shortCode: 'L'
  },
  half_day: {
    label: 'Half Day',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    activeBg: 'bg-blue-600',
    activeText: 'text-white',
    badgeBg: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: SunMedium,
    shortCode: 'H'
  },
  on_leave: {
    label: 'On Leave',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
    activeBg: 'bg-purple-600',
    activeText: 'text-white',
    badgeBg: 'bg-purple-100 text-purple-800 border-purple-300',
    icon: CalendarDays,
    shortCode: 'V'
  }
};

export default function AttendanceView() {
  const {
    profiles,
    workRosters,
    calendarEvents,
    attendanceRecords,
    markAttendance,
    bulkMarkAttendance,
    deleteAttendance,
    isAdmin,
    currentUser
  } = useTasks();

  const todayStr = useMemo(() => toDateStringOnly(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [viewMode, setViewMode] = useState('daily'); // 'daily' or 'monthly'
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const [searchMember, setSearchMember] = useState('');
  const [notesState, setNotesState] = useState({});
  const [checkInTimeState, setCheckInTimeState] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Today's roster record
  const currentDayRoster = useMemo(() => {
    return workRosters.find(r => r.date === selectedDate || r.roster_date === selectedDate);
  }, [workRosters, selectedDate]);

  const rosteredMemberIds = useMemo(() => {
    return Array.isArray(currentDayRoster?.assigned_member_ids) 
      ? currentDayRoster.assigned_member_ids 
      : [];
  }, [currentDayRoster]);

  // Approved leaves on selected date
  const leavesOnSelectedDate = useMemo(() => {
    return (calendarEvents || []).filter(e => {
      const isLeave = (e.event_type === 'leave' || e.type === 'leave') && (e.status === 'approved');
      if (!isLeave) return false;
      const start = toDateStringOnly(e.start_date || e.date);
      const end = toDateStringOnly(e.end_date || e.start_date || e.date);
      return selectedDate >= start && selectedDate <= end;
    });
  }, [calendarEvents, selectedDate]);

  // Attendance map for selected date: member_id -> record
  const dayAttendanceMap = useMemo(() => {
    const map = {};
    attendanceRecords.forEach(rec => {
      if (rec.date === selectedDate) {
        map[rec.member_id] = rec;
      }
    });
    return map;
  }, [attendanceRecords, selectedDate]);

  // Filtered profiles
  const filteredProfiles = useMemo(() => {
    return profiles.filter(p => {
      if (!searchMember.trim()) return true;
      const q = searchMember.toLowerCase();
      const name = (p.full_name || p.username || '').toLowerCase();
      const role = (p.role || p.designation || '').toLowerCase();
      const dept = (p.department || '').toLowerCase();
      return name.includes(q) || role.includes(q) || dept.includes(q);
    });
  }, [profiles, searchMember]);

  // Daily KPI Metrics
  const dailyMetrics = useMemo(() => {
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let halfDayCount = 0;
    let leaveCount = 0;
    let unmarkedCount = 0;
    let rosteredAbsentees = [];

    profiles.forEach(p => {
      const rec = dayAttendanceMap[p.id];
      const isRostered = rosteredMemberIds.includes(p.id);

      if (!rec) {
        unmarkedCount++;
        if (isRostered) {
          // If scheduled on roster but not yet marked
        }
      } else {
        if (rec.status === 'present') presentCount++;
        else if (rec.status === 'absent') {
          absentCount++;
          if (isRostered) {
            rosteredAbsentees.push(p);
          }
        }
        else if (rec.status === 'late') lateCount++;
        else if (rec.status === 'half_day') halfDayCount++;
        else if (rec.status === 'on_leave') leaveCount++;
      }
    });

    const totalMarked = presentCount + absentCount + lateCount + halfDayCount + leaveCount;
    const effectivePresent = presentCount + lateCount + (halfDayCount * 0.5);
    const attendancePercentage = totalMarked > 0 ? Math.round((effectivePresent / profiles.length) * 100) : 0;

    return {
      total: profiles.length,
      rosteredTotal: rosteredMemberIds.length,
      present: presentCount,
      absent: absentCount,
      late: lateCount,
      halfDay: halfDayCount,
      leave: leaveCount,
      unmarked: unmarkedCount,
      rosteredAbsentees,
      attendancePercentage
    };
  }, [profiles, dayAttendanceMap, rosteredMemberIds]);

  // Date Navigation handlers
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(toDateStringOnly(d));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(toDateStringOnly(d));
  };

  const handleSetToday = () => {
    setSelectedDate(todayStr);
  };

  const handleSetYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setSelectedDate(toDateStringOnly(d));
  };

  // Status marking handler
  const handleMarkStatus = async (memberId, status) => {
    try {
      setIsSaving(true);
      const currentTime = checkInTimeState[memberId] || (
        status === 'present' || status === 'late' || status === 'half_day'
          ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : null
      );
      const notes = notesState[memberId] !== undefined 
        ? notesState[memberId] 
        : (dayAttendanceMap[memberId]?.notes || '');

      await markAttendance(memberId, selectedDate, status, currentTime, notes);
    } catch (err) {
      console.error('Error marking attendance:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Quick Action: Mark all rostered members as present
  const handleMarkAllRosteredPresent = async () => {
    if (rosteredMemberIds.length === 0) {
      alert('No team members are scheduled on the duty roster for ' + formatDisplayDate(selectedDate));
      return;
    }

    const records = rosteredMemberIds.map(memberId => ({
      member_id: memberId,
      date: selectedDate,
      status: 'present',
      check_in_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      notes: 'Checked-in via Daily Roster auto-mark'
    }));

    try {
      setIsSaving(true);
      await bulkMarkAttendance(records);
    } catch (err) {
      console.error('Error bulk marking rostered:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Quick Action: Mark all team members as present
  const handleMarkAllTeamPresent = async () => {
    const records = profiles.map(p => ({
      member_id: p.id,
      date: selectedDate,
      status: 'present',
      check_in_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      notes: 'All team marked present'
    }));

    try {
      setIsSaving(true);
      await bulkMarkAttendance(records);
    } catch (err) {
      console.error('Error bulk marking team:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Monthly Analytics Data
  const monthlyData = useMemo(() => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10); // 1-indexed

    const daysInMonth = new Date(year, month, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1;
      const dateStr = `${yearStr}-${String(monthStr).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const d = new Date(year, month - 1, dayNum);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      return { dayNum, dateStr, isWeekend, dayName: d.toLocaleDateString('en-US', { weekday: 'narrow' }) };
    });

    // Compute stats per member
    const memberStats = profiles.map(member => {
      const recordsForMember = attendanceRecords.filter(
        r => r.member_id === member.id && r.date?.startsWith(selectedMonth)
      );

      let presentCount = 0;
      let lateCount = 0;
      let absentCount = 0;
      let halfDayCount = 0;
      let leaveCount = 0;

      recordsForMember.forEach(r => {
        if (r.status === 'present') presentCount++;
        else if (r.status === 'late') lateCount++;
        else if (r.status === 'absent') absentCount++;
        else if (r.status === 'half_day') halfDayCount++;
        else if (r.status === 'on_leave') leaveCount++;
      });

      const totalWorkedDays = presentCount + lateCount + (halfDayCount * 0.5);
      const totalRosteredDays = workRosters.filter(r => 
        r.date?.startsWith(selectedMonth) && Array.isArray(r.assigned_member_ids) && r.assigned_member_ids.includes(member.id)
      ).length;

      const workingDaysCount = days.filter(d => !d.isWeekend).length;
      const targetDays = totalRosteredDays > 0 ? totalRosteredDays : workingDaysCount;
      const attendanceRate = targetDays > 0 ? Math.min(100, Math.round((totalWorkedDays / targetDays) * 100)) : 100;

      // Map by day
      const dayMap = {};
      recordsForMember.forEach(r => {
        dayMap[r.date] = r;
      });

      return {
        member,
        presentCount,
        lateCount,
        absentCount,
        halfDayCount,
        leaveCount,
        totalWorkedDays,
        totalRosteredDays,
        attendanceRate,
        dayMap
      };
    });

    return { days, memberStats };
  }, [selectedMonth, profiles, attendanceRecords, workRosters]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header Card */}
      <div className="bg-white border border-[#e7e1d6] rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#e8f0ef] border border-[#a3c7c4] flex items-center justify-center text-[#1f5c5a]">
              <UserCheck size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#20262e] tracking-tight flex items-center gap-2">
                Team Attendance & Duty Tracking
                {isSaving && (
                  <span className="text-xs font-medium text-[#1f5c5a] animate-pulse">
                    • Saving changes...
                  </span>
                )}
              </h1>
              <p className="text-xs text-[#6f6a60]">
                Track daily attendance, verify duty roster turnouts, flag unexcused absences, and log late check-ins.
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher: Daily vs Monthly */}
        <div className="flex items-center gap-2">
          <div className="flex bg-[#f3f0e9] border border-[#e7e1d6] rounded-xl p-1">
            <button
              onClick={() => setViewMode('daily')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'daily'
                  ? 'bg-[#1f5c5a] text-white shadow-xs'
                  : 'text-[#6f6a60] hover:text-[#20262e]'
              }`}
            >
              <Calendar size={13} />
              <span>Daily Sheet</span>
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'monthly'
                  ? 'bg-[#1f5c5a] text-white shadow-xs'
                  : 'text-[#6f6a60] hover:text-[#20262e]'
              }`}
            >
              <BarChart3 size={13} />
              <span>Monthly Overview</span>
            </button>
          </div>
        </div>
      </div>

      {/* Unexcused Absence Alert Banner */}
      {viewMode === 'daily' && dailyMetrics.rosteredAbsentees.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-900 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="text-rose-600 mt-0.5 shrink-0" size={18} />
          <div className="flex-1 text-xs">
            <strong className="font-bold text-sm text-rose-800 block mb-0.5">
              ⚠️ Unexcused Absence Alert on Daily Duty Roster!
            </strong>
            <span>
              The following member(s) were scheduled on the Duty Roster for <strong>{formatDisplayDate(selectedDate)}</strong> but marked <strong>Absent</strong>:
            </span>
            <div className="flex flex-wrap gap-2 mt-2">
              {dailyMetrics.rosteredAbsentees.map(m => (
                <span key={m.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-rose-300 rounded-lg font-bold text-rose-700 shadow-2xs">
                  <span>{m.full_name || m.username}</span>
                  <span className="text-[10px] text-rose-500 font-medium">({m.role})</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Control Bar: Date Selector & Quick Bulk Actions */}
      <div className="bg-white border border-[#e7e1d6] rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Date Selector */}
        {viewMode === 'daily' ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-[#faf8f4] border border-[#e7e1d6] rounded-xl p-0.5">
              <button
                onClick={handlePrevDay}
                className="p-1.5 hover:bg-white rounded-lg text-[#6f6a60] hover:text-[#20262e] transition-colors"
                title="Previous Day"
              >
                <ChevronLeft size={16} />
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-2 py-1 bg-transparent text-xs font-bold text-[#20262e] focus:outline-none border-0"
              />
              <button
                onClick={handleNextDay}
                className="p-1.5 hover:bg-white rounded-lg text-[#6f6a60] hover:text-[#20262e] transition-colors"
                title="Next Day"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <button
              onClick={handleSetToday}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedDate === todayStr
                  ? 'bg-[#1f5c5a] text-white'
                  : 'bg-[#faf8f4] hover:bg-[#e8f0ef] text-[#1f5c5a] border border-[#e7e1d6]'
              }`}
            >
              Today
            </button>

            <button
              onClick={handleSetYesterday}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#faf8f4] hover:bg-[#e8f0ef] text-[#6f6a60] hover:text-[#20262e] border border-[#e7e1d6] transition-all"
            >
              Yesterday
            </button>

            <span className="text-xs font-semibold text-[#6f6a60] ml-1">
              📅 {formatDisplayDate(selectedDate)}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-[#20262e] flex items-center gap-1.5">
              <Calendar size={14} className="text-[#1f5c5a]" />
              <span>Select Month:</span>
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-white border border-[#e7e1d6] rounded-xl px-3 py-1.5 text-xs font-bold text-[#20262e] focus:outline-none focus:ring-1 focus:ring-[#1f5c5a]"
            >
              {getAvailableMonthOptions().filter(o => o.value !== 'current' && o.value !== 'all').map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Right: Search & Bulk Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {viewMode === 'daily' && (
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-[#6f6a60]" />
              <input
                type="text"
                placeholder="Filter member..."
                value={searchMember}
                onChange={(e) => setSearchMember(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-[#faf8f4] border border-[#e7e1d6] rounded-xl text-xs text-[#20262e] placeholder-[#6f6a60] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1f5c5a] w-36 sm:w-48 transition-all"
              />
            </div>
          )}

          {viewMode === 'daily' && (
            <>
              {rosteredMemberIds.length > 0 && (
                <button
                  onClick={handleMarkAllRosteredPresent}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#e8f0ef] hover:bg-[#d5e7e5] text-[#1f5c5a] border border-[#a3c7c4] rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                  title="Mark everyone on today's duty roster as Present"
                >
                  <Sparkles size={13} />
                  <span>Mark All Rostered ({rosteredMemberIds.length}) Present</span>
                </button>
              )}

              <button
                onClick={handleMarkAllTeamPresent}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#faf8f4] hover:bg-white text-[#20262e] border border-[#e7e1d6] rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                title="Mark all 6 team members as Present"
              >
                <Check size={13} className="stroke-[3]" />
                <span>Mark All (6) Present</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards Row (Daily Mode) */}
      {viewMode === 'daily' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Total Team */}
          <div className="bg-white border border-[#e7e1d6] rounded-2xl p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-[#6f6a60] text-xs font-semibold mb-1">
              <span>Total Team</span>
              <Users size={14} />
            </div>
            <div className="text-2xl font-black text-[#20262e]">
              {dailyMetrics.total}
            </div>
            <div className="text-[11px] text-[#6f6a60] mt-0.5">
              Active staff members
            </div>
          </div>

          {/* Rostered Today */}
          <div className="bg-white border border-[#e7e1d6] rounded-2xl p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-[#1f5c5a] text-xs font-semibold mb-1">
              <span>Duty Roster</span>
              <CalendarDays size={14} />
            </div>
            <div className="text-2xl font-black text-[#1f5c5a]">
              {dailyMetrics.rosteredTotal}
            </div>
            <div className="text-[11px] text-[#6f6a60] mt-0.5">
              Scheduled on shift
            </div>
          </div>

          {/* Present */}
          <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold mb-1">
              <span>Present</span>
              <CheckCircle2 size={14} />
            </div>
            <div className="text-2xl font-black text-emerald-700">
              {dailyMetrics.present}
            </div>
            <div className="text-[11px] text-emerald-600 mt-0.5">
              Checked-in on time
            </div>
          </div>

          {/* Absent */}
          <div className="bg-rose-50/50 border border-rose-200 rounded-2xl p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-rose-700 text-xs font-semibold mb-1">
              <span>Absent</span>
              <UserX size={14} />
            </div>
            <div className="text-2xl font-black text-rose-700">
              {dailyMetrics.absent}
            </div>
            <div className="text-[11px] text-rose-600 mt-0.5">
              {dailyMetrics.rosteredAbsentees.length > 0 ? (
                <strong className="text-rose-700">⚠️ {dailyMetrics.rosteredAbsentees.length} on roster!</strong>
              ) : (
                'Recorded absences'
              )}
            </div>
          </div>

          {/* Late */}
          <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-amber-800 text-xs font-semibold mb-1">
              <span>Late</span>
              <Clock size={14} />
            </div>
            <div className="text-2xl font-black text-amber-800">
              {dailyMetrics.late}
            </div>
            <div className="text-[11px] text-amber-700 mt-0.5">
              Delayed check-ins
            </div>
          </div>

          {/* On Leave / Half Day */}
          <div className="bg-purple-50/50 border border-purple-200 rounded-2xl p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-purple-700 text-xs font-semibold mb-1">
              <span>Leave / Half Day</span>
              <SunMedium size={14} />
            </div>
            <div className="text-2xl font-black text-purple-700">
              {dailyMetrics.leave + dailyMetrics.halfDay}
            </div>
            <div className="text-[11px] text-purple-600 mt-0.5">
              {dailyMetrics.leave} leave, {dailyMetrics.halfDay} half day
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {viewMode === 'daily' ? (
        /* DAILY ATTENDANCE CARDS */
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-[#6f6a60] uppercase tracking-wider">
              Staff Daily Attendance Sheet &bull; {formatDisplayDate(selectedDate)}
            </h2>
            <span className="text-xs font-semibold text-[#1f5c5a] bg-[#e8f0ef] px-2.5 py-0.5 rounded-full">
              Turnout: {dailyMetrics.attendancePercentage}%
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {filteredProfiles.map((member) => {
              const rec = dayAttendanceMap[member.id];
              const isRostered = rosteredMemberIds.includes(member.id);
              const currentStatus = rec?.status || null;
              const hasApprovedLeave = leavesOnSelectedDate.some(
                l => (Array.isArray(l.user_ids) && l.user_ids.includes(member.id)) || l.member_id === member.id || l.assignee_id === member.id
              );

              const checkInTime = checkInTimeState[member.id] !== undefined 
                ? checkInTimeState[member.id] 
                : (rec?.check_in_time || '');

              const note = notesState[member.id] !== undefined 
                ? notesState[member.id] 
                : (rec?.notes || '');

              const isUnexcusedAbsence = isRostered && currentStatus === 'absent';

              return (
                <div 
                  key={member.id}
                  className={`bg-white border rounded-2xl p-4 transition-all shadow-xs ${
                    isUnexcusedAbsence 
                      ? 'border-rose-300 bg-rose-50/30' 
                      : currentStatus === 'present'
                      ? 'border-emerald-200'
                      : currentStatus === 'late'
                      ? 'border-amber-200'
                      : 'border-[#e7e1d6]'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Member Info & Roster Status */}
                    <div className="flex items-start sm:items-center gap-3 min-w-[280px]">
                      {/* Avatar */}
                      <div className="relative">
                        <img
                          src={member.avatar_url}
                          alt={member.full_name || member.username}
                          className="w-12 h-12 rounded-xl object-cover border border-[#e7e1d6] shadow-2xs"
                        />
                        {/* Status Icon badge on avatar */}
                        {currentStatus && STATUS_CONFIG[currentStatus] && (
                          <div 
                            className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-black shadow-xs ${STATUS_CONFIG[currentStatus].activeBg}`}
                            title={`Status: ${STATUS_CONFIG[currentStatus].label}`}
                          >
                            {STATUS_CONFIG[currentStatus].shortCode}
                          </div>
                        )}
                      </div>

                      {/* Name & Details */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-[#20262e] leading-tight">
                            {member.full_name || member.username}
                          </h3>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#faf8f4] border border-[#e7e1d6] text-[#6f6a60]">
                            {member.role || 'Member'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          {/* Duty Roster Badge */}
                          {isRostered ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#e8f0ef] border border-[#a3c7c4] text-[#1f5c5a] rounded-lg font-bold text-[11px]">
                              <CalendarDays size={11} />
                              <span>Scheduled on Roster</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#faf8f4] border border-[#e7e1d6] text-[#6f6a60] rounded-lg text-[11px]">
                              <span>Off Roster</span>
                            </span>
                          )}

                          {/* Approved Leave Badge */}
                          {hasApprovedLeave && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 border border-purple-300 text-purple-800 rounded-lg font-bold text-[11px]">
                              <span>🏖️ Approved Leave</span>
                            </span>
                          )}

                          {/* Unexcused Flag */}
                          {isUnexcusedAbsence && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-600 text-white rounded-lg font-black text-[11px] animate-pulse">
                              <span>⚠️ Unexcused Absence</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Middle: Attendance Status Pills */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {Object.entries(STATUS_CONFIG).map(([statusKey, cfg]) => {
                        const isSelected = currentStatus === statusKey;
                        const IconComp = cfg.icon;

                        return (
                          <button
                            key={statusKey}
                            onClick={() => handleMarkStatus(member.id, statusKey)}
                            disabled={isSaving}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              isSelected
                                ? `${cfg.activeBg} ${cfg.activeText} shadow-xs ring-2 ring-offset-1 ring-${statusKey === 'present' ? 'emerald' : statusKey === 'absent' ? 'rose' : statusKey === 'late' ? 'amber' : 'purple'}-400`
                                : `${cfg.bg} ${cfg.text} ${cfg.border} hover:border-current/40 hover:scale-102`
                            }`}
                          >
                            <IconComp size={13} className="shrink-0" />
                            <span>{cfg.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Right: Check-in Time & Notes */}
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 lg:w-[320px]">
                      {/* Check-In Time Input */}
                      <div className="relative w-28 shrink-0">
                        <input
                          type="text"
                          placeholder="Time (e.g. 9:00 AM)"
                          value={checkInTime}
                          onChange={(e) => {
                            setCheckInTimeState(prev => ({ ...prev, [member.id]: e.target.value }));
                          }}
                          onBlur={() => {
                            if (currentStatus) {
                              markAttendance(member.id, selectedDate, currentStatus, checkInTime, note);
                            }
                          }}
                          className="w-full px-2.5 py-1.5 bg-[#faf8f4] border border-[#e7e1d6] rounded-xl text-xs text-[#20262e] placeholder-[#6f6a60] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1f5c5a]"
                          title="Check-in Time"
                        />
                      </div>

                      {/* Notes / Reason input */}
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder="Reason / HR Notes..."
                          value={note}
                          onChange={(e) => {
                            setNotesState(prev => ({ ...prev, [member.id]: e.target.value }));
                          }}
                          onBlur={() => {
                            if (currentStatus) {
                              markAttendance(member.id, selectedDate, currentStatus, checkInTime, note);
                            }
                          }}
                          className="w-full px-2.5 py-1.5 bg-[#faf8f4] border border-[#e7e1d6] rounded-xl text-xs text-[#20262e] placeholder-[#6f6a60] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1f5c5a]"
                          title="Notes or Absence reason"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* MONTHLY ATTENDANCE OVERVIEW MATRIX & ANALYTICS */
        <div className="space-y-6">
          {/* Monthly Summary Header */}
          <div className="bg-white border border-[#e7e1d6] rounded-2xl p-5 shadow-xs">
            <h2 className="text-sm font-bold text-[#20262e] mb-1 flex items-center gap-2">
              <BarChart3 size={16} className="text-[#1f5c5a]" />
              <span>Monthly Attendance Matrix & Performance &bull; {formatMonthLabel(selectedMonth)}</span>
            </h2>
            <p className="text-xs text-[#6f6a60] mb-4">
              Overview of all shifts, turnout percentages, and daily record codes for each team member.
            </p>

            {/* Matrix Table */}
            <div className="overflow-x-auto border border-[#e7e1d6] rounded-xl">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f3f0e9] text-[#20262e] border-b border-[#e7e1d6]">
                    <th className="p-3 text-left font-bold sticky left-0 bg-[#f3f0e9] z-10 min-w-[180px] border-r border-[#e7e1d6]">
                      Team Member
                    </th>
                    {monthlyData.days.map(d => (
                      <th 
                        key={d.dateStr}
                        className={`p-1.5 text-center font-bold min-w-[28px] border-r border-[#e7e1d6] ${
                          d.isWeekend ? 'bg-[#ebe5d8] text-[#8a8479]' : 'text-[#20262e]'
                        }`}
                        title={`${d.dateStr} (${d.dayName})`}
                      >
                        <div className="text-[9px] font-normal text-[#6f6a60]">{d.dayName}</div>
                        <div className="text-[11px] font-bold">{d.dayNum}</div>
                      </th>
                    ))}
                    <th className="p-2 text-center font-bold bg-[#e8f0ef] text-[#1f5c5a] min-w-[60px] border-r border-[#e7e1d6]">
                      Present
                    </th>
                    <th className="p-2 text-center font-bold bg-amber-50 text-amber-800 min-w-[50px] border-r border-[#e7e1d6]">
                      Late
                    </th>
                    <th className="p-2 text-center font-bold bg-rose-50 text-rose-800 min-w-[50px] border-r border-[#e7e1d6]">
                      Absent
                    </th>
                    <th className="p-2 text-center font-bold bg-purple-50 text-purple-800 min-w-[50px] border-r border-[#e7e1d6]">
                      Leave
                    </th>
                    <th className="p-2 text-center font-bold bg-[#1f5c5a] text-white min-w-[70px]">
                      Rate %
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e7e1d6]">
                  {monthlyData.memberStats.map(stat => (
                    <tr key={stat.member.id} className="hover:bg-[#faf8f4] transition-colors">
                      {/* Member Info */}
                      <td className="p-3 font-semibold text-[#20262e] sticky left-0 bg-white z-10 border-r border-[#e7e1d6] shadow-2xs">
                        <div className="flex items-center gap-2">
                          <img
                            src={stat.member.avatar_url}
                            alt={stat.member.full_name}
                            className="w-7 h-7 rounded-lg object-cover border border-[#e7e1d6]"
                          />
                          <div>
                            <div className="font-bold text-xs leading-tight">
                              {stat.member.full_name || stat.member.username}
                            </div>
                            <div className="text-[10px] text-[#6f6a60]">
                              {stat.member.role}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Day Cells */}
                      {monthlyData.days.map(d => {
                        const rec = stat.dayMap[d.dateStr];
                        const cfg = rec?.status ? STATUS_CONFIG[rec.status] : null;

                        return (
                          <td 
                            key={d.dateStr} 
                            className={`p-1 text-center border-r border-[#e7e1d6] ${
                              d.isWeekend ? 'bg-[#faf8f4]/60' : ''
                            }`}
                          >
                            {cfg ? (
                              <span 
                                className={`inline-block w-5 h-5 rounded-md text-[10px] font-black leading-5 text-center ${cfg.activeBg} text-white shadow-2xs cursor-default`}
                                title={`${d.dateStr}: ${cfg.label} ${rec.check_in_time ? `(${rec.check_in_time})` : ''} ${rec.notes ? `- ${rec.notes}` : ''}`}
                              >
                                {cfg.shortCode}
                              </span>
                            ) : (
                              <span className="text-[10px] text-[#d1cbbf]">&bull;</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Summary Metrics */}
                      <td className="p-2 text-center font-bold text-emerald-700 bg-emerald-50/40 border-r border-[#e7e1d6]">
                        {stat.presentCount}
                      </td>
                      <td className="p-2 text-center font-bold text-amber-700 bg-amber-50/40 border-r border-[#e7e1d6]">
                        {stat.lateCount}
                      </td>
                      <td className="p-2 text-center font-bold text-rose-700 bg-rose-50/40 border-r border-[#e7e1d6]">
                        {stat.absentCount}
                      </td>
                      <td className="p-2 text-center font-bold text-purple-700 bg-purple-50/40 border-r border-[#e7e1d6]">
                        {stat.leaveCount + stat.halfDayCount}
                      </td>
                      <td className="p-2 text-center font-black text-[#1f5c5a] bg-[#e8f0ef]/50">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          stat.attendanceRate >= 90 ? 'bg-emerald-100 text-emerald-800' :
                          stat.attendanceRate >= 75 ? 'bg-amber-100 text-amber-900' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {stat.attendanceRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-[#6f6a60] pt-3 border-t border-[#e7e1d6]">
              <span className="font-bold text-[#20262e]">Legend:</span>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-emerald-600 text-white font-black text-[9px] flex items-center justify-center">P</span>
                <span>Present</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-rose-600 text-white font-black text-[9px] flex items-center justify-center">A</span>
                <span>Absent</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-amber-500 text-white font-black text-[9px] flex items-center justify-center">L</span>
                <span>Late</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-blue-600 text-white font-black text-[9px] flex items-center justify-center">H</span>
                <span>Half Day</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-purple-600 text-white font-black text-[9px] flex items-center justify-center">V</span>
                <span>On Leave / Vacation</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
