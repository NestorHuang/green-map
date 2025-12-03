# 資料模型: 地圖瀏覽與探索

**功能**: 001-map-browsing
**日期**: 2025-12-03
**狀態**: 完成

## 實體關係圖

```
┌──────────────────────┐      ┌──────────────────────┐
│      Location        │      │         Tag          │
├──────────────────────┤      ├──────────────────────┤
│ id: string (PK)      │      │ id: string (PK)      │
│ name: string         │      │ name: string         │
│ address: string      │◄─────│ order: number        │
│ coordinates: GeoPoint│      └──────────────────────┘
│ description: string  │
│ photos: string[]     │
│ tagIds: string[] (FK)│──────►
│ status: string       │
│ submitter: object    │
│ createdAt: Timestamp │
│ updatedAt: Timestamp │
└──────────────────────┘
         │
         │ contains
         ▼
┌──────────────────────┐
│    SubmitterInfo     │
├──────────────────────┤
│ userId: string       │
│ displayName: string  │
│ isWildernessPartner: │
│   boolean            │
│ groupName: string    │
│ natureName: string   │
└──────────────────────┘
```

---

## 實體定義

### Location (地點)

**集合路徑**: `locations/{locationId}`

| 欄位 | 類型 | 必填 | 描述 | 驗證規則 |
|------|------|------|------|----------|
| `id` | string | ✅ | 地點唯一識別碼 | 自動生成 (Firestore doc ID) |
| `name` | string | ✅ | 地點名稱 | 1-100 字元 |
| `address` | string | ✅ | 完整地址 | 非空字串 |
| `coordinates` | GeoPoint | ✅ | 經緯度座標 | 有效 GeoPoint |
| `description` | string | ❌ | 地點描述 | 最多 1000 字元 |
| `photos` | string[] | ❌ | 照片 URL 陣列 | 最多 5 張，有效 URL |
| `tagIds` | string[] | ✅ | 標籤 ID 陣列 | 至少 1 個有效標籤 |
| `status` | string | ✅ | 審核狀態 | 'pending' \| 'approved' \| 'rejected' |
| `submitter` | SubmitterInfo | ✅ | 提交者資訊 | 見 SubmitterInfo |
| `createdAt` | Timestamp | ✅ | 建立時間 | 伺服器時間戳 |
| `updatedAt` | Timestamp | ✅ | 更新時間 | 伺服器時間戳 |

**索引**:
- `status` (篩選已核准地點)
- `tagIds` (標籤篩選 - 若需要伺服器端篩選)

---

### SubmitterInfo (提交者資訊)

**內嵌於**: `Location.submitter`

| 欄位 | 類型 | 必填 | 描述 | 驗證規則 |
|------|------|------|------|----------|
| `userId` | string | ✅ | 使用者 ID | 有效 Firebase UID |
| `displayName` | string | ✅ | 顯示名稱 | 1-50 字元 |
| `isWildernessPartner` | boolean | ✅ | 是否為荒野夥伴 | 預設 false |
| `groupName` | string | ❌ | 團名（荒野夥伴） | 僅當 isWildernessPartner=true |
| `natureName` | string | ❌ | 自然名（荒野夥伴） | 僅當 isWildernessPartner=true |

**顯示邏輯**:
```typescript
function getSubmitterDisplay(submitter: SubmitterInfo): string {
  if (submitter.isWildernessPartner && submitter.groupName && submitter.natureName) {
    return `${submitter.groupName}-${submitter.natureName}`;
  }
  return submitter.displayName;
}
```

---

### Tag (標籤)

**集合路徑**: `tags/{tagId}`

| 欄位 | 類型 | 必填 | 描述 | 驗證規則 |
|------|------|------|------|----------|
| `id` | string | ✅ | 標籤唯一識別碼 | 自動生成或預設值 |
| `name` | string | ✅ | 標籤名稱 | 1-20 字元 |
| `order` | number | ✅ | 排序順序 | 正整數 |

**預設標籤**:
| ID | 名稱 | 順序 |
|----|------|------|
| `vegan` | 全素/蔬食 | 1 |
| `organic` | 有機農產 | 2 |
| `eco-friendly` | 環保商店 | 3 |
| `second-hand` | 二手/交換 | 4 |
| `local` | 在地小農 | 5 |
| `zero-waste` | 零廢棄 | 6 |

---

## 狀態定義

### Location.status

| 狀態 | 描述 | 地圖顯示 |
|------|------|----------|
| `pending` | 待審核 | ❌ 不顯示 |
| `approved` | 已核准 | ✅ 顯示 |
| `rejected` | 已拒絕 | ❌ 不顯示 |

---

## TypeScript 類型定義

```typescript
// types/location.ts
import { GeoPoint, Timestamp } from 'firebase/firestore';

export interface SubmitterInfo {
  userId: string;
  displayName: string;
  isWildernessPartner: boolean;
  groupName?: string;
  natureName?: string;
}

export type LocationStatus = 'pending' | 'approved' | 'rejected';

export interface Location {
  id: string;
  name: string;
  address: string;
  coordinates: GeoPoint;
  description?: string;
  photos: string[];
  tagIds: string[];
  status: LocationStatus;
  submitter: SubmitterInfo;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 前端用：將 GeoPoint 轉換為可用格式
export interface LocationWithLatLng extends Omit<Location, 'coordinates'> {
  coordinates: {
    lat: number;
    lng: number;
  };
}
```

```typescript
// types/tag.ts
export interface Tag {
  id: string;
  name: string;
  order: number;
}
```

---

## Firestore 安全規則

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // 標籤 - 所有人可讀
    match /tags/{tagId} {
      allow read: if true;
      allow write: if false; // 僅透過 Admin SDK 管理
    }
    
    // 地點 - 已核准可讀，已登入可寫
    match /locations/{locationId} {
      // 讀取：僅已核准地點
      allow read: if resource.data.status == 'approved';
      
      // 建立：已登入使用者
      allow create: if request.auth != null
                    && request.resource.data.status == 'pending'
                    && request.resource.data.submitter.userId == request.auth.uid;
      
      // 更新/刪除：僅管理員
      allow update, delete: if request.auth != null 
                            && request.auth.token.isAdmin == true;
    }
  }
}
```

---

## 資料範例

### Location 範例
```json
{
  "id": "loc_abc123",
  "name": "綠活小舖",
  "address": "高雄市前鎮區中山二路100號",
  "coordinates": {
    "_latitude": 22.6273,
    "_longitude": 120.3014
  },
  "description": "販售有機蔬果和環保生活用品的小店",
  "photos": [
    "https://storage.googleapis.com/.../photo1.jpg",
    "https://storage.googleapis.com/.../photo2.jpg"
  ],
  "tagIds": ["organic", "eco-friendly"],
  "status": "approved",
  "submitter": {
    "userId": "user123",
    "displayName": "小明",
    "isWildernessPartner": true,
    "groupName": "台南分會",
    "natureName": "樹蛙"
  },
  "createdAt": "2025-01-15T08:30:00Z",
  "updatedAt": "2025-01-16T10:00:00Z"
}
```

### Tag 範例
```json
{
  "id": "vegan",
  "name": "全素/蔬食",
  "order": 1
}
```

---

## 查詢模式

### 取得所有已核准地點
```typescript
const q = query(
  collection(db, 'locations'),
  where('status', '==', 'approved')
);
```

### 取得所有標籤（按順序）
```typescript
const q = query(
  collection(db, 'tags'),
  orderBy('order', 'asc')
);
```

### 客戶端標籤篩選
```typescript
const filteredLocations = locations.filter(loc => 
  selectedTagId ? loc.tagIds.includes(selectedTagId) : true
);
```
