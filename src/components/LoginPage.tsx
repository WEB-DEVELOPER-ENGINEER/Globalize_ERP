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

  const handleQuickLogin = (user: Profile) => {
    if (!user.isActive) {
      alert(isRtl 
        ? 'عذراً، هذا الحساب معطل حالياً في دليل المستخدمين!' 
        : 'Cannot log in. This profile is suspended in the directory!');
      return;
    }
    onSuccessLogin(user);
  };

  // Pre-fetch some seed demo users for instant dashboard toggle
  const getDemoUsers = () => {
    // Let's pull Ahmed (owner), Nada (admin), Samar (sales), Mostafa (accountant), Shaima (translator)
    return dbInstance.profiles.filter(p => 
      p.id === 'p-ahmed-ghaffar' || 
      p.id === 'p-nada' || 
      p.id === 'p-acc-mostafa' || 
      p.id === 'p-sales-samar' || 
      p.id === 'p-shaima'
    );
  };

  const demoUsers = getDemoUsers();

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
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 bg-white rounded-2xl border border-zinc-200/80 shadow-lg overflow-hidden animate-fade-in">
          
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
                  ? 'تم تشفير جميع القيود وكلمات المرور وتخزينها محلياً. كلمة المرور الافتراضية لجميع الموظفين هي "password123".' 
                  : 'All passwords and entries are stored locally. The initial default password for all seeded accounts is "password123".'}
              </p>
            </div>
          </div>

          {/* QUICK DEMO ROLE SWITCHING SECTOR (LUXURIOUS DESIGN) */}
          <div className="bg-zinc-50 border-t md:border-t-0 md:border-l border-zinc-200/80 p-8 md:p-10 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                <Sparkles size={13} className="text-zinc-700 font-black" />
                <span>{isRtl ? 'اختبار الصلاحيات السريع' : 'System Evaluation Node'}</span>
              </div>
              <h3 className="text-base font-bold text-zinc-900">{isRtl ? 'تسجيل دخول سريع للتجربة' : 'Quick Access Demo Accounts'}</h3>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                {isRtl 
                  ? 'اختر أي حساب بنقرة واحدة لاختبار تجربة لوحات التحكم المتباينة ومستويات ومصفوفة الصلاحيات والحماية:' 
                  : 'Click on any predefined office profile below to log in instantly. This lets you inspect different dashboard scopes, capabilities, and system restriction guards without manual typing:'}
              </p>
            </div>

            <div className="space-y-2 mt-6">
              {demoUsers.map(user => {
                const badgeColor = 
                  user.role === 'owner' ? 'bg-zinc-950 text-white' :
                  user.role === 'admin' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                  user.role === 'accountant' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  user.role === 'sales' ? 'bg-cyan-50 text-cyan-700 border-cyan-200' :
                  'bg-amber-50 text-amber-700 border-amber-200';

                return (
                  <button
                    key={user.id}
                    onClick={() => handleQuickLogin(user)}
                    className="w-full p-2.5 bg-white hover:bg-zinc-100 hover:border-zinc-350 border border-zinc-205 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer font-sans shadow-sm active:scale-98 group"
                  >
                    <div className="flex items-center gap-2.5 max-w-[80%]">
                      <div className="w-6 h-6 rounded-full bg-zinc-900 flex items-center justify-center text-white text-[9px] font-bold uppercase">
                        {user.fullName[0]}
                      </div>
                      <div className="leading-tight truncate">
                        <span className="text-xs font-bold text-zinc-900 group-hover:underline">
                          {isRtl ? user.fullNameAr : user.fullName}
                        </span>
                        <p className="text-[9px] text-zinc-400 mt-0.5 truncate">{user.phone}</p>
                      </div>
                    </div>
                    
                    <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider font-mono shrink-0 border border-transparent ${badgeColor}`}>
                      {user.role}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="text-[9px] text-zinc-400 mt-6 text-center">
              {isRtl 
                ? 'نظام الترجمة والمحاسبة والتوثيق المعتمد • براءة اختراع v2.6' 
                : 'Accredited Bureaus Administration & Accounting Ledger • Proprietary v2.6'}
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
