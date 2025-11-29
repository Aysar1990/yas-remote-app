# YAS Remote Pro v3.3 - Handoff Document
## آخر تحديث: 29 نوفمبر 2025

---

## 📋 نظرة عامة

**YAS Remote Pro** - نظام تحكم عن بعد بالكمبيوتر من الهاتف عبر الويب.

### الروابط المهمة:
| العنصر | الرابط |
|--------|--------|
| **الواجهة (GitHub Pages)** | https://aysar1990.github.io/yas-remote-app/yas-remote-pro.html |
| **Relay Server (Render)** | https://yas-remote-relay.onrender.com |
| **GitHub - الواجهة** | https://github.com/Aysar1990/yas-remote-app |
| **GitHub - السيرفر** | https://github.com/Aysar1990/yas-remote-relay |
| **كلمة السر** | YasRemote2025 |

---

## 📁 هيكل المشروع

```
C:\Users\aysar\Documents\Remote control\Android App\
├── yas-remote-pro.html          # الواجهة الرئيسية (HTML فقط)
├── yas-server-relay.py          # سيرفر Python للكمبيوتر (v3.2)
├── HANDOFF.md                   # هذا الملف
├── css/
│   └── styles.css               # جميع الأنماط
├── js/
│   ├── config.js                # الإعدادات والثوابت
│   ├── wol.js                   # Wake on LAN عبر Tailscale
│   ├── auth.js                  # المصادقة + Trusted Devices
│   ├── connection.js            # WebSocket + معالجة الرسائل
│   ├── screen.js                # الشاشة + Touch handling
│   ├── files.js                 # نقل الملفات + File Manager + File Watcher
│   └── ui.js                    # الواجهة + الأوامر
└── relay-server/                # مجلد Git منفصل للـ Relay Server
    ├── server.js                # السيرفر الرئيسي (v3.2)
    ├── auth.js                  # وحدة المصادقة
    ├── sessions.js              # إدارة الجلسات
    ├── file-handler.js          # معالجة الملفات
    └── package.json             # التبعيات
```

---

## 🔧 الحالة الحالية

### ✅ ما تم إنجازه:
1. **v3.2 Features:**
   - Multi-User (قائمة المستخدمين المتصلين)
   - File Manager (نسخ، نقل، حذف، إعادة تسمية)
   - File Browser المحسّن مع Quick Access
   - File Watcher (مراقبة المجلدات)

2. **البنية التحتية:**
   - تقسيم ملف HTML الكبير إلى modules
   - رفع الواجهة على GitHub Pages
   - رفع السيرفر على Render

3. **إصلاح أخير:**
   - إضافة دالة `checkLockout` في auth.js
   - إصلاح `validatePassword` ليقبل parameter واحد
   - إصلاح `recordFailedAttempt`

### ⏳ الحالة الآن:
- تم رفع الإصلاحات على GitHub
- **يجب انتظار Render لإعادة البناء (1-2 دقيقة)**
- بعدها يجب إعادة تشغيل `python yas-server-relay.py`

---

## 🐛 المشكلة الأخيرة (تم حلها)

**الخطأ في Render logs:**
```
Invalid message: auth.checkLockout is not a function
```

**السبب:** ملف auth.js القديم لم يكن يحتوي على دالة `checkLockout`

**الحل:** تم إضافة الدوال المطلوبة:
- `checkLockout(password)` - للتحقق من القفل
- `validatePassword(password)` - للتحقق من صحة كلمة المرور
- تحديث `recordFailedAttempt(key)` - لتسجيل المحاولات الفاشلة

---

## 🚀 خطوات التشغيل

### 1️⃣ تشغيل السيرفر على الكمبيوتر:
```powershell
cd "C:\Users\aysar\Documents\Remote control\Android App"
python yas-server-relay.py
```

### 2️⃣ فتح الواجهة:
```
https://aysar1990.github.io/yas-remote-app/yas-remote-pro.html
```

### 3️⃣ إدخال كلمة السر:
```
YasRemote2025
```

---

## 📤 كيفية رفع التحديثات

### رفع الواجهة (GitHub Pages):
```powershell
cd "C:\Users\aysar\Documents\Remote control\Android App"
git add .
git commit -m "وصف التحديث"
git push
```

### رفع السيرفر (Render):
```powershell
cd "C:\Users\aysar\Documents\Remote control\Android App\relay-server"
& "C:\Program Files\Git\bin\git.exe" add .
& "C:\Program Files\Git\bin\git.exe" commit -m "وصف التحديث"
& "C:\Program Files\Git\bin\git.exe" push
```

**ملاحظة:** relay-server هو مجلد Git منفصل!

---

## 📊 الميزات حسب الإصدار

| الإصدار | الميزات |
|---------|---------|
| v1.0 | Screen sharing, Mouse, Keyboard |
| v2.0 | Apps control, System commands, File download |
| v3.0 | Authentication, Sessions, Trusted Devices |
| v3.1 | File Transfer (Upload/Download), Security Log |
| v3.2 | Multi-User, File Manager, File Browser, File Watcher |
| **v3.3** | **Wake on LAN عبر Tailscale** |

---

## 🔮 الميزات القادمة

| المرحلة | الميزة | الوصف |
|---------|--------|-------|
| 3 | Clipboard Sync | مزامنة الحافظة بين الهاتف والكمبيوتر |
| 3 | URL Opener | فتح روابط من الهاتف على الكمبيوتر |
| 6 | Wake on LAN | تشغيل الكمبيوتر المطفأ عن بعد |
| 6 | PWA | تثبيت كتطبيق على الهاتف |
| 6 | Auto-start | تشغيل السيرفر تلقائياً مع Windows |

---

## 🔐 معلومات الأمان

- **كلمة السر:** YasRemote2025
- **Max Failed Attempts:** 5
- **Lockout Duration:** 15 دقيقة
- **Trusted Device Expiry:** 30 يوم
- **Session Timeout:** 30 دقيقة

---

## 📝 ملاحظات مهمة

1. **لا تفتح الملف محلياً** (`file:///...`) - استخدم GitHub Pages دائماً
2. **relay-server مجلد Git منفصل** - يحتاج push منفصل
3. **Render Free tier** - ينام بعد 15 دقيقة من عدم النشاط (أول طلب يأخذ ~50 ثانية)
4. **watchdog مطلوب:** `pip install watchdog`

---

## 🆘 استكشاف الأخطاء

| المشكلة | الحل |
|---------|------|
| Waiting for screen... | تأكد أن `python yas-server-relay.py` يعمل |
| Connecting... لا يتوقف | تحقق من Render logs للأخطاء |
| الملفات لا تعمل محلياً | استخدم GitHub Pages أو `python -m http.server 8080` |
| auth.X is not a function | تحقق من auth.js وأعد الرفع على GitHub |

---

## 📞 للمتابعة

إذا استمرت مشكلة الاتصال:
1. افتح Render Dashboard
2. اضغط Manual Deploy → Deploy latest commit
3. انتظر حتى Status: Live
4. أعد تشغيل السيرفر المحلي
5. جرب الاتصال مرة أخرى
