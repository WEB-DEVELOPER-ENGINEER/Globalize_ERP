/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'owner' | 'sales' | 'accountant' | 'translator' | 'admin';
export type EmployeeType = 'staff' | 'freelance';
export type ServiceType = 
  | 'translation' 
  | 'proofreading' 
  | 'certified_translation' 
  | 'revision' 
  | 'review_and_approval' 
  | 'interpretation' 
  | 'transcription' 
  | 'localization' 
  | 'other';

export type TaskStatus = 
  | 'pending' 
  | 'quoted' 
  | 'approved' 
  | 'assigned' 
  | 'in_progress' 
  | 'review' 
  | 'completed' 
  | 'delivered' 
  | 'archived';

export type PaymentStatus = 'unpaid' | 'partial' | 'paid';
export type PaymentMethod = 'cash' | 'bank_saib' | 'nbe' | 'instapay' | 'vodafone_cash' | 'credit' | 'paypal' | 'pending';
export type IntakeChannel = 'whatsapp' | 'walk_in' | 'email' | 'phone' | 'other';
export type ExpenseCategory = 'salary' | 'freelancer' | 'rent' | 'utilities' | 'equipment' | 'marketing' | 'tax' | 'other';
export type LiabilityType = 'salary_arrear' | 'profit_share' | 'advance' | 'deduction' | 'other';
export type AttendanceSession = 'morning' | 'evening' | 'full_day';

export interface Profile {
  id: string;
  fullName: string;
  fullNameAr: string;
  role: UserRole;
  employeeType?: EmployeeType;
  languages?: string[];
  specializations?: string[];
  dailyRate?: number;
  perWordRate?: number;
  monthlySalary?: number;
  isActive: boolean;
  avatarUrl?: string;
  phone?: string;
  email?: string; // Change to official email if needed, but keeping it for compatibility
  personalEmail?: string;
  contractWords?: number; // contracted monthly word limit for staff translators
  password?: string;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  nameAr?: string;
  phone?: string;
  email?: string;
  company?: string;
  nationality?: string;
  clientType: 'individual' | 'company' | 'agency';
  notes?: string;
  totalReceivablesEgp: number;
  totalReceivablesAed: number;
  totalReceivablesUsd: number;
  createdAt: string;
  createdBy: string;
}

export interface Task {
  id: string;
  referenceNo: string;
  clientId?: string;
  clientPhone?: string;
  clientNameCache?: string; // Cache for easy offline loading
  fileName: string;
  serviceType: ServiceType;
  sourceLanguage: string;
  targetLanguage: string;
  wordCount: number;
  pageCount: number;
  
  // Pricing
  amountEgp: number;
  amountAed: number;
  amountUsd: number;
  hasTaxInvoice: boolean;
  
  // Payment
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paidAmountEgp: number;
  paidAmountAed: number;
  paidAmountUsd: number;
  
  // Status and Workflow
  status: TaskStatus;
  intakeChannel: IntakeChannel;
  intakeDate: string; // ISO date YYYY-MM-DD
  deadline?: string; // ISO timestamp
  deliveryDate?: string; // ISO timestamp
  
  // Cost Tracking
  translationCost: number;
  revisionCost: number;
  overtimeCost: number;
  totalCost: number;
  netRevenue: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  attachments?: TaskAttachment[];
  
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  size: number; // bytes
  type: string;
  url: string; // simulated download / preview URL
  uploadedAt: string;
}

export interface TaskAssignment {
  id: string;
  taskId: string;
  taskRef?: string;
  taskFileName?: string;
  translatorId: string;
  assignmentType: 'translation' | 'revision' | 'proofreading';
  wordCountAssigned: number;
  wordCountActual?: number;
  ratePerWord?: number;
  rateDaily?: number;
  rateFixed?: number;
  overtimeHours: number;
  overtimeRate?: number;
  calculatedAmount: number;
  deadline?: string;
  submittedAt?: string;
  translatedAttachments?: TaskAttachment[];
  status: 'assigned' | 'in_progress' | 'submitted' | 'approved';
  notes?: string;
  assignedBy: string;
  assignedAt: string;
}

export interface Quotation {
  id: string;
  taskId?: string;
  clientId?: string;
  clientName?: string;
  quoteNumber: string; // QT-YYYYMMDD-SEQ
  fileName: string;
  serviceType: ServiceType;
  sourceLanguage: string;
  targetLanguage: string;
  wordCount: number;
  amountEgp: number;
  amountAed: number;
  amountUsd: number;
  validUntil: string; // YYYY-MM-DD
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  taskId?: string;
  clientId?: string;
  referenceNo?: string; // Links to task reference
  clientName: string;
  fileName: string;
  paymentDate: string; // YYYY-MM-DD
  paymentType: 'income' | 'expense';
  amountEgp: number;
  amountAed: number;
  amountUsd: number;
  paymentMethod: PaymentMethod;
  expenseCategory?: ExpenseCategory;
  payee?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface TranslatorMonthlySummary {
  id: string;
  translatorId: string;
  month: string; // YYYY-MM
  totalWords: number;
  totalTasks: number;
  translationEarnings: number;
  revisionEarnings: number;
  overtimeEarnings: number;
  totalEarnings: number;
  baseSalary: number;
  actualSalary: number;
  salaryPaid: number;
  salaryRemaining: number;
  vacationDays: number;
  workingDays: number;
  dailySessions: number;
  contractWords: number;
  contractRate?: number;
}

export interface ClientReceivableRecord {
  id: string;
  clientId: string;
  clientName: string;
  period: string; // YYYY-MM
  currency: 'EGP' | 'AED' | 'USD';
  amount: number;
  paidAmount: number;
  remaining: number;
  notes?: string;
}

export interface StaffLiability {
  id: string;
  profileId: string;
  profileName: string;
  liabilityType: LiabilityType;
  description: string;
  period?: string; // YYYY-MM
  currency: 'EGP' | 'AED' | 'USD';
  amount: number;
  paidAmount: number;
  paidDate?: string;
  notes?: string;
  createdAt: string;
}

export interface MonthlyClosing {
  id: string;
  period: string; // YYYY-MM (e.g., "2026-05")
  totalRevenueEgp: number;
  totalRevenueAed: number;
  totalRevenueUsd: number;
  totalExpensesEgp: number;
  totalExpensesAed: number;
  salaryBreakdown: Record<string, { name: string; words: number; amount: number }>;
  rateAedToEgp: number;
  rateUsdToEgp: number;
  netProfitEgp: number;
  netProfitAed: number;
  netProfitUsd: number;
  totalProfitEgp: number;
  partner1Share: number; // Ahmed
  partner2Share: number; // Abu El-Fotouh
  cashEgp: number;
  cashAed: number;
  cashUsd: number;
  bankSaibEgp: number;
  totalReceivablesEgp: number;
  totalReceivablesAed: number;
  status: 'draft' | 'closed';
  closedBy?: string;
  closedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface SalaryAttendance {
  id: string;
  translatorId: string;
  workDate: string; // YYYY-MM-DD
  session: AttendanceSession;
  isVacation: boolean;
  vacationType?: 'annual' | 'sick' | 'unpaid';
  notes?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  titleAr?: string;
  message: string;
  messageAr?: string;
  isRead: boolean;
  type: 'info' | 'success' | 'warning' | 'danger';
  createdAt: string;
}

export interface LetterheadTemplate {
  id: string;
  name: string;
  nameAr?: string;
  imageUrl: string; // DataURL or storage path
  isDefault: boolean;
  placement: 'background' | 'header' | 'footer' | 'header_footer';
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  opacity: number;
  createdAt: string;
}

export type StampType = 'certified_stamp_signature' | 'certified_stamp_only' | 'company_stamp' | 'signature_only' | 'custom';

export interface StampAsset {
  id: string;
  name: string;
  type: StampType;
  imageUrl: string;
  defaultSize: number;
  defaultOpacity: number;
  defaultRotation: number;
  createdAt: string;
}

export interface LayoutPreset {
  id: string;
  name: string;
  nameAr?: string;
  pageSize: 'A4';
  margins: { top: number; bottom: number; left: number; right: number };
  letterheadId?: string;
  stampId?: string;
  stampPosition: { x: number; y: number; page: 'first' | 'last' | 'every' | 'translation_only' };
  includeOriginal: boolean;
  originalPosition: 'before' | 'after';
  fontFamily: string;
  fontSize: number;
  lineSpacing: number;
  showPageNumbers: boolean;
  createdAt: string;
}

export interface PdfExportLog {
  id: string;
  userId: string;
  userName: string;
  timestamp: string;
  clientName: string;
  referenceNo: string;
  letterheadName?: string;
  stampName?: string;
  presetName?: string;
  fileName: string;
  status: 'success' | 'failed';
}
