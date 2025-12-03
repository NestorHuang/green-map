# 資料模型: 動態地點類型系統

**功能**: 007-dynamic-location-types
**日期**: 2025-12-03
**狀態**: 完成

## 實體關係圖

```
┌──────────────────────┐      ┌──────────────────────┐
│    LocationType      │      │      Location        │
├──────────────────────┤      ├──────────────────────┤
│ id: string (PK)      │◄─────│ typeId: string (FK)  │
│ name: string         │      │ dynamicFields: Map   │
│ description: string  │      │ ... (existing)       │
│ icon: string         │      └──────────────────────┘
│ color: string        │
│ order: number        │
│ isActive: boolean    │
│ fieldSchema: Array   │
│ createdAt: Timestamp │
│ createdBy: string    │
│ updatedAt: Timestamp │
│ updatedBy: string    │
└──────────────────────┘
         │
         │ contains
         ▼
┌──────────────────────┐
│    FieldSchema       │
├──────────────────────┤
│ fieldId: string      │
│ label: string        │
│ type: FieldType      │
│ required: boolean    │
│ order: number        │
│ placeholder: string  │
│ validation: object   │
│ options: Array       │
│ displayInList: bool  │
│ displayInDetail: bool│
└──────────────────────┘
```

---

## 實體定義

### LocationType (地點類型)

**集合路徑**: `location_types/{typeId}`

| 欄位 | 類型 | 必填 | 描述 | 驗證規則 |
|------|------|------|------|----------|
| `id` | string | ✅ | 類型唯一識別碼 | 自動生成 (Firestore doc ID) |
| `name` | string | ✅ | 類型名稱 | 3-50 字元，唯一 |
| `description` | string | ❌ | 類型描述 | 最多 200 字元 |
| `icon` | string | ✅ | Emoji 圖示 | 有效 emoji 字元 |
| `color` | string | ✅ | 標記顏色 | HEX 格式 (#RRGGBB) |
| `order` | number | ✅ | 排序順序 | 正整數，預設 0 |
| `isActive` | boolean | ✅ | 是否啟用 | 預設 true |
| `fieldSchema` | FieldSchema[] | ✅ | 欄位配置陣列 | 最多 20 個欄位 |
| `createdAt` | Timestamp | ✅ | 建立時間 | 伺服器時間戳 |
| `createdBy` | string | ✅ | 建立者 ID | 有效 userId |
| `updatedAt` | Timestamp | ✅ | 更新時間 | 伺服器時間戳 |
| `updatedBy` | string | ✅ | 更新者 ID | 有效 userId |

**索引**:
- `isActive` (篩選啟用類型)
- `order` (排序)
- `name` (唯一性檢查)

---

### FieldSchema (欄位配置)

**內嵌於**: `LocationType.fieldSchema`

| 欄位 | 類型 | 必填 | 描述 | 驗證規則 |
|------|------|------|------|----------|
| `fieldId` | string | ✅ | 欄位唯一識別碼 | camelCase，同一類型內唯一 |
| `label` | string | ✅ | 顯示標籤 | 1-50 字元 |
| `type` | FieldType | ✅ | 欄位類型 | 見 FieldType 列舉 |
| `required` | boolean | ✅ | 是否必填 | 預設 false |
| `order` | number | ✅ | 顯示順序 | 正整數 |
| `placeholder` | string | ❌ | 提示文字 | 最多 100 字元 |
| `validation` | ValidationRule | ❌ | 驗證規則 | 見 ValidationRule |
| `options` | FieldOption[] | ❌ | 選項列表 | 僅 select/multiSelect/radio/checkbox |
| `displayInList` | boolean | ✅ | 地圖標記顯示 | 預設 false |
| `displayInDetail` | boolean | ✅ | 詳情面板顯示 | 預設 true |

---

### FieldType (欄位類型列舉)

| 值 | 描述 | 前端元件 | 資料類型 |
|----|------|----------|----------|
| `text` | 單行文字 | `<input type="text">` | string |
| `textarea` | 多行文字 | `<textarea>` | string |
| `number` | 數字 | `<input type="number">` | number |
| `select` | 單選下拉 | `<select>` | string |
| `multiSelect` | 多選下拉 | Multi-select component | string[] |
| `radio` | 單選按鈕 | `<input type="radio">` | string |
| `checkbox` | 多選核取 | `<input type="checkbox">` | string[] |
| `date` | 日期 | `<input type="date">` | string (ISO) |
| `time` | 時間 | `<input type="time">` | string (HH:mm) |
| `datetime` | 日期時間 | `<input type="datetime-local">` | string (ISO) |
| `boolean` | 是/否開關 | Toggle switch | boolean |
| `url` | 網址 | `<input type="url">` | string |

---

### ValidationRule (驗證規則)

| 欄位 | 類型 | 適用類型 | 描述 |
|------|------|----------|------|
| `min` | number | text, textarea, number | 最小值/長度 |
| `max` | number | text, textarea, number | 最大值/長度 |
| `pattern` | string | text, url | 正規表達式 |
| `minLength` | number | text, textarea | 最小字元數 |
| `maxLength` | number | text, textarea | 最大字元數 |

---

### FieldOption (欄位選項)

**適用於**: `select`, `multiSelect`, `radio`, `checkbox`

| 欄位 | 類型 | 必填 | 描述 |
|------|------|------|------|
| `value` | string | ✅ | 選項值 (儲存用) |
| `label` | string | ✅ | 顯示標籤 |
| `disabled` | boolean | ❌ | 是否停用 (預設 false) |

---

### Location (地點 - 修改)

**集合路徑**: `locations/{locationId}`

**新增欄位**:

| 欄位 | 類型 | 必填 | 描述 | 驗證規則 |
|------|------|------|------|----------|
| `typeId` | string | ✅ | 地點類型 ID | 參照 location_types |
| `dynamicFields` | Map<string, any> | ✅ | 動態欄位值 | 鍵為 fieldId |

**資料範例**:
```json
{
  "id": "loc_abc123",
  "name": "台北荒野會館",
  "typeId": "type_venue",
  "dynamicFields": {
    "capacity": 50,
    "equipment": ["projector", "whiteboard"],
    "hasParking": true,
    "reservationUrl": "https://..."
  }
}
```

---

## 預設資料

### 預設類型: 一般地點

```json
{
  "id": "general",
  "name": "一般地點",
  "description": "預設地點類型，適用於一般綠色據點",
  "icon": "📍",
  "color": "#4CAF50",
  "order": 0,
  "isActive": true,
  "fieldSchema": [],
  "createdAt": "2025-12-03T00:00:00Z",
  "createdBy": "system",
  "updatedAt": "2025-12-03T00:00:00Z",
  "updatedBy": "system"
}
```

---

## 狀態轉換

### LocationType 生命週期

```
┌─────────┐     建立      ┌─────────┐
│  草稿   │ ──────────► │  啟用   │
│ (draft) │              │(active) │
└─────────┘              └────┬────┘
                              │
                    停用      │ 刪除
                    ▼         ▼
              ┌─────────┐  ┌─────────┐
              │  停用   │  │  轉移   │
              │(inactive)│ │(migrate)│
              └─────────┘  └─────────┘
```

**狀態說明**:
- **啟用 (isActive=true)**: 可用於新地點提交
- **停用 (isActive=false)**: 不可用於新提交，現有地點保留
- **轉移**: 刪除類型時，現有地點遷移到目標類型

---

## TypeScript 類型定義

```typescript
// types/locationType.ts

export type FieldType = 
  | 'text' 
  | 'textarea' 
  | 'number' 
  | 'select' 
  | 'multiSelect' 
  | 'radio' 
  | 'checkbox' 
  | 'date' 
  | 'time' 
  | 'datetime' 
  | 'boolean' 
  | 'url';

export interface ValidationRule {
  min?: number;
  max?: number;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
}

export interface FieldOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface FieldSchema {
  fieldId: string;
  label: string;
  type: FieldType;
  required: boolean;
  order: number;
  placeholder?: string;
  validation?: ValidationRule;
  options?: FieldOption[];
  displayInList: boolean;
  displayInDetail: boolean;
}

export interface LocationType {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  order: number;
  isActive: boolean;
  fieldSchema: FieldSchema[];
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

export interface DynamicFields {
  [fieldId: string]: string | number | boolean | string[];
}

export interface Location {
  // ... existing fields
  typeId: string;
  dynamicFields: DynamicFields;
}
```

---

## Firestore 索引

```yaml
# firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "location_types",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "isActive", "order": "ASCENDING" },
        { "fieldPath": "order", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "locations",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "typeId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    }
  ]
}
```
