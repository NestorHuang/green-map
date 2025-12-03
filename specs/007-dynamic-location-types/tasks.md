# Tasks: 動態地點類型系統

**功能分支**: `007-dynamic-location-types`
**輸入來源**: `/specs/007-dynamic-location-types/` 設計文件
**前置功能**: 001-map-browsing, 003-location-contribution, 005-admin-management, 006-super-admin

## 格式說明: `[ID] [P?] [Story?] Description`

- **[P]**: 可平行執行（不同檔案、無依賴）
- **[Story]**: 所屬使用者故事（US1, US2, US3, US4, US5）
- 描述包含確切檔案路徑

---

## Phase 1: Setup (專案初始化)

**目的**: 建立動態類型功能的基礎結構與型別定義

- [ ] T001 建立動態類型功能目錄結構 src/features/location-types/
- [ ] T002 [P] 定義 LocationType 型別 src/types/location-type.ts
- [ ] T003 [P] 定義 FieldSchema 型別 src/types/field-schema.ts (12 種欄位類型、驗證規則)
- [ ] T004 [P] 擴展 Location 型別新增 typeId, dynamicFields 欄位 src/types/location.ts
- [ ] T005 [P] 建立圖示庫配置 src/constants/icon-library.ts (50+ emoji 分類)
- [ ] T006 [P] 建立顏色配置 src/constants/type-colors.ts (6 預設色 + 自訂)
- [ ] T007 [P] 新增 location_types 集合的 Firestore 安全規則 firestore.rules (僅 superAdmin 可寫)
- [ ] T008 [P] 更新 locations 安全規則驗證 typeId 存在且 isActive firestore.rules
- [ ] T009 [P] 建立 Firestore 索引配置 firestore.indexes.json

---

## Phase 2: Foundational (核心基礎設施)

**目的**: 建立類型上下文與核心服務

**⚠️ 重要**: 所有使用者故事都依賴此階段完成

- [ ] T010 實作地點類型 Context src/contexts/LocationTypesContext.tsx (快取類型配置)
- [ ] T011 [P] 實作地點類型 Service src/services/locationTypeService.ts (CRUD 操作)
- [ ] T012 [P] 實作動態表單 Schema 建構器 src/utils/schemaBuilder.ts (FieldSchema → Zod Schema)
- [ ] T013 [P] 安裝相依套件 @googlemaps/markerclusterer
- [ ] T014 建立 Cloud Function: migrateExistingLocations functions/src/migrations/migrateExistingLocations.ts
- [ ] T015 建立預設「一般地點」類型初始化腳本 scripts/init-default-type.js

**檢查點**: 類型系統核心邏輯完成，可開始實作使用者故事

---

## Phase 3: User Story 1 - 建立地點類型 (Priority: P1) 🎯 MVP

**目標**: 超級管理員可建立新的地點類型，設定圖示、顏色、動態欄位

**獨立測試**: 登入超級管理員 → 前往類型管理 → 新增類型 → 設定欄位 → 儲存成功

### Implementation for User Story 1

- [ ] T016 [P] [US1] 實作地點類型列表 Hook src/hooks/useLocationTypes.ts
- [ ] T017 [P] [US1] 建立類型列表元件 src/components/location-types/TypesList.tsx
- [ ] T018 [P] [US1] 建立圖示選擇器元件 src/components/location-types/IconPicker.tsx (分類瀏覽、搜尋)
- [ ] T019 [P] [US1] 建立顏色選擇器元件 src/components/location-types/ColorPicker.tsx
- [ ] T020 [US1] 建立欄位配置器元件 src/components/location-types/FieldConfigurator.tsx (欄位類型、必填、排序)
- [ ] T021 [US1] 建立欄位項目元件 src/components/location-types/FieldItem.tsx (拖曳排序)
- [ ] T022 [US1] 建立欄位驗證設定元件 src/components/location-types/FieldValidationSettings.tsx
- [ ] T023 [US1] 建立類型表單元件 src/components/location-types/TypeForm.tsx (整合所有設定)
- [ ] T024 [US1] 建立類型管理頁面 src/pages/super-admin/TypeManagementPage.tsx
- [ ] T025 [US1] 實作欄位數量限制驗證 (最多 20 個)

**檢查點**: 超級管理員可建立完整的地點類型

---

## Phase 4: User Story 2 - 選擇類型並提交地點 (Priority: P1) 🎯 MVP

**目標**: 使用者提交地點時選擇類型，動態表單根據類型生成

**獨立測試**: 登入使用者 → 新增地點 → 選擇類型 → 填寫動態表單 → 提交成功

### Implementation for User Story 2

- [ ] T026 [P] [US2] 建立類型選擇器元件 src/components/location-submit/TypeSelector.tsx (顯示圖示、顏色、描述)
- [ ] T027 [P] [US2] 建立動態欄位元件 src/components/forms/DynamicField.tsx (支援 12 種欄位類型)
- [ ] T028 [US2] 建立動態表單生成器元件 src/components/forms/DynamicForm.tsx (整合 React Hook Form)
- [ ] T029 [US2] 實作各欄位類型渲染邏輯 src/components/forms/fields/ (text, number, select, checkbox, etc.)
- [ ] T030 [US2] 更新地點提交頁面整合類型選擇與動態表單 src/pages/LocationSubmitPage.tsx
- [ ] T031 [US2] 更新地點提交 Service 處理 dynamicFields src/services/locationService.ts

**檢查點**: 使用者可選擇類型並填寫動態表單提交地點

---

## Phase 5: User Story 3 - 地圖視覺化顯示 (Priority: P1) 🎯 MVP

**目標**: 地圖上的標記根據類型顯示不同圖示與顏色，支援類型篩選

**獨立測試**: 開啟地圖 → 標記顯示類型圖示 → 點擊類型篩選 → 標記正確過濾

### Implementation for User Story 3

- [ ] T032 [P] [US3] 建立類型化標記元件 src/components/map/TypedMarker.tsx (Advanced Markers API)
- [ ] T033 [P] [US3] 建立標記群集渲染器 src/components/map/ClusterRenderer.tsx (顯示類型分布)
- [ ] T034 [P] [US3] 建立類型篩選器元件 src/components/map/TypeFilter.tsx
- [ ] T035 [US3] 整合 MarkerClusterer 到地圖元件 src/components/map/MapView.tsx
- [ ] T036 [US3] 更新地圖頁面整合類型篩選 src/pages/MapPage.tsx
- [ ] T037 [US3] 更新地點詳情面板顯示動態欄位 src/components/location/LocationDetailPanel.tsx

**檢查點**: 地圖標記顯示類型視覺化並支援篩選

---

## Phase 6: User Story 4 - 編輯與刪除類型 (Priority: P2)

**目標**: 超級管理員可編輯現有類型或停用/刪除類型

**獨立測試**: 登入超級管理員 → 編輯類型 → 儲存成功 / 停用類型 → 現有地點保留

### Implementation for User Story 4

- [ ] T038 [P] [US4] 實作類型編輯 Hook src/hooks/useTypeEditor.ts
- [ ] T039 [P] [US4] 建立類型編輯模態視窗 src/components/location-types/TypeEditModal.tsx
- [ ] T040 [US4] 建立類型停用確認對話框 src/components/location-types/TypeDeactivateDialog.tsx
- [ ] T041 [US4] 建立類型轉移選擇器 src/components/location-types/TypeMigrationSelector.tsx (刪除時選擇目標類型)
- [ ] T042 [US4] 實作類型停用/轉移邏輯 src/services/locationTypeService.ts

**檢查點**: 超級管理員可編輯與停用類型

---

## Phase 7: User Story 5 - 審核時顯示動態欄位 (Priority: P2)

**目標**: 管理員審核地點時可查看動態欄位內容

**獨立測試**: 登入管理員 → 審核地點 → 顯示類型資訊與動態欄位

### Implementation for User Story 5

- [ ] T043 [P] [US5] 建立動態欄位顯示元件 src/components/location-types/DynamicFieldsDisplay.tsx
- [ ] T044 [US5] 更新地點審核卡片整合動態欄位 src/components/admin/LocationReviewCard.tsx
- [ ] T045 [US5] 更新地點審核頁面顯示類型資訊 src/pages/admin/LocationReviewPage.tsx

**檢查點**: 管理員審核時可查看完整的動態欄位資訊

---

## Phase 8: Polish & Cross-Cutting Concerns

**目的**: 跨功能優化與資料遷移

- [ ] T046 [P] 新增動態類型功能的 Loading/Error 狀態處理
- [ ] T047 [P] 確保類型管理介面響應式設計
- [ ] T048 [P] 確保類型篩選器行動裝置觸控友善 (min-width/height: 44px)
- [ ] T049 執行資料遷移 Cloud Function (migrateExistingLocations)
- [ ] T050 部署 Cloud Functions (firebase deploy --only functions:migrateExistingLocations)
- [ ] T051 部署 Firestore 安全規則與索引
- [ ] T052 執行 quickstart.md 測試檢核清單

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 無依賴，可立即開始
- **Foundational (Phase 2)**: 依賴 Setup 完成，阻擋所有使用者故事
- **User Stories (Phase 3-7)**: 依賴 Foundational 完成
  - US1, US2, US3 均為 P1，可平行開發（不同團隊）
  - US4 (P2) 依賴 US1 完成
  - US5 (P2) 依賴 US1, US3 完成
- **Polish (Phase 8)**: 依賴所有目標使用者故事完成

### User Story Dependencies

- **US1 (建立類型)**: 核心功能，無依賴
- **US2 (提交地點)**: 依賴 US1 有類型存在
- **US3 (地圖顯示)**: 依賴 US1 有類型存在
- **US4 (編輯類型)**: 依賴 US1
- **US5 (審核顯示)**: 依賴 US1 + US3

### Parallel Opportunities

```bash
# Phase 1 可平行執行:
T002-T009: 所有型別定義與規則配置

# Phase 2 可平行執行:
T011: 類型 Service
T012: Schema 建構器
T013: 安裝套件

# Phase 3-5 可平行執行 (P1 Stories):
US1: 類型建立團隊 (超級管理員介面)
US2: 地點提交團隊 (使用者介面)
US3: 地圖視覺化團隊 (前端地圖)

# 各 Story 內可平行執行:
T016-T019: 類型列表與選擇器元件
T026-T027: 類型選擇與動態欄位元件
T032-T034: 標記與篩選器元件
```

---

## Implementation Strategy

### MVP First (User Story 1 + 2 + 3 - 核心類型功能)

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational (關鍵 - 包含 Context 與 Schema Builder)
3. 平行完成 Phase 3, 4, 5: US1 + US2 + US3
4. **驗證點**: 測試類型建立、地點提交、地圖顯示
5. 部署 MVP

### Incremental Delivery

1. Setup + Foundational → 類型系統基礎就緒
2. User Story 1 → 超級管理員可建立類型 (管理端 MVP)
3. User Story 2 → 使用者可選擇類型提交地點
4. User Story 3 → 地圖顯示類型化標記 (用戶端 MVP)
5. User Story 4 → 可編輯與停用類型
6. User Story 5 → 審核時顯示動態欄位

---

## Summary

- **總任務數**: 52
- **User Story 1 (P1)**: 10 tasks (T016-T025)
- **User Story 2 (P1)**: 6 tasks (T026-T031)
- **User Story 3 (P1)**: 6 tasks (T032-T037)
- **User Story 4 (P2)**: 5 tasks (T038-T042)
- **User Story 5 (P2)**: 3 tasks (T043-T045)
- **平行機會**: 24 tasks marked with [P]
- **建議 MVP 範圍**: User Story 1 + 2 + 3 (類型建立 + 地點提交 + 地圖顯示)
