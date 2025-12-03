# 資料模型：地點提交與貢獻

**功能分支**: `003-location-contribution`
**建立日期**: 2025-12-03

## 實體關係圖

```
┌─────────────────────────────────┐
│    Firestore: /users/{uid}       │
│  ┌───────────────────────────┐  │
│  │      UserDocument         │  │
│  │  (defined in Epic 002)    │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
              │ 1:N
              ▼
┌─────────────────────────────────┐
│  Firestore: /locations/{id}      │
│  ┌───────────────────────────┐  │
│  │        Location           │  │
│  │  - name                   │  │
│  │  - address                │  │
│  │  - coordinates (GeoPoint) │  │
│  │  - description            │  │
│  │  - tagIds[]               │──┼──► /tags/{tagId}
│  │  - photoURLs[]            │──┼──► Storage
│  │  - status                 │  │
│  │  - submittedBy            │──┼──► /users/{uid}
│  │  - submitterInfo (嵌入)   │  │
│  │  - createdAt              │  │
│  │  - updatedAt              │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
              │ 1:N
              ▼
┌─────────────────────────────────┐
│  Storage: /locations/{id}/       │
│  ┌───────────────────────────┐  │
│  │   photo-1.jpg             │  │
│  │   photo-2.jpg             │  │
│  │   ...                     │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

## 實體定義

### Location (地點)

**Firestore 路徑**: `/locations/{locationId}`

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `name` | string | ✅ | 地點名稱 (3-100 字元) |
| `address` | string | ✅ | 地址文字 |
| `coordinates` | GeoPoint | ✅ | 經緯度座標 |
| `description` | string | ✅ | 地點描述 (10-1000 字元) |
| `tagIds` | string[] | ✅ | 標籤 ID 陣列 (1-5 個) |
| `photoURLs` | string[] | ✅ | 照片 URL 陣列 (1-5 張) |
| `status` | LocationStatus | ✅ | 審核狀態 |
| `submittedBy` | string | ✅ | 提交者 User ID |
| `submitterInfo` | SubmitterInfo | ✅ | 提交者資訊 (嵌入) |
| `createdAt` | Timestamp | ✅ | 提交時間 |
| `updatedAt` | Timestamp | ✅ | 最後更新時間 |
| `reviewedAt` | Timestamp | ❌ | 審核時間 (已審核時) |
| `reviewedBy` | string | ❌ | 審核者 User ID (已審核時) |
| `rejectionReason` | string | ❌ | 拒絕原因 (已拒絕時) |
| `version` | number | ✅ | 版本號 (樂觀鎖定用) |

### SubmitterInfo (提交者資訊)

**嵌入於**: `Location.submitterInfo`

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `userId` | string | ✅ | 提交者 User ID |
| `displayName` | string | ✅ | 顯示名稱 |
| `isWildernessPartner` | boolean | ✅ | 是否為荒野夥伴 |
| `formattedName` | string | ✅ | 格式化顯示名稱 |

### Tag (標籤)

**Firestore 路徑**: `/tags/{tagId}`

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `name` | string | ✅ | 標籤名稱 (3-20 字元) |
| `createdAt` | Timestamp | ✅ | 建立時間 |
| `createdBy` | string | ✅ | 建立者 User ID |
| `updatedAt` | Timestamp | ❌ | 最後更新時間 |

## TypeScript 型別定義

```typescript
import { Timestamp, GeoPoint } from 'firebase/firestore';

// 地點狀態
export type LocationStatus = 'pending' | 'approved' | 'rejected';

// 提交者資訊
export interface SubmitterInfo {
  userId: string;
  displayName: string;
  isWildernessPartner: boolean;
  formattedName: string; // 一般: displayName, 荒野夥伴: "團名-自然名"
}

// 地點
export interface Location {
  id?: string; // Firestore 文件 ID (查詢後填入)
  name: string;
  address: string;
  coordinates: GeoPoint;
  description: string;
  tagIds: string[];
  photoURLs: string[];
  status: LocationStatus;
  submittedBy: string;
  submitterInfo: SubmitterInfo;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
  rejectionReason?: string;
  version: number;
}

// 地點建立請求
export interface CreateLocationRequest {
  name: string;
  address: string;
  coordinates: { lat: number; lng: number };
  description: string;
  tagIds: string[];
  photoURLs: string[];
}

// 地點更新請求
export interface UpdateLocationRequest {
  name?: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
  description?: string;
  tagIds?: string[];
  photoURLs?: string[];
}

// 標籤
export interface Tag {
  id?: string;
  name: string;
  createdAt: Timestamp;
  createdBy: string;
  updatedAt?: Timestamp;
}

// 表單草稿 (localStorage)
export interface LocationDraft {
  name: string;
  address: string;
  coordinates: { lat: number; lng: number } | null;
  description: string;
  tagIds: string[];
  savedAt: number; // timestamp
}
```

## Firestore 安全規則

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // 標籤集合
    match /tags/{tagId} {
      // 所有人可讀取
      allow read: if true;
      // 只有超級管理員可寫入 (Epic 006)
      allow write: if request.auth != null 
        && request.auth.token.isSuperAdmin == true;
    }
    
    // 地點集合
    match /locations/{locationId} {
      // 讀取規則
      allow read: if canReadLocation();
      
      // 建立規則
      allow create: if request.auth != null 
        && request.auth.token.email_verified == true
        && canSubmitToday()
        && validLocationCreate(request.resource.data);
      
      // 更新規則
      allow update: if canUpdateLocation();
    }
    
    // 是否可讀取地點
    function canReadLocation() {
      // 已核准的地點所有人可讀
      return resource.data.status == 'approved'
        // 或者是自己提交的地點
        || (request.auth != null && resource.data.submittedBy == request.auth.uid)
        // 或者是管理員
        || (request.auth != null && request.auth.token.isAdmin == true);
    }
    
    // 是否可更新地點
    function canUpdateLocation() {
      // 自己提交且狀態為 pending
      let isOwnerAndPending = request.auth != null 
        && request.auth.uid == resource.data.submittedBy
        && resource.data.status == 'pending';
      
      // 管理員可更新任何地點
      let isAdmin = request.auth != null 
        && request.auth.token.isAdmin == true;
      
      return isOwnerAndPending || isAdmin;
    }
    
    // 今日提交數量檢查
    function canSubmitToday() {
      // 注意：Firestore Rules 不支援 getCount，需改用其他策略
      // 這裡簡化為 true，實際限制在前端實作
      return true;
    }
    
    // 驗證地點建立
    function validLocationCreate(data) {
      return data.keys().hasAll([
        'name', 'address', 'coordinates', 'description', 
        'tagIds', 'photoURLs', 'status', 'submittedBy', 
        'submitterInfo', 'createdAt', 'updatedAt', 'version'
      ])
        && data.status == 'pending'
        && data.submittedBy == request.auth.uid
        && data.version == 1
        && validName(data.name)
        && validDescription(data.description)
        && validTags(data.tagIds)
        && validPhotos(data.photoURLs);
    }
    
    function validName(name) {
      return name is string && name.size() >= 3 && name.size() <= 100;
    }
    
    function validDescription(desc) {
      return desc is string && desc.size() >= 10 && desc.size() <= 1000;
    }
    
    function validTags(tagIds) {
      return tagIds is list && tagIds.size() >= 1 && tagIds.size() <= 5;
    }
    
    function validPhotos(photoURLs) {
      return photoURLs is list && photoURLs.size() >= 1 && photoURLs.size() <= 5;
    }
  }
}
```

## Storage 安全規則

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // 地點照片儲存
    match /locations/{locationId}/{fileName} {
      // 任何人可讀取已核准地點的照片
      allow read: if true;
      
      // 已驗證使用者可上傳
      allow write: if request.auth != null 
        && request.auth.token.email_verified == true
        && isValidPhotoUpload();
    }
    
    function isValidPhotoUpload() {
      // 檔案大小限制 5MB
      let maxSize = 5 * 1024 * 1024;
      // 僅允許 JPEG 和 PNG
      let allowedTypes = ['image/jpeg', 'image/png'];
      
      return request.resource.size <= maxSize
        && request.resource.contentType in allowedTypes;
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
      "collectionGroup": "locations",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "locations",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "submittedBy", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "locations",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "submittedBy", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

## 預設標籤資料

```json
[
  { "id": "vegan", "name": "全素/蔬食" },
  { "id": "organic", "name": "有機" },
  { "id": "local-produce", "name": "在地食材" },
  { "id": "zero-waste", "name": "零廢棄" },
  { "id": "eco-friendly", "name": "環保用品" },
  { "id": "secondhand", "name": "二手商店" },
  { "id": "repair", "name": "維修服務" },
  { "id": "bulk-buying", "name": "裸買商店" },
  { "id": "sustainable-fashion", "name": "永續時尚" },
  { "id": "green-space", "name": "綠色空間" }
]
```
