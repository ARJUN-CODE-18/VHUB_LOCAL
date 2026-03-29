╔═══════════════════════════════════════════════════════════════════════════════╗
║           VAMS SCHEDULING - QUICK REFERENCE DEBUGGING CARD                     ║
╚═══════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. FRONTEND LOGS (Browser Console - F12)                                    │
└─────────────────────────────────────────────────────────────────────────────┘

Look for these logs when you click "Schedule Operation":

✓ SCHEDULING: Input time & conversion
  Example: Input "28-03-2026 12:09" -> Formatted "2026-03-28T12:09:00"
  ⚠ If missing: Frontend not logging, check browser version

✓ SCHEDULING_PAYLOAD: Complete request
  Example: {
    "aircraft_id": "VT-040023",
    "operation_type": "LANDING",
    "priority": "NORMAL",
    "pad_id": "VP-002",
    "scheduled_time": "2026-03-28T12:09:00"
  }
  ⚠ Check all fields are correct!

✓ SCHEDULING_ERROR_DETAIL: Error message
  Example: "Invalid aircraft state for landing: PARKED"
  ⚠ This is the EXACT reason for failure


┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. BACKEND LOGS (VS Code Terminal)                                         │
└─────────────────────────────────────────────────────────────────────────────┘

Follow this sequence to find WHERE the failure happens:

Step 1: Entry Point
  LOG: "SCHEDULE_OPERATION_ENDPOINT: Received payload: aircraft_id=VT-040023..."
  ⚠ If missing: Endpoint not reached, check API URL

Step 2: Service Called  
  LOG: "SCHEDULE_OPERATION CALLED: aircraft_id=VT-040023, operation_type=LANDING..."
  ⚠ If missing: Endpoint didn't call service

Step 3: Operation Type
  LOG: "Normalized operation type: LANDING"
  ⚠ If says "operation_type must be LANDING or TAXI": Invalid operation type

Step 4: Aircraft Validation ← COMMON FAILURE POINT
  LOG: "LANDING validation: Aircraft state=EN_ROUTE_INBOUND, Allowed states={...}"
  
  ✓ If aircraft state is EN_ROUTE_INBOUND/APPROACH/FINAL_APPROACH: Passes
  ✗ If state is anything else:
    ERROR: "VALIDATION_FAILED: Invalid aircraft state for landing: PARKED"
    ACTION: Set aircraft state to EN_ROUTE_INBOUND first

Step 5: Scheduled Time
  LOG: "Scheduled time provided: 2026-03-28 12:09:00 (type=datetime, tzinfo=UTC)"
  
  ✓ If future date: Passes
  ✗ If past date:
    ERROR: "VALIDATION_FAILED: scheduled_time cannot be in the past"
    ACTION: Use future date

Step 6: Pad Validation ← COMMON FAILURE POINT
  LOG: "PAD_VALIDATION: Checking pad_id=VP-002 against STATIC_PAD_IDS=..."
  
  ✓ If pad_id is in list: Passes
  ✗ If pad_id NOT in list:
    ERROR: "VALIDATION_FAILED: Invalid pad_id: VP-003. Must be one of: ..."
    ACTION: Use valid pad_id

Step 7: Pad Lookup
  LOG: "PAD_FOUND: pad=VP-002"
  
  ✓ If pad found: Passes
  ✗ If pad NOT found:
    ERROR: "VALIDATION_FAILED: Vertipad VP-002 not found or is not operational"
    ACTION: Initialize/create that pad

Step 8: Pad Availability ← COMMON FAILURE POINT
  LOG: "PAD_STATUS: id=VP-002, current_aircraft_id=null, state=VertipadState.AVAILABLE"
  
  ✓ If current_aircraft_id=None AND state=AVAILABLE: Passes → Schedules
  ✗ If current_aircraft_id is set:
    -> If priority=CRITICAL: Override (OVERRIDDEN status)
    -> If priority=NORMAL: Queue (QUEUED status)
    ERROR: "PAD_OCCUPIED: Pad VP-002 is not available..."
    ACTION: Either override with CRITICAL priority or release the pad

Step 9: Success!
  LOG: "SCHEDULE_OPERATION_SUCCESS: Result status=SCHEDULED"
  ✓ Operation scheduled successfully


┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. ERROR MESSAGE INTERPRETATION                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┏ Aircraft-Related Errors ┓
├─────────────────────────────────────────────────────────────────────────────┤
│ "Aircraft {id} not found"
│   → Aircraft doesn't exist in database
│   → ACTION: Register aircraft first in Aircraft Management
│
│ "Invalid aircraft state for landing: {state}"
│   → Aircraft not in correct state
│   → VALID STATES for LANDING: EN_ROUTE_INBOUND, APPROACH, FINAL_APPROACH
│   → VALID STATES for TAXI: (any state except PARKED on a pad)
│   → ACTION: Transition aircraft to correct state first via operations
│
│ "Invalid aircraft state for taxi: {state}"
│   → Aircraft can't taxi from current state
│   → ACTION: Move aircraft to correct state

┏ Pad-Related Errors ┓
├─────────────────────────────────────────────────────────────────────────────┤
│ "Invalid pad_id: {id}"
│   → Pad ID not in STATIC_PAD_IDS list
│   → VALID PAD IDS: VP-001, VP-002, VP-003, ...
│   → ACTION: Use correct pad ID from the list
│
│ "Vertipad {id} not found or is not operational"
│   → Pad doesn't exist in DB or marked non-operational
│   → ACTION: Check pad status, initialize if needed
│
│ "Vertipad {id} is not available"
│   → Pad occupied or in wrong state
│   → REASONS: current_aircraft_id != None OR state != AVAILABLE
│   → ACTION: Release pad OR use CRITICAL priority to override

┏ Time-Related Errors ┓
├─────────────────────────────────────────────────────────────────────────────┤
│ "scheduled_time cannot be in the past"
│   → Date/time is before current time
│   → ACTION: Use a future date/time
│
│ "Invalid datetime format. Use YYYY-MM-DDTHH:MM:SS"
│   → Schema validator couldn't parse datetime string
│   → EXPECTED FORMAT: 2026-03-28T12:09:00 (ISO format)
│   → ACTION: Check frontend toSchedulingDateTime() function

┏ Availability Errors ┓
├─────────────────────────────────────────────────────────────────────────────┤
│ "No available vertipad for scheduling"
│   → No pad specified AND all pads occupied
│   → ACTION: Specify a pad_id OR release occupied pads


┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. QUICK DIAGNOSIS FLOWCHART                                                │
└─────────────────────────────────────────────────────────────────────────────┘

  Does user see error in UI?
    ├─ YES → Check SCHEDULING_ERROR_DETAIL in browser console
    │         (This is the exact error from backend)
    │
    └─ NO → Is "Schedule Operation" button enabled?
            ├─ NO → Select an aircraft first
            └─ YES → Operation may have succeeded
                    Check response message in UI

  Backend logs show VALIDATION_FAILED?
    └─ Find which validation step failed:
       ├─ Aircraft validation (state check)
       │  → Transition aircraft to EN_ROUTE_INBOUND/APPROACH/FINAL_APPROACH
       │
       ├─ Pad validation (ID check)
       │  → Use valid pad_id from STATIC_PAD_IDS
       │
       ├─ Pad lookup (existence check)
       │  → Initialize/create that pad
       │
       ├─ Pad availability (occupancy check)
       │  → Release pad OR use CRITICAL priority
       │
       └─ Time validation (past date check)
          → Use future date/time


┌─────────────────────────────────────────────────────────────────────────────┐
│ 5. COMMON SCENARIOS                                                          │
└─────────────────────────────────────────────────────────────────────────────┘

Scenario 1: "Aircraft not found"
  Root Cause: Aircraft ID doesn't exist
  Logs Show: "Aircraft VT-040023 not found"
  Fix:
    1. Create aircraft first (Aircraft Management page)
    2. Verify aircraft ID is correct
    3. Try scheduling again

Scenario 2: "Invalid aircraft state for landing: PARKED"
  Root Cause: Aircraft not in landing state
  Logs Show: "LANDING validation: Aircraft state=PARKED"
  Fix:
    1. Locate aircraft
    2. Transition to EN_ROUTE_INBOUND via operations
    3. Try scheduling again

Scenario 3: "Vertipad VP-002 is not available"
  Root Cause: Pad already has aircraft
  Logs Show: "PAD_STATUS: id=VP-002, current_aircraft_id=VT-040001"
  Fix (Option A - Queue):
    1. Keep priority=NORMAL
    2. Try scheduling again
    3. Aircraft will be queued
  Fix (Option B - Override):
    1. Change priority to CRITICAL
    2. Try scheduling again
    3. Aircraft will override (after landing aircraft moves away)
  Fix (Option C - Release):
    1. Release current aircraft from pad
    2. Try scheduling again

Scenario 4: "scheduled_time cannot be in the past"
  Root Cause: Using past date
  Logs Show: "Scheduled time... (2026-03-26) is in the past"
  Fix:
    1. Check current date first
    2. Use future date (e.g., 2026-03-28 if today is 2026-03-26)
    3. Try scheduling again


┌─────────────────────────────────────────────────────────────────────────────┐
│ 6. ULTIMATE DEBUGGING CHECKLIST                                             │
└─────────────────────────────────────────────────────────────────────────────┘

When scheduling fails, check in THIS order:

□ Frontend Console (F12)
  □ See SCHEDULING_PAYLOAD? Check all fields are correct
  □ See SCHEDULING_ERROR_DETAIL? This IS the error reason

□ Backend Logs (VS Code Terminal)
  □ See "SCHEDULE_OPERATION ENDPOINT"? → Endpoint reached ✓
  □ See "LANDING validation"? → Aircraft state validation ran
    □ Does it show allowed state? ✓
    □ Does it show different state? → Fix aircraft state
  □ See "PAD_VALIDATION"? → Pad ID is being checked
    □ See "PAD_FOUND"? ✓
    □ See "VALIDATION_FAILED: Invalid pad_id"? → Use valid pad
  □ See "PAD_STATUS"? → Pad status check
    □ Does it show current_aircraft_id=None? → Pad available ✓
    □ Does it show current_aircraft_id=something? → Pad occupied
  □ See "SCHEDULE_OPERATION_SUCCESS"? → ✓✓✓ It worked!
  □ See "SCHEDULE_OPERATION_FAILED"? → Error occurred, check detail

□ Final Result
  □ User sees success message? → ✓ Operation scheduled
  □ User sees error message? → Review error message and fix


════════════════════════════════════════════════════════════════════════════════
REMEMBER: Every error has a specific cause shown in logs. The logs are designed
to tell you EXACTLY what went wrong and where. Just follow the logs!
════════════════════════════════════════════════════════════════════════════════
