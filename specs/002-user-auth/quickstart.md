# 快速開始指南：使用者認證與個人檔案

**功能分支**: `002-user-auth`
**建立日期**: 2025-12-03

## 環境設定

### 1. 安裝相依套件

```bash
# 前端套件
npm install react-hook-form @hookform/resolvers zod
npm install react-image-crop

# Cloud Functions 套件
cd functions
npm install sharp
npm install @types/sharp --save-dev
```

### 2. Firebase 設定

確保以下 Firebase 服務已啟用：
- Authentication > Email/Password 提供者
- Firestore Database
- Storage
- Cloud Functions

### 3. 環境變數

```env
# .env.local
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

## 核心程式碼範例

### AuthContext 設定

```typescript
// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState, PropsWithChildren } from 'react';
import { 
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isWildernessPartner: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isWildernessPartner, setIsWildernessPartner] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // 取得 Custom Claims
        const tokenResult = await firebaseUser.getIdTokenResult();
        setIsWildernessPartner(!!tokenResult.claims.isWildernessPartner);
        setUser(firebaseUser);
      } else {
        setUser(null);
        setIsWildernessPartner(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const register = async (email: string, password: string, displayName: string) => {
    const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
    
    // 建立使用者文件
    await setDoc(doc(db, 'users', newUser.uid), {
      displayName,
      email,
      emailVerified: false,
      photoURL: null,
      isWildernessPartner: false,
      wildernessInfo: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 發送驗證 Email
    await sendEmailVerification(newUser);
  };

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const resendVerificationEmail = async () => {
    if (!user) throw new Error('未登入');
    
    const lastSent = localStorage.getItem('lastVerificationEmailSent');
    const cooldown = 60 * 1000; // 1 分鐘
    
    if (lastSent && Date.now() - parseInt(lastSent) < cooldown) {
      throw new Error('請等待 1 分鐘後再試');
    }
    
    await sendEmailVerification(user);
    localStorage.setItem('lastVerificationEmailSent', Date.now().toString());
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isWildernessPartner,
      login,
      register,
      logout,
      resendVerificationEmail,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### 註冊表單

```typescript
// src/components/auth/RegisterForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';

const registerSchema = z.object({
  email: z.string().email('請輸入有效的 Email'),
  password: z.string().min(6, '密碼至少 6 個字元'),
  confirmPassword: z.string(),
  displayName: z.string().min(2, '顯示名稱至少 2 個字元').max(50, '顯示名稱最多 50 個字元'),
}).refine((data) => data.password === data.confirmPassword, {
  message: '密碼不一致',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export const RegisterForm = () => {
  const { register: registerUser } = useAuth();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser(data.email, data.password, data.displayName);
      // 導向成功頁面或顯示驗證 Email 提示
    } catch (error) {
      // 處理錯誤
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Email</label>
        <input
          type="email"
          {...register('email')}
          className="mt-1 block w-full rounded-md border p-3"
        />
        {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium">顯示名稱</label>
        <input
          type="text"
          {...register('displayName')}
          className="mt-1 block w-full rounded-md border p-3"
        />
        {errors.displayName && <p className="text-red-500 text-sm">{errors.displayName.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium">密碼</label>
        <input
          type="password"
          {...register('password')}
          className="mt-1 block w-full rounded-md border p-3"
        />
        {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium">確認密碼</label>
        <input
          type="password"
          {...register('confirmPassword')}
          className="mt-1 block w-full rounded-md border p-3"
        />
        {errors.confirmPassword && <p className="text-red-500 text-sm">{errors.confirmPassword.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-green-600 text-white py-3 rounded-md font-medium disabled:opacity-50"
      >
        {isSubmitting ? '註冊中...' : '註冊'}
      </button>
    </form>
  );
};
```

### 荒野夥伴 Cloud Function

```typescript
// functions/src/claims/setWildernessPartner.ts
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export const setWildernessPartner = onCall(async (request) => {
  // 驗證認證
  if (!request.auth) {
    throw new HttpsError('unauthenticated', '未登入');
  }

  const { wildernessId, chapter, natureName } = request.data;

  // 驗證參數
  if (!wildernessId || !chapter || !natureName) {
    throw new HttpsError('invalid-argument', '請填寫所有必填欄位');
  }

  const uid = request.auth.uid;

  try {
    // 更新 Custom Claims
    await getAuth().setCustomUserClaims(uid, {
      ...request.auth.token,
      isWildernessPartner: true,
    });

    // 更新 Firestore 使用者文件
    const db = getFirestore();
    await db.doc(`users/${uid}`).update({
      isWildernessPartner: true,
      wildernessInfo: {
        wildernessId,
        chapter,
        natureName,
        filledAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { success: true, message: '荒野夥伴身份設定成功' };
  } catch (error) {
    console.error('設定荒野夥伴失敗:', error);
    throw new HttpsError('internal', '設定失敗，請稍後再試');
  }
});
```

### 頭像處理 Cloud Function

```typescript
// functions/src/storage/processAvatar.ts
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { getStorage } from 'firebase-admin/storage';
import * as sharp from 'sharp';
import * as path from 'path';

const SIZES = [
  { name: 'small', size: 32 },
  { name: 'medium', size: 128 },
  { name: 'large', size: 512 },
];

export const processAvatar = onObjectFinalized(
  { bucket: 'your-project.appspot.com' },
  async (event) => {
    const filePath = event.data.name;
    
    // 只處理 avatars 資料夾中的 original 檔案
    if (!filePath.startsWith('avatars/') || !filePath.includes('/original.')) {
      return;
    }

    const bucket = getStorage().bucket(event.data.bucket);
    const [originalBuffer] = await bucket.file(filePath).download();
    
    const dirPath = path.dirname(filePath);

    // 產生各尺寸縮圖
    await Promise.all(
      SIZES.map(async ({ name, size }) => {
        const resized = await sharp(originalBuffer)
          .resize(size, size, { fit: 'cover' })
          .jpeg({ quality: 80 })
          .toBuffer();

        await bucket.file(`${dirPath}/${name}.jpg`).save(resized, {
          contentType: 'image/jpeg',
          metadata: {
            cacheControl: 'public, max-age=31536000',
          },
        });
      })
    );

    console.log(`頭像處理完成: ${dirPath}`);
  }
);
```

## 開發流程

### 1. 啟動開發伺服器

```bash
# 前端
npm run dev

# Cloud Functions 模擬器
cd functions
npm run serve
```

### 2. 部署 Cloud Functions

```bash
cd functions
npm run deploy
```

### 3. 更新 Firestore Security Rules

```bash
firebase deploy --only firestore:rules
```

### 4. 更新 Storage Security Rules

```bash
firebase deploy --only storage
```

## 測試清單

### P1 功能測試

- [ ] Email 註冊流程
  - [ ] 填寫表單並提交
  - [ ] 確認 Firestore 使用者文件建立
  - [ ] 確認收到驗證 Email
  
- [ ] Email 登入流程
  - [ ] 正確帳密登入成功
  - [ ] 錯誤帳密顯示錯誤訊息
  
- [ ] 荒野夥伴資訊填寫
  - [ ] 填寫荒野編號、分會、自然名
  - [ ] 確認 Custom Claims 更新
  - [ ] 確認個人檔案顯示徽章

### P2 功能測試

- [ ] 個人檔案編輯
  - [ ] 修改顯示名稱
  - [ ] 上傳並裁切頭像
  - [ ] 確認三種尺寸縮圖產生

- [ ] 我的提交記錄
  - [ ] 顯示提交列表
  - [ ] 顯示狀態標示
