# 實作計畫：使用者認證與個人檔案

**功能分支**: `002-user-auth`
**規格版本**: 1.0.0
**計畫建立日期**: 2025-12-03

## 技術背景

### 使用的技術

| 技術 | 版本 | 用途 |
|------|------|------|
| React | 19 | 前端框架 |
| Vite | 7 | 建構工具 |
| Firebase Auth | 12 | 使用者認證 |
| Firebase Firestore | 12 | 使用者文件儲存 |
| Firebase Storage | 12 | 頭像儲存 |
| Firebase Cloud Functions | 12 | Custom Claims 更新、頭像處理 |
| React Hook Form | 7.x | 表單管理 |
| Zod | 3.x | 表單驗證 |
| react-image-crop | 11.x | 頭像裁切 |
| Sharp | 0.33.x | 後端圖片壓縮/縮圖 |

### 相依的功能

| 功能 | 狀態 | 影響 |
|------|------|------|
| Firebase 專案配置 | 前置條件 | Auth、Firestore、Storage 需先啟用 |
| Cloud Functions 部署環境 | 前置條件 | Custom Claims 更新需要 |

### 專案結構

```
src/
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx          # 登入表單
│   │   ├── RegisterForm.tsx       # 註冊表單
│   │   ├── ForgotPasswordForm.tsx # 忘記密碼表單
│   │   └── EmailVerificationBanner.tsx # Email 驗證提醒橫幅
│   └── profile/
│       ├── ProfileView.tsx        # 個人檔案檢視
│       ├── ProfileEditForm.tsx    # 個人檔案編輯
│       ├── AvatarUploader.tsx     # 頭像上傳器（含裁切）
│       ├── WildernessPartnerForm.tsx # 荒野夥伴資訊表單
│       └── MySubmissionsList.tsx  # 我的提交記錄列表
├── pages/
│   ├── LoginPage.tsx              # 登入頁面
│   ├── RegisterPage.tsx           # 註冊頁面
│   └── ProfilePage.tsx            # 個人檔案頁面
├── contexts/
│   └── AuthContext.tsx            # 認證狀態管理
├── hooks/
│   ├── useAuth.ts                 # 認證 Hook
│   ├── useUser.ts                 # 使用者資料 Hook
│   └── useWildernessPartner.ts    # 荒野夥伴 Hook
└── utils/
    ├── auth.ts                    # 認證工具函式
    └── validation.ts              # 驗證規則

functions/
├── src/
│   ├── auth/
│   │   └── onUserCreate.ts        # 使用者建立觸發器
│   ├── claims/
│   │   └── setWildernessPartner.ts # 設定荒野夥伴 Claims
│   └── storage/
│       └── processAvatar.ts       # 頭像處理（壓縮+縮圖）
└── package.json
```

## 憲章合規檢查

### 原則對照

| 原則 | 狀態 | 實作方式 |
|------|------|----------|
| Community-First Development | ✅ 符合 | 荒野夥伴以「團名-自然名」格式顯示 |
| Security by Default | ✅ 符合 | Firestore Rules 保護使用者資料、Custom Claims 控制權限 |
| Mobile-First Design | ✅ 符合 | 表單設計優先考慮行動裝置、觸控友善 |
| Data Integrity & Trust | ✅ 符合 | 荒野夥伴資訊基於使用者自律填寫 |
| User Story-Driven Development | ✅ 符合 | 依優先順序實作 P1 → P2 |

### 安全規則需求

```javascript
// Firestore Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 使用者文件
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null && request.auth.uid == userId
        && !('isAdmin' in request.resource.data)
        && !('isSuperAdmin' in request.resource.data);
    }
  }
}

// Storage Security Rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /avatars/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null 
        && request.auth.uid == userId
        && request.resource.size < 2 * 1024 * 1024
        && request.resource.contentType.matches('image/(jpeg|png)');
    }
  }
}
```

## 複雜度追蹤

| 決策 | 複雜度等級 | 理由 |
|------|------------|------|
| 使用 Cloud Functions 處理頭像 | 中 | 確保一致的縮圖產生，避免前端效能問題 |
| Custom Claims 用於荒野夥伴狀態 | 低 | Firebase 原生支援，安全且高效 |
| localStorage 快取認證狀態 | 低 | 減少 API 呼叫，改善 UX |

## 風險與緩解

| 風險 | 影響 | 緩解策略 |
|------|------|----------|
| Email 驗證信被標記為垃圾郵件 | 使用者無法完成驗證 | 自訂 Email 範本、提供重新發送功能 |
| 頭像處理 Cloud Function 超時 | 上傳失敗 | 限制檔案大小、最佳化處理流程 |
| Custom Claims 同步延遲 | 權限未即時生效 | 強制 Token 重新整理 |
