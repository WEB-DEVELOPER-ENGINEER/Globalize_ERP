/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Building2, Briefcase, FileText, FileSpreadsheet, PiggyBank, 
  Users, Calendar, Key, Globe, Bell, Plus, ShieldAlert, Sparkles, LogOut, CheckCheck, ShieldCheck, Lock, User
} from 'lucide-react';
import dbInstance from './db/store';
import { UserRole, Profile } from './types';

// Role Dashboards
import DashboardOwner from './components/DashboardOwner';
import DashboardSales from './components/DashboardSales';
import DashboardAccountant from './components/DashboardAccountant';
import DashboardTranslator from './components/DashboardTranslator';

// Core Pages
import TasksPage from './components/TasksPage';
import QuotationsPage from './components/QuotationsPage';
import RevenuesPage from './components/RevenuesPage';
import CashBookPage from './components/CashBookPage';
import ClientReceivablesPage from './components/ClientReceivablesPage';
import MonthlyClosingPage from './components/MonthlyClosingPage';
import AttendancePage from './components/AttendancePage';
import AccountsPage from './components/AccountsPage';
import LoginPage from './components/LoginPage';
import CertifiedTranslationComposer from './components/CertifiedTranslationComposer';

type ActiveTab = 
  | 'dashboard' 
  | 'tasks' 
  | 'quotations' 
  | 'revenues' 
  | 'cashbook' 
  | 'receivables' 
  | 'closings' 
  | 'attendance'
  | 'accounts'
  | 'certified';

export default function App() {
  const [isRtl, setIsRtl] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  
  // Notification States
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, text: 'New WhatsApp translation enquiry filed by Egypt Gas', time: '5 mins ago', read: false },
    { id: 2, text: 'Cairo Hub Vault reconciled to EGP 34,500 successfully', time: '1 hr ago', read: true },
    { id: 3, text: 'Partner Abu El-Fotouh dividend split posted for 2026-05', time: '2 hrs ago', read: false },
  ]);

  // Intake Modal Shortcut
  const [isQuickIntakeOpen, setIsQuickIntakeOpen] = useState(false);

  // Sync database subscriber to force global re-renders
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const unsub = dbInstance.subscribe(() => {
      setTick(prev => prev + 1);
    });
    return unsub;
  }, []);

  // Track session authentication user
  const [sessionUser, setSessionUser] = useState<Profile | null>(() => {
    const savedId = localStorage.getItem('gtms_logged_in_id');
    if (savedId) {
      const found = dbInstance.profiles.find(p => p.id === savedId);
      if (found && found.isActive) {
        dbInstance.currentRole = found.role;
        dbInstance.activeProfile = found;
        return found;
      }
    }
    return null;
  });

  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    return sessionUser ? sessionUser.role : 'owner';
  });

  // Force one-time database reset for the 'clean start' requested by the user
  useEffect(() => {
    const resetKey = 'gtms_db_v2_reset_performed';
    if (!localStorage.getItem(resetKey)) {
      dbInstance.resetToSeeds();
      localStorage.setItem(resetKey, 'true');
      window.location.reload(); 
    }
  }, []);

  // Intercept de-activation or role changes in real-time
  useEffect(() => {
    if (sessionUser) {
      const dbProfile = dbInstance.profiles.find(p => p.id === sessionUser.id);
      if (!dbProfile || !dbProfile.isActive) {
        setSessionUser(null);
        localStorage.removeItem('gtms_logged_in_id');
      } else if (dbProfile.role !== currentRole) {
        setCurrentRole(dbProfile.role);
        setSessionUser(dbProfile);
        dbInstance.currentRole = dbProfile.role;
        dbInstance.activeProfile = dbProfile;
      } else {
        setSessionUser(dbProfile);
      }
    }
  }, [tick, sessionUser?.id, currentRole]);

  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    setActiveTab('dashboard'); // Default root tab upon credential alterations
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const activeNotificationCount = notifications.filter(n => !n.read).length;

  if (!sessionUser) {
    return (
      <LoginPage 
        isRtl={isRtl} 
        onToggleRtl={() => setIsRtl(!isRtl)} 
        onSuccessLogin={(user) => {
          setSessionUser(user);
          setCurrentRole(user.role);
          dbInstance.currentRole = user.role;
          dbInstance.activeProfile = user;
          localStorage.setItem('gtms_logged_in_id', user.id);
          dbInstance.save();
          setActiveTab('dashboard');
        }}
      />
    );
  }

  return (
    <div className={`min-h-screen bg-zinc-50/45 flex flex-col font-sans transition-all duration-300 text-zinc-800 ${isRtl ? 'rtl' : 'ltr'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* 1. TOP GLOBAL EXECUTIVE HEADER BAR */}
      <header className="bg-white border-b border-zinc-150/70 px-8 py-3 flex items-center justify-between sticky top-0 z-40 shrink-0">
        
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white shadow-sm">
            <Building2 size={16} className="stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-[15px] text-zinc-900">GLOBAL SERVICE</span>
              <span className="text-[9px] uppercase font-semibold px-2 py-0.5 bg-zinc-105 bg-zinc-100 text-zinc-600 rounded border border-zinc-200 font-mono">TMS v2.6</span>
            </div>
            <p className="text-[10px] text-zinc-400 font-medium">Accreditation Translation & Legal Bureau System</p>
          </div>
        </div>

        {/* Global utility triggers */}
        <div className="flex items-center gap-4 text-xs font-sans">
          
          {/* Quick Intake Shortcut */}
          <button
            onClick={() => setIsQuickIntakeOpen(true)}
            className="px-4 py-1.5 bg-zinc-950 hover:bg-zinc-850 text-white font-medium rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
          >
            <Plus size={14} />
            <span>{isRtl ? 'تسجيل ملف سريع' : 'Quick Intake'}</span>
          </button>

          {/* RTL toggle */}
          <button
            onClick={() => setIsRtl(!isRtl)}
            className="px-3 py-1.5 bg-white hover:bg-zinc-50 text-zinc-700 transition-colors rounded-lg flex items-center gap-1.5 border border-zinc-200 cursor-pointer font-medium"
          >
            <Globe size={13} />
            <span>{isRtl ? 'English Layout' : 'عربي RTL'}</span>
          </button>

          {/* Notifications panel dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="p-1.5 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-600 relative cursor-pointer transition-colors"
            >
              <Bell size={14} />
              {activeNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-zinc-900 text-white rounded-full flex items-center justify-center text-[8px] font-bold">
                  {activeNotificationCount}
                </span>
              )}
            </button>

            {isNotificationsOpen && (
              <div className={`absolute mt-2.5 w-64 bg-white rounded-xl shadow-lg border border-zinc-200/60 py-2.5 z-50 text-zinc-700 ${isRtl ? 'left-0' : 'right-0'}`}>
                <div className="flex items-center justify-between px-4 pb-2 border-b border-zinc-100">
                  <span className="font-medium text-[10px] text-zinc-400 uppercase tracking-widest">Notifications</span>
                  {activeNotificationCount > 0 && (
                    <button onClick={markAllNotificationsRead} className="text-[10px] text-zinc-950 font-semibold flex items-center gap-0.5 hover:underline cursor-pointer">
                      <CheckCheck size={12} /> Clear All
                    </button>
                  )}
                </div>
                <div className="divide-y divide-zinc-50 max-h-48 overflow-y-auto">
                  {notifications.map(n => (
                    <div key={n.id} className={`p-3 text-[10px] leading-snug transition-colors ${n.read ? 'text-zinc-400 bg-white' : 'text-zinc-800 bg-zinc-50/50 font-medium'}`}>
                      <p>{n.text}</p>
                      <span className="text-[8px] text-zinc-400 font-mono block mt-1">{n.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Active Logged-in User Profile & Role Switcher */}
          <div className="flex items-center gap-3 border-l border-zinc-200 pl-4 bg-zinc-50 px-3.5 py-1.5 rounded-xl border border-zinc-150">
            <div className="leading-tight shrink-0">
              <span className="text-[8px] font-bold text-zinc-400 block uppercase tracking-wider">
                {isRtl ? 'المستخدم الحالي' : 'Logged Employee'}
              </span>
              <span className="font-bold text-zinc-900 text-[11px] block">
                {isRtl ? sessionUser.fullNameAr : sessionUser.fullName}
              </span>
            </div>
            
            {/* If owner/admin, let them impersonate other roles as an administrative test power */}
            {(sessionUser.role === 'owner' || sessionUser.role === 'admin') ? (
              <select
                value={currentRole}
                onChange={e => handleRoleChange(e.target.value as UserRole)}
                className="bg-zinc-100 hover:bg-zinc-200 font-bold text-zinc-700 focus:outline-none border border-zinc-250 py-0.5 px-1.5 text-[10px] rounded-md cursor-pointer transition-all"
                title={isRtl ? 'تبديل مظهر محاكاة الأدوار' : 'Impersonate view (Demo system)'}
              >
                <option value="owner">Owner Ahmed</option>
                <option value="accountant">Accountant</option>
                <option value="sales">Sales Executive</option>
                <option value="translator">Translator (Shaima)</option>
                <option value="admin">Bureau Admin</option>
              </select>
            ) : (
              <span className="px-2 py-0.5 text-[9px] uppercase font-bold bg-zinc-900 text-white rounded border border-transparent font-mono">
                {currentRole}
              </span>
            )}

            {/* Logout Trigger */}
            <button
              onClick={() => {
                localStorage.removeItem('gtms_logged_in_id');
                setSessionUser(null);
              }}
              className="p-1 text-zinc-400 hover:text-red-700 hover:bg-red-50 border border-zinc-200 hover:border-red-200 rounded-lg cursor-pointer transition-all"
              title={isRtl ? 'تسجيل الخروج الآمن' : 'Log Out Secured Session'}
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </header>

      {/* 2. BODY FRAME: SIDEBAR + MAIN SHEET CANVAS */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* SIDEBAR PANEL */}
        <aside className="w-60 bg-white border-r border-zinc-150/70 flex flex-col justify-between shrink-0 font-sans">
          
          <div className="p-4 space-y-4">
            {/* Quick Profile */}
            <div className="p-3 bg-zinc-50 rounded-xl flex items-center gap-3 border border-zinc-205/60">
              <div className="w-7 h-7 rounded-full bg-zinc-950 flex items-center justify-center text-white text-[10px] font-bold uppercase">
                {currentRole[0]}
              </div>
              <div className="leading-tight">
                <p className="text-[11px] font-semibold text-zinc-950 capitalize">Logged as {currentRole}</p>
                <p className="text-[9px] text-zinc-400 font-medium">Session Authorized</p>
              </div>
            </div>

            {/* Navigation buttons */}
            <nav className="space-y-1 text-xs">
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest block pb-1.5 px-2">Workspaces</span>
              
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-2.5 cursor-pointer ${
                  activeTab === 'dashboard' ? 'bg-zinc-950 text-white shadow-sm font-semibold' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
                }`}
              >
                <Building2 size={14} />
                <span>{isRtl ? 'لوحة المراقبة العامة' : 'Core Dashboard'}</span>
              </button>

              <button
                onClick={() => {
                  if (currentRole === 'translator') return alert('Access Denied. Linguists use translation assignment queues.');
                  setActiveTab('tasks');
                }}
                className={`w-full px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-2.5 cursor-pointer ${
                  currentRole === 'translator' ? 'opacity-40 cursor-not-allowed' : ''
                } ${activeTab === 'tasks' ? 'bg-zinc-950 text-white shadow-sm font-semibold' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'}`}
              >
                <Briefcase size={14} />
                <span>{isRtl ? 'تسجيل المعاملات والملفات' : 'Legal Intake Jobs'}</span>
              </button>

              <button
                onClick={() => {
                  if (currentRole === 'translator') return;
                  setActiveTab('quotations');
                }}
                className={`w-full px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-2.5 cursor-pointer ${
                  currentRole === 'translator' ? 'opacity-40 cursor-not-allowed' : ''
                } ${activeTab === 'quotations' ? 'bg-zinc-950 text-white shadow-sm font-semibold' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'}`}
              >
                <FileText size={14} />
                <span>{isRtl ? 'عروض الأسعار المعتمدة' : 'Price Quotations'}</span>
              </button>

              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest block pt-3 pb-1.5 px-2">Accounting Ledger</span>

              <button
                onClick={() => {
                  if (currentRole !== 'owner' && currentRole !== 'accountant') return;
                  setActiveTab('revenues');
                }}
                className={`w-full px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-2.5 cursor-pointer ${
                  (currentRole !== 'owner' && currentRole !== 'accountant') ? 'opacity-35 cursor-not-allowed' : ''
                } ${activeTab === 'revenues' ? 'bg-zinc-900 text-white shadow-sm font-semibold' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'}`}
              >
                <FileSpreadsheet size={14} />
                <span>{isRtl ? 'دفتر الإيرادات والمصروفات' : 'Daily Revenue Matrix'}</span>
              </button>

              <button
                onClick={() => {
                  if (currentRole !== 'owner' && currentRole !== 'accountant') return;
                  setActiveTab('cashbook');
                }}
                className={`w-full px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-2.5 cursor-pointer ${
                  (currentRole !== 'owner' && currentRole !== 'accountant') ? 'opacity-35 cursor-not-allowed' : ''
                } ${activeTab === 'cashbook' ? 'bg-zinc-900 text-white shadow-sm font-semibold' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'}`}
              >
                <PiggyBank size={14} />
                <span>{isRtl ? 'خزينة ودفتر اليومية الخزنة' : 'Vault Cash Book'}</span>
              </button>

              <button
                onClick={() => {
                  if (currentRole !== 'owner' && currentRole !== 'accountant') return;
                  setActiveTab('receivables');
                }}
                className={`w-full px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-2.5 cursor-pointer ${
                  (currentRole !== 'owner' && currentRole !== 'accountant') ? 'opacity-35 cursor-not-allowed' : ''
                } ${activeTab === 'receivables' ? 'bg-zinc-900 text-white shadow-sm font-semibold' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'}`}
              >
                <Users size={14} />
                <span>{isRtl ? 'شجرة مديونيات العملاء' : 'Aging Client Receivables'}</span>
              </button>

              <button
                onClick={() => {
                  if (currentRole !== 'owner') return;
                  setActiveTab('closings');
                }}
                className={`w-full px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-2.5 cursor-pointer ${
                  currentRole !== 'owner' ? 'opacity-35 cursor-not-allowed' : ''
                } ${activeTab === 'closings' ? 'bg-zinc-900 text-white shadow-sm font-semibold' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'}`}
              >
                <Calendar size={14} />
                <span>{isRtl ? 'الأرباح والإغلاق الشهري' : 'Monthly Closings'}</span>
              </button>

              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest block pt-3 pb-1.5 px-2">Team Office</span>

              <button
                onClick={() => {
                  if (currentRole !== 'owner' && currentRole !== 'admin' && currentRole !== 'accountant') return;
                  setActiveTab('attendance');
                }}
                className={`w-full px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-2.5 cursor-pointer ${
                  (currentRole !== 'owner' && currentRole !== 'admin' && currentRole !== 'accountant') ? 'opacity-35 cursor-not-allowed' : ''
                } ${activeTab === 'attendance' ? 'bg-zinc-900 text-white shadow-sm font-semibold' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'}`}
              >
                <Calendar size={14} />
                <span>{isRtl ? 'مرتبات وحضور اللغويين' : 'Prd/Salary Timesheet'}</span>
              </button>

              {/* Privileged User Powers and Accounts tab */}
              {(currentRole === 'owner' || currentRole === 'admin') && (
                <button
                  onClick={() => setActiveTab('accounts')}
                  className={`w-full px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-2.5 cursor-pointer ${
                    activeTab === 'accounts' ? 'bg-zinc-950 text-white shadow-sm font-semibold' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
                  }`}
                >
                  <ShieldCheck size={14} />
                  <span>{isRtl ? 'حسابات الموظفين والصلاحيات' : 'Accounts & Powers'}</span>
                </button>
              )}

              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest block pt-3 pb-1.5 px-2">Certification</span>

              <button
                onClick={() => setActiveTab('certified')}
                className={`w-full px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-2.5 cursor-pointer ${
                  activeTab === 'certified' ? 'bg-purple-900 text-white shadow-sm font-semibold' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
                }`}
              >
                <ShieldCheck size={14} />
                <span>{isRtl ? 'محرر الترجمة المعتمدة' : 'Certified Composer'}</span>
              </button>
            </nav>
          </div>

          {/* Secure vault notification */}
          <div className="p-4 border-t border-zinc-100 text-[10px] leading-snug bg-zinc-50/50">
            <span className="font-semibold uppercase text-zinc-900 block pb-1">System Audit Check</span>
            <p className="text-zinc-400">All data cached in mock localStorage. Signatures authorized by Owner Ahmed.</p>
          </div>
        </aside>

        {/* 3. CORE MAIN LAYOUT PORT CANVAS */}
        <main className="flex-1 p-6 overflow-y-auto max-h-[calc(100vh-70px)]">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Context Header */}
            <div className="border-b border-zinc-150/70 pb-5">
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-[0.2em] block">
                {isRtl ? 'بيئة المعالجة والتوثيق' : 'GTMS Workspace Environment'}
              </span>
              <h2 className="text-2xl font-light tracking-tight text-zinc-900 capitalize mt-1.5 focus:outline-none">
                {isRtl ? `${activeTab === 'dashboard' ? 'لوحة المراقبة' : activeTab} Workspace` : `${activeTab.replace('_', ' ')} Workspace`}
              </h2>
            </div>

            {/* TAB ROUTING STATE LOGICS */}
            {activeTab === 'dashboard' && (
              <>
                {currentRole === 'owner' && <DashboardOwner isRtl={isRtl} currentRole={currentRole} />}
                {currentRole === 'sales' && <DashboardSales isRtl={isRtl} currentRole={currentRole} />}
                {currentRole === 'accountant' && <DashboardAccountant isRtl={isRtl} currentRole={currentRole} />}
                {currentRole === 'translator' && <DashboardTranslator isRtl={isRtl} currentRole={currentRole} />}
                {currentRole === 'admin' && <DashboardOwner isRtl={isRtl} currentRole={currentRole} />}
              </>
            )}

            {activeTab === 'tasks' && (
              <TasksPage 
                isRtl={isRtl} 
                currentRole={currentRole}
                isQuickIntakeOpen={isQuickIntakeOpen}
                onCloseQuickIntake={() => setIsQuickIntakeOpen(false)}
              />
            )}

            {activeTab === 'quotations' && (
              <QuotationsPage isRtl={isRtl} currentRole={currentRole} />
            )}

            {activeTab === 'revenues' && (
              <RevenuesPage isRtl={isRtl} currentRole={currentRole} />
            )}

            {activeTab === 'cashbook' && (
              <CashBookPage isRtl={isRtl} currentRole={currentRole} />
            )}

            {activeTab === 'receivables' && (
              <ClientReceivablesPage isRtl={isRtl} currentRole={currentRole} />
            )}

            {activeTab === 'closings' && (
              <MonthlyClosingPage isRtl={isRtl} currentRole={currentRole} />
            )}

            {activeTab === 'attendance' && (
              <AttendancePage isRtl={isRtl} currentRole={currentRole} />
            )}

            {activeTab === 'accounts' && (
              <AccountsPage 
                isRtl={isRtl} 
                currentRole={currentRole} 
                currentUser={sessionUser}
              />
            )}
            {activeTab === 'certified' && (
              <CertifiedTranslationComposer
                isRtl={isRtl}
                currentRole={currentRole}
                currentUser={sessionUser!}
              />
            )}
          </div>
        </main>
      </div>

      {/* QUICK WORKSPACE POPUPS CONTROL */}
      {isQuickIntakeOpen && (
        <TasksPage 
          isRtl={isRtl} 
          currentRole={currentRole}
          isQuickIntakeOpen={isQuickIntakeOpen}
          onCloseQuickIntake={() => setIsQuickIntakeOpen(false)}
        />
      )}
    </div>
  );
}
