# 資料模型：使用者認證與個人檔案

**功能分支**: `002-user-auth`
**建立日期**: 2025-12-03

## 實體關係圖

```
┌─────────────────────────────────┐
│           Firebase Auth          │
│  ┌───────────────────────────┐  │
│  │         User              │  │
│  │  - uid (PK)               │  │
│  │  - email                  │  │
│  │  - emailVerified          │  │
│  │  - displayName            │  │
│  │  - photoURL               │  │
│  │  - customClaims           │  │
│  │    - isWildernessPartner  │  │
│  │    - isAdmin              │  │
│  │    - isSuperAdmin         │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
              │ 1:1
              ▼
┌─────────────────────────────────┐
│    Firestore: /users/{uid}       │
│  ┌───────────────────────────┐  │
│  │      UserDocument         │  │
│  │  - displayName            │  │
│  │  - email                  │  │
│  │  - emailVerified          │  │
│  │  - photoURL               │  │
│  │  - isWildernessPartner    │  │
│  │  - wildernessInfo (嵌入)  │  │
│  │  - createdAt              │  │
│  │  - updatedAt              │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
              │ 1:N
              ▼
┌─────────────────────────────────┐
│  Storage: /avatars/{uid}/        │
│  ┌───────────────────────────┐  │
│  │   original.jpg (≤2MB)     │  │
│  │   small.jpg (32x32)       │  │
│  │   medium.jpg (128x128)    │  │
│  │   large.jpg (512x512)     │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

## 實體定義

### UserDocument (使用者文件)

**Firestore 路徑**: `/users/{userId}` (文件規範：所有 Firestore 路徑統一使用前導斜線格式)

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `displayName` | string | ✅ | 顯示名稱 (2-50 字元) |
| `email` | string | ✅ | Email 地址 |
| `emailVerified` | boolean | ✅ | Email 是否已驗證 |
| `photoURL` | string \| null | ❌ | 頭像 URL (medium 尺寸) |
| `isWildernessPartner` | boolean | ✅ | 是否為荒野夥伴 |
| `wildernessInfo` | WildernessInfo \| null | ❌ | 荒野夥伴資訊 (僅夥伴有) |
| `createdAt` | Timestamp | ✅ | 帳號建立時間 |
| `updatedAt` | Timestamp | ✅ | 最後更新時間 |

### WildernessInfo (荒野夥伴資訊)

**嵌入於**: `UserDocument.wildernessInfo`

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `wildernessId` | string | ✅ | 荒野編號 (使用者自填, 1-50 字元) |
| `chapter` | string | ✅ | 所屬分會 (UI 顯示：「團名/分會」, 1-30 字元) |
| `natureName` | string | ✅ | 自然名 (2-20 字元) |
| `filledAt` | Timestamp | ✅ | 首次填寫時間 |
| `updatedAt` | Timestamp | ✅ | 最後更新時間 |

## TypeScript 型別定義

```typescript
import { Timestamp } from 'firebase/firestore';

// 荒野夥伴資訊
export interface WildernessInfo {
  wildernessId: string;
  chapter: string;
  natureName: string;
  filledAt: Timestamp;
  updatedAt: Timestamp;
}

// 使用者文件
export interface UserDocument {
  displayName: string;
  email: string;
  emailVerified: boolean;
  photoURL: string | null;
  isWildernessPartner: boolean;
  wildernessInfo: WildernessInfo | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Custom Claims 結構
export interface UserClaims {
  isWildernessPartner?: boolean;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
}

// 擴展的使用者物件 (含 Claims)
export interface AppUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  photoURL: string | null;
  claims: UserClaims;
}

// 頭像 URL 結構
export interface AvatarURLs {
  original: string;
  small: string;   // 32x32
  medium: string;  // 128x128
  large: string;   // 512x512
}

// 提交者資訊 (供 Location 使用)
export interface SubmitterInfo {
  userId: string;
  displayName: string;
  isWildernessPartner: boolean;
  formattedName: string; // 一般使用者: displayName, 荒野夥伴: "團名-自然名"
}
```

## Firestore 安全規則

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // 使用者文件
    match /users/{userId} {
      // 任何已登入使用者可讀取任何使用者的公開資訊
      allow read: if request.auth != null;
      
      // 只能建立自己的文件
      allow create: if request.auth != null 
        && request.auth.uid == userId
        && validUserCreate(request.resource.data);
      
      // 只能更新自己的文件，且不能修改權限相關欄位
      allow update: if request.auth != null 
        && request.auth.uid == userId
        && validUserUpdate(request.resource.data, resource.data);
    }
    
    // 驗證使用者建立
    function validUserCreate(data) {
      return data.keys().hasAll(['displayName', 'email', 'emailVerified', 'createdAt', 'updatedAt'])
        && data.displayName is string
        && data.displayName.size() >= 2
        && data.displayName.size() <= 50
        && data.email is string
        && data.emailVerified is bool
        && data.isWildernessPartner == false
        && data.createdAt == request.time
        && data.updatedAt == request.time;
    }
    
    // 驗證使用者更新
    function validUserUpdate(newData, oldData) {
      // 不允許修改這些欄位
      let immutableFields = ['email', 'createdAt'];
      let noImmutableChange = !immutableFields.hasAny(
        newData.diff(oldData).affectedKeys()
      );
      
      // 名稱驗證
      let validName = newData.displayName is string
        && newData.displayName.size() >= 2
        && newData.displayName.size() <= 50;
      
      return noImmutableChange && validName && newData.updatedAt == request.time;
    }
  }
}
```

## Storage 安全規則

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // 頭像儲存
    match /avatars/{userId}/{fileName} {
      // 任何人可讀取（頭像為公開）
      allow read: if true;
      
      // 只能上傳自己的頭像
      allow write: if request.auth != null 
        && request.auth.uid == userId
        && isValidAvatarUpload();
    }
    
    function isValidAvatarUpload() {
      // 檔案大小限制 2MB
      let maxSize = 2 * 1024 * 1024;
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
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "isWildernessPartner", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

## 資料遷移注意事項

### 初始化

1. 首次部署時，使用者文件會在註冊時自動建立
2. 荒野夥伴狀態需透過 Cloud Function 設定 Custom Claims

### 版本更新

如果未來需要更新資料結構：

1. 新增欄位時使用預設值
2. 刪除欄位時先標記為 deprecated
3. 使用 Cloud Function 批次更新現有資料
