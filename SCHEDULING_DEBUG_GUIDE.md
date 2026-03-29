# Scheduling Failure Debugging Guide

## 🎯 Exact Issue Identified

User trying to schedule:
- **Aircraft**: VT-040023
- **Pad**: VP-002
- **Operation**: Landing
- **Scheduled Time**: 28-03-2026 12:09
- **Error**: "Failed to schedule operation"

## ✅ Fixes Applied

### 1. **Enhanced Backend Logging** (scheduler_service.py)
Added detailed logging at EVERY validation step:
- ✅ Input payload validation
- ✅ Aircraft existence check
- ✅ Aircraft state validation for LANDING/TAXI
- ✅ Scheduled time format and validation
- ✅ Pad ID validation against STATIC_PAD_IDS
- ✅ Pad operational status check
- ✅ Pad availability check (current_aircraft_id, state)

### 2. **Enhanced API Endpoint Logging** (operations.py)
- ✅ Log incoming payload before processing
- ✅ Log final result status
- ✅ Log exception details

### 3. **Improved Schema Validation** (operations.py)
- ✅ Added logging to datetime parser to see exact input format
- ✅ Better error messages with expected format

### 4. **Frontend Payload Logging** (ScheduleTaxiLanding.tsx)
- ✅ Log the input time and converted time
- ✅ Log complete payload being sent
- ✅ Log error details received from backend
- ✅ Enhanced error display

## 🔍 What Each Log Shows

### Backend Logs to Watch

```
SCHEDULE_OPERATION ENDPOINT: Received payload: aircraft_id=VT-040023...
  ├─ Shows exactly what frontend sent

SCHEDULE_OPERATION CALLED: aircraft_id=VT-040023, operation_type=LANDING...
  ├─ Shows scheduler service received the request

Normalized operation type: LANDING
  ├─ Confirms operation type parsing

LANDING validation: Aircraft state=<STATE>, Allowed states={...}
  ├─ Critical: Check if aircraft state is valid
  ├─ Valid states: EN_ROUTE_INBOUND, APPROACH, FINAL_APPROACH
  ├─ If not valid → "Invalid aircraft state for landing" error

PAD FOUND: pad=<id>
  ├─ Confirms pad exists in database

PAD_STATUS: id=VP-002, current_aircraft_id=<id>, state=<state>
  ├─ Shows if pad is occupied or in wrong state

VALIDATION_FAILED: <error message>
  ├─ Shows exact failure reason
```

### Frontend Logs to Watch

```
SCHEDULING: Input time: "28-03-2026 12:09" -> Formatted: "2026-03-28T12:09:00"
  ├─ Confirms datetime conversion

SCHEDULING_PAYLOAD: {...}
  ├─ Complete payload being sent

SCHEDULING_ERROR_DETAIL: "<backend error message>"
  ├─ Exact error from backend displayed
```

## 🧪 Testing Instructions

### Step 1: Check Backend Logs at Each Stage

Start backend with logs:
```bash
cd vams-backend
python -m uvicorn app.main:app --reload --log-level info
```

### Step 2: Open Frontend

In another terminal:
```bash
cd vams-frontend
npm run dev
```

### Step 3: Perform Scheduling

1. Navigate to Dashboard → Taxi & Landing Scheduling
2. Select Aircraft: **VT-040023**
3. Select Pad: **VP-002**
4. Select Operation: **Landing**
5. Set Scheduled Time: **2026-03-28 12:09** (or future date)
6. Click "Schedule Operation"

### Step 4: Read Console Logs

**Browser Console** (F12):
```
SCHEDULING: Input time: ... -> Formatted: ...
SCHEDULING_PAYLOAD: {...}
SCHEDULING_ERROR_DETAIL: <error or success>
```

**Backend Console**:
```
SCHEDULE_OPERATION ENDPOINT: Received payload: ...
SCHEDULE_OPERATION CALLED: ...
LANDING validation: Aircraft state=...
PAD_FOUND: ...
PAD_STATUS: ...
[Either SCHEDULE_OPERATION_SUCCESS or VALIDATION_FAILED]
```

## 🔧 Common Failure Reasons & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| "Aircraft {id} not found" | Aircraft doesn't exist | Check aircraft ID exists in database |
| "Invalid aircraft state for landing" | Aircraft not in right state | Set aircraft state to EN_ROUTE_INBOUND, APPROACH, or FINAL_APPROACH |
| "Invalid pad_id: VP-002" | Pad not in STATIC_PAD_IDS | Ensure pad ID matches catalog (VP-001, VP-002, etc.) |
| "Vertipad {id} not found or is not operational" | Pad not in DB or not operational | Check pad exists and is_operational=True |
| "Vertipad {id} is not available" | Pad occupied or wrong state | Check current_aircraft_id is None and state=AVAILABLE |
| "No available vertipad for scheduling" | No pad specified AND none available | Specify a pad or free up available pads |
| "scheduled_time cannot be in the past" | Date/time is in the past | Use a future date/time |

## 📊 Complete Validation Flow

```
Frontend
  ↓ (sends payload with datetime string)
  
Frontend Validator
  ├─ toSchedulingDateTime("28-03-2026 12:09")
  └─ Returns "2026-03-28T12:09:00"

Frontend API
  ↓ (sends JSON with scheduled_time string)
  
Backend Schema Validator (operations.py)
  ├─ normalize_scheduled_time("2026-03-28T12:09:00")
  ├─ Parses to datetime object
  └─ [LOGGED: value and parsed result]

Backend Endpoint (operations.py)
  ├─ [LOGGED: incoming payload]
  └─ Calls SchedulerService

SchedulerService.schedule_operation()
  ├─ [LOGGED: all inputs]
  ├─ Check aircraft exists → [LOGGED]
  ├─ Check operation type → [LOGGED]
  ├─ Check aircraft state → [LOGGED] ← COMMON FAILURE
  ├─ Check scheduled_time → [LOGGED]
  ├─ Check pad_id → [LOGGED] ← COMMON FAILURE
  ├─ Check pad exists → [LOGGED] ← COMMON FAILURE
  ├─ Check pad available → [LOGGED] ← COMMON FAILURE
  └─ Create slot & schedule → [LOGGED]

[SUCCESS or EXCEPTION]
  ↓ (returns detail in HTTP response)
  
Frontend Catch Block
  ├─ [LOGGED: error detail]
  └─ Displays error to user
```

## 🎯 Key Validation Points

### Point 1: Aircraft State Validation
```python
# For LANDING, aircraft must be in ONE of these states:
allowed_states = {
    AircraftState.EN_ROUTE_INBOUND,
    AircraftState.APPROACH, 
    AircraftState.FINAL_APPROACH
}
```
**Action**: Check `vams-backend/app/core/fsm/aircraft_fsm.py` to see valid transition paths

### Point 2: Pad ID Validation
```python
# Pad must be in this list
STATIC_PAD_IDS = ("VP-001", "VP-002", ...)
```
**Action**: Verify pad_id matches exactly (case-sensitive)

### Point 3: Pad Availability
```python
# Pad must have:
# - current_aircraft_id = None
# - state = VertipadState.AVAILABLE
# - is_operational = True
```
**Action**: Check database for pad status

### Point 4: DateTime Format
```python
# Frontend sends: "2026-03-28T12:09:00"
# Backend parses with: "%Y-%m-%dT%H:%M:%S"
# Must be ISO format, FUTURE date/time
```
**Action**: Verify date is in future (not 28-03-2026 if today is 26-03-2026)

## 📝 Debug Checklist

- [ ] Check backend logs show "SCHEDULE_OPERATION ENDPOINT: Received payload..."
- [ ] Check "Normalized operation type: LANDING" log
- [ ] Check "LANDING validation: Aircraft state=..." log  
  - [ ] Is aircraft state one of: EN_ROUTE_INBOUND, APPROACH, FINAL_APPROACH?
- [ ] Check "PAD FOUND: pad=VP-002" log
- [ ] Check "PAD_STATUS: id=VP-002, current_aircraft_id=..." log
  - [ ] Is current_aircraft_id = None?
  - [ ] Is state = AVAILABLE?
- [ ] Check "Scheduled time provided: 2026-03-28T12:09:00" log
  - [ ] Is the datetime FUTURE (not in the past)?
- [ ] Check final log: "SCHEDULE_OPERATION_SUCCESS" or "VALIDATION_FAILED"

## 🚀 Expected Success Case

**Frontend Console**:
```
SCHEDULING: Input time: "28-03-2026 12:09" -> Formatted: "2026-03-28T12:09:00"
SCHEDULING_PAYLOAD: {
  "aircraft_id": "VT-040023",
  "operation_type": "LANDING",
  "priority": "NORMAL",
  "pad_id": "VP-002",
  "scheduled_time": "2026-03-28T12:09:00"
}
```

**Backend Console**:
```
SCHEDULE_OPERATION ENDPOINT: Received payload: aircraft_id=VT-040023, operation_type=LANDING...
SCHEDULE_OPERATION CALLED: aircraft_id=VT-040023, operation_type=LANDING...
Normalized operation type: LANDING
LANDING validation: Aircraft state=EN_ROUTE_INBOUND, Allowed states={...}
Scheduled time provided: 2026-03-28 12:09:00...
PAD_VALIDATION: Checking pad_id=VP-002...
PAD_FOUND: pad=VP-002
PAD_STATUS: id=VP-002, current_aircraft_id=None, state=VertipadState.AVAILABLE
PAD_SELECTED: Using pad=VP-002 for operation=LANDING
SCHEDULE_OPERATION_SUCCESS: Result status=SCHEDULED
```

**User UI**:
```
✅ "LANDING scheduled on VP-002"
```

---

**Status**: ✅ All logging enhanced and error messages improved  
**Next Action**: Run tests and check logs against checklist above
