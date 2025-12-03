````markdown
# 快速入門：超級管理員系統管理

**功能分支**: `006-super-admin`
**最後更新**: 2025-12-03

## 目錄

1. [核心程式碼](#核心程式碼)
2. [路由設定](#路由設定)
3. [Cloud Function 部署](#cloud-function-部署)
4. [測試檢核清單](#測試檢核清單)

---

## 核心程式碼

### 1. 超級管理員權限驗證 Hook

```typescript
// src/hooks/useSuperAdminAuth.ts
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export const useSuperAdminAuth = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const isSuperAdmin = user?.customClaims?.isSuperAdmin === true;

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      navigate('/admin', { replace: true });
    }
  }, [authLoading, isSuperAdmin, navigate]);

  return { user, isSuperAdmin, loading: authLoading };
};
```

### 2. 使用者權限管理 Hook

```typescript
// src/hooks/useUserManagement.ts
import { useState, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

interface UpdateClaimsRequest {
  targetUserId: string;
  claimType: 'admin' | 'superAdmin' | 'wilderness';
  grant: boolean;
}

const updateAdminClaimsFunction = httpsCallable<UpdateClaimsRequest, { success: boolean }>(
  functions, 
  'updateAdminClaims'
);

export const useUserManagement = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateUserRole = useCallback(async (
    userId: string, 
    claimType: 'admin' | 'superAdmin' | 'wilderness', 
    grant: boolean
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      await updateAdminClaimsFunction({ 
        targetUserId: userId, 
        claimType, 
        grant 
      });
      return true;
    } catch (err: any) {
      const message = err.message || '更新失敗';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { 
    updateUserRole,
    grantAdmin: (userId: string) => updateUserRole(userId, 'admin', true),
    revokeAdmin: (userId: string) => updateUserRole(userId, 'admin', false),
    grantSuperAdmin: (userId: string) => updateUserRole(userId, 'superAdmin', true),
    revokeSuperAdmin: (userId: string) => updateUserRole(userId, 'superAdmin', false),
    grantWilderness: (userId: string) => updateUserRole(userId, 'wilderness', true),
    revokeWilderness: (userId: string) => updateUserRole(userId, 'wilderness', false),
    loading, 
    error 
  };
};
```

### 3. 標籤管理 Hook

```typescript
// src/hooks/useTagManagement.ts
import { useState, useCallback } from 'react';
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
import { Tag } from '@/types';

const deleteTagFunction = httpsCallable<
  { tagId: string; tagName: string }, 
  { success: boolean; affectedLocations: number }
>(functions, 'deleteTagFromLocations');

export const useTagManagement = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTag = useCallback(async (name: string): Promise<string> => {
    if (!user) throw new Error('未登入');
    setLoading(true);
    setError(null);

    try {
      // 驗證名稱唯一性
      const existing = await getDocs(query(
        collection(db, 'tags'),
        where('name', '==', name.trim())
      ));
      
      if (!existing.empty) {
        throw new Error('標籤名稱已存在');
      }

      const docRef = await addDoc(collection(db, 'tags'), {
        name: name.trim(),
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      });

      // 記錄操作
      await addDoc(collection(db, 'admin_logs'), {
        actionType: 'create_tag',
        adminId: user.uid,
        targetId: docRef.id,
        details: { tagName: name.trim() },
        timestamp: serverTimestamp(),
      });

      return docRef.id;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateTag = useCallback(async (tagId: string, name: string): Promise<void> => {
    if (!user) throw new Error('未登入');
    setLoading(true);
    setError(null);

    try {
      // 驗證名稱唯一性（排除自己）
      const existing = await getDocs(query(
        collection(db, 'tags'),
        where('name', '==', name.trim())
      ));
      
      if (existing.docs.some(d => d.id !== tagId)) {
        throw new Error('標籤名稱已存在');
      }

      await updateDoc(doc(db, 'tags', tagId), {
        name: name.trim(),
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, 'admin_logs'), {
        actionType: 'update_tag',
        adminId: user.uid,
        targetId: tagId,
        details: { newName: name.trim() },
        timestamp: serverTimestamp(),
      });
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const deleteTag = useCallback(async (tagId: string, tagName: string): Promise<number> => {
    setLoading(true);
    setError(null);

    try {
      const result = await deleteTagFunction({ tagId, tagName });
      return result.data.affectedLocations;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getTagUsageCount = useCallback(async (tagId: string): Promise<number> => {
    const snapshot = await getDocs(query(
      collection(db, 'locations'),
      where('tagIds', 'array-contains', tagId)
    ));
    return snapshot.size;
  }, []);

  return { createTag, updateTag, deleteTag, getTagUsageCount, loading, error };
};
```

### 4. 平台設定 Hook

```typescript
// src/hooks/usePlatformSettings.ts
import { useState, useEffect, useCallback } from 'react';
import { 
  doc, 
  onSnapshot, 
  updateDoc, 
  serverTimestamp, 
  GeoPoint,
  addDoc,
  collection,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { PlatformSettings } from '@/types';

const DEFAULT_SETTINGS: PlatformSettings = {
  defaultMapCenter: new GeoPoint(22.6273, 120.3014),
  defaultZoomLevel: 13,
  reviewDeadlineDays: 3,
  maxDailyUploads: 5,
};

export const usePlatformSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 即時監聽
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'platform_settings', 'config'),
      (snapshot) => {
        if (snapshot.exists()) {
          setSettings(snapshot.data() as PlatformSettings);
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

  const updateSettings = useCallback(async (
    updates: Partial<PlatformSettings>
  ): Promise<void> => {
    if (!user) throw new Error('未登入');
    setSaving(true);
    setError(null);

    try {
      await updateDoc(doc(db, 'platform_settings', 'config'), {
        ...updates,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });

      await addDoc(collection(db, 'admin_logs'), {
        actionType: 'update_settings',
        adminId: user.uid,
        targetId: 'config',
        details: updates,
        timestamp: serverTimestamp(),
      });
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [user]);

  return { settings, loading, saving, error, updateSettings };
};
```

### 5. 使用者列表元件

```tsx
// src/components/super-admin/UserManagementTable.tsx
import { useState } from 'react';
import { useUsersList } from '@/hooks/useUsersList';
import { useUserManagement } from '@/hooks/useUserManagement';
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog';
import { UserWithRole } from '@/types';

export const UserManagementTable = () => {
  const { 
    users, 
    loading, 
    hasMore, 
    loadMore, 
    searchTerm, 
    setSearchTerm,
    roleFilter,
    setRoleFilter,
  } = useUsersList();
  
  const { 
    grantAdmin, 
    revokeAdmin, 
    grantSuperAdmin, 
    revokeSuperAdmin,
    grantWilderness,
    revokeWilderness,
    loading: actionLoading 
  } = useUserManagement();
  
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    user: UserWithRole | null;
    action: string;
    onConfirm: () => Promise<void>;
  }>({ open: false, user: null, action: '', onConfirm: async () => {} });

  const handleRoleAction = (
    user: UserWithRole, 
    action: string, 
    handler: () => Promise<void>
  ) => {
    setConfirmDialog({
      open: true,
      user,
      action,
      onConfirm: async () => {
        await handler();
        setConfirmDialog({ open: false, user: null, action: '', onConfirm: async () => {} });
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* 搜尋與篩選 */}
      <div className="flex gap-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="搜尋 Email 或名稱..."
          className="flex-1 px-4 py-2 border rounded-lg"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as any)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="all">全部</option>
          <option value="admin">管理員</option>
          <option value="superAdmin">超級管理員</option>
          <option value="wilderness">野外考察夥伴</option>
        </select>
      </div>

      {/* 使用者列表 */}
      <table className="w-full">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-4 py-2 text-left">Email</th>
            <th className="px-4 py-2 text-left">名稱</th>
            <th className="px-4 py-2 text-left">角色</th>
            <th className="px-4 py-2 text-left">操作</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b">
              <td className="px-4 py-2">{user.email}</td>
              <td className="px-4 py-2">{user.displayName || '-'}</td>
              <td className="px-4 py-2">
                <div className="flex gap-1">
                  {user.isSuperAdmin && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                      超級管理員
                    </span>
                  )}
                  {user.isAdmin && !user.isSuperAdmin && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      管理員
                    </span>
                  )}
                  {user.isWildernessPartner && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                      野外考察
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-2">
                <div className="flex gap-2">
                  {!user.isAdmin ? (
                    <button
                      onClick={() => handleRoleAction(user, '授予管理員', () => grantAdmin(user.id))}
                      className="text-blue-600 hover:underline text-sm"
                      disabled={actionLoading}
                    >
                      授予管理員
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRoleAction(user, '撤銷管理員', () => revokeAdmin(user.id))}
                      className="text-red-600 hover:underline text-sm"
                      disabled={actionLoading}
                    >
                      撤銷管理員
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 載入更多 */}
      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="w-full py-2 text-blue-600 hover:bg-blue-50"
        >
          {loading ? '載入中...' : '載入更多'}
        </button>
      )}

      {/* 確認對話框 */}
      <ConfirmationDialog
        isOpen={confirmDialog.open}
        title="確認操作"
        message={`確定要對 ${confirmDialog.user?.email} ${confirmDialog.action}？`}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ open: false, user: null, action: '', onConfirm: async () => {} })}
      />
    </div>
  );
};
```

---

## 路由設定

```tsx
// src/routes/super-admin.routes.tsx
import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';
import { SuperAdminLayout } from '@/layouts/SuperAdminLayout';

const UserManagement = lazy(() => import('@/pages/super-admin/UserManagement'));
const TagManagement = lazy(() => import('@/pages/super-admin/TagManagement'));
const SystemLogs = lazy(() => import('@/pages/super-admin/SystemLogs'));
const PlatformSettings = lazy(() => import('@/pages/super-admin/PlatformSettings'));

export const superAdminRoutes: RouteObject = {
  path: 'super-admin',
  element: <SuperAdminLayout />,
  children: [
    { index: true, element: <UserManagement /> },
    { path: 'users', element: <UserManagement /> },
    { path: 'tags', element: <TagManagement /> },
    { path: 'logs', element: <SystemLogs /> },
    { path: 'settings', element: <PlatformSettings /> },
  ],
};
```

```tsx
// src/layouts/SuperAdminLayout.tsx
import { Outlet, NavLink } from 'react-router-dom';
import { useSuperAdminAuth } from '@/hooks/useSuperAdminAuth';

export const SuperAdminLayout = () => {
  const { loading, isSuperAdmin } = useSuperAdminAuth();

  if (loading) {
    return <div className="flex justify-center p-8">載入中...</div>;
  }

  if (!isSuperAdmin) {
    return null; // Hook 會自動導向
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-purple-800 text-white p-4">
        <div className="container mx-auto flex gap-6">
          <NavLink 
            to="/super-admin/users" 
            className={({ isActive }) => isActive ? 'font-bold' : 'hover:underline'}
          >
            使用者管理
          </NavLink>
          <NavLink 
            to="/super-admin/tags" 
            className={({ isActive }) => isActive ? 'font-bold' : 'hover:underline'}
          >
            標籤管理
          </NavLink>
          <NavLink 
            to="/super-admin/logs" 
            className={({ isActive }) => isActive ? 'font-bold' : 'hover:underline'}
          >
            系統日誌
          </NavLink>
          <NavLink 
            to="/super-admin/settings" 
            className={({ isActive }) => isActive ? 'font-bold' : 'hover:underline'}
          >
            平台設定
          </NavLink>
        </div>
      </nav>

      <main className="container mx-auto p-6">
        <Outlet />
      </main>
    </div>
  );
};
```

---

## Cloud Function 部署

### 1. 設定初始超級管理員

```bash
# 首次部署前，使用腳本設定初始超級管理員
cd functions
node scripts/set-super-admin.js <your-user-uid>
```

### 2. 部署 Cloud Functions

```bash
# 部署所有超級管理員相關 Functions
firebase deploy --only functions:updateAdminClaims,functions:deleteTagFromLocations
```

### 3. 初始化平台設定

```bash
# 使用 Firebase CLI 或 Console 建立初始設定文件
# /platform_settings/config
```

---

## 測試檢核清單

### 功能測試

- [ ] **使用者管理**
  - [ ] 可搜尋使用者（Email/名稱）
  - [ ] 可按角色篩選使用者列表
  - [ ] 可授予/撤銷管理員權限
  - [ ] 可授予/撤銷超級管理員權限
  - [ ] 可授予/撤銷野外考察夥伴權限
  - [ ] 無限捲動正常運作

- [ ] **權限保護**
  - [ ] 無法撤銷自己的超級管理員權限
  - [ ] 當只剩一位超級管理員時無法撤銷
  - [ ] 非超級管理員無法存取超級管理員功能

- [ ] **標籤管理**
  - [ ] 可新增標籤
  - [ ] 標籤名稱唯一性驗證
  - [ ] 可編輯標籤名稱
  - [ ] 可刪除標籤（確認對話框）
  - [ ] 刪除標籤時正確清理地點關聯

- [ ] **系統日誌**
  - [ ] 可查看 90 天內的操作日誌
  - [ ] 可按操作類型篩選
  - [ ] 可按操作者篩選
  - [ ] 可按日期範圍篩選
  - [ ] 無限捲動正常運作

- [ ] **平台設定**
  - [ ] 可查看當前設定
  - [ ] 可修改預設地圖中心
  - [ ] 可修改預設縮放層級（驗證 1-20）
  - [ ] 可修改審核時限（驗證 1-30）
  - [ ] 可修改每日上傳限制（驗證 1-20）
  - [ ] 設定變更即時同步

### 邊界情況

- [ ] 空使用者列表顯示
- [ ] 空標籤列表顯示
- [ ] 空日誌列表顯示
- [ ] 超長標籤名稱處理
- [ ] 網路錯誤重試機制
- [ ] 並發權限更新處理

### 效能測試

- [ ] 100+ 使用者列表載入時間 < 2 秒
- [ ] 標籤刪除批次更新完成時間合理
- [ ] 日誌查詢無明顯延遲

### 安全測試

- [ ] Firestore Rules 正確阻擋非授權存取
- [ ] Cloud Function 正確驗證 Custom Claims
- [ ] 敏感操作有日誌記錄
````
