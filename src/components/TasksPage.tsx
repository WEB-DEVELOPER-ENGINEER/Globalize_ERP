/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Briefcase, Plus, X, Search, Filter, Calendar, UserPlus, 
  CheckCircle, ShieldAlert, Award, FileUp, ListChecks, CheckCircle2,
  Paperclip, Trash2, FileText, Activity, AlertTriangle, Users, Gauge
} from 'lucide-react';
import { Task, Client, Profile, ServiceType, IntakeChannel, TaskAttachment, PaymentMethod } from '../types';
import dbInstance from '../db/store';

interface TasksPageProps {
  isRtl: boolean;
  currentRole: string;
  isQuickIntakeOpen: boolean;
  onCloseQuickIntake: () => void;
}

export const TasksPage: React.FC<TasksPageProps> = ({ 
  isRtl, 
  currentRole,
  isQuickIntakeOpen,
  onCloseQuickIntake
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [translators, setTranslators] = useState<Profile[]>([]);
  
  // Registration and modal triggers
  const [isRegistering, setIsRegistering] = useState(false);
  const [selectedTaskForAssign, setSelectedTaskForAssign] = useState<Task | null>(null);

  // Task form fields
  const [clientId, setClientId] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [fileName, setFileName] = useState('');
  const [service, setService] = useState<ServiceType>('translation');
  const [srcLang, setSrcLang] = useState('Arabic');
  const [tgtLang, setTgtLang] = useState('English');
  const [words, setWords] = useState<number>(0);
  const [pages, setPages] = useState<number>(0);
  const [egp, setEgp] = useState<number>(0);
  const [aed, setAed] = useState<number>(0);
  const [usd, setUsd] = useState<number>(0);
  const [tax, setTax] = useState(false);
  const [intakeDate, setIntakeDate] = useState(new Date().toISOString().split('T')[0]);
  const [channel, setChannel] = useState<IntakeChannel>('whatsapp');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [deadline, setDeadline] = useState('');

  // Initial payment allocation tracking states
  const [initialPaidAmountEgp, setInitialPaidAmountEgp] = useState<number>(0);
  const [initialPaymentMethod, setInitialPaymentMethod] = useState<PaymentMethod>('cash');

  // Quick on-the-fly client creation states
  const [isRegisteringNewClient, setIsRegisteringNewClient] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientNameAr, setNewClientNameAr] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientType, setNewClientType] = useState<'individual' | 'company' | 'agency'>('individual');
  const [newClientNotes, setNewClientNotes] = useState('');
  
  // Drag and drop / file attachment states
  const [dragActive, setDragActive] = useState(false);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);

  // Assignment successful notification center tracking
  const [assignedSuccessData, setAssignedSuccessData] = useState<{
    task: Task;
    translator: Profile;
    assignmentType: string;
    rateWords?: number;
    rateFixed?: number;
  } | null>(null);

  // Assign form fields
  const [targetTranslatorId, setTargetTranslatorId] = useState('');
  const [assignType, setAssignType] = useState<'translation' | 'revision' | 'proofreading'>('translation');
  const [rateWords, setRateWords] = useState<number>(0);
  const [rateFixed, setRateFixed] = useState<number>(0);

  // Verify assignment states (Verify Target Word Count & Fees based on translator rate ONLY)
  const [selectedAsgForVerify, setSelectedAsgForVerify] = useState<any>(null);
  const [verifiedWords, setVerifiedWords] = useState<number>(0);
  const [verifiedRateWords, setVerifiedRateWords] = useState<number>(0);
  const [verifiedRateFixed, setVerifiedRateFixed] = useState<number>(0);

  // Filters
  const [searchWord, setSearchWord] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('default');

  // Load vs Capacity Tracker & Warning Guards
  const [showWorkloads, setShowWorkloads] = useState(true);

  const getTranslatorMetrics = (tId: string) => {
    // Find all assignments for this translator
    const asgs = dbInstance.assignments.filter(a => a.translatorId === tId);
    
    // An assignment is active if the parent task is not completed, delivered, or archived
    const activeAsgs = asgs.filter(a => {
      const parentTask = tasks.find(tk => tk.id === a.taskId);
      if (!parentTask) return false;
      return parentTask.status !== 'completed' && parentTask.status !== 'delivered' && parentTask.status !== 'archived';
    });
    
    const activeWords = activeAsgs.reduce((sum, a) => sum + (a.wordCountAssigned || 0), 0);
    const activeTasksCount = activeAsgs.length;
    
    // Find the profile for capacity limit
    const p = dbInstance.profiles.find(prof => prof.id === tId);
    // contractWords is monthly capacity, e.g. 30,000 words. Concurrency-safe limit is about 1/2.5 of this or default is 10,000 words
    const limit = p?.contractWords && p.contractWords > 0
      ? Math.max(5000, Math.round(p.contractWords / 2.5))
      : 10000;
      
    const percentage = limit > 0 ? Math.min(100, Math.round((activeWords / limit) * 100)) : 0;
    
    return {
      activeWords,
      activeTasksCount,
      limit,
      percentage
    };
  };

  // Bulk actions and multi-selection
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [bulkTranslatorId, setBulkTranslatorId] = useState<string>('');
  const [bulkAssignType, setBulkAssignType] = useState<'translation' | 'revision' | 'proofreading'>('translation');
  const [bulkRateWords, setBulkRateWords] = useState<number>(0);
  const [bulkRateFixed, setBulkRateFixed] = useState<number>(0);

  const isAdminOrStaff = currentRole === 'owner' || currentRole === 'admin' || currentRole === 'sales' || currentRole === 'accountant';

  const handleBulkStatusUpdate = () => {
    if (!bulkStatus || selectedTaskIds.length === 0) return;
    
    let count = 0;
    selectedTaskIds.forEach(id => {
      const t = tasks.find(task => task.id === id);
      if (t) {
        dbInstance.updateTask({
          ...t,
          status: bulkStatus as any
        });
        count++;
      }
    });

    alert(isRtl 
      ? `تم تحديث حالة عدد ${count} ملف بنجاح إلى "${bulkStatus}".` 
      : `Successfully updated status of ${count} tasks to "${bulkStatus.replace('_', ' ')}".`
    );

    setSelectedTaskIds([]);
    setBulkStatus('');
  };

  const handleBulkAssignment = () => {
    if (!bulkTranslatorId || selectedTaskIds.length === 0) return;

    const translator = translators.find(t => t.id === bulkTranslatorId);
    if (!translator) return;

    let count = 0;
    selectedTaskIds.forEach(id => {
      const t = tasks.find(task => task.id === id);
      if (t) {
        dbInstance.assignTranslator({
          taskId: t.id,
          taskRef: t.referenceNo,
          taskFileName: t.fileName,
          translatorId: bulkTranslatorId,
          assignmentType: bulkAssignType,
          wordCountAssigned: t.wordCount,
          ratePerWord: bulkRateWords > 0 ? bulkRateWords : undefined,
          rateFixed: bulkRateFixed > 0 ? bulkRateFixed : undefined,
          overtimeHours: 0,
          status: 'assigned'
        });
        count++;
      }
    });

    alert(isRtl 
      ? `تم تعيين المترجم "${translator.fullNameAr || translator.fullName}" بنجاح لعدد ${count} مهمة.` 
      : `Successfully assigned ${count} tasks to translator "${translator.fullName}".`
    );

    setSelectedTaskIds([]);
    setBulkTranslatorId('');
    setBulkRateWords(0);
    setBulkRateFixed(0);
  };

  useEffect(() => {
    setTasks(dbInstance.tasks);
    setClients(dbInstance.clients);
    
    // Grab only translator staff and freelancers
    const transOnly = dbInstance.profiles.filter(p => p.role === 'translator' || p.role === 'admin');
    setTranslators(transOnly);

    const sub = dbInstance.subscribe(() => {
      setTasks([...dbInstance.tasks]);
      setClients([...dbInstance.clients]);
      setTranslators([...dbInstance.profiles.filter(p => p.role === 'translator' || p.role === 'admin')]);
    });
    return sub;
  }, []);

  const sendAutomatedEmail = async (to: string, subject: string, text: string) => {
    setEmailLoading(true);
    setEmailStatus(null);
    try {
      const response = await window.fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, text })
      });
      const data = await response.json();
      if (data.success) {
        setEmailStatus({ 
          type: 'success', 
          msg: isRtl ? 'تم إرسال الإشعار التلقائي بنجاح!' : 'Automated notification sent successfully!' 
        });
      } else {
        setEmailStatus({ 
          type: 'error', 
          msg: data.error || (isRtl ? 'فشل في إرسال الإشعار.' : 'Failed to send automated email.') 
        });
      }
    } catch (err) {
      setEmailStatus({ 
        type: 'error', 
        msg: isRtl ? 'خطأ في الاتصال بالخادم.' : 'Connection error with gateway.' 
      });
    } finally {
      setEmailLoading(false);
    }
  };

  const handleRegisterTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentRole !== 'owner' && currentRole !== 'admin' && currentRole !== 'sales' && currentRole !== 'accountant') {
      alert('Access Denied. Only Owners, Admins, Sales, or Accountants can register legal intake folders.');
      return;
    }

    let finalClientId: string | undefined = clientId || undefined;
    let finalClientPhone: string | undefined = clientPhone || undefined;

    if (isRegisteringNewClient) {
      if (!newClientName.trim()) {
        alert(isRtl ? 'يرجى إدخال اسم العميل الجديد بالإنجليزية.' : 'Please enter the new client name in English.');
        return;
      }
      
      const newClientObj = dbInstance.addClient(
        newClientName.trim(),
        newClientNameAr.trim() || newClientName.trim(),
        newClientPhone.trim(),
        newClientEmail.trim(),
        newClientType,
        newClientNotes.trim() || undefined
      );
      
      finalClientId = newClientObj.id;
      if (newClientPhone.trim()) {
        finalClientPhone = newClientPhone.trim();
      }
    }

    dbInstance.addTask({
      clientId: finalClientId,
      clientPhone: finalClientPhone,
      fileName,
      serviceType: service,
      sourceLanguage: srcLang,
      targetLanguage: tgtLang,
      wordCount: words,
      pageCount: pages || Math.ceil(words / 250),
      amountEgp: egp,
      amountAed: aed,
      amountUsd: usd,
      hasTaxInvoice: tax,
      status: 'pending',
      intakeChannel: channel,
      intakeDate,
      priority,
      deadline: deadline ? new Date(deadline).toISOString() : undefined,
      notes: notes || undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
      initialPaidAmountEgp,
      initialPaymentMethod
    });

    setIsRegistering(false);
    onCloseQuickIntake();

    // Reset Form
    setClientId('');
    setClientSearchQuery('');
    setShowClientSuggestions(false);
    setClientPhone('');
    setFileName('');
    setWords(0);
    setPages(0);
    setEgp(0);
    setAed(0);
    setUsd(0);
    setTax(false);
    setNotes('');
    setPriority('medium');
    setDeadline('');
    setAttachments([]);
    setDragActive(false);
    setInitialPaidAmountEgp(0);
    setInitialPaymentMethod('cash');

    // Reset On-the-fly client states
    setIsRegisteringNewClient(false);
    setNewClientName('');
    setNewClientNameAr('');
    setNewClientPhone('');
    setNewClientEmail('');
    setNewClientType('individual');
    setNewClientNotes('');
  };

  // Event handlers for drag and drop file uploads
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFiles = (files: FileList) => {
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      const isSmall = file.size < 400 * 1024; // < 400KB fits safely inside localStorage
      
      if (isSmall) {
        reader.onloadend = () => {
          const newAttachment: TaskAttachment = {
            id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            name: file.name,
            size: file.size,
            type: file.type,
            url: reader.result as string, // Real persistable base64 string
            uploadedAt: new Date().toISOString()
          };
          setAttachments(prev => [...prev, newAttachment]);
        };
        reader.readAsDataURL(file);
      } else {
        // Fallback for larger files to prevent localStorage size issues
        const objectUrl = URL.createObjectURL(file);
        const newAttachment: TaskAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: file.name,
          size: file.size,
          type: file.type,
          url: objectUrl, // Fully functional local object URL for instant downloads
          uploadedAt: new Date().toISOString()
        };
        setAttachments(prev => [...prev, newAttachment]);
      }
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleChangeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const handleOpenAssign = (task: Task) => {
    if (currentRole !== 'owner' && currentRole !== 'admin' && currentRole !== 'sales' && currentRole !== 'accountant') {
      alert('Access Denied. Only Owners, Admins, Sales, or Accountants have allocation privileges.');
      return;
    }
    setSelectedTaskForAssign(task);
    setTargetTranslatorId('');
    setRateWords(0.20);
    setRateFixed(0);
  };

  const handleOpenVerify = (asg: any) => {
    if (currentRole !== 'owner' && currentRole !== 'admin' && currentRole !== 'sales' && currentRole !== 'accountant') {
      alert('Access Denied. Only Owners, Admins, Sales, or Accountants can verify and approve task calculations.');
      return;
    }
    setSelectedAsgForVerify(asg);
    setVerifiedWords(asg.wordCountActual || asg.wordCountAssigned);
    setVerifiedRateWords(asg.ratePerWord || 0);
    setVerifiedRateFixed(asg.rateFixed || 0);
  };

  const handleConfirmVerifyApproval = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAsgForVerify) {
      const calculatedAmt = verifiedRateFixed > 0 
        ? verifiedRateFixed 
        : verifiedWords * verifiedRateWords;

      dbInstance.approveAssignment(
        selectedAsgForVerify.id,
        verifiedWords,
        verifiedRateWords > 0 ? verifiedRateWords : undefined,
        verifiedRateFixed > 0 ? verifiedRateFixed : undefined,
        calculatedAmt
      );

      setSelectedAsgForVerify(null);
      alert('Target wordcount verified and linguist fees approved successfully.');
    }
  };

  const handleConfirmAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTaskForAssign && targetTranslatorId) {
      dbInstance.assignTranslator({
        taskId: selectedTaskForAssign.id,
        taskRef: selectedTaskForAssign.referenceNo,
        taskFileName: selectedTaskForAssign.fileName,
        translatorId: targetTranslatorId,
        assignmentType: assignType,
        wordCountAssigned: selectedTaskForAssign.wordCount,
        ratePerWord: rateWords > 0 ? rateWords : undefined,
        rateFixed: rateFixed > 0 ? rateFixed : undefined,
        overtimeHours: 0,
        status: 'assigned'
      });

      const translator = translators.find(t => t.id === targetTranslatorId);
      if (translator) {
        setAssignedSuccessData({
          task: selectedTaskForAssign,
          translator,
          assignmentType: assignType,
          rateWords: rateWords > 0 ? rateWords : undefined,
          rateFixed: rateFixed > 0 ? rateFixed : undefined
        });
      } else {
        setSelectedTaskForAssign(null);
        alert('Assignment completed successfully.');
      }
    }
  };

  const handleDeliverTask = (taskId: string) => {
    const task = dbInstance.tasks.find(t => t.id === taskId);
    if (task) {
      const remaining = task.amountEgp - (task.paidAmountEgp || 0);
      if (remaining > 0) {
        const confirmVal = window.confirm(
          isRtl 
            ? `⚠️ انتبه: يوجد مبلغ متبقي مطلوب قدره (EGP ${remaining.toLocaleString()}) على هذا العميل!\n\nهل قمت بمطالبة العميل بالمتبقّي وتحصيله قبل تسليم المستندات المترجمة؟\n\nاضغط "موافق" لتأكيد الدفع والتسليم.`
            : `⚠️ Warning: There is an outstanding cash balance of (EGP ${remaining.toLocaleString()}) on this client!\n\nHave you demanded and collected this remainder before handing over the finished translations?\n\nClick "OK" to receipt the payment and proceed with delivery.`
        );
        if (!confirmVal) return;
        
        // Settle the remainder in the system database
        dbInstance.addPayment({
          taskId: task.id,
          referenceNo: task.referenceNo,
          clientName: task.clientNameCache || 'Cash client',
          fileName: task.fileName || 'Reference translation',
          paymentDate: new Date().toISOString().split('T')[0],
          paymentType: 'income',
          amountEgp: remaining,
          amountAed: 0,
          amountUsd: 0,
          paymentMethod: 'cash',
          notes: 'Settled final balance upon legal document handover'
        });
        
        // Synchronize display
        setTasks([...dbInstance.tasks]);
      }
      
      task.status = 'delivered';
      task.deliveryDate = new Date().toISOString();
      dbInstance.updateTask(task);
      alert(isRtl ? 'تم تحديث حالة الملف لـ "تم التسليم" كلياً بنجاح وأرشفته.' : 'Folder status marked as delivered to client. Physical archiving complete.');
    }
  };

  // Pre-formatted messages for WhatsApp and Email notifications
  const getSimulatedNotificationData = () => {
    if (!assignedSuccessData) return null;
    const { task, translator, assignmentType } = assignedSuccessData;
    
    const translatorEmail = translator.email || (translator.phone ? `${translator.fullName.toLowerCase().replace(/\s+/g, '')}@global-translation.com` : 'translator@global-translation.com');
    
    const taskDeadlineStr = task.deadline 
      ? new Date(task.deadline).toLocaleString(isRtl ? 'ar-EG' : 'en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : (isRtl ? 'حسب المحدد بالمنظومة' : 'As specified inside GTMS');

    const subject = `GTMS Task Assigned: ${task.referenceNo}`;
    const templateEnglish = `Hi ${translator.fullName},\n\nYou have been assigned a new task on GTMS:\n- Folder Ref: ${task.referenceNo}\n- File Name: ${task.fileName}\n- Word Count: ${task.wordCount.toLocaleString()} words\n- Task Role: ${assignmentType.toUpperCase()}\n- Target Deadline: ${taskDeadlineStr}\n\nPlease check your dispatch list and update your progress. Thank you!`;

    const templateArabic = `مرحباً ${translator.fullNameAr}،\n\nلقد تم تعيين مهمة ترجمة جديدة لك في نظام GTMS:\n- رقم الملف: ${task.referenceNo}\n- اسم المستند: ${task.fileName}\n- عدد الكلمات: ${task.wordCount.toLocaleString()} كلمة\n- طبيعة المهمة: ${assignmentType === 'translation' ? 'ترجمة معتمدة' : assignmentType === 'revision' ? 'مراجعة لغوية' : 'تدقيق لغوي'}\n- موعد التسليم: ${taskDeadlineStr}\n\nيرجى تسجيل الدخول إلى لوحة التحكم للبدء وتحديث حالة التسليم. شكراً لك!`;

    const finalMessage = isRtl ? templateArabic : templateEnglish;
    
    const rawPhone = translator.phone || '';
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '');

    const whatsappUrl = `https://wa.me/${cleanPhone ? cleanPhone : '201000000000'}?text=${encodeURIComponent(finalMessage)}`;
    const mailtoUrl = `mailto:${translatorEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(finalMessage)}`;

    return {
      message: finalMessage,
      whatsappUrl,
      mailtoUrl,
      email: translatorEmail,
      phone: rawPhone,
      subject
    };
  };

  // Sync Word input and estimated page count
  const handleWordUpdate = (val: number) => {
    setWords(val);
    setPages(Math.ceil(val / 250));
  };

  // Filter criteria
  const filteredTasks = tasks.filter(t => {
    const asg = dbInstance.assignments.find(a => a.taskId === t.id);
    const assignedLinguist = asg ? dbInstance.profiles.find(p => p.id === asg.translatorId) : null;
    const term = searchWord.toLowerCase().trim();

    const matchesSearch = 
      t.referenceNo.toLowerCase().includes(term) ||
      t.fileName.toLowerCase().includes(term) ||
      (t.clientNameCache && t.clientNameCache.toLowerCase().includes(term)) ||
      (assignedLinguist && (
        assignedLinguist.fullName.toLowerCase().includes(term) ||
        (assignedLinguist.fullNameAr && assignedLinguist.fullNameAr.toLowerCase().includes(term))
      ));

    const matchesStatus = 
      statusFilter === 'all' || 
      t.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Sort by priority (Urgent > High > Medium > Low) inside owner and admin views
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'priority-desc') {
      const rank = { urgent: 4, high: 3, medium: 2, low: 1 };
      const rankA = a.priority ? rank[a.priority] : 2; // Default to medium if undefined
      const rankB = b.priority ? rank[b.priority] : 2;
      return rankB - rankA;
    }
    if (sortBy === 'priority-asc') {
      const rank = { urgent: 4, high: 3, medium: 2, low: 1 };
      const rankA = a.priority ? rank[a.priority] : 2;
      const rankB = b.priority ? rank[b.priority] : 2;
      return rankA - rankB;
    }
    return 0; // Maintain default
  });

  return (
    <div className="space-y-6 font-sans text-slate-705">
      
      {/* LINGUIST WORKLOAD & CAPACITY CONSOLE */}
      <div className="bg-white border border-zinc-150 rounded-xl overflow-hidden shadow-none">
        <div className="bg-zinc-50 px-6 py-4 border-b border-zinc-150 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="text-indigo-600 w-5 h-5 shrink-0" />
            <div>
              <h3 className="font-bold text-zinc-900 text-sm">
                {isRtl ? 'مشرف مراقبة ضغط العمل والقدرة الاستيعابية للمترجمين' : 'Linguist Workload & Capacity Monitor'}
              </h3>
              <p className="text-[10px] text-zinc-400">
                {isRtl 
                  ? 'متابعة ضغط العمل الحالي (الكلمات النشطة) مقارنة بالقدرة القصوى لمنع تكدس المهام وضمان جودة الترجمة المعتمدة' 
                  : 'Track active word loads against concurrent capacity metrics to prevent over-assignment and bottleneck delays.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowWorkloads(!showWorkloads)}
            className="px-3 py-1 bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors text-[11px] font-semibold rounded-lg shadow-sm cursor-pointer"
          >
            {showWorkloads ? (isRtl ? 'إخفاء التفاصيل ▴' : 'Collapse Details ▴') : (isRtl ? 'عرض الإحصائيات ▾' : 'Expand Details ▾')}
          </button>
        </div>

        {showWorkloads && (
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in">
              {translators.map(t => {
                const metrics = getTranslatorMetrics(t.id);
                // Safe selection coloring for status light
                let statusColor = 'bg-emerald-500 text-emerald-800 border-emerald-250';
                let statusText = isRtl ? 'متاح ومستعد' : 'Available & Ready';
                let barColor = 'bg-emerald-500';

                if (metrics.percentage >= 85) {
                  statusColor = 'bg-rose-50 text-rose-800 border-rose-200';
                  statusText = isRtl ? 'ضغط عمل مرتفع جداً' : 'Overloaded / High Risk';
                  barColor = 'bg-rose-500';
                } else if (metrics.percentage >= 40) {
                  statusColor = 'bg-amber-50 text-amber-800 border-amber-200';
                  statusText = isRtl ? 'تحت العمل النشط' : 'Healthy Active Load';
                  barColor = 'bg-amber-500';
                }

                return (
                  <div 
                    key={t.id} 
                    className={`p-4 rounded-xl border transition-all hover:shadow-xs flex flex-col justify-between ${
                      metrics.percentage >= 85 
                        ? 'border-rose-150 bg-rose-50/5' 
                        : 'border-zinc-150 bg-white hover:border-zinc-350'
                    }`}
                  >
                    <div>
                      {/* Name Header and Indicator */}
                      <div className="flex items-start justify-between gap-1 mb-2">
                        <div className="truncate">
                          <h4 className="font-bold text-zinc-900 text-xs truncate" title={t.fullName}>
                            {t.fullName}
                          </h4>
                          <p className="text-[10px] text-zinc-400 font-medium truncate">
                            {t.fullNameAr || '—'}
                          </p>
                        </div>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full border shrink-0 ${statusColor}`}>
                          {statusText}
                        </span>
                      </div>

                      {/* Translator Meta Details */}
                      <div className="flex items-center gap-1.5 mb-3">
                        <span className="text-[9px] font-bold bg-zinc-100 text-zinc-650 px-1.5 py-0.5 rounded border border-zinc-150 uppercase tracking-widest leading-none">
                          {t.employeeType || 'Linguist'}
                        </span>
                        <span className="text-[9px] text-zinc-405 text-zinc-500 font-semibold flex items-center gap-0.5 whitespace-nowrap">
                          📊 {metrics.activeTasksCount} {isRtl ? 'ملفات نشطة' : 'active folders'}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar & Value metrics */}
                    <div className="space-y-1.5 mt-auto pt-2 border-t border-zinc-50">
                      <div className="flex justify-between items-baseline text-[10px] font-mono leading-none">
                        <span className="text-zinc-400 font-sans font-semibold">
                          {isRtl ? 'الحمل الحالي:' : 'Active Load:'}
                        </span>
                        <span className="font-extrabold text-zinc-900">
                          {metrics.activeWords.toLocaleString()}{' '}
                          <span className="text-zinc-400 font-normal font-sans">/ {metrics.limit.toLocaleString()} wds</span>
                        </span>
                      </div>

                      {/* Visual Progress bar container */}
                      <div className="relative w-full h-2 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200/40">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                          style={{ width: `${metrics.percentage}%` }}
                        />
                      </div>

                      {/* Percentage label and shortcut search filter */}
                      <div className="flex justify-between items-center text-[10px] pt-0.5">
                        <span className={`font-black font-mono ${metrics.percentage >= 85 ? 'text-rose-600' : metrics.percentage >= 40 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {metrics.percentage}% {isRtl ? 'مستغل' : 'capacity'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchWord(t.fullName);
                            setStatusFilter('all');
                          }}
                          className="text-[9px] text-indigo-600 hover:text-indigo-850 hover:underline font-bold bg-indigo-50 px-1 py-0.5 rounded border border-indigo-100 cursor-pointer"
                        >
                          {isRtl ? 'تفاصيل 🔍' : 'View tasks 🔍'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Overload Legend warnings or advices */}
            <div className="mt-4 p-3 bg-zinc-50 border border-zinc-150 rounded-lg flex items-start gap-2.5 text-[11px] text-zinc-650">
              <AlertTriangle className="text-amber-500 w-4 h-4 shrink-0 mt-0.5 animate-bounce" />
              <div>
                <span className="font-extrabold text-zinc-800 block mb-0.5">
                  {isRtl ? 'إرشاد حماية السعة الاستيعابية لمنسقي المشاريع:' : 'Project Dispatch Advisory Guideline:'}
                </span>
                <p className="leading-relaxed">
                  {isRtl 
                    ? 'يرجى تجنب إسناد ملفات معقدة جديدة إلى المترجمين الذين تتجاوز نسبة الضغط لديهم 85%. قم بتعيين المترجمين تحت النطاق الأخضر (<40%) لتوزيع متساوٍ وضمان دقة الصياغة والمصادقة القانونية.' 
                    : 'Linguists with active load capacity utilization exceeding 85% is flagged as High Risk. Outward allocations should prioritize available specialists possessing low capacity utilization (<40%) to secure premium, error-free certified outputs.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search Filtering and Intake button Trigger */}
      <div className="bg-white border border-zinc-150 p-6 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-none">
        <div className="flex gap-1 bg-zinc-50 border border-zinc-150 p-1 rounded-lg w-fit">
          <button 
            onClick={() => setStatusFilter('all')} 
            className={`px-3 py-1 text-[11px] font-semibold transition-all cursor-pointer rounded ${statusFilter === 'all' ? 'bg-zinc-950 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 text-zinc-500'}`}
          >
            All folders ({tasks.length})
          </button>
          <button 
            onClick={() => setStatusFilter('pending')} 
            className={`px-3 py-1 text-[11px] font-semibold transition-all cursor-pointer rounded ${statusFilter === 'pending' ? 'bg-zinc-950 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 text-zinc-500'}`}
          >
            Unallocated ({tasks.filter(t => t.status === 'pending').length})
          </button>
          <button 
            onClick={() => setStatusFilter('assigned')} 
            className={`px-3 py-1 text-[11px] font-semibold transition-all cursor-pointer rounded ${statusFilter === 'assigned' ? 'bg-zinc-950 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-650 text-zinc-500'}`}
          >
            Assigned Queue
          </button>
          <button 
            onClick={() => setStatusFilter('completed')} 
            className={`px-3 py-1 text-[11px] font-semibold transition-all cursor-pointer rounded ${statusFilter === 'completed' ? 'bg-zinc-950 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 text-zinc-500'}`}
          >
            Ready
          </button>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 flex-1 justify-end">
          {(currentRole === 'owner' || currentRole === 'admin') && (
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-zinc-200 text-xs rounded-lg focus:outline-none cursor-pointer font-semibold text-zinc-750 hover:bg-zinc-50 transition-colors shrink-0"
              title={isRtl ? 'فرز حسب الأولوية' : 'Sort by Priority'}
            >
              <option value="default">{isRtl ? 'ترتيب افتراضي' : 'Default Sort'}</option>
              <option value="priority-desc">{isRtl ? 'الأولية (عاجل ➔ منخفض)' : 'Priority (Urgent ➔ Low)'}</option>
              <option value="priority-asc">{isRtl ? 'الأولية (منخفض ➔ عاجل)' : 'Priority (Low ➔ Urgent)'}</option>
            </select>
          )}

          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-400">
              <Search size={13} />
            </span>
            <input 
              type="text" 
              value={searchWord}
              onChange={e => setSearchWord(e.target.value)}
              className="w-full pl-9 pr-7 py-1.5 bg-zinc-50 border border-zinc-200 text-xs rounded-lg focus:outline-none focus:bg-white focus:border-zinc-400 transition-colors"
              placeholder={isRtl ? "ابحث باسم العميل، المترجم أو عنوان الملف..." : "Search client, assigned translator, or file title..."}
              title={isRtl ? "ابحث باسم العميل أو عنوان الملف أو المترجم المعين" : "Filter tasks by client, translator, reference, or file title"}
            />
            {searchWord && (
              <button 
                type="button"
                onClick={() => setSearchWord('')}
                className="absolute inset-y-0 right-2 px-1 flex items-center text-[10px] font-bold text-zinc-400 hover:text-zinc-650 transition-colors cursor-pointer"
                title={isRtl ? "إلغاء البحث" : "Clear search"}
              >
                ✕
              </button>
            )}
          </div>
          <button
            onClick={() => setIsRegistering(true)}
            className="px-4 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-colors shrink-0"
          >
            <Plus size={12} />
            <span>Register Intake</span>
          </button>
        </div>
      </div>

      {isAdminOrStaff && selectedTaskIds.length > 0 && (
        <div className="bg-zinc-900 text-white rounded-xl p-4 shadow-xl border border-zinc-850 flex flex-col gap-4 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-black text-white">
                {selectedTaskIds.length}
              </span>
              <div>
                <p className="text-xs font-bold font-sans">
                  {isRtl ? 'ملفات الترجمة المحددة للمعالجة الجماعية' : 'Selected translation folders for bulk action'}
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedTaskIds([])}
                  className="text-[10px] font-bold text-zinc-400 hover:text-white transition-colors underline cursor-pointer mt-0.5 block text-left"
                >
                  {isRtl ? 'إلغاء تحديد الكل' : 'Deselect all files'}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* STATUS BULK ACTION */}
              <div className="flex items-center gap-1.5 p-1.5 bg-zinc-805 bg-zinc-800 rounded-lg border border-zinc-700/60">
                <select
                  value={bulkStatus}
                  onChange={e => setBulkStatus(e.target.value)}
                  className="bg-transparent text-white text-[11px] font-semibold focus:outline-none cursor-pointer max-w-[155px]"
                >
                  <option value="" className="bg-zinc-900 text-zinc-400">{isRtl ? '-- تحديث الحالة --' : '-- Status --'}</option>
                  <option value="pending" className="bg-zinc-900 text-white">{isRtl ? 'غير معين (معلق)' : 'Unallocated (Pending)'}</option>
                  <option value="assigned" className="bg-zinc-900 text-white">{isRtl ? 'تم التعيين' : 'Assigned'}</option>
                  <option value="in_progress" className="bg-zinc-900 text-white">{isRtl ? 'قيد العمل' : 'In Progress'}</option>
                  <option value="review" className="bg-zinc-900 text-white">{isRtl ? 'قيد المراجعة' : 'Review'}</option>
                  <option value="completed" className="bg-zinc-900 text-white">{isRtl ? 'جاهز للتسليم' : 'Ready (Completed)'}</option>
                  <option value="delivered" className="bg-zinc-900 text-white">{isRtl ? 'تم التسليم' : 'Delivered'}</option>
                  <option value="archived" className="bg-zinc-900 text-white">{isRtl ? 'مؤرشف' : 'Archived'}</option>
                </select>
                <button
                  type="button"
                  disabled={!bulkStatus}
                  onClick={handleBulkStatusUpdate}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white px-2.5 py-1 text-[10px] font-black rounded-md uppercase tracking-wider transition-colors cursor-pointer"
                >
                  {isRtl ? 'تطبيق' : 'Apply'}
                </button>
              </div>

               {/* TRANSLATOR BULK ALLOCATION */}
              <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-zinc-805 bg-zinc-800 rounded-lg border border-zinc-700/60">
                <select
                  value={bulkTranslatorId}
                  onChange={e => setBulkTranslatorId(e.target.value)}
                  className="bg-transparent text-white text-[11px] font-semibold focus:outline-none cursor-pointer max-w-[165px]"
                >
                  <option value="" className="bg-zinc-900 text-zinc-400">{isRtl ? '-- تعيين مترجم --' : '-- Assign Translator --'}</option>
                  {translators.map(t => (
                    <option key={t.id} value={t.id} className="bg-zinc-900 text-white">
                      {t.fullName}
                    </option>
                  ))}
                </select>

                {bulkTranslatorId && (() => {
                  const metrics = getTranslatorMetrics(bulkTranslatorId);
                  const colorClass = metrics.percentage >= 85 ? 'text-rose-400 font-extrabold' : metrics.percentage >= 40 ? 'text-amber-450 text-amber-400 font-bold' : 'text-emerald-400 font-semibold';
                  return (
                    <div className="text-[10px] bg-zinc-900 px-2 py-0.5 rounded border border-zinc-700 text-zinc-300 flex items-center gap-1">
                      <span className="text-zinc-550 text-zinc-500">{isRtl ? 'ضغط:' : 'Load:'}</span>
                      <span className={colorClass}>{metrics.percentage}%</span>
                      {metrics.percentage >= 85 && <span className="text-[9px] text-rose-500 animate-pulse">⚠️</span>}
                    </div>
                  );
                })()}

                {bulkTranslatorId && (
                  <>
                    <select
                      value={bulkAssignType}
                      onChange={e => setBulkAssignType(e.target.value as any)}
                      className="bg-transparent text-white text-[10px] focus:outline-none border-l border-zinc-700 pl-1.5 cursor-pointer font-bold"
                    >
                      <option value="translation" className="bg-zinc-900">{isRtl ? 'ترجمة' : 'Translation'}</option>
                      <option value="revision" className="bg-zinc-900">{isRtl ? 'مراجعة' : 'Revision'}</option>
                      <option value="proofreading" className="bg-zinc-900">{isRtl ? 'تدقيق' : 'Proofreading'}</option>
                    </select>

                    <div className="flex items-center gap-1 border-l border-zinc-700 pl-1.5 text-white">
                      <span className="text-[9px] text-zinc-400">Rate:</span>
                      <input
                        type="number"
                        placeholder="EG/wd"
                        value={bulkRateWords || ''}
                        onChange={e => {
                          setBulkRateWords(parseFloat(e.target.value) || 0);
                          setBulkRateFixed(0);
                        }}
                        className="w-12 bg-zinc-900 border border-zinc-700 text-[10px] rounded p-0.5 font-semibold text-center focus:outline-none"
                      />
                      <span className="text-[9px] text-zinc-400">Fixed:</span>
                      <input
                        type="number"
                        placeholder="Fixed"
                        value={bulkRateFixed || ''}
                        onChange={e => {
                          setBulkRateFixed(parseFloat(e.target.value) || 0);
                          setBulkRateWords(0);
                        }}
                        className="w-12 bg-zinc-900 border border-zinc-700 text-[10px] rounded p-0.5 font-semibold text-center focus:outline-none"
                      />
                    </div>
                  </>
                )}

                <button
                  type="button"
                  disabled={!bulkTranslatorId}
                  onClick={handleBulkAssignment}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white px-2.5 py-1 text-[10px] font-black rounded-md uppercase tracking-wider transition-colors cursor-pointer"
                >
                  {isRtl ? 'تعيين' : 'Assign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CORE WORKFLOW LISTS TABULATION */}
      <div className="bg-white border border-zinc-150 rounded-xl overflow-hidden text-zinc-700 shadow-none">
         <div className="overflow-x-auto w-full">
           <table className="w-full text-xs text-left text-zinc-600 font-sans border-collapse">
             <thead className="bg-zinc-50 border-b border-zinc-150 text-[10px] uppercase font-semibold text-zinc-400 tracking-widest">
               <tr>
                 {isAdminOrStaff && (
                   <th className="px-4 py-3 border-r border-zinc-100 text-center w-12">
                     <input 
                       type="checkbox"
                       checked={sortedTasks.length > 0 && selectedTaskIds.length === sortedTasks.length}
                       onChange={e => {
                         if (e.target.checked) {
                           setSelectedTaskIds(sortedTasks.map(t => t.id));
                         } else {
                           setSelectedTaskIds([]);
                         }
                       }}
                       className="cursor-pointer"
                       title={isRtl ? 'تحديد كافة ملفات الجدول' : 'Select all folders in current list'}
                     />
                   </th>
                 )}
                 <th className="px-5 py-3 border-r border-zinc-100 text-center">Folder Ref</th>
                 <th className="px-5 py-3 border-r border-zinc-100">Target Client</th>
                 <th className="px-5 py-3 border-r border-zinc-100">Inward File / Scope</th>
                 <th className="px-5 py-3 border-r border-zinc-100 text-center">Languages</th>
                 <th className="px-5 py-3 border-r border-zinc-100 text-center">Word count</th>
                 <th className="px-5 py-3 border-r border-zinc-100 text-right">EGP Price</th>
                 <th className="px-5 py-3 border-r border-zinc-100 text-center">Status</th>
                 <th className="px-5 py-3 border-r border-zinc-100 text-center">Priority</th>
                 <th className="px-5 py-3 border-r border-zinc-100 text-center">Deadline</th>
                 <th className="px-5 py-3 text-center">Allocation Checks</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-zinc-150 font-sans">
               {sortedTasks.length === 0 ? (
                 <tr>
                   <td colSpan={isAdminOrStaff ? 11 : 10} className="p-8 text-center text-zinc-400">
                     No active translation folders currently tracked in GTMS. Press "Register Intake" to file folders.
                   </td>
                 </tr>
              ) : (
                sortedTasks.map(t => {
                  // check if there is assignment
                  const asg = dbInstance.assignments.find(a => a.taskId === t.id);
                  const assignedLinguist = asg ? dbInstance.profiles.find(p => p.id === asg.translatorId) : null;

                  return (
                    <tr key={t.id} className="hover:bg-zinc-50/50 transition-colors">
                      {isAdminOrStaff && (
                        <td className="px-4 py-3.5 text-center border-r border-zinc-100 w-12">
                          <input 
                            type="checkbox"
                            checked={selectedTaskIds.includes(t.id)}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedTaskIds(prev => [...prev, t.id]);
                              } else {
                                setSelectedTaskIds(prev => prev.filter(id => id !== t.id));
                              }
                            }}
                            className="cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="px-5 py-3.5 text-center border-r border-zinc-100 font-bold font-mono text-zinc-900 select-all shrink-0">
                        {t.referenceNo}
                      </td>
                      <td className="px-5 py-3.5 border-r border-zinc-100 font-semibold text-zinc-900">
                        {t.clientNameCache}
                      </td>
                      <td className="px-5 py-3.5 border-r border-zinc-100">
                        <p className="font-semibold text-zinc-900 truncate max-w-xs">{t.fileName}</p>
                        <span className="text-[10px] text-zinc-400 capitalize block mt-1">{t.serviceType.replace('_', ' ')} • Received: {t.intakeDate}</span>
                        {t.attachments && t.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2 max-w-[280px]">
                            {t.attachments.map(att => (
                              <a
                                key={att.id}
                                href={att.url}
                                download={att.name}
                                title={`${att.name} (${(att.size / 1024).toFixed(1)} KB)`}
                                className="inline-flex items-center gap-1 bg-zinc-50 hover:bg-zinc-100 text-zinc-650 hover:text-zinc-900 border border-zinc-200/80 px-1.5 py-0.5 rounded text-[9px] font-mono transition-all shrink-0"
                              >
                                <Paperclip size={9} className="text-zinc-400 shrink-0" />
                                <span className="truncate max-w-[90px]">{att.name}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center border-r border-zinc-100 text-zinc-500">
                        {t.sourceLanguage} ➔ <br /> {t.targetLanguage}
                      </td>
                      <td className="px-5 py-3.5 text-center border-r border-zinc-100 font-semibold font-mono text-zinc-850">
                        {t.wordCount.toLocaleString()} wds
                      </td>
                      <td className="px-5 py-3.5 text-right border-r border-zinc-100 font-mono text-zinc-900">
                        <div className="font-semibold text-xs">EGP {t.amountEgp.toLocaleString()}</div>
                        {t.amountAed > 0 && <span className="block text-[10px] text-zinc-400 font-semibold font-mono">AED {t.amountAed}</span>}
                        {(t.amountEgp - (t.paidAmountEgp || 0)) > 0 ? (
                          <span className="inline-block mt-1 px-1.5 py-0.5 bg-rose-50 text-rose-600 text-[9px] font-bold rounded border border-rose-100 animate-pulse" title={isRtl ? 'المبلغ المتبقي المطلوب تحصيله' : 'Outstanding remains to collect'}>
                            {isRtl ? 'باقي: ' : 'Rem: '} EGP {(t.amountEgp - (t.paidAmountEgp || 0)).toLocaleString()}
                          </span>
                        ) : (
                          <span className="inline-block mt-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-bold rounded border border-emerald-100">
                            {isRtl ? 'مدفوع بالكامل' : 'Paid Full'}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center border-r border-zinc-100 shrink-0">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase border ${
                          t.status === 'pending' ? 'bg-zinc-100 text-zinc-500 border-zinc-200' :
                          t.status === 'assigned' ? 'bg-zinc-50 text-zinc-800 border-zinc-355 border-zinc-200' :
                          t.status === 'in_progress' ? 'bg-zinc-900 text-white border-transparent' :
                          t.status === 'review' ? 'bg-zinc-100 text-zinc-750 border-zinc-250' :
                          'bg-zinc-900 text-white border-transparent font-semibold border'
                        }`}>
                          {t.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center border-r border-zinc-100 shrink-0 font-sans">
                        {t.priority ? (
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase border ${
                            t.priority === 'urgent' ? 'bg-red-50 text-red-700 border-red-250 shadow-xs' :
                            t.priority === 'high' ? 'bg-amber-50 text-amber-700 border-amber-250' :
                            t.priority === 'medium' ? 'bg-blue-50 text-blue-700 border-blue-250' :
                            'bg-zinc-100 text-zinc-650 border-zinc-200'
                          }`}>
                            {isRtl ? (
                              t.priority === 'urgent' ? 'عاجل جداً' :
                              t.priority === 'high' ? 'عالية' :
                              t.priority === 'medium' ? 'متوسطة' :
                              'منخفضة'
                            ) : t.priority}
                          </span>
                        ) : (
                          <span className="text-zinc-400 text-[10px] font-semibold italic">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center border-r border-zinc-100 font-sans tracking-wide">
                        {t.deadline ? (
                          <div className="flex flex-col items-center justify-center">
                            <span className="font-mono font-bold text-zinc-900 text-[10px]">
                              {new Date(t.deadline).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                            <span className="text-[9px] font-semibold text-zinc-400 font-mono mt-0.5">
                              {new Date(t.deadline).toLocaleTimeString(isRtl ? 'ar-EG' : 'en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-400 italic text-[10px] font-medium">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {!assignedLinguist ? (
                          <button
                            onClick={() => handleOpenAssign(t)}
                            className="px-2.5 py-1 text-[10px] font-semibold bg-zinc-900 hover:bg-zinc-800 text-white rounded cursor-pointer transition-colors inline-flex items-center gap-1 shrink-0"
                          >
                            <UserPlus size={10} /> Assign Translator
                          </button>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-1 shrink-0 text-center">
                            <span className="text-[10px] font-semibold text-zinc-900 block">
                              {assignedLinguist.fullName}
                            </span>

                            <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded font-mono uppercase border ${
                              asg?.status === 'assigned' ? 'bg-zinc-50 text-zinc-500 border-zinc-200' :
                              asg?.status === 'in_progress' ? 'bg-amber-50 text-amber-500 border-amber-200' :
                              asg?.status === 'submitted' ? 'bg-indigo-50 text-indigo-550 border-indigo-200 animate-pulse' :
                              'bg-green-50 text-emerald-500 border-emerald-250 font-bold'
                            }`}>
                              {asg?.status === 'assigned' ? 'assigned' : asg?.status.replace('_', ' ')}
                            </span>

                            {asg?.translatedAttachments && asg.translatedAttachments.length > 0 && (
                              <div className="mt-2 p-1.5 bg-emerald-50 rounded-lg border border-emerald-150 space-y-1 w-full text-left">
                                <span className="text-[8px] font-black text-emerald-800 uppercase block font-mono">
                                  📥 {isRtl ? 'الترجمة المستلمة:' : 'Recv Translation:'}
                                </span>
                                {asg.translatedAttachments.map(att => (
                                  <a
                                    key={att.id}
                                    href={att.url}
                                    download={att.name}
                                    title={`${att.name} (${(att.size / 1024).toFixed(1)} KB)`}
                                    className="flex items-center gap-1 bg-white hover:bg-emerald-100 text-zinc-900 border border-emerald-200 p-1 rounded text-[8px] font-mono transition-all truncate cursor-pointer"
                                    onClick={() => {
                                      alert(isRtl ? `بدء تنزيل مستند الترجمة المصدرية: ${att.name}` : `Downloading translation asset file: ${att.name}`);
                                    }}
                                  >
                                    <FileText size={8} className="text-emerald-500 shrink-0" />
                                    <span className="truncate max-w-[80px] font-bold">{att.name}</span>
                                  </a>
                                ))}
                              </div>
                            )}

                            {asg?.status === 'submitted' && (
                              <button
                                onClick={() => handleOpenVerify(asg)}
                                className="mt-1 px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-bold rounded cursor-pointer uppercase tracking-wider flex items-center justify-center gap-1 shrink-0 shadow-sm"
                              >
                                <CheckCircle size={10} /> Verify & Approve
                              </button>
                            )}

                            {t.status === 'completed' && (
                              <div className="mt-1.5 space-y-1">
                                {(t.amountEgp - (t.paidAmountEgp || 0)) > 0 && (
                                  <div className="px-1.5 py-0.5 bg-rose-50 text-rose-600 text-[9px] font-black rounded border border-rose-150 flex items-center gap-0.5 justify-center animate-bounce">
                                    ⚠️ {isRtl ? 'طالب بالمبلغ المتبقي!' : 'Collect Remainder!'}
                                  </div>
                                )}
                                <button
                                  onClick={() => handleDeliverTask(t.id)}
                                  className="w-full px-2 py-1 bg-zinc-900 hover:bg-zinc-850 text-white text-[9px] font-bold rounded cursor-pointer uppercase tracking-wider text-center flex items-center justify-center gap-1 shadow-xs transition-colors"
                                >
                                  {isRtl ? 'تسليم وأرشفة' : 'Mark Delivered'}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                }))}
            </tbody>
          </table>
        </div>
      </div>

      {/* REGISTRATION MODAL FORM - Multi step intake file catalog */}
      {(isRegistering || isQuickIntakeOpen) && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center z-50 p-4 animate-fade-in text-slate-700 font-sans">
          <div className="bg-white p-5 rounded-2xl w-full max-w-xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-y-auto">
            <h3 className="font-extrabold text-slate-900 border-b border-slate-100 pb-2 text-sm">
              Register Incoming Translation Folder Document
            </h3>
            
            <form onSubmit={handleRegisterTask} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-xs">
              {/* On-the-fly Client Account Assignment / Creation Section */}
              <div className="sm:col-span-2 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-indigo-900 text-xs flex items-center gap-1.5">
                    👤 {isRtl ? 'العميل الفعلي للملف' : 'Client Profile Assignment'}
                  </span>
                  
                  <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] font-black text-indigo-600">
                    <input 
                      type="checkbox"
                      checked={isRegisteringNewClient}
                      onChange={e => setIsRegisteringNewClient(e.target.checked)}
                      className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                    />
                    <span>{isRtl ? '➕ إضافة عميل جديد بالكامل' : '➕ Add brand new client'}</span>
                  </label>
                </div>

                {!isRegisteringNewClient ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="relative">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        {isRtl ? 'البحث عن العميل بالاسم (إكمال تلقائي)' : 'Search Client Name (Auto-Complete)'}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={clientSearchQuery}
                          onChange={e => {
                            const val = e.target.value;
                            setClientSearchQuery(val);
                            setShowClientSuggestions(true);
                            if (!val) {
                              setClientId('');
                            } else {
                              // If there's a perfect match on search query, select it
                              const exactMatch = clients.find(c => c.name.toLowerCase() === val.toLowerCase() || (c.nameAr && c.nameAr.toLowerCase() === val.toLowerCase()));
                              if (exactMatch) {
                                setClientId(exactMatch.id);
                                if (exactMatch.phone) setClientPhone(exactMatch.phone);
                              }
                            }
                          }}
                          onFocus={() => setShowClientSuggestions(true)}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-[11px] pr-8 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-800"
                          placeholder={isRtl ? "اكتب اسم العميل عربي أو إنجليزي..." : "Type client name (EN/AR)..."}
                          required={!isRegisteringNewClient && !clientPhone}
                        />
                        {clientSearchQuery && (
                          <button
                            type="button"
                            onClick={() => {
                              setClientSearchQuery('');
                              setClientId('');
                              setShowClientSuggestions(false);
                            }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Suggestions list popup */}
                      {showClientSuggestions && (
                        <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg z-50 divide-y divide-slate-100">
                          {(() => {
                            const query = clientSearchQuery.toLowerCase().trim();
                            const matches = clients.filter(c => {
                              if (!query) return true; // Show all option if empty query
                              return (
                                c.name.toLowerCase().includes(query) ||
                                (c.nameAr && c.nameAr.toLowerCase().includes(query)) ||
                                (c.company && c.company.toLowerCase().includes(query)) ||
                                (c.phone && c.phone.includes(query))
                              );
                            });

                            if (matches.length === 0) {
                              return (
                                <div className="p-3 text-slate-400 text-[11px] italic text-center">
                                  {isRtl ? 'لا توجد نتائج مطابقة' : 'No matching clients found'}
                                </div>
                              );
                            }

                            return matches.map(c => {
                              const isSelected = clientId === c.id;
                              return (
                                <div
                                  key={c.id}
                                  onClick={() => {
                                    setClientId(c.id);
                                    setClientSearchQuery(`${c.name}${c.nameAr ? ` (${c.nameAr})` : ''}`);
                                    if (c.phone) {
                                      setClientPhone(c.phone);
                                    }
                                    setShowClientSuggestions(false);
                                  }}
                                  className={`p-2.5 text-[11px] font-semibold text-left cursor-pointer transition-colors flex items-center justify-between ${
                                    isSelected 
                                      ? 'bg-indigo-50 text-indigo-900 font-bold hover:bg-indigo-100' 
                                      : 'hover:bg-slate-50 text-slate-700'
                                  }`}
                                >
                                  <div>
                                    <p className="text-slate-800 font-bold">{c.name} {c.nameAr ? `(${c.nameAr})` : ''}</p>
                                    <p className="text-[9px] text-slate-450 text-slate-500 font-medium mt-0.5">
                                      {c.company ? `${c.company} • ` : ''}{c.phone || 'No phone'}
                                    </p>
                                  </div>
                                  {isSelected && <span className="text-indigo-650 text-[11px] font-extrabold text-indigo-600">✓</span>}
                                </div>
                              );
                            });
                          })()}
                        </div>
                      )}

                      {/* Click outside listener - light dismissal overlay */}
                      {showClientSuggestions && (
                        <div 
                          className="fixed inset-0 z-40 cursor-default bg-transparent" 
                          onClick={() => setShowClientSuggestions(false)} 
                        />
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">{isRtl ? 'هاتف التواصل السريع' : 'Phone / Call ID'}</label>
                      <input 
                        type="text" 
                        value={clientPhone} 
                        onChange={e => setClientPhone(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-850"
                        placeholder={isRtl ? "أدخل رقم الهاتف أو معرف الاتصال" : "e.g.+2010..."}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-3 rounded-lg border border-indigo-150 space-y-3 pt-2">
                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                      {isRtl ? '✨ استمارة تسجيل العميل الجديد' : '✨ New Client Account Form'}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block">{isRtl ? 'اسم العميل بالإنجليزية' : 'Client Name (EN) *'}</label>
                        <input 
                          type="text"
                          value={newClientName}
                          onChange={e => setNewClientName(e.target.value)}
                          className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          placeholder="e.g. Al-Futtaim Egypt"
                          required={isRegisteringNewClient}
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block">{isRtl ? 'اسم العميل بالعربية' : 'Client Name (AR)'}</label>
                        <input 
                          type="text"
                          value={newClientNameAr}
                          onChange={e => setNewClientNameAr(e.target.value)}
                          className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          placeholder="مثال: الفطيم مصر"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block">{isRtl ? 'الهاتف' : 'Phone Number *'}</label>
                        <input 
                          type="text"
                          value={newClientPhone}
                          onChange={e => setNewClientPhone(e.target.value)}
                          className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          placeholder="e.g. +2010..."
                          required={isRegisteringNewClient}
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block">{isRtl ? 'البريد الإلكتروني' : 'Email Address'}</label>
                        <input 
                          type="email"
                          value={newClientEmail}
                          onChange={e => setNewClientEmail(e.target.value)}
                          className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          placeholder="e.g. client@example.com"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block">{isRtl ? 'نوع العميل' : 'Client Type'}</label>
                        <select
                          value={newClientType}
                          onChange={e => setNewClientType(e.target.value as any)}
                          className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-855 cursor-pointer focus:ring-1 focus:ring-indigo-500 focus:outline-none text-slate-800"
                        >
                          <option value="individual">{isRtl ? 'فرد (Individual)' : 'Individual'}</option>
                          <option value="company">{isRtl ? 'شركة (Company)' : 'Company'}</option>
                          <option value="agency">{isRtl ? 'مكتب / وكالة (Agency)' : 'Agency'}</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block">{isRtl ? 'ملاحظات عن العميل' : 'Client Notes (Optional)'}</label>
                        <input 
                          type="text"
                          value={newClientNotes}
                          onChange={e => setNewClientNotes(e.target.value)}
                          className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          placeholder="..."
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Subject Legal Document Title</label>
                <input 
                  type="text" 
                  value={fileName} 
                  onChange={e => setFileName(e.target.value)}
                  className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="E.g. Safety_Regulations_Charter_2026.pdf"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Service Specialization Class</label>
                <select 
                  value={service} 
                  onChange={e => setService(e.target.value as any)}
                  className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                >
                  <option value="translation">Translation (ترجمة)</option>
                  <option value="certified_translation">certified (معتمدة)</option>
                  <option value="proofreading">Linguistic proofreading</option>
                  <option value="interpretation">Interpretation (ترجمة فورية)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Source Language</label>
                  <input type="text" value={srcLang} onChange={e => setSrcLang(e.target.value)} className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl" required />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Target Language</label>
                  <input type="text" value={tgtLang} onChange={e => setTgtLang(e.target.value)} className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl" required />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Precise Word Count</label>
                <input 
                  type="number" 
                  value={words || ''} 
                  onChange={e => handleWordUpdate(parseInt(e.target.value) || 0)}
                  className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-center font-bold"
                  placeholder="0"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-505 uppercase">Summed Page Count</label>
                <input 
                  type="number" 
                  value={pages || ''} 
                  onChange={e => setPages(parseInt(e.target.value) || 0)}
                  className="w-full mt-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold"
                  placeholder="Pages"
                />
              </div>

              <div className="grid grid-cols-3 gap-3 sm:col-span-2">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Price EGP</label>
                  <input type="number" value={egp || ''} onChange={e => setEgp(parseInt(e.target.value) || 0)} className="w-full mt-1.5 p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-center font-mono font-bold text-zinc-900" required />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Price AED (Optional)</label>
                  <input type="number" value={aed || ''} onChange={e => setAed(parseInt(e.target.value) || 0)} className="w-full mt-1.5 p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-center font-mono font-semibold text-zinc-900" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Price USD (Optional)</label>
                  <input type="number" value={usd || ''} onChange={e => setUsd(parseInt(e.target.value) || 0)} className="w-full mt-1.5 p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-center font-mono font-semibold text-zinc-900" />
                </div>
              </div>

              {/* Financial Deposit Allocation & Accounting Section */}
              <div className="sm:col-span-2 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                  <span>💵 {isRtl ? 'الحسابات والمدفوعات النقدية (الإيداع الأولي)' : 'Deposit Allocation & Initial Accounting'}</span>
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block uppercase">{isRtl ? 'المبلغ المدفوع (جنيه)' : 'Initial Deposit (EGP)'}</label>
                    <input 
                      type="number" 
                      value={initialPaidAmountEgp || ''} 
                      onChange={e => setInitialPaidAmountEgp(Math.max(0, parseInt(e.target.value) || 0))} 
                      className="w-full mt-1.5 p-2 bg-white border border-slate-200 rounded-lg text-center font-mono font-bold text-indigo-700 text-xs focus:ring-1 focus:ring-indigo-600 focus:outline-none" 
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block uppercase">{isRtl ? 'طريقة الدفع' : 'Payment Method'}</label>
                    <select 
                      value={initialPaymentMethod} 
                      onChange={e => setInitialPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full mt-1.5 p-2 bg-white border border-slate-205 rounded-lg text-xs font-semibold text-slate-850 focus:ring-1 focus:ring-indigo-600 focus:outline-none"
                    >
                      <option value="cash">{isRtl ? 'كاش (نقدي)' : 'Cash'}</option>
                      <option value="instapay">InstaPay</option>
                      <option value="vodafone_cash">Vodafone Cash</option>
                      <option value="bank_transfer">{isRtl ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                    </select>
                  </div>
                  <div className="flex flex-col justify-center items-center bg-white border border-slate-150 rounded-lg p-2">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">{isRtl ? 'المبلغ المتبقي المطلوب' : 'Outstanding Balance'}</span>
                    <span className="text-xs font-black font-mono text-rose-600 mt-1">
                      EGP {(egp - initialPaidAmountEgp).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 sm:col-span-2">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Intake date</label>
                  <input type="date" value={intakeDate} onChange={e => setIntakeDate(e.target.value)} className="w-full mt-1.5 p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Intake Lead Gateway</label>
                  <select value={channel} onChange={e => setChannel(e.target.value as any)} className="w-full mt-1.5 p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900" >
                    <option value="whatsapp">WhatsApp chat</option>
                    <option value="email">Corporate email</option>
                    <option value="walk_in">Walk-in client</option>
                    <option value="phone">Outbound call</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Priority Rating</label>
                  <select value={priority} onChange={e => setPriority(e.target.value as any)} className="w-full mt-1.5 p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 font-semibold" >
                    <option value="low">Low {isRtl ? '(منخفضة)' : ''}</option>
                    <option value="medium">Medium {isRtl ? '(متوسطة)' : ''}</option>
                    <option value="high">High {isRtl ? '(عالية)' : ''}</option>
                    <option value="urgent">Urgent {isRtl ? '(عاجل جداً)' : ''}</option>
                  </select>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Target Delivery Deadline</label>
                <input 
                  type="datetime-local" 
                  value={deadline} 
                  onChange={e => setDeadline(e.target.value)} 
                  className="w-full mt-1.5 p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 font-mono font-bold" 
                />
              </div>

              <div className="sm:col-span-2 flex items-center gap-2 py-2.5 bg-zinc-50 rounded-lg px-3 border border-zinc-200/80">
                <input 
                  type="checkbox" 
                  id="taxCheck" 
                  checked={tax} 
                  onChange={e => setTax(e.target.checked)} 
                  className="w-4 h-4 text-zinc-950 accent-zinc-950 focus:ring-zinc-950"
                />
                <label htmlFor="taxCheck" className="text-[10px] font-semibold text-zinc-650 block uppercase cursor-pointer">Tax invoice required ✓</label>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Document Filing Notes</label>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="w-full mt-1.5 p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900" placeholder="Remarks regarding formatting guidelines..." />
              </div>

              <div className="sm:col-span-2 space-y-2 border-t border-zinc-100 pt-3">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block font-sans">
                  {isRtl ? 'ملفات ومستندات المشروع' : 'Project Documents / Reference Materials'}
                </label>
                
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                    dragActive 
                      ? 'border-indigo-500 bg-indigo-50/10' 
                      : 'border-zinc-200 hover:border-zinc-300 bg-zinc-50/40'
                  }`}
                >
                  <input 
                    type="file" 
                    id="file-attachment-input" 
                    multiple 
                    onChange={handleChangeFile} 
                    className="hidden" 
                  />
                  <label 
                    htmlFor="file-attachment-input" 
                    className="cursor-pointer flex flex-col items-center justify-center gap-1.5 py-1"
                  >
                    <FileUp size={20} className="text-zinc-400" />
                    <span className="text-[11px] font-semibold text-zinc-700">
                      {isRtl 
                        ? 'اسحب الملفات هنا أو انقر للتصفح' 
                        : 'Drag & drop task reference materials here, or click to browse'}
                    </span>
                    <span className="text-[9px] text-zinc-400 font-mono">
                      {isRtl ? 'يدعم مستندات وورد، بي دي إف والملفات القانونية' : 'Supports Docx, PDF, Images (Max 400KB for offline storage, auto-links large documents)'}
                    </span>
                  </label>
                </div>

                {attachments.length > 0 && (
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto pt-1">
                    {attachments.map(att => (
                      <div 
                        key={att.id} 
                        className="flex items-center justify-between p-2 bg-zinc-50 border border-zinc-150 rounded-lg text-[10px]"
                      >
                        <div className="flex items-center gap-1.5 truncate max-w-[85%] font-sans">
                          <Paperclip size={11} className="text-zinc-400 shrink-0" />
                          <div className="truncate font-medium text-zinc-800">
                            <span className="font-semibold block truncate text-zinc-900">{att.name}</span>
                            <span className="text-[8px] text-zinc-400 font-mono">{(att.size / 1024).toFixed(1)} KB • {att.type || 'Document'}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(att.id)}
                          className="p-1 text-zinc-400 hover:text-red-500 rounded hover:bg-zinc-100 transition-colors cursor-pointer shrink-0"
                          title={isRtl ? 'إزالة الملف' : 'Remove document'}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="sm:col-span-2 flex justify-end gap-2 border-t pt-4">
                <button
                  type="button"
                  onClick={() => { setIsRegistering(false); onCloseQuickIntake(); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-slate-900 text-white font-bold rounded-xl cursor-pointer active:scale-95 transition-all"
                >
                  Confirm Legal intake
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGNMENT MODAL POPUP DIALOG */}
      {selectedTaskForAssign && (
        <div className="fixed inset-0 bg-zinc-950/60 flex items-center justify-center z-50 p-4 animate-fade-in text-zinc-700 font-sans backdrop-blur-xs">
          <div className="bg-white p-6 rounded-xl w-full max-w-md border border-zinc-200 shadow-none">
            {assignedSuccessData ? (
              // NOTIFICATION & DISPATCH SUCCESS SCREEN
              <div className="space-y-4 relative">
                {/* Close Button Header */}
                <div className="absolute -top-3 -right-3 z-20">
                  <button
                    onClick={() => {
                      setAssignedSuccessData(null);
                      setSelectedTaskForAssign(null);
                      setEmailStatus(null);
                    }}
                    className="w-10 h-10 flex items-center justify-center bg-white border-2 border-zinc-200 rounded-full text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50 shadow-lg transition-all active:scale-90 cursor-pointer"
                    title={isRtl ? 'إغلاق' : 'Close'}
                  >
                    <X className="w-6 h-6 stroke-[2.5px]" />
                  </button>
                </div>

                <div className="text-center py-2">
                  <div className="w-12 h-12 bg-emerald-50 border border-emerald-250 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 size={24} />
                  </div>
                  <h4 className="font-bold text-zinc-900 text-sm">
                    {isRtl ? 'تم تخصيص المجلد بنجاح!' : 'Allocation Finalized!'}
                  </h4>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    {isRtl 
                      ? `تم تعيين الملف للمترجم: ${assignedSuccessData.translator.fullName}`
                      : `Inward folder assigned to ${assignedSuccessData.translator.fullName} successfully.`}
                  </p>
                </div>

                <div className="bg-zinc-50 border border-zinc-200/60 rounded-lg p-3 text-[11px] space-y-1.5 text-zinc-650">
                  <div className="flex justify-between">
                    <span className="font-medium text-zinc-400">{isRtl ? 'رقم المجلد:' : 'Folder Ref:'}</span>
                    <strong className="text-zinc-900 font-mono font-bold">{assignedSuccessData.task.referenceNo}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-zinc-400">{isRtl ? 'اسم المستند:' : 'Document:'}</span>
                    <strong className="text-zinc-950 font-semibold truncate max-w-[200px]" title={assignedSuccessData.task.fileName}>
                      {assignedSuccessData.task.fileName}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-zinc-400">{isRtl ? 'مجموع الكلمات:' : 'Word Count:'}</span>
                    <strong className="text-zinc-900 font-mono font-bold">{assignedSuccessData.task.wordCount.toLocaleString()} words</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-zinc-400">{isRtl ? 'موعد التسليم المرصود:' : 'Task Deadline:'}</span>
                    <strong className="text-zinc-900 font-semibold">
                      {assignedSuccessData.task.deadline
                        ? new Date(assignedSuccessData.task.deadline).toLocaleString(isRtl ? 'ar-EG' : 'en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : (isRtl ? 'بدون موعد محدد' : 'No Deadline Assigned')}
                    </strong>
                  </div>
                </div>

                {/* Secure Gateways notification triggers */}
                <div className="space-y-2.5">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    {isRtl ? 'إرسال إشعار مباشر للمترجم' : 'Dispatch Direct Secure Notifications'}
                  </div>
                  
                  {(() => {
                    const notify = getSimulatedNotificationData();
                    if (!notify) return null;
                    return (
                      <>
                        {/* WhatsApp dispatch option */}
                        <div className="border border-zinc-200/60 p-3 rounded-lg flex flex-col gap-2 bg-emerald-50/20">
                          <div className="flex items-start gap-2.5">
                            <span className="text-emerald-700 text-xs font-bold mt-0.5">💬 WhatsApp</span>
                            <div className="text-[10px] text-zinc-400 font-medium">
                              {isRtl ? `إلى الرقم: ${notify.phone}` : `To registered phone: ${notify.phone}`}
                            </div>
                          </div>
                          <a
                            href={notify.whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-lg text-center text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <span>{isRtl ? 'فتح محادثة واتساب وإرسال الإشعار' : 'Launch WhatsApp & Send Notification'}</span>
                          </a>
                        </div>

                        {/* Email Dispatch Option */}
                        <div className="border border-zinc-200/60 p-3 rounded-lg flex flex-col gap-2 bg-blue-50/20">
                          <div className="flex items-start gap-2.5">
                            <span className="text-blue-700 text-xs font-bold mt-0.5">✉ Official Email Gateway</span>
                            <div className="text-[10px] text-zinc-400 font-medium">
                              {isRtl ? `notification@globalizetl.com ➔ ${notify.email}` : `notification@globalizetl.com ➔ ${notify.email}`}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => sendAutomatedEmail(notify.email, notify.subject, notify.message)}
                              disabled={emailLoading}
                              className="flex-1 bg-zinc-950 hover:bg-zinc-800 disabled:bg-zinc-400 text-white font-bold py-2 px-3 rounded-lg text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            >
                              {emailLoading ? (
                                <span className="animate-pulse">{isRtl ? 'جاري الإرسال...' : 'Sending...'}</span>
                              ) : (
                                <span>{isRtl ? 'إرسال تلقائي (بوابة البريد)' : 'Automatic Send (Mail Gateway)'}</span>
                              )}
                            </button>
                            <a
                              href={notify.mailtoUrl}
                              className="bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-600 font-bold py-2 px-3 rounded-lg text-center text-[11px] transition-colors cursor-pointer"
                              title={isRtl ? 'فتح تطبيق البريد يدوياً' : 'Open mail client manually'}
                            >
                              <span>{isRtl ? 'يدوي' : 'Manual'}</span>
                            </a>
                          </div>
                          
                          {/* Status and instruction */}
                          {emailStatus && (
                            <div className={`text-[9px] font-bold px-2 py-1 rounded ${emailStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                              {emailStatus.msg}
                              {emailStatus.type === 'error' && (
                                <p className="font-normal mt-0.5 opacity-80">
                                  {isRtl ? 'تأكد من إعداد بيانات SMTP في الإعدادات.' : 'Ensure SMTP_HOST/PASS are set in app settings.'}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Visual summary field */}
                        <div className="text-[9px] text-zinc-400 border border-dashed border-zinc-200 p-2.5 rounded bg-zinc-50/50">
                          <strong className="block mb-0.5 font-semibold text-zinc-500">{isRtl ? 'نص الرسالة المجهزة للارسال:' : 'Pre-compiled payload preview:'}</strong>
                          <p className="whitespace-pre-line text-zinc-500 font-mono leading-relaxed">{notify.message}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="border-t border-zinc-150 pt-3.5 flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setAssignedSuccessData(null);
                      setSelectedTaskForAssign(null);
                      setEmailStatus(null);
                    }}
                    className="w-full bg-zinc-950 hover:bg-zinc-800 text-white font-bold py-2.5 px-4 rounded-lg text-center text-xs transition-colors cursor-pointer active:scale-[0.98]"
                  >
                    {isRtl ? 'تم، إغلاق هذه النافذة' : 'Complete Allocation & Close'}
                  </button>
                  <p className="text-[9px] text-center text-zinc-400">
                    {isRtl ? 'سيتم تحويل الملف إلى مرحلة التنفيذ والمتابعة.' : 'Folder moved to production pipeline for follow-up.'}
                  </p>
                </div>
              </div>
            ) : (
              // STANDARD FORM VIEW
              <>
                <h4 className="font-semibold text-zinc-900 text-sm border-b border-zinc-100 pb-2.5 flex items-center gap-1.5">
                  <UserPlus size={16} className="text-zinc-900" />
                  Assign folder to linguist
                </h4>
                <p className="text-[10px] text-zinc-400 leading-normal mt-2.5">
                  Select accredited translation specialist. This assigns their word balance queues, and increments translation task costing.
                </p>

                <form onSubmit={handleConfirmAssignment} className="mt-4 space-y-4 text-xs">
                  <div>
                    <label className="text-[10px] font-semibold text-zinc-400 uppercase block">Accredited Translation Linguist</label>
                    <select
                      value={targetTranslatorId}
                      onChange={e => setTargetTranslatorId(e.target.value)}
                      className="w-full mt-1.5 p-2 bg-zinc-50 border border-zinc-200 rounded-lg cursor-pointer focus:outline-none text-zinc-900"
                      required
                    >
                      <option value="">-- Choose specialist --</option>
                      {translators.map(t => (
                        <option key={t.id} value={t.id}>{t.fullName} ({t.fullNameAr})</option>
                      ))}
                    </select>

                    {targetTranslatorId && (() => {
                      const metrics = getTranslatorMetrics(targetTranslatorId);
                      let barColor = 'bg-emerald-500';
                      let loadMessageEn = 'Specialist is available with healthy capacity.';
                      let loadMessageAr = 'المترجم متاح ولديه قدرة استيعابية ممتازة.';
                      
                      if (metrics.percentage >= 85) {
                        barColor = 'bg-rose-500';
                        loadMessageEn = '⚠️ Warning: Overloaded. High bottleneck risk!';
                        loadMessageAr = '⚠️ تنبيه: تخطى الحد الأقصى للاستيعاب! خطر التأخير مرتفع.';
                      } else if (metrics.percentage >= 40) {
                        barColor = 'bg-amber-500';
                        loadMessageEn = 'Moderate workload assigned.';
                        loadMessageAr = 'ضغط العمل معتدل ونشط.';
                      }

                      return (
                        <div className="mt-2.5 p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg space-y-1.5 animate-fade-in text-[10px]">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-zinc-500">{isRtl ? 'القدرة الحالية للهدف:' : 'Current Utilized Capacity:'}</span>
                            <strong className={`font-mono font-bold ${metrics.percentage >= 85 ? 'text-rose-600' : metrics.percentage >= 40 ? 'text-amber-600' : 'text-emerald-600'}`}>
                              {metrics.activeWords.toLocaleString()} / {metrics.limit.toLocaleString()} words ({metrics.percentage}%)
                            </strong>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${barColor}`} 
                              style={{ width: `${metrics.percentage}%` }}
                            />
                          </div>

                          <div className="flex justify-between items-center gap-1">
                            <span className={`font-medium ${metrics.percentage >= 85 ? 'text-rose-600 font-bold' : 'text-zinc-550'}`}>
                              {isRtl ? loadMessageAr : loadMessageEn}
                            </span>
                            <span className="text-[9px] text-zinc-400 shrink-0">
                              💼 {metrics.activeTasksCount} {isRtl ? 'ملفات نشطة' : 'active folders'}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-zinc-400 uppercase block">Assignment Class</label>
                    <select
                      value={assignType}
                      onChange={e => setAssignType(e.target.value as any)}
                      className="w-full mt-1.5 p-2 bg-zinc-50 border border-zinc-200 rounded-lg cursor-pointer focus:outline-none text-zinc-900"
                    >
                      <option value="translation">Translation Lead (ترجمة)</option>
                      <option value="revision">Linguistic QA Revision (مراجعة)</option>
                      <option value="proofreading">Accredited signoff Proofreading (تدقيق)</option>
                    </select>
                  </div>

                  {selectedTaskForAssign.attachments && selectedTaskForAssign.attachments.length > 0 && (
                    <div className="space-y-1.5 p-2.5 rounded-lg border border-zinc-150 bg-zinc-50/50 text-[10px]">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block font-sans">
                        {isRtl ? 'وثائق ومستندات المشروع المرفقة:' : 'Associated Project Documents:'}
                      </span>
                      <div className="space-y-1 max-h-[85px] overflow-y-auto pr-1">
                        {selectedTaskForAssign.attachments.map(att => (
                          <a
                            key={att.id}
                            href={att.url}
                            download={att.name}
                            className="flex items-center gap-1.5 p-1 hover:bg-zinc-100 rounded text-zinc-700 hover:text-zinc-950 transition-colors font-sans truncate cursor-pointer"
                            title={`${att.name} (${(att.size / 1024).toFixed(1)} KB)`}
                          >
                            <Paperclip size={10} className="text-zinc-400 shrink-0" />
                            <span className="truncate max-w-[220px] font-medium block">{att.name}</span>
                            <span className="text-[8px] text-zinc-400 font-mono ml-auto">({(att.size / 1024).toFixed(0)} KB)</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 pb-2.5 border-b border-dashed border-zinc-200">
                    <div>
                      <label className="text-[10px] font-semibold text-zinc-400 uppercase">Unit word Rate (EGP)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={rateWords || ''} 
                        onChange={e => setRateWords(parseFloat(e.target.value) || 0)}
                        className="w-full mt-1.5 p-2 bg-zinc-50 border border-zinc-200 rounded-lg font-mono text-center font-semibold text-zinc-900" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-zinc-400 uppercase">Fixed fee rate (EGP)</label>
                      <input 
                        type="number" 
                        value={rateFixed || ''} 
                        onChange={e => setRateFixed(parseInt(e.target.value) || 0)}
                        className="w-full mt-1.5 p-2 bg-zinc-50 border border-zinc-200 rounded-lg font-mono text-center font-semibold text-zinc-900" 
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTaskForAssign(null)}
                      className="px-3 py-1.5 text-xs font-semibold text-zinc-500 bg-zinc-50 hover:bg-zinc-100 rounded-lg border border-zinc-200/60 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-zinc-950 hover:bg-zinc-800 rounded-lg cursor-pointer"
                    >
                      Finalize allocation
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* VERIFY AND APPROVE MODAL DIALOG */}
      {selectedAsgForVerify && (
        <div className="fixed inset-0 bg-zinc-950/60 flex items-center justify-center z-50 p-4 animate-fade-in text-zinc-700 font-sans backdrop-blur-xs">
          <div className="bg-white p-6 rounded-xl w-full max-w-sm border border-zinc-200 shadow-none">
            <h4 className="font-semibold text-zinc-900 text-sm border-b border-zinc-100 pb-2.5 flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-emerald-500" />
              Verify & Approve Calculations
            </h4>
            
            <p className="text-[10px] text-zinc-400 leading-normal mt-2.5 font-sans">
              Verify the target wordcount completed by the translator and approve their calculated fees. All figures apply to translator costs only.
            </p>

            <div className="mt-4 p-3 bg-zinc-50 border border-zinc-200/60 rounded-lg text-[11px] space-y-1 text-zinc-500 font-sans">
              <div className="flex justify-between">
                <span>Task Reference:</span>
                <strong className="text-zinc-800 font-semibold">{selectedAsgForVerify.taskRef}</strong>
              </div>
              <div className="flex justify-between">
                <span>Subject Doc:</span>
                <strong className="text-zinc-800 font-semibold truncate max-w-[180px]" title={selectedAsgForVerify.taskFileName}>
                  {selectedAsgForVerify.taskFileName}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Assigned Wordcount:</span>
                <strong className="text-zinc-800 font-semibold font-mono">{selectedAsgForVerify.wordCountAssigned?.toLocaleString()} words</strong>
              </div>
              
              {selectedAsgForVerify.translatedAttachments && selectedAsgForVerify.translatedAttachments.length > 0 && (
                <div className="mt-2.5 pt-2.5 border-t border-zinc-200 text-[11px]">
                  <span className="text-zinc-500 font-bold uppercase text-[9px] tracking-wide block mb-1">
                    📥 {isRtl ? 'ملفات الترجمة النهائية المستلمة:' : 'Final Submitted Translation Files:'}
                  </span>
                  <div className="flex flex-col gap-1 w-full text-left">
                    {selectedAsgForVerify.translatedAttachments.map((att: any) => (
                      <a
                        key={att.id}
                        href={att.url}
                        download={att.name}
                        title={`${att.name} (${(att.size / 1024).toFixed(1)} KB)`}
                        className="flex items-center justify-between p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded text-[10px] font-mono transition-all font-bold cursor-pointer"
                        onClick={() => {
                          alert(isRtl ? `بدء تنزيل مستند الترجمة: ${att.name}` : `Downloading translation file: ${att.name}`);
                        }}
                      >
                        <div className="flex items-center gap-1.5 truncate max-w-[210px]">
                          <FileText size={10} className="text-emerald-600 shrink-0" />
                          <span className="truncate">{att.name}</span>
                        </div>
                        <span className="text-[8px] text-zinc-400 font-normal shrink-0">({(att.size / 1024).toFixed(0)} KB)</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleConfirmVerifyApproval} className="mt-4 space-y-4 text-xs font-sans">
              <div>
                <label className="text-[10px] font-semibold text-zinc-400 uppercase block">Actual Target Word Count Finished</label>
                <input 
                  type="number"
                  value={verifiedWords || ''}
                  onChange={e => setVerifiedWords(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full mt-1.5 p-2 bg-zinc-50 border border-zinc-200 rounded-lg font-mono font-bold text-zinc-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pb-2.5 border-b border-dashed border-zinc-200 font-sans">
                <div>
                  <label className="text-[10px] font-semibold text-zinc-400 uppercase">Unit word Rate (EGP)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={verifiedRateWords} 
                    onChange={e => {
                      setVerifiedRateWords(parseFloat(e.target.value) || 0);
                      setVerifiedRateFixed(0);
                    }}
                    className="w-full mt-1.5 p-2 bg-zinc-50 border border-zinc-200 rounded-lg font-mono text-center font-bold text-zinc-900" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-zinc-400 uppercase">Fixed fee rate (EGP)</label>
                  <input 
                    type="number" 
                    value={verifiedRateFixed} 
                    onChange={e => {
                      setVerifiedRateFixed(parseInt(e.target.value) || 0);
                      setVerifiedRateWords(0);
                    }}
                    className="w-full mt-1.5 p-2 bg-zinc-50 border border-zinc-200 rounded-lg font-mono text-center font-bold text-zinc-900" 
                  />
                </div>
              </div>

              {/* Verified calculation readout */}
              <div className="p-3 bg-zinc-50 border border-dashed border-zinc-200 rounded-lg flex justify-between items-center font-sans">
                <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wide">Approved Fee Calculation:</span>
                <span className="font-mono text-sm font-black text-emerald-600">
                  EGP {(verifiedRateFixed > 0 ? verifiedRateFixed : verifiedWords * verifiedRateWords).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </span>
              </div>

              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedAsgForVerify(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-zinc-500 bg-zinc-50 hover:bg-zinc-100 rounded-lg border border-zinc-200/60 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
                >
                  Verify & Approve Cost
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksPage;
