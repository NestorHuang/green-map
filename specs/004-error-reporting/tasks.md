# Tasks: 地點資訊錯誤回報

**功能分支**: `004-error-reporting`
**輸入來源**: `/specs/004-error-reporting/` 設計文件
**前置功能**: 001-map-browsing, 002-user-auth, 003-location-contribution

## 格式說明: `[ID] [P?] [Story?] Description`

- **[P]**: 可平行執行（不同檔案、無依賴）
- **[Story]**: 所屬使用者故事（US1, US2, US3）
- 描述包含確切檔案路徑

---

## Phase 1: Setup (專案初始化)

**目的**: 建立錯誤回報功能的基礎結構與型別定義

- [ ] T001 建立錯誤回報功能目錄結構 src/features/error-report/
- [ ] T002 [P] 定義錯誤回報相關型別 src/types/error-report.ts (ErrorReport, ErrorType, ReportStatus)
- [ ] T003 [P] 定義錯誤類型常數與標籤配置 src/constants/error-types.ts
- [ ] T004 [P] 新增 error_reports 集合的 Firestore 安全規則 firestore.rules
- [ ] T005 [P] 建立 Firestore 索引配置 firestore.indexes.json (reportedBy+status, locationId+status 複合索引)

---

## Phase 2: Foundational (核心基礎設施)

**目的**: 建立冷卻機制與回報服務的核心邏輯

**⚠️ 重要**: 所有使用者故事都依賴此階段完成

- [ ] T006 實作回報冷卻機制 Hook src/hooks/useReportCooldown.ts (Firestore + localStorage 混合模式)
- [ ] T007 實作錯誤回報 Service src/services/errorReportService.ts (提交、重複檢測、狀態查詢)
- [ ] T008 [P] 擴展 User 型別新增 lastReportedAt 欄位 src/types/user.ts

**檢查點**: 冷卻機制與回報服務核心邏輯完成，可開始實作使用者故事

---

## Phase 3: User Story 1 - 回報地點資訊錯誤 (Priority: P1) 🎯 MVP

**目標**: 登入使用者可以回報地點資訊錯誤，選擇錯誤類型並提交

**獨立測試**: 登入 → 開啟地點詳情 → 點擊「回報錯誤」 → 選擇錯誤類型 → 提交成功

### Implementation for User Story 1

- [ ] T009 [P] [US1] 建立錯誤回報按鈕元件 src/components/error-report/ErrorReportButton.tsx
- [ ] T010 [P] [US1] 建立冷卻倒數計時器元件 src/components/error-report/ReportCooldownTimer.tsx
- [ ] T011 [P] [US1] 建立錯誤類型選擇器元件 src/components/error-report/ErrorTypeSelector.tsx
- [ ] T012 [US1] 建立錯誤回報表單元件 src/components/error-report/ErrorReportForm.tsx (React Hook Form + Zod 驗證)
- [ ] T013 [US1] 建立錯誤回報模態視窗元件 src/components/error-report/ErrorReportModal.tsx (底部彈出式)
- [ ] T014 [US1] 實作錯誤回報 Hook src/hooks/useErrorReport.ts (整合冷卻機制、重複檢測、提交邏輯)
- [ ] T015 [US1] 整合回報按鈕到地點詳情頁面 src/pages/LocationDetailPage.tsx
- [ ] T016 [US1] 新增回報成功的 Toast 通知 src/components/error-report/ErrorReportButton.tsx

**檢查點**: 使用者可成功回報地點錯誤，冷卻機制正常運作

---

## Phase 4: User Story 2 - 查看我的回報記錄 (Priority: P2)

**目標**: 使用者可在個人中心查看自己提交的回報記錄及處理狀態

**獨立測試**: 登入 → 前往個人中心 → 點擊「我的回報」 → 顯示回報列表與狀態

### Implementation for User Story 2

- [ ] T017 [P] [US2] 實作我的回報列表 Hook src/hooks/useMyReports.ts (即時監聽、狀態篩選)
- [ ] T018 [P] [US2] 建立回報狀態標籤元件 src/components/error-report/ReportStatusBadge.tsx
- [ ] T019 [US2] 建立我的回報列表元件 src/components/error-report/MyReportsList.tsx
- [ ] T020 [US2] 建立回報詳情卡片元件 src/components/error-report/ReportDetailCard.tsx
- [ ] T021 [US2] 新增「我的回報」頁面或區塊到個人中心 src/pages/ProfilePage.tsx
- [ ] T022 [US2] 新增空狀態提示 (尚無回報記錄) src/components/error-report/MyReportsList.tsx

**檢查點**: 使用者可查看自己的回報歷史記錄與處理狀態

---

## Phase 5: User Story 3 - 回報處理通知 (Priority: P3)

**目標**: 當回報被管理員處理後，使用者收到通知並可查看處理結果

**獨立測試**: 管理員處理回報 → 使用者收到通知 → 查看管理員備註

### Implementation for User Story 3

- [ ] T023 [P] [US3] 定義通知型別 src/types/notification.ts (NotificationType: report_resolved, report_ignored)
- [ ] T024 [US3] 實作通知列表 Hook src/hooks/useNotifications.ts (即時監聽 /notifications/{userId}/items)
- [ ] T025 [US3] 建立通知項目元件 src/components/notifications/NotificationItem.tsx
- [ ] T026 [US3] 整合通知到應用導航列 src/components/layout/Header.tsx (通知圖示 + 未讀數量)
- [ ] T027 [US3] 在回報詳情卡片顯示管理員備註 src/components/error-report/ReportDetailCard.tsx

**檢查點**: 使用者可即時收到回報處理通知並查看管理員備註

---

## Phase 6: Polish & Cross-Cutting Concerns

**目的**: 跨功能優化與收尾工作

- [ ] T028 [P] 新增錯誤回報功能的 Loading/Error 狀態處理
- [ ] T029 [P] 確保錯誤回報元件響應式設計 (行動裝置適配)
- [ ] T030 部署 Firestore 安全規則與索引 (firebase deploy --only firestore)
- [ ] T031 執行 quickstart.md 測試檢核清單

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 無依賴，可立即開始
- **Foundational (Phase 2)**: 依賴 Setup 完成，阻擋所有使用者故事
- **User Stories (Phase 3-5)**: 依賴 Foundational 完成
  - US1 (P1): 可立即開始
  - US2 (P2): 可與 US1 平行開始，但建議完成 US1 後開始
  - US3 (P3): 可與 US1/US2 平行開始
- **Polish (Phase 6)**: 依賴所有目標使用者故事完成

### User Story Dependencies

- **US1 (回報地點錯誤)**: 核心功能，無依賴其他 Story
- **US2 (查看我的回報)**: 依賴 US1 完成 (需要有回報資料)
- **US3 (回報處理通知)**: 獨立於 US1/US2，可平行開發

### Parallel Opportunities

```bash
# Phase 1 可平行執行:
T002: 定義型別
T003: 定義常數
T004: 安全規則
T005: 索引配置

# Phase 3 可平行執行:
T009: 回報按鈕
T010: 冷卻計時器
T011: 類型選擇器
```

---

## Implementation Strategy

### MVP First (僅 User Story 1)

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational (關鍵 - 阻擋所有 Stories)
3. 完成 Phase 3: User Story 1
4. **驗證點**: 測試錯誤回報完整流程
5. 部署 MVP

### Incremental Delivery

1. Setup + Foundational → 基礎就緒
2. User Story 1 → 可回報地點錯誤 (MVP!)
3. User Story 2 → 可查看回報歷史
4. User Story 3 → 可收到處理通知

---

## Summary

- **總任務數**: 31
- **User Story 1 (P1)**: 8 tasks (T009-T016)
- **User Story 2 (P2)**: 6 tasks (T017-T022)
- **User Story 3 (P3)**: 5 tasks (T023-T027)
- **平行機會**: 15 tasks marked with [P]
- **建議 MVP 範圍**: User Story 1 (回報地點錯誤功能)
