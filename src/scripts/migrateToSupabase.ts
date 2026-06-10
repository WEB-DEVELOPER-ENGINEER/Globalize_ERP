/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Migration Script: localStorage to Supabase
 * Run this once to migrate your existing data
 */

import { supabase, toSnakeCase } from '../lib/supabase';

export async function migrateLocalStorageToSupabase() {
  console.log('📦 Starting migration from localStorage to Supabase...');
  
  const backup = {
    profiles: JSON.parse(localStorage.getItem('gtms_profiles') || '[]'),
    clients: JSON.parse(localStorage.getItem('gtms_clients') || '[]'),
    tasks: JSON.parse(localStorage.getItem('gtms_tasks') || '[]'),
    assignments: JSON.parse(localStorage.getItem('gtms_assignments') || '[]'),
    quotations: JSON.parse(localStorage.getItem('gtms_quotations') || '[]'),
    payments: JSON.parse(localStorage.getItem('gtms_payments') || '[]'),
    receivables: JSON.parse(localStorage.getItem('gtms_receivables') || '[]'),
    liabilities: JSON.parse(localStorage.getItem('gtms_liabilities') || '[]'),
    closings: JSON.parse(localStorage.getItem('gtms_closings') || '[]'),
    attendance: JSON.parse(localStorage.getItem('gtms_attendance') || '[]'),
    notifications: JSON.parse(localStorage.getItem('gtms_notifications') || '[]'),
    letterheads: JSON.parse(localStorage.getItem('gtms_letterheads') || '[]'),
    stamps: JSON.parse(localStorage.getItem('gtms_stamps') || '[]'),
    presets: JSON.parse(localStorage.getItem('gtms_presets') || '[]'),
    pdfLogs: JSON.parse(localStorage.getItem('gtms_pdf_logs') || '[]')
  };

  const results = {
    success: [] as string[],
    errors: [] as string[],
    skipped: [] as string[]
  };

  // Helper to migrate a table
  async function migrateTable(
    tableName: string,
    data: any[],
    skipDuplicates: boolean = false
  ) {
    if (data.length === 0) {
      results.skipped.push(`${tableName}: No data to migrate`);
      return;
    }

    try {
      console.log(`  ↳ Migrating ${data.length} records to ${tableName}...`);
      
      if (skipDuplicates) {
        // Check for existing records
        const { data: existing } = await supabase
          .from(tableName)
          .select('id');
        
        const existingIds = new Set(existing?.map((r: any) => r.id) || []);
        const newRecords = data.filter((r: any) => !existingIds.has(r.id));
        
        if (newRecords.length === 0) {
          results.skipped.push(`${tableName}: All ${data.length} records already exist`);
          return;
        }
        
        const { error } = await supabase
          .from(tableName)
          .insert(newRecords.map((r: any) => toSnakeCase(r)));
        
        if (error) throw error;
        results.success.push(`${tableName}: ${newRecords.length} new records migrated (${existingIds.size} already existed)`);
      } else {
        // Upsert all records
        const { error } = await supabase
          .from(tableName)
          .upsert(data.map((r: any) => toSnakeCase(r)));
        
        if (error) throw error;
        results.success.push(`${tableName}: ${data.length} records migrated`);
      }
    } catch (error: any) {
      console.error(`  ✗ Error migrating ${tableName}:`, error);
      results.errors.push(`${tableName}: ${error.message}`);
    }
  }

  try {
    // Migrate in order (respecting foreign key constraints)
    
    console.log('\n1️⃣  Migrating Profiles...');
    await migrateTable('profiles', backup.profiles, true);
    
    console.log('\n2️⃣  Migrating Clients...');
    await migrateTable('clients', backup.clients);
    
    console.log('\n3️⃣  Migrating Tasks...');
    await migrateTable('tasks', backup.tasks);
    
    console.log('\n4️⃣  Migrating Task Assignments...');
    await migrateTable('task_assignments', backup.assignments);
    
    console.log('\n5️⃣  Migrating Quotations...');
    await migrateTable('quotations', backup.quotations);
    
    console.log('\n6️⃣  Migrating Payments...');
    await migrateTable('payments', backup.payments);
    
    console.log('\n7️⃣  Migrating Client Receivables...');
    await migrateTable('client_receivables', backup.receivables);
    
    console.log('\n8️⃣  Migrating Staff Liabilities...');
    await migrateTable('staff_liabilities', backup.liabilities);
    
    console.log('\n9️⃣  Migrating Monthly Closings...');
    await migrateTable('monthly_closings', backup.closings);
    
    console.log('\n🔟 Migrating Salary Attendance...');
    await migrateTable('salary_attendance', backup.attendance);
    
    console.log('\n1️⃣1️⃣  Migrating Notifications...');
    await migrateTable('notifications', backup.notifications);
    
    console.log('\n1️⃣2️⃣  Migrating Letterhead Templates...');
    await migrateTable('letterhead_templates', backup.letterheads);
    
    console.log('\n1️⃣3️⃣  Migrating Stamp Assets...');
    await migrateTable('stamp_assets', backup.stamps);
    
    console.log('\n1️⃣4️⃣  Migrating Layout Presets...');
    await migrateTable('layout_presets', backup.presets);
    
    console.log('\n1️⃣5️⃣  Migrating PDF Export Logs...');
    await migrateTable('pdf_export_logs', backup.pdfLogs);

  } catch (error: any) {
    console.error('\n❌ Fatal migration error:', error);
    results.errors.push(`Fatal: ${error.message}`);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60));
  
  if (results.success.length > 0) {
    console.log('\n✅ Successfully migrated:');
    results.success.forEach(msg => console.log(`   ${msg}`));
  }
  
  if (results.skipped.length > 0) {
    console.log('\n⏭️  Skipped:');
    results.skipped.forEach(msg => console.log(`   ${msg}`));
  }
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach(msg => console.log(`   ${msg}`));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`✨ Migration completed!`);
  console.log(`   Success: ${results.success.length} | Skipped: ${results.skipped.length} | Errors: ${results.errors.length}`);
  console.log('='.repeat(60) + '\n');
  
  return results;
}

// Export backup function
export function exportLocalStorageBackup() {
  console.log('💾 Exporting localStorage backup...');
  
  const backup = {
    exportDate: new Date().toISOString(),
    version: '1.0',
    data: {
      profiles: JSON.parse(localStorage.getItem('gtms_profiles') || '[]'),
      clients: JSON.parse(localStorage.getItem('gtms_clients') || '[]'),
      tasks: JSON.parse(localStorage.getItem('gtms_tasks') || '[]'),
      assignments: JSON.parse(localStorage.getItem('gtms_assignments') || '[]'),
      quotations: JSON.parse(localStorage.getItem('gtms_quotations') || '[]'),
      payments: JSON.parse(localStorage.getItem('gtms_payments') || '[]'),
      receivables: JSON.parse(localStorage.getItem('gtms_receivables') || '[]'),
      liabilities: JSON.parse(localStorage.getItem('gtms_liabilities') || '[]'),
      closings: JSON.parse(localStorage.getItem('gtms_closings') || '[]'),
      attendance: JSON.parse(localStorage.getItem('gtms_attendance') || '[]'),
      notifications: JSON.parse(localStorage.getItem('gtms_notifications') || '[]'),
      letterheads: JSON.parse(localStorage.getItem('gtms_letterheads') || '[]'),
      stamps: JSON.parse(localStorage.getItem('gtms_stamps') || '[]'),
      presets: JSON.parse(localStorage.getItem('gtms_presets') || '[]'),
      pdfLogs: JSON.parse(localStorage.getItem('gtms_pdf_logs') || '[]')
    }
  };

  const dataStr = JSON.stringify(backup, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `gtms-backup-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  
  console.log('✅ Backup downloaded successfully!');
  
  return backup;
}

// Validate migration
export async function validateMigration() {
  console.log('🔍 Validating migration...\n');
  
  const localData = {
    profiles: JSON.parse(localStorage.getItem('gtms_profiles') || '[]').length,
    clients: JSON.parse(localStorage.getItem('gtms_clients') || '[]').length,
    tasks: JSON.parse(localStorage.getItem('gtms_tasks') || '[]').length,
    assignments: JSON.parse(localStorage.getItem('gtms_assignments') || '[]').length,
    payments: JSON.parse(localStorage.getItem('gtms_payments') || '[]').length
  };

  const supabaseData = {
    profiles: 0,
    clients: 0,
    tasks: 0,
    assignments: 0,
    payments: 0
  };

  try {
    const [profiles, clients, tasks, assignments, payments] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('clients').select('id', { count: 'exact', head: true }),
      supabase.from('tasks').select('id', { count: 'exact', head: true }),
      supabase.from('task_assignments').select('id', { count: 'exact', head: true }),
      supabase.from('payments').select('id', { count: 'exact', head: true })
    ]);

    supabaseData.profiles = profiles.count || 0;
    supabaseData.clients = clients.count || 0;
    supabaseData.tasks = tasks.count || 0;
    supabaseData.assignments = assignments.count || 0;
    supabaseData.payments = payments.count || 0;

    console.log('📊 Comparison:');
    console.log('┌─────────────────┬──────────────┬───────────┐');
    console.log('│ Table           │ localStorage │ Supabase  │');
    console.log('├─────────────────┼──────────────┼───────────┤');
    console.log(`│ Profiles        │ ${localData.profiles.toString().padEnd(12)} │ ${supabaseData.profiles.toString().padEnd(9)} │`);
    console.log(`│ Clients         │ ${localData.clients.toString().padEnd(12)} │ ${supabaseData.clients.toString().padEnd(9)} │`);
    console.log(`│ Tasks           │ ${localData.tasks.toString().padEnd(12)} │ ${supabaseData.tasks.toString().padEnd(9)} │`);
    console.log(`│ Assignments     │ ${localData.assignments.toString().padEnd(12)} │ ${supabaseData.assignments.toString().padEnd(9)} │`);
    console.log(`│ Payments        │ ${localData.payments.toString().padEnd(12)} │ ${supabaseData.payments.toString().padEnd(9)} │`);
    console.log('└─────────────────┴──────────────┴───────────┘');

    const allMatch = 
      supabaseData.profiles >= localData.profiles &&
      supabaseData.clients >= localData.clients &&
      supabaseData.tasks >= localData.tasks &&
      supabaseData.assignments >= localData.assignments &&
      supabaseData.payments >= localData.payments;

    if (allMatch) {
      console.log('\n✅ Migration validation passed! All data is in Supabase.');
    } else {
      console.log('\n⚠️  Warning: Some data counts don\'t match. Review the migration.');
    }

    return { localData, supabaseData, allMatch };
  } catch (error: any) {
    console.error('\n❌ Validation error:', error.message);
    return null;
  }
}
