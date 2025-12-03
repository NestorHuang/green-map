# 資料模型：地點資訊錯誤回報

**功能分支**: `004-error-reporting`
**建立日期**: 2025-12-03

## 實體關係圖

```
┌─────────────────────────────────┐
│    Firestore: /users/{uid}       │
│  ┌───────────────────────────┐  │
│  │      UserDocument         │  │
│  │  (defined in Epic 002)    │  │
│  │  + lastReportedAt         │←─┼── 冷卻機制用
│  └───────────────────────────┘  │
└─────────────────────────────────┘
              │ 1:N
              ▼
┌─────────────────────────────────┐
│  Firestore: /error_reports/{id}  │
│  ┌───────────────────────────┐  │
│  │       ErrorReport         │  │
│  │  - locationId             │──┼──► /locations/{id}
│  │  - locationName (冗餘)    │  │
│  │  - errorType              │  │
│  │  - description            │  │
│  │  - reportedBy             │──┼──► /users/{uid}
│  │  - reporterInfo (嵌入)    │  │
│  │  - status                 │  │
│  │  - createdAt              │  │
│  │  - resolvedAt             │  │
│  │  - resolvedBy             │──┼──► /users/{uid} (管理員)
│  │  - adminNote              │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

## 實體定義

### ErrorReport (錯誤回報)

**Firestore 路徑**: `/error_reports/{reportId}`

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `locationId` | string | ✅ | 被回報的地點 ID |
| `locationName` | string | ✅ | 被回報的地點名稱 (冗餘儲存) |
| `errorType` | ErrorType | ✅ | 錯誤類型 |
| `description` | string \| null | ❌ | 詳細說明 (10-500 字元，「其他」類型必填) |
| `reportedBy` | string | ✅ | 回報者 User ID |
| `reporterInfo` | ReporterInfo | ✅ | 回報者資訊 (嵌入) |
| `status` | ReportStatus | ✅ | 處理狀態 |
| `createdAt` | Timestamp | ✅ | 回報時間 |
| `resolvedAt` | Timestamp | ❌ | 處理時間 (已處理時) |
| `resolvedBy` | string | ❌ | 處理者 User ID (已處理時) |
| `adminNote` | string | ❌ | 管理員備註 (處理結果說明) |

### ReporterInfo (回報者資訊)

**嵌入於**: `ErrorReport.reporterInfo`

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `displayName` | string | ✅ | 回報者顯示名稱 |

### UserDocument 擴展

**Firestore 路徑**: `/users/{userId}` (已在 Epic 002 定義，此處新增欄位)

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `lastReportedAt` | Timestamp | ❌ | 最後一次提交錯誤回報的時間 (冷卻機制用) |

## TypeScript 型別定義

```typescript
import { Timestamp } from 'firebase/firestore';

// 錯誤類型
export type ErrorType = 
  | 'closed'              // 已歇業
  | 'address_error'       // 地址錯誤
  | 'phone_error'         // 電話錯誤
  | 'description_mismatch' // 描述不符
  | 'photo_mismatch'      // 照片不符
  | 'other';              // 其他

// 錯誤類型選項
export const ERROR_TYPE_OPTIONS: { value: ErrorType; label: string }[] = [
  { value: 'closed', label: '已歇業' },
  { value: 'address_error', label: '地址錯誤' },
  { value: 'phone_error', label: '電話錯誤' },
  { value: 'description_mismatch', label: '描述不符' },
  { value: 'photo_mismatch', label: '照片不符' },
  { value: 'other', label: '其他' },
];

// 回報狀態
export type ReportStatus = 'pending' | 'resolved' | 'ignored';

// 回報者資訊
export interface ReporterInfo {
  displayName: string;
}

// 錯誤回報
export interface ErrorReport {
  id?: string; // Firestore 文件 ID
  locationId: string;
  locationName: string;
  errorType: ErrorType;
  description: string | null;
  reportedBy: string;
  reporterInfo: ReporterInfo;
  status: ReportStatus;
  createdAt: Timestamp;
  resolvedAt?: Timestamp;
  resolvedBy?: string;
  adminNote?: string;
}

// 建立回報請求
export interface CreateErrorReportRequest {
  locationId: string;
  locationName: string;
  errorType: ErrorType;
  description?: string;
}

// 狀態顯示配置
export const REPORT_STATUS_CONFIG: Record<ReportStatus, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  pending: {
    label: '待處理',
    color: 'text-yellow-800',
    bgColor: 'bg-yellow-100',
  },
  resolved: {
    label: '已處理',
    color: 'text-green-800',
    bgColor: 'bg-green-100',
  },
  ignored: {
    label: '已忽略',
    color: 'text-gray-800',
    bgColor: 'bg-gray-100',
  },
};
```

## Firestore 安全規則

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // 錯誤回報集合
    match /error_reports/{reportId} {
      // 讀取規則
      allow read: if canReadReport();
      
      // 建立規則
      allow create: if request.auth != null 
        && validReportCreate(request.resource.data);
      
      // 更新規則 (僅管理員)
      allow update: if request.auth != null 
        && request.auth.token.isAdmin == true
        && validReportUpdate(request.resource.data);
    }
    
    // 是否可讀取回報
    function canReadReport() {
      // 自己的回報
      return (request.auth != null && resource.data.reportedBy == request.auth.uid)
        // 或管理員
        || (request.auth != null && request.auth.token.isAdmin == true);
    }
    
    // 驗證回報建立
    function validReportCreate(data) {
      return data.keys().hasAll([
        'locationId', 'locationName', 'errorType', 
        'reportedBy', 'reporterInfo', 'status', 'createdAt'
      ])
        && data.reportedBy == request.auth.uid
        && data.status == 'pending'
        && validErrorType(data.errorType)
        && validDescription(data);
    }
    
    // 驗證錯誤類型
    function validErrorType(type) {
      return type in ['closed', 'address_error', 'phone_error', 
                      'description_mismatch', 'photo_mismatch', 'other'];
    }
    
    // 驗證描述
    function validDescription(data) {
      // 「其他」類型必須有描述
      return data.errorType != 'other' 
        || (data.description is string 
            && data.description.size() >= 10 
            && data.description.size() <= 500);
    }
    
    // 驗證回報更新 (管理員)
    function validReportUpdate(data) {
      return data.status in ['resolved', 'ignored']
        && data.resolvedAt == request.time
        && data.resolvedBy == request.auth.uid;
    }
  }
}
```

## 索引需求

### Firestore 索引

```json
{
  "indexes": [
    {
      "collectionGroup": "error_reports",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "reportedBy", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "error_reports",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "reportedBy", "order": "ASCENDING" },
        { "fieldPath": "locationId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "error_reports",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

## localStorage 快取結構

```typescript
// 冷卻時間快取
interface CooldownCache {
  key: 'lastReportedAt';
  value: number; // timestamp in milliseconds
}

// 讀取
const cached = localStorage.getItem('lastReportedAt');
const lastReported = cached ? parseInt(cached) : null;

// 寫入
localStorage.setItem('lastReportedAt', Date.now().toString());
```
