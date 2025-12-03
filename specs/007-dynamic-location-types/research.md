# 研究報告: 動態地點類型系統

**功能**: 007-dynamic-location-types
**日期**: 2025-12-03
**狀態**: 完成

## 研究任務

本報告解決實作計劃中識別的技術問題和最佳實踐。

---

## 1. 動態表單生成技術選擇

### 決策: React Hook Form + Zod

### 理由
- **React Hook Form**: 輕量級、高效能的表單庫，支援非受控元件減少重渲染
- **Zod**: TypeScript-first 的 schema 驗證庫，可從 JSON schema 動態生成驗證規則
- 兩者整合良好，有官方 `@hookform/resolvers` 支援

### 考慮過的替代方案
| 替代方案 | 拒絕原因 |
|---------|---------|
| Formik + Yup | 效能較差（受控元件），社群活躍度下降 |
| React Final Form | 學習曲線較陡，文檔較少 |
| 自建表單系統 | 重複造輪子，維護成本高 |

### 實作模式
```typescript
// 從 fieldSchema 動態生成 Zod schema
const buildZodSchema = (fields: FieldSchema[]) => {
  const shape: Record<string, z.ZodTypeAny> = {};
  
  fields.forEach(field => {
    let validator = getValidatorForType(field.type);
    if (field.required) validator = validator.min(1, '此欄位為必填');
    if (field.validation?.min) validator = validator.min(field.validation.min);
    if (field.validation?.max) validator = validator.max(field.validation.max);
    shape[field.fieldId] = validator;
  });
  
  return z.object(shape);
};
```

---

## 2. Google Maps 自訂標記最佳實踐

### 決策: Advanced Markers API + HTML Overlay

### 理由
- **Advanced Markers API**: Google 官方推薦的新一代標記 API，支援自訂 HTML 內容
- 可完全控制標記外觀（emoji 圖示 + 顏色背景）
- 效能優於傳統 Custom Overlay
- 原生支援無障礙功能

### 考慮過的替代方案
| 替代方案 | 拒絕原因 |
|---------|---------|
| 傳統 Marker + Icon URL | 無法動態渲染 emoji，需預先生成圖片 |
| Custom Overlay | 實作複雜，效能開銷大 |
| 第三方地圖庫 (Mapbox) | 專案已採用 Google Maps，增加複雜度 |

### 實作模式
```typescript
const createTypedMarker = (location: Location, type: LocationType) => {
  const markerContent = document.createElement('div');
  markerContent.className = 'typed-marker';
  markerContent.style.backgroundColor = type.color;
  markerContent.innerHTML = `
    <span class="marker-icon">${type.icon}</span>
    ${type.fieldSchema.find(f => f.displayInList) 
      ? `<span class="marker-label">${location.dynamicFields[fieldId]}</span>` 
      : ''}
  `;
  
  return new google.maps.marker.AdvancedMarkerElement({
    map,
    position: location.coordinates,
    content: markerContent,
  });
};
```

---

## 3. MarkerClusterer 整合策略

### 決策: @googlemaps/markerclusterer + 自訂渲染器

### 理由
- 官方維護的 MarkerClusterer 庫，與 Advanced Markers 完美整合
- 支援自訂群集渲染器，可顯示類型分布
- 效能經過優化，處理 1000+ 標記無壓力

### 考慮過的替代方案
| 替代方案 | 拒絕原因 |
|---------|---------|
| supercluster | 需要額外整合工作，無官方 Google Maps 支援 |
| 手動群集邏輯 | 效能差，重複造輪子 |

### 實作模式
```typescript
import { MarkerClusterer, SuperClusterAlgorithm } from '@googlemaps/markerclusterer';

const clusterer = new MarkerClusterer({
  map,
  markers,
  algorithm: new SuperClusterAlgorithm({ radius: 100 }),
  renderer: {
    render: (cluster, stats, map) => {
      // 計算類型分布
      const typeDistribution = calculateTypeDistribution(cluster.markers);
      
      const content = document.createElement('div');
      content.className = 'cluster-marker';
      content.innerHTML = `
        <span class="count">${cluster.count}</span>
        <div class="type-icons">${typeDistribution}</div>
      `;
      
      return new google.maps.marker.AdvancedMarkerElement({
        position: cluster.position,
        content,
      });
    },
  },
});
```

---

## 4. Firestore Schema 設計最佳實踐

### 決策: 扁平化 + 參照模式

### 理由
- `location_types` 獨立集合，避免嵌套過深
- `locations` 使用 `typeId` 參照，支援即時更新類型名稱
- `dynamicFields` 使用 map 結構，Firestore 原生支援

### 資料模型
```
location_types/{typeId}
├── id: string
├── name: string (3-50 chars)
├── description: string (max 200 chars)
├── icon: string (emoji)
├── color: string (HEX)
├── order: number
├── isActive: boolean
├── fieldSchema: FieldSchema[]
├── createdAt: Timestamp
├── createdBy: string (userId)
├── updatedAt: Timestamp
└── updatedBy: string (userId)

locations/{locationId}
├── ... (existing fields)
├── typeId: string (reference)
└── dynamicFields: Map<string, any>
```

### 限制與解決方案
| 限制 | 解決方案 |
|-----|---------|
| Map 欄位無法索引 | 不支援 dynamicFields 直接查詢，僅用於顯示 |
| 欄位配置變更 | 新配置僅影響新提交，現有資料保留 |
| 類型刪除 | 軟刪除 (isActive=false) 或轉移到其他類型 |

---

## 5. Firestore Security Rules 策略

### 決策: 精細化權限控制

### 理由
- `location_types` 僅 superAdmin 可寫入
- `locations` 寫入時驗證 typeId 存在且 isActive
- 所有管理操作記錄到 `admin_logs`

### 實作模式
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // 類型管理 - 僅 superAdmin
    match /location_types/{typeId} {
      allow read: if true;
      allow write: if request.auth != null 
                   && request.auth.token.isSuperAdmin == true;
    }
    
    // 地點提交 - 驗證 typeId
    match /locations/{locationId} {
      allow read: if true;
      allow create: if request.auth != null
                    && exists(/databases/$(database)/documents/location_types/$(request.resource.data.typeId))
                    && get(/databases/$(database)/documents/location_types/$(request.resource.data.typeId)).data.isActive == true;
    }
  }
}
```

---

## 6. 圖示庫設計

### 決策: 前端靜態配置 + Emoji

### 理由
- 50+ emoji 圖示足夠覆蓋大多數場景
- 無需額外 HTTP 請求載入圖示
- 跨平台相容性好
- 未來可擴展為 SVG 圖示

### 圖示分類
| 分類 | 圖示範例 |
|-----|---------|
| 場地 | 🏢 🏠 🏫 🏥 🏪 🏬 🏭 🏯 🏰 ⛪ 🕌 🕍 |
| 綠生活 | 🌿 🌱 🌳 🌴 🌵 🌾 🍀 🍃 🌺 🌻 🌼 🌷 |
| 環保 | ♻️ 🗑️ 🔋 💡 🌍 🌊 💧 🌬️ ☀️ 🔌 🚰 |
| 活動 | 🎉 🎊 🎯 🎪 🎭 🎨 📚 🎓 🎤 🎵 🏃 🚴 |
| 飲食 | 🍽️ 🥗 🥬 🌽 🍎 🥕 🍵 ☕ 🧃 |
| 交通 | 🚗 🚌 🚇 🚲 🛴 🚶 ♿ 🅿️ |

### 實作模式
```typescript
export const iconLibrary: IconCategory[] = [
  {
    id: 'venue',
    name: '場地',
    icons: [
      { id: 'building', emoji: '🏢', tags: ['辦公', '大樓'] },
      { id: 'house', emoji: '🏠', tags: ['住宅', '民宿'] },
      // ...
    ],
  },
  // ...
];
```

---

## 7. 效能優化策略

### 地圖標記效能
| 策略 | 實作方式 |
|-----|---------|
| 延遲載入 | 僅載入可視區域標記 |
| 群集聚合 | MarkerClusterer 自動處理 |
| 虛擬化 | 使用 AdvancedMarker 減少 DOM 節點 |
| 快取 | LocationTypesContext 快取類型配置 |

### 表單效能
| 策略 | 實作方式 |
|-----|---------|
| 非受控元件 | React Hook Form 預設模式 |
| 延遲驗證 | onBlur 驗證而非 onChange |
| 分批渲染 | 欄位數量多時使用 memo |

---

## 8. 資料遷移策略

### 決策: Cloud Function 一次性腳本

### 理由
- 首次部署時自動執行
- 將所有無 typeId 的地點遷移到預設類型
- 可透過 Firebase Console 手動觸發

### 實作模式
```typescript
// functions/src/migrations/migrateExistingLocations.ts
export const migrateExistingLocations = functions.https.onCall(async (data, context) => {
  // 驗證 superAdmin 權限
  if (!context.auth?.token.isSuperAdmin) {
    throw new functions.https.HttpsError('permission-denied', '需要超級管理員權限');
  }
  
  const db = admin.firestore();
  const batch = db.batch();
  
  // 取得預設類型 ID
  const defaultTypeRef = db.collection('location_types').doc('general');
  
  // 查詢無 typeId 的地點
  const snapshot = await db.collection('locations')
    .where('typeId', '==', null)
    .get();
  
  snapshot.docs.forEach(doc => {
    batch.update(doc.ref, { 
      typeId: 'general',
      dynamicFields: {},
      migratedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
  
  await batch.commit();
  return { migrated: snapshot.size };
});
```

---

## 結論

所有技術問題已解決，可進入 Phase 1 設計階段。主要技術選擇：

1. **動態表單**: React Hook Form + Zod
2. **地圖標記**: Advanced Markers API
3. **標記聚合**: @googlemaps/markerclusterer
4. **資料模型**: Firestore 扁平化 + 參照模式
5. **圖示**: 前端靜態 Emoji 配置
6. **遷移**: Cloud Function 一次性腳本
