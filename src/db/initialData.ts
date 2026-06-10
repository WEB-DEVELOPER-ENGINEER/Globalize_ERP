/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Profile, Client, Task, Payment, ClientReceivableRecord, StaffLiability } from '../types';

export const SEED_PROFILES: Profile[] = [
  {
    id: 'p-ahmed-ghaffar',
    fullName: 'Ahmed Abdel Ghaffar Mohamed',
    fullNameAr: 'أحمد عبد الغفار محمد',
    role: 'owner',
    isActive: true,
    phone: '00201555592535',
    email: 'ahmed.mhd@globalizetl.com',
    password: 'password123',
    createdAt: '2023-01-01T00:00:00Z',
  },
  {
    id: 'p-sara-khafaga',
    fullName: 'Sara Khafaga',
    fullNameAr: 'سارة خفاجة',
    role: 'admin',
    isActive: true,
    phone: '+201006835081',
    email: 'sara.khfaga@globalizetl.com',
    employeeType: 'staff',
    password: 'password123',
    createdAt: '2023-01-01T00:00:00Z',
  },
  {
    id: 'p-esraa',
    fullName: 'Esraa',
    fullNameAr: 'إسراء',
    role: 'admin',
    isActive: true,
    phone: '+201122374380',
    employeeType: 'staff',
    password: 'password123',
    createdAt: '2023-01-01T00:00:00Z',
  }
];

export const SERVICE_TYPES = [
  { value: 'translation', labelEn: 'Translation', labelAr: 'ترجمة' },
  { value: 'proofreading', labelEn: 'Proofreading', labelAr: 'تدقيق لغوي' },
  { value: 'certified_translation', labelEn: 'Certified Translation', labelAr: 'ترجمة معتمدة' },
  { value: 'revision', labelEn: 'Revision', labelAr: 'مراجعة وتدقيق' },
  { value: 'review_and_approval', labelEn: 'Review & Approval', labelAr: 'اعتماد ومراجعة' },
  { value: 'interpretation', labelEn: 'Interpretation', labelAr: 'ترجمة فورية' },
  { value: 'transcription', labelEn: 'Transcription', labelAr: 'تفريغ صوتي' },
  { value: 'localization', labelEn: 'Localization', labelAr: 'تعريب وتوطين' },
  { value: 'other', labelEn: 'Other', labelAr: 'أخرى' }
];

export const LANGUAGE_PAIRS = [
  'Arabic ↔ English',
  'Arabic ↔ French',
  'Arabic ↔ German',
  'Arabic ↔ Italian',
  'Arabic ↔ Spanish',
  'Arabic ↔ Russian',
  'Arabic ↔ Turkish',
  'Arabic ↔ Chinese',
  'Arabic ↔ Persian',
  'Arabic ↔ Urdu',
  'English ↔ French',
  'English ↔ German',
];

export const SEED_CLIENTS: Client[] = [];

export const SEED_TASKS: Task[] = [];

export const SEED_PAYMENTS: Payment[] = [];

export const SEED_RECEIVABLES: ClientReceivableRecord[] = [];

export const SEED_LIABILITIES: StaffLiability[] = [];
