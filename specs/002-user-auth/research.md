# 技術研究：使用者認證與個人檔案

**功能分支**: `002-user-auth`
**研究日期**: 2025-12-03

## 1. Firebase Auth Email/Password 認證

### 決策

使用 Firebase Authentication 的 Email/Password 提供者實作使用者認證。

### 理由

- Firebase Auth 提供完整的認證流程（註冊、登入、密碼重設、Email 驗證）
- 與 Firestore 和 Cloud Functions 無縫整合
- 內建安全機制（密碼加密、防暴力破解）
- 符合憲章技術堆疊要求

### 考慮的替代方案

| 方案 | 優點 | 缺點 |
|------|------|------|
| Auth0 | 功能更豐富 | 額外成本、增加複雜度 |
| 自建認證 | 完全掌控 | 安全風險高、開發成本高 |
| Firebase + Google OAuth | 更便利 | 非 MVP 必需 |

---

## 2. Email 驗證流程

### 決策

使用 Firebase Auth 內建的 `sendEmailVerification()` 並在前端檢查 `emailVerified` 狀態。

### 理由

- 零額外成本
- 自動處理驗證連結產生與驗證
- 可自訂 Email 範本（透過 Firebase Console）

### 實作細節

```typescript
// 發送驗證 Email
await sendEmailVerification(user, {
  url: `${window.location.origin}/profile`,
  handleCodeInApp: false,
});

// 檢查驗證狀態
const canSubmitLocation = user.emailVerified;
```

### 考慮的替代方案

| 方案 | 優點 | 缺點 |
|------|------|------|
| 自訂驗證 Email 服務 | 完全客製化 | 增加複雜度與成本 |
| SMS 驗證 | 更可靠 | 成本高、使用者體驗差 |

---

## 3. 荒野夥伴 Custom Claims

### 決策

使用 Firebase Custom Claims 儲存 `isWildernessPartner` 狀態，透過 Cloud Function 更新。

### 理由

- Custom Claims 隨 ID Token 傳遞，可在 Security Rules 中直接使用
- 不需要額外的 Firestore 查詢來驗證權限
- 最大 1000 bytes 足夠儲存基本權限資訊

### 實作細節

```typescript
// Cloud Function: setWildernessPartner
export const setWildernessPartner = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', '未登入');
  
  await getAuth().setCustomUserClaims(uid, {
    isWildernessPartner: true,
  });
  
  return { success: true };
});
```

### 考慮的替代方案

| 方案 | 優點 | 缺點 |
|------|------|------|
| 僅存 Firestore | 無需 Cloud Function | 每次權限檢查需查詢 DB |
| 管理員審核流程 | 更嚴謹 | 增加管理負擔、違反規格決策 |

---

## 4. 頭像處理流程

### 決策

前端使用 `react-image-crop` 裁切為 1:1 正方形，上傳後由 Cloud Function 使用 Sharp 產生三種尺寸縮圖。

### 理由

- 前端裁切確保使用者控制最終呈現
- 後端處理確保一致的縮圖品質與格式
- Sharp 是 Node.js 最高效的圖片處理庫

### 實作細節

```typescript
// Cloud Function: processAvatar
export const processAvatar = onObjectFinalized(
  { bucket: 'avatars' },
  async (event) => {
    const filePath = event.data.name;
    if (!filePath.includes('/original.')) return;
    
    const [userId] = filePath.split('/');
    const bucket = getStorage().bucket();
    
    // 下載原圖
    const [originalBuffer] = await bucket.file(filePath).download();
    
    // 產生三種尺寸
    const sizes = [
      { name: 'small', size: 32 },
      { name: 'medium', size: 128 },
      { name: 'large', size: 512 },
    ];
    
    for (const { name, size } of sizes) {
      const resized = await sharp(originalBuffer)
        .resize(size, size, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toBuffer();
      
      await bucket
        .file(`avatars/${userId}/${name}.jpg`)
        .save(resized, { contentType: 'image/jpeg' });
    }
  }
);
```

### 考慮的替代方案

| 方案 | 優點 | 缺點 |
|------|------|------|
| 前端產生縮圖 | 減少 Cloud Function 使用 | 不同裝置結果不一致 |
| 第三方服務 (Cloudinary) | 功能更豐富 | 額外成本、供應商鎖定 |
| 無縮圖（原圖縮放） | 最簡單 | 效能差、浪費頻寬 |

---

## 5. 使用者文件結構

### 決策

在 Firestore `/users/{userId}` 儲存使用者文件，包含基本資訊與荒野夥伴資訊。

### 理由

- 使用 Firebase Auth UID 作為文件 ID，確保唯一性
- 嵌入荒野夥伴資訊避免額外集合，簡化查詢
- 符合 Firestore 最佳實踐

### 資料結構

```typescript
interface UserDocument {
  displayName: string;
  email: string;
  emailVerified: boolean;
  photoURL: string | null;
  isWildernessPartner: boolean;
  wildernessInfo?: {
    wildernessId: string;
    chapter: string;
    natureName: string;
    filledAt: Timestamp;
    updatedAt: Timestamp;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 6. 表單驗證策略

### 決策

使用 React Hook Form + Zod 進行表單管理與驗證。

### 理由

- React Hook Form 提供高效能的表單狀態管理
- Zod 提供類型安全的驗證 schema
- 兩者整合良好，開發體驗佳

### 實作細節

```typescript
const registerSchema = z.object({
  email: z.string().email('請輸入有效的 Email'),
  password: z.string().min(6, '密碼至少 6 個字元'),
  displayName: z.string().min(2, '顯示名稱至少 2 個字元').max(50),
});

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(registerSchema),
});
```

---

## 7. 認證狀態管理

### 決策

使用 React Context 管理認證狀態，監聽 `onAuthStateChanged` 事件。

### 理由

- Context 提供全域認證狀態存取
- `onAuthStateChanged` 自動處理 Token 重新整理
- 符合 React 最佳實踐

### 實作細節

```typescript
export const AuthProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // 取得最新的 ID Token 包含 Custom Claims
        await firebaseUser.getIdToken(true);
        const tokenResult = await firebaseUser.getIdTokenResult();
        setUser({
          ...firebaseUser,
          claims: tokenResult.claims,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
  }, []);
  
  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
```

---

## 8. 重新發送驗證 Email 限流

### 決策

使用 `localStorage` 記錄上次發送時間，限制 1 分鐘內最多發送 1 次。

### 理由

- 簡單有效的前端限流
- 避免使用者誤觸導致多次發送
- 無需後端支援

### 實作細節

```typescript
const RESEND_COOLDOWN = 60 * 1000; // 1 分鐘

const canResendEmail = () => {
  const lastSent = localStorage.getItem('lastVerificationEmailSent');
  if (!lastSent) return true;
  return Date.now() - parseInt(lastSent) > RESEND_COOLDOWN;
};

const resendVerificationEmail = async () => {
  if (!canResendEmail()) {
    throw new Error('請等待 1 分鐘後再試');
  }
  await sendEmailVerification(user);
  localStorage.setItem('lastVerificationEmailSent', Date.now().toString());
};
```

### 考慮的替代方案

| 方案 | 優點 | 缺點 |
|------|------|------|
| Firestore 記錄 | 跨裝置一致 | 增加複雜度 |
| Cloud Function 限流 | 更安全 | 過度設計 |
