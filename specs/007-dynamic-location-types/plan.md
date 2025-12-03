# 實作計劃: 動態地點類型系統

**分支**: `007-dynamic-location-types` | **日期**: 2025-12-03 | **規格**: [spec.md](spec.md)
**輸入**: 功能規格來自 `/specs/007-dynamic-location-types/spec.md`

## 摘要

實作動態地點類型系統，讓超級管理員可以自由新增地點分類（如團集會、綠生活）、配置每種類型的專屬欄位、選擇圖示與顏色，並在地圖上以不同視覺呈現。此功能包含：
1. 類型管理介面（CRUD 操作）
2. 動態表單生成器
3. 地圖標記視覺化與篩選
4. 審核流程整合

## 技術上下文

**語言/版本**: JavaScript/TypeScript (React 19)

**主要相依**: 
- React 19 + Vite 7 (前端框架)
- Tailwind CSS 3 (樣式)
- Firebase 12 (Firestore, Auth, Cloud Functions)
- Google Maps JavaScript API (地圖)
- React Hook Form + Zod (動態表單驗證)
- @googlemaps/markerclusterer (標記聚合)

**儲存**: Firebase Firestore
- `location_types/{typeId}` - 類型配置
- `locations/{locationId}` - 地點資料（新增 typeId, dynamicFields）
- `admin_logs/{logId}` - 管理操作日誌

**測試**: Vitest + React Testing Library + Firebase Emulators

**目標平台**: Web (Mobile-First, 320px - 768px 優先)

**專案類型**: Web 應用程式（前端 + Firebase 後端）

**效能目標**: 
- 地圖標記渲染 60 FPS
- 類型篩選 < 500ms
- 表單驗證回應 < 500ms
- 頁面載入 < 3s

**限制**: 
- Firestore map 欄位無法索引（dynamicFields 無法直接查詢）
- 每類型最多 20 個動態欄位
- 僅超級管理員可管理類型

**規模/範圍**: 
- 支援 20+ 種類型
- 1000+ 地點標記
- 50+ 預建圖示

## Constitution 檢查

*閘門：必須在 Phase 0 研究前通過。Phase 1 設計後重新檢查。*

### Phase 0 前檢查 ✅ PASSED

### I. 社群優先開發 ✅
- ✅ 功能服務社群需求（使用者可選擇類型、管理員可管理分類）
- ✅ 使用者故事驅動設計（P1/P2 優先順序明確）

### II. 安全預設 ✅
- ✅ 類型管理限制為 `isSuperAdmin: true` Custom Claim
- ✅ Firestore Security Rules 保護
- ✅ 所有管理操作記錄到 admin_logs

### III. 行動優先設計 ✅
- ✅ 所有功能設計為行動螢幕優先
- ✅ 類型選擇 UI 適合觸控操作
- ✅ 篩選按鈕 44x44px 以上

### IV. 資料完整性與信任 ✅
- ✅ 地點資料經管理員審核
- ✅ 類型刪除需確認（轉移或停用）
- ✅ 現有地點自動遷移到預設類型

### V. 使用者故事驅動開發 ✅
- ✅ 5 個使用者故事，P1/P2 優先順序
- ✅ Given-When-Then 驗收標準
- ✅ 獨立測試標準

---

### Phase 1 後重新檢查 ✅ PASSED

**設計決策符合 Constitution：**

| 原則 | 設計決策 | 符合度 |
|------|---------|--------|
| 社群優先 | 動態類型讓社群自訂分類 | ✅ |
| 安全預設 | Firestore Rules 限制 superAdmin | ✅ |
| 行動優先 | 觸控友好的 UI 元件設計 | ✅ |
| 資料完整性 | 類型刪除需確認處理方式 | ✅ |
| 使用者故事驅動 | P1 優先實作，獨立可測試 | ✅ |

**技術棧符合 Constitution：**
- ✅ React 19 + Vite 7 + Tailwind CSS 3
- ✅ Firebase 12 (Firestore, Auth, Cloud Functions)
- ✅ Google Maps JavaScript API
- ✅ Traditional Chinese (zh-TW) 文檔

## 專案結構

### 文件結構 (此功能)

```text
specs/007-dynamic-location-types/
├── plan.md              # 本檔案 (/speckit.plan 輸出)
├── research.md          # Phase 0 輸出
├── data-model.md        # Phase 1 輸出
├── quickstart.md        # Phase 1 輸出
├── contracts/           # Phase 1 輸出 (API 合約)
│   └── location-types-api.yaml
└── tasks.md             # Phase 2 輸出 (/speckit.tasks)
```

### 源碼結構 (專案根目錄)

```text
src/
├── components/
│   ├── common/              # 共用元件
│   ├── forms/               # 表單元件
│   │   ├── DynamicField.tsx       # 動態欄位渲染器
│   │   ├── DynamicForm.tsx        # 動態表單生成器
│   │   └── FieldConfigurator.tsx  # 欄位配置器
│   ├── map/                 # 地圖元件
│   │   ├── TypedMarker.tsx        # 類型化標記
│   │   ├── TypeFilter.tsx         # 類型篩選器
│   │   └── ClusteredMap.tsx       # 聚合地圖
│   └── admin/               # 管理介面元件
│       ├── TypeManager.tsx        # 類型管理主頁
│       ├── TypeForm.tsx           # 類型表單
│       └── IconPicker.tsx         # 圖示選擇器
├── contexts/
│   └── LocationTypesContext.tsx   # 類型全域狀態
├── hooks/
│   ├── useLocationTypes.ts        # 類型查詢 Hook
│   └── useDynamicForm.ts          # 動態表單 Hook
├── pages/
│   ├── admin/
│   │   └── TypeManagementPage.tsx # 類型管理頁面
│   └── locations/
│       └── SubmitLocationPage.tsx # 地點提交頁面
├── services/
│   ├── locationTypeService.ts     # 類型 CRUD 服務
│   └── iconLibrary.ts             # 圖示庫配置
├── types/
│   └── locationType.ts            # TypeScript 類型定義
└── utils/
    └── dynamicFieldFormatter.ts   # 動態欄位格式化

functions/
├── src/
│   ├── triggers/
│   │   └── onTypeChange.ts        # 類型變更觸發器
│   └── migrations/
│       └── migrateExistingLocations.ts  # 資料遷移腳本
└── tests/

firestore.rules                    # Firestore 安全規則
```

**結構決策**: 使用 Web 應用程式結構，前端為 React SPA，後端為 Firebase Cloud Functions。主要功能集中在前端，Cloud Functions 僅用於資料遷移和觸發器。

## 複雜度追蹤

> 無 Constitution 違規需要說明
