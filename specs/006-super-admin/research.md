````markdown
# 技術研究：超級管理員系統管理

**功能分支**: `006-super-admin`
**研究日期**: 2025-12-03

## 1. 使用者權限管理

### 決策

使用 Cloud Function (`updateAdminClaims`) 管理使用者的 Admin/SuperAdmin Custom Claims，配合前端即時驗證與保護機制。

### 理由

- Firebase Custom Claims 只能透過 Admin SDK 更新
- Cloud Function 可驗證呼叫者權限，防止非授權操作
- 需要實作「不能撤銷自己的權限」與「至少保留一位超級管理員」保護機制

### 實作細節

```typescript
// functions/src/super-admin/updateAdminClaims.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

interface UpdateClaimsRequest {
  targetUserId: string;
  claimType: 'admin' | 'superAdmin';
  grant: boolean; // true = 授予, false = 撤銷
}

export const updateAdminClaims = functions.https.onCall(
  async (data: UpdateClaimsRequest, context) => {
    // 驗證呼叫者是超級管理員
    if (!context.auth?.token.isSuperAdmin) {
      throw new functions.https.HttpsError(
        'permission-denied',
        '只有超級管理員可以執行此操作'
      );
    }

    const { targetUserId, claimType, grant } = data;
    const callerId = context.auth.uid;

    // 驗證參數
    if (!targetUserId || !claimType) {
      throw new functions.https.HttpsError('invalid-argument', '參數錯誤');
    }

    // 保護機制：不能撤銷自己的超級管理員權限
    if (targetUserId === callerId && claimType === 'superAdmin' && !grant) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        '無法撤銷自己的超級管理員權限'
      );
    }

    // 保護機制：確保至少保留一位超級管理員
    if (claimType === 'superAdmin' && !grant) {
      const superAdminCount = await countSuperAdmins();
      if (superAdminCount <= 1) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          '系統必須至少保留一位超級管理員'
        );
      }
    }

    try {
      // 取得目標使用者現有 Claims
      const user = await admin.auth().getUser(targetUserId);
      const currentClaims = user.customClaims || {};

      // 更新 Claims
      const newClaims = {
        ...currentClaims,
        [claimType === 'admin' ? 'isAdmin' : 'isSuperAdmin']: grant,
      };

      // 如果授予超級管理員，同時授予管理員權限
      if (claimType === 'superAdmin' && grant) {
        newClaims.isAdmin = true;
      }

      await admin.auth().setCustomUserClaims(targetUserId, newClaims);

      // 記錄操作
      await admin.firestore().collection('admin_logs').add({
        actionType: grant ? `grant_${claimType}` : `revoke_${claimType}`,
        adminId: callerId,
        targetId: targetUserId,
        details: { claimType, grant },
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true };
    } catch (error) {
      console.error('更新權限失敗:', error);
      throw new functions.https.HttpsError('internal', '更新失敗，請稍後再試');
    }
  }
);

// 計算超級管理員數量
async function countSuperAdmins(): Promise<number> {
  // 方法 1: 查詢 Firestore 使用者文件
  // 需要在授予/撤銷時同步更新 Firestore
  const snapshot = await admin.firestore()
    .collection('users')
    .where('isSuperAdmin', '==', true)
    .get();
  return snapshot.size;
  
  // 方法 2: 使用 Firebase Admin listUsers (較慢，不建議)
  // 需要遍歷所有使用者檢查 Claims
}
```

### 前端呼叫

```typescript
// src/hooks/useUserManagement.ts
import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

const updateAdminClaimsFunction = httpsCallable(functions, 'updateAdminClaims');

export const useUserManagement = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grantAdminRole = async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      await updateAdminClaimsFunction({ 
        targetUserId: userId, 
        claimType: 'admin', 
        grant: true 
      });
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const revokeAdminRole = async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      await updateAdminClaimsFunction({ 
        targetUserId: userId, 
        claimType: 'admin', 
        grant: false 
      });
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { grantAdminRole, revokeAdminRole, loading, error };
};
```

### 考慮的替代方案

| 方案 | 優點 | 缺點 |
|------|------|------|
| 僅用 Firestore 標記 | 無需 Cloud Function | 無法真正控制 Auth Token 權限 |
| Firebase Admin SDK 直接呼叫 | 最直接 | 前端無法安全呼叫 |
| 使用 Firestore Trigger | 自動同步 | 增加複雜度，延遲較高 |

---

## 2. 標籤管理

### 決策

標籤 CRUD 操作直接透過 Firestore SDK，刪除標籤時使用 Cloud Function 批次更新相關地點。

### 理由

- 新增/編輯標籤操作簡單，無需 Cloud Function
- 刪除標籤需要從所有使用該標籤的地點移除，可能涉及大量文件更新
- Cloud Function 可在背景批次處理，避免前端超時

### 實作細節

```typescript
// src/hooks/useTagManagement.ts
import { useState } from 'react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc,
  query,
  where,
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

const deleteTagWithCleanup = httpsCallable(functions, 'deleteTagFromLocations');

export const useTagManagement = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 新增標籤
  const createTag = async (name: string) => {
    if (!user) throw new Error('未登入');
    setLoading(true);
    setError(null);

    try {
      // 檢查名稱唯一性
      const existing = await getDocs(query(
        collection(db, 'tags'),
        where('name', '==', name)
      ));
      
      if (!existing.empty) {
        throw new Error('標籤名稱已存在');
      }

      const docRef = await addDoc(collection(db, 'tags'), {
        name,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      });

      // 記錄操作
      await addDoc(collection(db, 'admin_logs'), {
        actionType: 'create_tag',
        adminId: user.uid,
        targetId: docRef.id,
        details: { tagName: name },
        timestamp: serverTimestamp(),
      });

      return docRef.id;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 編輯標籤
  const updateTag = async (tagId: string, name: string) => {
    if (!user) throw new Error('未登入');
    setLoading(true);
    setError(null);

    try {
      // 檢查名稱唯一性（排除自己）
      const existing = await getDocs(query(
        collection(db, 'tags'),
        where('name', '==', name)
      ));
      
      const isDuplicate = existing.docs.some(d => d.id !== tagId);
      if (isDuplicate) {
        throw new Error('標籤名稱已存在');
      }

      await updateDoc(doc(db, 'tags', tagId), {
        name,
        updatedAt: serverTimestamp(),
      });

      // 記錄操作
      await addDoc(collection(db, 'admin_logs'), {
        actionType: 'update_tag',
        adminId: user.uid,
        targetId: tagId,
        details: { newName: name },
        timestamp: serverTimestamp(),
      });
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 刪除標籤（透過 Cloud Function）
  const deleteTag = async (tagId: string, tagName: string) => {
    if (!user) throw new Error('未登入');
    setLoading(true);
    setError(null);

    try {
      await deleteTagWithCleanup({ tagId, tagName });
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 取得標籤使用次數
  const getTagUsageCount = async (tagId: string): Promise<number> => {
    const snapshot = await getDocs(query(
      collection(db, 'locations'),
      where('tagIds', 'array-contains', tagId)
    ));
    return snapshot.size;
  };

  return { createTag, updateTag, deleteTag, getTagUsageCount, loading, error };
};
```

```typescript
// functions/src/super-admin/deleteTagFromLocations.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

interface DeleteTagRequest {
  tagId: string;
  tagName: string;
}

export const deleteTagFromLocations = functions.https.onCall(
  async (data: DeleteTagRequest, context) => {
    // 驗證超級管理員權限
    if (!context.auth?.token.isSuperAdmin) {
      throw new functions.https.HttpsError(
        'permission-denied',
        '只有超級管理員可以執行此操作'
      );
    }

    const { tagId, tagName } = data;
    const db = admin.firestore();

    try {
      // 1. 找出所有使用此標籤的地點
      const locationsSnapshot = await db
        .collection('locations')
        .where('tagIds', 'array-contains', tagId)
        .get();

      // 2. 批次更新（每次最多 500 筆）
      const batchSize = 500;
      let processed = 0;
      
      while (processed < locationsSnapshot.size) {
        const batch = db.batch();
        const chunk = locationsSnapshot.docs.slice(processed, processed + batchSize);
        
        chunk.forEach(doc => {
          const currentTags = doc.data().tagIds || [];
          const newTags = currentTags.filter((id: string) => id !== tagId);
          batch.update(doc.ref, { tagIds: newTags });
        });
        
        await batch.commit();
        processed += chunk.length;
      }

      // 3. 刪除標籤文件
      await db.collection('tags').doc(tagId).delete();

      // 4. 記錄操作
      await db.collection('admin_logs').add({
        actionType: 'delete_tag',
        adminId: context.auth.uid,
        targetId: tagId,
        details: { 
          tagName, 
          affectedLocations: locationsSnapshot.size 
        },
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { 
        success: true, 
        affectedLocations: locationsSnapshot.size 
      };
    } catch (error) {
      console.error('刪除標籤失敗:', error);
      throw new functions.https.HttpsError('internal', '刪除失敗，請稍後再試');
    }
  }
);
```

---

## 3. 使用者列表與搜尋

### 決策

使用 Firestore 分頁查詢配合客戶端搜尋過濾，支援按 Email 或顯示名稱搜尋。

### 理由

- Firestore 不支援全文搜尋，但可用 `>=` 和 `<` 實現前綴搜尋
- 使用者列表預期 < 10,000 人，分頁載入後客戶端過濾效能足夠
- 避免外部搜尋服務（如 Algolia）的額外成本

### 實作細節

```typescript
// src/hooks/useUsersList.ts
import { useState, useCallback, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  getDocs,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface UserDocument {
  id: string;
  email: string;
  displayName: string;
  createdAt: Timestamp;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  isWildernessPartner?: boolean;
}

const PAGE_SIZE = 50;

export const useUsersList = () => {
  const [users, setUsers] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'superAdmin' | 'wilderness'>('all');

  const buildQuery = useCallback(() => {
    let q = query(
      collection(db, 'users'),
      orderBy('email'),
      limit(PAGE_SIZE)
    );

    // 角色篩選
    if (roleFilter === 'admin') {
      q = query(q, where('isAdmin', '==', true));
    } else if (roleFilter === 'superAdmin') {
      q = query(q, where('isSuperAdmin', '==', true));
    } else if (roleFilter === 'wilderness') {
      q = query(q, where('isWildernessPartner', '==', true));
    }

    return q;
  }, [roleFilter]);

  const fetchUsers = useCallback(async (isFirstPage = true) => {
    setLoading(true);
    
    try {
      let q = buildQuery();
      
      if (!isFirstPage && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as UserDocument[];

      if (isFirstPage) {
        setUsers(docs);
      } else {
        setUsers(prev => [...prev, ...docs]);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (error) {
      console.error('載入使用者列表失敗:', error);
    } finally {
      setLoading(false);
    }
  }, [buildQuery, lastDoc]);

  // 客戶端搜尋過濾
  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return user.email.toLowerCase().includes(term) ||
           user.displayName?.toLowerCase().includes(term);
  });

  // 當篩選條件改變時重新載入
  useEffect(() => {
    setLastDoc(null);
    fetchUsers(true);
  }, [roleFilter]);

  return { 
    users: filteredUsers, 
    loading, 
    hasMore, 
    loadMore: () => fetchUsers(false),
    refresh: () => { setLastDoc(null); fetchUsers(true); },
    searchTerm,
    setSearchTerm,
    roleFilter,
    setRoleFilter,
  };
};
```

---

## 4. 系統日誌查詢

### 決策

使用 Firestore 查詢配合無限捲動，限制查詢範圍為最近 90 天。

### 理由

- 90 天限制避免查詢過大的資料集，保持效能
- 無限捲動提供流暢的使用者體驗
- 支援按操作類型、操作者、時間範圍篩選

### 實作細節

```typescript
// src/hooks/useSystemLogs.ts
import { useState, useCallback, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  getDocs,
  Timestamp,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AdminActionLog, AdminActionType } from '@/types';

const PAGE_SIZE = 30;
const MAX_DAYS = 90;

interface LogFilters {
  actionType?: AdminActionType;
  adminId?: string;
  startDate?: Date;
  endDate?: Date;
}

export const useSystemLogs = () => {
  const [logs, setLogs] = useState<AdminActionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [filters, setFilters] = useState<LogFilters>({});

  const fetchLogs = useCallback(async (isFirstPage = true) => {
    setLoading(true);
    
    try {
      // 90 天限制
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - MAX_DAYS);
      
      let q = query(
        collection(db, 'admin_logs'),
        where('timestamp', '>=', Timestamp.fromDate(ninetyDaysAgo)),
        orderBy('timestamp', 'desc'),
        limit(PAGE_SIZE)
      );

      // 套用篩選條件
      if (filters.actionType) {
        q = query(q, where('actionType', '==', filters.actionType));
      }
      if (filters.adminId) {
        q = query(q, where('adminId', '==', filters.adminId));
      }
      if (filters.startDate) {
        q = query(q, where('timestamp', '>=', Timestamp.fromDate(filters.startDate)));
      }
      if (filters.endDate) {
        q = query(q, where('timestamp', '<=', Timestamp.fromDate(filters.endDate)));
      }

      if (!isFirstPage && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as AdminActionLog[];

      if (isFirstPage) {
        setLogs(docs);
      } else {
        setLogs(prev => [...prev, ...docs]);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (error) {
      console.error('載入系統日誌失敗:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, lastDoc]);

  useEffect(() => {
    setLastDoc(null);
    fetchLogs(true);
  }, [filters]);

  return { 
    logs, 
    loading, 
    hasMore, 
    loadMore: () => fetchLogs(false),
    filters,
    setFilters,
  };
};
```

---

## 5. 平台設定管理

### 決策

使用單一 Firestore 文件 (`/platform_settings/config`) 儲存所有平台設定，配合即時監聽同步到所有客戶端。

### 理由

- 單一文件便於管理，減少讀取次數
- Firestore realtime listener 可即時同步設定變更
- 設定項目數量少，單一文件大小不會有問題

### 實作細節

```typescript
// src/types/platformSettings.ts
import { GeoPoint, Timestamp } from 'firebase/firestore';

export interface PlatformSettings {
  defaultMapCenter: GeoPoint;
  defaultZoomLevel: number;
  reviewDeadlineDays: number;
  maxDailyUploads: number;
  updatedAt?: Timestamp;
  updatedBy?: string;
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  defaultMapCenter: new GeoPoint(22.6273, 120.3014), // 高雄車站
  defaultZoomLevel: 13,
  reviewDeadlineDays: 3,
  maxDailyUploads: 5,
};

// 驗證規則
export const settingsValidation = {
  defaultMapCenter: {
    latitude: { min: -90, max: 90 },
    longitude: { min: -180, max: 180 },
  },
  defaultZoomLevel: { min: 1, max: 20 },
  reviewDeadlineDays: { min: 1, max: 30 },
  maxDailyUploads: { min: 1, max: 20 },
};
```

```typescript
// src/hooks/usePlatformSettings.ts
import { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc, serverTimestamp, GeoPoint } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { PlatformSettings, DEFAULT_PLATFORM_SETTINGS, settingsValidation } from '@/types/platformSettings';

export const usePlatformSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_PLATFORM_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 即時監聽設定變更
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'platform_settings', 'config'),
      (snapshot) => {
        if (snapshot.exists()) {
          setSettings(snapshot.data() as PlatformSettings);
        } else {
          setSettings(DEFAULT_PLATFORM_SETTINGS);
        }
        setLoading(false);
      },
      (err) => {
        console.error('監聽設定失敗:', err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  // 驗證設定值
  const validateSettings = (newSettings: Partial<PlatformSettings>): string | null => {
    const v = settingsValidation;

    if (newSettings.defaultMapCenter) {
      const { latitude, longitude } = newSettings.defaultMapCenter;
      if (latitude < v.defaultMapCenter.latitude.min || latitude > v.defaultMapCenter.latitude.max) {
        return '緯度必須在 -90 到 90 之間';
      }
      if (longitude < v.defaultMapCenter.longitude.min || longitude > v.defaultMapCenter.longitude.max) {
        return '經度必須在 -180 到 180 之間';
      }
    }

    if (newSettings.defaultZoomLevel !== undefined) {
      if (newSettings.defaultZoomLevel < v.defaultZoomLevel.min || 
          newSettings.defaultZoomLevel > v.defaultZoomLevel.max) {
        return `縮放層級必須在 ${v.defaultZoomLevel.min} 到 ${v.defaultZoomLevel.max} 之間`;
      }
    }

    if (newSettings.reviewDeadlineDays !== undefined) {
      if (newSettings.reviewDeadlineDays < v.reviewDeadlineDays.min || 
          newSettings.reviewDeadlineDays > v.reviewDeadlineDays.max) {
        return `審核時限必須在 ${v.reviewDeadlineDays.min} 到 ${v.reviewDeadlineDays.max} 天之間`;
      }
    }

    if (newSettings.maxDailyUploads !== undefined) {
      if (newSettings.maxDailyUploads < v.maxDailyUploads.min || 
          newSettings.maxDailyUploads > v.maxDailyUploads.max) {
        return `每日上傳限制必須在 ${v.maxDailyUploads.min} 到 ${v.maxDailyUploads.max} 之間`;
      }
    }

    return null;
  };

  // 更新設定
  const updateSettings = async (newSettings: Partial<PlatformSettings>) => {
    if (!user) throw new Error('未登入');
    
    const validationError = validateSettings(newSettings);
    if (validationError) {
      setError(validationError);
      throw new Error(validationError);
    }

    setSaving(true);
    setError(null);

    try {
      await updateDoc(doc(db, 'platform_settings', 'config'), {
        ...newSettings,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });

      // 記錄操作
      await addDoc(collection(db, 'admin_logs'), {
        actionType: 'update_settings',
        adminId: user.uid,
        targetId: 'config',
        details: newSettings,
        timestamp: serverTimestamp(),
      });
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return { settings, loading, saving, error, updateSettings };
};
```

---

## 6. 超級管理員初始化

### 決策

透過 Firebase CLI 或 Firebase Console 手動設定第一位超級管理員的 Custom Claims。

### 理由

- 避免「雞生蛋、蛋生雞」問題：需要超級管理員才能授予超級管理員權限
- 一次性操作，安全性高
- 無需額外的初始化 UI 或 API

### 實作細節

```bash
# 使用 Firebase Admin SDK 腳本設定初始超級管理員
node scripts/set-super-admin.js <user-uid>
```

```javascript
// scripts/set-super-admin.js
const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const uid = process.argv[2];

if (!uid) {
  console.error('請提供使用者 UID');
  process.exit(1);
}

admin.auth().setCustomUserClaims(uid, { 
  isAdmin: true, 
  isSuperAdmin: true 
})
  .then(() => {
    console.log('成功設定超級管理員權限');
    
    // 同步更新 Firestore
    return admin.firestore().doc(`users/${uid}`).update({
      isAdmin: true,
      isSuperAdmin: true,
    });
  })
  .then(() => {
    console.log('Firestore 同步完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('設定失敗:', error);
    process.exit(1);
  });
```

````
