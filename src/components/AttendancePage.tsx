/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar, CheckSquare, Plus, Check, X, ShieldAlert, BadgeAlert, 
  Settings, Award, Sparkles, FolderLock 
} from 'lucide-react';
import { Profile, SalaryAttendance, AttendanceSession } from '../types';
import dbInstance from '../db/store';

interface AttendancePageProps {
  isRtl: boolean;
  currentRole: string;
}

export const AttendancePage: React.FC<AttendancePageProps> = ({ isRtl, currentRole }) => {
  const [translators, setTranslators] = useState<Profile[]>([]);
  const [attendance, setAttendance] = useState<SalaryAttendance[]>([]);
  const [activeTab, setActiveTab] = useState<'roster' | 'grid'>('grid');

  // Days in selected payroll block (Early June 2026)
  const auditDays = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const auditPeriod = '2026-06';

  useEffect(() => {
    // Select salaried staff
    const staff = dbInstance.profiles.filter(p => p.role === 'translator' || p.role === 'admin');
    setTranslators(staff);
    setAttendance(dbInstance.attendance);

    const sub = dbInstance.subscribe(() => {
      const updatedStaff = dbInstance.profiles.filter(p => p.role === 'translator' || p.role === 'admin');
      setTranslators(updatedStaff);
      setAttendance(dbInstance.attendance);
    });
    return sub;
  }, []);

  const handleToggleAttendance = (tid: string, date: string, session: AttendanceSession) => {
    if (currentRole !== 'owner' && currentRole !== 'admin') {
      alert('Access Denied. Only Owners or Admins can modify timesheets.');
      return;
    }

    const matches = attendance.find(
      a => a.translatorId === tid && a.workDate === date && a.session === session
    );

    if (matches) {
      // Toggle states: present -> vacation -> absent/removed
      if (!matches.isVacation) {
        matches.isVacation = true;
        matches.vacationType = 'annual';
      } else {
        // remove completely
        dbInstance.attendance = dbInstance.attendance.filter(a => a.id !== matches.id);
      }
    } else {
      // create new registry
      dbInstance.attendance.push({
        id: `att-${Date.now()}`,
        translatorId: tid,
        workDate: date,
        session,
        isVacation: false
      });
    }

    dbInstance.save();
  };

  const getAttendanceState = (tid: string, date: string, session: AttendanceSession) => {
    const record = attendance.find(
      a => a.translatorId === tid && a.workDate === date && a.session === session
    );
    if (!record) return 'none';
    if (record.isVacation) return 'vacation';
    return 'present';
  };

  return (
    <div className="space-y-6 font-sans text-slate-700">
      
      {/* Tab select slider */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 bg-white p-5 rounded-2xl shadow-sm border border-slate-50">
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('grid')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {isRtl ? 'دفتر حضور وغياب اللغويين' : 'Translator Attendance timesheet'}
          </button>
          <button
            onClick={() => setActiveTab('roster')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'roster' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {isRtl ? 'سجلات ومعدلات المترجمين' : 'Translator Productivity Roster'}
          </button>
        </div>
      </div>

      {/* VIEW 1: INTERACTIVE ATTENDANCE MATRIX */}
      {activeTab === 'grid' && (
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">
              {isRtl ? 'جدول تسجيل الحضور اليومي لشهر يونيو 2026' : 'Interactive Shift timesheet (June 2026 Batch)'}
            </h3>
            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 font-bold font-mono text-[10px] rounded-full">
              Audit Period: {auditPeriod}
            </span>
          </div>

          <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
            {isRtl 
              ? 'تتبع نوبات حضور وغياب الموظفين الأساسيين لتقدير مستحقات المرتبات. الرموز: (✓) حضور، (V) إجازة سنوية مدفوعة، (المربع الفارغ) غياب غير مدفوع.'
              : 'Interactive checkboxes logging translator presence. Key-check definitions: Green "✓" means Present on session, and Amber "V" indicates paid annual Vacation leave.'}
          </p>

          <div className="overflow-x-auto w-full mt-4 border border-slate-100 rounded-xl">
            <table className="w-full text-xs text-slate-600 border-collapse">
              <thead>
                <tr className="bg-slate-100 text-[10px] uppercase font-bold text-slate-405">
                  <th className="px-4 py-3 border-r border-slate-200 text-left">Staff Linguists</th>
                  <th className="px-4 py-3 border-r border-slate-200 text-center">Session Shift</th>
                  {auditDays.map(d => (
                    <th key={d} className="px-2 py-3 border-r border-slate-200 text-center font-mono w-14">
                      {d < 10 ? `0${d}` : d} Jun
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-xs">
                {translators.map(t => (
                  <React.Fragment key={t.id}>
                    {/* Shift Morning */}
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-950 border-r border-slate-100 font-sans" rowSpan={2}>
                        <p>{isRtl ? t.fullNameAr : t.fullName}</p>
                        <span className="text-[10px] text-indigo-600 font-semibold block capitalize mt-1 text-slate-400">{t.employeeType}</span>
                      </td>
                      <td className="px-3 py-2 border-r border-slate-100 text-center font-semibold text-[10px] text-slate-400 uppercase tracking-wider bg-slate-50/30">
                        Morning
                      </td>
                      {auditDays.map(d => {
                        const dayStr = d < 10 ? `0${d}` : `${d}`;
                        const fullDate = `${auditPeriod}-${dayStr}`;
                        const state = getAttendanceState(t.id, fullDate, 'morning');

                        return (
                          <td 
                            key={d} 
                            onClick={() => handleToggleAttendance(t.id, fullDate, 'morning')}
                            className={`p-2 border-r border-slate-100 text-center cursor-pointer select-none transition-all active:scale-95 ${
                              state === 'present' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' :
                              state === 'vacation' ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' :
                              'bg-slate-50 text-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            <span className="font-extrabold text-xs font-mono">
                              {state === 'present' && '✓'}
                              {state === 'vacation' && 'V'}
                              {state === 'none' && '-'}
                            </span>
                          </td>
                        );
                      })}
                    </tr>

                    {/* Shift Evening */}
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-2 border-r border-slate-100 text-center font-semibold text-[10px] text-slate-400 uppercase tracking-wider bg-slate-50/30">
                        Evening
                      </td>
                      {auditDays.map(d => {
                        const dayStr = d < 10 ? `0${d}` : `${d}`;
                        const fullDate = `${auditPeriod}-${dayStr}`;
                        const state = getAttendanceState(t.id, fullDate, 'evening');

                        return (
                          <td 
                            key={d} 
                            onClick={() => handleToggleAttendance(t.id, fullDate, 'evening')}
                            className={`p-2 border-r border-slate-100 text-center cursor-pointer select-none transition-all active:scale-95 ${
                              state === 'present' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' :
                              state === 'vacation' ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' :
                              'bg-slate-50 text-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            <span className="font-extrabold text-xs font-mono">
                              {state === 'present' && '✓'}
                              {state === 'vacation' && 'V'}
                              {state === 'none' && '-'}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-2 mt-4 p-3 bg-indigo-50 text-indigo-950 border border-indigo-100/30 rounded-xl text-[10px] font-sans font-medium">
            <ShieldAlert size={14} className="shrink-0 text-indigo-500" />
            <span>
              {isRtl 
                ? 'معدلات الحضور تقيد برفع "المالك" أو "المدير المسؤول". انقر مباشرة على كل المربعات أعلاه للتنقل الدائري بين الحضور "✓"، الإجازة "V"، والغياب "-".'
                : 'Modifying timesheets is permitted ONLY under Owner or Admin access. Toggling schedule cells cycle presence statuses directly in real time.'}
            </span>
          </div>
        </div>
      )}

      {/* VIEW 2: TRANSLATOR DIRECT PERFORMANCE LOG */}
      {activeTab === 'roster' && (
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">
              {isRtl ? 'سجل إنتاجية الكلمات وقواعد السداد للغويين' : 'Active Translator Productivity & Payroll Logs'}
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Real-time stats</span>
          </div>

          <p className="text-[10px] text-slate-400 leading-normal">
            Lists overall agency linguists including freelance word rates and staff salary quotas, showing processed folder counts in our systems.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dbInstance.profiles.filter(p => p.role === 'translator').map(t => {
              // Calculate assignments stats
              const totalAssigned = dbInstance.assignments.filter(a => a.translatorId === t.id);
              const wordCount = totalAssigned.reduce((s, a) => s + (a.wordCountActual || a.wordCountAssigned), 0);
              const completedCount = totalAssigned.filter(a => a.status === 'approved').length;

              return (
                <div key={t.id} className="p-5 border border-slate-100 bg-slate-50/50 rounded-2xl flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-1.5 h-full bg-[#1B4F72]"></div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">{t.fullName}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">{t.fullNameAr} • {t.phone || 'No phone registered'}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-[#1B4F72]/10 text-[#1B4F72] text-[9px] font-bold font-mono rounded-full capitalize">
                      {t.employeeType}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3.5 mt-5 text-[11px] font-sans">
                    <div>
                      <span className="text-slate-400 block">Total Words</span>
                      <strong className="font-mono text-slate-800 font-bold">{wordCount.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Folder Count</span>
                      <strong className="font-mono text-slate-800 font-bold">{totalAssigned.length} files</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Unit Rate / Wage</span>
                      <strong className="font-mono text-slate-800 font-bold">
                        {t.employeeType === 'staff' ? `EGP ${(t.monthlySalary || 7500).toLocaleString()}/mo` : `EGP ${t.perWordRate || 0.20}/wd`}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendancePage;
