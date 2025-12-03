````markdown
# 資料模型：管理員審核與管理

**功能分支**: `005-admin-management`
**建立日期**: 2025-12-03

## 實體關係圖

```
┌─────────────────────────────────────────────────────────────────────┐
│                        管理員審核系統實體關係圖                        │
└─────────────────────────────────────────────────────────────────────┘

                          ┌──────────────────┐
                          │  users/{uid}     │
                          │ (Custom Claims)  │
                          │ isAdmin: true    │
                          └────────┬─────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
         ▼                         ▼                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────────┐
│ locations/{id}  │     │ error_reports   │     │ wilderness_         │
│                 │     │ /{id}           │     │ verifications/{id}  │
│ + version       │     │                 │     │                     │
│ + status        │     │ + status        │     │ + status            │
│ + reviewedAt    │     │ + resolvedAt    │     │ + verifiedAt        │
│ + reviewedBy    │     │ + resolvedBy    │     │ + verifiedBy        │
│ + rejectionReason │   │ + adminNote     │     │ + rejectionReason   │
└────────┬────────┘     └────────┬────────┘     └──────────┬──────────┘
         │                       │                         │
         │                       │                         │
         └───────────────────────┼─────────────────────────┘
                                 │
                                 ▼
                      ┌─────────────────────┐
                      │  admin_logs/{id}    │
                      │                     │
                      │  actionType         │
                      │  adminId            │
                      │  targetId           │
                      │  details            │
                      │  timestamp          │
                      └─────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        通知系統                                       │
└─────────────────────────────────────────────────────────────────────┘

        ┌─────────────────┐
        │  notifications  │
        │  /{userId}      │
        │  /items/{id}    │
        │                 │
        │  type           │
        │  title          │
        │  message        │
        │  read           │
        │  createdAt      │
        └─────────────────┘
```

## 實體定義

### Location (地點) - 擴展欄位

**Firestore 路徑**: `/locations/{locationId}`

此實體在 Epic 003 已定義，以下為 Epic 005 新增的審核相關欄位：

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `version` | number | ✅ | 版本號，用於樂觀鎖定，每次更新遞增 |
| `status` | LocationStatus | ✅ | 地點狀態：pending / approved / rejected |
| `reviewedAt` | Timestamp | ❌ | 審核時間（已審核時） |
| `reviewedBy` | string | ❌ | 審核者 User ID（已審核時） |
| `rejectionReason` | string | ❌ | 拒絕原因（被拒絕時，10-200 字元） |

```typescript
export type LocationStatus = 'pending' | 'approved' | 'rejected';

// 完整 Location 類型（含審核欄位）
export interface Location {
  id?: string;
  name: string;
  address: string;
  coordinates: GeoPoint;
  description: string;
  photos: string[];
  tagIds: string[];
  submittedBy: string;
  submitterInfo: SubmitterInfo;
  submittedAt: Timestamp;
  
  // 審核相關欄位 (Epic 005 新增)
  version: number;
  status: LocationStatus;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
  rejectionReason?: string;
}
```

---

### Error Report (錯誤回報) - 擴展欄位

**Firestore 路徑**: `/error_reports/{reportId}`

此實體在 Epic 004 已定義，以下為 Epic 005 管理員處理相關欄位：

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `resolvedAt` | Timestamp | ❌ | 處理時間（已處理時） |
| `resolvedBy` | string | ❌ | 處理者 User ID（已處理時） |
| `adminNote` | string | ❌ | 管理員備註（10-200 字元） |

---

### Wilderness Verification (荒野夥伴驗證申請)

**Firestore 路徑**: `/wilderness_verifications/{verificationId}`

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `userId` | string | ✅ | 申請者 User ID |
| `userEmail` | string | ✅ | 申請者 Email |
| `wildernessNumber` | string | ✅ | 荒野編號 |
| `chapter` | string | ✅ | 所屬分會 |
| `natureName` | string | ✅ | 自然名 |
| `status` | VerificationStatus | ✅ | 驗證狀態 |
| `appliedAt` | Timestamp | ✅ | 申請時間 |
| `verifiedAt` | Timestamp | ❌ | 驗證時間（已處理時） |
| `verifiedBy` | string | ❌ | 驗證管理員 ID（已處理時） |
| `rejectionReason` | string | ❌ | 拒絕原因（被拒絕時，10-200 字元） |

```typescript
export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export interface WildernessVerification {
  id?: string;
  userId: string;
  userEmail: string;
  wildernessNumber: string;
  chapter: string;
  natureName: string;
  status: VerificationStatus;
  appliedAt: Timestamp;
  verifiedAt?: Timestamp;
  verifiedBy?: string;
  rejectionReason?: string;
}
```

---

### Admin Action Log (管理員操作記錄)

**Firestore 路徑**: `/admin_logs/{logId}`

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `actionType` | AdminActionType | ✅ | 操作類型 |
| `adminId` | string | ✅ | 管理員 User ID |
| `targetId` | string | ✅ | 目標 ID（地點 ID / 回報 ID / 使用者 ID） |
| `details` | object | ❌ | 操作詳情（如拒絕原因、地點名稱等） |
| `timestamp` | Timestamp | ✅ | 操作時間 |

```typescript
export type AdminActionType = 
  | 'approve_location'
  | 'reject_location'
  | 'resolve_report'
  | 'ignore_report'
  | 'verify_partner'
  | 'reject_partner';

export interface AdminActionLog {
  id?: string;
  actionType: AdminActionType;
  adminId: string;
  targetId: string;
  details?: {
    targetName?: string;
    rejectionReason?: string;
    adminNote?: string;
    [key: string]: unknown;
  };
  timestamp: Timestamp;
}

export const ACTION_TYPE_LABELS: Record<AdminActionType, string> = {
  approve_location: '核准地點',
  reject_location: '拒絕地點',
  resolve_report: '處理回報',
  ignore_report: '忽略回報',
  verify_partner: '驗證荒野夥伴',
  reject_partner: '拒絕荒野夥伴驗證',
};
```

---

### Notification (通知)

**Firestore 路徑**: `/notifications/{userId}/items/{notificationId}`

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `type` | NotificationType | ✅ | 通知類型 |
| `title` | string | ✅ | 通知標題 |
| `message` | string | ✅ | 通知內容 |
| `relatedId` | string | ❌ | 相關資源 ID（地點 ID / 回報 ID） |
| `read` | boolean | ✅ | 是否已讀 |
| `createdAt` | Timestamp | ✅ | 建立時間 |

```typescript
export type NotificationType = 
  | 'location_approved'
  | 'location_rejected'
  | 'report_resolved'
  | 'report_ignored'
  | 'partner_verified'
  | 'partner_rejected';

export interface Notification {
  id?: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string;
  read: boolean;
  createdAt: Timestamp;
}

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  location_approved: '地點審核通過',
  location_rejected: '地點審核未通過',
  report_resolved: '回報已處理',
  report_ignored: '回報已忽略',
  partner_verified: '荒野夥伴驗證通過',
  partner_rejected: '荒野夥伴驗證未通過',
};
```

---

## TypeScript 完整型別定義

```typescript
import { Timestamp, GeoPoint } from 'firebase/firestore';

// ========== 狀態類型 ==========

export type LocationStatus = 'pending' | 'approved' | 'rejected';
export type ReportStatus = 'pending' | 'resolved' | 'ignored';
export type VerificationStatus = 'pending' | 'approved' | 'rejected';

// ========== 操作類型 ==========

export type AdminActionType = 
  | 'approve_location'
  | 'reject_location'
  | 'resolve_report'
  | 'ignore_report'
  | 'verify_partner'
  | 'reject_partner';

export type NotificationType = 
  | 'location_approved'
  | 'location_rejected'
  | 'report_resolved'
  | 'report_ignored'
  | 'partner_verified'
  | 'partner_rejected';

// ========== 實體介面 ==========

export interface WildernessVerification {
  id?: string;
  userId: string;
  userEmail: string;
  wildernessNumber: string;
  chapter: string;
  natureName: string;
  status: VerificationStatus;
  appliedAt: Timestamp;
  verifiedAt?: Timestamp;
  verifiedBy?: string;
  rejectionReason?: string;
}

export interface AdminActionLog {
  id?: string;
  actionType: AdminActionType;
  adminId: string;
  targetId: string;
  details?: Record<string, unknown>;
  timestamp: Timestamp;
}

export interface Notification {
  id?: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string;
  read: boolean;
  createdAt: Timestamp;
}

// ========== 統計介面 ==========

export interface AdminStats {
  pendingLocations: number;
  pendingReports: number;
  pendingVerifications: number;
  approvedThisMonth: number;
  urgentItems: number;
}

// ========== 請求/回應介面 ==========

export interface ApproveLocationRequest {
  locationId: string;
  expectedVersion: number;
}

export interface RejectLocationRequest {
  locationId: string;
  expectedVersion: number;
  rejectionReason: string;
}

export interface ResolveReportRequest {
  reportId: string;
  adminNote?: string;
}

export interface IgnoreReportRequest {
  reportId: string;
  adminNote: string;
}

export interface VerifyPartnerRequest {
  verificationId: string;
  userId: string;
}

export interface RejectPartnerRequest {
  verificationId: string;
  rejectionReason: string;
}

// ========== UI 配置 ==========

export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  approved: { bg: 'bg-green-100', text: 'text-green-800' },
  rejected: { bg: 'bg-red-100', text: 'text-red-800' },
  resolved: { bg: 'bg-blue-100', text: 'text-blue-800' },
  ignored: { bg: 'bg-gray-100', text: 'text-gray-800' },
};

export const STATUS_LABELS: Record<string, string> = {
  pending: '待處理',
  approved: '已核准',
  rejected: '已拒絕',
  resolved: '已處理',
  ignored: '已忽略',
};
```

---

## Firestore 安全規則

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // 判斷是否為管理員
    function isAdmin() {
      return request.auth != null && request.auth.token.isAdmin == true;
    }
    
    // 地點集合
    match /locations/{locationId} {
      // 一般讀取規則（已核准的地點）
      allow read: if resource.data.status == 'approved';
      
      // 管理員可讀取所有地點
      allow read: if isAdmin();
      
      // 管理員審核更新
      allow update: if isAdmin() && validLocationReview();
    }
    
    function validLocationReview() {
      let data = request.resource.data;
      let oldData = resource.data;
      
      // 只能從 pending 狀態更新
      return oldData.status == 'pending'
        // 新狀態必須是 approved 或 rejected
        && data.status in ['approved', 'rejected']
        // 必須記錄審核時間與審核者
        && data.reviewedAt == request.time
        && data.reviewedBy == request.auth.uid
        // 版本號遞增
        && data.version == oldData.version + 1
        // 拒絕時必須有原因
        && (data.status != 'rejected' 
            || (data.rejectionReason is string 
                && data.rejectionReason.size() >= 10 
                && data.rejectionReason.size() <= 200));
    }
    
    // 錯誤回報集合
    match /error_reports/{reportId} {
      // 回報者可讀取自己的回報
      allow read: if request.auth != null 
        && resource.data.reportedBy == request.auth.uid;
      
      // 管理員可讀取所有回報
      allow read: if isAdmin();
      
      // 管理員處理回報
      allow update: if isAdmin() && validReportReview();
    }
    
    function validReportReview() {
      let data = request.resource.data;
      let oldData = resource.data;
      
      return oldData.status == 'pending'
        && data.status in ['resolved', 'ignored']
        && data.resolvedAt == request.time
        && data.resolvedBy == request.auth.uid
        // 忽略時必須有備註
        && (data.status != 'ignored' 
            || (data.adminNote is string 
                && data.adminNote.size() >= 10 
                && data.adminNote.size() <= 200));
    }
    
    // 荒野夥伴驗證集合
    match /wilderness_verifications/{verificationId} {
      // 申請者可讀取自己的申請
      allow read: if request.auth != null 
        && resource.data.userId == request.auth.uid;
      
      // 管理員可讀取所有申請
      allow read: if isAdmin();
      
      // 管理員處理驗證
      allow update: if isAdmin() && validVerificationReview();
    }
    
    function validVerificationReview() {
      let data = request.resource.data;
      let oldData = resource.data;
      
      return oldData.status == 'pending'
        && data.status in ['approved', 'rejected']
        && data.verifiedAt == request.time
        && data.verifiedBy == request.auth.uid
        // 拒絕時必須有原因
        && (data.status != 'rejected' 
            || (data.rejectionReason is string 
                && data.rejectionReason.size() >= 10 
                && data.rejectionReason.size() <= 200));
    }
    
    // 管理員操作記錄
    match /admin_logs/{logId} {
      // 只有管理員可讀寫
      allow read, write: if isAdmin();
    }
    
    // 通知集合（子集合）
    match /notifications/{userId}/items/{notificationId} {
      // 只能讀取自己的通知
      allow read: if request.auth != null && request.auth.uid == userId;
      
      // 只能更新已讀狀態
      allow update: if request.auth != null 
        && request.auth.uid == userId
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['read']);
    }
  }
}
```

---

## Firestore 索引需求

```json
{
  "indexes": [
    {
      "collectionGroup": "locations",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "submittedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "locations",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "reviewedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "error_reports",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "wilderness_verifications",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "appliedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "admin_logs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "actionType", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
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

---

## 資料遷移注意事項

### 現有 Location 文件更新

現有的 `locations` 集合文件需要新增 `version` 欄位：

```typescript
// 遷移腳本（一次性執行）
const migrateLocations = async () => {
  const snapshot = await getDocs(collection(db, 'locations'));
  const batch = writeBatch(db);
  
  snapshot.docs.forEach(doc => {
    if (!doc.data().version) {
      batch.update(doc.ref, { version: 1 });
    }
  });
  
  await batch.commit();
};
```

### 通知集合初始化

通知使用子集合結構，不需要預先建立集合，第一次寫入時會自動建立。

````
