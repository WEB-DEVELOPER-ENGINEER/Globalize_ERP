# Supabase Database Setup Guide

This guide will help you set up your Supabase database for the Globalize Translation Management System.

## Prerequisites

- A Supabase account (sign up at https://supabase.com if you don't have one)
- Your Supabase project: **fegbwmteitoorrwkfgvh**

## Step 1: Get Your Supabase Credentials

1. Go to https://supabase.com/dashboard
2. Select your project: **fegbwmteitoorrwkfgvh**
3. Go to **Settings** → **API**
4. Copy the following:
   - **Project URL**: `https://fegbwmteitoorrwkfgvh.supabase.co`
   - **anon/public key**: This is your `VITE_SUPABASE_ANON_KEY`

## Step 2: Configure Environment Variables

1. Create a `.env` file in the root of your project (copy from `.env.example`):

```bash
cp .env.example .env
```

2. Edit the `.env` file and add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://fegbwmteitoorrwkfgvh.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here
```

## Step 3: Create Database Tables

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy the entire contents of `supabase-schema.sql` file
4. Paste it into the SQL Editor
5. Click **Run** to execute the SQL

This will create:
- ✅ All 15 database tables
- ✅ Indexes for query performance
- ✅ Foreign key relationships
- ✅ Row Level Security policies
- ✅ Helper functions for reference number generation
- ✅ Seed data (3 initial user profiles)

## Step 4: Verify the Tables

After running the SQL, verify in the **Table Editor** that you have these tables:

- `profiles` - User accounts and staff
- `clients` - Client information
- `tasks` - Translation tasks/projects
- `task_assignments` - Translator assignments
- `quotations` - Price quotes
- `payments` - Income and expense records
- `client_receivables` - Outstanding client payments
- `staff_liabilities` - Staff payment obligations
- `monthly_closings` - Monthly financial reports
- `salary_attendance` - Staff attendance tracking
- `notifications` - System notifications
- `letterhead_templates` - Document letterheads
- `stamp_assets` - Stamps and signatures
- `layout_presets` - PDF layout configurations
- `pdf_export_logs` - PDF generation history

## Step 5: Test the Connection

Run your development server:

```bash
npm run dev
```

The application should now connect to Supabase instead of using localStorage.

## Database Schema Overview

### Key Tables:

**Profiles Table** - Stores all users (owner, sales, accountants, translators, admins)
- Includes role-based access
- Supports both staff and freelance translators
- Stores rates and salary information

**Tasks Table** - Core translation project management
- Automatically generates reference numbers (YY.MM.DD.N format)
- Tracks payment status, costs, and revenue
- Links to clients and assignments

**Task Assignments Table** - Links translators to tasks
- Supports translation, revision, and proofreading
- Tracks word counts and rates
- Manages submission and approval workflow

**Payments Table** - Financial transaction records
- Supports income and expenses
- Multi-currency (EGP, AED, USD)
- Links to tasks for payment tracking

## Next Steps

### Option 1: Migrate Existing localStorage Data

If you have existing data in localStorage, you can create a migration script to transfer it to Supabase.

### Option 2: Start Fresh

The database is already seeded with 3 user profiles:
- Ahmed Abdel Ghaffar Mohamed (Owner) - phone: 00201555592535
- Sara Khafaga (Admin) - phone: +201006835081
- Esraa (Admin) - phone: +201122374380

Default password for all users: `password123`

## Security Notes

1. **Row Level Security (RLS)** is enabled on all tables
2. Current policies allow all authenticated operations - you should refine these based on your needs
3. The `anon` key is safe to use in your frontend - it respects RLS policies
4. Never expose your `service_role` key in frontend code

## Supabase Features You Can Use

- **Real-time subscriptions**: Get live updates when data changes
- **Storage**: Upload and store task attachments, stamps, letterheads
- **Auth**: Implement proper authentication (currently using basic password checking)
- **Edge Functions**: Server-side logic for complex operations
- **Database Functions**: Already included for reference number generation

## Troubleshooting

### Connection Issues
- Verify your `.env` file has correct credentials
- Check that environment variables start with `VITE_` for Vite to expose them
- Restart your dev server after changing `.env`

### RLS Policy Issues
- If you get permission errors, check the RLS policies in Supabase Dashboard
- For development, you can temporarily disable RLS on specific tables

### Migration from localStorage
- Your existing localStorage code is preserved
- You can switch back by modifying `src/db/store.ts`
- Consider keeping a backup of localStorage data

## Support

For Supabase-specific questions:
- Documentation: https://supabase.com/docs
- Discord: https://discord.supabase.com

For database schema questions:
- Review the ERD (Entity Relationship Diagram) in Supabase Dashboard
- Check the `supabase-schema.sql` file for table definitions
