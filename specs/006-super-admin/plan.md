````markdown
# 實作計畫：超級管理員系統管理

**功能分支**: `006-super-admin`
**規格版本**: 1.0.0
**計畫建立日期**: 2025-12-03
**規格路徑**: [spec.md](./spec.md)

## 摘要

實作超級管理員後台功能，讓擁有 `isSuperAdmin: true` Custom Claim 的使用者能夠管理使用者權限、管理綠活標籤、查看系統日誌、調整平台設定。核心技術包含 Firebase Custom Claims 權限控制、Cloud Functions 權限更新、Firestore 即時同步。

## 技術背景

**Language/Version**: TypeScript 5.x / React 19  
**Primary Dependencies**: React 19, Vite 7, Firebase 12, Tailwind CSS 3, React Hook Form 7.x, Zod 3.x  
**Storage**: Firebase Firestore (users, tags, admin_logs, platform_settings)  
**Testing**: Vitest + React Testing Library (手動測試為主)  
**Target Platform**: Web (Mobile-First, PWA-ready)
**Project Type**: Web 應用程式 (前端 + Firebase serverless 後端)  
**Performance Goals**: 使用者列表載入 < 3 秒 (1000 筆), 權限更新 < 3 秒, 日誌查詢 < 2 秒  
**Constraints**: Firestore 免費層每日 50,000 次讀取, Custom Claims 需透過 Cloud Function 更新  
**Scale/Scope**: 初期 < 10,000 位使用者, < 100 個標籤, < 100,000 筆日誌記錄 (90 天)

## 憲章合規檢查

*GATE: 必須在 Phase 0 研究前通過。Phase 1 設計完成後重新檢查。*

| 原則 | 狀態 | 實作方式 |
|------|------|----------|
| Community-First Development | ✅ 符合 | 標籤管理讓平台分類系統適應社群需求 |
| Security by Default | ✅ 符合 | 只有超級管理員可存取、防止撤銷自己的權限、確保至少一位超級管理員 |
| Mobile-First Design | ✅ 符合 | 超級管理後台優先適配行動裝置 |
| Data Integrity & Trust | ✅ 符合 | 所有權限變更記錄到 admin_logs、可稽核追蹤 |
| User Story-Driven Development | ✅ 符合 | 依優先順序實作 P1 → P2 → P3 |

### 安全規則需求

```javascript
// Firestore Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 判斷是否為超級管理員
    function isSuperAdmin() {
      return request.auth != null && request.auth.token.isSuperAdmin == true;
    }
    
    // 使用者列表 - 超級管理員可讀取
    match /users/{userId} {
      allow read: if isSuperAdmin();
    }
    
    // 標籤集合 - 超級管理員可完全管理
    match /tags/{tagId} {
      allow read: if true; // 所有人可讀取
      allow write: if isSuperAdmin();
    }
    
    // 管理員日誌 - 超級管理員可讀取
    match /admin_logs/{logId} {
      allow read: if isSuperAdmin();
    }
    
    // 平台設定 - 超級管理員可讀寫
    match /platform_settings/{docId} {
      allow read: if true; // 所有人可讀取（用於取得預設值）
      allow write: if isSuperAdmin();
    }
  }
}
```

## 專案結構

### 文件結構 (此功能)

```text
specs/006-super-admin/
├── plan.md              # 本文件
├── research.md          # Phase 0 輸出
├── data-model.md        # Phase 1 輸出
├── quickstart.md        # Phase 1 輸出
├── contracts/           # Phase 1 輸出
│   └── super-admin-api.yaml
└── tasks.md             # Phase 2 輸出 (/speckit.tasks 指令)
```

### 原始碼結構

```text
src/
├── components/
│   └── super-admin/
│       ├── SuperAdminLayout.tsx         # 超級管理後台佈局
│       ├── SuperAdminNav.tsx            # 超級管理導航列
│       ├── user-management/
│       │   ├── UsersList.tsx            # 使用者列表
│       │   ├── UserCard.tsx             # 使用者卡片
│       │   ├── UserSearchBar.tsx        # 使用者搜尋
│       │   └── RoleChangeDialog.tsx     # 角色變更對話框
│       ├── tag-management/
│       │   ├── TagsList.tsx             # 標籤列表
│       │   ├── TagCard.tsx              # 標籤卡片
│       │   ├── TagFormModal.tsx         # 標籤新增/編輯表單
│       │   └── TagDeleteDialog.tsx      # 標籤刪除確認
│       ├── system-logs/
│       │   ├── LogsList.tsx             # 日誌列表
│       │   ├── LogCard.tsx              # 日誌卡片
│       │   └── LogFilters.tsx           # 日誌篩選器
│       └── platform-settings/
│           ├── SettingsForm.tsx         # 設定表單
│           └── SettingCard.tsx          # 設定項目卡片
├── pages/
│   └── super-admin/
│       ├── SuperAdminPage.tsx           # 超級管理後台首頁
│       ├── UserManagementPage.tsx       # 使用者管理頁面
│       ├── TagManagementPage.tsx        # 標籤管理頁面
│       ├── SystemLogsPage.tsx           # 系統日誌頁面
│       └── PlatformSettingsPage.tsx     # 平台設定頁面
├── hooks/
│   ├── useSuperAdminAuth.ts             # 超級管理員權限檢查
│   ├── useUserManagement.ts             # 使用者管理操作
│   ├── useTagManagement.ts              # 標籤管理操作
│   ├── useSystemLogs.ts                 # 系統日誌查詢
│   └── usePlatformSettings.ts           # 平台設定操作
└── contexts/
    └── SuperAdminContext.tsx            # 超級管理員上下文

functions/
├── src/
│   └── super-admin/
│       ├── updateAdminClaims.ts         # 更新管理員 Custom Claims
│       └── deleteTagFromLocations.ts    # 刪除標籤時批次更新地點
```

**結構決策**: 延續 Epic 005 的 Web 應用程式結構，超級管理員功能集中在 `/super-admin` 路徑下，與一般管理員後台分離。使用獨立的元件和頁面結構以便權限控制。

## 複雜度追蹤

| 決策 | 複雜度等級 | 理由 |
|------|------------|------|
| Cloud Function 更新 Custom Claims | 中 | Firebase 限制前端無法直接更新 Claims |
| 標籤刪除批次更新 | 中 | 需要 Cloud Function 背景處理大量地點 |
| 日誌 90 天限制查詢 | 低 | 簡單的 Timestamp 比較 |
| 平台設定即時同步 | 低 | Firestore realtime listener 原生支援 |

## 風險與緩解

| 風險 | 影響 | 緩解策略 |
|------|------|----------|
| 超級管理員帳號被盜用 | 系統安全受損 | 限制超級管理員數量、操作記錄稽核 |
| 誤刪重要標籤 | 地點分類混亂 | 刪除前顯示使用次數、確認對話框 |
| 使用者列表查詢效能 | 頁面卡頓 | 分頁載入、搜尋索引 |
| Custom Claims 更新失敗 | 權限不生效 | Cloud Function 錯誤處理 + 重試機制 |
| 日誌累積過多 | 查詢效能下降 | 90 天限制 + 未來可考慮歸檔機制 |

````
