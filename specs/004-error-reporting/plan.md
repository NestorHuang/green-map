# 實作計畫：地點資訊錯誤回報

**功能分支**: `004-error-reporting`
**規格版本**: 1.0.0
**計畫建立日期**: 2025-12-03

## 技術背景

### 使用的技術

| 技術 | 版本 | 用途 |
|------|------|------|
| React | 19 | 前端框架 |
| Vite | 7 | 建構工具 |
| Firebase Firestore | 12 | 回報資料儲存 |
| React Hook Form | 7.x | 表單管理 |
| Zod | 3.x | 表單驗證 |

### 相依的功能

| 功能 | 狀態 | 影響 |
|------|------|------|
| Epic 001 地圖瀏覽 | 前置條件 | 從地點詳情頁面發起回報 |
| Epic 002 使用者認證 | 前置條件 | 需要已登入使用者 |
| Epic 005 管理員審核 | 後續功能 | 管理員處理回報 |

### 專案結構

```
src/
├── components/
│   └── error-report/
│       ├── ErrorReportButton.tsx     # 回報按鈕
│       ├── ErrorReportForm.tsx       # 回報表單
│       ├── ErrorReportModal.tsx      # 回報彈窗
│       ├── ReportCooldownTimer.tsx   # 冷卻計時器
│       └── MyReportsList.tsx         # 我的回報列表
├── pages/
│   └── ProfilePage.tsx               # 個人檔案頁面 (新增回報標籤)
├── hooks/
│   ├── useErrorReport.ts             # 回報提交 Hook
│   ├── useMyReports.ts               # 我的回報 Hook
│   └── useReportCooldown.ts          # 冷卻機制 Hook
└── utils/
    └── cooldown.ts                   # 冷卻時間工具
```

## 憲章合規檢查

### 原則對照

| 原則 | 狀態 | 實作方式 |
|------|------|----------|
| Community-First Development | ✅ 符合 | 讓使用者參與資料品質維護 |
| Security by Default | ✅ 符合 | Firestore Rules 限制回報權限、冷卻機制防濫用 |
| Mobile-First Design | ✅ 符合 | 模態視窗適配行動裝置 |
| Data Integrity & Trust | ✅ 符合 | 建立使用者回饋管道維護資料正確性 |
| User Story-Driven Development | ✅ 符合 | 依優先順序實作 P1 → P2 → P3 |

### 安全規則需求

```javascript
// Firestore Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 錯誤回報集合
    match /error_reports/{reportId} {
      // 只能讀取自己的回報
      allow read: if request.auth != null 
        && resource.data.reportedBy == request.auth.uid;
      
      // 管理員可讀取所有回報
      allow read: if request.auth != null 
        && request.auth.token.isAdmin == true;
      
      // 已登入使用者可建立回報
      allow create: if request.auth != null 
        && validReportCreate(request.resource.data);
      
      // 只有管理員可更新回報狀態
      allow update: if request.auth != null 
        && request.auth.token.isAdmin == true;
    }
    
    function validReportCreate(data) {
      return data.reportedBy == request.auth.uid
        && data.status == 'pending'
        && validErrorType(data.errorType)
        && (data.errorType != 'other' || data.description.size() >= 10);
    }
    
    function validErrorType(type) {
      return type in ['closed', 'address_error', 'phone_error', 
                      'description_mismatch', 'photo_mismatch', 'other'];
    }
  }
}
```

## 複雜度追蹤

| 決策 | 複雜度等級 | 理由 |
|------|------------|------|
| 混合模式冷卻機制 | 中 | Firestore 為權威來源、localStorage 快取改善 UX |
| 重複回報檢測 | 低 | 簡單的 Firestore 查詢 |
| 模態表單設計 | 低 | 標準 UI 模式 |

## 風險與緩解

| 風險 | 影響 | 緩解策略 |
|------|------|----------|
| 惡意回報濫用 | 管理員負擔增加 | 15 分鐘冷卻機制 |
| 重複回報遺漏 | 資料品質問題 | 同使用者+同地點+pending 狀態檢測 |
| localStorage 被繞過 | 冷卻機制失效 | Firestore 作為權威驗證 |
