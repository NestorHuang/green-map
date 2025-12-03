````markdown
# 快速開始指南：管理員審核與管理

**功能分支**: `005-admin-management`
**建立日期**: 2025-12-03

## 環境設定

### 1. 相依套件

```bash
# 已在先前 Epic 安裝的套件
# react-hook-form, @hookform/resolvers, zod

# 無需額外安裝
```

### 2. Cloud Functions 部署

```bash
# 安裝 Firebase Functions 相依套件
cd functions
npm install

# 部署 Cloud Function
firebase deploy --only functions:updateWildernessPartner
```

### 3. Firestore 索引

確保以下索引已建立：

```bash
firebase deploy --only firestore:indexes
```

### 4. 建立初始管理員帳號

透過 Firebase CLI 手動設定第一位管理員的 Custom Claims：

```bash
# 使用 Firebase Admin SDK 腳本
node scripts/set-admin-claim.js <user-uid>
```

```javascript
// scripts/set-admin-claim.js
const admin = require('firebase-admin');
admin.initializeApp();

const uid = process.argv[2];
admin.auth().setCustomUserClaims(uid, { isAdmin: true })
  .then(() => console.log('成功設定管理員權限'))
  .catch(console.error);
```

## 核心程式碼範例

### 管理員權限驗證 Hook

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

### 管理員路由保護

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

### 樂觀鎖定地點審核

```typescript
// src/hooks/useLocationReview.ts
import { useState } from 'react';
import { runTransaction, doc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

export const useLocationReview = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approveLocation = async (
    locationId: string, 
    expectedVersion: number,
    locationName: string
  ): Promise<void> => {
    if (!user) throw new Error('未登入');
    
    setLoading(true);
    setError(null);

    try {
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
          reviewedBy: user.uid,
          version: currentVersion + 1,
        });
      });

      // 記錄操作日誌
      await addDoc(collection(db, 'admin_logs'), {
        actionType: 'approve_location',
        adminId: user.uid,
        targetId: locationId,
        details: { locationName },
        timestamp: serverTimestamp(),
      });

    } catch (err) {
      const message = err instanceof Error ? err.message : '操作失敗';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const rejectLocation = async (
    locationId: string,
    expectedVersion: number,
    locationName: string,
    rejectionReason: string
  ): Promise<void> => {
    if (!user) throw new Error('未登入');
    
    setLoading(true);
    setError(null);

    try {
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
          reviewedBy: user.uid,
          version: currentVersion + 1,
        });
      });

      // 記錄操作日誌
      await addDoc(collection(db, 'admin_logs'), {
        actionType: 'reject_location',
        adminId: user.uid,
        targetId: locationId,
        details: { locationName, rejectionReason },
        timestamp: serverTimestamp(),
      });

    } catch (err) {
      const message = err instanceof Error ? err.message : '操作失敗';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { approveLocation, rejectLocation, loading, error };
};
```

### 確認對話框元件

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

const OPERATION_CONFIG = {
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
  // 鍵盤快捷鍵
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen || isLoading) return;
    if (e.key === 'Enter') { e.preventDefault(); onConfirm(); }
    else if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
  }, [isOpen, isLoading, onConfirm, onCancel]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // 鎖定背景滾動
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const config = OPERATION_CONFIG[operationType];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" />
      
      <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-bold mb-4">{title}</h3>
        
        <div className="bg-gray-50 rounded-md p-4 mb-4">
          <p className="text-sm text-gray-600 mb-2">
            <span className="font-medium">操作類型：</span>
            <span className={`px-2 py-1 rounded text-white text-xs ml-1 ${config.color.split(' ')[0]}`}>
              {config.label}
            </span>
          </p>
          <p className="text-sm text-gray-600 mb-1">
            <span className="font-medium">目標：</span>{summary.targetName}
          </p>
          {summary.additionalInfo && (
            <p className="text-sm text-gray-600">
              <span className="font-medium">備註：</span>{summary.additionalInfo}
            </p>
          )}
        </div>
        
        <p className="text-sm text-gray-500 mb-4">
          確定要執行此操作嗎？此操作無法撤銷。
        </p>
        
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            取消 (Esc)
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 py-2 px-4 text-white rounded-md disabled:opacity-50 ${config.color}`}
          >
            {isLoading ? '處理中...' : `確認${config.label} (Enter)`}
          </button>
        </div>
      </div>
    </div>
  );
};
```

### 統計儀表板 Hook

```typescript
// src/hooks/useAdminStats.ts
import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface AdminStats {
  pendingLocations: number;
  pendingReports: number;
  pendingVerifications: number;
  approvedThisMonth: number;
  urgentItems: number;
}

export const useAdminStats = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let pendingLocations = 0, pendingReports = 0, pendingVerifications = 0;
    let approvedThisMonth = 0, urgentItems = 0;

    const updateStats = () => {
      setStats({ pendingLocations, pendingReports, pendingVerifications, approvedThisMonth, urgentItems });
      setLoading(false);
    };

    const unsubscribes = [
      onSnapshot(query(collection(db, 'locations'), where('status', '==', 'pending')), 
        (s) => { pendingLocations = s.size; updateStats(); }),
      onSnapshot(query(collection(db, 'error_reports'), where('status', '==', 'pending')), 
        (s) => { pendingReports = s.size; updateStats(); }),
      onSnapshot(query(collection(db, 'wilderness_verifications'), where('status', '==', 'pending')), 
        (s) => { pendingVerifications = s.size; updateStats(); }),
      onSnapshot(query(collection(db, 'locations'), where('status', '==', 'approved'), 
        where('reviewedAt', '>=', Timestamp.fromDate(firstDayOfMonth))), 
        (s) => { approvedThisMonth = s.size; updateStats(); }),
      onSnapshot(query(collection(db, 'locations'), where('status', '==', 'pending'),
        where('submittedAt', '<=', Timestamp.fromDate(threeDaysAgo))), 
        (s) => { urgentItems = s.size; updateStats(); }),
    ];

    return () => unsubscribes.forEach(unsub => unsub());
  }, []);

  return { stats, loading };
};
```

### 荒野夥伴驗證 Cloud Function

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
    // 驗證管理員權限
    if (!context.auth?.token.isAdmin) {
      throw new functions.https.HttpsError('permission-denied', '只有管理員可以執行此操作');
    }

    const { userId, approve } = data;

    if (!userId || typeof approve !== 'boolean') {
      throw new functions.https.HttpsError('invalid-argument', '參數錯誤');
    }

    try {
      // 更新 Custom Claims
      await admin.auth().setCustomUserClaims(userId, { isWildernessPartner: approve });

      // 更新使用者文件
      await admin.firestore().doc(`users/${userId}`).update({
        isWildernessPartner: approve,
        'wildernessInfo.verifiedAt': admin.firestore.FieldValue.serverTimestamp(),
        'wildernessInfo.verifiedBy': context.auth.uid,
      });

      return { success: true };
    } catch (error) {
      console.error('更新荒野夥伴狀態失敗:', error);
      throw new functions.https.HttpsError('internal', '更新失敗，請稍後再試');
    }
  }
);
```

## 路由設定

```typescript
// src/App.tsx
import { Routes, Route } from 'react-router-dom';
import { AdminRoute } from '@/components/admin/AdminRoute';
import { AdminPage } from '@/pages/admin/AdminPage';
import { LocationReviewPage } from '@/pages/admin/LocationReviewPage';
import { ReportReviewPage } from '@/pages/admin/ReportReviewPage';
import { VerificationPage } from '@/pages/admin/VerificationPage';

export const App = () => {
  return (
    <Routes>
      {/* 一般路由 */}
      <Route path="/" element={<HomePage />} />
      
      {/* 管理員路由 */}
      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/locations" element={<LocationReviewPage />} />
        <Route path="/admin/reports" element={<ReportReviewPage />} />
        <Route path="/admin/verifications" element={<VerificationPage />} />
      </Route>
    </Routes>
  );
};
```

## 測試清單

### P1 功能測試

- [ ] 審核待核准地點
  - [ ] 管理員可看到待審核列表
  - [ ] 點擊地點顯示完整資訊
  - [ ] 核准地點時彈出確認對話框
  - [ ] 拒絕地點需填寫原因
  - [ ] 版本衝突時顯示錯誤訊息
  - [ ] 審核完成後發送通知給提交者

- [ ] 處理錯誤回報
  - [ ] 管理員可看到待處理回報列表
  - [ ] 可編輯被回報的地點資訊
  - [ ] 編輯後自動標記回報為已處理
  - [ ] 忽略回報需填寫備註

- [ ] 驗證荒野夥伴
  - [ ] 管理員可看到待驗證申請列表
  - [ ] 顯示申請資料完整性檢查結果
  - [ ] 核准後 Custom Claims 正確更新
  - [ ] 拒絕時需填寫原因

### P2 功能測試

- [ ] 審核統計儀表板
  - [ ] 顯示各項待處理數量
  - [ ] 顯示本月核准數量
  - [ ] 超過 3 天項目紅色警示
  - [ ] 數據即時更新

### 確認對話框測試

- [ ] Enter 鍵確認操作
- [ ] Esc 鍵取消操作
- [ ] 背景鎖定無法誤點
- [ ] 取消後保留已填寫內容

````
