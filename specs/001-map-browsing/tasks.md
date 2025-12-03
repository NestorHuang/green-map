# Tasks: 地圖瀏覽與探索

**Input**: Design documents from `/specs/001-map-browsing/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: 未明確要求測試任務，因此本任務清單不包含測試任務。

**Organization**: 任務依照使用者故事分組，以支援每個故事的獨立實作與測試。

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: 可平行執行（不同檔案，無相依）
- **[Story]**: 此任務所屬的使用者故事（如 US1, US2, US3, US4）
- 描述中包含確切的檔案路徑

## Path Conventions

- **專案結構**: `src/` 在專案根目錄
- 遵循 plan.md 中定義的結構

---

## Phase 1: Setup (專案初始化)

**Purpose**: 專案初始化與基本結構建立

- [x] T001 建立專案結構，包含 src/components/, src/hooks/, src/services/, src/types/, src/utils/, src/contexts/, src/pages/ 目錄
- [x] T002 初始化 React 19 + Vite 7 + TypeScript 專案並安裝相依套件（react, react-dom, vite, typescript）
- [x] T003 [P] 安裝 Tailwind CSS 3 並配置 tailwind.config.js
- [x] T004 [P] 安裝 Firebase 12 相關套件（firebase）
- [x] T005 [P] 安裝 @react-google-maps/api 套件
- [x] T006 [P] 建立 .env.example 檔案，定義所需環境變數（VITE_FIREBASE_*, VITE_GOOGLE_MAPS_API_KEY）
- [x] T007 [P] 配置 TypeScript tsconfig.json，設定路徑別名 @/

---

## Phase 2: Foundational (基礎建設)

**Purpose**: 核心基礎設施，必須在任何使用者故事之前完成

**⚠️ 重要**: 此階段完成前，不可開始任何使用者故事的工作

- [x] T008 建立 Firebase 初始化設定 src/lib/firebase.ts
- [x] T009 [P] 建立 Location 類型定義 src/types/location.ts（包含 Location, LocationWithLatLng, SubmitterInfo, LocationStatus）
- [x] T010 [P] 建立 Tag 類型定義 src/types/tag.ts
- [x] T011 [P] 建立共用元件 LoadingSpinner src/components/common/LoadingSpinner.tsx
- [x] T012 [P] 建立共用元件 ErrorMessage src/components/common/ErrorMessage.tsx
- [x] T013 建立 locationService src/services/locationService.ts（取得已核准地點列表）
- [x] T014 建立 tagService src/services/tagService.ts（取得標籤列表）
- [x] T015 建立格式化工具 src/utils/formatters.ts（包含 getSubmitterDisplay 函數）
- [x] T016 [P] 建立地圖輔助函數 src/utils/mapHelpers.ts（包含預設座標常數 TAIWAN_CENTER, TAIWAN_ZOOM）
- [x] T017 建立 Firestore 安全規則 firestore.rules（允許讀取 approved 地點和所有標籤）
- [x] T018 建立主應用程式入口 src/App.tsx 和 src/main.tsx

**Checkpoint**: 基礎設施就緒 - 使用者故事實作可以開始

---

## Phase 3: User Story 1 - 快速定位當前位置 (Priority: P1) 🎯 MVP

**Goal**: 使用者打開網站時，自動定位到當前位置，以便快速找到附近的綠色生活地點

**Independent Test**: 開啟網站並授予 GPS 權限，驗證地圖是否自動移動到使用者當前位置；拒絕權限時顯示台灣全島視圖

### Implementation for User Story 1

- [x] T019 [US1] 建立 useGeolocation Hook src/hooks/useGeolocation.ts（GPS 定位邏輯，含超時和錯誤處理）
- [x] T020 [US1] 建立 MapContext src/contexts/MapContext.tsx（地圖全域狀態管理：中心點、縮放層級、選中地點）
- [x] T021 [US1] 建立 MapContainer 元件 src/components/map/MapContainer.tsx（Google Maps 容器，整合 GPS 定位）
- [ ] T022 [US1] 實作 GPS 權限請求與成功定位邏輯於 MapContainer
- [ ] T023 [US1] 實作 GPS 失敗/拒絕時的友善提示訊息與回退邏輯（顯示台灣全島視圖）
- [ ] T023.5 [US1] 實作手動地址輸入備援方案（GPS 失敗時顯示地址輸入框，複用 AddressSearch 元件）
- [x] T024 [US1] 建立 MapPage 主頁面 src/pages/MapPage.tsx（整合 MapContainer 和 GPS 狀態）

**Checkpoint**: 使用者故事 1 完成 - 地圖可定位或顯示預設位置

---

## Phase 4: User Story 2 - 查看地點詳細資訊 (Priority: P1) 🎯 MVP

**Goal**: 使用者點擊地圖標記時，查看地點的詳細資訊

**Independent Test**: 點擊任何地圖標記，驗證是否正確顯示地點詳情面板及所有必要資訊

### Implementation for User Story 2

- [x] T025 [US2] 建立 useLocations Hook src/hooks/useLocations.ts（即時監聽 Firestore 已核准地點）
- [x] T026 [US2] 建立 useTags Hook src/hooks/useTags.ts（取得標籤列表）
- [x] T027 [P] [US2] 建立 PhotoCarousel 元件 src/components/location/PhotoCarousel.tsx（CSS Scroll Snap 照片輪播）
- [x] T028 [P] [US2] 建立 SubmitterInfo 元件 src/components/location/SubmitterInfo.tsx（登錄者資訊顯示，含「團名-自然名」格式）
- [x] T029 [US2] 建立 LocationMarker 元件 src/components/map/LocationMarker.tsx（地圖標記）
- [x] T030 [US2] 建立 LocationDetail 元件 src/components/map/LocationDetail.tsx（底部彈出詳情面板）
- [ ] T031 [US2] 實作詳情面板多種關閉方式：行動裝置向下滑動手勢 + 關閉按鈕(X)；桌面版點擊外部區域 + 關閉按鈕（對應 FR-012）
- [ ] T032 [US2] [已合併至 T031] ~~實作詳情面板關閉按鈕和點擊外部關閉（桌面版）~~
- [x] T033 [US2] 實作照片載入失敗時顯示預設佔位圖片（對應 FR-015）
- [ ] T034 [US2] 實作「回報此地點資訊有誤」按鈕（僅已登入使用者顯示，按鈕邏輯為預留，實際功能在後續功能實作）
- [x] T035 [US2] 整合 LocationMarker 和 LocationDetail 到 MapContainer

**Checkpoint**: 使用者故事 1 和 2 完成 - MVP 可獨立運作

---

## Phase 5: User Story 3 - 搜尋特定地址 (Priority: P2)

**Goal**: 使用者搜尋特定地址附近的綠色生活地點

**Independent Test**: 在搜尋框輸入地址並選擇，驗證地圖是否正確移動到該位置

### Implementation for User Story 3

- [x] T036 [US3] 建立 AddressSearch 元件 src/components/map/AddressSearch.tsx（Google Places Autocomplete）
- [x] T037 [US3] 配置 Autocomplete 限制為台灣地區（componentRestrictions: { country: 'tw' }）
- [x] T038 [US3] 配置 Autocomplete 搜尋類型為營業場所（types: ['establishment']）
- [ ] T039 [US3] 實作地址選擇後地圖移動並放大邏輯
- [ ] T040 [US3] 整合 AddressSearch 到 MapPage 頂部

**Checkpoint**: 使用者故事 3 完成 - 地址搜尋功能可用

---

## Phase 6: User Story 4 - 依標籤篩選地點 (Priority: P2)

**Goal**: 使用者只顯示特定類型的地點

**Independent Test**: 點擊不同標籤，驗證地圖是否只顯示符合該標籤的地點

### Implementation for User Story 4

- [x] T041 [US4] 建立 TagFilter 元件 src/components/map/TagFilter.tsx（水平滾動標籤列）
- [x] T042 [US4] 實作標籤選擇邏輯（單選，點擊同一標籤或「全部」取消篩選）
- [x] T043 [US4] 實作選中標籤的視覺高亮顯示（綠色背景）
- [x] T044 [US4] 實作客戶端標籤篩選邏輯於 MapContainer
- [x] T045 [US4] 整合 TagFilter 到 MapPage

**Checkpoint**: 使用者故事 4 完成 - 標籤篩選功能可用

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 跨使用者故事的改進

- [ ] T046 [P] 實作 RWD 響應式設計調整（確保 320px - 768px 行動優先）
- [ ] T047 [P] 確保所有觸控目標至少 44x44px
- [ ] T048 效能優化：確保地圖載入 < 3s、標記點擊回應 < 200ms
- [ ] T049 [P] 新增無障礙輔助屬性（aria-label, role 等）
- [x] T050 建立種子資料腳本 scripts/seedTags.ts（初始化預設標籤）
- [ ] T051 執行 quickstart.md 測試檢查清單驗證
- [ ] T052 [P] 程式碼清理與重構

---

## Phase 8: Edge Case Handling (邊界情況處理)

**Purpose**: 處理規格中識別的邊界情況

- [ ] T053 [邊界] 實作無地點標記時的提示訊息於 MapContainer（顯示「目前區域尚無綠色生活地點」）
- [ ] T054 [邊界] 實作快速連續點擊標記的 debounce 處理於 LocationMarker（300ms debounce，僅顯示最後點擊地點）
- [ ] T055 [邊界] 實作篩選無結果時的提示訊息於 TagFilter（顯示「沒有符合篩選條件的地點」）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 無相依 - 可立即開始
- **Foundational (Phase 2)**: 相依於 Setup 完成 - 阻擋所有使用者故事
- **User Stories (Phase 3-6)**: 全部相依於 Foundational 完成
  - US1 (P1) 和 US2 (P1) 可同時進行（如有多人）
  - 或依優先順序執行 (P1 → P2)
- **Polish (Phase 7)**: 相依於所有期望的使用者故事完成

### User Story Dependencies

- **User Story 1 (P1)**: Foundational 完成後可開始 - 不依賴其他故事
- **User Story 2 (P1)**: Foundational 完成後可開始 - 依賴 US1 的 MapContainer（可並行開發，最後整合）
- **User Story 3 (P2)**: 可在 US1/US2 之後或並行開始 - 獨立元件
- **User Story 4 (P2)**: 可在 US1/US2 之後或並行開始 - 需要 locations 資料

### Within Each User Story

- Hook 和 Service 在元件之前
- 元件在頁面整合之前
- 核心功能在整合之前
- 故事完成後再移至下一優先順序

### Parallel Opportunities

- 所有標記 [P] 的 Setup 任務可平行執行
- 所有標記 [P] 的 Foundational 任務可平行執行（Phase 2 內）
- Foundational 完成後，不同使用者故事可由不同開發者平行工作
- 同一使用者故事內標記 [P] 的任務可平行執行

---

## Parallel Example: Phase 2 (Foundational)

```bash
# 平行啟動所有獨立任務：
Task T009: "建立 Location 類型定義 src/types/location.ts"
Task T010: "建立 Tag 類型定義 src/types/tag.ts"
Task T011: "建立共用元件 LoadingSpinner src/components/common/LoadingSpinner.tsx"
Task T012: "建立共用元件 ErrorMessage src/components/common/ErrorMessage.tsx"
Task T016: "建立地圖輔助函數 src/utils/mapHelpers.ts"
```

## Parallel Example: User Story 2

```bash
# 平行啟動獨立元件：
Task T027: "建立 PhotoCarousel 元件 src/components/location/PhotoCarousel.tsx"
Task T028: "建立 SubmitterInfo 元件 src/components/location/SubmitterInfo.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 + 2)

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational（重要 - 阻擋所有故事）
3. 完成 Phase 3: User Story 1（GPS 定位）
4. 完成 Phase 4: User Story 2（地點詳情）
5. **停止並驗證**: 測試 US1 + US2 的獨立運作
6. 若就緒可部署/展示 MVP

### Incremental Delivery

1. 完成 Setup + Foundational → 基礎就緒
2. 新增 User Story 1 + 2 → 獨立測試 → 部署/展示 (MVP!)
3. 新增 User Story 3 → 獨立測試 → 部署/展示
4. 新增 User Story 4 → 獨立測試 → 部署/展示
5. 每個故事增加價值而不破壞之前的故事

### Parallel Team Strategy

多位開發者時：

1. 團隊一起完成 Setup + Foundational
2. Foundational 完成後：
   - 開發者 A: User Story 1 + 2 (MVP)
   - 開發者 B: User Story 3 (地址搜尋)
   - 開發者 C: User Story 4 (標籤篩選)
3. 故事獨立完成並整合

---

## Notes

- [P] 任務 = 不同檔案，無相依
- [Story] 標籤將任務對應至特定使用者故事以利追蹤
- 每個使用者故事應可獨立完成和測試
- 每個任務或邏輯群組完成後提交
- 在任何檢查點停止以獨立驗證故事
- 避免：模糊任務、同一檔案衝突、破壞獨立性的跨故事相依
