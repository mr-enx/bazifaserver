# Bazifa

A TypeScript monorepo foundation for an online multiplayer multi-Bazifa.

## Stack

- Frontend: React, Vite, TypeScript, React Router, Tailwind CSS, Phaser-ready
- Backend: Node.js, Fastify, TypeScript
- Realtime: Socket.IO-ready (not implemented yet)
- Database: PostgreSQL with Drizzle ORM
- Shared package: common TypeScript types and constants

## Structure

```txt
apps/
  web/       React + Vite client
  server/    Fastify API server
packages/
  shared/    Shared types and constants
```

## Getting Started

```bash
npm install
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
npm run dev:server
npm run dev:web
```

Default URLs:

- Web: http://localhost:5173
- Server: http://localhost:8080
- Health: http://localhost:8080/health


## Database Setup

The server uses PostgreSQL with Drizzle ORM. Prisma is not used.

1. Create a local PostgreSQL database.
2. Copy `apps/server/.env.example` to `apps/server/.env` and set `DATABASE_URL`:

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/game_platform
```

3. Run the initial migration and seed the games catalog:

```bash
npm run db:migrate -w @game-platform/server
npm run db:seed:games -w @game-platform/server
```

Useful DB scripts:

- `npm run db:generate -w @game-platform/server` - generate Drizzle migrations from `src/db/schema.ts`
- `npm run db:migrate -w @game-platform/server` - apply migrations from `apps/server/drizzle`
- `npm run db:seed:games -w @game-platform/server` - upsert the initial game rows
- `npm run db:studio -w @game-platform/server` - open Drizzle Studio

## Scripts

- `npm run dev:web` - start the Vite dev server
- `npm run dev:server` - start the Fastify server with TypeScript watch mode
- `npm run build:web` - build the web app
- `npm run build:server` - build the shared package and server
- `npm run typecheck` - typecheck all workspaces

## لاگ‌های سرور (pretty-log.mjs)

برای اینکه لاگ‌های JSON خام Fastify/Pino در حالت توسعه خوانا و رنگی نمایش داده شوند، اسکریپت `pretty-log.mjs` در ریشه پروژه قرار دارد.

این اسکریپت:

- لاگ‌های JSON سرور را از `stdin` می‌خواند و به فرمت خوانا با رنگ تبدیل می‌کند.
- زمان، سطح لاگ (`INFO`/`WARN`/`ERROR`)، `reqId`، متد و مسیر درخواست، کد وضعیت HTTP و زمان پاسخ را به‌صورت تک‌خطی نمایش می‌دهد.
- کدهای وضعیت را بر اساس نوع رنگ‌بندی می‌کند: `2xx/3xx` سبز، `4xx` زرد، `5xx` قرمز.
- هیچ وابستگی خارجی ندارد و فقط با Node.js (نسخه ۲۰ به بالا) اجرا می‌شود.

اسکریپت `dev:server` به‌طور خودکار خروجی سرور را به این اسکریپت pipe می‌کند:

```bash
npm run dev:server
# خروجی نمونه:
# [12:46:55.874] INFO  (req-1k) request completed 200 in 7ms
# [12:46:55.935] INFO  (req-1k) incoming request  GET /api/games/collector/status
```

اگر در production نیاز به لاگ JSON خام دارید (برای ارسال به ابزارهای مانیتورینگ مثل Grafana یا Sentry)، کافیست در `package.json` بخش `| node pretty-log.mjs` را از انتهای اسکریپت `dev:server` حذف کنید.

## اجرای پروژه روی VPS واقعی

این راهنما یک روش ساده و مناسب MVP برای اجرای پروژه روی یک VPS لینوکسی است. فرض‌ها:

- Ubuntu 22.04 یا 24.04
- دامنه نمونه: `example.com`
- API روی `api.example.com`
- فرانت‌اند روی `example.com`
- Node.js نسخه 20 یا بالاتر
- PostgreSQL بدون Prisma
- Nginx به عنوان reverse proxy و static file server
- PM2 برای اجرای دائمی بک‌اند

در دستورهای زیر دامنه‌ها، پسوردها و مسیر پروژه را با مقدارهای واقعی خودتان جایگزین کنید.

### 1. نصب پیش‌نیازها

```bash
sudo apt update
sudo apt install -y git curl nginx postgresql postgresql-contrib
```

نصب Node.js 20:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

نصب PM2:

```bash
sudo npm install -g pm2
```

### 2. آماده‌سازی دیتابیس PostgreSQL
npm --prefix apps/server run db:migrate

وارد PostgreSQL شوید:

```bash
sudo -u postgres psql
```

دیتابیس و یوزر بسازید:

```sql
CREATE DATABASE game_platform;
CREATE USER game_platform_user WITH PASSWORD 'CHANGE_ME_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE game_platform TO game_platform_user;
\q
```

اگر PostgreSQL شما برای ساخت جدول داخل schema دسترسی جدا می‌خواهد:

```bash
sudo -u postgres psql -d game_platform
```

```sql
GRANT ALL ON SCHEMA public TO game_platform_user;
\q
```

### 3. گرفتن کد و نصب وابستگی‌ها

```bash
cd /var/www
sudo git clone YOUR_REPOSITORY_URL game-platform
sudo chown -R $USER:$USER /var/www/game-platform
cd /var/www/game-platform
npm install
```

### 4. تنظیم env بک‌اند

فایل env سرور را بسازید:

```bash
cp apps/server/.env.example apps/server/.env
nano apps/server/.env
```

نمونه production:

```env
NODE_ENV=production
HOST=127.0.0.1
PORT=8080
CLIENT_ORIGIN=https://example.com
DATABASE_URL=postgres://game_platform_user:CHANGE_ME_STRONG_PASSWORD@localhost:5432/game_platform
```

نکته‌ها:

- `HOST=127.0.0.1` یعنی API مستقیم از اینترنت باز نیست و فقط Nginx به آن وصل می‌شود.
- `CLIENT_ORIGIN` باید دقیقاً آدرس فرانت‌اند باشد؛ اگر چند origin لازم دارید، طبق پیاده‌سازی env پروژه آن‌ها را تنظیم کنید.
- `DATABASE_URL` را با یوزر و پسورد واقعی دیتابیس پر کنید.

### 5. تنظیم env فرانت‌اند

```bash
cp apps/web/.env.example apps/web/.env
nano apps/web/.env
```

نمونه production:

```env
VITE_API_URL=https://api.example.com
```

این مقدار هنگام build داخل خروجی Vite قرار می‌گیرد؛ اگر آن را تغییر دادید باید دوباره build بگیرید.

### 6. Build، migration و seed

```bash
npm run build
npm run db:migrate -w @game-platform/server
npm run db:seed:games -w @game-platform/server
```

بعد از build:

- خروجی فرانت‌اند: `apps/web/dist`
- خروجی بک‌اند: `apps/server/dist`

### 7. اجرای بک‌اند با PM2

```bash
pm2 start npm --name game-platform-api -- run start -w @game-platform/server
pm2 save
pm2 startup
```

دستور آخر یک command چاپ می‌کند؛ همان command را اجرا کنید تا PM2 بعد از reboot هم بالا بیاید.

برای بررسی لاگ‌ها:

```bash
pm2 logs game-platform-api
pm2 status
```

برای ری‌استارت بعد از deploy جدید:

```bash
pm2 restart game-platform-api
```

### 8. تنظیم Nginx برای API و فرانت‌اند

یک فایل Nginx بسازید:

```bash
sudo nano /etc/nginx/sites-available/game-platform
```

نمونه config:

```nginx
server {
    listen 80;
    server_name example.com;

    root /var/www/game-platform/apps/web/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}

server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Required for Socket.IO / WebSocket
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

فعال‌سازی config:

```bash
sudo ln -s /etc/nginx/sites-available/game-platform /etc/nginx/sites-enabled/game-platform
sudo nginx -t
sudo systemctl reload nginx
```

اگر default site مزاحم بود:

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 9. فعال‌سازی SSL با Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d example.com -d api.example.com
```

بعد از SSL، مقدارهای env باید با `https` باشند:

```env
CLIENT_ORIGIN=https://example.com
VITE_API_URL=https://api.example.com
```

اگر `VITE_API_URL` را تغییر دادید:

```bash
npm run build:web
sudo systemctl reload nginx
pm2 restart game-platform-api
```

### 10. فایروال

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

پورت `8080` را عمومی باز نکنید، چون Nginx باید تنها ورودی عمومی API باشد.

### 11. چک نهایی

سلامت API:

```bash
curl https://api.example.com/health
```

فرانت‌اند:

```bash
curl -I https://example.com
```

لاگ API:

```bash
pm2 logs game-platform-api
```

### 12. روند deploy بعدی

برای آپدیت پروژه روی VPS:

```bash
cd /var/www/game-platform
git pull
npm install
npm run build
npm run db:migrate -w @game-platform/server
npm run db:seed:games -w @game-platform/server
pm2 restart game-platform-api
sudo systemctl reload nginx
```

### نکته مهم برای Voice Chat / WebRTC

Voice chat با WebRTC کار می‌کند و برای مرورگرها معمولاً به HTTPS نیاز دارد. روی production حتماً SSL را فعال کنید. برای بعضی شبکه‌ها و NATهای سخت‌گیر، STUN کافی نیست و بعداً ممکن است نیاز به TURN server داشته باشید؛ اما برای MVP فعلی، mesh WebRTC با Socket.IO signaling قابل اجراست.

### اجرای بک‌اند روی VPS اختصاصی و فرانت‌اند روی هاست جداگانه

اگر قصد دارید فرانت‌اند را در هاست دیگری (مثل ایران سرور) نگه دارید و VPS اختصاصی (مثل پارس پک) فقط برای بک‌اند (Node.js + PostgreSQL) باشد:

1. **فرانت‌اند:** خروجی `npm run build:web` را بگیرید و در ساب‌دامنه (مثلاً `play.bazifaa.ir`) آپلود کنید.
2. **بک‌اند در VPS:**
   - کدها را در سرور قرار دهید و فقط بک‌اند را بیلد کنید: `npm run build:server`
   - در تنظیمات `.env` سرور، متغیر `CLIENT_ORIGIN` را برابر آدرس فرانت‌اند خود (مثلاً `https://play.bazifaa.ir`) قرار دهید تا خطای CORS رخ ندهد.
   - دیتابیس را مایگریت کنید (`npm run db:migrate -w @game-platform/server`).
   - پروژه را با PM2 اجرا کنید (`pm2 start npm --name game-platform-api -- run start -w @game-platform/server`).
   - در تنظیمات Nginx سرور، فقط دامنه مربوط به API (مثلاً `api.bazifaa.ir`) را به پورت `8080` پراکسی کنید و نیازی به کانفیگ فایل‌های استاتیک فرانت‌اند نیست.

*(برای استقرار بک‌اند روی هاست‌های ابری مثل لیارا، از `liara deploy` استفاده کنید)*

گرفتن لاگ لیارا liara logs -f --since="10 minutes ago"

اپدیت دیتابیس باید دستور 
npm run db:migrate -w @game-platform/server
liara logs --since "5 minutes ago"
npm --prefix apps/server run db:migrate



## اعمال تغییرات فقط برای آیفون در حالت PWA

در بعضی بخش‌ها لازم است فقط وقتی برنامه روی آیفون یا آیپد به‌صورت PWA اجرا شده است، یعنی کاربر سایت را با گزینه **Add to Home Screen** به صفحه اصلی اضافه کرده و برنامه را از آنجا باز کرده، استایل یا رفتار خاصی اعمال شود.

برای این کار نباید فقط از سایز صفحه یا Safari بودن استفاده کنیم، چون ممکن است روی مرورگر معمولی هم اعمال شود.  
به‌جای آن باید دو شرط را بررسی کنیم:

1. دستگاه iOS باشد: iPhone / iPad / iPod
2. برنامه در حالت standalone یا PWA باز شده باشد

### کد تشخیص iOS PWA

در فایل‌هایی که نیاز به تغییر مخصوص آیفون PWA دارند، می‌توان از این تابع استفاده کرد:
```ts
function isIosPwa() {
  const userAgent = window.navigator.userAgent.toLowerCase();

  const isIosDevice =
/iphone|ipad|ipod/.test(userAgent) ||
(userAgent.includes('macintosh') && navigator.maxTouchPoints > 1);

  const isStandalone =
window.matchMedia('(display-mode: standalone)').matches ||
(window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  return isIosDevice && isStandalone;
}

### نمونه استفاده در React

مثلاً اگر بخواهیم فقط در آیفون PWA یک مقدار padding اضافه کنیم:

tsx
import { useEffect, useState } from 'react';

function isIosPwa() {
  const userAgent = window.navigator.userAgent.toLowerCase();

  const isIosDevice =
/iphone|ipad|ipod/.test(userAgent) ||
(userAgent.includes('macintosh') && navigator.maxTouchPoints > 1);

  const isStandalone =
window.matchMedia('(display-mode: standalone)').matches ||
(window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  return isIosDevice && isStandalone;
}

export function ExampleComponent() {
  const [hasIosPwaStyle, setHasIosPwaStyle] = useState(false);

  useEffect(() => {
setHasIosPwaStyle(isIosPwa());
  }, []);

  return (
<div className={hasIosPwaStyle ? 'pt-[30px]' : ''}>
Content
</div>
  );
}

---

## تغییر اعمال‌شده روی AppHeader

در این پروژه برای اینکه فقط در آیفون PWA، هدر از بالا `30px` فاصله داشته باشد، فایل زیر تغییر داده شده است:

txt
apps/web/src/components/AppHeader.tsx

کد اضافه‌شده:

tsx
import { useEffect, useState } from 'react';

تابع تشخیص:

tsx
function isIosPwa() {
  const userAgent = window.navigator.userAgent.toLowerCase();

  const isIosDevice =
/iphone|ipad|ipod/.test(userAgent) ||
(userAgent.includes('macintosh') && navigator.maxTouchPoints > 1);

  const isStandalone =
window.matchMedia('(display-mode: standalone)').matches ||
(window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  return isIosDevice && isStandalone;
}

داخل کامپوننت `AppHeader`:

tsx
const [hasIosPwaPadding, setHasIosPwaPadding] = useState(false);

useEffect(() => {
  setHasIosPwaPadding(isIosPwa());
}, []);

و کلاس `header` به این شکل تغییر کرده است:

tsx
<header
  className={`fixed left-0 right-0 top-0 z-50 border-b border-ink/10 bg-canvas/80 backdrop-blur ${
hasIosPwaPadding ? 'h-[94px] pt-[30px]' : 'h-16'
  }`}
>

همچنین برای اینکه محتوای داخل هدر همان ارتفاع قبلی را حفظ کند، `nav` به جای `h-full` از `h-16` استفاده می‌کند:

tsx
<nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">

### نتیجه

با این روش:

- در Safari معمولی آیفون تغییری اعمال نمی‌شود.
- در Android تغییری اعمال نمی‌شود.
- در دسکتاپ تغییری اعمال نمی‌شود.
- فقط وقتی برنامه روی iPhone/iPad به‌صورت Add to Home Screen / PWA باز شود، `AppHeader` از بالا `30px` padding می‌گیرد.
هر وقت در دتابیس هواستی تغییراتی بدی از migration  استفاده کن