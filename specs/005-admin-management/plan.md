````markdown
# 實作計畫：管理員審核與管理

**功能分支**: `005-admin-management`
**規格版本**: 1.0.0
**計畫建立日期**: 2025-12-03
**規格路徑**: [spec.md](./spec.md)

## 摘要

實作管理員後台功能，讓擁有 `isAdmin: true` Custom Claim 的使用者能夠審核地點提交、處理錯誤回報、驗證荒野夥伴身份。核心技術包含 Firebase Custom Claims 權限控制、樂觀鎖定衝突檢測、確認對話框防誤操作機制。

## 技術背景

**Language/Version**: TypeScript 5.x / React 19  
**Primary Dependencies**: React 19, Vite 7, Firebase 12, Tailwind CSS 3, React Hook Form 7.x, Zod 3.x  
**Storage**: Firebase Firestore (locations, error_reports, users, wilderness_verifications, admin_logs)  
**Testing**: Vitest + React Testing Library (手動測試為主)  
**Target Platform**: Web (Mobile-First, PWA-ready)
**Project Type**: Web 應用程式 (前端 + Firebase serverless 後端)  
**Performance Goals**: 列表載入 < 2 秒, 操作回應 < 2 秒, 儀表板即時更新延遲 < 5 秒  
**Constraints**: Firestore 免費層每日 50,000 次讀取, 所有敏感操作需 Admin Custom Claim  
**Scale/Scope**: 初期 < 1,000 筆待審核項目, < 100 位管理員

## 憲章合規檢查

*GATE: 必須在 Phase 0 研究前通過。Phase 1 設計完成後重新檢查。*

| 原則 | 狀態 | 實作方式 |
|------|------|----------|
| Community-First Development | ✅ 符合 | 荒野夥伴驗證支持社群成員獲得特殊身份認可 |
| Security by Default | ✅ 符合 | Firestore Rules 限制只有 Admin 可存取管理後台、Custom Claims 權限控制 |
| Mobile-First Design | ✅ 符合 | 管理後台優先適配行動裝置 |
| Data Integrity & Trust | ✅ 符合 | 人工審核機制確保資料品質、樂觀鎖定防止並行衝突 |
| User Story-Driven Development | ✅ 符合 | 依優先順序實作 P1 → P2 |

### 安全規則需求

```javascript
// Firestore Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 管理員操作記錄
    match /admin_logs/{logId} {
      allow read, write: if request.auth != null 
        && request.auth.token.isAdmin == true;
    }
    
    // 地點審核權限
    match /locations/{locationId} {
      // 管理員可更新狀態
      allow update: if request.auth != null 
        && request.auth.token.isAdmin == true
        && validLocationReview(request.resource.data);
    }
    
    // 錯誤回報處理權限
    match /error_reports/{reportId} {
      allow update: if request.auth != null 
        && request.auth.token.isAdmin == true
        && validReportUpdate(request.resource.data);
    }
    
    // 荒野夥伴驗證權限
    match /wilderness_verifications/{verificationId} {
      allow read, update: if request.auth != null 
        && request.auth.token.isAdmin == true;
    }
  }
}
```

## 專案結構

### 文件結構 (此功能)

```text
specs/005-admin-management/
├── plan.md              # 本文件
├── research.md          # Phase 0 輸出
├── data-model.md        # Phase 1 輸出
├── quickstart.md        # Phase 1 輸出
├── contracts/           # Phase 1 輸出
│   └── admin-api.yaml
└── tasks.md             # Phase 2 輸出 (/speckit.tasks 指令)
```

### 原始碼結構

```text
src/
├── components/
│   └── admin/
│       ├── AdminLayout.tsx              # 管理後台佈局
│       ├── AdminNav.tsx                 # 管理導航列
│       ├── AdminDashboard.tsx           # 統計儀表板
│       ├── ConfirmationDialog.tsx       # 確認對話框
│       ├── location-review/
│       │   ├── PendingLocationsList.tsx # 待審核地點列表
│       │   ├── LocationReviewCard.tsx   # 地點審核卡片
│       │   └── RejectionReasonModal.tsx # 拒絕原因輸入
│       ├── error-report/
│       │   ├── PendingReportsList.tsx   # 待處理回報列表
│       │   ├── ReportReviewCard.tsx     # 回報審核卡片
│       │   └── LocationEditModal.tsx    # 地點編輯模態
│       └── wilderness-verification/
│           ├── PendingVerificationsList.tsx # 待驗證列表
│           └── VerificationReviewCard.tsx   # 驗證審核卡片
├── pages/
│   └── admin/
│       ├── AdminPage.tsx                # 管理後台首頁
│       ├── LocationReviewPage.tsx       # 地點審核頁面
│       ├── ReportReviewPage.tsx         # 回報處理頁面
│       └── VerificationPage.tsx         # 荒野夥伴驗證頁面
├── hooks/
│   ├── useAdminAuth.ts                  # 管理員權限檢查
│   ├── usePendingLocations.ts           # 待審核地點查詢
│   ├── useLocationReview.ts             # 地點審核操作
│   ├── usePendingReports.ts             # 待處理回報查詢
│   ├── useReportReview.ts               # 回報處理操作
│   ├── usePendingVerifications.ts       # 待驗證申請查詢
│   ├── useVerificationReview.ts         # 驗證審核操作
│   └── useAdminStats.ts                 # 統計資料查詢
├── contexts/
│   └── AdminContext.tsx                 # 管理員上下文
└── utils/
    └── adminLog.ts                      # 操作記錄工具

functions/
├── src/
│   └── admin/
│       └── updateWildernessPartner.ts   # 更新荒野夥伴 Custom Claims
```

**結構決策**: 使用 Web 應用程式結構，前端使用 React + Vite，後端使用 Firebase serverless (Firestore + Cloud Functions)。管理員功能集中在 `/admin` 路徑下，使用獨立的元件和頁面結構。

## 複雜度追蹤

| 決策 | 複雜度等級 | 理由 |
|------|------------|------|
| 樂觀鎖定 (Optimistic Locking) | 中 | 需要版本號檢查，但 Firestore Transaction 原生支援 |
| 確認對話框機制 | 低 | 標準 UI 模式，可複用於所有關鍵操作 |
| Cloud Function 更新 Custom Claims | 中 | Firebase 限制前端無法直接更新 Claims |

## 風險與緩解

| 風險 | 影響 | 緩解策略 |
|------|------|----------|
| 並行審核衝突 | 資料不一致 | 樂觀鎖定 + 版本號檢查 |
| 誤操作審核決定 | 無法撤回 | 確認對話框 + 操作摘要顯示 |
| Custom Claims 更新失敗 | 權限不生效 | Cloud Function 錯誤處理 + 重試機制 |
| 管理員負擔過重 | 審核延遲 | 統計儀表板監控 + 超時警示 |

````
