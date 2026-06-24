# Reconnecting Your Supabase Project

Your Supabase project was paused after 7 days of inactivity. Follow these steps to reconnect:

## Step 1: Reactivate Your Supabase Project

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Sign in** with your account
3. **Find your paused project** - it should show a "Paused" status
4. **Click "Restore" or "Resume"** button to reactivate the project
   - This may take a few minutes
   - Your data is safe - it's just paused, not deleted

## Step 2: Get Your Project Credentials

Once your project is active:

1. **Go to Project Settings** (gear icon in the left sidebar)
2. **Click on "API"** in the settings menu
3. **Copy these two values**:
   - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon/public key** (the `anon` `public` key, not the `service_role` key)

## Step 3: Update Your .env File

Update your `.env` file in the project root with:

```env
REACT_APP_SUPABASE_URL=your_project_url_here
REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here
```

**Example:**
```env
REACT_APP_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzODk2NzI4MCwiZXhwIjoxOTU0NTQzMjgwfQ.example
```

## Step 4: Restart Your Development Server

After updating the `.env` file:

1. **Stop the current server** (Ctrl+C in the terminal)
2. **Restart it** with `npm start`
3. The app should now connect to your Supabase project

## Step 5: Verify Connection

Check the browser console for:
- ✅ No "Failed to fetch" errors
- ✅ Successful Supabase queries
- ✅ Events loading from Supabase

## Troubleshooting

### If you can't find your project:
- Check if you're logged into the correct Supabase account
- Look in "All Projects" or check archived projects
- If the project is truly gone, you may need to create a new one and run the SQL setup scripts again

### If connection still fails:
- Make sure there are no extra spaces in your `.env` file
- Ensure the URL starts with `https://` and ends with `.supabase.co`
- Verify the anon key is the correct one (not service_role)
- Check that your project is fully restored (not still pausing)

### Required Tables
Your project should have these tables (from your SQL setup files):
- `events` - Event information
- `registrations` - User event registrations with ticket codes
- `users` or `profiles` - User profiles

If tables are missing, run the SQL setup scripts in your Supabase SQL Editor:
- `SUPABASE_QR_TICKET_SETUP.sql`
- `FINAL_QR_TICKET_SETUP.sql`


