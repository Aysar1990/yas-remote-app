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
├── yas-remote-pro.html          # الواجهة الرئيسية
├── yas-server-relay.py          # سيرفر Python للكمبيوتر (v3.3)
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
    ├── server.js                # السيرفر الرئيسي (v3.3)
    ├── auth.js                  # وحدة المصادقة
    ├── sessions.js              # إدارة الجلسات
    ├── file-handler.js          # معالجة الملفات
    └── package.json             # التبعيات

C:\Users\aysar\Documents\Remote control\YasRemoteApp\
├── www/                         # ملفات الواجهة للتطبيق
├── android/                     # مشروع Android (Capacitor)
├── capacitor.config.json        # إعدادات Capacitor
└── package.json                 # تبعيات Node.js
```

---

## 📊 الميزات حسب الإصدار

| الإصدار | الميزات |
|---------|---------|
| v1.0 | Screen sharing, Mouse, Keyboard |
| v2.0 | Apps control, System commands, File download |
| v3.0 | Authentication, Sessions, Trusted Devices |
| v3.1 | File Transfer (Upload/Download), Security Log |
| v3.2 | Multi-User, File Manager, File Browser, File Watcher |
| **v3.3** | Wake on LAN, تطبيق Android (Capacitor), دعم الكتابة العربية |

---

## ✅ ما تم إنجازه في هذه الجلسة (29 نوفمبر 2025):

### 1️⃣ Wake on LAN عبر Tailscale:
- تثبيت Tailscale على الكمبيوتر والهاتف
- تفعيل Wake on LAN في BIOS (Gigabyte B550 AORUS MASTER)
- إضافة زر "Wake PC" في واجهة التطبيق
- إضافة endpoint `/wol` في Relay Server
- ملف `js/wol.js` للتحكم

**ملاحظة مهمة:** Wake on LAN يعمل فقط:
- من نفس الشبكة المحلية (WiFi) عبر تطبيق Wake On Lan
- أو عند استخدام Sleep بدل Shutdown (عبر Tailscale من أي مكان)
- لتشغيله من الإنترنت مع Shutdown الكامل، يحتاج جهاز وسيط (هاتف قديم أو Raspberry Pi)

### 2️⃣ تطبيق Android (Capacitor):
- تثبيت Node.js v24.11.1
- تثبيت Android Studio مع SDK
- إنشاء مشروع Capacitor
- بناء ملف APK بنجاح

**موقع الـ APK:**
```
C:\Users\aysar\Documents\Remote control\YasRemoteApp\android\app\build\outputs\apk\debug\app-debug.apk
```

### 3️⃣ تشغيل السيرفر تلقائياً مع Windows:
- إنشاء اختصار في مجلد Startup
- السيرفر يشتغل تلقائياً عند تشغيل الكمبيوتر

**موقع الاختصار:**
```
%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\YasRemoteServer.lnk
```

### 4️⃣ دعم الكتابة العربية:
- تعديل `yas-server-relay.py` لاستخدام Clipboard
- الترتيب: Ctrl+A → Ctrl+V (تحديد الكل ثم لصق)

---

## 🚀 خطوات التشغيل

### 1️⃣ تشغيل السيرفر على الكمبيوتر:
```powershell
cd "C:\Users\aysar\Documents\Remote control\Android App"
python yas-server-relay.py
```

**أو يشتغل تلقائياً مع Windows**

### 2️⃣ فتح الواجهة:
```
https://aysar1990.github.io/yas-remote-app/yas-remote-pro.html
```

### 3️⃣ إدخال كلمة السر:
```
YasRemote2025
```

---

## 📱 بناء تطبيق Android:

### لتحديث التطبيق:
```powershell
cd "C:\Users\aysar\Documents\Remote control\YasRemoteApp"
Copy-Item -Path "..\Android App\yas-remote-pro.html" -Destination "www\index.html" -Force
Copy-Item -Path "..\Android App\css\*" -Destination "www\css\" -Force
Copy-Item -Path "..\Android App\js\*" -Destination "www\js\" -Force
npx cap sync android
```

### لبناء APK:
```powershell
cd "C:\Users\aysar\Documents\Remote control\YasRemoteApp\android"
.\gradlew assembleDebug
```

### أو من Android Studio:
```
Build → Build Bundle(s) / APK(s) → Build APK(s)
```

---

## 📤 كيفية رفع التحديثات

### رفع الواجهة (GitHub Pages):
```powershell
cd "C:\Users\aysar\Documents\Remote control\Android App"
& "C:\Program Files\Git\bin\git.exe" add .
& "C:\Program Files\Git\bin\git.exe" commit -m "وصف التحديث"
& "C:\Program Files\Git\bin\git.exe" push
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

## 🌐 Tailscale:

### معلومات الأجهزة:
| الجهاز | Tailscale IP |
|--------|--------------|
| الكمبيوتر (aysar) | 100.118.245.72 |
| الهاتف (samsung) | 100.106.1.98 |

### MAC Address للكمبيوتر:
- **Ethernet:** 18-C0-4D-01-E9-AE
- **WiFi:** E0-D4-E8-73-DD-F9

### إعدادات BIOS (Gigabyte B550 AORUS MASTER):
- **Wake on LAN:** Enabled ✅
- **ErP:** Disabled ✅

---

## 🔐 معلومات الأمان

- **كلمة السر:** YasRemote2025
- **Max Failed Attempts:** 5
- **Lockout Duration:** 15 دقيقة
- **Trusted Device Expiry:** 30 يوم
- **Session Timeout:** 30 دقيقة

---

## 🔮 الميزات القادمة

| الأولوية | الميزة | الوصف |
|----------|--------|-------|
| عالية | Native Android App | تحويل Capacitor لتطبيق كامل على Play Store |
| عالية | Push Notifications | إشعارات عند الاتصال/قطع الاتصال |
| متوسطة | Clipboard Sync | مزامنة الحافظة بين الهاتف والكمبيوتر |
| متوسطة | URL Opener | فتح روابط من الهاتف على الكمبيوتر |
| منخفضة | PWA | تثبيت كتطبيق Progressive Web App |

---

## 🆘 استكشاف الأخطاء

| المشكلة | الحل |
|---------|------|
| Waiting for screen... | تأكد أن `python yas-server-relay.py` يعمل |
| Connecting... لا يتوقف | تحقق من Render logs للأخطاء |
| Wake PC لا يعمل | استخدم تطبيق Wake On Lan من نفس الشبكة أو استخدم Sleep |
| الكتابة العربية لا تعمل | تأكد من إعادة تشغيل السيرفر بعد التعديل |
| GitHub Pages لا يتحدث | امسح Cache المتصفح أو استخدم Incognito |
| APK لا يُبنى | تأكد من Gradle Sync في Android Studio |

---

## 📝 ملاحظات مهمة

1. **relay-server مجلد Git منفصل** - يحتاج push منفصل
2. **Render Free tier** - ينام بعد 15 دقيقة من عدم النشاط
3. **Wake on LAN** - يعمل فقط مع كيبل Ethernet (ليس WiFi)
4. **Tailscale** - لازم يكون شغال على الجهازين للاتصال المباشر
5. **السيرفر المحلي** - التعديلات عليه لا تحتاج رفع لـ Git

---

## 📞 للمتابعة

### إذا استمرت مشكلة الاتصال:
1. افتح Render Dashboard
2. اضغط Manual Deploy → Deploy latest commit
3. انتظر حتى Status: Live
4. أعد تشغيل السيرفر المحلي

### للتحقق من السيرفر المحلي:
```powershell
Get-Process python* -ErrorAction SilentlyContinue
```

### لإيقاف السيرفر:
```powershell
Get-Process python* -ErrorAction SilentlyContinue | Stop-Process -Force
```
