````markdown
# 資料模型：超級管理員系統管理

**功能分支**: `006-super-admin`
**最後更新**: 2025-12-03

## 實體關係圖

```
┌─────────────────┐      ┌──────────────────────┐
│      User       │      │   PlatformSettings   │
│ (Extended)      │      │   (Single Document)  │
├─────────────────┤      ├──────────────────────┤
│ id: string      │      │ defaultMapCenter     │
│ email           │      │ defaultZoomLevel     │
│ displayName     │      │ reviewDeadlineDays   │
│ isAdmin         │      │ maxDailyUploads      │
│ isSuperAdmin    │      │ updatedAt            │
│ isWildernessP   │      │ updatedBy            │
│ createdAt       │      └──────────────────────┘
└─────────────────┘
        │
        │ creates/manages
        ▼
┌─────────────────┐      ┌──────────────────────┐
│      Tag        │◄────►│      Location        │
├─────────────────┤      │    (tagIds array)    │
│ id: string      │      └──────────────────────┘
│ name            │
│ createdAt       │
│ createdBy       │
└─────────────────┘
        │
        │ logged to
        ▼
┌─────────────────────────────────────────┐
│            AdminActionLog               │
│           (Extended Types)              │
├─────────────────────────────────────────┤
│ actionType: grant_admin | revoke_admin  │
│            | grant_superAdmin           │
│            | revoke_superAdmin          │
│            | grant_wilderness           │
│            | revoke_wilderness          │
│            | create_tag | update_tag    │
│            | delete_tag                 │
│            | update_settings            │
│ adminId: string                         │
│ targetId: string                        │
│ details: object                         │
│ timestamp: Timestamp                    │
└─────────────────────────────────────────┘
```

## 1. User (Extended)

**路徑**: `/users/{userId}`

**備註**: 此實體在 002-user-auth 已定義，此處為擴展欄位

### 新增欄位

| 欄位 | 類型 | 必填 | 預設值 | 說明 |
|------|------|------|--------|------|
| `isAdmin` | boolean | ❌ | false | 管理員標記（同步自 Custom Claims） |
| `isSuperAdmin` | boolean | ❌ | false | 超級管理員標記（同步自 Custom Claims） |
| `isWildernessPartner` | boolean | ❌ | false | 野外考察合作夥伴標記 |

### 設計考量

- `isAdmin`, `isSuperAdmin`, `isWildernessPartner` 需與 Firebase Auth Custom Claims 同步
- Firestore 儲存這些欄位是為了方便查詢篩選
- 真正的權限驗證以 Custom Claims 為準
- 更新權限時，Cloud Function 需同時更新 Custom Claims 和 Firestore

---

## 2. Tag

**路徑**: `/tags/{tagId}`

### 欄位定義

| 欄位 | 類型 | 必填 | 驗證規則 | 說明 |
|------|------|------|----------|------|
| `id` | string | ✅ | auto-generated | 標籤 ID |
| `name` | string | ✅ | 1-50 字元，唯一 | 標籤名稱 |
| `createdAt` | Timestamp | ✅ | serverTimestamp | 建立時間 |
| `createdBy` | string | ✅ | 有效使用者 ID | 建立者 ID |
| `updatedAt` | Timestamp | ❌ | serverTimestamp | 最後更新時間 |

### 業務規則

- 標籤名稱必須唯一
- 刪除標籤時，需從所有使用該標籤的地點移除
- 標籤操作需記錄到 admin_logs

---

## 3. PlatformSettings

**路徑**: `/platform_settings/config`

**備註**: 單一文件設計，儲存所有平台設定

### 欄位定義

| 欄位 | 類型 | 必填 | 驗證規則 | 說明 |
|------|------|------|----------|------|
| `defaultMapCenter` | GeoPoint | ✅ | 有效經緯度 | 預設地圖中心 |
| `defaultZoomLevel` | number | ✅ | 1-20 | 預設縮放層級 |
| `reviewDeadlineDays` | number | ✅ | 1-30 | 審核期限（天） |
| `maxDailyUploads` | number | ✅ | 1-20 | 每日上傳限制 |
| `updatedAt` | Timestamp | ❌ | serverTimestamp | 最後更新時間 |
| `updatedBy` | string | ❌ | 有效使用者 ID | 最後更新者 ID |

### 預設值

```typescript
const DEFAULT_PLATFORM_SETTINGS = {
  defaultMapCenter: new GeoPoint(22.6273, 120.3014), // 高雄車站
  defaultZoomLevel: 13,
  reviewDeadlineDays: 3,
  maxDailyUploads: 5,
};
```

---

## 4. AdminActionLog (Extended Types)

**路徑**: `/admin_logs/{logId}`

**備註**: 此實體在 004-error-reporting 已定義，此處為擴展 actionType

### 新增 ActionType 值

| actionType 值 | 說明 | details 欄位 |
|--------------|------|-------------|
| `grant_admin` | 授予管理員權限 | `{ claimType: 'admin', grant: true }` |
| `revoke_admin` | 撤銷管理員權限 | `{ claimType: 'admin', grant: false }` |
| `grant_superAdmin` | 授予超級管理員權限 | `{ claimType: 'superAdmin', grant: true }` |
| `revoke_superAdmin` | 撤銷超級管理員權限 | `{ claimType: 'superAdmin', grant: false }` |
| `grant_wilderness` | 授予野外考察夥伴權限 | `{ claimType: 'wilderness', grant: true }` |
| `revoke_wilderness` | 撤銷野外考察夥伴權限 | `{ claimType: 'wilderness', grant: false }` |
| `create_tag` | 建立標籤 | `{ tagName: string }` |
| `update_tag` | 更新標籤 | `{ newName: string }` |
| `delete_tag` | 刪除標籤 | `{ tagName: string, affectedLocations: number }` |
| `update_settings` | 更新平台設定 | 變更的設定欄位物件 |

### 完整 ActionType 聯集類型

```typescript
// 整合 004 和 006 的所有類型
export type AdminActionType =
  // 004: 地點審核
  | 'approve_location'
  | 'reject_location'
  // 004: 錯誤回報
  | 'resolve_error_report'
  | 'close_error_report'
  // 004: 野外考察夥伴
  | 'approve_wilderness'
  | 'reject_wilderness'
  // 006: 權限管理
  | 'grant_admin'
  | 'revoke_admin'
  | 'grant_superAdmin'
  | 'revoke_superAdmin'
  | 'grant_wilderness'
  | 'revoke_wilderness'
  // 006: 標籤管理
  | 'create_tag'
  | 'update_tag'
  | 'delete_tag'
  // 006: 平台設定
  | 'update_settings';
```

---

## TypeScript 類型定義

```typescript
// src/types/superAdmin.ts
import { Timestamp, GeoPoint } from 'firebase/firestore';

// ============ User Extended ============
export interface User {
  id: string;
  email: string;
  displayName?: string;
  createdAt: Timestamp;
  // 擴展欄位
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  isWildernessPartner?: boolean;
}

export interface UserWithRole extends User {
  role: 'user' | 'admin' | 'superAdmin';
  badges: ('admin' | 'superAdmin' | 'wilderness')[];
}

// ============ Tag ============
export interface Tag {
  id: string;
  name: string;
  createdAt: Timestamp;
  createdBy: string;
  updatedAt?: Timestamp;
}

export interface TagWithUsage extends Tag {
  usageCount: number;
}

// ============ PlatformSettings ============
export interface PlatformSettings {
  defaultMapCenter: GeoPoint;
  defaultZoomLevel: number;
  reviewDeadlineDays: number;
  maxDailyUploads: number;
  updatedAt?: Timestamp;
  updatedBy?: string;
}

// ============ AdminActionLog Extended Types ============
export type SuperAdminActionType =
  | 'grant_admin'
  | 'revoke_admin'
  | 'grant_superAdmin'
  | 'revoke_superAdmin'
  | 'grant_wilderness'
  | 'revoke_wilderness'
  | 'create_tag'
  | 'update_tag'
  | 'delete_tag'
  | 'update_settings';

// ============ Input/Form Types ============
export interface UpdateUserRoleInput {
  userId: string;
  role: 'admin' | 'superAdmin' | 'wilderness';
  action: 'grant' | 'revoke';
}

export interface CreateTagInput {
  name: string;
}

export interface UpdateTagInput {
  tagId: string;
  name: string;
}

export interface UpdateSettingsInput {
  defaultMapCenter?: GeoPoint;
  defaultZoomLevel?: number;
  reviewDeadlineDays?: number;
  maxDailyUploads?: number;
}

// ============ API Response Types ============
export interface BatchOperationResult {
  success: boolean;
  affectedCount: number;
}
```

---

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 輔助函式
    function isSignedIn() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isSignedIn() && request.auth.token.isAdmin == true;
    }
    
    function isSuperAdmin() {
      return isSignedIn() && request.auth.token.isSuperAdmin == true;
    }
    
    // ============ Users ============
    match /users/{userId} {
      // 所有登入使用者可讀取使用者列表（用於搜尋）
      allow read: if isSignedIn();
      
      // 使用者只能更新自己的非權限欄位
      allow update: if isSignedIn() && 
                      request.auth.uid == userId &&
                      !request.resource.data.diff(resource.data).affectedKeys()
                        .hasAny(['isAdmin', 'isSuperAdmin', 'isWildernessPartner']);
      
      // 權限欄位只能透過 Cloud Function 更新
      // 這裡不開放直接寫入權限欄位
    }
    
    // ============ Tags ============
    match /tags/{tagId} {
      // 所有人可讀取標籤
      allow read: if true;
      
      // 只有超級管理員可建立/更新標籤
      allow create, update: if isSuperAdmin();
      
      // 刪除透過 Cloud Function 處理（需清理關聯）
      allow delete: if false;
    }
    
    // ============ Platform Settings ============
    match /platform_settings/config {
      // 所有人可讀取設定
      allow read: if true;
      
      // 只有超級管理員可更新設定
      allow write: if isSuperAdmin();
    }
    
    // ============ Admin Logs ============
    match /admin_logs/{logId} {
      // 管理員可讀取日誌
      allow read: if isAdmin();
      
      // 只允許管理員透過安全的方式寫入
      // Cloud Function 會驗證操作者身份
      allow create: if isAdmin();
      
      // 日誌不可更新或刪除
      allow update, delete: if false;
    }
  }
}
```

---

## 索引需求

```
// firestore.indexes.json
{
  "indexes": [
    // 使用者列表：按角色篩選
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "isAdmin", "order": "ASCENDING" },
        { "fieldPath": "email", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "isSuperAdmin", "order": "ASCENDING" },
        { "fieldPath": "email", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "isWildernessPartner", "order": "ASCENDING" },
        { "fieldPath": "email", "order": "ASCENDING" }
      ]
    },
    // 系統日誌：按時間篩選
    {
      "collectionGroup": "admin_logs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    // 系統日誌：按操作類型和時間篩選
    {
      "collectionGroup": "admin_logs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "actionType", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    // 系統日誌：按操作者和時間篩選
    {
      "collectionGroup": "admin_logs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "adminId", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    }
  ]
}
```
````
