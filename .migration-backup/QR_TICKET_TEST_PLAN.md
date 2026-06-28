# QR Ticket System - Test Plan

## 🧪 Complete Testing Flow

### Prerequisites:
- ✅ Supabase setup complete (`SUPABASE_QR_TICKET_SETUP.sql` run)
- ✅ Two accounts ready:
  - Organization: `testorg@rutgers.edu` / `password123`
  - Student: `student@rutgers.edu` / `password123`

---

## Test 1: Ticket Creation (Most Critical)

### Steps:
1. **Open browser console** (F12)
2. Log in as **student** (`student@rutgers.edu`)
3. Navigate to **Home** screen
4. Find the test event created by the organization
5. Click **"Join Event"**

### Expected Console Output:
```
🎫 Creating registration: {
  user_id: "xxx-xxx-xxx",
  event_id: "xxx-xxx-xxx",
  ticket_code: "TICKET-xxx-xxx-xxx"
}
✅ Registration saved to Supabase successfully!
✅ Registration data: [{...}]
✅ Ticket code: TICKET-{eventId}-{userId}-{timestamp}
```

### Verify in Supabase:
1. Go to Supabase Dashboard
2. Open **Table Editor**
3. Select **`registrations`** table
4. **Look for your new row:**
   - `user_id` = student's ID
   - `event_id` = event ID
   - `ticket_code` = the code from console
   - `scanned` = false
   - `payment_status` = 'free'

### ❌ If Registration NOT Created:
**Check console for errors:**
- Red ❌ error messages
- "permission denied" → RLS policy issue
- "violates foreign key" → `user_id` or `event_id` mismatch
- "null value" → missing required field

---

## Test 2: Ticket Display

### Steps:
1. Still logged in as **student**
2. Navigate to **Tickets** tab
3. Look for the event you just joined

### Expected Result:
- ✅ Event card displayed with QR code
- ✅ QR code is visible and scannable
- ✅ Event details shown (title, date, time, location)

### Verify QR Code:
1. Right-click QR code → "Save image"
2. Use phone camera or QR scanner app to scan
3. Should show text: `TICKET-{eventId}-{userId}-{timestamp}`

---

## Test 3: Organization Event Scanner View

### Steps:
1. Log out
2. Log in as **organization** (`testorg@rutgers.edu`)
3. Navigate to **Tickets** tab

### Expected Console Output:
```
🎯 Organization Events loaded from Supabase: [...]
✅ Formatted organization events: [...]
🔍 TicketsScreen Debug: {
  isOrganization: true,
  userId: "xxx",
  supabaseEventsCount: 1,
  organizationEventsCount: 1,
  organizationEvents: [...]
}
```

### Expected UI:
- ✅ Your test event displayed as a card
- ✅ Event details visible
- ✅ **"Scan QR Codes"** button present
- ❌ NO "No tickets found" message

---

## Test 4: Valid Ticket Scan

### Setup:
You need TWO devices:
- **Device 1:** Organization scanner (laptop/desktop)
- **Device 2:** Student ticket (phone or another screen)

### Steps:
1. **Device 2 (Student):**
   - Log in as student
   - Go to Tickets
   - Display the QR code on screen (full screen if possible)

2. **Device 1 (Organization):**
   - Click **"Scan QR Codes"** button
   - Allow camera access
   - Point camera at Device 2's QR code

### Expected Result:
```
✅ Valid Ticket
Welcome, {Student Name}!

[Green checkmark icon]
Attendee: {Student Name}

[Scan Another button]
```

### Expected Console Output:
```
✅ Parsed ticket info: { eventId, userId, timestamp, fullCode }
🔍 Validating ticket: {...}
✅ Registration found, marking as scanned
```

### Verify in Supabase:
- Go to `registrations` table
- Find the ticket row
- `scanned` should now be **true**
- `scanned_at` should have a timestamp

---

## Test 5: Invalid QR Code

### Steps:
1. Still in organization scanner
2. Click **"Try Again"** or **"Scan Another"**
3. Find ANY random QR code (product barcode, random generator, etc.)
4. Scan it

### Expected Result:
```
❌ Invalid QR code format
This QR code is not a valid ticket

[Red X icon]

[Try Again button - RED]
```

### Should NOT show:
- ❌ "Ticket Scanned Successfully"
- ❌ Green checkmark
- ❌ Any attendee name

---

## Test 6: Already Scanned Ticket

### Steps:
1. Still in organization scanner
2. Click **"Try Again"**
3. Scan the SAME student ticket from Test 4 again

### Expected Result:
```
❌ Already Scanned
This ticket has already been used

[Red X icon]

[Try Again button - RED]
```

---

## Test 7: Wrong Event Ticket

### Setup:
1. Create a SECOND event as organization
2. Have student join FIRST event (already done)
3. Do NOT join second event

### Steps:
1. As organization, open scanner for **SECOND event**
2. Scan student's ticket for **FIRST event**

### Expected Result:
```
❌ Wrong Event
This ticket is for "{First Event Title}", not this event

[Red X icon]

[Try Again button - RED]
```

---

## Test 8: Ticket Not Found

### Steps:
1. Create a fake QR code with correct format:
   - Go to https://www.qr-code-generator.com/
   - Enter text: `TICKET-00000000-0000-0000-0000-000000000000-0000-0000-0000-000000000000-1234567890`
   - Generate QR code
2. Scan this fake ticket

### Expected Result:
```
❌ Ticket Not Found
This ticket is not registered in our system

[Red X icon]

[Try Again button - RED]
```

---

## 🐛 Troubleshooting

### Issue: Registration not created
**Possible causes:**
1. **RLS Policy blocking insert**
   - Check Supabase → Authentication → Policies
   - `registrations` table needs INSERT policy for authenticated users

2. **Missing user_id**
   - Check console: "❌ user?.userId is undefined"
   - Verify user is properly logged in

3. **Event has no supabaseId**
   - Check console: event object
   - Event must be loaded from Supabase, not mock data

### Issue: Scanner always shows "Ticket Scanned Successfully"
**This was the bug we just fixed!** Make sure changes are saved and page is refreshed.

### Issue: Organization events not showing
**Check console for:**
```
🔍 TicketsScreen Debug: {
  isOrganization: true,
  organizationEventsCount: 0  // ← Should be 1+
}
```

**Possible causes:**
1. Event not created by this organization user
2. `created_by` field doesn't match `user.userId`
3. RLS policy blocking SELECT

### Issue: "Ticket Not Found" for valid ticket
**Possible causes:**
1. Registration was not created (see Test 1)
2. `ticket_code` in database doesn't match QR code
3. RLS policy blocking SELECT from registrations
4. Database connection issue

---

## 🎯 Success Criteria

### All tests should show:
- ✅ Test 1: Registration created in Supabase
- ✅ Test 2: Ticket QR code displays
- ✅ Test 3: Organization sees hosted events
- ✅ Test 4: Valid ticket accepted with attendee name
- ✅ Test 5: Random QR rejected
- ✅ Test 6: Already scanned ticket rejected
- ✅ Test 7: Wrong event ticket rejected
- ✅ Test 8: Fake ticket rejected

### Console should show:
- ✅ No red errors during registration creation
- ✅ "✅ Registration saved to Supabase" message
- ✅ "🎯 Organization Events loaded" message
- ✅ Validation logs showing ticket parsing

### Supabase should show:
- ✅ New row in `registrations` table after joining
- ✅ `scanned` field updates to `true` after scan
- ✅ `scanned_at` timestamp populated

---

## 📝 Testing Checklist

```
[ ] Test 1: Ticket Creation - PASSED/FAILED
    [ ] Console shows registration created
    [ ] Supabase shows new row in registrations table
    
[ ] Test 2: Ticket Display - PASSED/FAILED
    [ ] QR code visible in Tickets tab
    [ ] QR code scannable
    
[ ] Test 3: Organization Scanner View - PASSED/FAILED
    [ ] Events loaded from Supabase
    [ ] "Scan QR Codes" button visible
    [ ] No "No tickets found" message
    
[ ] Test 4: Valid Ticket Scan - PASSED/FAILED
    [ ] Green checkmark shown
    [ ] Attendee name displayed
    [ ] Database updated (scanned = true)
    
[ ] Test 5: Invalid QR Code - PASSED/FAILED
    [ ] Red X shown
    [ ] Error message displayed
    [ ] No false positive
    
[ ] Test 6: Already Scanned - PASSED/FAILED
    [ ] Rejected with proper message
    
[ ] Test 7: Wrong Event - PASSED/FAILED
    [ ] Rejected with proper message
    
[ ] Test 8: Ticket Not Found - PASSED/FAILED
    [ ] Rejected with proper message
```

---

**Ready to test!** Start with Test 1 and report any failures. 🚀












