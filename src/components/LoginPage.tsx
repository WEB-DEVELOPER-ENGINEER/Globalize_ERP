/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Building2, KeyRound, Phone, ShieldAlert, Sparkles, LogIn, ArrowRight, CheckCircle, Info, Lock, Globe 
} from 'lucide-react';
import { Profile, UserRole } from '../types';
import dbInstance from '../db/store';
import { GlobalizeLogo } from './GlobalizeLogo';

interface LoginPageProps {
  onSuccessLogin: (user: Profile) => void;
  isRtl: boolean;
  onToggleRtl: () => void;
}

export default function LoginPage({ onSuccessLogin, isRtl, onToggleRtl }: LoginPageProps) {
  const [phoneOrName, setPhoneOrName] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    setTimeout(() => {
      const inputVal = phoneOrName.trim().toLowerCase();
      
      // Let's search by either phone number OR Full name
      const user = dbInstance.profiles.find(p => {
        const phoneMatch = p.phone && p.phone.trim() === inputVal;
        const nameMatch = p.fullName.trim().toLowerCase() === inputVal;
        const nameArMatch = p.fullNameAr.trim() === inputVal;
        const idMatch = p.id.trim() === inputVal;
        return phoneMatch || nameMatch || nameArMatch || idMatch;
      });

      if (!user) {
        setErrorMsg(isRtl 
          ? 'المستخدم غير مسجل! يرجى إدخال اسم الموظف أو رقم الهاتف الصحيح.' 
          : 'User profile not registered inside the network. Please enter a valid name or phone number.');
        setIsLoading(false);
        return;
      }

      if (!user.isActive) {
        setErrorMsg(isRtl 
          ? 'تعذر الدخول! تم تعطيل هذا الحساب بقرار إداري. راجع أحمد أو أبو الفتوح.' 
          : 'Access denied! This account has been suspended by management. Consult Ahmed or Abu El-Fotouh.');
        setIsLoading(false);
        return;
      }

      // Validate password
      const userPassword = user.password || 'password123';
      if (password !== userPassword) {
        setErrorMsg(isRtl 
          ? 'كلمة المرور غير صحيحة! يرجى إدخال كلمة المرور السليمة (الافتراضية: password123).' 
          : 'Invalid credentials password! Please use the correct password (default is "password123").');
        setIsLoading(false);
        return;
      }

      // Success
      setIsLoading(false);
      onSuccessLogin(user);
    }, 800);
  };

  return (
    <div className={`min-h-screen bg-zinc-50/50 flex flex-col justify-between font-sans text-zinc-800 ${isRtl ? 'rtl' : 'ltr'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* HEADER BAR */}
      <header className="bg-white px-8 py-4 border-b border-zinc-150/70 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <GlobalizeLogo size={34} textColorClass="text-zinc-900" isRtl={isRtl} />
          <div className="hidden sm:inline-block border-l border-zinc-200 pl-3">
            <span className="text-[9px] uppercase font-bold px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded border border-indigo-100 font-mono">SECURE GATEWAY</span>
          </div>
        </div>

        <button
          onClick={onToggleRtl}
          className="px-3.5 py-1.5 bg-white hover:bg-zinc-50 text-zinc-700 transition-colors rounded-lg flex items-center gap-1.5 border border-zinc-200 cursor-pointer font-semibold text-xs"
        >
          <Globe size={13} />
          <span>{isRtl ? 'English Standard' : 'عربي RTL'}</span>
        </button>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md bg-white rounded-2xl border border-zinc-200/80 shadow-lg overflow-hidden animate-fade-in">
          
          {/* CREDENTIALS LOGIN FORM */}
          <div className="p-8 md:p-10 space-y-6 flex flex-col justify-center">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
                {isRtl ? 'بوابة الأمن السيبراني والمصادقة' : 'Secure Authorization Core'}
              </span>
              <h2 className="text-xl font-bold tracking-tight text-zinc-900">
                {isRtl ? 'تسجيل الدخول - نظام غلوبالايز' : 'Sign in to Globalize System'}
              </h2>
              <p className="text-xs text-zinc-400">
                {isRtl ? 'أدخل اسم المستخدم للولوج (أو رقم الهاتف المعتمد) والرقم السري.' : 'Enter employee credentials, target names or authorized phone below.'}
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-750 rounded-xl flex items-start gap-2 border border-red-200 text-xs animate-slide-in">
                <ShieldAlert size={15} className="shrink-0 text-red-500 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleManualLogin} className="space-y-4 text-xs font-sans">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                  {isRtl ? 'اسم الموظف أو رقم الهاتف المسجل *' : 'Employee Username or Phone *'}
                </label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-2.5 text-zinc-400" />
                  <input
                    type="text"
                    required
                    value={phoneOrName}
                    onChange={e => setPhoneOrName(e.target.value)}
                    placeholder={isRtl ? 'مثال: +201011112222 أو Ahmed Abdel Ghaffar' : 'e.g. +201011112222 or Ahmed Abdel Ghaffar'}
                    className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-850 placeholder-zinc-350 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                  {isRtl ? 'كلمة المرور السرية للموظف *' : 'Security Password *'}
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-2.5 text-zinc-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-850 placeholder-zinc-350 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-850 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-99 disabled:opacity-50"
                >
                  <span>{isLoading ? (isRtl ? 'جاري المصادقة الفنية...' : 'Authenticating...') : (isRtl ? 'تسجيل الدخول الآمن' : 'Authorize Secure Login')}</span>
                  {!isLoading && <ArrowRight size={14} className={`${isRtl ? 'rotate-180' : ''}`} />}
                </button>
              </div>
            </form>

            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-150 text-[10px] leading-snug">
              <span className="font-semibold text-zinc-850 block">{isRtl ? 'ملاحظة الفحص والأمن' : 'Security and Audit Note'}</span>
              <p className="text-zinc-400 mt-0.5">
                {isRtl 
                  ? 'تم تشفير جميع القيود وكلمات المرور وتخزينها سحابياً بشكل آمن.' 
                  : 'All passwords and entries are stored securely in the remote database.'}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="py-4 text-center text-[10px] text-zinc-400 border-t border-zinc-100 bg-white">
        {isRtl 
          ? 'حقوق الطبع محفوظة © 2026 هاتف أحمد عبد الغفار وأبو الفتوح للترجمة والاعتماد القانوني والتوثيق.' 
          : 'All security channels audited. © 2026 Ahmed Abdel Ghaffar & Abu El-Fotouh Translation Legal Bureau.'}
      </footer>
    </div>
  );
}
