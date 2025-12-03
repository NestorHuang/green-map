# Tasks: 地點提交與貢獻

**Input**: Design documents from `/specs/003-location-contribution/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: 未在規格中明確要求測試任務，本任務清單不包含測試任務。

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Based on plan.md:
- **Frontend**: `src/` (React + Vite)
- **Cloud Functions**: `functions/src/` (if needed)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and location submission framework setup

- [ ] T001 Create TypeScript types for location in src/types/location.ts (Location, LocationStatus, SubmitterInfo, CreateLocationRequest, UpdateLocationRequest, Tag, LocationDraft)
- [ ] T002 [P] Create Zod validation schemas for location form in src/utils/locationValidation.ts (locationSubmitSchema, locationEditSchema)
- [ ] T003 [P] Initialize default tags data script in scripts/init-tags.ts (10 預設標籤)
- [ ] T004 Run init-tags script to populate Firestore tags collection

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

**Dependencies**: 此 Epic 依賴 Epic 002 (使用者認證) 完成

- [ ] T005 Deploy Firestore Security Rules for locations collection in firestore.rules
- [ ] T006 [P] Deploy Storage Security Rules for locations folder in storage.rules
- [ ] T007 [P] Add Firestore indexes for locations queries (status+createdAt, submittedBy+createdAt) in firestore.indexes.json
- [ ] T008 Create useTags hook for fetching all tags in src/hooks/useTags.ts
- [ ] T009 [P] Create geocoding utility functions in src/utils/geocoding.ts
- [ ] T010 [P] Create photo upload utility functions in src/utils/photoUpload.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - 提交新地點 (Priority: P1) 🎯 MVP

**Goal**: 讓已登入且 Email 已驗證的使用者提交新地點

**Independent Test**: 透過完整的地點提交流程測試，從填寫表單到資料儲存到 Firestore

### Implementation for User Story 1

- [ ] T011 [P] [US1] Create AddressAutocomplete component with Google Places in src/components/location/AddressAutocomplete.tsx
- [ ] T012 [P] [US1] Create PhotoUploader component with multi-file support in src/components/location/PhotoUploader.tsx
- [ ] T013 [P] [US1] Create TagSelector component with multi-select chips in src/components/location/TagSelector.tsx
- [ ] T014 [P] [US1] Create LocationSubmitForm component in src/components/location/LocationSubmitForm.tsx
- [ ] T015 [US1] Create useFormDraft hook for localStorage draft management in src/hooks/useFormDraft.ts
- [ ] T016 [US1] Create useLocationSubmit hook for submission logic in src/hooks/useLocationSubmit.ts
- [ ] T017 [US1] Implement submitter info builder (支援荒野夥伴「團名-自然名」格式) in src/utils/submitterInfo.ts
- [ ] T018 [US1] Implement daily submission limit check (10 locations/day) in src/hooks/useLocationSubmit.ts
- [ ] T019 [US1] Create SubmitLocationPage in src/pages/SubmitLocationPage.tsx
- [ ] T020 [US1] Add routing for submit location page in src/router/index.tsx
- [ ] T021 [US1] Integrate form draft auto-save on page unload in src/components/location/LocationSubmitForm.tsx
- [ ] T022 [US1] Implement post-submission success flow (clear draft, show options) in src/pages/SubmitLocationPage.tsx

**Checkpoint**: User Story 1 - 使用者可以提交新地點，資料儲存為 pending 狀態

---

## Phase 4: User Story 2 - 編輯待審核地點 (Priority: P1) 🎯 MVP

**Goal**: 讓使用者編輯自己提交且狀態為 pending 的地點

**Independent Test**: 透過提交地點後立即編輯來測試，驗證資料是否正確更新

### Implementation for User Story 2

- [ ] T023 [P] [US2] Create LocationEditForm component in src/components/location/LocationEditForm.tsx
- [ ] T024 [US2] Create useLocationEdit hook for edit logic in src/hooks/useLocationEdit.ts
- [ ] T025 [US2] Create useLocation hook for fetching single location in src/hooks/useLocation.ts
- [ ] T026 [US2] Implement canEditLocation permission check in src/utils/locationPermissions.ts
- [ ] T027 [US2] Create EditLocationPage in src/pages/EditLocationPage.tsx
- [ ] T028 [US2] Add routing for edit location page with locationId param in src/router/index.tsx
- [ ] T029 [US2] Add edit button to MySubmissionsList component (from Epic 002) in src/components/profile/MySubmissionsList.tsx

**Checkpoint**: User Story 2 - 使用者可以編輯自己的待審核地點

---

## Phase 5: User Story 3 - 查看提交狀態通知 (Priority: P2)

**Goal**: 讓使用者在地點被核准或拒絕時收到通知

**Independent Test**: 透過模擬管理員核准/拒絕地點，驗證使用者下次登入時看到通知

### Implementation for User Story 3

- [ ] T030 [P] [US3] Create NotificationBadge component in src/components/common/NotificationBadge.tsx
- [ ] T031 [P] [US3] Create NotificationList component in src/components/notifications/NotificationList.tsx
- [ ] T032 [P] [US3] Create NotificationItem component in src/components/notifications/NotificationItem.tsx
- [ ] T033 [US3] Create useNotifications hook for fetching user notifications in src/hooks/useNotifications.ts
- [ ] T034 [US3] Implement notification data model and Firestore queries in src/types/notification.ts
- [ ] T035 [US3] Add notification bell icon to navigation header in src/components/layout/Header.tsx
- [ ] T036 [US3] Implement notification click navigation (to location detail or edit page) in src/components/notifications/NotificationItem.tsx
- [ ] T037 [US3] Add Firestore Security Rules for notifications collection in firestore.rules
- [ ] T038 [US3] Create Firestore index for (userId + read + createdAt) in firestore.indexes.json

**Checkpoint**: User Story 3 - 使用者可以查看地點審核通知

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T039 [P] Add comprehensive error handling for photo upload failures in src/components/location/PhotoUploader.tsx
- [ ] T040 [P] Add loading states and progress indicators for photo uploads
- [ ] T041 [P] Add responsive design adjustments for mobile-first form experience
- [ ] T042 [P] Implement photo preview with remove functionality
- [ ] T043 [P] Add form validation error messages with field-level feedback
- [ ] T044 [P] Add Geocoding API error handling and fallback in src/utils/geocoding.ts
- [ ] T045 Run quickstart.md validation checklist
- [ ] T046 Deploy all Firestore Security Rules via `firebase deploy --only firestore:rules`
- [ ] T047 Deploy all Storage Security Rules via `firebase deploy --only storage`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup + Epic 002 completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - US1 and US2 are both P1, but US2 requires US1 for testing (need a submitted location to edit)
  - US3 is P2, can be implemented after US1/US2
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### Epic Dependencies

- **Epic 002 (使用者認證)**: 此 Epic 依賴 Epic 002 完成
  - AuthContext 用於驗證使用者登入狀態
  - emailVerified 用於限制提交權限
  - isWildernessPartner 用於格式化登錄者顯示
  - MySubmissionsList (US4 of Epic 002) 與本 Epic 的編輯功能整合

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - Core submission feature
- **User Story 2 (P1)**: Depends on US1 - Needs existing submissions to edit
- **User Story 3 (P2)**: Depends on US1 - Needs submissions for notification context; Also requires Epic 005 (Admin) for approval workflow

### Within Each User Story

- Utility functions before hooks
- Hooks before components
- Components before pages
- Pages before routing

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- T005-T010 (foundational) can run in parallel
- T011-T014 (US1 components) can all run in parallel
- T030-T032 (US3 notification components) can run in parallel
- All Polish tasks marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all core components together:
Task: "Create AddressAutocomplete component in src/components/location/AddressAutocomplete.tsx"
Task: "Create PhotoUploader component in src/components/location/PhotoUploader.tsx"
Task: "Create TagSelector component in src/components/location/TagSelector.tsx"
Task: "Create LocationSubmitForm component in src/components/location/LocationSubmitForm.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 + 2 Only)

1. Ensure Epic 002 (使用者認證) is complete
2. Complete Phase 1: Setup
3. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
4. Complete Phase 3: User Story 1 (提交新地點)
5. Complete Phase 4: User Story 2 (編輯待審核地點)
6. **STOP and VALIDATE**: 使用者可以提交地點、編輯待審核地點
7. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test → Deploy (地點提交 MVP!)
3. Add User Story 2 → Test → Deploy (編輯功能)
4. Add User Story 3 → Test → Deploy (通知功能 - 需等待 Epic 005 Admin)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- 此 Epic 依賴 Epic 002 的 AuthContext 和 useAuth hook
- 照片上傳直接到 Firebase Storage，無需 Cloud Functions
- 草稿儲存使用 localStorage，7 天過期
- 每日提交限制 10 個地點，使用 Firestore 查詢計算
- Google Places API 需限制台灣範圍 (componentRestrictions: { country: 'tw' })
- 通知功能 (US3) 完整運作需要 Epic 005 (Admin) 的審核 workflow

