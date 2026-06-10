/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Shield, ShieldCheck, Search, Lock, Check, 
  UserCheck, UserX, Fingerprint, RefreshCw, Key, ChevronDown, CheckCircle, Info, Hash
} from 'lucide-react';
import { Profile, UserRole, EmployeeType } from '../types';
import dbInstance from '../db/store';

interface AccountsPageProps {
  isRtl: boolean;
  currentRole: UserRole;
  currentUser: Profile;
}

export default function AccountsPage({ isRtl, currentRole, currentUser }: AccountsPageProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'directory' | 'matrix' | 'audits'>('directory');
  
  // Notification logs
  const [notifLogs, setNotifLogs] = useState<any[]>([]);

  // Form states for creating new user
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newFullNameAr, setNewFullNameAr] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('translator');
  const [newEmpType, setNewEmpType] = useState<EmployeeType>('freelance');
  const [newPhone, setNewPhone] = useState('');
  const [newSalary, setNewSalary] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPersonalEmail, setNewPersonalEmail] = useState('');
  const [newRate, setNewRate] = useState('');
  const [newPassword, setNewPassword] = useState('password123');
  const [languages, setLanguages] = useState('English, Arabic');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  const sendWelcomeEmail = async (email: string, fullName: string, password: string) => {
    setEmailLoading(true);
    try {
      const subject = `Welcome to GTMS - Your Official Translation Terminal`;
      const text = `Hi ${fullName},\n\nYour official translation terminal account has been successfully provisioned on Globalize Translation Management System (GTMS).\n\nYou can now log in using your phone number and the initial password provided below:\n\nPassword: ${password}\n\nPlease ensure you update your password after your first login.\n\nBest Regards,\nGTMS Administration`;
      
      const response = await window.fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email, subject, text })
      });
      const data = await response.json();
      console.log('Welcome email status:', data);
    } catch (err) {
      console.error('Failed to send welcome email:', err);
    } finally {
      setEmailLoading(false);
    }
  };

  // Password reset state
  const [selectedProfileForReset, setSelectedProfileForReset] = useState<Profile | null>(null);
  const [customNewPass, setCustomNewPass] = useState('');

  useEffect(() => {
    // Initial fetch of profiles
    setProfiles([...dbInstance.profiles]);
    setNotifLogs([...dbInstance.notifications]);

    const sub = dbInstance.subscribe(() => {
      setProfiles([...dbInstance.profiles]);
      setNotifLogs([...dbInstance.notifications]);
    });
    return sub;
  }, []);

  const handleToggleActive = (id: string) => {
    // Avoid deactivating oneself
    if (id === currentUser.id) {
      alert(isRtl ? 'لا يمكنك إلغاء تفعيل حسابك الحالي!' : "You cannot deactivate your own active session account!");
      return;
    }

    dbInstance.profiles = dbInstance.profiles.map(p => {
      if (p.id === id) {
        const nextState = !p.isActive;
        
        // Audit log
        dbInstance.addNotification({
          title: `Account ${nextState ? 'Activated' : 'Suspended'}`,
          titleAr: `تم ${nextState ? 'تنشيط' : 'تعطيل'} حساب`,
          message: `Profile state of ${p.fullName} altered to ${nextState ? 'ACTIVE' : 'SUSPENDED'} by ${currentUser.fullName}.`,
          messageAr: `تم تغيير حالة حساب الموظف ${p.fullNameAr} إلى ${nextState ? 'نشط' : 'معطل'} بواسطة ${currentUser.fullNameAr}.`,
          userId: p.id,
          type: nextState ? 'success' : 'warning'
        });

        return { ...p, isActive: nextState };
      }
      return p;
    });

    dbInstance.save();
    setSuccessMsg(isRtl ? 'تم تحديث حالة الحساب بنجاح.' : 'Account state updated successfully.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleRoleChange = (id: string, role: UserRole) => {
    if (id === currentUser.id && role !== 'owner') {
      alert(isRtl ? 'لا يمكنك سحب صلاحيات المالك من نفسك!' : "You cannot downgrade your own Owner privileges!");
      return;
    }

    dbInstance.profiles = dbInstance.profiles.map(p => {
      if (p.id === id) {
        // Audit log
        dbInstance.addNotification({
          title: `Role Promoted/Changed`,
          titleAr: `تم تعديل صلاحيات الموظف`,
          message: `Role of ${p.fullName} changed from ${p.role.toUpperCase()} to ${role.toUpperCase()} by ${currentUser.fullName}.`,
          messageAr: `تم تغيير مسمى وصلاحيات ${p.fullNameAr} من ${p.role} إلى ${role} بواسطة ${currentUser.fullNameAr}.`,
          userId: p.id,
          type: 'info'
        });

        return { ...p, role };
      }
      return p;
    });

    dbInstance.save();
    setSuccessMsg(isRtl ? 'تم تحديث الصلاحيات والوظيفة بنجاح.' : 'Account role profile upgraded successfully.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!newFullName || !newFullNameAr || !newPhone) {
      setErrorMsg(isRtl ? 'يرجى مراجعة وتعبئة جميع الحقول المطلوبة!' : 'Please fulfill all required fields correctly!');
      return;
    }

    // Check pre-existing username/phone
    const exists = dbInstance.profiles.some(p => p.phone === newPhone || p.fullName.toLowerCase() === newFullName.toLowerCase());
    if (exists) {
      setErrorMsg(isRtl ? 'هذا الموظف أو رقم الهاتف مدرج بالفعل في النظام!' : 'This staff name or phone is already registered inside our database!');
      return;
    }

    const cleanLangs = languages.split(',').map(l => l.trim()).filter(Boolean);

    const newProfile: Profile = {
      id: `p-user-${Date.now()}`,
      fullName: newFullName,
      fullNameAr: newFullNameAr,
      role: newRole,
      employeeType: newEmpType,
      languages: cleanLangs,
      monthlySalary: newRole === 'translator' || newRole === 'admin' ? Number(newSalary) || undefined : undefined,
      perWordRate: newRole === 'translator' ? Number(newRate) || undefined : undefined,
      phone: newPhone,
      email: newEmail.trim() || undefined,
      personalEmail: newPersonalEmail.trim() || undefined,
      isActive: true,
      password: newPassword || 'password123',
      createdAt: new Date().toISOString()
    };

    dbInstance.profiles.push(newProfile);
    dbInstance.save();

    // Trigger welcome email if email is provided
    if (newProfile.email) {
      sendWelcomeEmail(newProfile.email, newProfile.fullName, newProfile.password);
    }

    // Audit notification
    dbInstance.addNotification({
      title: `New Profile Spawned`,
      titleAr: `تم إنشاء حساب موظف جديد`,
      message: `New translation staff account "${newFullName}" authorized with role "${newRole.toUpperCase()}".`,
      messageAr: `تم إنشاء حساب موظف جديد "${newFullNameAr}" بصلاحيات "${newRole}" بنجاح.`,
      userId: newProfile.id,
      type: 'success'
    });

    setSuccessMsg(isRtl ? `تم إضافة الحساب الجديد (${newFullName}) بنجاح!` : `New systems account "${newFullName}" created and authorized!`);
    setIsCreateOpen(false);
    
    // Clear form
    setNewFullName('');
    setNewFullNameAr('');
    setNewEmail('');
    setNewPersonalEmail('');
    setNewPhone('');
    setNewSalary('');
    setNewRate('');
    setNewPassword('password123');
    
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfileForReset || !customNewPass) return;

    dbInstance.profiles = dbInstance.profiles.map(p => {
      if (p.id === selectedProfileForReset.id) {
        return { ...p, password: customNewPass };
      }
      return p;
    });
    dbInstance.save();

    dbInstance.addNotification({
      title: 'Credential Security Reset',
      titleAr: 'تحديث كلمة المرور للموظف',
      message: `System password for ${selectedProfileForReset.fullName} updated securely by Owner.`,
      messageAr: `تم إعادة تعيين كلمة مرور الموظف ${selectedProfileForReset.fullNameAr} بنجاح.`,
      userId: selectedProfileForReset.id,
      type: 'warning'
    });

    setSuccessMsg(isRtl ? `تمت إعادة تعيين كلمة المرور بنجاح للموظف ${selectedProfileForReset.fullNameAr}` : `Security credential successfully reset for ${selectedProfileForReset.fullName}!`);
    setSelectedProfileForReset(null);
    setCustomNewPass('');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const filteredProfiles = profiles.filter(p => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;
    return p.fullName.toLowerCase().includes(term) || 
           p.fullNameAr.toLowerCase().includes(term) || 
           (p.phone && p.phone.includes(term)) ||
           p.role.toLowerCase().includes(term);
  });

  // Authorization Matrix Definition
  const matrixActions = [
    { key: 'intake', labelEn: 'Intake / Register Legal Folders', labelAr: 'تسجيل وقبول ملفات الترجمة', owner: 'write', admin: 'write', sales: 'write', accountant: 'read', translator: 'none' },
    { key: 'assign', labelEn: 'Assign Translators & Define Costs', labelAr: 'تعيين المترجمين وتحديد الأسعار والتكلفة', owner: 'write', admin: 'write', sales: 'none', accountant: 'none', translator: 'none' },
    { key: 'approve_translation', labelEn: 'Verify & Approve Translations', labelAr: 'اعتماد ودقيق الملفات المترجمة مالياً', owner: 'write', admin: 'write', sales: 'none', accountant: 'none', translator: 'none' },
    { key: 'quotations', labelEn: 'Generate Price Quotations & Invoices', labelAr: 'إصدار عروض الأسعار وفواتير العملاء', owner: 'write', admin: 'write', sales: 'write', accountant: 'read', translator: 'none' },
    { key: 'revenues', labelEn: 'Access Revenues & Cost Ledger', labelAr: 'دفتر القيود المالية للإيرادات والمصروفات', owner: 'write', admin: 'none', sales: 'none', accountant: 'write', translator: 'none' },
    { key: 'cashbook', labelEn: 'Vault Cashbook & Reconcile (الخزينة)', labelAr: 'صندوق الخزينة ومطابقة الأرصدة المصرفية', owner: 'write', admin: 'read', sales: 'none', accountant: 'write', translator: 'none' },
    { key: 'closing', labelEn: 'Monthly Financial Closing & Dividend Split', labelAr: 'الحسابات الختامية وتوزيع الأرباح والشركاء', owner: 'write', admin: 'none', sales: 'none', accountant: 'none', translator: 'none' },
    { key: 'timesheets', labelEn: 'Linguist Salaries & Payroll attendance', labelAr: 'مرتبات وحضور وتوقيتات اللغويين', owner: 'write', admin: 'write', sales: 'none', accountant: 'write', translator: 'none' },
    { key: 'accounts', labelEn: 'Manage User Profiles & Powers Configuration', labelAr: 'إدارة حسابات الموظفين والصلاحيات والأمان', owner: 'write', admin: 'read', sales: 'none', accountant: 'none', translator: 'none' },
    { key: 'jobs_queue', labelEn: 'Access Translator Assignment Work Queue', labelAr: 'استلام ومعاينة وتسليم حزم المهام الشخصية', owner: 'read', admin: 'read', sales: 'none', accountant: 'none', translator: 'write' },
  ];

  const getPowerColor = (power: string) => {
    if (power === 'write') return 'bg-zinc-950 text-white font-bold border-zinc-900';
    if (power === 'read') return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    return 'bg-zinc-50 text-zinc-300 border-zinc-100 strike-through opacity-30';
  };

  const getPowerLabel = (power: string) => {
    if (power === 'write') return isRtl ? 'صلاحية كاملة (كتابة)' : 'Full (Write)';
    if (power === 'read') return isRtl ? 'قراءة فقط' : 'Read Only';
    return isRtl ? 'محجوب / مغلق' : 'Restricted';
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* SUCCESS & ERROR TOAST NOTIFICATIONS */}
      {successMsg && (
        <div className="p-4 bg-zinc-900 text-white border-l-4 border-emerald-500 rounded-xl flex items-center gap-2.5 animate-slide-in text-xs shadow-md">
          <CheckCircle size={16} className="text-emerald-400 shrink-0" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-950 text-red-200 border-l-4 border-red-500 rounded-xl flex items-center gap-2.5 animate-slide-in text-xs shadow-md">
          <Info size={16} className="text-red-400 shrink-0" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* HEADER TABS TRIGGER */}
      <div className="flex border-b border-zinc-200 gap-2">
        <button
          onClick={() => setActiveTab('directory')}
          className={`pb-3.5 px-4 font-sans text-xs font-bold tracking-wider uppercase transition-all border-b-2 cursor-pointer ${
            activeTab === 'directory'
              ? 'border-zinc-950 text-zinc-950 font-black'
              : 'border-transparent text-zinc-400 hover:text-zinc-650'
          }`}
        >
          {isRtl ? 'دليل حسابات الموظفين' : 'Staff Accounts Directory'}
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`pb-3.5 px-4 font-sans text-xs font-bold tracking-wider uppercase transition-all border-b-2 cursor-pointer ${
            activeTab === 'matrix'
              ? 'border-zinc-950 text-zinc-950 font-black'
              : 'border-transparent text-zinc-400 hover:text-zinc-650'
          }`}
        >
          {isRtl ? 'مصفوفة الصلاحيات والحماية' : 'Authorization & Permissions Matrix'}
        </button>

        <button
          onClick={() => setActiveTab('audits')}
          className={`pb-3.5 px-4 font-sans text-xs font-bold tracking-wider uppercase transition-all border-b-2 cursor-pointer ${
            activeTab === 'audits'
              ? 'border-zinc-950 text-zinc-950 font-black'
              : 'border-transparent text-zinc-400 hover:text-zinc-650'
          }`}
        >
          {isRtl ? 'سجل عمليات الأمان والمصادقة' : 'Access & Auth Audit Logging'}
        </button>
      </div>

      {/* VIEW 1: DIRECTORY */}
      {activeTab === 'directory' && (
        <div className="space-y-6">
          {/* CONTROL BAR */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-zinc-150">
            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute left-3 top-2.5 text-zinc-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={isRtl ? 'بحث باسم المستخدم، رقم الهاتف أو الصلاحية...' : 'Search system accounts...'}
                className="pl-9 pr-4 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-zinc-450 focus:bg-white"
              />
            </div>

            {currentRole === 'owner' && (
              <button
                onClick={() => setIsCreateOpen(!isCreateOpen)}
                className="px-4 py-1.5 bg-zinc-950 hover:bg-zinc-850 text-white font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <UserPlus size={14} />
                <span>{isRtl ? 'إضافة حساب لغوي / محاسب جديد' : 'Provision New System User'}</span>
              </button>
            )}
          </div>

          {/* CREATE USER FORMS DRAWER */}
          {isCreateOpen && (
            <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm animate-slide-in">
              <div className="pb-3 border-b border-zinc-100 flex items-center gap-2 mb-4">
                <Fingerprint size={16} className="text-zinc-900" />
                <h4 className="font-semibold text-zinc-900 text-sm">{isRtl ? 'تجهيز وحجز ملف مستخدم نظام جديد' : 'Authorize New Translators & Staff Terminals'}</h4>
              </div>

              <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'الاسم الثنائي الكامل اللاتيني' : 'Full English Name *'}</label>
                  <input 
                    type="text" 
                    value={newFullName}
                    onChange={e => setNewFullName(e.target.value)}
                    required
                    placeholder="e.g. Heba Salem"
                    className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'الاسم الثنائي الكامل العربي *' : 'Full Arabic Name *'}</label>
                  <input 
                    type="text" 
                    value={newFullNameAr}
                    onChange={e => setNewFullNameAr(e.target.value)}
                    required
                    placeholder="مثل: هبة سالم"
                    className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'رقم الهاتف (اسم المستخدم للولوج) *' : 'Phone Number (Username Login) *'}</label>
                  <input 
                    type="text" 
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    required
                    placeholder="e.g. +201011119999"
                    className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'تعيين الصلاحيات والمستوى *' : 'System Authorization Level *'}</label>
                  <select 
                    value={newRole}
                    onChange={e => setNewRole(e.target.value as UserRole)}
                    className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none"
                  >
                    <option value="translator">{isRtl ? 'مترجم لغوي (Translator)' : 'Linguist / Translator'}</option>
                    <option value="sales">{isRtl ? 'مبيعات وتسليم (Sales Executive)' : 'Sales & Client Manager'}</option>
                    <option value="accountant">{isRtl ? 'محاسب الخزينة (Accountant)' : 'Bureau Accountant'}</option>
                    <option value="admin">{isRtl ? 'مدير مكتب (Admin Manager)' : 'Bureau Admin Deputy'}</option>
                    <option value="owner">{isRtl ? 'مالك مكتب (Owner)' : 'Legal Bureau Partner Owner'}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'فئة التعيين المكتبي' : 'Office Service Category'}</label>
                  <select 
                    value={newEmpType}
                    onChange={e => setNewEmpType(e.target.value as EmployeeType)}
                    className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none"
                  >
                    <option value="freelance">{isRtl ? 'مستشار فريلانس (Freelance)' : 'Independent Freelancer'}</option>
                    <option value="staff">{isRtl ? 'موظف مثبت (Direct Staff)' : 'Direct Salaried Staff'}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'البريد الإلكتروني الرسمي (العمل)' : 'Official Corporate Email'}</label>
                  <input 
                    type="email" 
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="e.g. name@globalizetl.com"
                    className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'البريد الإلكتروني الشخصي' : 'Personal Email'}</label>
                  <input 
                    type="email" 
                    value={newPersonalEmail}
                    onChange={e => setNewPersonalEmail(e.target.value)}
                    placeholder="e.g. name@gmail.com"
                    className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'كلمة المرور الابتدائية' : 'Secret Credentials Password'}</label>
                  <input 
                    type="text" 
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="password123"
                    className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none"
                  />
                </div>

                {newRole === 'translator' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'سعر الكلمة للمهام (ج.م / كلمة)' : 'Incentive word rate (EGP/Word)'}</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={newRate}
                        onChange={e => setNewRate(e.target.value)}
                        placeholder="0.22"
                        className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'اللغات المتقنة (مفصولة بفاصلة)' : 'Target Languages (Comma separated)'}</label>
                      <input 
                        type="text" 
                        value={languages}
                        onChange={e => setLanguages(e.target.value)}
                        placeholder="English, Arabic, French"
                        className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none"
                      />
                    </div>
                  </>
                )}

                {(newEmpType === 'staff' || newRole === 'admin') && (
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">{isRtl ? 'الراتب المقطوع الشهري الثابت (ج.م)' : 'Direct Fixed Monthly Salary (EGP)'}</label>
                    <input 
                      type="number" 
                      value={newSalary}
                      onChange={e => setNewSalary(e.target.value)}
                      placeholder="e.g. 8500"
                      className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-50/50 rounded-lg text-xs font-semibold focus:outline-none"
                    />
                  </div>
                )}

                <div className="md:col-span-3 pt-3 flex justify-end gap-2 text-xs">
                  <button 
                    type="button" 
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 text-zinc-500 font-semibold cursor-pointer"
                  >
                    {isRtl ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2 bg-zinc-950 hover:bg-zinc-850 text-white font-bold rounded-lg cursor-pointer shadow-sm"
                  >
                    {isRtl ? 'اعتماد وحفظ الحقل' : 'Authorize & Provision Account'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* PASSWORD RESET DIALOG MODAL CONTROLLER */}
          {selectedProfileForReset && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl border border-zinc-200 shadow-xl max-w-sm w-full p-6 space-y-4">
                <div className="flex items-center gap-2 text-zinc-900 border-b border-zinc-100 pb-3">
                  <Lock size={16} />
                  <h4 className="font-bold text-xs uppercase tracking-wider">{isRtl ? 'تجاوز وإعادة تعيين كلمة المرور' : 'Override Staff Credentials'}</h4>
                </div>

                <div className="space-y-1 text-xs">
                  <p className="text-zinc-500">{isRtl ? 'سيتم مسح كلمة المرور القديمة للموظف وكتابة الكلمة الجديدة الآمنة للولوج:' : 'This replaces active database authentication passwords for staff member:'}</p>
                  <p className="font-bold text-zinc-850 bg-zinc-50 p-2 border border-zinc-150 rounded mt-1">{isRtl ? selectedProfileForReset.fullNameAr : selectedProfileForReset.fullName} ({selectedProfileForReset.role})</p>
                </div>

                <form onSubmit={handleResetPasswordSubmit} className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{isRtl ? 'الحاشية السرية لكلمة المرور الجديدة' : 'New Security Phrase'}</label>
                    <input 
                      type="text" 
                      value={customNewPass}
                      onChange={e => setCustomNewPass(e.target.value)}
                      required
                      placeholder="Enter new phrase..."
                      className="w-full px-3 py-1.5 border border-zinc-200 text-xs font-semibold rounded-lg focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 text-xs pt-2">
                    <button 
                      type="button" 
                      onClick={() => setSelectedProfileForReset(null)}
                      className="px-3.5 py-1.5 border border-zinc-200 rounded-lg text-zinc-400 font-medium cursor-pointer"
                    >
                      {isRtl ? 'تراجع' : 'Cancel'}
                    </button>
                    <button 
                      type="submit" 
                      className="px-4 py-1.5 bg-zinc-950 text-white rounded-lg font-bold cursor-pointer"
                    >
                      {isRtl ? 'إعادة التعيين الآن' : 'Commit New Password'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ACCOUNTS LIST DIRECTORY TABLE */}
          <div className="bg-white rounded-xl border border-zinc-150 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-zinc-600 font-sans">
                <thead className="bg-zinc-50 text-[10px] uppercase font-bold tracking-wider text-zinc-400 border-b border-zinc-100">
                  <tr>
                    <th className="px-6 py-3">{isRtl ? 'الموظف والجنسية' : 'User profile name'}</th>
                    <th className="px-6 py-3">{isRtl ? 'رقم الهاتف للولوج' : 'Login username / Phone'}</th>
                    <th className="px-6 py-3">{isRtl ? 'رتبة ومستوى الصلاحيات' : 'Role level'}</th>
                    <th className="px-6 py-3">{isRtl ? 'نوع التعيين' : 'Deployment'}</th>
                    <th className="px-6 py-3">{isRtl ? 'سعر الكلمة / الراتب الثابت' : 'Compensation rates'}</th>
                    <th className="px-6 py-3">{isRtl ? 'ترخيص الحساب' : 'Security Access'}</th>
                    <th className="px-6 py-3 text-right">{isRtl ? 'إجراءات الأمان' : 'System Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredProfiles.map(p => {
                    const isCurrentUser = p.id === currentUser.id;
                    return (
                      <tr key={p.id} className="hover:bg-zinc-50/40 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-90 w-8 h-8 rounded-full bg-zinc-950 text-white font-mono text-xs font-bold flex items-center justify-center shadow-inner">
                              {p.fullName.split(' ').map(n=>n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-zinc-900">{isRtl ? p.fullNameAr : p.fullName}</p>
                              <div className="flex flex-col gap-0.5 mt-0.5">
                                {p.email && (
                                  <p className="text-[9px] text-zinc-500 font-mono">
                                    <span className="text-zinc-400 mr-1 italic">Off:</span> {p.email}
                                  </p>
                                )}
                                {p.personalEmail && (
                                  <p className="text-[9px] text-zinc-400 font-mono">
                                    <span className="text-zinc-400 mr-1 italic">Pers:</span> {p.personalEmail}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 font-mono font-semibold text-zinc-800">
                          {p.phone || 'N/A'}
                        </td>

                        <td className="px-6 py-4">
                          {currentRole === 'owner' ? (
                            <select 
                              value={p.role}
                              onChange={e => handleRoleChange(p.id, e.target.value as UserRole)}
                              disabled={isCurrentUser}
                              className={`px-2 py-1 text-[10px] font-bold rounded-md border border-zinc-150 focus:outline-none cursor-pointer ${
                                isCurrentUser ? 'opacity-70 cursor-not-allowed bg-zinc-50' : 'bg-white'
                              }`}
                            >
                              <option value="owner">Owner</option>
                              <option value="admin">Admin</option>
                              <option value="accountant">Accountant</option>
                              <option value="sales">Sales</option>
                              <option value="translator">Translator</option>
                            </select>
                          ) : (
                            <span className="px-2 py-0.5 font-bold uppercase text-[9px] bg-zinc-100 border border-zinc-200 text-zinc-700 rounded-md">
                              {p.role}
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span className="text-[10px] uppercase font-semibold text-zinc-500">
                            {p.employeeType === 'staff' ? (isRtl ? 'مرتب مباشر' : 'Salaried staff') : (isRtl ? 'فريلانس مستقل' : 'Freelance')}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-zinc-900 font-mono">
                          {p.monthlySalary ? (
                            <span>EGP {p.monthlySalary.toLocaleString()}/mo</span>
                          ) : p.perWordRate ? (
                            <span>EGP {p.perWordRate.toFixed(2)}/word</span>
                          ) : (
                            <span className="text-zinc-300">—</span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleActive(p.id)}
                            disabled={isCurrentUser}
                            className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-full border transition-all ${
                              isCurrentUser ? 'opacity-50 cursor-not-allowed bg-zinc-50 text-zinc-400 border-zinc-100' :
                              p.isActive 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                                : 'bg-red-50 text-red-750 border-red-200 hover:bg-red-100'
                            }`}
                          >
                            {p.isActive ? <UserCheck size={11} /> : <UserX size={11} />}
                            <span>{p.isActive ? (isRtl ? 'نشط / مصرح' : 'Active / Allowed') : (isRtl ? 'معطل / معلق' : 'Suspended')}</span>
                          </button>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setSelectedProfileForReset(p)}
                            className="p-1 px-2.5 bg-zinc-50 hover:bg-zinc-100 hover:text-zinc-950 border border-zinc-200 rounded text-[10px] font-bold text-zinc-500 transition-colors cursor-pointer"
                            title="Reset passwords"
                          >
                            {isRtl ? 'إعادة ضبط الرقم السري' : 'Override Key'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2:permissions MATRIX */}
      {activeTab === 'matrix' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-zinc-150 space-y-2">
            <h4 className="font-semibold text-zinc-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck size={15} />
              {isRtl ? 'مرجع التحكم بالنظام وصلاحية الأدوار الفنية' : 'System Administration Authorization Blueprint'}
            </h4>
            <p className="text-xs text-zinc-450 text-zinc-400 leading-relaxed">
              {isRtl 
                ? 'يوضح هذا المرجع المستويات الهيكلية للمصادقة المبرمجة بالشيفرة البرمجية للمكتب القانوني. يتم فلترة وتطويق لوحة التحكم، المقاصات، الدفاتر المحوسبة والسيولة النقدية تلقائياً بناء على فئة ولوج المستخدم.'
                : 'The system programmatically secures and intercepts modules based on these authorization flags. Below is a grid tracing active permission vectors across all modules inside the accrediting translation office.'}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-zinc-150 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-zinc-700">
                <thead className="bg-zinc-50 text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-100">
                  <tr>
                    <th className="px-6 py-3.5 w-64">{isRtl ? 'المهام وصلاحيات الموديول' : 'Workspace / Module'}</th>
                    <th className="px-4 py-3.5 text-center font-bold">Owner</th>
                    <th className="px-4 py-3.5 text-center font-bold">Admin</th>
                    <th className="px-4 py-3.5 text-center font-bold">Accountant</th>
                    <th className="px-4 py-3.5 text-center font-bold">Sales</th>
                    <th className="px-4 py-3.5 text-center font-bold">Translator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-sans">
                  {matrixActions.map(action => (
                    <tr key={action.key} className="hover:bg-zinc-50/30 transition-colors">
                      <td className="px-6 py-4 font-semibold text-zinc-900">
                        <p>{isRtl ? action.labelAr : action.labelEn}</p>
                        <span className="text-[9px] text-zinc-400 mt-0.5 block font-mono">module_acl::{action.key}</span>
                      </td>

                      {/* Owner */}
                      <td className="px-4 py-4 text-center">
                        <span className={`px-2 py-1 rounded text-[9px] font-mono font-bold border ${getPowerColor(action.owner)}`}>
                          {getPowerLabel(action.owner)}
                        </span>
                      </td>

                      {/* Admin */}
                      <td className="px-4 py-4 text-center">
                        <span className={`px-2 py-1 rounded text-[9px] font-mono font-bold border ${getPowerColor(action.admin)}`}>
                          {getPowerLabel(action.admin)}
                        </span>
                      </td>

                      {/* Accountant */}
                      <td className="px-4 py-4 text-center">
                        <span className={`px-2 py-1 rounded text-[9px] font-mono font-bold border ${getPowerColor(action.accountant)}`}>
                          {getPowerLabel(action.accountant)}
                        </span>
                      </td>

                      {/* Sales */}
                      <td className="px-4 py-4 text-center">
                        <span className={`px-2 py-1 rounded text-[9px] font-mono font-bold border ${getPowerColor(action.sales)}`}>
                          {getPowerLabel(action.sales)}
                        </span>
                      </td>

                      {/* Translator */}
                      <td className="px-4 py-4 text-center">
                        <span className={`px-2 py-1 rounded text-[9px] font-mono font-bold border ${getPowerColor(action.translator)}`}>
                          {getPowerLabel(action.translator)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: AUDITS LOGGING */}
      {activeTab === 'audits' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-zinc-150">
            <div>
              <h4 className="font-semibold text-zinc-900 text-xs uppercase tracking-wider">{isRtl ? 'سجلات الأنشطة الفورية وعمليات الدخول' : 'Security Log Auditing System'}</h4>
              <p className="text-[10px] text-zinc-400 mt-0.5">{isRtl ? 'سجل تتبع لحظي لتدقيق صلاحيات وتحركات المستخدمين داخل النظام.' : 'Chronological stream of cryptographic token sessions, view transitions, and transactional edits.'}</p>
            </div>
            <button 
              onClick={() => {
                setNotifLogs([...dbInstance.notifications]);
                setSuccessMsg(isRtl ? 'تم تحديث السجلات بنجاح.' : 'Audit list re-synchronized.');
                setTimeout(() => setSuccessMsg(''), 2000);
              }}
              className="p-1 px-3 bg-zinc-50 hover:bg-zinc-100 text-zinc-650 rounded border border-zinc-200 flex items-center gap-1 text-[10px] font-bold cursor-pointer transition-colors"
            >
              <RefreshCw size={11} />
              <span>{isRtl ? 'تحديث فوري' : 'Sync Logs'}</span>
            </button>
          </div>

          <div className="bg-white border border-zinc-150 rounded-xl overflow-hidden shadow-sm">
            <div className="p-3 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{isRtl ? 'سجل الأحداث الـ 50 الأخيرة' : 'Latest 50 security transactions'}</span>
              <span className="text-[10px] text-zinc-500 font-mono font-bold">SHA256::LOGS_ENABLED</span>
            </div>

            <div className="divide-y divide-zinc-100 font-mono text-[11px] leading-snug p-2 max-h-[500px] overflow-y-auto">
              {notifLogs.length === 0 ? (
                <div className="p-10 text-center text-zinc-400 italic">
                  {isRtl ? 'لا توجد سجلات أمنية مسجلة بعد.' : 'No audit transactions currently recorded inside the repository.'}
                </div>
              ) : (
                notifLogs.map((log, index) => {
                  const typeColors = 
                    log.type === 'success' ? 'text-emerald-600 bg-emerald-50' : 
                    log.type === 'warning' ? 'text-amber-600 bg-amber-50' : 
                    'text-zinc-600 bg-zinc-50';

                  return (
                    <div key={log.id || index} className="p-3.5 hover:bg-zinc-50/60 transition-colors flex items-start gap-4">
                      <span className={`px-2 py-0.5 text-[8px] font-bold uppercase rounded shrink-0 border border-zinc-200/50 ${typeColors}`}>
                        {log.type || 'info'}
                      </span>
                      
                      <div className="flex-1 space-y-1 font-sans">
                        <p className="font-bold text-zinc-900 text-xs">
                          {isRtl ? log.titleAr || log.title : log.title}
                        </p>
                        <p className="text-zinc-500 text-xs">
                          {isRtl ? log.messageAr || log.message : log.message}
                        </p>
                        <div className="flex items-center gap-3 text-[9px] text-zinc-400 font-mono pt-1">
                          <span>PID: {log.userId || 'system'}</span>
                          <span>•</span>
                          <span>Timestamp: {new Date(log.createdAt).toLocaleString()}</span>
                          <span>•</span>
                          <span>Sign: Hash#{log.id?.slice(-6) || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
