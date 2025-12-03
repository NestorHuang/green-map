````markdown
# 技術研究：管理員審核與管理

**功能分支**: `005-admin-management`
**研究日期**: 2025-12-03

## 1. 樂觀鎖定 (Optimistic Locking) 實作

### 決策

使用 Firestore `runTransaction` 配合文件 `version` 欄位進行樂觀鎖定衝突檢測。

### 理由

- Firestore Transaction 原生支援樂觀並行控制
- 管理員同時審核同一地點的機率較低，無需悲觀鎖定的開銷
- 實作簡單且高效，無需額外基礎設施

### 實作細節

```typescript
// src/hooks/useLocationReview.ts
import { runTransaction, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const useLocationReview = () => {
  const approveLocation = async (
    locationId: string, 
    expectedVersion: number,
    adminId: string
  ): Promise<void> => {
    await runTransaction(db, async (transaction) => {
      const locationRef = doc(db, 'locations', locationId);
      const locationDoc = await transaction.get(locationRef);
      
      if (!locationDoc.exists()) {
        throw new Error('地點不存在');
      }
      
      const currentVersion = locationDoc.data().version || 0;
      
      if (currentVersion !== expectedVersion) {
        throw new Error('此地點已被其他管理員審核，請重新載入最新資訊');
      }
      
      transaction.update(locationRef, {
        status: 'approved',
        reviewedAt: serverTimestamp(),
        reviewedBy: adminId,
        version: currentVersion + 1,
      });
    });
  };

  const rejectLocation = async (
    locationId: string,
    expectedVersion: number,
    adminId: string,
    rejectionReason: string
  ): Promise<void> => {
    await runTransaction(db, async (transaction) => {
      const locationRef = doc(db, 'locations', locationId);
      const locationDoc = await transaction.get(locationRef);
      
      if (!locationDoc.exists()) {
        throw new Error('地點不存在');
      }
      
      const currentVersion = locationDoc.data().version || 0;
      
      if (currentVersion !== expectedVersion) {
        throw new Error('此地點已被其他管理員審核，請重新載入最新資訊');
      }
      
      transaction.update(locationRef, {
        status: 'rejected',
        rejectionReason,
        reviewedAt: serverTimestamp(),
        reviewedBy: adminId,
        version: currentVersion + 1,
      });
    });
  };

  return { approveLocation, rejectLocation };
};
```

### 考慮的替代方案

| 方案 | 優點 | 缺點 |
|------|------|------|
| 悲觀鎖定 (Pessimistic) | 完全防止衝突 | 複雜、可能造成死鎖、Firestore 不原生支援 |
| Last Write Wins | 實作最簡單 | 可能覆蓋其他管理員的審核結果 |
| 使用 Firestore Timestamp | 無需額外欄位 | Timestamp 精度可能不足以檢測快速連續修改 |

---

## 2. 確認對話框機制

### 決策

建立可複用的 `ConfirmationDialog` 元件，顯示操作摘要並支援鍵盤快捷鍵。

### 理由

- 平衡安全性與效率，防止誤操作（特別是核准/拒絕混淆）
- 操作摘要讓管理員有最後檢查機會
- 鍵盤快捷鍵提升操作效率

### 實作細節

```typescript
// src/components/admin/ConfirmationDialog.tsx
import { useEffect, useCallback } from 'react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  operationType: 'approve' | 'reject' | 'ignore' | 'resolve';
  summary: {
    targetName: string;
    additionalInfo?: string;
  };
  isLoading?: boolean;
}

const OPERATION_LABELS: Record<string, { label: string; color: string }> = {
  approve: { label: '核准', color: 'bg-green-600 hover:bg-green-700' },
  reject: { label: '拒絕', color: 'bg-red-600 hover:bg-red-700' },
  ignore: { label: '忽略', color: 'bg-gray-600 hover:bg-gray-700' },
  resolve: { label: '處理完成', color: 'bg-blue-600 hover:bg-blue-700' },
};

export const ConfirmationDialog = ({
  isOpen,
  onConfirm,
  onCancel,
  title,
  operationType,
  summary,
  isLoading = false,
}: ConfirmationDialogProps) => {
  // 鍵盤快捷鍵處理
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen || isLoading) return;
    
    if (e.key === 'Enter') {
      e.preventDefault();
      onConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  }, [isOpen, isLoading, onConfirm, onCancel]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // 鎖定背景滾動
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const operation = OPERATION_LABELS[operationType];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 - 點擊不關閉，防止誤點 */}
      <div className="absolute inset-0 bg-black/50" />
      
      {/* 對話框 */}
      <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-bold mb-4">{title}</h3>
        
        {/* 操作摘要 */}
        <div className="bg-gray-50 rounded-md p-4 mb-4">
          <p className="text-sm text-gray-600 mb-2">
            <span className="font-medium">操作類型：</span>
            <span className={`px-2 py-1 rounded text-white text-xs ml-1 ${operation.color.split(' ')[0]}`}>
              {operation.label}
            </span>
          </p>
          <p className="text-sm text-gray-600 mb-1">
            <span className="font-medium">目標：</span>
            {summary.targetName}
          </p>
          {summary.additionalInfo && (
            <p className="text-sm text-gray-600">
              <span className="font-medium">備註：</span>
              {summary.additionalInfo}
            </p>
          )}
        </div>
        
        <p className="text-sm text-gray-500 mb-4">
          確定要執行此操作嗎？此操作無法撤銷。
        </p>
        
        {/* 按鈕 */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            取消 (Esc)
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 py-2 px-4 text-white rounded-md disabled:opacity-50 ${operation.color}`}
          >
            {isLoading ? '處理中...' : `確認${operation.label} (Enter)`}
          </button>
        </div>
      </div>
    </div>
  );
};
```

### 使用範例

```typescript
// 在審核頁面使用
const [confirmDialog, setConfirmDialog] = useState<{
  isOpen: boolean;
  type: 'approve' | 'reject';
  location: Location | null;
  rejectionReason?: string;
}>({ isOpen: false, type: 'approve', location: null });

const handleApproveClick = (location: Location) => {
  setConfirmDialog({
    isOpen: true,
    type: 'approve',
    location,
  });
};

const handleConfirm = async () => {
  if (!confirmDialog.location) return;
  
  try {
    if (confirmDialog.type === 'approve') {
      await approveLocation(confirmDialog.location.id, confirmDialog.location.version, user.uid);
    } else {
      await rejectLocation(
        confirmDialog.location.id, 
        confirmDialog.location.version, 
        user.uid,
        confirmDialog.rejectionReason!
      );
    }
    setConfirmDialog({ isOpen: false, type: 'approve', location: null });
  } catch (error) {
    // 處理錯誤（包含版本衝突）
  }
};
```

---

## 3. 管理員權限驗證

### 決策

使用 Firebase Custom Claims (`isAdmin: true`) 進行權限控制，前端和後端雙重驗證。

### 理由

- Custom Claims 存儲在 JWT Token 中，無需額外資料庫查詢
- Firestore Security Rules 可直接讀取 Claims 進行驗證
- 符合憲章 Security by Default 原則

### 實作細節

```typescript
// src/hooks/useAdminAuth.ts
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

interface AdminClaims {
  isAdmin: boolean;
  isSuperAdmin?: boolean;
}

export const useAdminAuth = () => {
  const { user } = useAuth();
  const [claims, setClaims] = useState<AdminClaims | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setClaims(null);
        setLoading(false);
        return;
      }

      try {
        // 強制刷新 Token 以取得最新 Claims
        const tokenResult = await user.getIdTokenResult(true);
        setClaims({
          isAdmin: tokenResult.claims.isAdmin === true,
          isSuperAdmin: tokenResult.claims.isSuperAdmin === true,
        });
      } catch (error) {
        console.error('取得管理員權限失敗:', error);
        setClaims(null);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  return {
    isAdmin: claims?.isAdmin ?? false,
    isSuperAdmin: claims?.isSuperAdmin ?? false,
    loading,
    user,
  };
};
```

```typescript
// src/components/admin/AdminRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';

export const AdminRoute = () => {
  const { isAdmin, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-green-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
```

---

## 4. 通知系統設計

### 決策

使用 Firestore `/notifications/{userId}/items/{notificationId}` 子集合實作內部通知系統。

### 理由

- 不需要外部通知服務（Email、Push）的複雜度
- Firestore 即時監聽可提供即時通知體驗
- 子集合結構便於查詢特定使用者的通知

### 實作細節

```typescript
// src/utils/notifications.ts
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type NotificationType = 
  | 'location_approved'
  | 'location_rejected'
  | 'report_resolved'
  | 'report_ignored'
  | 'partner_verified'
  | 'partner_rejected';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string; // 地點 ID 或回報 ID
}

export const createNotification = async (params: CreateNotificationParams) => {
  const { userId, type, title, message, relatedId } = params;
  
  await addDoc(collection(db, 'notifications', userId, 'items'), {
    type,
    title,
    message,
    relatedId,
    read: false,
    createdAt: serverTimestamp(),
  });
};

// 審核通過通知範例
await createNotification({
  userId: location.submittedBy,
  type: 'location_approved',
  title: '地點審核通過',
  message: `您提交的「${location.name}」已審核通過，現已發布在地圖上！`,
  relatedId: location.id,
});
```

---

## 5. 管理員操作記錄 (Admin Logs)

### 決策

所有管理員操作記錄到 `/admin_logs/{logId}` 集合，用於稽核追蹤。

### 理由

- 符合憲章 Data Integrity & Trust 原則：管理員操作可稽核
- 提供操作歷史記錄，便於追蹤問題
- 支援未來超級管理員查看系統日誌功能 (Epic 006)

### 實作細節

```typescript
// src/utils/adminLog.ts
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type AdminActionType = 
  | 'approve_location'
  | 'reject_location'
  | 'resolve_report'
  | 'ignore_report'
  | 'verify_partner'
  | 'reject_partner';

interface LogAdminActionParams {
  actionType: AdminActionType;
  adminId: string;
  targetId: string;
  details?: Record<string, unknown>;
}

export const logAdminAction = async (params: LogAdminActionParams) => {
  const { actionType, adminId, targetId, details } = params;
  
  await addDoc(collection(db, 'admin_logs'), {
    actionType,
    adminId,
    targetId,
    details: details || null,
    timestamp: serverTimestamp(),
  });
};

// 使用範例
await logAdminAction({
  actionType: 'approve_location',
  adminId: user.uid,
  targetId: locationId,
  details: { locationName: location.name },
});

await logAdminAction({
  actionType: 'reject_location',
  adminId: user.uid,
  targetId: locationId,
  details: { 
    locationName: location.name,
    rejectionReason: reason,
  },
});
```

---

## 6. 統計儀表板實作

### 決策

使用 Firestore 即時查詢計算統計數據，不預先聚合。

### 理由

- 資料量小（< 1,000 筆待審核項目），直接查詢效能足夠
- 即時反映最新數據，無需維護聚合
- 實作簡單，符合 MVP 精神

### 實作細節

```typescript
// src/hooks/useAdminStats.ts
import { useEffect, useState } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface AdminStats {
  pendingLocations: number;
  pendingReports: number;
  pendingVerifications: number;
  approvedThisMonth: number;
  urgentItems: number; // 超過 3 天未處理
}

export const useAdminStats = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 待審核地點
    const locationsQuery = query(
      collection(db, 'locations'),
      where('status', '==', 'pending')
    );

    // 待處理回報
    const reportsQuery = query(
      collection(db, 'error_reports'),
      where('status', '==', 'pending')
    );

    // 待驗證夥伴
    const verificationsQuery = query(
      collection(db, 'wilderness_verifications'),
      where('status', '==', 'pending')
    );

    // 本月核准
    const approvedQuery = query(
      collection(db, 'locations'),
      where('status', '==', 'approved'),
      where('reviewedAt', '>=', Timestamp.fromDate(firstDayOfMonth))
    );

    // 緊急項目（超過 3 天）
    const urgentLocationsQuery = query(
      collection(db, 'locations'),
      where('status', '==', 'pending'),
      where('submittedAt', '<=', Timestamp.fromDate(threeDaysAgo))
    );

    let pendingLocations = 0;
    let pendingReports = 0;
    let pendingVerifications = 0;
    let approvedThisMonth = 0;
    let urgentItems = 0;

    const unsubscribes = [
      onSnapshot(locationsQuery, (snapshot) => {
        pendingLocations = snapshot.size;
        updateStats();
      }),
      onSnapshot(reportsQuery, (snapshot) => {
        pendingReports = snapshot.size;
        updateStats();
      }),
      onSnapshot(verificationsQuery, (snapshot) => {
        pendingVerifications = snapshot.size;
        updateStats();
      }),
      onSnapshot(approvedQuery, (snapshot) => {
        approvedThisMonth = snapshot.size;
        updateStats();
      }),
      onSnapshot(urgentLocationsQuery, (snapshot) => {
        urgentItems = snapshot.size;
        updateStats();
      }),
    ];

    const updateStats = () => {
      setStats({
        pendingLocations,
        pendingReports,
        pendingVerifications,
        approvedThisMonth,
        urgentItems,
      });
      setLoading(false);
    };

    return () => unsubscribes.forEach(unsub => unsub());
  }, []);

  return { stats, loading };
};
```

---

## 7. 荒野夥伴驗證 Cloud Function

### 決策

使用 Firebase Cloud Functions 更新 Custom Claims，因為前端無法直接修改。

### 理由

- Firebase 安全限制：Custom Claims 只能透過 Admin SDK 更新
- Cloud Function 提供伺服器端驗證，防止惡意呼叫
- 可在更新 Claims 後同時更新 Firestore 資料

### 實作細節

```typescript
// functions/src/admin/updateWildernessPartner.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

interface UpdatePartnerRequest {
  userId: string;
  approve: boolean;
}

export const updateWildernessPartner = functions.https.onCall(
  async (data: UpdatePartnerRequest, context) => {
    // 驗證呼叫者是管理員
    if (!context.auth?.token.isAdmin) {
      throw new functions.https.HttpsError(
        'permission-denied',
        '只有管理員可以執行此操作'
      );
    }

    const { userId, approve } = data;

    if (!userId || typeof approve !== 'boolean') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        '參數錯誤'
      );
    }

    try {
      // 更新 Custom Claims
      await admin.auth().setCustomUserClaims(userId, {
        isWildernessPartner: approve,
      });

      // 更新使用者文件
      await admin.firestore().doc(`users/${userId}`).update({
        isWildernessPartner: approve,
        'wildernessInfo.verifiedAt': admin.firestore.FieldValue.serverTimestamp(),
        'wildernessInfo.verifiedBy': context.auth.uid,
      });

      return { success: true };
    } catch (error) {
      console.error('更新荒野夥伴狀態失敗:', error);
      throw new functions.https.HttpsError(
        'internal',
        '更新失敗，請稍後再試'
      );
    }
  }
);
```

```typescript
// 前端呼叫
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

const updateWildernessPartner = httpsCallable(functions, 'updateWildernessPartner');

const approvePartner = async (userId: string) => {
  await updateWildernessPartner({ userId, approve: true });
};

const rejectPartner = async (userId: string) => {
  // 不需要呼叫 Cloud Function，只需更新驗證狀態
  // Claims 保持不變
};
```

---

## 8. 待審核列表分頁

### 決策

使用 Firestore 游標分頁 (Cursor Pagination)，每頁 20 筆。

### 理由

- 游標分頁效能優於 offset 分頁
- 避免一次載入過多資料
- 支援按提交時間倒序排列

### 實作細節

```typescript
// src/hooks/usePendingLocations.ts
import { useState, useCallback } from 'react';
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
import { Location } from '@/types';

const PAGE_SIZE = 20;

export const usePendingLocations = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);

  const fetchPage = useCallback(async (isFirstPage = false) => {
    setLoading(true);
    
    try {
      let q = query(
        collection(db, 'locations'),
        where('status', '==', 'pending'),
        orderBy('submittedAt', 'desc'),
        limit(PAGE_SIZE)
      );

      if (!isFirstPage && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Location[];

      if (isFirstPage) {
        setLocations(docs);
      } else {
        setLocations(prev => [...prev, ...docs]);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (error) {
      console.error('載入待審核地點失敗:', error);
    } finally {
      setLoading(false);
    }
  }, [lastDoc]);

  const refresh = useCallback(() => {
    setLastDoc(null);
    fetchPage(true);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchPage(false);
    }
  }, [loading, hasMore, fetchPage]);

  return { locations, loading, hasMore, refresh, loadMore };
};
```

````
