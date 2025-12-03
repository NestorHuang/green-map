# Tasks: 管理員審核與管理

**功能分支**: `005-admin-management`
**輸入來源**: `/specs/005-admin-management/` 設計文件
**前置功能**: 001-map-browsing, 002-user-auth, 003-location-contribution, 004-error-reporting

## 格式說明: `[ID] [P?] [Story?] Description`

- **[P]**: 可平行執行（不同檔案、無依賴）
- **[Story]**: 所屬使用者故事（US1, US2, US3, US4）
- 描述包含確切檔案路徑

---

## Phase 1: Setup (專案初始化)

**目的**: 建立管理員功能的基礎結構與型別定義

- [ ] T001 建立管理員功能目錄結構 src/features/admin/
- [ ] T002 [P] 定義管理員相關型別 src/types/admin.ts (AdminActionType, AdminActionLog, ReviewAction)
- [ ] T003 [P] 定義通知型別擴展 src/types/notification.ts (location_approved, location_rejected, report_resolved, report_ignored, partner_verified, partner_rejected)
- [ ] T004 [P] 擴展 Location 型別新增 version, reviewedAt, reviewedBy, rejectionReason 欄位 src/types/location.ts
- [ ] T005 [P] 定義 WildernessVerification 型別 src/types/wilderness-verification.ts
- [ ] T006 [P] 新增 admin_logs 集合的 Firestore 安全規則 firestore.rules
- [ ] T007 [P] 新增 wilderness_verifications 集合的 Firestore 安全規則 firestore.rules
- [ ] T008 [P] 建立 Firestore 索引配置 firestore.indexes.json (admin_logs 時間排序、status 篩選)

---

## Phase 2: Foundational (核心基礎設施)

**目的**: 建立管理員權限驗證與核心服務

**⚠️ 重要**: 所有使用者故事都依賴此階段完成

- [ ] T009 實作管理員權限驗證 Hook src/hooks/useAdminAuth.ts (從 JWT Token 讀取 isAdmin/isSuperAdmin Claims)
- [ ] T010 建立管理員路由保護元件 src/components/admin/AdminRoute.tsx
- [ ] T011 [P] 建立管理員佈局元件 src/layouts/AdminLayout.tsx (側邊選單、導覽列)
- [ ] T012 [P] 實作管理員操作日誌 Service src/services/adminLogService.ts
- [ ] T013 [P] 建立確認對話框元件 src/components/admin/ConfirmationDialog.tsx (支援鍵盤快捷鍵)
- [ ] T014 設定管理員路由配置 src/routes/admin.routes.tsx
- [ ] T015 建立 Cloud Function: updateWildernessPartner functions/src/admin/updateWildernessPartner.ts

**檢查點**: 管理員權限驗證與基礎佈局完成，可開始實作使用者故事

---

## Phase 3: User Story 1 - 審核待核准地點 (Priority: P1) 🎯 MVP

**目標**: 管理員可查看、審核（核准/拒絕）使用者提交的地點

**獨立測試**: 登入管理員 → 前往待審核列表 → 查看地點詳情 → 核准/拒絕 → 確認對話框 → 發送通知

### Implementation for User Story 1

- [ ] T016 [P] [US1] 實作樂觀鎖定地點審核 Hook src/hooks/useLocationReview.ts (runTransaction + version 檢查)
- [ ] T017 [P] [US1] 實作待審核地點列表 Hook src/hooks/usePendingLocations.ts (游標分頁、每頁 20 筆)
- [ ] T018 [P] [US1] 建立待審核地點列表元件 src/components/admin/PendingLocationsList.tsx
- [ ] T019 [US1] 建立地點審核卡片元件 src/components/admin/LocationReviewCard.tsx (顯示完整資訊)
- [ ] T020 [US1] 建立拒絕原因輸入表單 src/components/admin/RejectionReasonForm.tsx
- [ ] T021 [US1] 實作通知發送邏輯 src/utils/notifications.ts (location_approved, location_rejected)
- [ ] T022 [US1] 建立地點審核頁面 src/pages/admin/LocationReviewPage.tsx
- [ ] T023 [US1] 處理版本衝突錯誤顯示與重新載入提示

**檢查點**: 管理員可完整審核地點並發送通知給提交者

---

## Phase 4: User Story 2 - 處理錯誤回報 (Priority: P1) 🎯 MVP

**目標**: 管理員可查看、處理使用者提交的地點錯誤回報

**獨立測試**: 登入管理員 → 前往錯誤回報列表 → 查看回報詳情 → 編輯地點/標記處理/忽略 → 發送通知

### Implementation for User Story 2

- [ ] T024 [P] [US2] 實作待處理回報列表 Hook src/hooks/usePendingReports.ts
- [ ] T025 [P] [US2] 實作錯誤回報處理 Hook src/hooks/useReportReview.ts (resolve, ignore, update location)
- [ ] T026 [P] [US2] 建立待處理回報列表元件 src/components/admin/PendingReportsList.tsx
- [ ] T027 [US2] 建立回報審核卡片元件 src/components/admin/ReportReviewCard.tsx
- [ ] T028 [US2] 建立地點資訊編輯表單 src/components/admin/LocationEditForm.tsx (處理回報時使用)
- [ ] T029 [US2] 建立管理員備註輸入表單 src/components/admin/AdminNoteForm.tsx
- [ ] T030 [US2] 實作通知發送邏輯擴展 (report_resolved, report_ignored)
- [ ] T031 [US2] 建立錯誤回報審核頁面 src/pages/admin/ReportReviewPage.tsx

**檢查點**: 管理員可處理錯誤回報並通知回報者

---

## Phase 5: User Story 3 - 驗證荒野夥伴 (Priority: P1) 🎯 MVP

**目標**: 管理員可審核荒野考察夥伴申請，核准後授予特殊權限

**獨立測試**: 登入管理員 → 前往夥伴驗證列表 → 查看申請資料 → 核准/拒絕 → Custom Claims 更新

### Implementation for User Story 3

- [ ] T032 [P] [US3] 實作待驗證夥伴列表 Hook src/hooks/usePendingVerifications.ts
- [ ] T033 [P] [US3] 實作夥伴驗證 Hook src/hooks/useWildernessVerification.ts (呼叫 Cloud Function)
- [ ] T034 [P] [US3] 建立待驗證夥伴列表元件 src/components/admin/PendingVerificationsList.tsx
- [ ] T035 [US3] 建立驗證審核卡片元件 src/components/admin/VerificationReviewCard.tsx (顯示申請資料完整性)
- [ ] T036 [US3] 建立拒絕夥伴原因表單 src/components/admin/PartnerRejectionForm.tsx
- [ ] T037 [US3] 實作通知發送邏輯擴展 (partner_verified, partner_rejected)
- [ ] T038 [US3] 建立荒野夥伴驗證頁面 src/pages/admin/VerificationPage.tsx

**檢查點**: 管理員可驗證荒野夥伴申請並更新 Custom Claims

---

## Phase 6: User Story 4 - 審核統計儀表板 (Priority: P2)

**目標**: 管理員可查看待處理項目統計、本月處理量、緊急項目警示

**獨立測試**: 登入管理員 → 查看儀表板 → 顯示各項統計數據 → 數據即時更新

### Implementation for User Story 4

- [ ] T039 [P] [US4] 實作管理員統計 Hook src/hooks/useAdminStats.ts (即時監聽多個集合)
- [ ] T040 [P] [US4] 建立統計卡片元件 src/components/admin/StatCard.tsx
- [ ] T041 [US4] 建立緊急項目警示元件 src/components/admin/UrgentItemsAlert.tsx (超過 3 天未處理)
- [ ] T042 [US4] 建立管理員儀表板頁面 src/pages/admin/AdminDashboardPage.tsx
- [ ] T043 [US4] 整合儀表板到管理員首頁 src/pages/admin/AdminPage.tsx

**檢查點**: 管理員可一覽所有待處理項目統計

---

## Phase 7: Polish & Cross-Cutting Concerns

**目的**: 跨功能優化與收尾工作

- [ ] T044 [P] 新增管理員功能的 Loading/Error 狀態處理
- [ ] T045 [P] 確保管理員介面響應式設計
- [ ] T046 [P] 建立初始管理員設定腳本 scripts/set-admin-claim.js
- [ ] T047 部署 Cloud Function (firebase deploy --only functions:updateWildernessPartner)
- [ ] T048 部署 Firestore 安全規則與索引
- [ ] T049 執行 quickstart.md 測試檢核清單

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 無依賴，可立即開始
- **Foundational (Phase 2)**: 依賴 Setup 完成，阻擋所有使用者故事
- **User Stories (Phase 3-6)**: 依賴 Foundational 完成
  - US1, US2, US3 均為 P1，可平行開發
  - US4 (P2) 可在 P1 Stories 完成後開始
- **Polish (Phase 7)**: 依賴所有目標使用者故事完成

### User Story Dependencies

- **US1 (審核地點)**: 核心功能，依賴 003-location-contribution
- **US2 (處理回報)**: 依賴 004-error-reporting
- **US3 (驗證夥伴)**: 獨立功能，依賴 Cloud Function
- **US4 (統計儀表板)**: 依賴 US1/US2/US3 完成才有數據

### Parallel Opportunities

```bash
# Phase 1 可平行執行:
T002-T008: 所有型別定義與規則配置

# Phase 2 可平行執行:
T011: 管理員佈局
T012: 操作日誌服務
T013: 確認對話框

# Phase 3-5 可平行執行 (P1 Stories):
US1: 地點審核團隊
US2: 回報處理團隊
US3: 夥伴驗證團隊
```

---

## Implementation Strategy

### MVP First (User Story 1, 2, 3 - 核心管理功能)

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational (關鍵 - 阻擋所有 Stories)
3. 平行完成 Phase 3, 4, 5: US1 + US2 + US3
4. **驗證點**: 測試三項核心審核功能
5. 部署 MVP

### Incremental Delivery

1. Setup + Foundational → 管理員基礎就緒
2. User Story 1 → 可審核地點 (核心 MVP)
3. User Story 2 → 可處理錯誤回報
4. User Story 3 → 可驗證荒野夥伴
5. User Story 4 → 統計儀表板上線

---

## Summary

- **總任務數**: 49
- **User Story 1 (P1)**: 8 tasks (T016-T023)
- **User Story 2 (P1)**: 8 tasks (T024-T031)
- **User Story 3 (P1)**: 7 tasks (T032-T038)
- **User Story 4 (P2)**: 5 tasks (T039-T043)
- **平行機會**: 22 tasks marked with [P]
- **建議 MVP 範圍**: User Story 1 + 2 + 3 (三項核心審核功能)
