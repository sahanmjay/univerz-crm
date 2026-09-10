import React, { useState } from 'react';
import { 
  Lock, 
  KeyRound, 
  X, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { useTasks } from '../context/TaskContext';

export default function ChangePinModal({ isOpen, onClose }) {
  const { currentUser, updateUserPin } = useTasks();

  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  if (!isOpen) return null;

  const handlePinInput = (val, setter) => {
    // Only allow numeric digits up to 5 chars
    const numeric = val.replace(/\D/g, '').slice(0, 5);
    setter(numeric);
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (currentPin.length !== 5) {
      setErrorMsg('Please enter your 5-digit Current PIN.');
      triggerShake();
      return;
    }

    if (newPin.length !== 5) {
      setErrorMsg('New PIN must be exactly 5 numeric digits.');
      triggerShake();
      return;
    }

    if (newPin !== confirmPin) {
      setErrorMsg('New PIN and Confirm PIN do not match.');
      triggerShake();
      return;
    }

    setIsLoading(true);

    try {
      const res = await updateUserPin(currentPin, newPin);
      if (res.success) {
        setSuccessMsg('Security PIN updated successfully in Supabase database!');
        setTimeout(() => {
          handleClose();
        }, 1500);
      } else {
        setErrorMsg(res.error || 'Failed to update PIN.');
        triggerShake();
      }
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred while updating PIN.');
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleClose = () => {
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(false);
    onClose();
  };

  const isMatch = newPin.length === 5 && confirmPin.length === 5 && newPin === confirmPin;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div 
        className={`w-full max-w-md bg-slate-900/95 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-2xl transition-all ${
          isShaking ? 'animate-shake' : 'animate-slide-up'
        }`}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 to-indigo-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <KeyRound size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Change Security PIN
              </h2>
              <p className="text-[11px] text-slate-400">
                Update your 5-digit quick access passcode
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* User Badge */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img 
              src={currentUser?.avatar_url} 
              alt={currentUser?.full_name} 
              className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-700"
            />
            <span className="text-xs font-semibold text-slate-200">
              {currentUser?.full_name || currentUser?.username}
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
            {currentUser?.department}
          </span>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2.5 shadow-lg">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-rose-400" />
              <div className="flex-1 font-medium">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-xs flex items-start gap-2.5 shadow-lg">
              <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-emerald-400" />
              <div className="flex-1 font-medium">{successMsg}</div>
            </div>
          )}

          {/* Current PIN */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Current 5-Digit PIN</span>
              <span className="text-[10px] text-slate-500">Default: 12345</span>
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showCurrentPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={5}
                required
                value={currentPin}
                onChange={(e) => handlePinInput(e.target.value, setCurrentPin)}
                placeholder="•••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl glass-input text-xs tracking-widest font-mono text-white placeholder:text-slate-600 focus:border-indigo-500"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowCurrentPin(!showCurrentPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
              >
                {showCurrentPin ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* New PIN */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>New 5-Digit PIN</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {newPin.length}/5 digits
              </span>
            </label>
            <div className="relative">
              <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showNewPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={5}
                required
                value={newPin}
                onChange={(e) => handlePinInput(e.target.value, setNewPin)}
                placeholder="•••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl glass-input text-xs tracking-widest font-mono text-white placeholder:text-slate-600 focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowNewPin(!showNewPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
              >
                {showNewPin ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Confirm New PIN */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Confirm New PIN</span>
              {isMatch && (
                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 size={11} /> PINs Match
                </span>
              )}
            </label>
            <div className="relative">
              <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showConfirmPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={5}
                required
                value={confirmPin}
                onChange={(e) => handlePinInput(e.target.value, setConfirmPin)}
                placeholder="•••••"
                className={`w-full pl-10 pr-10 py-2.5 rounded-xl glass-input text-xs tracking-widest font-mono text-white placeholder:text-slate-600 ${
                  isMatch ? 'border-emerald-500/70 focus:border-emerald-500' : 'focus:border-indigo-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPin(!showConfirmPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
              >
                {showConfirmPin ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-bold text-xs transition-all hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || newPin.length !== 5 || confirmPin.length !== 5}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving PIN...</span>
                </div>
              ) : (
                <>
                  <ShieldCheck size={15} />
                  <span>Save New PIN</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
