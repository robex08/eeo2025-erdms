# User Activity Tracking System

## Overview

The User Activity Tracking system monitors user activity across the application and automatically updates the backend with user presence information. This enables real-time monitoring of active users and their last activity timestamps.

## Architecture

### Components

1. **Backend API Endpoint**: `user/update-activity`
   - Accepts: `{ token, username }`
   - Updates: User's last activity timestamp in database
   - Returns: `{ success: boolean, timestamp: string }`

2. **API Service Function**: `updateUserActivity()` in `src/services/api2auth.js`
   - Silent failures to avoid console spam
   - Line 2847-2881

3. **Custom Hook**: `useUserActivity()` in `src/hooks/useUserActivity.js`
   - Auto-triggers on component mount (simulates login/page refresh)
   - Background task: Pings every **3 minutes** (180000ms)
   - Rate limiting: Minimum **10 seconds** between calls
   - Returns: `triggerActivity` function for manual triggers

4. **Activity Context**: `ActivityContext` in `src/context/ActivityContext.js`
   - Provides `triggerActivity` function to child components
   - Allows manual activity updates on save operations

5. **Active Users Panel**: `ActiveUsersPanel.js`
   - Displays real-time list of active users
   - Auto-refreshes every 30 seconds
   - Color-coded status indicators:
     - 🟢 Active: Last activity < 4:30 minutes
     - 🟡 Warning: Last activity 4:30-5:00 minutes
     - 🔴 Inactive: Last activity > 5 minutes

## Integration Points

### App Level (App.js)

```javascript
// Line 8: Import hook
import { useUserActivity } from './hooks/useUserActivity';

// Line 2517: Call hook with token and username from AuthContext
const { triggerActivity } = useUserActivity(token, username);

// Line 170: Wrap app with ActivityProvider
<ActivityProvider triggerActivity={triggerActivity}>
  <Router>
    {/* App routes */}
  </Router>
</ActivityProvider>
```

### Save Operations

#### User Management (UserManagementModal.js)

```javascript
// Line 5: Import hook
import { useActivity } from '../../context/ActivityContext';

// Line 530: Get trigger function
const { triggerActivity } = useActivity();

// Line 968: Trigger after successful save
triggerActivity(); // After successful create/update
```

#### Order Management (OrderForm25.js)

```javascript
// Line 10: Import hook
import { useActivity } from '../context/ActivityContext';

// Line 2518: Get trigger function
const { triggerActivity } = useActivity();

// Line 5284: Trigger after successful save
triggerActivity(); // In finally block after save
```

## Behavior

### Automatic Updates

1. **On Login/Page Refresh**: Immediate update when component mounts
2. **Background Interval**: Update every 3 minutes automatically
3. **Rate Limiting**: Prevents updates more frequent than 10 seconds

### Manual Updates

Triggered on any save operation:
- Creating/updating users
- Creating/updating orders
- Any other data modification operations

### Cleanup

- Background interval is cleared when component unmounts
- Prevents memory leaks and unnecessary API calls

## Backend Requirements

The backend endpoint `user/update-activity` should:

1. Accept POST request with `{ token, username }`
2. Validate authentication token
3. Update `last_activity` timestamp for the user
4. Return `{ success: true, timestamp: "2025-01-XX XX:XX:XX" }`
5. Handle errors gracefully (400/401/500)

## Frontend Error Handling

- Silent failures in `updateUserActivity()` to avoid console spam
- Rate limiting prevents excessive API calls
- No user-facing errors for activity tracking failures
- Failed updates don't block application functionality

## Usage Examples

### In a Component with Save Operation

```javascript
import { useActivity } from '../context/ActivityContext';

function MyComponent() {
  const { triggerActivity } = useActivity();

  const handleSave = async () => {
    try {
      await saveData();
      triggerActivity(); // Update activity after save
      showToast('Data saved successfully');
    } catch (error) {
      showToast('Save failed', { type: 'error' });
    }
  };

  return <button onClick={handleSave}>Save</button>;
}
```

### Rate Limiting Logic

```javascript
const lastUpdate = useRef(0);
const MIN_UPDATE_INTERVAL = 10000; // 10 seconds

const updateActivity = useCallback(async () => {
  const now = Date.now();
  if (now - lastUpdate.current < MIN_UPDATE_INTERVAL) {
    console.log('⏱️ Activity update skipped (rate limit)');
    return;
  }
  // ... update logic
  lastUpdate.current = now;
}, [token, username]);
```

## Monitoring Active Users

The `ActiveUsersPanel` component displays:

- List of all active users (last activity < 5 minutes)
- Full name and last activity time
- Color-coded status indicators
- Total count of active users
- Auto-refresh every 30 seconds

Status thresholds:
- **Active** (green): 0-4:30 minutes
- **Warning** (yellow): 4:30-5:00 minutes  
- **Inactive** (red): > 5:00 minutes

## Testing

### Manual Testing

1. **Login**: Check console for immediate activity update
2. **Wait 3 minutes**: Observe automatic background ping
3. **Save operation**: Verify activity update after save
4. **Rate limiting**: Try multiple quick saves (should skip some updates)
5. **Active users panel**: Check panel shows your user as active

### Debug Logs

Enable debug mode to see activity tracking in console:
- Mount trigger: `🎯 User activity tracked on mount`
- Background interval: `🔄 Background activity update triggered`
- Manual trigger: `⚡ Manual activity trigger`
- Rate limit skip: `⏱️ Activity update skipped (rate limit)`

## Future Enhancements

1. **Logout Event**: Add activity update before logout
2. **Session timeout**: Track idle time and auto-logout after threshold
3. **Presence indicators**: Show active users on orders/documents
4. **Activity history**: Track detailed user actions and timestamps
5. **Collaborative editing**: Warn when multiple users edit same document

## Files Modified/Created

### New Files
- `src/hooks/useUserActivity.js` - Activity tracking hook
- `src/context/ActivityContext.js` - Context for sharing trigger function
- `src/components/ActiveUsersPanel.js` - UI component for displaying active users
- `docs/USER-ACTIVITY-TRACKING.md` - This documentation

### Modified Files
- `src/App.js` - Integrated hook and ActivityProvider
- `src/services/api2auth.js` - Added updateUserActivity function
- `src/components/userManagement/UserManagementModal.js` - Added activity trigger on save
- `src/forms/OrderForm25.js` - Added activity trigger on save
- `src/pages/Users.js` - Integrated ActiveUsersPanel

## Configuration

```javascript
// Intervals (in milliseconds)
const BACKGROUND_INTERVAL = 180000;  // 3 minutes
const MIN_UPDATE_INTERVAL = 10000;   // 10 seconds (rate limit)
const REFRESH_INTERVAL = 30000;      // 30 seconds (active users panel)

// Activity thresholds (in minutes)
const ACTIVE_THRESHOLD = 4.5;        // < 4:30 = active (green)
const WARNING_THRESHOLD = 5.0;       // 4:30-5:00 = warning (yellow)
// > 5:00 = inactive (red)
```

## Troubleshooting

### Activity not updating
1. Check if token and username are valid
2. Verify backend endpoint is accessible
3. Check console for rate limiting messages
4. Ensure ActivityProvider wraps the component

### Too frequent updates
- Rate limiting should prevent updates < 10 seconds apart
- Check if multiple instances of the hook are running
- Verify cleanup on component unmount

### Background task not running
- Check if component is still mounted
- Verify 3-minute interval is set correctly
- Look for errors in browser console

---

**Last Updated**: 2025-01-XX  
**Version**: 1.0  
**Status**: ✅ Implemented and Integrated
