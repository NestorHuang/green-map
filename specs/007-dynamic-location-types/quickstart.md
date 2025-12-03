# 快速入門: 動態地點類型系統

**功能**: 007-dynamic-location-types
**日期**: 2025-12-03

## 前置條件

確保已完成以下前置功能：
- ✅ 超級管理員系統 (Epic 6)
- ✅ 地點提交功能 (Epic 3)
- ✅ 地圖瀏覽功能 (Epic 1)
- ✅ 管理員審核系統 (Epic 5)

## 環境設置

### 1. 安裝相依套件

```bash
# 前端相依
npm install react-hook-form zod @hookform/resolvers
npm install @googlemaps/markerclusterer

# Firebase Cloud Functions (如尚未安裝)
cd functions
npm install firebase-admin firebase-functions
```

### 2. 環境變數

確保 `.env` 包含：

```env
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_GOOGLE_MAPS_API_KEY=your-api-key
```

### 3. Firestore 安全規則

更新 `firestore.rules`：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // 類型管理 - 僅 superAdmin 可寫入
    match /location_types/{typeId} {
      allow read: if true;
      allow write: if request.auth != null 
                   && request.auth.token.isSuperAdmin == true;
    }
    
    // 地點提交 - 需驗證 typeId
    match /locations/{locationId} {
      allow read: if true;
      allow create: if request.auth != null
                    && exists(/databases/$(database)/documents/location_types/$(request.resource.data.typeId))
                    && get(/databases/$(database)/documents/location_types/$(request.resource.data.typeId)).data.isActive == true;
      allow update, delete: if request.auth != null 
                            && (request.auth.token.isAdmin == true || request.auth.token.isSuperAdmin == true);
    }
  }
}
```

### 4. 部署安全規則

```bash
firebase deploy --only firestore:rules
```

## 核心流程

### 流程 1: 建立地點類型 (超級管理員)

```
1. 登入 → 前往 /admin/types
2. 點擊「新增類型」
3. 填寫基本資訊 (名稱、描述)
4. 選擇圖示和顏色
5. 配置動態欄位
6. 儲存
```

### 流程 2: 提交地點 (使用者)

```
1. 登入 → 點擊「新增地點」
2. 選擇地點類型
3. 填寫共同欄位 + 動態欄位
4. 提交審核
```

### 流程 3: 地圖篩選 (訪客)

```
1. 開啟地圖頁面
2. 查看類型化標記
3. 點擊類型篩選按鈕
4. 查看篩選後的標記
```

## 關鍵元件

### 動態表單生成器

```tsx
// components/forms/DynamicForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { buildZodSchema } from '@/utils/schemaBuilder';
import { DynamicField } from './DynamicField';

interface DynamicFormProps {
  fields: FieldSchema[];
  onSubmit: (data: DynamicFields) => void;
}

export function DynamicForm({ fields, onSubmit }: DynamicFormProps) {
  const schema = buildZodSchema(fields);
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {fields.sort((a, b) => a.order - b.order).map(field => (
        <DynamicField
          key={field.fieldId}
          field={field}
          register={register}
          error={errors[field.fieldId]}
        />
      ))}
      <button type="submit">提交</button>
    </form>
  );
}
```

### 類型化地圖標記

```tsx
// components/map/TypedMarker.tsx
import { useEffect, useRef } from 'react';

interface TypedMarkerProps {
  location: Location;
  type: LocationType;
  map: google.maps.Map;
  onClick: () => void;
}

export function TypedMarker({ location, type, map, onClick }: TypedMarkerProps) {
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  useEffect(() => {
    const content = document.createElement('div');
    content.className = 'typed-marker';
    content.style.cssText = `
      background-color: ${type.color};
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    `;
    content.innerHTML = `<span style="font-size: 20px;">${type.icon}</span>`;
    content.addEventListener('click', onClick);

    markerRef.current = new google.maps.marker.AdvancedMarkerElement({
      map,
      position: location.coordinates,
      content,
    });

    return () => {
      if (markerRef.current) {
        markerRef.current.map = null;
      }
    };
  }, [location, type, map, onClick]);

  return null;
}
```

### 類型篩選器

```tsx
// components/map/TypeFilter.tsx
interface TypeFilterProps {
  types: LocationType[];
  selectedTypeId: string | null;
  onSelect: (typeId: string | null) => void;
}

export function TypeFilter({ types, selectedTypeId, onSelect }: TypeFilterProps) {
  return (
    <div className="flex gap-2 p-2 overflow-x-auto">
      <button
        className={`px-4 py-2 rounded-full min-w-[44px] min-h-[44px] ${
          !selectedTypeId ? 'bg-green-600 text-white' : 'bg-gray-200'
        }`}
        onClick={() => onSelect(null)}
      >
        全部
      </button>
      {types.map(type => (
        <button
          key={type.id}
          className={`flex items-center gap-1 px-4 py-2 rounded-full min-w-[44px] min-h-[44px] ${
            selectedTypeId === type.id ? 'bg-green-600 text-white' : 'bg-gray-200'
          }`}
          onClick={() => onSelect(type.id)}
        >
          <span>{type.icon}</span>
          <span className="hidden sm:inline">{type.name}</span>
        </button>
      ))}
    </div>
  );
}
```

## 資料遷移

首次部署時執行遷移腳本：

```bash
# 透過 Firebase Console 或 CLI 呼叫
firebase functions:call migrateExistingLocations
```

## 測試檢查清單

### 類型管理
- [ ] 超級管理員可建立新類型
- [ ] 圖示選擇器顯示 50+ 圖示
- [ ] 顏色選擇器支援 6 色 + 自訂
- [ ] 欄位配置支援 12 種類型
- [ ] 類型名稱唯一性驗證
- [ ] 欄位數量限制 20 個

### 地點提交
- [ ] 類型選擇頁面顯示所有啟用類型
- [ ] 動態表單根據類型生成
- [ ] 必填欄位驗證正常
- [ ] 資料正確儲存到 Firestore

### 地圖顯示
- [ ] 標記顯示類型圖示和顏色
- [ ] 類型篩選正常運作
- [ ] MarkerClusterer 聚合正常
- [ ] 詳情面板顯示動態欄位

## 常見問題

### Q: 現有地點沒有 typeId 怎麼辦？
A: 執行 `migrateExistingLocations` Cloud Function，會自動指派到「一般地點」類型。

### Q: 修改類型欄位會影響現有地點嗎？
A: 不會。現有地點保留原有 dynamicFields，新欄位僅對之後提交的地點生效。

### Q: 如何刪除類型？
A: 若類型被使用，需選擇「轉移到其他類型」或「僅停用」。停用後現有地點保留，但不能新增。

## 下一步

完成 Phase 1 後，使用 `/speckit.tasks` 生成詳細任務清單。
