/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Supabase-based Database Store
 * This replaces the localStorage implementation with Supabase
 */

import { supabase, toCamelCase, toSnakeCase } from '../lib/supabase';
import { 
  Profile, Client, Task, TaskAssignment, Quotation, Payment, 
  ClientReceivableRecord, StaffLiability, MonthlyClosing, 
  SalaryAttendance, Notification, LetterheadTemplate, 
  StampAsset, LayoutPreset, PdfExportLog, UserRole,
  PaymentMethod, TaskAttachment
} from '../types';

export class SupabaseDatabase {
  currentRole: UserRole = 'owner';
  activeProfile: Profile | null = null;
  
  private listeners: (() => void)[] = [];

  constructor() {
    this.initializeSession();
  }

  async initializeSession() {
    // Load current role from localStorage for now
    const savedRole = localStorage.getItem('gtms_current_role') as UserRole;
    if (savedRole) {
      this.currentRole = savedRole;
    }
    
    // Set active profile
    await this.loadActiveProfile();
  }

  async loadActiveProfile() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', this.currentRole)
      .eq('is_active', true)
      .limit(1)
      .single();
    
    if (data && !error) {
      this.activeProfile = toCamelCase(data) as Profile;
    }
  }

  // Notify all listeners of data changes
  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Role management
  async setRole(role: UserRole) {
    this.currentRole = role;
    localStorage.setItem('gtms_current_role', role);
    await this.loadActiveProfile();
    
    // Add audit notification
    if (this.activeProfile) {
      await this.addNotification({
        title: `Switched View to ${role.toUpperCase()}`,
        titleAr: `تم الانتقال لعرض حساب: ${role}`,
        message: `Navigated UI into simulated role dashboard: ${this.activeProfile.fullName}.`,
        messageAr: `تصفح النظام الآن بصلاحيات: ${this.activeProfile.fullNameAr}`,
        userId: this.activeProfile.id,
        type: 'info'
      });
    }
    
    this.notifyListeners();
  }

  // --- PROFILES ---
  async getProfiles(): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return toCamelCase(data) as Profile[];
  }

  async updateProfile(id: string, updates: Partial<Profile>): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update(toSnakeCase(updates))
      .eq('id', id);
    
    if (error) throw error;
    this.notifyListeners();
  }

  async addProfile(profile: Omit<Profile, 'id' | 'createdAt'>): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .insert([toSnakeCase(profile)])
      .select()
      .single();
    
    if (error) throw error;
    this.notifyListeners();
    return toCamelCase(data) as Profile;
  }

  // --- CLIENTS ---
  async getClients(): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return toCamelCase(data) as Client[];
  }

  async addClient(name: string, nameAr: string, phone: string, email: string, clientType: 'individual' | 'company' | 'agency', notes?: string): Promise<Client> {
    if (!this.activeProfile) throw new Error('No active profile');
    
    const newClient = {
      name,
      nameAr,
      phone,
      email,
      clientType,
      notes,
      totalReceivablesEgp: 0,
      totalReceivablesAed: 0,
      totalReceivablesUsd: 0,
      createdBy: this.activeProfile.id
    };

    const { data, error } = await supabase
      .from('clients')
      .insert([toSnakeCase(newClient)])
      .select()
      .single();
    
    if (error) throw error;
    this.notifyListeners();
    return toCamelCase(data) as Client;
  }

  // --- TASKS ---
  async getTasks(): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('intake_date', { ascending: false });
    
    if (error) throw error;
    return toCamelCase(data) as Task[];
  }

  async addTask(taskInput: Omit<Task, 'id' | 'referenceNo' | 'createdAt' | 'updatedAt' | 'createdBy' | 'paymentStatus' | 'paidAmountEgp' | 'paidAmountAed' | 'paidAmountUsd' | 'translationCost' | 'revisionCost' | 'overtimeCost' | 'totalCost' | 'netRevenue'> & { initialPaidAmountEgp?: number; initialPaymentMethod?: PaymentMethod }): Promise<Task> {
    if (!this.activeProfile) throw new Error('No active profile');
    
    // Generate reference number
    const { data: refData, error: refError } = await supabase
      .rpc('generate_reference_no', { intake_date_val: taskInput.intakeDate });
    
    if (refError) throw refError;
    const referenceNo = refData;

    // Get client info
    let clientNameCache = taskInput.clientPhone || 'Walk-in Client';
    if (taskInput.clientId) {
      const { data: clientData } = await supabase
        .from('clients')
        .select('name')
        .eq('id', taskInput.clientId)
        .single();
      if (clientData) clientNameCache = clientData.name;
    }

    const initialPaid = taskInput.initialPaidAmountEgp || 0;
    const initialMethod = taskInput.initialPaymentMethod || 'cash';
    const payStatus = initialPaid <= 0 ? 'unpaid' : (initialPaid >= taskInput.amountEgp ? 'paid' : 'partial');

    const { initialPaidAmountEgp, initialPaymentMethod, ...taskData } = taskInput;

    const newTask = {
      ...taskData,
      referenceNo,
      clientNameCache,
      paymentStatus: payStatus,
      paymentMethod: initialPaid > 0 ? initialMethod : undefined,
      paidAmountEgp: initialPaid,
      paidAmountAed: 0,
      paidAmountUsd: 0,
      translationCost: 0,
      revisionCost: 0,
      overtimeCost: 0,
      totalCost: 0,
      netRevenue: taskData.amountEgp,
      createdBy: this.activeProfile.id
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert([toSnakeCase(newTask)])
      .select()
      .single();
    
    if (error) throw error;

    // Update client receivables if applicable
    if (taskInput.clientId && (taskData.amountEgp > 0 || taskData.amountAed > 0 || taskData.amountUsd > 0)) {
      const { error: clientError } = await supabase
        .from('clients')
        .update({
          total_receivables_egp: supabase.sql`total_receivables_egp + ${Math.max(0, taskData.amountEgp - initialPaid)}`,
          total_receivables_aed: supabase.sql`total_receivables_aed + ${taskData.amountAed}`,
          total_receivables_usd: supabase.sql`total_receivables_usd + ${taskData.amountUsd}`
        })
        .eq('id', taskInput.clientId);
      
      if (clientError) console.error('Error updating client receivables:', clientError);
    }

    // Add initial payment if any
    if (initialPaid > 0) {
      await this.addPayment({
        taskId: data.id,
        clientId: taskData.clientId,
        referenceNo,
        clientName: clientNameCache,
        fileName: newTask.fileName,
        paymentDate: taskData.intakeDate,
        paymentType: 'income',
        amountEgp: initialPaid,
        amountAed: 0,
        amountUsd: 0,
        paymentMethod: initialMethod
      });
    }

    await this.addNotification({
      title: 'New Task Registered',
      titleAr: 'تم تسجيل ملف جديد',
      message: `Task ref ${referenceNo} registered successfully for "${clientNameCache}".`,
      messageAr: `تم تسجيل الملف ذو المرجع رقم ${referenceNo} بنجاح.`,
      userId: 'p-ahmed-ghaffar',
      type: 'success'
    });

    this.notifyListeners();
    return toCamelCase(data) as Task;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .update(toSnakeCase(updates))
      .eq('id', id);
    
    if (error) throw error;
    this.notifyListeners();
  }

  // --- TASK ASSIGNMENTS ---
  async getAssignments(): Promise<TaskAssignment[]> {
    const { data, error } = await supabase
      .from('task_assignments')
      .select('*')
      .order('assigned_at', { ascending: false });
    
    if (error) throw error;
    return toCamelCase(data) as TaskAssignment[];
  }

  // --- PAYMENTS ---
  async getPayments(): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('payment_date', { ascending: false });
    
    if (error) throw error;
    return toCamelCase(data) as Payment[];
  }

  async addPayment(paymentInput: Omit<Payment, 'id' | 'createdAt' | 'createdBy'>): Promise<Payment> {
    if (!this.activeProfile) throw new Error('No active profile');
    
    const newPayment = {
      ...paymentInput,
      createdBy: this.activeProfile.id
    };

    const { data, error } = await supabase
      .from('payments')
      .insert([toSnakeCase(newPayment)])
      .select()
      .single();
    
    if (error) throw error;

    // Update task payment status if linked to a task
    if (paymentInput.taskId) {
      const { data: taskData } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', paymentInput.taskId)
        .single();
      
      if (taskData) {
        const task = toCamelCase(taskData) as Task;
        const newPaidEgp = task.paidAmountEgp + paymentInput.amountEgp;
        const newPaidAed = task.paidAmountAed + paymentInput.amountAed;
        const newPaidUsd = task.paidAmountUsd + paymentInput.amountUsd;

        const hasRemaining = 
          (task.amountEgp - newPaidEgp > 0.01) || 
          (task.amountAed - newPaidAed > 0.01) ||
          (task.amountUsd - newPaidUsd > 0.01);

        const hasPaid = newPaidEgp > 0 || newPaidAed > 0 || newPaidUsd > 0;

        let paymentStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
        if (!hasRemaining) paymentStatus = 'paid';
        else if (hasPaid) paymentStatus = 'partial';

        await supabase
          .from('tasks')
          .update({
            paid_amount_egp: newPaidEgp,
            paid_amount_aed: newPaidAed,
            paid_amount_usd: newPaidUsd,
            payment_status: paymentStatus,
            payment_method: paymentInput.paymentMethod
          })
          .eq('id', paymentInput.taskId);

        // Update client receivables
        if (task.clientId) {
          await supabase
            .from('clients')
            .update({
              total_receivables_egp: supabase.sql`GREATEST(0, total_receivables_egp - ${paymentInput.amountEgp})`,
              total_receivables_aed: supabase.sql`GREATEST(0, total_receivables_aed - ${paymentInput.amountAed})`,
              total_receivables_usd: supabase.sql`GREATEST(0, total_receivables_usd - ${paymentInput.amountUsd})`
            })
            .eq('id', task.clientId);
        }
      }
    }

    await this.addNotification({
      title: paymentInput.paymentType === 'income' ? 'Cash Received' : 'Expense Recorded',
      titleAr: paymentInput.paymentType === 'income' ? 'تم تسجيل إيراد' : 'تم تسجيل مصروف',
      message: `${paymentInput.paymentType === 'income' ? 'Income' : 'Expense'} of EGP ${paymentInput.amountEgp || 0}.`,
      messageAr: `تم تسجيل ${paymentInput.paymentType === 'income' ? 'إيراد' : 'مصروف'} بمبلغ ${paymentInput.amountEgp || 0} ج.م`,
      userId: 'p-ahmed-ghaffar',
      type: paymentInput.paymentType === 'income' ? 'success' : 'danger'
    });

    this.notifyListeners();
    return toCamelCase(data) as Payment;
  }

  // --- NOTIFICATIONS ---
  async getNotifications(): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (error) throw error;
    return toCamelCase(data) as Notification[];
  }

  async addNotification(notif: Omit<Notification, 'id' | 'isRead' | 'createdAt'>): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .insert([toSnakeCase({ ...notif, isRead: false })]);
    
    if (error) console.error('Error adding notification:', error);
  }

  // --- ATTENDANCE ---
  async getAttendance(): Promise<SalaryAttendance[]> {
    const { data, error } = await supabase
      .from('salary_attendance')
      .select('*')
      .order('work_date', { ascending: false });
    
    if (error) throw error;
    return toCamelCase(data) as SalaryAttendance[];
  }

  // Add more methods as needed for other tables...
}

// Create singleton instance
const supabaseDb = new SupabaseDatabase();
export default supabaseDb;
