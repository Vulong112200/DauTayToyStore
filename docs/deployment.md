# Hướng dẫn Deploy: Render (API) + Vercel (Web)

Tài liệu này hướng dẫn từng bước deploy production cho DauTayToy Store:
- **Backend** (`apps/api`, NestJS) → **Render** (Docker Web Service)
- **Frontend** (`apps/web`, Next.js) → **Vercel**
- Database: **Supabase** (Postgres) — đã cấu hình sẵn theo `docs/architecture.md`
- Redis: **Upstash** — đã cấu hình sẵn
- Media storage: **Cloudflare R2** — đã cấu hình sẵn

> Repo đã có sẵn `apps/api/Dockerfile` và `apps/web/Dockerfile` xử lý đúng cấu trúc monorepo
> (copy `packages/contracts`, `packages/config-ts` vào build context). Render sẽ dùng
> `apps/api/Dockerfile` trực tiếp. **Vercel không dùng Dockerfile** — nó tự build Next.js bằng
> buildpack riêng, nên `apps/web/Dockerfile` chỉ có tác dụng nếu bạn tự self-host bằng Docker ở
> nơi khác (không dùng trong hướng dẫn này).

---

## 0. Chuẩn bị trước khi deploy

Kiểm tra bạn đã có sẵn (nếu chưa, xem `docs/architecture.md` phần Supabase):

- [ ] Supabase project — cần **2 connection string**: pooled (`DATABASE_URL`, port 6543) và direct (`DIRECT_URL`, port 5432)
- [ ] Upstash Redis — 1 connection string (`REDIS_URL`, dạng `rediss://...`)
- [ ] Cloudflare R2 bucket — `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` (domain public dạng `pub-xxxx.r2.dev`, **không phải** endpoint `*.r2.cloudflarestorage.com`)
- [ ] Resend API key (tuỳ chọn — nếu muốn email quên mật khẩu thực sự gửi được) — tạo tại
  [resend.com/api-keys](https://resend.com/api-keys), điền `RESEND_API_KEY`/`EMAIL_FROM`. Để trống
  vẫn deploy được bình thường, chỉ là email sẽ không gửi thật (chỉ log cảnh báo)
- [ ] VNPay sandbox/merchant credentials (tuỳ chọn — nếu muốn checkout bằng VNPay hoạt động
  thật) — đăng ký tại [sandbox.vnpayment.vn/devreg](https://sandbox.vnpayment.vn/devreg/), điền
  `VNPAY_TMN_CODE`/`VNPAY_HASH_SECRET`. `VNPAY_RETURN_URL` phải là URL public của chính API này
  (không phải frontend) + `/api/payments/vnpay/return`. Để trống vẫn deploy được bình thường,
  COD checkout không bị ảnh hưởng — chỉ riêng việc chọn VNPay lúc checkout sẽ báo lỗi rõ ràng.
  Sau khi có credentials, còn cần đăng ký thêm URL IPN (`<API public URL>/api/payments/vnpay/ipn`)
  trong dashboard merchant của VNPay — bước này không thể làm qua biến môi trường
- [ ] MoMo merchant credentials (tuỳ chọn — nếu muốn checkout bằng MoMo hoạt động thật) — MoMo
  **không** công khai sẵn tài khoản test dùng chung như một số cổng khác, phải đăng ký riêng tại
  [business.momo.vn](https://business.momo.vn) hoặc email `merchant.care@momo.vn` để lấy
  `MOMO_PARTNER_CODE`/`MOMO_ACCESS_KEY`/`MOMO_SECRET_KEY`. Khác với VNPay, `MOMO_IPN_URL` gửi kèm
  mỗi request chứ không đăng ký riêng trên dashboard — tiện hơn khi deploy, nhưng cũng có nghĩa
  MoMo không báo lỗi ngay nếu URL sai/không truy cập được (chỉ lặng lẽ gửi IPN thất bại), nên cần
  double-check `MOMO_IPN_URL` là domain public, có TLS hợp lệ, trước giao dịch sandbox đầu tiên.
  Để trống vẫn deploy được bình thường, COD/VNPay không bị ảnh hưởng.
- [ ] Google OAuth Client ID (tuỳ chọn) — **lưu ý quan trọng**: backend xác thực Google bằng ID
  token (`POST /api/auth/google`, `google-auth-library`'s `verifyIdToken`), không dùng flow
  redirect OAuth cổ điển — nên chỉ `GOOGLE_CLIENT_ID` thực sự được code đọc (dùng làm `audience`).
  `GOOGLE_CLIENT_SECRET`/`GOOGLE_CALLBACK_URL` tồn tại trong config nhưng **không được code nào
  đọc** — set hay không cũng không ảnh hưởng gì. Quan trọng hơn: **`apps/web` hiện chưa có nút/UI
  đăng nhập Google nào** (trang login chỉ có email/mật khẩu) — endpoint backend đã sẵn sàng
  (cho mobile app tương lai chẳng hạn) nhưng chưa có cách nào để người dùng web thực sự dùng tính
  năng này. Có thể bỏ qua toàn bộ mục này khi deploy — không có gì bị ảnh hưởng
- [ ] 2 chuỗi bí mật JWT ngẫu nhiên, tối thiểu 32 ký tự mỗi chuỗi (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`). Tạo nhanh:
  ```bash
  openssl rand -base64 48
  ```

---

## 1. Deploy Backend (`apps/api`) lên Render

### 1.1. Tạo Web Service

1. Vào [Render Dashboard](https://dashboard.render.com) → **New +** → **Web Service**
2. Connect GitHub repo `Vulong112200/DauTayToyStore`
3. Cấu hình cơ bản:

| Trường | Giá trị |
|---|---|
| **Name** | `dautaytoy-api` (tuỳ chọn) |
| **Region** | Singapore (gần Việt Nam nhất) |
| **Branch** | `main` |
| **Root Directory** | *để trống* (quan trọng — xem giải thích bên dưới) |
| **Runtime** | **Docker** |
| **Dockerfile Path** | `apps/api/Dockerfile` |
| **Docker Build Context Directory** | `.` (dấu chấm — thư mục gốc repo) |
| **Instance Type** | Free (test) hoặc Starter trở lên (production) |

> **Vì sao Root Directory để trống nhưng Dockerfile Path lại trỏ vào `apps/api/`?**
> `apps/api/Dockerfile` dùng `COPY pnpm-workspace.yaml`, `COPY packages/contracts` ... — tức là
> nó cần build context là **toàn bộ repo gốc**, không phải riêng `apps/api`. Nếu set Root
> Directory = `apps/api`, Docker sẽ không thấy được `packages/contracts` để copy vào và build sẽ
> lỗi "no such file or directory". Vì vậy: Root Directory để trống (= repo root), chỉ định riêng
> `Dockerfile Path` để Render biết dùng Dockerfile nào.

### 1.2. Cấu hình Environment Variables

Vào tab **Environment** của service, thêm từng biến sau (tất cả **bắt buộc** trừ khi ghi "tuỳ chọn"):

```bash
NODE_ENV=production
PORT=4000                          # Render tự inject PORT riêng, biến này chỉ là fallback — không xoá
API_PREFIX=api

# Supabase — pooled connection cho app chạy (port 6543, PgBouncer transaction mode)
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1

# Supabase — direct connection, chỉ Prisma migrate dùng (port 5432)
DIRECT_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres

# Upstash Redis
REDIS_URL=rediss://default:<password>@<endpoint>.upstash.io:6379

# JWT — dùng openssl rand -base64 48 để tạo, PHẢI khác nhau giữa access/refresh
JWT_ACCESS_SECRET=<chuỗi ngẫu nhiên ít nhất 32 ký tự>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=<chuỗi ngẫu nhiên khác, ít nhất 32 ký tự>
JWT_REFRESH_EXPIRES_IN=30d

# Google OAuth (tuỳ chọn, và hiện chưa có UI nào ở web dùng tới — xem ghi chú ở mục 0).
# Chỉ GOOGLE_CLIENT_ID thực sự được code đọc; 2 biến dưới tồn tại trong config nhưng không
# được dùng ở đâu cả (flow thật là verify ID token, không phải redirect OAuth) — có thể để trống
# cả 3, hoặc bỏ hẳn 2 dòng dưới nếu muốn dọn dẹp.
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=

# CORS — điền URL Vercel THẬT sau khi deploy xong bước 2 (xem mục 3.1)
CORS_ORIGIN=https://your-app.vercel.app

# Cloudflare R2
R2_ACCOUNT_ID=<account id>
R2_ACCESS_KEY_ID=<access key>
R2_SECRET_ACCESS_KEY=<secret key>
R2_BUCKET_NAME=dautaytoy-media
R2_PUBLIC_URL=https://pub-xxxxxxxxxxxx.r2.dev

# Email (Resend) — tuỳ chọn, để trống thì app vẫn chạy bình thường, chỉ là
# email quên mật khẩu sẽ không thực sự được gửi (chỉ log cảnh báo)
RESEND_API_KEY=<api key lấy từ resend.com/api-keys>
EMAIL_FROM=DauTayToy Store <no-reply@your-domain.com>

# VNPay payment gateway — tuỳ chọn, để trống thì COD checkout vẫn chạy bình thường,
# chỉ riêng việc chọn VNPay lúc checkout sẽ báo lỗi rõ ràng thay vì gửi thất bại âm thầm
VNPAY_TMN_CODE=<TMN code lấy từ sandbox.vnpayment.vn/devreg>
VNPAY_HASH_SECRET=<hash secret lấy từ sandbox.vnpayment.vn/devreg>
VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=https://dautaytoy-api.onrender.com/api/payments/vnpay/return

# MoMo payment gateway — tuỳ chọn, để trống thì COD/VNPay checkout vẫn chạy bình thường,
# chỉ riêng việc chọn MoMo lúc checkout sẽ báo lỗi rõ ràng thay vì gửi thất bại âm thầm
MOMO_PARTNER_CODE=<partnerCode lấy từ business.momo.vn hoặc merchant.care@momo.vn>
MOMO_ACCESS_KEY=<accessKey tương ứng>
MOMO_SECRET_KEY=<secretKey tương ứng>
MOMO_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api/create
MOMO_REDIRECT_URL=https://dautaytoy-api.onrender.com/api/payments/momo/return
MOMO_IPN_URL=https://dautaytoy-api.onrender.com/api/payments/momo/ipn

# Rate limiting (tuỳ chọn, có default hợp lý)
THROTTLE_TTL_MS=60000
THROTTLE_LIMIT=100
```

> **Lưu ý về `PORT`**: Render tự động inject biến `PORT` runtime của riêng nó (thường không phải
> 4000) — code (`main.ts`) đọc `process.env.PORT` nên tự động hoạt động đúng, không cần chỉnh
> code. Bạn vẫn nên set `PORT=4000` trong Environment Variables cho nhất quán/fallback local,
> nhưng Render sẽ override nó khi chạy.

> **Lưu ý bảo mật**: KHÔNG copy nguyên connection string demo ở trên — đây chỉ là mẫu định dạng.
> Lấy connection string thật từ Supabase Dashboard → Project Settings → Database, và Upstash
> Console → Redis database → REST API / Connection string.

### 1.3. Health Check

Trong tab **Settings** → **Health Check Path**, điền:
```
/api/health
```
(Route này đã có sẵn, kiểm tra Postgres còn sống + memory heap — Render dùng nó để biết service
có "healthy" hay không trước khi route traffic vào. **Lưu ý**: route này KHÔNG kiểm tra Redis —
nếu `REDIS_URL` sai/Upstash sập, `/api/health` vẫn trả `status: ok` bình thường, chỉ có
`EmailProcessor`/BullMQ âm thầm không hoạt động. Nếu nghi ngờ Redis có vấn đề, kiểm tra riêng qua
Upstash Console hoặc thử trigger một email quên-mật-khẩu và xem log.)

### 1.4. Chạy Prisma migration lần đầu

Sau khi service build xong và chạy được (có thể sẽ lỗi 500 ở các route cần DB nếu schema chưa được migrate — đây là dự kiến), chạy migration một trong hai cách:

**Cách A — Render Shell (khuyến nghị, đơn giản nhất):**
1. Vào service trên Render Dashboard → tab **Shell**
2. Chạy:
   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```

**Cách B — Từ máy local, trỏ vào Supabase production:**
```bash
cd apps/api
# đảm bảo .env đang trỏ đúng DATABASE_URL/DIRECT_URL production
pnpm exec prisma migrate deploy
pnpm exec prisma db seed
```

> `prisma db seed` tạo tài khoản admin mặc định (`admin@dautaytoystore.vn` / `Admin@123456`) —
> **đổi mật khẩu này ngay sau khi seed xong trên production**, đừng để mặc định.
>
> Seed cũng tạo sẵn một **catalog demo** (nhiều sản phẩm/danh mục/thương hiệu + bài blog) và
> **upload ảnh demo lên R2** qua `seedDemoImages()` (tạo luôn bản ghi `MediaAsset`, giống hệt luồng
> admin upload), rồi gán URL R2 cho sản phẩm/blog. Nếu R2 chưa cấu hình (thiếu `R2_*`), nó tự
> fallback về đường dẫn ảnh nội bộ `/demo/...` trong `apps/web/public` — seed vẫn chạy được, chỉ là
> ảnh trỏ nội bộ thay vì R2. ⇒ Nếu muốn ảnh demo nằm trên R2 như production, đảm bảo các biến `R2_*`
> đã có mặt ở nơi chạy seed (Render Shell đã có sẵn env; nếu chạy từ máy local thì `apps/api/.env`
> phải có `R2_*`).

### 1.5. Xác nhận API đã chạy

```bash
curl https://dautaytoy-api.onrender.com/api/health
```
Kỳ vọng: `{"status":"ok","info":{"database":{"status":"up"},"memory_heap":{"status":"up"}},...}`

Swagger docs: `https://dautaytoy-api.onrender.com/api/docs`

> **Free tier Render**: service sẽ "ngủ" sau ~15 phút không có traffic, request đầu tiên sau đó
> mất 30-60s để "đánh thức" (cold start). Bình thường cho môi trường test; với production thật
> nên nâng lên gói trả phí (Starter trở lên) để tránh cold start.

---

## 2. Deploy Frontend (`apps/web`) lên Vercel

### 2.1. Import Project

1. Vào [Vercel Dashboard](https://vercel.com/new) → **Import Git Repository**
2. Chọn repo `Vulong112200/DauTayToyStore`
3. Ở màn hình cấu hình project, set:

| Trường | Giá trị |
|---|---|
| **Framework Preset** | Next.js (Vercel tự nhận diện) |
| **Root Directory** | `apps/web` (bấm **Edit** để chọn) |

### 2.2. Override Build & Install Command (bắt buộc — vì đây là monorepo Turborepo)

Đây là bước **quan trọng nhất, dễ bị bỏ sót nhất**: nếu chỉ để Vercel tự chạy `next build` mặc
định trong `apps/web`, nó sẽ lỗi vì `@repo/contracts` chưa được compile sang `dist/` (`apps/web`
import `@repo/contracts` từ `dist`, không phải `src` — xem `CLAUDE.md`). Cần override để Turborepo
build `@repo/contracts` trước:

Trong màn hình cấu hình project (hoặc sau đó ở **Project Settings → Build and Deployment**), bật
"Override" và điền:

| Trường | Lệnh override |
|---|---|
| **Install Command** | `cd ../.. && pnpm install --frozen-lockfile` |
| **Build Command** | `cd ../.. && pnpm turbo run build --filter=web` |
| **Output Directory** | `.next` (giữ mặc định, tương đối so với Root Directory) |

> Vì Root Directory đã set = `apps/web`, mọi lệnh chạy trong context đó — `cd ../..` đưa lệnh về
> lại thư mục gốc repo để `pnpm`/`turbo` thấy được toàn bộ workspace, sau đó `turbo run build
> --filter=web` tự động build `@repo/contracts`/`@repo/ui` trước (nhờ `turbo.json`'s
> `dependsOn: ["^build"]`) rồi mới build `web`.

### 2.3. Environment Variables

Vào **Project Settings → Environment Variables**, thêm (áp dụng cho cả Production/Preview/Development tuỳ nhu cầu):

```bash
NEXT_PUBLIC_API_URL=https://dautaytoystore.onrender.com/api
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<google client id, để trống nếu chưa dùng>
```

> **Đây là biến build-time** (Next.js inline `NEXT_PUBLIC_*` vào bundle lúc build, không đọc lại
> lúc runtime) — phải set **trước khi bấm Deploy lần đầu**, và **redeploy lại** (Deployments →
> nút "..." → Redeploy) mỗi khi bạn đổi giá trị các biến này sau này.

### 2.4. Deploy

Bấm **Deploy**. Sau khi xong, Vercel cấp domain dạng `https://your-app.vercel.app` — đây chính
là giá trị cần điền vào `CORS_ORIGIN` ở bước 1.2 (Render) và `NEXT_PUBLIC_SITE_URL` ở trên.

---

## 3. Kết nối 2 bên (bước dễ quên nhất)

Vì Render và Vercel đều cấp domain **sau khi** deploy, bạn cần quay lại chỉnh 2 chỗ:

### 3.1. Cập nhật `CORS_ORIGIN` trên Render

Vào Render service → Environment → sửa `CORS_ORIGIN` thành domain Vercel thật:
```
CORS_ORIGIN=https://your-app.vercel.app
```
Nếu có nhiều domain cần cho phép (production + preview deployments của Vercel), phân tách bằng dấu phẩy:
```
CORS_ORIGIN=https://your-app.vercel.app,https://your-app-git-main-yourteam.vercel.app
```
(code đã hỗ trợ sẵn — `main.ts` gọi `corsOrigin.split(',')`). Sau khi sửa, Render tự redeploy.

### 3.2. Cập nhật `NEXT_PUBLIC_API_URL` trên Vercel (nếu Render đổi domain)

Nếu bạn đặt tên service Render khác, hoặc dùng custom domain sau này, cập nhật lại
`NEXT_PUBLIC_API_URL` trên Vercel rồi **Redeploy**.

### 3.3. Google OAuth

Không cần bước này để deploy — như đã ghi ở mục 0, `apps/web` hiện chưa có UI đăng nhập Google
nào, và flow thật (verify ID token) không dùng redirect URI. Nếu sau này có nhu cầu thêm nút
đăng nhập Google trên web (hoặc mobile app), lúc đó chỉ cần vào
[Google Cloud Console](https://console.cloud.google.com/apis/credentials) → OAuth Client → thêm
**Authorized JavaScript origins**: domain thật của web — không cần khai báo redirect URI nào.

---

## 4. Checklist kiểm tra sau khi deploy

```bash
# 1. API sống, kết nối được DB + Redis
curl https://dautaytoy-api.onrender.com/api/health

# 2. Web load được, gọi đúng API
# Mở https://your-app.vercel.app trong trình duyệt, kiểm tra Network tab
# xem request tới /api/... có trỏ đúng domain Render không

# 3. Đăng nhập admin (sau khi đã đổi mật khẩu mặc định)
curl -X POST https://dautaytoy-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@dautaytoystore.vn","password":"<mật khẩu mới>"}'

# 4. CORS đúng — mở DevTools Console trên trang web, không có lỗi
#    "blocked by CORS policy" khi gọi API

# 5. Upload ảnh (nếu test /admin/media) — xác nhận URL trả về
#    là domain R2_PUBLIC_URL và ảnh xem được (không phải endpoint r2.cloudflarestorage.com)
```

- [ ] `/api/health` trả `status: ok`
- [ ] Trang chủ Vercel load được, không lỗi CORS trong console
- [ ] Đăng nhập admin thành công, đã đổi mật khẩu mặc định
- [ ] Upload ảnh trong `/admin/media` thành công, ảnh xem được qua URL trả về
- [ ] Đặt hàng thử (checkout) thành công end-to-end

---

## 5. Ghi chú vận hành

- **Redeploy sau khi đổi env var**: Render tự động redeploy khi bạn sửa Environment Variables.
  Vercel thì **không tự động** với biến `NEXT_PUBLIC_*` đã deploy trước đó — phải bấm Redeploy
  thủ công (Deployments tab → "..." → Redeploy) để build lại với giá trị mới.
- **Database migration cho các thay đổi sau này**: mỗi khi có `prisma/migrations/` mới trong
  repo, chạy lại `npx prisma migrate deploy` trên Render Shell (không phải `migrate dev` —
  lệnh đó tương tác và không dùng được trong CI/production).
- **Custom domain**: cả Render và Vercel đều hỗ trợ gắn domain riêng miễn phí (Settings →
  Domains). Sau khi gắn, nhớ cập nhật lại `CORS_ORIGIN`/`NEXT_PUBLIC_API_URL`/
  `NEXT_PUBLIC_SITE_URL`/Google OAuth redirect URIs theo domain mới.
- **`packages/ui`**: hiện chưa được `apps/web` import trực tiếp — nếu sau này bạn thêm
  `@repo/ui` làm dependency thật của `apps/web`, cần thêm `packages/ui` vào phần `COPY` của
  `apps/api/Dockerfile`/`apps/web/Dockerfile` nếu build lại bằng Docker ở nơi khác (Vercel build
  qua `turbo run build` nên đã tự xử lý đúng, không cần sửa).
