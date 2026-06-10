/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Clipboard, Clock, BookOpen, CheckCircle, CheckSquare, 
  ArrowUpRight, AlertCircle, Send, CheckCircle2, DollarSign,
  Paperclip, ThumbsDown, XCircle, AlertTriangle, FileText,
  FileUp, Trash2
} from 'lucide-react';
import { TaskAssignment, Profile, TaskAttachment } from '../types';
import dbInstance from '../db/store';

interface DashboardTranslatorProps {
  isRtl: boolean;
  onNavigateTab?: (tab: string) => void;
}

export const DashboardTranslator: React.FC<DashboardTranslatorProps> = ({
  isRtl,
  onNavigateTab
}) => {
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]);
  const [profile, setProfile] = useState<Profile>(dbInstance.activeProfile);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [selectedAsgId, setSelectedAsgId] = useState<string | null>(null);
  const [actualWords, setActualWords] = useState<number>(0);

  // States for declining task assignment
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [decliningAsgId, setDecliningAsgId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  // States for uploading translated documents on submission
  const [dragActive, setDragActive] = useState(false);
  const [translatedAttachments, setTranslatedAttachments] = useState<TaskAttachment[]>([]);

  useEffect(() => {
    // Collect assignments matching this active profile
    setProfile(dbInstance.activeProfile);
    const filterOwn = dbInstance.assignments.filter(a => a.translatorId === dbInstance.activeProfile.id);
    setAssignments(filterOwn);

    const sub = dbInstance.subscribe(() => {
      setProfile(dbInstance.activeProfile);
      const updatedAsgs = dbInstance.assignments.filter(a => a.translatorId === dbInstance.activeProfile.id);
      setAssignments(updatedAsgs);
    });
    return sub;
  }, []);

  const handleStartWork = (asgId: string) => {
    const asg = dbInstance.assignments.find(a => a.id === asgId);
    if (asg) {
      asg.status = 'in_progress';
      dbInstance.save();
    }
  };

  const handleOpenSubmitModal = (asgId: string, baseWords: number) => {
    setSelectedAsgId(asgId);
    setActualWords(baseWords);
    setTranslatedAttachments([]);
    setDragActive(false);
    setIsSubmitModalOpen(true);
  };

  const processSubmitFiles = (files: FileList) => {
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      const isSmall = file.size < 400 * 1024; // Keep local storage within limits
      
      if (isSmall) {
        reader.onloadend = () => {
          const newAttachment: TaskAttachment = {
            id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            name: file.name,
            size: file.size,
            type: file.type,
            url: reader.result as string,
            uploadedAt: new Date().toISOString()
          };
          setTranslatedAttachments(prev => [...prev, newAttachment]);
        };
        reader.readAsDataURL(file);
      } else {
        const objectUrl = URL.createObjectURL(file);
        const newAttachment: TaskAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: file.name,
          size: file.size,
          type: file.type,
          url: objectUrl,
          uploadedAt: new Date().toISOString()
        };
        setTranslatedAttachments(prev => [...prev, newAttachment]);
      }
    });
  };

  const handleDragSubmit = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDropSubmit = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSubmitFiles(e.dataTransfer.files);
    }
  };

  const handleFileChangeSubmit = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      processSubmitFiles(e.target.files);
    }
  };

  const handleDeleteSubmitAttachment = (id: string) => {
    setTranslatedAttachments(prev => prev.filter(att => att.id !== id));
  };

  const handleConfirmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (translatedAttachments.length === 0) {
      alert(isRtl ? '⚠️ يرجى إدخال وإرفاق الملف المترجم النهائي أولاً!' : '⚠️ Please select or drop the final translated document before submitting.');
      return;
    }
    if (selectedAsgId) {
      dbInstance.submitAssignment(selectedAsgId, actualWords, translatedAttachments);
      setIsSubmitModalOpen(false);
      setSelectedAsgId(null);
      setTranslatedAttachments([]);
      alert(isRtl ? '🎉 تم رفع الترجمة بنجاح وتسجيل الموعد والحسابات!' : '🎉 Translated document uploaded and job completed successfully!');
    }
  };

  const handleOpenDeclineModal = (asgId: string) => {
    setDecliningAsgId(asgId);
    setDeclineReason('');
    setIsDeclineModalOpen(true);
  };

  const handleConfirmDecline = (e: React.FormEvent) => {
    e.preventDefault();
    if (decliningAsgId) {
      dbInstance.declineAssignment(decliningAsgId, declineReason);
      setIsDeclineModalOpen(false);
      setDecliningAsgId(null);
      setDeclineReason('');
    }
  };

  // Compute stats
  const totalAssignedWords = assignments.reduce((s, a) => s + a.wordCountAssigned, 0);
  const pendingAssignmentsCount = assignments.filter(a => a.status === 'assigned' || a.status === 'in_progress').length;
  const completedAssignmentsCount = assignments.filter(a => a.status === 'approved' || a.status === 'submitted').length;
  const totalEarningsEgp = assignments.filter(a => a.status === 'approved').reduce((s, a) => s + a.calculatedAmount, 0);

  const sortedPendingDeadlines = [...assignments]
    .filter(a => a.status === 'assigned' || a.status === 'in_progress')
    .sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });

  const approvedAssignments = assignments.filter(a => a.status === 'approved');
  const submittedAssignments = assignments.filter(a => a.status === 'submitted');

  const getRemainingTimeStr = (deadlineStr?: string) => {
    if (!deadlineStr) return '';
    const diffMs = new Date(deadlineStr).getTime() - Date.now();
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    
    if (diffMs <= 0) {
      return isRtl ? '⚠️ متأخرة!' : '⚠️ Overdue!';
    }
    
    if (diffHours < 24) {
      return isRtl ? `⏳ متبقي ${diffHours} ساعة` : `⏳ ${diffHours} hr${diffHours === 1 ? '' : 's'} left`;
    }
    
    const diffDays = Math.ceil(diffHours / 24);
    return isRtl ? `📅 متبقي ${diffDays} يوم` : `📅 ${diffDays} day${diffDays === 1 ? '' : 's'} left`;
  };

  return (
    <div className="space-y-6 font-sans text-slate-700">
      {/* Translator Header Info */}
      <div className="p-5 bg-gradient-to-r from-purple-950 to-slate-900 rounded-2xl text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-md border border-slate-800">
        <div>
          <span className="px-2.5 py-0.5 bg-amber-500/15 text-amber-500 text-[10px] font-bold tracking-wider font-mono rounded-full uppercase">
            Translator Profile: {profile.fullName}
          </span>
          <h2 className="text-xl font-extrabold tracking-tight mt-1.5">
            {isRtl ? `بوابة اللغويين وإنتاج الترجمة — ${profile.fullNameAr}` : `Translator Production Dashboard — ${profile.fullName}`}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl leading-normal">
            {isRtl 
              ? 'تتبَّع قائمة الملفات المخصصة لك، مراجعة تواريخ الاستحقاق بانتظام، وضع الشارات المحدثة على المهام لتسهيل المراجعة الإدارية، وتسليم الترجمات النهائية.'
              : 'Review your personal document assignments queue, track due dates, mark tasks in-progress, and submit finalized files to the review team.'}
          </p>
        </div>
        <div className="shrink-0 bg-slate-800/80 px-4 py-3 rounded-xl border border-slate-700 font-sans flex flex-col items-center">
          <span className="text-[10px] text-slate-400 font-bold uppercase">Contracted Base</span>
          <span className="text-base font-black text-slate-100 font-mono mt-1">
            {profile.employeeType === 'staff' ? `${profile.contractWords?.toLocaleString() || 50000} words/mo` : 'Freelance Rates'}
          </span>
        </div>
      </div>

      {/* TRANSLATOR PERSONAL STATS CARD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Counter 1 */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <Clipboard size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{isRtl ? 'إجمالي الكلمات المكلفة' : 'Assigned Words'}</span>
            <h3 className="text-lg font-black text-slate-900 mt-1 font-mono">{totalAssignedWords.toLocaleString()}</h3>
          </div>
        </div>

        {/* Counter 2 */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <Clock size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{isRtl ? 'ملفات بانتظار الترجمة' : 'Pending Files'}</span>
            <h3 className="text-lg font-black text-slate-900 mt-1 font-mono">{pendingAssignmentsCount}</h3>
          </div>
        </div>

        {/* Counter 3 */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <BookOpen size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{isRtl ? 'ملفات مكتملة ومقروءة' : 'Completed Files'}</span>
            <h3 className="text-lg font-black text-slate-900 mt-1 font-mono">{completedAssignmentsCount}</h3>
          </div>
        </div>

        {/* Counter 4 */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <DollarSign size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{isRtl ? 'المستحق الحالي بالجنيه' : 'Approved Earnings'}</span>
            <h3 className="text-lg font-black text-slate-900 mt-1 font-mono">
              EGP {profile.employeeType === 'staff' ? (profile.monthlySalary || 7500).toLocaleString() : totalEarningsEgp.toLocaleString()}
            </h3>
          </div>
        </div>
      </div>

      {/* DEDICATED SECTIONS: PENDING TASK DEADLINES & ACCRUED EARNINGS BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Deadlines Scheduler Block */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-900 text-sm pb-2.5 border-b border-rose-100 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock size={16} className="text-red-650 animate-pulse" />
              {isRtl ? 'مواعيد تسليم المهام المعلقة ونظام الجدولة' : 'Pending Task Deadlines & Urgency Schedule'}
            </span>
            <span className="text-[10px] bg-red-50 text-red-700 px-2.5 py-0.5 rounded font-black font-mono">
              {sortedPendingDeadlines.length} {isRtl ? 'نشط' : 'active'}
            </span>
          </h3>

          <div className="mt-3 divide-y divide-slate-100 overflow-y-auto max-h-[290px] flex-1">
            {sortedPendingDeadlines.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 leading-normal">
                {isRtl ? '🎉 ممتاز! لا توجد مهام أو تسليمات معلقة مدرجة.' : '🎉 Perfect! No pending document deadlines on schedule.'}
              </div>
            ) : (
              sortedPendingDeadlines.map(asg => {
                const isOverdue = asg.deadline && new Date(asg.deadline).getTime() < Date.now();
                return (
                  <div key={asg.id} className="py-3 flex justify-between items-start gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-slate-900 text-[11px] font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {asg.taskRef}
                        </span>
                        <span className="text-[9px] font-black uppercase px-1 py-0.2 bg-indigo-50 text-indigo-700 rounded-sm">
                          {isRtl ? (asg.assignmentType === 'translation' ? 'ترجمة' : asg.assignmentType === 'revision' ? 'مراجعة' : 'تدقيق') : asg.assignmentType}
                        </span>
                      </div>
                      <p className="text-[11px] font-extrabold text-slate-700 truncate max-w-[280px]" title={asg.taskFileName}>
                        {asg.taskFileName}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`text-[10px] font-black rounded px-1.5 py-0.5 inline-block ${
                        isOverdue 
                          ? 'bg-red-50 text-red-600 animate-pulse border border-red-100' 
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {getRemainingTimeStr(asg.deadline)}
                      </div>
                      <div className="text-[9px] text-zinc-400 font-mono mt-1">
                        {asg.deadline ? new Date(asg.deadline).toLocaleString(isRtl ? 'ar-EG' : 'en-US') : ''}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Accrued Earnings Breakdown Block */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-900 text-sm pb-2.5 border-b border-emerald-105 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <DollarSign size={16} className="text-emerald-600" />
              {isRtl ? 'مستحقات الأداء والترجمات المنجزة' : 'Accrued Earnings & Performance Insights'}
            </span>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-black font-mono">
              EGP {totalEarningsEgp.toLocaleString()} {isRtl ? 'معقود' : 'accrued'}
            </span>
          </h3>

          <div className="mt-3 space-y-3 flex-1 flex flex-col justify-between">
            {/* Detailed summary blocks */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-2.5 bg-emerald-50/40 rounded-xl border border-emerald-50 text-[11px]">
                <span className="text-[9px] font-black text-slate-450 block uppercase tracking-wider text-slate-500 mb-1">{isRtl ? 'مستحقات معتمدة للقفل' : 'Approved (To Payroll)'}</span>
                <span className="text-base font-black text-emerald-600 font-mono">EGP {totalEarningsEgp.toLocaleString()}</span>
                <span className="block text-[8px] text-emerald-500 font-bold mt-0.5">
                  {approvedAssignments.length} {isRtl ? 'مهمة معتمدة' : 'approved tasks'}
                </span>
              </div>

              <div className="p-2.5 bg-blue-50/40 rounded-xl border border-blue-50 text-[11px]">
                <span className="text-[9px] font-black text-slate-450 block uppercase tracking-wider text-slate-500 mb-1">{isRtl ? 'معلق بانتظار المراجعة والاعتماد' : 'Pending Review (QA)'}</span>
                <span className="text-base font-black text-blue-600 font-mono">
                  EGP {submittedAssignments.reduce((acc, curr) => acc + (curr.calculatedAmount), 0).toLocaleString()}
                </span>
                <span className="block text-[8px] text-blue-500 font-bold mt-0.5">
                  {submittedAssignments.length} {isRtl ? 'مسلم بانتظار المراجعة' : 'completed tasks'}
                </span>
              </div>
            </div>

            {/* List of recent completions */}
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              📜 {isRtl ? 'سجل العمليات والملفات الأخيرة' : 'Recent Completions Registry'}
            </p>
            <div className="border border-slate-100 rounded-lg max-h-[145px] overflow-y-auto divide-y divide-slate-50 bg-slate-50/15">
              {assignments.filter(a => a.status === 'approved' || a.status === 'submitted').length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 italic">
                  {isRtl ? 'لا يوجد مهام مكتملة في السجل حالياً.' : 'No completed translations logged in system.'}
                </div>
              ) : (
                assignments
                  .filter(a => a.status === 'approved' || a.status === 'submitted')
                  .map(asg => (
                    <div key={asg.id} className="p-2.5 flex justify-between items-center text-xs">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800 font-mono text-[10px]">{asg.taskRef}</span>
                          <span className={`text-[8px] font-black px-1.5 py-0.2 rounded uppercase ${
                            asg.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                          }`}>
                            {isRtl ? (asg.status === 'approved' ? 'معتمد' : 'مقدم') : asg.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate max-w-[170px] font-semibold" title={asg.taskFileName}>{asg.taskFileName}</p>
                      </div>

                      <div className="text-right font-mono text-[10px] shrink-0">
                        <span className="font-bold text-slate-900">EGP {asg.calculatedAmount.toLocaleString()}</span>
                        <p className="text-[8px] text-slate-400 font-semibold">
                          {asg.wordCountActual || asg.wordCountAssigned} {isRtl ? 'كلمة' : 'words'}
                        </p>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* WORK ASSIGNMENTS CONTAINER QUEUE */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
        <h3 className="font-bold text-slate-900 text-sm pb-3 border-b border-slate-100 flex items-center gap-2">
          <CheckSquare size={16} className="text-indigo-600 animate-pulse" />
          {isRtl ? 'قائمة المهام والملفات المخصصة لي' : 'Your Professional Document Queue'}
        </h3>

        <div className="space-y-4 mt-4">
          {assignments.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 leading-normal">
              {isRtl 
                ? 'لا توجد مهام أو ملفات ترجمة مخصصة لك حالياً في النظام.' 
                : 'You do not have any active assignments listed. Reach out to Admin (Nada) or Sales (Samar) to allocate translating pipelines!'}
            </div>
          ) : (
            assignments.map(asg => {
              const deadlineDate = asg.deadline ? new Date(asg.deadline) : null;
              const isOverdue = deadlineDate && deadlineDate.getTime() < Date.now() && asg.status !== 'approved' && asg.status !== 'submitted';
              
              // Get parent task details for richer metadata visibility & document downloads
              const parentTask = dbInstance.tasks.find(t => t.id === asg.taskId);

              return (
                <div key={asg.id} className="p-4 rounded-xl border border-slate-150 bg-slate-50/30 hover:border-slate-350 hover:bg-slate-50/50 transition-all space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-slate-900 font-mono text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-205">
                          {asg.taskRef || 'Task Ref'}
                        </span>
                        <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded uppercase tracking-wider">
                          {isRtl 
                            ? (asg.assignmentType === 'translation' ? 'ترجمة معتمدة' : asg.assignmentType === 'revision' ? 'مراجعة لغوية' : 'تدقيق لغوي')
                            : asg.assignmentType}
                        </span>
                        
                        {/* Overdue alert */}
                        {isOverdue && (
                          <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[9px] font-bold rounded flex items-center gap-1 uppercase">
                            <AlertTriangle size={10} /> {isRtl ? 'متأخر' : 'OVERDUE'}
                          </span>
                        )}
                      </div>
                      <p className="font-extrabold text-slate-850 text-xs sm:text-sm">{asg.taskFileName || 'File document target'}</p>
                    </div>

                    {/* Status badges */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
                        asg.status === 'assigned' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                        asg.status === 'in_progress' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                        asg.status === 'submitted' ? 'bg-blue-50 text-blue-700 border-blue-100 animate-pulse' :
                        'bg-emerald-50 text-emerald-700 border-emerald-100'
                      }`}>
                        {asg.status === 'assigned' ? (isRtl ? 'بانتظار القبول' : 'Awaiting Consent') : isRtl ? (asg.status === 'in_progress' ? 'قيد العمل' : asg.status === 'submitted' ? 'تم التسليم للمراجعة' : 'مقبول ومعتمد') : asg.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Comprehensive Task Details Display prior to acceptance */}
                  <div className="p-3 bg-white rounded-lg border border-slate-100 text-xs text-slate-650 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">{isRtl ? 'تفاصيل اللغة والكلمات' : 'Scope & Language Pair'}</p>
                      <div className="font-semibold text-slate-800">
                        {parentTask ? `${parentTask.sourceLanguage} ➔ ${parentTask.targetLanguage}` : 'N/A'}
                      </div>
                      <div className="text-[11px]">
                        {isRtl ? 'عدد الكلمات المخصصة: ' : 'Assigned Words: ' }
                        <strong className="text-indigo-650 font-bold font-mono">{asg.wordCountAssigned.toLocaleString()}</strong>
                      </div>
                      {parentTask && (
                        <div className="text-[11px] text-zinc-500">
                          {isRtl ? 'إجمالي الصفحات المقدرة: ' : 'Estimated Pages: ' }
                          <strong className="font-semibold">{parentTask.pageCount || Math.ceil(parentTask.wordCount / 250)}</strong> {isRtl ? 'صفحة' : 'pages'}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">{isRtl ? 'الجدول الزمني والأولوية' : 'Timeline & Urgency'}</p>
                      <div>
                        {isRtl ? 'تاريخ الاستحقاق (الموعد):' : 'Expected Deadline:'} <br />
                        <strong className="font-bold text-slate-800 font-mono">
                          {asg.deadline ? new Date(asg.deadline).toLocaleString(isRtl ? 'ar-EG' : 'en-US') : 'No date set'}
                        </strong>
                      </div>
                      {parentTask?.priority && (
                        <div>
                          {isRtl ? 'الأولوية:' : 'Priority rating:'}{' '}
                          <span className={`font-black uppercase px-1 rounded text-[9px] ${
                            parentTask.priority === 'urgent' ? 'bg-red-100 text-red-650' :
                            parentTask.priority === 'high' ? 'bg-orange-100 text-orange-650' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {parentTask.priority}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">{isRtl ? 'المستحقات والملاحظات' : 'Instructional Notes'}</p>
                      {asg.ratePerWord ? (
                        <div>
                          {isRtl ? 'معدل الحساب للمهمة:' : 'Assignment Tariff Rate:'}{' '}
                          <strong className="text-emerald-650 text-xs font-mono font-bold">EGP {asg.ratePerWord} / {isRtl ? 'كلمة' : 'word'}</strong>
                        </div>
                      ) : asg.rateFixed ? (
                        <div>
                          {isRtl ? 'مبلغ ثابت للمهمة:' : 'Tariff Fixed Fee:'}{' '}
                          <strong className="text-emerald-650 text-xs font-mono font-bold">EGP {asg.rateFixed}</strong>
                        </div>
                      ) : null}
                      <div className="italic text-[10px] text-zinc-500 mt-1 line-clamp-2" title={parentTask?.notes || asg.notes}>
                        {isRtl ? 'إفادة الزبائن وملاحظات الحفظ: ' : 'Filing notes: '} {parentTask?.notes || asg.notes || (isRtl ? 'لا يوجد تعليمات خاصة' : 'No specialized instructions entered.')}
                      </div>
                    </div>
                  </div>

                  {/* DOCUMENT ATTACHMENTS (SIMULATED DOWNLOADS) FROM COGNATE TASK */}
                  {parentTask?.attachments && parentTask.attachments.length > 0 && (
                    <div className="p-3 bg-zinc-50/60 rounded-lg border border-slate-100 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 block mb-1 uppercase font-mono tracking-widest">
                        {isRtl ? '📁 المرفقات والمستندات القانونية للتنزيل والترجمة:' : '📁 Task Documents and reference materials:'}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {parentTask.attachments.map(att => (
                          <a 
                            key={att.id}
                            href={att.url} 
                            download={att.name}
                            className="inline-flex items-center gap-1.5 p-1.5 px-2.5 rounded bg-white border border-slate-205 text-xs font-semibold text-slate-800 hover:text-indigo-600 hover:bg-indigo-50/50 hover:border-indigo-200 transition-all cursor-pointer"
                            title={`${att.name} (${(att.size / 1024).toFixed(1)} KB)`}
                            onClick={(e) => {
                              alert(isRtl ? `بدء تنزيل الملف: ${att.name}` : `Downloading file stream: ${att.name}`);
                            }}
                          >
                            <Paperclip size={12} className="text-zinc-500" />
                            <span className="truncate max-w-[200px] font-bold text-slate-700">{att.name}</span>
                            <span className="text-[9px] text-zinc-400 font-mono">({(att.size / 1024).toFixed(0)} KB)</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TRANSLATED ATTACHMENTS FOR WORK COMPLETED */}
                  {asg.translatedAttachments && asg.translatedAttachments.length > 0 && (
                    <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-150 space-y-1.5">
                      <span className="text-[10.5px] font-bold text-emerald-800 block mb-1 uppercase font-mono tracking-widest">
                        {isRtl ? '✅ ملفات الترجمة النهائية المسلمة إلى السيستم:' : '✅ Final Submitted Translations:'}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {asg.translatedAttachments.map(att => (
                          <a 
                            key={att.id}
                            href={att.url} 
                            download={att.name}
                            className="inline-flex items-center gap-1.5 p-1.5 px-2.5 rounded bg-white border border-emerald-250 text-xs font-semibold text-emerald-950 hover:text-indigo-600 hover:bg-indigo-50/50 hover:border-indigo-200 transition-all cursor-pointer"
                            title={`${att.name} (${(att.size / 1024).toFixed(1)} KB)`}
                            onClick={(e) => {
                              alert(isRtl ? `بدء تنزيل الترجمة المنجزة: ${att.name}` : `Downloading finished translation asset: ${att.name}`);
                            }}
                          >
                            <FileText size={12} className="text-emerald-500" />
                            <span className="truncate max-w-[200px] font-black text-slate-800">{att.name}</span>
                            <span className="text-[9px] text-zinc-405 font-mono">({(att.size / 1024).toFixed(0)} KB)</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Core Actions at the bottom of the card */}
                  <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
                    {asg.status === 'assigned' && (
                      <div className="flex items-center gap-2">
                        {/* Decline option button */}
                        <button
                          type="button"
                          onClick={() => handleOpenDeclineModal(asg.id)}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-[11px] font-black rounded-lg cursor-pointer flex items-center gap-1 transition-colors border border-red-200"
                        >
                          <XCircle size={13} />
                          <span>{isRtl ? 'اعتذار (رفض المهمة)' : 'Decline Job'}</span>
                        </button>
                        
                        {/* Accept / Start work action */}
                        <button
                          type="button"
                          onClick={() => {
                            handleStartWork(asg.id);
                            alert(isRtl ? 'تم قبول المهمة بنجاح والبدء في أعمال الترجمة.' : 'Assignment accepted successfully! Task status flipped to In Progress.');
                          }}
                          className="px-4 py-1.5 bg-indigo-600 hover:bg-slate-900 text-white text-[11px] font-black rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors shadow-sm"
                        >
                          <ArrowUpRight size={13} />
                          <span>{isRtl ? 'قبول وبدء العمل' : 'Accept & Start Work'}</span>
                        </button>
                      </div>
                    )}

                    {asg.status === 'in_progress' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenSubmitModal(asg.id, asg.wordCountAssigned)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors"
                        >
                          <Send size={11} />
                          <span>{isRtl ? 'تسليم الملف المترجم' : 'Submit Translation'}</span>
                        </button>
                      </div>
                    )}

                    {asg.status === 'submitted' && (
                      <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded italic">
                        {isRtl ? 'بانتظار مراجعة الجودة والاعتماد المالي واللغوي' : 'Awaiting admin review & signoff'}
                      </span>
                    )}

                    {asg.status === 'approved' && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded font-sans flex items-center gap-1">
                        <CheckCircle2 size={12} /> {isRtl ? 'تمت المراجعة والاعتماد المالي' : 'Approved & logged to payroll'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* REJECT/DECLINE REASON DIALOG MODAL */}
      {isDeclineModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center z-50 p-4 animate-fade-in font-sans text-slate-700">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl border border-slate-100">
            <h4 className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-2 flex items-center gap-1.5 text-red-600">
              <XCircle size={16} className="text-red-500" />
              {isRtl ? 'اعتذار عن مهمة الترجمة' : 'Decline Translation Assignment'}
            </h4>
            <p className="text-[11px] text-slate-400 leading-normal mt-2">
              {isRtl 
                ? 'يرجى تقديم سبب بسيط للاعتذار عن ملف الترجمة لمساعدة فريق التنسيق في إعادة تعيين الملف لمدقق آخر.'
                : 'Please state your brief reason for declining this folder. This helps our management team re-allocate resources immediately.'}
            </p>

            <form onSubmit={handleConfirmDecline} className="mt-4 space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wide block">
                  {isRtl ? 'السبب الرئيسي للاعتذار' : 'Reason for Declining'}
                </label>
                <input 
                  type="text" 
                  value={declineReason} 
                  onChange={e => setDeclineReason(e.target.value)}
                  className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-red-500 focus:outline-none text-slate-800"
                  placeholder={isRtl ? "مثال: منشغل حالياً، المجال التقني للمخ..." : "E.g., current workload, domain specialization, rate limits..."}
                  required
                />
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => { setIsDeclineModalOpen(false); setDecliningAsgId(null); setDeclineReason(''); }}
                  className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer"
                >
                  {isRtl ? 'تأكيد الاعتذار والرفض' : 'Confirm Decline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUBMIT WORK COUNT POPUP MODAL */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl border border-slate-100 text-slate-750">
            <h4 className="font-extrabold text-slate-900 text-sm border-b border-slate-100 pb-2">
              {isRtl ? 'تأكيد إكمال المهمة وعدد كلمات الهدف' : 'Complete Job: Confirm Target Word Count'}
            </h4>
            <p className="text-[11px] text-slate-400 leading-normal mt-2">
              {isRtl 
                ? 'يرجى إدخال عدد الكلمات النهائي للملف المترجم (كلمات الهدف). سيتم مراجعة هذه الحسابات وتدقيقها من قبل المحاسب والمدير المالي.'
                : 'Please input the final target word count of the translated document. This count drives verified freelance fees and staff overage balances.'}
            </p>

             <form onSubmit={handleConfirmSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wide block">
                  {isRtl ? 'عدد كلمات الملف الهدف المترجم' : 'Finished Target Word Count'}
                </label>
                <input 
                  type="number" 
                  value={actualWords || ''} 
                  onChange={e => setActualWords(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold font-mono text-center focus:ring-1 focus:ring-indigo-600 focus:outline-none"
                  required
                />
              </div>

              {/* Drag-and-Drop Area */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wide block">
                  {isRtl ? 'رفع المستند المترجم النهائي (ملفات الترجمة):' : 'Upload Final Translated Documents:'}
                </label>
                
                <div 
                  onDragEnter={handleDragSubmit}
                  onDragOver={handleDragSubmit}
                  onDragLeave={handleDragSubmit}
                  onDrop={handleDropSubmit}
                  className={`mt-2 p-4 rounded-xl border-2 border-dashed text-center transition-all relative ${
                    dragActive 
                      ? 'border-indigo-600 bg-indigo-50/50' 
                      : 'border-slate-200 hover:border-slate-350 bg-slate-50/50'
                  }`}
                >
                  <input 
                    type="file" 
                    multiple 
                    onChange={handleFileChangeSubmit}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    id="file-translator-submit"
                  />
                  <div className="flex flex-col items-center justify-center gap-1.5 pointer-events-none">
                    <FileUp size={22} className={`${dragActive ? 'text-indigo-600 animate-bounce' : 'text-slate-400'}`} />
                    <span className="text-[11px] font-bold text-slate-700">
                      {isRtl ? 'اسحب وأفلت الملفات هنا أو انقر للتصفح' : 'Drag & drop files here, or click to browse'}
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {isRtl ? 'صيغ المدعومة: DOCX, PDF, XLSX, TXT إلخ.' : 'Supported formats: DOCX, PDF, XLSX, TXT etc.'}
                    </span>
                  </div>
                </div>

                {/* List of pending attachments inside modal */}
                {translatedAttachments.length > 0 && (
                  <div className="mt-3 space-y-1.5 max-h-[140px] overflow-y-auto">
                    <span className="text-[9px] font-black uppercase text-indigo-600 block">
                      📁 {isRtl ? 'الملفات المحددة المرفقة بالترجمة:' : 'Selected Translation Files:'}
                    </span>
                    {translatedAttachments.map(att => (
                      <div key={att.id} className="flex items-center justify-between p-1.5 bg-indigo-50/50 border border-indigo-100 rounded text-[11px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <FileText size={12} className="text-indigo-500 shrink-0" />
                          <span className="truncate max-w-[190px] font-semibold text-slate-700">{att.name}</span>
                          <span className="text-[9px] text-zinc-405 font-mono">({(att.size / 1024).toFixed(0)} KB)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteSubmitAttachment(att.id)}
                          className="text-red-500 hover:text-red-700 p-0.5"
                          title={isRtl ? 'حذف الملف' : 'Delete file'}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => { setIsSubmitModalOpen(false); setSelectedAsgId(null); setTranslatedAttachments([]); }}
                  className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer animate-pulse"
                >
                  {isRtl ? 'تأكيد وإرسال للمراجعة والتدقيق' : 'Mark Completed & Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardTranslator;
