/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Profile, Client, Task, TaskAssignment, Quotation, Payment, 
  TranslatorMonthlySummary, ClientReceivableRecord, StaffLiability, 
  MonthlyClosing, SalaryAttendance, Notification, UserRole, PaymentMethod, TaskAttachment,
  LetterheadTemplate, StampAsset, LayoutPreset, PdfExportLog
} from '../types';
import { 
  SEED_PROFILES, SEED_CLIENTS, SEED_TASKS, SEED_PAYMENTS, 
  SEED_RECEIVABLES, SEED_LIABILITIES 
} from './initialData';

// Constants for Local Storage Keys
const KEYS = {
  PROFILES: 'gtms_profiles',
  CLIENTS: 'gtms_clients',
  TASKS: 'gtms_tasks',
  ASSIGNMENTS: 'gtms_assignments',
  QUOTATIONS: 'gtms_quotations',
  PAYMENTS: 'gtms_payments',
  RECEIVABLES: 'gtms_receivables',
  LIABILITIES: 'gtms_liabilities',
  CLOSINGS: 'gtms_closings',
  ATTENDANCE: 'gtms_attendance',
  NOTIFICATIONS: 'gtms_notifications',
  LETTERHEADS: 'gtms_letterheads',
  STAMPS: 'gtms_stamps',
  PRESETS: 'gtms_presets',
  PDF_LOGS: 'gtms_pdf_logs',
  CURRENT_ROLE: 'gtms_current_role'
};

// Seed helper
function loadOrSeed<T>(key: string, seed: T): T {
  const data = localStorage.getItem(key);
  if (data) {
    try {
      return JSON.parse(data) as T;
    } catch {
      // recovery
    }
  }
  localStorage.setItem(key, JSON.stringify(seed));
  return seed;
}

export class GTMSDatabase {
  profiles: Profile[] = [];
  clients: Client[] = [];
  tasks: Task[] = [];
  assignments: TaskAssignment[] = [];
  quotations: Quotation[] = [];
  payments: Payment[] = [];
  receivables: ClientReceivableRecord[] = [];
  liabilities: StaffLiability[] = [];
  closings: MonthlyClosing[] = [];
  attendance: SalaryAttendance[] = [];
  notifications: Notification[] = [];
  letterheads: LetterheadTemplate[] = [];
  stamps: StampAsset[] = [];
  presets: LayoutPreset[] = [];
  pdfLogs: PdfExportLog[] = [];
  currentRole: UserRole = 'owner';
  activeProfile: Profile;

  private listeners: (() => void)[] = [];

  constructor() {
    const rawProfiles = loadOrSeed(KEYS.PROFILES, SEED_PROFILES);
    this.profiles = rawProfiles.map(p => ({
      ...p,
      password: p.password || 'password123'
    }));
    this.clients = loadOrSeed(KEYS.CLIENTS, SEED_CLIENTS);
    this.tasks = loadOrSeed(KEYS.TASKS, SEED_TASKS);
    this.payments = loadOrSeed(KEYS.PAYMENTS, SEED_PAYMENTS);
    this.receivables = loadOrSeed(KEYS.RECEIVABLES, SEED_RECEIVABLES);
    this.liabilities = loadOrSeed(KEYS.LIABILITIES, SEED_LIABILITIES);
    
    // Seed empty collections if they don't exist
    this.assignments = loadOrSeed(KEYS.ASSIGNMENTS, this.getInitialAssignments());
    this.quotations = loadOrSeed(KEYS.QUOTATIONS, []);
    this.closings = loadOrSeed(KEYS.CLOSINGS, this.getInitialClosings());
    this.attendance = loadOrSeed(KEYS.ATTENDANCE, this.getInitialAttendance());
    this.notifications = loadOrSeed(KEYS.NOTIFICATIONS, this.getInitialNotifications());

    this.letterheads = loadOrSeed(KEYS.LETTERHEADS, []);
    this.stamps = loadOrSeed(KEYS.STAMPS, []);
    this.presets = loadOrSeed(KEYS.PRESETS, this.getInitialPresets());
    this.pdfLogs = loadOrSeed(KEYS.PDF_LOGS, []);

    // Add demo assets if empty
    if (this.letterheads.length === 0) {
      this.letterheads.push({
        id: 'lh-demo-en',
        name: 'Globalize English Letterhead',
        imageUrl: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&q=80&w=1000',
        isDefault: true,
        placement: 'background',
        margins: { top: 20, bottom: 20, left: 20, right: 20 },
        opacity: 1,
        createdAt: new Date().toISOString()
      });
    }
    if (this.stamps.length === 0) {
      this.stamps.push({
        id: 'st-demo-cert',
        name: 'Official Certified Stamp',
        type: 'certified_stamp_signature',
        imageUrl: 'https://img.freepik.com/premium-vector/certified-stamp-vector-illustration-isolated-white-background_1080470-3626.jpg',
        defaultSize: 150,
        defaultOpacity: 1,
        defaultRotation: -2,
        createdAt: new Date().toISOString()
      });
    }

    this.currentRole = (localStorage.getItem(KEYS.CURRENT_ROLE) as UserRole) || 'owner';
    
    // Set active profile based on selection
    this.activeProfile = this.profiles.find(p => p.role === this.currentRole) || this.profiles[0];
  }

  // Initial seed structures
  private getInitialAssignments(): TaskAssignment[] {
    return [];
  }

  private getInitialClosings(): MonthlyClosing[] {
    return [];
  }

  private getInitialAttendance(): SalaryAttendance[] {
    return [];
  }

  private getInitialNotifications(): Notification[] {
    return [];
  }

  private getInitialPresets(): LayoutPreset[] {
    return [
      {
        id: 'p-cert-en',
        name: 'Certified Translation – English',
        pageSize: 'A4',
        margins: { top: 20, bottom: 20, left: 20, right: 20 },
        stampPosition: { x: 150, y: 250, page: 'every' },
        includeOriginal: true,
        originalPosition: 'after',
        fontFamily: 'Inter',
        fontSize: 11,
        lineSpacing: 1.5,
        showPageNumbers: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'p-cert-ar',
        name: 'Certified Translation – Arabic',
        nameAr: 'ترجمة معتمدة - عربي',
        pageSize: 'A4',
        margins: { top: 20, bottom: 20, left: 20, right: 20 },
        stampPosition: { x: 50, y: 250, page: 'every' },
        includeOriginal: true,
        originalPosition: 'after',
        fontFamily: 'Inter',
        fontSize: 12,
        lineSpacing: 1.5,
        showPageNumbers: true,
        createdAt: new Date().toISOString()
      }
    ];
  }

  // Save changes back to Local Storage
  save() {
    localStorage.setItem(KEYS.PROFILES, JSON.stringify(this.profiles));
    localStorage.setItem(KEYS.CLIENTS, JSON.stringify(this.clients));
    localStorage.setItem(KEYS.TASKS, JSON.stringify(this.tasks));
    localStorage.setItem(KEYS.ASSIGNMENTS, JSON.stringify(this.assignments));
    localStorage.setItem(KEYS.QUOTATIONS, JSON.stringify(this.quotations));
    localStorage.setItem(KEYS.PAYMENTS, JSON.stringify(this.payments));
    localStorage.setItem(KEYS.RECEIVABLES, JSON.stringify(this.receivables));
    localStorage.setItem(KEYS.LIABILITIES, JSON.stringify(this.liabilities));
    localStorage.setItem(KEYS.CLOSINGS, JSON.stringify(this.closings));
    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(this.attendance));
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(this.notifications));
    localStorage.setItem(KEYS.LETTERHEADS, JSON.stringify(this.letterheads));
    localStorage.setItem(KEYS.STAMPS, JSON.stringify(this.stamps));
    localStorage.setItem(KEYS.PRESETS, JSON.stringify(this.presets));
    localStorage.setItem(KEYS.PDF_LOGS, JSON.stringify(this.pdfLogs));
    localStorage.setItem(KEYS.CURRENT_ROLE, this.currentRole);
    
    // Trigger React listeners
    this.listeners.forEach(listen => listen());
  }

  resetToSeeds() {
    this.profiles = JSON.parse(JSON.stringify(SEED_PROFILES));
    this.clients = JSON.parse(JSON.stringify(SEED_CLIENTS));
    this.tasks = JSON.parse(JSON.stringify(SEED_TASKS));
    this.payments = JSON.parse(JSON.stringify(SEED_PAYMENTS));
    this.receivables = JSON.parse(JSON.stringify(SEED_RECEIVABLES));
    this.liabilities = JSON.parse(JSON.stringify(SEED_LIABILITIES));
    this.assignments = [];
    this.quotations = [];
    this.closings = [];
    this.attendance = [];
    this.notifications = [];
    this.save();
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Role management
  setRole(role: UserRole) {
    this.currentRole = role;
    this.activeProfile = this.profiles.find(p => p.role === role) || this.profiles[0];
    this.save();
    
    // Add audit notification about changing views
    this.addNotification({
      title: `Switched View to ${role.toUpperCase()}`,
      titleAr: `تم الانتقال لعرض حساب: ${role}`,
      message: `Navigated UI into simulated role dashboard: ${this.activeProfile.fullName}.`,
      messageAr: `تصفح النظام الآن بصلاحيات: ${this.activeProfile.fullNameAr}`,
      userId: this.activeProfile.id,
      type: 'info'
    });
  }

  // --- CRUD OPERATORS ---

  // Ref generation replicates exact DB trigger!
  generateRefNo(dateStr: string): string {
    const selectedDate = new Date(dateStr);
    const YY = selectedDate.getFullYear().toString().slice(-2);
    const MM = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const DD = String(selectedDate.getDate()).padStart(2, '0');
    const datePrefix = `${YY}.${MM}.${DD}`;
    
    const count = this.tasks.filter(t => t.intakeDate === dateStr).length;
    return `${datePrefix}.${count + 1}`;
  }

  addTask(taskInput: Omit<Task, 'id' | 'referenceNo' | 'createdAt' | 'updatedAt' | 'createdBy' | 'paymentStatus' | 'paidAmountEgp' | 'paidAmountAed' | 'paidAmountUsd' | 'translationCost' | 'revisionCost' | 'overtimeCost' | 'totalCost' | 'netRevenue'> & { initialPaidAmountEgp?: number; initialPaymentMethod?: PaymentMethod }): Task {
    const id = `t-${Date.now()}`;
    const referenceNo = this.generateRefNo(taskInput.intakeDate);
    const client = this.clients.find(c => c.id === taskInput.clientId);
    
    const initialPaid = taskInput.initialPaidAmountEgp || 0;
    const initialMethod = taskInput.initialPaymentMethod || 'cash';
    const payStatus = initialPaid <= 0 ? 'unpaid' : (initialPaid >= taskInput.amountEgp ? 'paid' : 'partial');

    // Remove the custom fields from taskInput so they don't leak into the Task type spread
    const { initialPaidAmountEgp, initialPaymentMethod, ...taskData } = taskInput;

    const newTask: Task = {
      ...taskData,
      id,
      referenceNo,
      clientNameCache: client ? client.name : (taskData.clientPhone || 'Walk-in Client'),
      paymentStatus: payStatus,
      paymentMethod: initialPaid > 0 ? initialMethod : undefined,
      paidAmountEgp: initialPaid,
      paidAmountAed: 0,
      paidAmountUsd: 0,
      translationCost: 0,
      revisionCost: 0,
      overtimeCost: 0,
      totalCost: 0,
      netRevenue: taskData.amountEgp, // Initially net revenue equals total price (minus costs later)
      createdBy: this.activeProfile.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.tasks.unshift(newTask);

    // If there is outstanding receivables, register them in clients record too
    if (client && (taskData.amountEgp > 0 || taskData.amountAed > 0 || taskData.amountUsd > 0)) {
      client.totalReceivablesEgp += Math.max(0, taskData.amountEgp - initialPaid);
      client.totalReceivablesAed += taskData.amountAed;
      client.totalReceivablesUsd += taskData.amountUsd;
      
      const period = taskData.intakeDate.slice(0, 7); // format YYYY-MM
      this.ensureClientReceivableRecord(
        client.id, 
        client.name, 
        period, 
        Math.max(0, taskData.amountEgp - initialPaid), 
        taskData.amountAed, 
        taskData.amountUsd
      );
    }

    // Add cash payment record if initial paid amount is positive
    if (initialPaid > 0) {
      this.payments.unshift({
        id: `pay-${Date.now()}-initial`,
        taskId: id,
        clientId: taskData.clientId,
        referenceNo,
        clientName: newTask.clientNameCache,
        fileName: newTask.fileName,
        paymentDate: taskData.intakeDate,
        paymentType: 'income',
        amountEgp: initialPaid,
        amountAed: 0,
        amountUsd: 0,
        paymentMethod: initialMethod,
        createdBy: this.activeProfile.id,
        createdAt: new Date().toISOString()
      });
    }

    this.save();

    this.addNotification({
      title: 'New Task Registered',
      titleAr: 'تم تسجيل ملف جديد',
      message: `Task ref ${referenceNo} registered successfully for "${newTask.clientNameCache}".`,
      messageAr: `تم تسجيل الملف ذو المرجع رقم ${referenceNo} بنجاح لصالح "${client?.nameAr || newTask.clientNameCache}".`,
      userId: 'p-ahmed-ghaffar',
      type: 'success'
    });

    return newTask;
  }

  ensureClientReceivableRecord(clientId: string, clientName: string, period: string, egp: number, aed: number, usd: number) {
    if (egp > 0) {
      let rec = this.receivables.find(r => r.clientId === clientId && r.period === period && r.currency === 'EGP');
      if (rec) {
        rec.amount += egp;
        rec.remaining = rec.amount - rec.paidAmount;
      } else {
        this.receivables.push({
          id: `rec-${Date.now()}-egp`,
          clientId,
          clientName,
          period,
          currency: 'EGP',
          amount: egp,
          paidAmount: 0,
          remaining: egp
        });
      }
    }
    if (aed > 0) {
      let rec = this.receivables.find(r => r.clientId === clientId && r.period === period && r.currency === 'AED');
      if (rec) {
        rec.amount += aed;
        rec.remaining = rec.amount - rec.paidAmount;
      } else {
        this.receivables.push({
          id: `rec-${Date.now()}-aed`,
          clientId,
          clientName,
          period,
          currency: 'AED',
          amount: aed,
          paidAmount: 0,
          remaining: aed
        });
      }
    }
    if (usd > 0) {
      let rec = this.receivables.find(r => r.clientId === clientId && r.period === period && r.currency === 'USD');
      if (rec) {
        rec.amount += usd;
        rec.remaining = rec.amount - rec.paidAmount;
      } else {
        this.receivables.push({
          id: `rec-${Date.now()}-usd`,
          clientId,
          clientName,
          period,
          currency: 'USD',
          amount: usd,
          paidAmount: 0,
          remaining: usd
        });
      }
    }
  }

  updateTask(updatedTask: Task) {
    this.tasks = this.tasks.map(t => {
      if (t.id === updatedTask.id) {
        return {
          ...updatedTask,
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    });
    this.save();
  }

  assignTranslator(asgInput: Omit<TaskAssignment, 'id' | 'assignedBy' | 'assignedAt' | 'calculatedAmount'>): TaskAssignment {
    const id = `asg-${Date.now()}`;
    const translator = this.profiles.find(p => p.id === asgInput.translatorId)!;
    
    // Calculate amount based on rate type
    let calculatedAmount = 0;
    if (asgInput.ratePerWord) {
      calculatedAmount = asgInput.wordCountAssigned * asgInput.ratePerWord;
    } else if (asgInput.rateDaily) {
      calculatedAmount = asgInput.rateDaily;
    } else if (asgInput.rateFixed) {
      calculatedAmount = asgInput.rateFixed;
    }

    if (asgInput.overtimeHours && asgInput.overtimeRate) {
      calculatedAmount += asgInput.overtimeHours * asgInput.overtimeRate;
    }

    const newAsg: TaskAssignment = {
      ...asgInput,
      id,
      calculatedAmount,
      assignedBy: this.activeProfile.id,
      assignedAt: new Date().toISOString()
    };

    this.assignments.push(newAsg);

    // Update the task costs
    const task = this.tasks.find(t => t.id === asgInput.taskId);
    if (task) {
      if (asgInput.assignmentType === 'translation') {
        task.translationCost += calculatedAmount;
      } else if (asgInput.assignmentType === 'revision') {
        task.revisionCost += calculatedAmount;
      } else {
        task.overtimeCost += calculatedAmount;
      }
      task.totalCost = task.translationCost + task.revisionCost + task.overtimeCost;
      task.netRevenue = task.amountEgp - task.totalCost; // Simplified fallback logic
      task.status = 'assigned';
      this.updateTask(task);
    }

    this.save();

    this.addNotification({
      title: 'Task Assigned',
      titleAr: 'تم تعيين مهمة ترجمة',
      message: `Assigned folder "${newAsg.taskFileName || 'File'}" to translator "${translator.fullName}".`,
      messageAr: `تم تعيين الملف "${newAsg.taskFileName || 'الملف'}" للمترجم "${translator.fullNameAr}".`,
      userId: asgInput.translatorId,
      type: 'info'
    });

    return newAsg;
  }

  submitAssignment(assignmentId: string, wordCountActual?: number, translatedAttachments?: TaskAttachment[]) {
    const asg = this.assignments.find(a => a.id === assignmentId);
    if (asg) {
      asg.status = 'submitted';
      asg.submittedAt = new Date().toISOString();
      if (translatedAttachments) {
        asg.translatedAttachments = translatedAttachments;
      }
      if (wordCountActual) {
        asg.wordCountActual = wordCountActual;
        if (asg.ratePerWord) {
          asg.calculatedAmount = wordCountActual * asg.ratePerWord;
        }
      }
      
      // Update task status to Review
      const task = this.tasks.find(t => t.id === asg.taskId);
      if (task) {
        task.status = 'review';
        // Also copy translated documents to task.attachments so staff can easily download them
        if (translatedAttachments && translatedAttachments.length > 0) {
          if (!task.attachments) {
            task.attachments = [];
          }
          translatedAttachments.forEach(att => {
            const alreadyExists = task.attachments?.some(existing => existing.id === att.id || existing.name === att.name);
            if (!alreadyExists) {
              task.attachments?.push({
                ...att,
                name: `[TR] ${att.name}` // clearly mark as translated file
              });
            }
          });
        }
        this.updateTask(task);
      }

      this.save();

      this.addNotification({
        title: 'Task File Submitted',
        titleAr: 'تم تسليم ملف مترجم',
        message: `Translator submitted translation for file: ${asg.taskFileName}. Ready for revision!`,
        messageAr: `قام المترجم بتسليم الملف المترجم: ${asg.taskFileName || 'ملف'}. جاهز للمراجعة!`,
        userId: 'p-nada',
        type: 'warning'
      });
    }
  }

  approveAssignment(assignmentId: string, verifiedWordCount?: number, verifiedRatePerWord?: number, verifiedRateFixed?: number, verifiedCalculatedAmount?: number) {
    const asg = this.assignments.find(a => a.id === assignmentId);
    if (asg) {
      asg.status = 'approved';
      if (verifiedWordCount !== undefined) {
        asg.wordCountActual = verifiedWordCount;
      }
      if (verifiedRatePerWord !== undefined) {
        asg.ratePerWord = verifiedRatePerWord;
      }
      if (verifiedRateFixed !== undefined) {
        asg.rateFixed = verifiedRateFixed;
      }
      if (verifiedCalculatedAmount !== undefined) {
        asg.calculatedAmount = verifiedCalculatedAmount;
      } else {
        if (asg.ratePerWord !== undefined) {
          asg.calculatedAmount = (asg.wordCountActual ?? asg.wordCountAssigned) * asg.ratePerWord;
        } else if (asg.rateFixed !== undefined) {
          asg.calculatedAmount = asg.rateFixed;
        }
      }
      
      const task = this.tasks.find(t => t.id === asg.taskId);
      if (task) {
        const relevantAsgs = this.assignments.filter(a => a.taskId === task.id);
        const transAsgs = relevantAsgs.filter(a => a.assignmentType === 'translation');
        const revAndPfAsgs = relevantAsgs.filter(a => a.assignmentType === 'revision' || a.assignmentType === 'proofreading');

        task.translationCost = transAsgs.reduce((sum, item) => sum + item.calculatedAmount, 0);
        task.revisionCost = revAndPfAsgs.reduce((sum, item) => sum + item.calculatedAmount, 0);
        task.totalCost = task.translationCost + task.revisionCost + task.overtimeCost;
        task.netRevenue = task.amountEgp - task.totalCost;

        const allApproved = relevantAsgs.every(a => a.status === 'approved');
        if (allApproved) {
          task.status = 'completed';
        }
        this.updateTask(task);
      }
      this.save();
    }
  }

  declineAssignment(assignmentId: string, declineNotes?: string) {
    const asg = this.assignments.find(a => a.id === assignmentId);
    if (asg) {
      const taskId = asg.taskId;
      
      // Remove the declined assignment
      this.assignments = this.assignments.filter(a => a.id !== assignmentId);
      
      // Update task costs and status
      const task = this.tasks.find(t => t.id === taskId);
      if (task) {
        const remainingAsgs = this.assignments.filter(a => a.taskId === task.id);
        const transAsgs = remainingAsgs.filter(a => a.assignmentType === 'translation');
        const revAndPfAsgs = remainingAsgs.filter(a => a.assignmentType === 'revision' || a.assignmentType === 'proofreading');

        task.translationCost = transAsgs.reduce((sum, item) => sum + item.calculatedAmount, 0);
        task.revisionCost = revAndPfAsgs.reduce((sum, item) => sum + item.calculatedAmount, 0);
        task.totalCost = task.translationCost + task.revisionCost + task.overtimeCost;
        task.netRevenue = task.amountEgp - task.totalCost;
        
        if (remainingAsgs.length === 0) {
          task.status = 'pending';
        } else {
          task.status = 'assigned';
        }
        this.updateTask(task);
      }
      
      this.save();
      
      this.addNotification({
        title: 'Task Assignment Declined',
        titleAr: 'تم رفض مهمة ترجمة',
        message: `Linguist declined assignment for "${asg.taskFileName || 'File'}". Reason: ${declineNotes || 'Not specified'}.`,
        messageAr: `اعتذر المترجم عن المهمة للملف "${asg.taskFileName || 'الملف'}". السبب: ${declineNotes || 'غير محدد'}.`,
        userId: 'p-nada', // Send notification to Nada (Manager)
        type: 'warning'
      });
    }
  }

  addClient(name: string, nameAr: string, phone: string, email: string, clientType: 'individual' | 'company' | 'agency', notes?: string): Client {
    const id = `c-${Date.now()}`;
    const newClient: Client = {
      id,
      name,
      nameAr,
      phone,
      email,
      clientType,
      notes,
      totalReceivablesEgp: 0,
      totalReceivablesAed: 0,
      totalReceivablesUsd: 0,
      createdAt: new Date().toISOString(),
      createdBy: this.activeProfile.id
    };
    this.clients.unshift(newClient);
    this.save();
    return newClient;
  }

  addPayment(paymentInput: Omit<Payment, 'id' | 'createdAt' | 'createdBy'>): Payment {
    const id = `pay-${Date.now()}`;
    const newPayment: Payment = {
      ...paymentInput,
      id,
      createdBy: this.activeProfile.id,
      createdAt: new Date().toISOString()
    };

    this.payments.unshift(newPayment);

    // If it links to a Task, decrement receivables and modify Task payment details!
    if (paymentInput.taskId) {
      const task = this.tasks.find(t => t.id === paymentInput.taskId);
      if (task) {
        task.paidAmountEgp += paymentInput.amountEgp;
        task.paidAmountAed += paymentInput.amountAed;
        task.paidAmountUsd += paymentInput.amountUsd;

        const totalDueEgp = task.amountEgp;
        const totalDueAed = task.amountAed;
        const totalDueUsd = task.amountUsd;

        const hasStillRemaining = 
          (totalDueEgp - task.paidAmountEgp > 0.01) || 
          (totalDueAed - task.paidAmountAed > 0.01) ||
          (totalDueUsd - task.paidAmountUsd > 0.01);

        const hasPaidSomething = 
          task.paidAmountEgp > 0 || task.paidAmountAed > 0 || task.paidAmountUsd > 0;

        if (!hasStillRemaining) {
          task.paymentStatus = 'paid';
        } else if (hasPaidSomething) {
          task.paymentStatus = 'partial';
        } else {
          task.paymentStatus = 'unpaid';
        }

        task.paymentMethod = paymentInput.paymentMethod;
        this.updateTask(task);

        // Deduct from client receivables totals
        if (task.clientId) {
          const client = this.clients.find(c => c.id === task.clientId);
          if (client) {
            client.totalReceivablesEgp = Math.max(0, client.totalReceivablesEgp - paymentInput.amountEgp);
            client.totalReceivablesAed = Math.max(0, client.totalReceivablesAed - paymentInput.amountAed);
            client.totalReceivablesUsd = Math.max(0, client.totalReceivablesUsd - paymentInput.amountUsd);
          }

          // Deduct from Monthly client receivables sheets too!
          const period = paymentInput.paymentDate.slice(0, 7); // target period YYYY-MM
          this.reconcileMonthlyReceivablePayment(task.clientId, period, paymentInput.amountEgp, paymentInput.amountAed, paymentInput.amountUsd);
        }
      }
    }

    this.save();

    this.addNotification({
      title: paymentInput.paymentType === 'income' ? 'Cash Received Recorded' : 'Expense Registered',
      titleAr: paymentInput.paymentType === 'income' ? 'تم تسجيل متحصلات مالية' : 'تم قيد مصروف خارجي',
      message: `${paymentInput.paymentType === 'income' ? 'Income' : 'Expense'} of EGP ${paymentInput.amountEgp || 0} via ${paymentInput.paymentMethod}.`,
      messageAr: `تم تسجيل ${paymentInput.paymentType === 'income' ? 'إيراد' : 'مصروف'} بمبلغ ${paymentInput.amountEgp || 0} ج.م عبر ${paymentInput.paymentMethod}.`,
      userId: 'p-ahmed-ghaffar',
      type: paymentInput.paymentType === 'income' ? 'success' : 'danger'
    });

    return newPayment;
  }

  private reconcileMonthlyReceivablePayment(clientId: string, period: string, egp: number, aed: number, usd: number) {
    if (egp > 0) {
      const rec = this.receivables.find(r => r.clientId === clientId && r.period === period && r.currency === 'EGP');
      if (rec) {
        rec.paidAmount += egp;
        rec.remaining = Math.max(0, rec.amount - rec.paidAmount);
      }
    }
    if (aed > 0) {
      const rec = this.receivables.find(r => r.clientId === clientId && r.period === period && r.currency === 'AED');
      if (rec) {
        rec.paidAmount += aed;
        rec.remaining = Math.max(0, rec.amount - rec.paidAmount);
      }
    }
    if (usd > 0) {
      const rec = this.receivables.find(r => r.clientId === clientId && r.period === period && r.currency === 'USD');
      if (rec) {
        rec.paidAmount += usd;
        rec.remaining = Math.max(0, rec.amount - rec.paidAmount);
      }
    }
  }

  addLiability(liab: Omit<StaffLiability, 'id' | 'createdAt' | 'paidAmount'>): StaffLiability {
    const id = `liab-${Date.now()}`;
    const newLiab: StaffLiability = {
      ...liab,
      id,
      paidAmount: 0,
      createdAt: new Date().toISOString()
    };
    this.liabilities.push(newLiab);
    this.save();
    return newLiab;
  }

  payLiability(id: string, payAmount: number) {
    const liab = this.liabilities.find(l => l.id === id);
    if (liab) {
      liab.paidAmount += payAmount;
      if (liab.paidAmount >= liab.amount) {
        liab.paidDate = new Date().toISOString().split('T')[0];
      }
      this.save();
    }
  }

  addQuotation(quoteInput: Omit<Quotation, 'id' | 'quoteNumber' | 'createdAt' | 'createdBy'>): Quotation {
    const id = `quote-${Date.now()}`;
    const seq = this.quotations.length + 1;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const quoteNumber = `QT-${dateStr}-${seq}`;

    const client = this.clients.find(c => c.id === quoteInput.clientId);

    const newQuote: Quotation = {
      ...quoteInput,
      id,
      quoteNumber,
      clientName: client ? client.name : (quoteInput.clientName || 'Individual'),
      createdBy: this.activeProfile.id,
      createdAt: new Date().toISOString()
    };
    this.quotations.unshift(newQuote);
    this.save();
    return newQuote;
  }

  saveAttendance(list: Omit<SalaryAttendance, 'id'>[]) {
    // Delete existing attendance for the days and translators represented to overwrite cleanly
    list.forEach(item => {
      this.attendance = this.attendance.filter(
        a => !(a.translatorId === item.translatorId && a.workDate === item.workDate && a.session === item.session)
      );
      this.attendance.push({
        id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        ...item
      });
    });
    this.save();
  }

  // --- MONTHLY CLOSING ---
  calculateClosingMetrics(period: string) {
    // Collect all completed transactions / payments received in that period
    const paymentsInMonth = this.payments.filter(p => p.paymentDate.startsWith(period));
    const incomePayments = paymentsInMonth.filter(p => p.paymentType === 'income');
    const expensePayments = paymentsInMonth.filter(p => p.paymentType === 'expense');

    const totalRevenueEgp = incomePayments.reduce((s, p) => s + p.amountEgp, 0);
    const totalRevenueAed = incomePayments.reduce((s, p) => s + p.amountAed, 0);
    const totalRevenueUsd = incomePayments.reduce((s, p) => s + p.amountUsd, 0);

    const totalExpensesEgp = expensePayments.reduce((s, p) => s + p.amountEgp, 0);
    const totalExpensesAed = expensePayments.reduce((s, p) => s + p.amountAed, 0);

    // Salaried monthly translator staff tracking
    const salaryBreakdown: Record<string, { name: string; words: number; amount: number }> = {};
    const translators = this.profiles.filter(p => p.role === 'translator' || p.role === 'admin');
    
    translators.forEach(t => {
      // count words completed by him in assignments that belong to this month
      const assignedTaskIdsInPeriod = this.tasks
        .filter(task => task.intakeDate.startsWith(period))
        .map(task => task.id);
        
      const taskAssignments = this.assignments.filter(
        asg => asg.translatorId === t.id && assignedTaskIdsInPeriod.includes(asg.taskId)
      );

      const words = taskAssignments.reduce((s, a) => s + (a.wordCountActual || a.wordCountAssigned), 0);
      
      let amount = t.monthlySalary || 0;
      if (t.employeeType === 'freelance') {
        amount = taskAssignments.reduce((s, a) => s + a.calculatedAmount, 0);
      } else {
        // Staff translator overages
        const contractWords = t.contractWords || 0;
        if (contractWords > 0 && words > contractWords) {
          const rateOver = t.perWordRate || 0.15;
          amount += (words - contractWords) * rateOver;
        }
      }

      salaryBreakdown[t.id] = {
        name: t.fullName,
        words,
        amount
      };
    });

    return {
      totalRevenueEgp,
      totalRevenueAed,
      totalRevenueUsd,
      totalExpensesEgp,
      totalExpensesAed,
      salaryBreakdown
    };
  }

  closeMonthPeriod(period: string, rateAed: number, rateUsd: number, notes?: string): MonthlyClosing {
    const existing = this.closings.find(c => c.period === period);
    if (existing && existing.status === 'closed') {
      throw new Error(`Period ${period} is already closed and locked!`);
    }

    const {
      totalRevenueEgp,
      totalRevenueAed,
      totalRevenueUsd,
      totalExpensesEgp,
      totalExpensesAed,
      salaryBreakdown
    } = this.calculateClosingMetrics(period);

    // Sum all translator salaries as expenses
    const translatorSalaryTotals = Object.values(salaryBreakdown).reduce((s, breakdown) => s + breakdown.amount, 0);
    const totalExpensesCombinedEgp = totalExpensesEgp + translatorSalaryTotals;

    // Currency conversions to EGP
    const netRevenueCombinedEgp = totalRevenueEgp + (totalRevenueAed * rateAed) + (totalRevenueUsd * rateUsd);
    const netProfitEgp = netRevenueCombinedEgp - totalExpensesCombinedEgp;

    // Partner division
    const partnerShare = netProfitEgp / 2;

    const newClosing: MonthlyClosing = {
      id: `cls-${Date.now()}`,
      period,
      totalRevenueEgp,
      totalRevenueAed,
      totalRevenueUsd,
      totalExpensesEgp: totalExpensesCombinedEgp, // Includes staff wages
      totalExpensesAed,
      salaryBreakdown,
      rateAedToEgp: rateAed,
      rateUsdToEgp: rateUsd,
      netProfitEgp: totalRevenueEgp - totalExpensesCombinedEgp,
      netProfitAed: totalRevenueAed - totalExpensesAed,
      netProfitUsd: totalRevenueUsd,
      totalProfitEgp: netProfitEgp,
      partner1Share: partnerShare,
      partner2Share: partnerShare,
      
      // Balances
      cashEgp: 45000, // Reconciled snapshots
      cashAed: totalRevenueAed - totalExpensesAed,
      cashUsd: totalRevenueUsd,
      bankSaibEgp: 185000,
      
      totalReceivablesEgp: this.receivables.filter(r => r.currency === 'EGP').reduce((s, r) => s + r.remaining, 0),
      totalReceivablesAed: this.receivables.filter(r => r.currency === 'AED').reduce((s, r) => s + r.remaining, 0),
      status: 'closed',
      closedBy: this.activeProfile.id,
      closedAt: new Date().toISOString(),
      notes,
      createdAt: new Date().toISOString()
    };

    this.closings = this.closings.filter(c => c.period !== period);
    this.closings.push(newClosing);

    // Add partner sharing records to staff liabilities list so they are tracked securely
    this.addLiability({
      profileId: 'p-ahmed-ghaffar',
      profileName: 'Ahmed Abdel Ghaffar',
      liabilityType: 'profit_share',
      description: `Ahmed 50% Partner Net Dividend share for closed period ${period}`,
      period,
      currency: 'EGP',
      amount: partnerShare
    });

    this.addLiability({
      profileId: 'p-abu-elfotouh',
      profileName: 'Abu El-Fotouh',
      liabilityType: 'profit_share',
      description: `Abu El-Fotouh 50% Partner Net Dividend share for closed period ${period}`,
      period,
      currency: 'EGP',
      amount: partnerShare
    });

    // Pay translators' salaries automatically in cash book so expenses appear
    Object.entries(salaryBreakdown).forEach(([tid, details]) => {
      this.addPayment({
        paymentDate: `${period}-28`, // general payroll date
        paymentType: 'expense',
        amountEgp: details.amount,
        amountAed: 0,
        amountUsd: 0,
        paymentMethod: 'cash',
        expenseCategory: 'salary',
        payee: details.name,
        clientName: 'Staff Payroll Ledger',
        fileName: 'Monthly Payroll Close',
        notes: `Simulated automatic salary disbursement for closed month ${period}`
      });
    });

    this.save();

    this.addNotification({
      title: `Monthly Closed Completed`,
      titleAr: `تم إغلاق الشهر المالي`,
      message: `Locked calendar period ${period}. Ahmed and Abu El-Fotouh dividend calculated: EGP ${partnerShare.toFixed(2)} each.`,
      messageAr: `تم إغلاق الشهر ${period}. نصيب الشركاء (أحمد وأبو الفتوح): ${partnerShare.toLocaleString()} ج.م لكل منهما.`,
      userId: 'p-ahmed-ghaffar',
      type: 'success'
    });

    return newClosing;
  }

  addPdfLog(log: Omit<PdfExportLog, 'id' | 'timestamp'>) {
    this.pdfLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...log
    });
    this.save();
  }

  addLetterhead(lh: Omit<LetterheadTemplate, 'id' | 'createdAt'>) {
    const id = `lh-${Date.now()}`;
    const newLh = { ...lh, id, createdAt: new Date().toISOString() };
    if (lh.isDefault) {
      this.letterheads.forEach(l => l.isDefault = false);
    }
    this.letterheads.push(newLh);
    this.save();
    return newLh;
  }

  addStamp(stamp: Omit<StampAsset, 'id' | 'createdAt'>) {
    const id = `st-${Date.now()}`;
    const newStamp = { ...stamp, id, createdAt: new Date().toISOString() };
    this.stamps.push(newStamp);
    this.save();
    return newStamp;
  }

  addPreset(preset: Omit<LayoutPreset, 'id' | 'createdAt'>) {
    const id = `pr-${Date.now()}`;
    const newPreset = { ...preset, id, createdAt: new Date().toISOString() };
    this.presets.push(newPreset);
    this.save();
    return newPreset;
  }

  addNotification(n: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) {
    this.notifications.unshift({
      id: `n-${Date.now()}`,
      isActive: true,
      isRead: false,
      createdAt: new Date().toISOString(),
      ...n
    } as any);
    this.save();
  }

  markAllNotificationsRead() {
    this.notifications = this.notifications.map(n => ({ ...n, isRead: true }));
    this.save();
  }
}

export const dbInstance = new GTMSDatabase();
export default dbInstance;
