# Supabase Configuration Guide

## Overview

The Dork App uses Supabase for data storage and real-time synchronization. The application fetches data using the public/anonymous API key to allow users to access salon listings without authentication.

## Data Loading Issue: RLS Policies

If you're seeing missing data (empty regions, governorates, customers, or salons) in your deployed app, the issue is likely **Row Level Security (RLS) policies**.

### What is RLS?

RLS (Row Level Security) is a database security feature that controls which rows users can access. By default, when RLS is enabled on a table, anonymous users cannot read any data.

### Symptoms

- App loads without JavaScript errors
- Location filters appear but are empty
- Salon listings are empty
- Console shows no errors, but data is missing

### Solution

Run the SQL migration file to enable public read access to the required tables:

```sql
-- Navigate to Supabase Dashboard > SQL Editor
-- Copy and paste the contents of: admin/fix-rls-policies.sql
-- Click "Run" to execute
```

**OR manually enable policies:**

```sql
-- For each table (salons, customers, bookings, reviews, app_settings):
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read" ON table_name FOR SELECT USING (true);
CREATE POLICY "service_role_all" ON table_name FOR ALL TO service_role USING (true);
```

## Tables Configuration

| Table | Read | Write | Purpose |
|-------|------|-------|---------|
| `salons` | ✓ Public | Service Role | Salon listings |
| `customers` | ✓ Public | Service Role | Customer profiles |
| `bookings` | ✓ Public | Public | Booking records |
| `reviews` | ✓ Public | Public | Salon reviews |
| `app_settings` | ✓ Public | Service Role | App configuration |

## Fallback Data

If RLS policies are not configured correctly, the app will automatically use demo data to show that the UI is working. You'll see sample salons in the listing.

To view the demo data, check: `App.jsx` > `DEMO_SALONS` constant

## Real-time Subscriptions

The app uses Supabase Realtime for live updates. Ensure Realtime is enabled for these tables in Supabase Dashboard > Database > Replication.

## Troubleshooting

1. **Data still missing after RLS fix:**
   - Check Supabase Dashboard > Authentication > Policies
   - Verify RLS is ENABLED on the table
   - Verify the policy allows `SELECT` for anonymous users (`USING (true)`)

2. **Getting 403 Forbidden errors:**
   - Your RLS policies are too restrictive
   - Use the fix-rls-policies.sql to update them

3. **Seeing demo data instead of real data:**
   - RLS policies are blocking the queries
   - Run the SQL migration to fix

## Development

For local development, you can:
1. Use demo data (already enabled as fallback)
2. Configure your .env.local with a Supabase project
3. Run the SQL migrations to enable public access
