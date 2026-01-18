# NeoQueue Mobile Sync Implementation Plan

> **Goal**: Enable real-time sync between the Windows/Mac/Linux Electron app and Android phones, with offline support on both platforms.

**Decision Summary**:
- **Backend**: Firebase (Firestore + Auth) - free tier, no server maintenance
- **Mobile**: PWA (Progressive Web App) - fastest path, installable on Android
- **Sync Model**: Local-first with cloud sync, last-write-wins conflict resolution
- **Auth**: Anonymous auth now, upgradeable to Google/email later
- **Multi-user**: Data structure supports it, UI not implemented yet

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Phase 1: Firebase Setup](#phase-1-firebase-setup)
3. [Phase 2: Data Layer Refactor](#phase-2-data-layer-refactor)
4. [Phase 3: Sync Engine](#phase-3-sync-engine)
5. [Phase 4: PWA Configuration](#phase-4-pwa-configuration)
6. [Phase 5: Testing & Polish](#phase-5-testing--polish)
7. [Future: Multi-User Support](#future-multi-user-support)
8. [LLM Implementation Guide](#llm-implementation-guide)

---

## Architecture Overview

### Current Architecture
```
┌─────────────────┐
│  Electron App   │
│  (React + TS)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  electron-store │
│  (local JSON)   │
└─────────────────┘
```

### Target Architecture
```
┌─────────────────┐                    ┌─────────────────┐
│  Electron App   │                    │   Phone (PWA)   │
│  (React + TS)   │                    │  (Same React)   │
└────────┬────────┘                    └────────┬────────┘
         │                                      │
         ▼                                      ▼
┌─────────────────┐                    ┌─────────────────┐
│  Local Cache    │                    │  IndexedDB      │
│  (electron-store)│                   │  (via Firebase) │
└────────┬────────┘                    └────────┬────────┘
         │                                      │
         └──────────────┬───────────────────────┘
                        ▼
              ┌─────────────────┐
              │    Firebase     │
              │   Firestore     │
              │  (Cloud Sync)   │
              └─────────────────┘
```

### Data Flow
1. User makes a change (add item, complete item, etc.)
2. Change is written to local cache immediately (instant UI response)
3. Change is queued for sync to Firestore
4. Firestore propagates change to all connected devices
5. Other devices receive real-time update via Firestore listeners

---

## Phase 1: Firebase Setup

**Estimated time: 2-3 hours**

### 1.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create new project: `neoqueue` (or similar)
3. Disable Google Analytics (not needed, simplifies setup)

### 1.2 Enable Services

**Firestore Database:**
- Create database in **production mode**
- Choose region closest to you (e.g., `us-east1` or `europe-west1`)

**Authentication:**
- Enable **Anonymous** sign-in method
- (Optional for later) Enable Google sign-in

### 1.3 Security Rules

Set Firestore security rules to restrict access to user's own data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 1.4 Get Configuration

From Project Settings > General > Your apps > Web app:
- Register a web app
- Copy the `firebaseConfig` object

### 1.5 Install Dependencies

```bash
npm install firebase
```

**Files to create:**
- `src/shared/firebase.ts` - Firebase initialization and config

---

## Phase 2: Data Layer Refactor

**Estimated time: 1-2 days**

### 2.1 Update Data Types

Modify `src/shared/types.ts` to add sync metadata:

```typescript
// Add to existing types
export interface SyncMetadata {
  /** Timestamp of last modification (for last-write-wins) */
  updatedAt: number;
  /** Device ID that made the last change */
  updatedBy: string;
  /** Sync status for offline tracking */
  syncStatus: 'synced' | 'pending' | 'conflict';
}

// Extend QueueItem
export interface QueueItem {
  // ... existing fields ...
  _sync?: SyncMetadata;
}

// Extend Project
export interface Project {
  // ... existing fields ...
  _sync?: SyncMetadata;
}
```

### 2.2 Firestore Data Structure

```
firestore/
└── users/
    └── {userId}/
        ├── profile/
        │   └── settings (document)
        │       ├── experimentalFlags
        │       ├── matrixRain
        │       └── activeProjectId
        ├── items/
        │   └── {itemId} (document)
        │       ├── text
        │       ├── createdAt
        │       ├── completedAt
        │       ├── isCompleted
        │       ├── followUps[]
        │       ├── projectId
        │       └── _sync
        ├── projects/
        │   └── {projectId} (document)
        │       ├── name
        │       ├── createdAt
        │       ├── completedAt
        │       ├── isCompleted
        │       └── _sync
        ├── commands/
        │   └── {commandId} (document)
        └── dictionary/
            └── tokens (document)
```

### 2.3 Create Sync Service

Create `src/shared/services/syncService.ts`:

**Responsibilities:**
- Initialize Firebase and authenticate
- Provide CRUD operations that write to both local and cloud
- Set up real-time listeners for remote changes
- Handle offline queue and retry logic
- Implement last-write-wins conflict resolution

**Key functions:**
```typescript
// Initialize and authenticate
initializeSync(): Promise<string> // returns userId

// CRUD with sync
addItem(item: QueueItem): Promise<void>
updateItem(id: string, updates: Partial<QueueItem>): Promise<void>
deleteItem(id: string): Promise<void>

// Real-time listeners
subscribeToItems(callback: (items: QueueItem[]) => void): Unsubscribe
subscribeToProjects(callback: (projects: Project[]) => void): Unsubscribe

// Offline handling
getSyncStatus(): 'online' | 'offline' | 'syncing'
forceSyncNow(): Promise<void>
```

### 2.4 Create Platform Abstraction

Create `src/shared/services/storageService.ts`:

This abstracts the difference between Electron and PWA storage:

```typescript
interface StorageService {
  // For Electron: uses electron-store as local cache
  // For PWA: uses IndexedDB (Firebase handles this automatically)
  
  getLocalData(): Promise<AppState>
  setLocalData(data: AppState): Promise<void>
  isElectron(): boolean
}
```

### 2.5 Refactor useQueueData Hook

Update `src/renderer/hooks/useQueueData.ts`:

- Replace direct `electron-store` calls with `syncService` calls
- Add real-time subscription setup in `useEffect`
- Add sync status indicator state
- Handle initial load: local first, then merge with cloud

---

## Phase 3: Sync Engine

**Estimated time: 1-2 days**

### 3.1 Authentication Flow

```typescript
// src/shared/services/authService.ts

import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

export async function initAuth(): Promise<string> {
  const auth = getAuth();
  
  // Check for existing session
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      
      if (user) {
        resolve(user.uid);
      } else {
        // First time - create anonymous account
        const result = await signInAnonymously(auth);
        resolve(result.user.uid);
      }
    });
  });
}
```

### 3.2 Real-Time Sync Implementation

```typescript
// Pseudocode for sync logic

function setupRealtimeSync(userId: string) {
  const itemsRef = collection(db, `users/${userId}/items`);
  
  // Listen for remote changes
  onSnapshot(itemsRef, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added' || change.type === 'modified') {
        const remoteItem = change.doc.data();
        const localItem = getLocalItem(change.doc.id);
        
        // Last-write-wins: compare updatedAt timestamps
        if (!localItem || remoteItem._sync.updatedAt > localItem._sync.updatedAt) {
          updateLocalItem(change.doc.id, remoteItem);
        }
      }
      if (change.type === 'removed') {
        removeLocalItem(change.doc.id);
      }
    });
  });
}
```

### 3.3 Offline Queue

Firebase Firestore has **built-in offline persistence**. Enable it:

```typescript
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';

const db = initializeFirestore(app, {
  localCache: persistentLocalCache()
});
```

This means:
- Writes while offline are queued automatically
- Reads while offline return cached data
- When back online, queued writes sync automatically

### 3.4 First-Time Migration

For existing users with local data, need to migrate to cloud:

```typescript
async function migrateLocalToCloud(userId: string) {
  const localData = await getLocalData(); // from electron-store
  
  if (localData.items.length > 0) {
    const batch = writeBatch(db);
    
    for (const item of localData.items) {
      const ref = doc(db, `users/${userId}/items`, item.id);
      batch.set(ref, {
        ...item,
        _sync: {
          updatedAt: Date.now(),
          updatedBy: getDeviceId(),
          syncStatus: 'synced'
        }
      });
    }
    
    await batch.commit();
  }
}
```

---

## Phase 4: PWA Configuration

**Estimated time: 0.5 day**

### 4.1 Install Vite PWA Plugin

```bash
npm install -D vite-plugin-pwa
```

### 4.2 Configure Vite

Update `vite.config.ts`:

```typescript
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon.svg'],
      manifest: {
        name: 'NeoQueue',
        short_name: 'NeoQueue',
        description: 'Track discussion points with your manager',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firestore-cache',
              networkTimeoutSeconds: 10
            }
          }
        ]
      }
    })
  ]
});
```

### 4.3 Create PWA Icons

Need to create:
- `public/icon-192.png` (192x192)
- `public/icon-512.png` (512x512)
- `public/favicon.ico`

Can generate from existing `assets/icon.svg`.

### 4.4 Platform Detection

Create `src/shared/utils/platform.ts`:

```typescript
export function isElectron(): boolean {
  return typeof window !== 'undefined' && 
         window.electronAPI !== undefined;
}

export function isPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
}

export function isMobile(): boolean {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}
```

### 4.5 Conditional Electron Features

Wrap Electron-specific features:

```typescript
// In components that use electron APIs
if (isElectron()) {
  window.electronAPI.someElectronFeature();
} else {
  // PWA fallback or hide feature
}
```

Features to handle:
- Window controls (minimize, maximize, close) - hide in PWA
- System tray - not available in PWA
- Global shortcuts - not available in PWA
- File export - use browser download API instead

### 4.6 Responsive Design

Current UI is desktop-focused. Need mobile-friendly adjustments:

- Touch-friendly tap targets (min 44px)
- Responsive layout for narrow screens
- Swipe gestures for common actions (optional)
- Virtual keyboard handling

**Key files to update:**
- `src/renderer/styles/App.css`
- `src/renderer/components/*.css`

---

## Phase 5: Testing & Polish

**Estimated time: 1-2 days**

### 5.1 Test Scenarios

| Scenario | Test Steps | Expected Result |
|----------|------------|-----------------|
| Basic sync | Add item on PC, check phone | Item appears on phone within seconds |
| Reverse sync | Add item on phone, check PC | Item appears on PC within seconds |
| Offline PC | Disconnect PC, add item, reconnect | Item syncs to phone after reconnect |
| Offline phone | Disconnect phone, add item, reconnect | Item syncs to PC after reconnect |
| Conflict | Edit same item on both devices while offline, reconnect | Last-write-wins, most recent edit preserved |
| First migration | Open Electron app with existing local data | Data uploads to cloud, syncs to phone |
| Fresh install | Install PWA on new device | Sees all existing data after login |

### 5.2 Sync Status UI

Add visual indicator showing sync status:
- 🟢 Synced (all changes uploaded)
- 🟡 Syncing (upload in progress)
- 🔴 Offline (changes queued)

Location: Near the title bar or as a small indicator.

### 5.3 Error Handling

Handle common issues:
- Network errors (retry with exponential backoff)
- Auth expiration (re-authenticate automatically)
- Quota exceeded (shouldn't happen on free tier, but warn user)
- Data corruption (validate on load, offer reset option)

### 5.4 Deployment

**PWA Hosting Options (free):**

1. **Firebase Hosting** (recommended - keeps everything in Firebase)
   ```bash
   npm install -g firebase-tools
   firebase init hosting
   firebase deploy
   ```

2. **Vercel** (easy, fast)
   - Connect GitHub repo
   - Auto-deploys on push

3. **GitHub Pages** (if you want to use GitHub)
   - Works for static PWA hosting (not for backend, which Firebase handles)

---

## Future: Multi-User Support

**Not implementing now, but data structure supports it.**

### Sharing Model

```
firestore/
├── users/{userId}/
│   ├── items/          # Personal items
│   └── sharedWith/     # References to shared spaces
└── shared/{shareId}/
    ├── metadata/
    │   ├── owner: userId
    │   ├── members: [userId1, userId2]
    │   └── name: "Team Queue"
    ├── items/
    └── projects/
```

### Security Rules for Sharing

```javascript
match /shared/{shareId}/{document=**} {
  allow read, write: if request.auth.uid in 
    get(/databases/$(database)/documents/shared/$(shareId)/metadata).data.members;
}
```

### UI Additions Needed (later)

- Share button on projects
- Accept/decline share invitations
- Shared vs personal toggle
- Member management

---

## LLM Implementation Guide

**For Claude, GPT-4, or other LLMs implementing this plan:**

### Context

NeoQueue is an Electron + React + TypeScript app that tracks discussion items. Currently uses `electron-store` for local persistence. This plan adds Firebase sync and PWA support for mobile access.

### Key Files to Modify

```
src/
├── shared/
│   ├── types.ts              # ADD: SyncMetadata interface
│   ├── firebase.ts           # CREATE: Firebase init & config
│   └── services/
│       ├── authService.ts    # CREATE: Anonymous auth
│       ├── syncService.ts    # CREATE: Firestore CRUD + real-time
│       └── storageService.ts # CREATE: Platform abstraction
├── renderer/
│   ├── hooks/
│   │   └── useQueueData.ts   # MODIFY: Use syncService instead of electron-store
│   ├── components/
│   │   ├── SyncStatus.tsx    # CREATE: Sync indicator component
│   │   └── *.css             # MODIFY: Add responsive styles
│   └── App.tsx               # MODIFY: Initialize sync on mount
├── main/
│   └── main.ts               # MODIFY: Keep electron-store as local cache only
vite.config.ts                # MODIFY: Add PWA plugin config
public/
├── icon-192.png              # CREATE: PWA icon
├── icon-512.png              # CREATE: PWA icon
└── manifest.json             # AUTO-GENERATED by vite-plugin-pwa
```

### Implementation Order

1. **Firebase Setup** (external - Firebase Console)
   - Create project, enable Firestore + Anonymous Auth
   - Copy config to `src/shared/firebase.ts`

2. **Create `src/shared/firebase.ts`**
   ```typescript
   import { initializeApp } from 'firebase/app';
   import { getFirestore, initializeFirestore, persistentLocalCache } from 'firebase/firestore';
   import { getAuth } from 'firebase/auth';

   const firebaseConfig = {
     // Paste config from Firebase Console
   };

   export const app = initializeApp(firebaseConfig);
   export const db = initializeFirestore(app, {
     localCache: persistentLocalCache()
   });
   export const auth = getAuth(app);
   ```

3. **Create `src/shared/services/authService.ts`**
   - Implement `initAuth()` that signs in anonymously
   - Persist userId for consistent identity across sessions

4. **Create `src/shared/services/syncService.ts`**
   - Implement Firestore CRUD functions
   - Set up real-time listeners with `onSnapshot`
   - Add `_sync` metadata to all writes with current timestamp
   - Handle first-time migration from electron-store

5. **Modify `src/renderer/hooks/useQueueData.ts`**
   - Replace `window.electronAPI.loadData()` with syncService
   - Add `useEffect` to set up real-time subscriptions
   - Keep local state in sync with Firestore changes

6. **Add PWA Configuration**
   - Install `vite-plugin-pwa`
   - Configure in `vite.config.ts`
   - Create PWA icons from existing SVG

7. **Add Platform Detection & Conditional Features**
   - Create `isElectron()` utility
   - Hide window controls in PWA mode
   - Use browser download API for exports in PWA

8. **Add Responsive CSS**
   - Make touch targets 44px minimum
   - Add mobile breakpoints
   - Test on narrow screens

9. **Add Sync Status Indicator**
   - Show connection state to user
   - Display pending changes count when offline

### Critical Implementation Notes

1. **Don't break Electron app**: It must continue working. electron-store stays as local cache.

2. **Firestore offline persistence**: Enable it! This makes offline work "just work":
   ```typescript
   initializeFirestore(app, { localCache: persistentLocalCache() })
   ```

3. **Last-write-wins**: Always include `updatedAt: Date.now()` in writes. Compare timestamps when merging.

4. **Device ID**: Generate and persist a unique device ID for tracking which device made changes:
   ```typescript
   const deviceId = localStorage.getItem('deviceId') || crypto.randomUUID();
   localStorage.setItem('deviceId', deviceId);
   ```

5. **Migration safety**: When migrating local data to cloud, check if cloud already has data to avoid duplicates:
   ```typescript
   const cloudItems = await getDocs(itemsRef);
   if (cloudItems.empty) {
     // Safe to migrate
   }
   ```

6. **Date handling**: Firestore uses its own Timestamp type. Convert properly:
   ```typescript
   import { Timestamp } from 'firebase/firestore';
   // To Firestore: Timestamp.fromDate(new Date())
   // From Firestore: timestamp.toDate()
   ```

### Testing Commands

```bash
# Run Electron app (development)
npm run dev

# Build PWA for testing
npm run build
npx serve dist  # Serve the built PWA locally

# Deploy PWA to Firebase Hosting
firebase deploy --only hosting
```

### Environment Variables

Create `.env` for Firebase config (optional, can hardcode for personal project):
```
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx
```

---

## Checklist

- [ ] Firebase project created
- [ ] Firestore database initialized
- [ ] Anonymous auth enabled
- [ ] Security rules configured
- [ ] `firebase.ts` created with config
- [ ] `authService.ts` implemented
- [ ] `syncService.ts` implemented
- [ ] `useQueueData.ts` refactored
- [ ] PWA plugin configured
- [ ] PWA icons created
- [ ] Platform detection added
- [ ] Responsive CSS added
- [ ] Sync status indicator added
- [ ] Local → cloud migration tested
- [ ] PC → phone sync tested
- [ ] Phone → PC sync tested
- [ ] Offline scenarios tested
- [ ] PWA deployed to hosting

---

*Plan created: January 2026*
*Estimated total effort: 1.5-2 weeks*
