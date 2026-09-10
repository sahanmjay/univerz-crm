import React, { useState, useRef, useEffect } from 'react';
import { 
  Lock, 
  KeyRound, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  CheckCircle2,
  Check,
  Building2,
  Fingerprint,
  Delete,
  Shield,
  RotateCcw
} from 'lucide-react';
import { useTasks } from '../context/TaskContext';
import { TEAM_MEMBERS, getDepartmentBadge } from '../lib/demoData';
import univerzLogo from '../assets/univerz-logo.png';

export default function LoginView() {
  const { loginWithPin, profiles } = useTasks();

  const memberList = profiles && profiles.length > 0 ? profiles : TEAM_MEMBERS;

  // Pre-select last chosen profile or default to Ashan (or first)
  const [selectedUser, setSelectedUser] = useState(null);
  const [pinDigits, setPinDigits] = useState(['', '', '', '', '']);
  const [showPin, setShowPin] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const inputRefs = useRef([]);

  // Initialize selected user
  useEffect(() => {
    if (memberList.length > 0 && !selectedUser) {
      const lastSelectedId = localStorage.getItem('univerz_last_selected_profile_id');
      const savedEmail = localStorage.getItem('univerz_logged_user_email');
      
      let matched = null;
      if (lastSelectedId) {
        matched = memberList.find(m => m.id === lastSelectedId);
      }
      if (!matched && savedEmail) {
        matched = memberList.find(m => m.email?.toLowerCase() === savedEmail.toLowerCase() || m.username?.toLowerCase() === savedEmail.toLowerCase());
      }
      if (!matched) {
        // Default to Ashan or first member
        matched = memberList.find(m => (m.username || '').toLowerCase() === 'ashan') || memberList[0];
      }
      setSelectedUser(matched);
    }
  }, [memberList, selectedUser]);

  // Auto focus first PIN digit when user changes
  useEffect(() => {
    setPinDigits(['', '', '', '', '']);
    setErrorMsg('');
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
  }, [selectedUser?.id]);

  const handleCardClick = (member) => {
    setSelectedUser(member);
    setErrorMsg('');
  };

  const handleDigitChange = (index, value) => {
    // Only accept numeric
    const cleanVal = value.replace(/\D/g, '');
    if (!cleanVal && value !== '') return;

    const char = cleanVal.slice(-1); // Take latest typed character
    const newDigits = [...pinDigits];
    newDigits[index] = char;
    setPinDigits(newDigits);
    setErrorMsg('');

    // Auto-advance to next input if digit entered
    if (char && index < 4) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto submit if 5th digit is filled
    if (char && index === 4) {
      const fullPin = newDigits.join('');
      if (fullPin.length === 5) {
        submitPin(fullPin, selectedUser);
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!pinDigits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...pinDigits];
        newDigits[index] = '';
        setPinDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 4) {
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const fullPin = pinDigits.join('');
      if (fullPin.length === 5) {
        submitPin(fullPin, selectedUser);
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 5);
    if (!pastedData) return;

    const newDigits = ['', '', '', '', ''];
    for (let i = 0; i < pastedData.length; i++) {
      newDigits[i] = pastedData[i];
    }
    setPinDigits(newDigits);

    const nextIndex = Math.min(pastedData.length, 4);
    inputRefs.current[nextIndex]?.focus();

    if (pastedData.length === 5) {
      submitPin(pastedData, selectedUser);
    }
  };

  // Virtual Keypad Button Press
  const handleKeypadPress = (key) => {
    if (key === 'backspace') {
      const lastFilledIndex = pinDigits.reduce((acc, curr, idx) => (curr !== '' ? idx : acc), -1);
      if (lastFilledIndex >= 0) {
        const newDigits = [...pinDigits];
        newDigits[lastFilledIndex] = '';
        setPinDigits(newDigits);
        inputRefs.current[lastFilledIndex]?.focus();
      }
    } else if (key === 'clear') {
      setPinDigits(['', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } else {
      // Find first empty index
      const firstEmptyIndex = pinDigits.findIndex(d => d === '');
      if (firstEmptyIndex !== -1) {
        const newDigits = [...pinDigits];
        newDigits[firstEmptyIndex] = key;
        setPinDigits(newDigits);
        setErrorMsg('');

        if (firstEmptyIndex < 4) {
          inputRefs.current[firstEmptyIndex + 1]?.focus();
        }

        if (firstEmptyIndex === 4) {
          const fullPin = newDigits.join('');
          submitPin(fullPin, selectedUser);
        }
      }
    }
  };

  const submitPin = async (pinString, user) => {
    if (!user) {
      setErrorMsg('Please select a profile.');
      return;
    }

    if (pinString.length !== 5) {
      setErrorMsg('Please enter your 5-digit PIN.');
      triggerShake();
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await loginWithPin(user, pinString, rememberDevice);
      if (!res.success) {
        setErrorMsg(res.error || 'Incorrect PIN. Please try again.');
        triggerShake();
        setPinDigits(['', '', '', '', '']);
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 150);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication error. Please try again.');
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const fullPin = pinDigits.join('');
    submitPin(fullPin, selectedUser);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-6 lg:p-8 relative overflow-hidden bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Dynamic Background Mesh Gradients */}
      <div className="absolute -top-32 -left-32 w-[32rem] h-[32rem] bg-indigo-600/15 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute top-1/2 -right-32 w-[30rem] h-[30rem] bg-emerald-600/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute -bottom-32 left-1/3 w-[36rem] h-[36rem] bg-orange-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-4xl relative z-10 space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-[11px] font-bold text-slate-300 shadow-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>FOUNDER &amp; PARTNER PORTAL</span>
          </div>

          <div className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shadow-2xl shadow-orange-500/20 ring-4 ring-orange-500/20 mb-2 overflow-hidden bg-[#de7843] p-1 flex items-center justify-center transition-transform hover:scale-105 duration-300">
              <img src={univerzLogo} alt="Univerz Logo" className="w-full h-full object-cover rounded-xl" />
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              Founder &amp; Partner Portal
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-400 mt-1">
              Univerz Creative Agency &bull; Select Your Account to Unlock Workspace
            </p>
          </div>
        </div>

        {/* 6 Profile Cards Grid (2 rows x 3 columns) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Building2 size={14} className="text-indigo-400" />
              1. Select Your Profile
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              6 Verified Team Members
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {memberList.map((member) => {
              const isSelected = selectedUser?.id === member.id || (!selectedUser && member.username === 'subodha');
              const initials = member.initials || (member.full_name ? member.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'UN');
              const isHR = member.role === 'admin' || member.role === 'HR' || member.department === 'HR';

              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => handleCardClick(member)}
                  className={`relative p-3.5 sm:p-4 rounded-2xl border text-left transition-all duration-200 group flex items-center gap-3.5 overflow-hidden ${
                    isSelected
                      ? 'bg-gradient-to-br from-emerald-950/50 via-slate-900/90 to-slate-900 border-emerald-500 ring-2 ring-emerald-500/40 shadow-xl shadow-emerald-950/40 scale-[1.02]'
                      : 'bg-slate-900/70 hover:bg-slate-850 border-slate-800/80 hover:border-slate-700 text-slate-300 hover:scale-[1.01]'
                  }`}
                >
                  {/* Active Green Glow Effect */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />
                  )}

                  {/* Avatar & Initials Badge */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={member.avatar_url}
                      alt={member.full_name || member.username}
                      className={`w-12 h-12 rounded-2xl object-cover transition-all duration-300 ${
                        isSelected 
                          ? 'ring-2 ring-emerald-400 shadow-md shadow-emerald-500/20' 
                          : 'ring-1 ring-slate-700 group-hover:ring-slate-500'
                      }`}
                    />
                    <span 
                      className={`absolute -bottom-1 -right-1 text-[9px] font-black px-1.5 py-0.5 rounded-md border leading-none shadow-sm ${
                        isSelected
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {initials}
                    </span>
                  </div>

                  {/* Member Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <h3 className={`text-xs sm:text-sm font-bold truncate ${
                        isSelected ? 'text-white' : 'text-slate-200 group-hover:text-white'
                      }`}>
                        {member.full_name || member.username}
                      </h3>
                    </div>

                    <p className={`text-[11px] truncate mt-0.5 font-medium ${
                      isSelected ? 'text-emerald-300' : 'text-slate-400'
                    }`}>
                      {member.title || member.designation || member.department}
                    </p>

                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${getDepartmentBadge(member.department)}`}>
                        {member.department}
                      </span>
                      {isHR && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          HR Admin
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Selection Checkmark Indicator */}
                  <div className="flex-shrink-0">
                    {isSelected ? (
                      <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/40 animate-scale-in">
                        <Check size={14} className="stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-slate-700 group-hover:border-slate-500 transition-colors" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Profile PIN Authentication Card */}
        {selectedUser && (
          <div 
            className={`rounded-3xl glass-panel p-5 sm:p-7 border border-slate-800 shadow-2xl backdrop-blur-2xl transition-all ${
              isShaking ? 'animate-shake' : 'animate-slide-up'
            }`}
          >
            {/* Selected User Header Strip */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
              <div className="flex items-center gap-3.5 text-center sm:text-left">
                <div className="relative">
                  <img
                    src={selectedUser.avatar_url}
                    alt={selectedUser.full_name}
                    className="w-12 h-12 rounded-2xl object-cover ring-2 ring-emerald-500 shadow-lg shadow-emerald-500/20"
                  />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-slate-950 rounded-full flex items-center justify-center border-2 border-slate-950">
                    <Check size={10} className="stroke-[4]" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <h2 className="text-base sm:text-lg font-bold text-white">
                      {selectedUser.full_name || selectedUser.username}
                    </h2>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium">
                    {selectedUser.title || selectedUser.designation} &bull; <span className="text-slate-300">@{selectedUser.username}</span>
                  </p>
                </div>
              </div>

              <div className="text-right hidden sm:block">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                  Security Level
                </span>
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  <ShieldCheck size={13} /> 5-Digit PIN Protected
                </span>
              </div>
            </div>

            {/* Error Message Alert */}
            {errorMsg && (
              <div className="mt-4 p-3.5 rounded-2xl bg-rose-950/80 border border-rose-800/90 text-rose-200 text-xs flex items-center justify-between gap-3 shadow-lg animate-slide-up">
                <div className="flex items-center gap-2.5">
                  <AlertCircle size={17} className="text-rose-400 flex-shrink-0" />
                  <span className="font-semibold">{errorMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPinDigits(['', '', '', '', '']);
                    setErrorMsg('');
                    inputRefs.current[0]?.focus();
                  }}
                  className="text-[11px] text-rose-300 underline font-semibold hover:text-white"
                >
                  Clear &amp; Retry
                </button>
              </div>
            )}

            {/* PIN Entry Form */}
            <form onSubmit={handleFormSubmit} className="mt-6 space-y-6">
              {/* 5-Digit Box Inputs */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                    <KeyRound size={13} className="text-emerald-400" />
                    Security PIN (5 digits)
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-300 transition-colors"
                  >
                    {showPin ? (
                      <>
                        <EyeOff size={14} />
                        <span>Hide PIN</span>
                      </>
                    ) : (
                      <>
                        <Eye size={14} />
                        <span>Show PIN</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Digit Inputs Row */}
                <div 
                  className="flex items-center justify-center gap-2.5 sm:gap-4 my-2"
                  onPaste={handlePaste}
                >
                  {pinDigits.map((digit, idx) => {
                    const isFilled = digit !== '';
                    const isCurrent = pinDigits.findIndex(d => d === '') === idx || (idx === 4 && pinDigits.every(d => d !== ''));

                    return (
                      <input
                        key={idx}
                        ref={(el) => (inputRefs.current[idx] = el)}
                        type={showPin ? 'text' : 'password'}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(idx, e)}
                        autoComplete="off"
                        className={`w-12 h-14 sm:w-14 sm:h-16 rounded-2xl text-center text-xl sm:text-2xl font-black font-mono transition-all duration-150 select-none ${
                          isFilled
                            ? 'bg-emerald-950/40 border-2 border-emerald-500/80 text-emerald-300 shadow-md shadow-emerald-900/30 scale-105'
                            : isCurrent
                            ? 'bg-slate-900 border-2 border-indigo-500/80 text-white shadow-lg shadow-indigo-950/40 ring-2 ring-indigo-500/30'
                            : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:border-slate-700'
                        } focus:outline-none`}
                      />
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
                  <span>Enter your 5-digit passcode</span>
                  <span>Default PIN: <strong className="text-slate-300 font-mono">12345</strong></span>
                </div>
              </div>

              {/* On-screen Keypad (Optional quick clicking) */}
              <div className="max-w-xs mx-auto pt-1">
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleKeypadPress(String(num))}
                      className="h-11 rounded-xl bg-slate-900/90 hover:bg-slate-800 active:bg-slate-700 border border-slate-800 hover:border-slate-700 font-mono font-bold text-sm text-slate-200 transition-all active:scale-95 shadow-sm"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleKeypadPress('clear')}
                    className="h-11 rounded-xl bg-slate-900/50 hover:bg-slate-800 active:bg-slate-700 border border-slate-800/80 text-[11px] font-semibold text-slate-400 transition-all active:scale-95"
                    title="Clear All"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeypadPress('0')}
                    className="h-11 rounded-xl bg-slate-900/90 hover:bg-slate-800 active:bg-slate-700 border border-slate-800 hover:border-slate-700 font-mono font-bold text-sm text-slate-200 transition-all active:scale-95 shadow-sm"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeypadPress('backspace')}
                    className="h-11 rounded-xl bg-slate-900/50 hover:bg-slate-800 active:bg-slate-700 border border-slate-800/80 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-all active:scale-95"
                    title="Backspace"
                  >
                    <Delete size={16} />
                  </button>
                </div>
              </div>

              {/* Remember Account Checkbox */}
              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 font-medium select-none">
                  <input
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                    className="w-4 h-4 rounded-md border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/30"
                  />
                  <span>Remember this account on this device</span>
                </label>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isLoading || pinDigits.some(d => d === '')}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-600/30 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2 text-slate-950">
                    <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                    <span>Verifying Security PIN...</span>
                  </div>
                ) : (
                  <>
                    <Lock size={16} className="stroke-[2.5]" />
                    <span>Sign In to Workspace</span>
                    <ArrowRight size={16} className="stroke-[2.5]" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Security & Supabase Sync Note */}
        <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-2 pt-2">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>Supabase Live Sync &bull; 5-Digit PIN Quick Auth Enabled</span>
        </div>
      </div>
    </div>
  );
}
