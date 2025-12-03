# Tasks: 使用者認證與個人檔案

**Input**: Design documents from `/specs/002-user-auth/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: 未在規格中明確要求測試任務，本任務清單不包含測試任務。

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

Based on plan.md:
- **Frontend**: `src/` (React + Vite)
- **Cloud Functions**: `functions/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and authentication framework setup

- [ ] T001 Configure Firebase Authentication with Email/Password provider in Firebase Console
- [ ] T002 [P] Install frontend dependencies in package.json: `react-hook-form @hookform/resolvers zod react-image-crop`
- [ ] T003 [P] Install Cloud Functions dependencies in functions/package.json: `sharp @types/sharp`
- [ ] T004 [P] Create TypeScript types for authentication in src/types/auth.ts (UserDocument, WildernessInfo, UserClaims, AppUser, AvatarURLs, SubmitterInfo)
- [ ] T005 [P] Create Zod validation schemas in src/utils/validation.ts (registerSchema, loginSchema, wildernessPartnerSchema, profileEditSchema)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core authentication infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 Deploy Firestore Security Rules for users collection in firestore.rules
- [ ] T007 [P] Deploy Storage Security Rules for avatars folder in storage.rules
- [ ] T008 Create AuthContext with basic state management in src/contexts/AuthContext.tsx
- [ ] T009 [P] Create useAuth hook wrapper in src/hooks/useAuth.ts
- [ ] T010 [P] Create Firebase initialization utilities in src/lib/firebase.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Email 註冊登入 (Priority: P1) 🎯 MVP

**Goal**: 讓使用者透過 Email 註冊帳號、驗證 Email、並成功登入

**Independent Test**: 透過完整的註冊流程測試，驗證帳號建立、Email 驗證、登入功能

### Implementation for User Story 1

- [ ] T011 [P] [US1] Create RegisterForm component in src/components/auth/RegisterForm.tsx
- [ ] T012 [P] [US1] Create LoginForm component in src/components/auth/LoginForm.tsx
- [ ] T013 [P] [US1] Create ForgotPasswordForm component in src/components/auth/ForgotPasswordForm.tsx
- [ ] T014 [P] [US1] Create EmailVerificationBanner component in src/components/auth/EmailVerificationBanner.tsx
- [ ] T015 [US1] Implement register function in AuthContext (Firebase Auth createUserWithEmailAndPassword + Firestore user document) in src/contexts/AuthContext.tsx
- [ ] T016 [US1] Implement login function in AuthContext (Firebase Auth signInWithEmailAndPassword) in src/contexts/AuthContext.tsx
- [ ] T017 [US1] Implement logout function and auth state listener (onAuthStateChanged) in src/contexts/AuthContext.tsx
- [ ] T018 [US1] Implement resendVerificationEmail function with 1-minute cooldown (localStorage) in src/contexts/AuthContext.tsx
- [ ] T019 [P] [US1] Create LoginPage in src/pages/LoginPage.tsx
- [ ] T020 [P] [US1] Create RegisterPage in src/pages/RegisterPage.tsx
- [ ] T021 [US1] Add routing for auth pages in src/App.tsx or src/router/index.tsx
- [ ] T022 [US1] Implement password reset flow (sendPasswordResetEmail) in src/components/auth/ForgotPasswordForm.tsx

**Checkpoint**: User Story 1 - 使用者可以註冊、收到驗證 Email、登入、登出、重設密碼

---

## Phase 4: User Story 2 - 荒野夥伴身份驗證 (Priority: P1) 🎯 MVP

**Goal**: 讓荒野夥伴填寫身份資訊並獲得 Custom Claims 更新

**Independent Test**: 透過填寫荒野編號並驗證 Custom Claims 更新來測試

### Implementation for User Story 2

- [ ] T023 [P] [US2] Create setWildernessPartner Cloud Function in functions/src/claims/setWildernessPartner.ts
- [ ] T024 [P] [US2] Create WildernessPartnerForm component in src/components/profile/WildernessPartnerForm.tsx
- [ ] T025 [US2] Create useWildernessPartner hook to call Cloud Function in src/hooks/useWildernessPartner.ts
- [ ] T026 [US2] Update AuthContext to include isWildernessPartner from Custom Claims in src/contexts/AuthContext.tsx
- [ ] T027 [US2] Integrate WildernessPartnerForm into ProfilePage in src/pages/ProfilePage.tsx
- [ ] T028 [US2] Deploy setWildernessPartner Cloud Function via `firebase deploy --only functions:setWildernessPartner`

**Checkpoint**: User Story 2 - 荒野夥伴可以填寫資訊並獲得身份標記

---

## Phase 5: User Story 3 - 個人檔案管理 (Priority: P2)

**Goal**: 讓使用者編輯個人檔案（顯示名稱、頭像）

**Independent Test**: 透過修改顯示名稱和上傳頭像來測試，驗證三種尺寸縮圖產生

### Implementation for User Story 3

- [ ] T029 [P] [US3] Create AvatarUploader component with react-image-crop in src/components/profile/AvatarUploader.tsx
- [ ] T030 [P] [US3] Create processAvatar Cloud Function (Sharp 壓縮 + 縮圖) in functions/src/storage/processAvatar.ts
- [ ] T031 [P] [US3] Create ProfileView component in src/components/profile/ProfileView.tsx
- [ ] T032 [P] [US3] Create ProfileEditForm component in src/components/profile/ProfileEditForm.tsx
- [ ] T033 [US3] Create useUser hook for user document CRUD in src/hooks/useUser.ts
- [ ] T034 [US3] Create avatar upload utility functions in src/utils/avatarUpload.ts
- [ ] T035 [US3] Integrate ProfileView and ProfileEditForm into ProfilePage in src/pages/ProfilePage.tsx
- [ ] T036 [US3] Deploy processAvatar Cloud Function via `firebase deploy --only functions:processAvatar`

**Checkpoint**: User Story 3 - 使用者可以編輯顯示名稱和上傳頭像

---

## Phase 6: User Story 4 - 查看我的提交記錄 (Priority: P2)

**Goal**: 讓使用者查看自己提交過的地點列表

**Independent Test**: 透過查看個人檔案的提交列表，驗證顯示所有提交的地點（含狀態）

### Implementation for User Story 4

- [ ] T037 [P] [US4] Create MySubmissionsList component in src/components/profile/MySubmissionsList.tsx
- [ ] T038 [P] [US4] Create SubmissionStatus component in src/components/location/SubmissionStatus.tsx
- [ ] T039 [US4] Create useMySubmissions hook for fetching user's locations in src/hooks/useMySubmissions.ts
- [ ] T040 [US4] Integrate MySubmissionsList into ProfilePage as tab in src/pages/ProfilePage.tsx
- [ ] T041 [US4] Add Firestore index for (submittedBy + createdAt) query via firestore.indexes.json

**Checkpoint**: User Story 4 - 使用者可以查看自己的提交記錄及狀態

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T042 [P] Add error handling and user-friendly error messages across all auth components
- [ ] T043 [P] Add loading states and spinners for async operations
- [ ] T044 [P] Add responsive design adjustments for mobile-first experience
- [ ] T045 [P] Create auth route guards for protected pages in src/components/auth/ProtectedRoute.tsx
- [ ] T046 Run quickstart.md validation checklist
- [ ] T047 Deploy all Firestore Security Rules via `firebase deploy --only firestore:rules`
- [ ] T048 Deploy all Storage Security Rules via `firebase deploy --only storage`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 and US2 are both P1, can proceed in parallel
  - US3 and US4 are both P2, depend on US1 for auth context
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational - Requires Auth context from US1 but can develop Cloud Function in parallel
- **User Story 3 (P2)**: Depends on US1 for authentication - ProfilePage integration
- **User Story 4 (P2)**: Depends on US1 for authentication and Epic 003 for location data

### Within Each User Story

- Components before integration
- Hooks before page integration
- Cloud Functions can be developed in parallel with frontend
- Deploy after local testing

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- T011-T014 (auth forms) can all run in parallel
- T019-T020 (auth pages) can run in parallel
- T023, T024 (Cloud Function + Form) can run in parallel
- T029-T032 (avatar and profile components) can run in parallel
- T037, T038 (submission list components) can run in parallel
- All Polish tasks marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all form components together:
Task: "Create RegisterForm component in src/components/auth/RegisterForm.tsx"
Task: "Create LoginForm component in src/components/auth/LoginForm.tsx"
Task: "Create ForgotPasswordForm component in src/components/auth/ForgotPasswordForm.tsx"
Task: "Create EmailVerificationBanner component in src/components/auth/EmailVerificationBanner.tsx"

# Launch page components together:
Task: "Create LoginPage in src/pages/LoginPage.tsx"
Task: "Create RegisterPage in src/pages/RegisterPage.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 + 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Email 註冊登入)
4. Complete Phase 4: User Story 2 (荒野夥伴身份)
5. **STOP and VALIDATE**: 使用者可以註冊、驗證 Email、登入、填寫荒野夥伴資訊
6. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test → Deploy (基本認證 MVP!)
3. Add User Story 2 → Test → Deploy (荒野夥伴功能)
4. Add User Story 3 → Test → Deploy (個人檔案管理)
5. Add User Story 4 → Test → Deploy (提交記錄查看)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Cloud Functions 需要 `firebase deploy` 部署
- 頭像處理使用 Sharp，需在 Cloud Functions 環境
- Custom Claims 更新後需要 Token 重新整理才會生效
- Email 驗證連結有效期為 24 小時

