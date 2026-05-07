// ============================================================
// BIZOS WEBHOOK SERVER
// Nhận tin nhắn từ 4 Facebook Page → lưu Supabase
// ============================================================
const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// ============================================================
// CONFIG — Điền thông tin của bạn vào đây
// ============================================================
const CONFIG = {
  // Supabase
  SUPABASE_URL: 'https://elpyvsytroynnzavjslp.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVscHl2c3l0cm95bm56YXZqc2xwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNTY0NTQsImV4cCI6MjA5MzYzMjQ1NH0.PoR448zgZGDL8tXR07eASmBYaD_MhvrTP0gDHMXiPv0',

  // Webhook verify token
  VERIFY_TOKEN: 'bizos_webhook_2025',

  // 4 Facebook Pages
  PAGES: {
    '61577403680162': {
      name: 'Cổng thanh toán Stripe - DTEcom',
      token: 'EAAWX8ZCvGzAoBRU4INaO3OPQGO1KHpMReqws34qPQOUfFZBfjPxgqgiSTs96iC47BGifSXZBSkXubYAYb5zcllKfDTVZCpQZABEJNAfmq9DR4gwmYSMzW0BgeZBhcf2PQs673YOWPoEGUPEsa7vJqKlWpN7TvjmMEr0tiEd5EMBtomlzRup65DxQKnC83OgmZAmf43pHE2eQJy4mCXvRsVl518vyqcIhUSXUz9pxFtsG10ZD'
    },
    '61586036942909': {
      name: 'Cổng thanh toán DTEcom Việt Nam',
      token: 'EAAWX8ZCvGzAoBRQwYaKw0V4e3XyiOx0krj5NRW406xYPHG8lQ034751SUby6t1YfWABCZBcuTsDjKKcT2ojJivMJm7NxzOWn476dkO5RZC6JVaTcNJmIbBib3N0fZB1fmyHmiKs7GdXIoFuFGuSlzZAaGFd0tuqx9nvIjkJCtqG7uAGytiSHTIExqKtnC7VXZAmFbT97X6K206sSpGq9ZBey0tD9bMbkyGwpYvs0GXVG3sZD'
    },
    '61585879570717': {
      name: 'DT Ecom Payment Services',
      token: 'EAAWX8ZCvGzAoBRUVZB3RFfcvnlUxZASPZBu3xMU22KZCr2Hb80dwtitjQDIoZAw35qj8S7VjKXGZCIpFRjbkisSBIeXnUozOCLE0lm6DXVZB2LEnFOCVE9KpmGmvnadekGEJTFZBWMG5wbjy6jy9E8iSZCU8JZAMnDnknyOUnXYdxZAUeBurHEl9NW1bqVmihsc6fRl6dlzA89e6CeHmhhHf18n7UtjZCLZAHuQGEyKpvCsXNa4l4ZD'
    },
    '100093357796281': {
      name: 'Dịch vụ mở Bank us Chính chủ - DT Ecom',
      token: 'EAAWX8ZCvGzAoBRUDJ56ZBkrivjggFXNtN6iD1TZBRI9t2ciHskakxVxpRPTRLkkZCyu0UinqXFlV4ZBXVHsCc44JZAW8FhcjaPZCHZBldUBEi1b4tfoeACay2qNT4CfAFFlak6ZBHV3SAALvY9UdF6jHmxCeVrxOZCTwmMZBj8PHz2jXN9ov3EsBELYaz11ZBnyqtIB0SaZAwaMphg3o8l2yM9O4CRXRgvUaXKD9RwsgYVPGTdAZDZD'
    }
  },

  // Anthropic AI — lấy key tại https://console.anthropic.com
  ANTHROPIC_KEY: process.env.ANTHROPIC_KEY || 'PASTE_YOUR_KEY_HERE',

  // Auto-reply: true = AI tự reply, false = chỉ lưu vào app
  AUTO_REPLY: false,

  PORT: process.env.PORT || 3000
};

// ============================================================
// SUPABASE CLIENT
// ============================================================
const sb = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/', (req, res) => {
  res.json({
    status: 'BizOS Webhook Server running',
    pages: Object.keys(CONFIG.PAGES).length,
    auto_reply: CONFIG.AUTO_REPLY,
    timestamp: new Date().toISOString()
  });
});

// ============================================================
// FACEBOOK WEBHOOK VERIFY
// ============================================================
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === CONFIG.VERIFY_TOKEN) {
    console.log('✅ Webhook verified by Meta');
    res.status(200).send(challenge);
  } else {
    console.log('❌ Webhook verification failed');
    res.status(403).send('Forbidden');
  }
});

// ============================================================
// FACEBOOK WEBHOOK — NHẬN TIN NHẮN
// ============================================================
app.post('/webhook', async (req, res) => {
  res.status(200).send('OK');

  const body = req.body;
  if (body.object !== 'page') return;

  for (const entry of body.entry || []) {
    const pageId = entry.id;
    const pageConfig = CONFIG.PAGES[pageId];
    if (!pageConfig) continue;

    for (const event of entry.messaging || []) {
      if (event.message?.is_echo) continue;

      const senderId = event.sender?.id;
      const messageText = event.message?.text;
      const timestamp = new Date(event.timestamp).toISOString();

      if (!senderId || !messageText) continue;

      console.log(`📩 [${pageConfig.name}] Tin từ ${senderId}: ${messageText}`);

      try {
        const senderName = await getFBUserName(senderId, pageConfig.token);
        const client = await findOrCreateClient(senderId, senderName, pageId, pageConfig.name);

        await sb.from('conversations').insert({
          client_id: client.id,
          direction: 'in',
          message: messageText,
          platform: `FB - ${pageConfig.name}`,
          sender_id: senderId,
          sent_at: timestamp
        });

        console.log(`✅ Đã lưu tin nhắn của ${senderName}`);

        if (CONFIG.AUTO_REPLY) {
          await autoReplyAI(client, messageText, senderId, pageConfig);
        }

      } catch (err) {
        console.error('❌ Lỗi xử lý tin nhắn:', err.message);
      }
    }
  }
});

// ============================================================
// LẤY TÊN USER TỪ FACEBOOK
// ============================================================
async function getFBUserName(userId, pageToken) {
  try {
    const res = await axios.get(`https://graph.facebook.com/${userId}`, {
      params: { fields: 'name,first_name,last_name', access_token: pageToken },
      timeout: 5000
    });
    return res.data.name || `User_${userId.slice(-6)}`;
  } catch {
    return `User_${userId.slice(-6)}`;
  }
}

// ============================================================
// TÌM HOẶC TẠO CLIENT TRONG SUPABASE
// ============================================================
async function findOrCreateClient(senderId, name, pageId, pageName) {
  const { data: existing } = await sb
    .from('clients')
    .select('*')
    .eq('facebook_id', senderId)
    .single();

  if (existing) return existing;

  const { data: newClient, error } = await sb
    .from('clients')
    .insert({
      full_name: name,
      source: `FB - ${pageName}`,
      stage: 'new',
      facebook_id: senderId,
      page_id: pageId,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw new Error('Không tạo được client: ' + error.message);
  console.log(`👤 Tạo client mới: ${name}`);
  return newClient;
}

// ============================================================
// AI AUTO-REPLY
// ============================================================
async function autoReplyAI(client, userMessage, senderId, pageConfig) {
  try {
    const { data: history } = await sb
      .from('conversations')
      .select('direction, message')
      .eq('client_id', client.id)
      .order('sent_at', { ascending: false })
      .limit(5);

    const convHistory = (history || []).reverse()
      .map(m => `[${m.direction === 'in' ? client.full_name : 'Sales'}]: ${m.message}`)
      .join('\n');

    const systemPrompt = `Bạn là AI sales assistant cho dịch vụ thành lập LLC tại Mỹ cho người Việt.

DỊCH VỤ & GIÁ:
- LLC Only: $199 (3-5 ngày)
- LLC + EIN: $299 (4-6 tuần)
- Full Setup (LLC + EIN + Wise + RelayFi): $499

NHIỆM VỤ: Trả lời ngắn gọn, thân thiện bằng tiếng Việt. Tư vấn đúng nhu cầu, hỏi thêm thông tin nếu cần. Chỉ trả về nội dung tin nhắn.`;

    const userPrompt = convHistory
      ? `Lịch sử:\n${convHistory}\n\nTin mới: ${userMessage}`
      : userMessage;

    const aiRes = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CONFIG.ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      timeout: 15000
    });

    const reply = aiRes.data.content?.[0]?.text?.trim();
    if (!reply) return;

    await axios.post(`https://graph.facebook.com/v19.0/me/messages`, {
      recipient: { id: senderId },
      message: { text: reply }
    }, {
      params: { access_token: pageConfig.token },
      timeout: 10000
    });

    await sb.from('conversations').insert({
      client_id: client.id,
      direction: 'ai',
      message: reply,
      platform: `FB - ${pageConfig.name}`,
      sent_at: new Date().toISOString()
    });

    console.log(`🤖 AI đã reply cho ${client.full_name}`);

  } catch (err) {
    console.error('❌ AI reply lỗi:', err.message);
  }
}

// ============================================================
// API ENDPOINTS cho App HTML gọi
// ============================================================

app.post('/api/send-message', async (req, res) => {
  const { client_id, message } = req.body;
  if (!client_id || !message) return res.status(400).json({ error: 'Thiếu thông tin' });

  try {
    const { data: client } = await sb.from('clients').select('*').eq('id', client_id).single();
    if (!client?.facebook_id) return res.status(400).json({ error: 'Client chưa có facebook_id' });

    const pageConfig = CONFIG.PAGES[client.page_id];
    if (!pageConfig) return res.status(400).json({ error: 'Không tìm thấy page config' });

    await axios.post(`https://graph.facebook.com/v19.0/me/messages`, {
      recipient: { id: client.facebook_id },
      message: { text: message }
    }, {
      params: { access_token: pageConfig.token }
    });

    await sb.from('conversations').insert({
      client_id,
      direction: 'out',
      message,
      platform: `FB - ${pageConfig.name}`,
      sent_at: new Date().toISOString()
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/toggle-auto-reply', (req, res) => {
  CONFIG.AUTO_REPLY = !CONFIG.AUTO_REPLY;
  res.json({ auto_reply: CONFIG.AUTO_REPLY });
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    auto_reply: CONFIG.AUTO_REPLY,
    pages: Object.entries(CONFIG.PAGES).map(([id, p]) => ({
      id,
      name: p.name,
      configured: true
    }))
  });
});

// ============================================================
// START SERVER
// ============================================================
app.listen(CONFIG.PORT, () => {
  console.log(`🚀 BizOS Server chạy tại port ${CONFIG.PORT}`);
  console.log(`📡 Webhook URL: https://YOUR-DOMAIN/webhook`);
  console.log(`🔑 Verify Token: ${CONFIG.VERIFY_TOKEN}`);
});
