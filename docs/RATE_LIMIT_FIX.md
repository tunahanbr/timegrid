# Rate Limiting Issue - Fixed

## Problem
When going offline, creating a time entry, then coming back online, the app would:
1. Try to sync the queued entry (making multiple API calls)
2. Hit the rate limiter (was set to only 5 requests per 15 min in production)
3. Get logged out
4. Unable to log back in due to "Too many requests" error

## Root Cause
- **Auth rate limiter** was too strict: 5 requests per 15 minutes in production
- **API rate limiter** was too low: 100 requests per 15 minutes
- Offline sync operations make multiple API calls (insert entry + get tags + create tag associations)
- No delay between sync operations, causing burst requests

## Solution Applied

### 1. Increased Rate Limits
- **Auth limiter**: 5 → 20 requests per 15 min (production)
- **API limiter**: 100 → 200 requests per 15 min
- Added skip logic for localhost in development (no rate limiting during local testing)

### 2. Added Sync Delays
- Added 100ms delay between each sync operation to avoid burst requests
- Prevents overwhelming the rate limiter when syncing multiple items

### Changes Made

#### Backend (`backend/server/index.js`)
```javascript
// Auth rate limiter - increased from 5 to 20
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 20 : 100, // ← Changed
  skip: (req) => process.env.NODE_ENV !== 'production' && 
                 (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1'), // ← Added
  // ...
});

// API rate limiter - increased from 100 to 200
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200, // ← Changed
  skip: (req) => process.env.NODE_ENV !== 'production' && 
                 (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1'), // ← Added
  // ...
});
```

#### Frontend (`frontend/src/lib/offline-sync.ts`)
```typescript
// Added 100ms delay between sync operations
for (const operation of this.queue) {
  try {
    await this.executeOperation(operation);
    // ... success handling ...
    
    // Add delay to avoid rate limiting
    if (this.queue.indexOf(operation) < this.queue.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } catch (error) {
    // ... error handling ...
  }
}
```

## How to Apply the Fix

1. **Restart the backend server** to apply the new rate limits:
   ```bash
   cd backend/server
   # Stop current server (Ctrl+C if running)
   node index.js
   ```

2. **Refresh the frontend** (the changes will be applied automatically)

3. **Wait 15 minutes** if you're currently rate-limited, or restart the server to reset the rate limiter memory

## Testing the Fix

1. Login to the app
2. Turn off your internet connection
3. Create a time entry while offline
4. Turn internet back on
5. The entry should sync successfully without hitting rate limits
6. You should remain logged in

## Prevention Tips

- Don't rapidly create/update multiple items when coming back online
- The sync indicator will show when items are being synced
- If you see "Syncing X changes", wait for it to complete before making more changes

## Emergency: Still Rate Limited?

If you're still stuck with "Too many requests" error:

1. **Wait 15 minutes** - the rate limit window will reset
2. **Restart the backend server** - this will clear the in-memory rate limiter
3. **Check your IP** - make sure you're connecting from localhost in development

## Future Improvements

Consider these enhancements:
- Store rate limiter state in Redis instead of memory (survives server restarts)
- Implement exponential backoff for failed sync operations
- Add batch API endpoints to reduce number of requests
- Use WebSocket for real-time sync instead of HTTP polling
