# HƯỚNG DẪN DEPLOY BIZOS WEBHOOK SERVER

## BƯỚC 1 — Thêm cột vào Supabase

Chạy SQL này trong Supabase SQL Editor:

```sql
alter table clients add column if not exists facebook_id text;
alter table clients add column if not exists page_id text;
alter table conversations add column if not exists sender_id text;
```

---

## BƯỚC 2 — Điền token vào server.js

Mở file `server.js`, tìm phần PAGES, điền token vào:

```js
PAGES: {
  '61577403680162': { name: 'Page 1', token: 'TOKEN_THẬT_CỦA_PAGE_1' },
  '61586036942909': { name: 'Page 2', token: 'TOKEN_THẬT_CỦA_PAGE_2' },
  '61585879570717': { name: 'Page 3', token: 'TOKEN_THẬT_CỦA_PAGE_3' },
  '100093357796281': { name: 'Page 4', token: 'TOKEN_THẬT_CỦA_PAGE_4' },
}
```

---

## BƯỚC 3 — Deploy lên Railway (miễn phí)

1. Vào https://railway.app → Đăng nhập bằng GitHub
2. Bấm **New Project** → **Deploy from GitHub repo**
3. Upload folder `bizos-server` lên GitHub repo mới
4. Railway tự deploy, lấy URL dạng: `https://bizos-server-xxx.railway.app`

Hoặc dùng **Render.com** (cũng miễn phí):
1. Vào https://render.com → New → Web Service
2. Connect GitHub repo
3. Build Command: `npm install`
4. Start Command: `node server.js`

---

## BƯỚC 4 — Setup Webhook trên Meta

1. Vào https://developers.facebook.com → App của bạn
2. **Messenger** → Settings → Webhooks
3. Callback URL: `https://YOUR-URL.railway.app/webhook`
4. Verify Token: `bizos_webhook_2025`
5. Subscribe events: `messages`, `messaging_postbacks`
6. **Subscribe từng Page** vào webhook này

---

## BƯỚC 5 — Test

Nhắn thử vào 1 trong 4 page → vào app BizOS → kiểm tra Inbox

---

## AUTO-REPLY AI

Mặc định tắt (`AUTO_REPLY: false`) — app chỉ nhận và hiển thị tin.

Muốn bật AI tự reply:
- Điền `ANTHROPIC_KEY` trong server.js
- Đổi `AUTO_REPLY: true`

---

## VERIFY TOKEN

Khi setup webhook trên Meta, dùng token này:
```
bizos_webhook_2025
```
