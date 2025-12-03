# Tasks: 超級管理員系統管理

**功能分支**: `006-super-admin`
**輸入來源**: `/specs/006-super-admin/` 設計文件
**前置功能**: 005-admin-management

## 格式說明: `[ID] [P?] [Story?] Description`

- **[P]**: 可平行執行（不同檔案、無依賴）
- **[Story]**: 所屬使用者故事（US1, US2, US3, US4）
- 描述包含確切檔案路徑

---

## Phase 1: Setup (專案初始化)

**目的**: 建立超級管理員功能的基礎結構與型別定義

- [ ] T001 建立超級管理員功能目錄結構 src/features/super-admin/
- [ ] T002 [P] 定義 Tag 型別 src/types/tag.ts
- [ ] T003 [P] 定義 PlatformSettings 型別 src/types/platform-settings.ts (包含預設值與驗證規則)
- [ ] T004 [P] 擴展 User 型別新增 isAdmin, isSuperAdmin, isWildernessPartner 欄位 src/types/user.ts
- [ ] T005 [P] 擴展 AdminActionType 新增 grant_admin, revoke_admin, grant_superAdmin 等類型 src/types/admin.ts
- [ ] T006 [P] 新增 tags 集合的 Firestore 安全規則 firestore.rules
- [ ] T007 [P] 新增 platform_settings 集合的 Firestore 安全規則 firestore.rules (僅 superAdmin 可寫)
- [ ] T008 [P] 建立 Firestore 索引配置 firestore.indexes.json (admin_logs 90 天查詢)

---

## Phase 2: Foundational (核心基礎設施)

**目的**: 建立超級管理員權限驗證與 Cloud Functions

**⚠️ 重要**: 所有使用者故事都依賴此階段完成

- [ ] T009 實作超級管理員權限驗證 Hook src/hooks/useSuperAdminAuth.ts (檢查 isSuperAdmin Claims)
- [ ] T010 建立超級管理員路由保護元件 src/components/super-admin/SuperAdminRoute.tsx
- [ ] T011 [P] 建立超級管理員佈局元件 src/layouts/SuperAdminLayout.tsx
- [ ] T012 建立 Cloud Function: updateAdminClaims functions/src/super-admin/updateAdminClaims.ts (權限保護邏輯)
- [ ] T013 建立 Cloud Function: deleteTagFromLocations functions/src/super-admin/deleteTagFromLocations.ts (批次更新)
- [ ] T014 設定超級管理員路由配置 src/routes/super-admin.routes.tsx
- [ ] T015 建立初始超級管理員設定腳本 scripts/set-super-admin.js

**檢查點**: 超級管理員權限驗證與 Cloud Functions 完成，可開始實作使用者故事

---

## Phase 3: User Story 1 - 管理使用者權限 (Priority: P1) 🎯 MVP

**目標**: 超級管理員可搜尋使用者並授予/撤銷管理員、超級管理員、荒野夥伴權限

**獨立測試**: 登入超級管理員 → 搜尋使用者 → 授予/撤銷權限 → 確認 Custom Claims 更新

### Implementation for User Story 1

- [ ] T016 [P] [US1] 實作使用者列表 Hook src/hooks/useUsersList.ts (分頁、搜尋、角色篩選)
- [ ] T017 [P] [US1] 實作使用者權限管理 Hook src/hooks/useUserManagement.ts (呼叫 Cloud Function)
- [ ] T018 [P] [US1] 建立使用者搜尋列元件 src/components/super-admin/UserSearchBar.tsx
- [ ] T019 [P] [US1] 建立角色篩選器元件 src/components/super-admin/RoleFilter.tsx
- [ ] T020 [US1] 建立使用者列表表格元件 src/components/super-admin/UserManagementTable.tsx
- [ ] T021 [US1] 建立角色變更對話框元件 src/components/super-admin/RoleChangeDialog.tsx
- [ ] T022 [US1] 建立角色標籤元件 src/components/super-admin/RoleBadge.tsx
- [ ] T023 [US1] 建立使用者權限管理頁面 src/pages/super-admin/UserManagementPage.tsx
- [ ] T024 [US1] 實作權限保護邏輯 (不能撤銷自己的權限、至少保留一位超級管理員)

**檢查點**: 超級管理員可完整管理使用者權限

---

## Phase 4: User Story 2 - 管理標籤 (Priority: P1) 🎯 MVP

**目標**: 超級管理員可新增、編輯、刪除標籤，刪除時自動從相關地點移除

**獨立測試**: 登入超級管理員 → 新增標籤 → 編輯標籤 → 刪除標籤 → 確認地點關聯已清理

### Implementation for User Story 2

- [ ] T025 [P] [US2] 實作標籤列表 Hook src/hooks/useTagsList.ts (即時監聽)
- [ ] T026 [P] [US2] 實作標籤管理 Hook src/hooks/useTagManagement.ts (CRUD + 使用次數查詢)
- [ ] T027 [P] [US2] 建立標籤列表元件 src/components/super-admin/TagsList.tsx
- [ ] T028 [US2] 建立標籤表單模態視窗元件 src/components/super-admin/TagFormModal.tsx (新增/編輯共用)
- [ ] T029 [US2] 建立標籤刪除確認對話框 src/components/super-admin/TagDeleteDialog.tsx (顯示影響地點數量)
- [ ] T030 [US2] 建立標籤使用次數標籤元件 src/components/super-admin/TagUsageCount.tsx
- [ ] T031 [US2] 建立標籤管理頁面 src/pages/super-admin/TagManagementPage.tsx

**檢查點**: 超級管理員可完整管理標籤

---

## Phase 5: User Story 3 - 查看系統日誌 (Priority: P2)

**目標**: 超級管理員可查看最近 90 天的所有管理員操作日誌

**獨立測試**: 登入超級管理員 → 前往系統日誌 → 篩選操作類型/操作者/日期 → 無限捲動載入

### Implementation for User Story 3

- [ ] T032 [P] [US3] 實作系統日誌 Hook src/hooks/useSystemLogs.ts (分頁、篩選、90 天限制)
- [ ] T033 [P] [US3] 建立日誌篩選器元件 src/components/super-admin/LogFilter.tsx (操作類型、操作者、日期範圍)
- [ ] T034 [P] [US3] 建立日誌項目元件 src/components/super-admin/LogItem.tsx
- [ ] T035 [US3] 建立日誌列表元件 src/components/super-admin/LogsList.tsx (無限捲動)
- [ ] T036 [US3] 建立系統日誌頁面 src/pages/super-admin/SystemLogsPage.tsx

**檢查點**: 超級管理員可查詢與篩選系統日誌

---

## Phase 6: User Story 4 - 管理平台設定 (Priority: P3)

**目標**: 超級管理員可設定預設地圖中心、縮放層級、審核時限、每日上傳限制

**獨立測試**: 登入超級管理員 → 修改設定 → 儲存 → 設定即時同步到所有客戶端

### Implementation for User Story 4

- [ ] T037 [P] [US4] 實作平台設定 Hook src/hooks/usePlatformSettings.ts (即時監聯、驗證、更新)
- [ ] T038 [P] [US4] 建立地圖中心選擇器元件 src/components/super-admin/MapCenterPicker.tsx (地圖點選)
- [ ] T039 [US4] 建立設定表單元件 src/components/super-admin/SettingsForm.tsx (所有設定項目)
- [ ] T040 [US4] 建立設定驗證邏輯 src/utils/settingsValidation.ts (範圍驗證)
- [ ] T041 [US4] 建立平台設定頁面 src/pages/super-admin/PlatformSettingsPage.tsx
- [ ] T042 [US4] 初始化平台設定文件 /platform_settings/config (預設值)

**檢查點**: 超級管理員可管理平台設定並即時同步

---

## Phase 7: Polish & Cross-Cutting Concerns

**目的**: 跨功能優化與收尾工作

- [ ] T043 [P] 新增超級管理員功能的 Loading/Error 狀態處理
- [ ] T044 [P] 確保超級管理員介面響應式設計
- [ ] T045 [P] 將所有超級管理員操作記錄到 admin_logs
- [ ] T046 部署 Cloud Functions (firebase deploy --only functions:updateAdminClaims,functions:deleteTagFromLocations)
- [ ] T047 部署 Firestore 安全規則與索引
- [ ] T048 執行 quickstart.md 測試檢核清單

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 無依賴，可立即開始
- **Foundational (Phase 2)**: 依賴 Setup 完成，阻擋所有使用者故事
- **User Stories (Phase 3-6)**: 依賴 Foundational 完成
  - US1, US2 均為 P1，可平行開發
  - US3 (P2) 依賴日誌存在，建議完成 US1/US2 後開始
  - US4 (P3) 獨立功能，可任意時間開發
- **Polish (Phase 7)**: 依賴所有目標使用者故事完成

### User Story Dependencies

- **US1 (使用者權限)**: 核心功能，依賴 Cloud Function
- **US2 (標籤管理)**: 獨立功能，依賴 Cloud Function 處理批次刪除
- **US3 (系統日誌)**: 依賴有操作日誌存在
- **US4 (平台設定)**: 完全獨立

### Parallel Opportunities

```bash
# Phase 1 可平行執行:
T002-T008: 所有型別定義與規則配置

# Phase 3-4 可平行執行 (P1 Stories):
US1: 使用者權限團隊
US2: 標籤管理團隊

# 各 Story 內可平行執行:
T016-T019: 使用者列表相關元件
T025-T027: 標籤列表相關元件
```

---

## Implementation Strategy

### MVP First (User Story 1 + 2 - 核心管理功能)

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational (關鍵 - 包含 Cloud Functions)
3. 平行完成 Phase 3, 4: US1 + US2
4. **驗證點**: 測試使用者權限與標籤管理
5. 部署 MVP

### Incremental Delivery

1. Setup + Foundational → 超級管理員基礎就緒
2. User Story 1 → 可管理使用者權限 (核心 MVP)
3. User Story 2 → 可管理標籤
4. User Story 3 → 可查看系統日誌
5. User Story 4 → 可管理平台設定

---

## Summary

- **總任務數**: 48
- **User Story 1 (P1)**: 9 tasks (T016-T024)
- **User Story 2 (P1)**: 7 tasks (T025-T031)
- **User Story 3 (P2)**: 5 tasks (T032-T036)
- **User Story 4 (P3)**: 6 tasks (T037-T042)
- **平行機會**: 19 tasks marked with [P]
- **建議 MVP 範圍**: User Story 1 + 2 (使用者權限 + 標籤管理)
