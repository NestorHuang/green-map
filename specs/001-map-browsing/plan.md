# 實作計劃: 地圖瀏覽與探索

**分支**: `001-map-browsing` | **日期**: 2025-12-03 | **規格**: [spec.md](spec.md)
**輸入**: 功能規格來自 `/specs/001-map-browsing/spec.md`

## 摘要

實作互動式地圖瀏覽功能，讓訪客可以快速找到附近的綠色生活地點。此功能包含：
1. GPS 自動定位與手動地址輸入
2. 地圖標記顯示與詳情面板
3. 地址搜尋（Google Places Autocomplete）
4. 標籤篩選功能

這是 Green Map South 的核心功能，是平台 MVP 的基礎。

## 技術上下文

**語言/版本**: JavaScript/TypeScript (React 19)

**主要相依**: 
- React 19 + Vite 7 (前端框架)
- Tailwind CSS 3 (樣式)
- Firebase 12 (Firestore)
- Google Maps JavaScript API (地圖顯示)
- Google Places API (地址搜尋)
- @react-google-maps/api (React 整合)

**儲存**: Firebase Firestore
- `locations/{locationId}` - 地點資料（已核准）
- `tags/{tagId}` - 標籤分類

**測試**: Vitest + React Testing Library

**目標平台**: Web (Mobile-First, 320px - 768px 優先)

**專案類型**: Web 應用程式（React SPA + Firebase）

**效能目標**: 
- 地圖載入 < 3s (4G 網路)
- GPS 定位 < 5s
- 標記點擊回應 < 200ms
- 標籤篩選 < 500ms
- 地圖操作 60 FPS
- Lighthouse 效能 > 90

**限制**: 
- Google Maps API 每月 $200 免費配額
- Firestore 每日 50,000 讀取（免費層）
- 不支援 IE11
- GPS 依賴裝置硬體

**規模/範圍**: 
- 初期 100+ 地點標記
- 台灣南區範圍
- 繁體中文介面

## Constitution 檢查

*閘門：必須在 Phase 0 研究前通過。Phase 1 設計後重新檢查。*

### Phase 0 前檢查 ✅ PASSED

### I. 社群優先開發 ✅
- ✅ 功能讓訪客快速找到附近綠色地點，服務社群需求
- ✅ 荒野夥伴以「團名-自然名」格式顯示，給予特殊認可
- ✅ 使用者故事驅動設計（P1/P2 優先順序明確）

### II. 安全預設 ✅
- ✅ Firestore 僅顯示 `status: 'approved'` 的地點
- ✅ 回報功能僅對已登入使用者開放
- ✅ API 金鑰透過環境變數配置

### III. 行動優先設計 ✅
- ✅ Mobile-First 設計（320px - 768px 優先）
- ✅ 觸控友好的 UI（向下滑動關閉面板）
- ✅ 4G 網路環境下 3 秒內載入
- ✅ 觸控目標 44x44px 以上

### IV. 資料完整性與信任 ✅
- ✅ 僅顯示已審核通過的地點
- ✅ 已登入使用者可回報錯誤資訊
- ✅ 照片載入失敗顯示預設佔位圖

### V. 使用者故事驅動開發 ✅
- ✅ 4 個使用者故事，P1/P2 優先順序
- ✅ Given-When-Then 驗收標準
- ✅ 獨立測試標準

---

### Phase 1 後重新檢查 ✅ PASSED

**設計決策符合 Constitution：**

| 原則 | 設計決策 | 符合度 |
|------|---------|--------|
| 社群優先 | 核心地圖功能服務所有訪客 | ✅ |
| 安全預設 | Security Rules 限制讀取已審核地點 | ✅ |
| 行動優先 | 底部彈出面板 + 滑動關閉手勢 | ✅ |
| 資料完整性 | 僅顯示 approved 狀態地點 | ✅ |
| 使用者故事驅動 | P1 先實作 GPS + 詳情面板 | ✅ |

**技術棧符合 Constitution：**
- ✅ React 19 + Vite 7 + Tailwind CSS 3
- ✅ Firebase 12 (Firestore)
- ✅ Google Maps JavaScript API
- ✅ Traditional Chinese (zh-TW) 文檔

## 專案結構

### 文件結構 (此功能)

```text
specs/001-map-browsing/
├── plan.md              # 本檔案 (/speckit.plan 輸出)
├── research.md          # Phase 0 輸出
├── data-model.md        # Phase 1 輸出
├── quickstart.md        # Phase 1 輸出
├── contracts/           # Phase 1 輸出 (API 合約)
│   └── locations-api.yaml
└── tasks.md             # Phase 2 輸出 (/speckit.tasks)
```

### 源碼結構 (專案根目錄)

```text
src/
├── components/
│   ├── common/              # 共用元件
│   │   ├── LoadingSpinner.tsx
│   │   └── ErrorMessage.tsx
│   ├── map/                 # 地圖元件
│   │   ├── MapContainer.tsx       # 地圖容器
│   │   ├── LocationMarker.tsx     # 地點標記
│   │   ├── LocationDetail.tsx     # 詳情面板
│   │   ├── AddressSearch.tsx      # 地址搜尋
│   │   └── TagFilter.tsx          # 標籤篩選
│   └── location/            # 地點相關元件
│       ├── PhotoCarousel.tsx      # 照片輪播
│       └── SubmitterInfo.tsx      # 登錄者資訊
├── contexts/
│   └── MapContext.tsx             # 地圖全域狀態
├── hooks/
│   ├── useGeolocation.ts          # GPS 定位 Hook
│   ├── useLocations.ts            # 地點查詢 Hook
│   └── useTags.ts                 # 標籤查詢 Hook
├── pages/
│   └── MapPage.tsx                # 地圖主頁面
├── services/
│   ├── locationService.ts         # 地點 CRUD
│   └── tagService.ts              # 標籤查詢
├── types/
│   ├── location.ts                # 地點類型定義
│   └── tag.ts                     # 標籤類型定義
└── utils/
    ├── mapHelpers.ts              # 地圖輔助函數
    └── formatters.ts              # 格式化工具

firestore.rules                    # Firestore 安全規則
```

**結構決策**: 使用 React SPA 結構，以 Firebase 為後端。地圖功能集中在 `components/map/` 目錄，使用 Context API 管理地圖狀態。

## 複雜度追蹤

> 無 Constitution 違規需要說明
