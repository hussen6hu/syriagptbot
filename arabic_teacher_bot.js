const fs = require('fs');
const path = require('path');
const http = require('http');
const fetch = require('node-fetch');
const crypto = require('crypto');

// ======= الإعدادات =======
const TELEGRAM_TOKEN = '8939193095:AAHgd-tLExPzfCJYWHAxki-dbons3rnvjPc';
const SHAM_CASH_PHONE = 'd90f5c756d29a33a645cf1c3a2a0cd1f';
const SUBSCRIPTION_PRICE_LIRA = 100; // 100 ل.س (عملة سورية جديدة) ≈ 5$
const TRIAL_COUNT = 3;
const ADMIN_USER_ID = 5513754275;

const OPENROUTER_API_KEY = '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';

const DB_PATH = './users_db.json';
const BOT_USERNAME = 'ArabicTeacher1Bot';

// ======= قاعدة البيانات =======
let usersDB = {};
if (fs.existsSync(DB_PATH)) {
  try {
    usersDB = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch(e) { usersDB = {}; }
}

function saveDB() {
  fs.writeFileSync(DB_PATH, JSON.stringify(usersDB, null, 2));
}

function getUser(userId) {
  if (!usersDB[userId]) {
    usersDB[userId] = {
      id: userId,
      trialCount: 0,
      subscriptionEnd: null,
      registeredAt: new Date().toISOString()
    };
    saveDB();
  }
  return usersDB[userId];
}

function canUse(userId) {
  if (Number(userId) === ADMIN_USER_ID) return true;
  const u = getUser(userId);
  if (u.subscriptionEnd && new Date(u.subscriptionEnd) > new Date()) return true;
  if (u.trialCount < TRIAL_COUNT) return true;
  return false;
}

function useCredit(userId) {
  if (Number(userId) === ADMIN_USER_ID) return true;
  const u = getUser(userId);
  if (u.subscriptionEnd && new Date(u.subscriptionEnd) > new Date()) return true;
  if (u.trialCount < TRIAL_COUNT) {
    u.trialCount++;
    saveDB();
    return true;
  }
  return false;
}

function activateSubscription(userId, days = 30) {
  const u = getUser(userId);
  const now = new Date();
  const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  u.subscriptionEnd = end.toISOString();
  saveDB();
  return end;
}

// ======= OpenRouter API =======
async function askAI(prompt) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://t.me/ArabicTeacher1Bot',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-exp:free',
      messages: [
        { role: 'system', content: 'أنت معلم لغة عربية خبير. مهمتك إعراب الجمل العربية إعراباً كاملاً. أعرِب كل كلمة في الجملة مع ذكر نوع الكلمة وعلامة الإعراب. كن دقيقاً ومفصلاً.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1000,
    })
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return data.choices[0].message.content;
}

// ======= دوال البوت =======
function sendMessage(chatId, text, opts = {}) {
  const params = new URLSearchParams();
  params.append('chat_id', chatId);
  params.append('text', text);
  params.append('parse_mode', 'HTML');
  if (opts.replyMarkup) params.append('reply_markup', JSON.stringify(opts.replyMarkup));
  if (opts.replyTo) params.append('reply_to_message_id', opts.replyTo);
  return fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  }).then(r => r.json());
}

function sendPhoto(chatId, photo, caption) {
  // Not implemented for simplicity - send as text instead
  return sendMessage(chatId, caption || '📸 صورة الإيصال');
}

function answerCallback(queryId, text) {
  const params = new URLSearchParams();
  params.append('callback_query_id', queryId);
  params.append('text', text || 'تم');
  return fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  }).then(r => r.json());
}

function editMessageText(chatId, msgId, text, markup) {
  const params = new URLSearchParams();
  params.append('chat_id', chatId);
  params.append('message_id', msgId);
  params.append('text', text);
  params.append('parse_mode', 'HTML');
  if (markup) params.append('reply_markup', JSON.stringify(markup));
  return fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  }).then(r => r.json());
}

// ======= معالجة الأوامر =======
async function handleUpdate(update) {
  try {
    // رسالة نصية
    if (update.message) {
      const msg = update.message;
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const text = (msg.text || '').trim();
      const entities = msg.entities || [];

      getUser(userId);

      // أمر /start
      if (text === '/start') {
        const u = getUser(userId);
        let statusText = '';
        if (Number(userId) === ADMIN_USER_ID) {
          statusText = '👑 أنت مشرف البوت — إعراب غير محدود';
        } else if (u.subscriptionEnd && new Date(u.subscriptionEnd) > new Date()) {
          statusText = `✅ اشتراكك مفعل حتى ${new Date(u.subscriptionEnd).toLocaleDateString('ar-IQ')}`;
        } else {
          statusText = `💚 متبقي لك ${TRIAL_COUNT - u.trialCount} إعرابات مجانية`;
        }

        const welcome = `👋 مرحباً بك في بوت <b>مدرس اللغة العربية</b>! 🎓

📌 أرسل لي أي جملة عربية وسأقوم بإعرابها كلمة كلمة.

${statusText}

💰 الاشتراك الشهري: ${SUBSCRIPTION_PRICE_LIRA.toLocaleString()} ل.س (إعراب غير محدود لمدة 30 يوماً)
📲 للاشتراك: أرسل /subscribe`;

        const keyboard = {
          inline_keyboard: [
            [{ text: '💚 تجربة إعراب', callback_data: 'try' }],
            [{ text: '💰 اشتراك شهري', callback_data: 'subscribe' }],
            [{ text: '📊 حسابي', callback_data: 'status' }]
          ]
        };
        if (Number(userId) === ADMIN_USER_ID) {
          keyboard.inline_keyboard.push([{ text: '⚙️ لوحة المشرف', callback_data: 'admin' }]);
        }
        return sendMessage(chatId, welcome, { replyMarkup: keyboard });
      }

      // أمر /subscribe
      if (text === '/subscribe') {
        return subscribeFlow(chatId, userId);
      }

      // أمر /confirm
      if (text === '/confirm') {
        return sendMessage(chatId, `📸 أرسل صورة إيصال تحويل ${SUBSCRIPTION_PRICE_LIRA.toLocaleString()} ل.س إلى رقم شام كاش:\n\n<b>${SHAM_CASH_PHONE}</b>\n\nبعد إرسال الصورة، سيقوم المشرف بتفعيل اشتراكك.`);
      }

      // أمر /status
      if (text === '/status') {
        return showStatus(chatId, userId);
      }

      // أمر /admin
      if (text === '/admin' && Number(userId) === ADMIN_USER_ID) {
        return adminPanel(chatId);
      }

      // إذا كانت صورة
      if (msg.photo) {
        // صورة إيصال — إرسالها للمشرف
        const caption = msg.caption || '';
        if (caption.toLowerCase().includes('شام') || caption.toLowerCase().includes('confirm')) {
          // أرسل للمشرف
          const photoData = msg.photo[msg.photo.length - 1];
          const adminKeyboard = {
            inline_keyboard: [[
              { text: '✅ تفعيل الاشتراك', callback_data: `activate_${userId}` }
            ]]
          };
          await sendMessage(ADMIN_USER_ID, 
            `📸 <b>طلب اشتراك جديد</b>\n👤 المستخدم: ${userId}\n🏷️ ${msg.from.first_name || ''} ${msg.from.last_name || ''}\n💳 المبلغ: ${SUBSCRIPTION_PRICE_LIRA.toLocaleString()} ل.س`,
            { replyMarkup: adminKeyboard }
          );
          return sendMessage(chatId, '✅ تم إرسال طلب الاشتراك للمشرف. سيتم تفعيله قريباً.');
        }
        return sendMessage(chatId, '⚠️ أرسل الجملة التي تريد إعرابها.');
      }

      // نص عادي — إعراب
      if (text && !text.startsWith('/')) {
        if (!canUse(userId)) {
          const kb = { inline_keyboard: [[{ text: '💰 اشتراك شهري', callback_data: 'subscribe' }]] };
          return sendMessage(chatId, `⚠️ انتهت الإعرابات المجانية.\n\nاشترك الآن: /subscribe`, { replyMarkup: kb });
        }

        const loading = await sendMessage(chatId, '🔍 جاري إعراب الجملة...');
        try {
          const answer = await askAI(`أعرِب هذه الجملة إعراباً كاملاً:\n"${text}"`);
          useCredit(userId);
          
          // حذف رسالة التحميل
          try {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/deleteMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId, message_id: loading.result.message_id })
            });
          } catch(e) {}

          const u = getUser(userId);
          let footer = '';
          if (Number(userId) === ADMIN_USER_ID) footer = '\n\n👑 مشرف';
          else if (u.subscriptionEnd && new Date(u.subscriptionEnd) > new Date()) footer = `\n\n📅 اشتراك ساري حتى ${new Date(u.subscriptionEnd).toLocaleDateString('ar-IQ')}`;
          else footer = `\n\n💚 متبقي ${TRIAL_COUNT - u.trialCount} إعرابات مجانية`;

          return sendMessage(chatId, `📖 <b>الإعراب:</b>\n\n${answer}${footer}`);
        } catch (err) {
          try {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/deleteMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId, message_id: loading.result.message_id })
            });
          } catch(e) {}
          return sendMessage(chatId, `❌ خطأ: ${err.message}\nيرجى المحاولة لاحقاً.`);
        }
      }
    }

    // Callback query
    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message.chat.id;
      const userId = cb.from.id;
      const msgId = cb.message.message_id;
      const data = cb.data;

      await answerCallback(cb.id);

      if (data === 'try') {
        return sendMessage(chatId, '📝 أرسل لي جملة عربية وسأقوم بإعرابها فوراً.');
      }

      if (data === 'subscribe') {
        return subscribeFlow(chatId, userId);
      }

      if (data === 'status') {
        return showStatus(chatId, userId);
      }

      if (data === 'admin' && Number(userId) === ADMIN_USER_ID) {
        return adminPanel(chatId);
      }

      if (data.startsWith('activate_')) {
        if (Number(userId) !== ADMIN_USER_ID) {
          return sendMessage(chatId, '⚠️ فقط المشرف يمكنه التفعيل.');
        }
        const targetUserId = data.replace('activate_', '');
        const end = activateSubscription(targetUserId);
        await editMessageText(chatId, msgId, 
          `✅ <b>تم تفعيل الاشتراك</b>\n👤 المستخدم: ${targetUserId}\n📅 ساري حتى: ${end.toLocaleDateString('ar-IQ')}\n🎉 تم منح 30 يوماً من الإعراب غير المحدود.`,
          { inline_keyboard: [] }
        );
        // أبلغ المستخدم
        await sendMessage(targetUserId, `🎉 <b>تم تفعيل اشتراكك!</b>\n\nالآن يمكنك إرسال جمل للإعراب بدون حدود لمدة 30 يوماً.\n\n📅 ينتهي في: ${end.toLocaleDateString('ar-IQ')}`);
        return;
      }

      if (data.startsWith('deactivate_')) {
        if (Number(userId) !== ADMIN_USER_ID) return;
        const targetUserId = data.replace('deactivate_', '');
        const u = getUser(targetUserId);
        u.subscriptionEnd = null;
        saveDB();
        await editMessageText(chatId, msgId, 
          `✅ تم إلغاء اشتراك المستخدم ${targetUserId}`,
          { inline_keyboard: [] }
        );
        return;
      }

      if (data === 'list_users') {
        if (Number(userId) !== ADMIN_USER_ID) return;
        const userIds = Object.keys(usersDB);
        let msg = `👥 <b>جميع المستخدمين (${userIds.length})</b>\n\n`;
        const activeUsers = userIds.filter(id => {
          const u = usersDB[id];
          return u.subscriptionEnd && new Date(u.subscriptionEnd) > new Date();
        });
        msg += `✅ اشتراك نشط: ${activeUsers.length}\n`;
        msg += `💚 تجربة فقط: ${userIds.length - activeUsers.length}\n\n`;
        activeUsers.slice(0, 20).forEach(id => {
          const u = usersDB[id];
          msg += `👤 ${id} — حتى ${new Date(u.subscriptionEnd).toLocaleDateString('ar-IQ')}\n`;
        });
        return sendMessage(chatId, msg);
      }
    }

  } catch (err) {
    console.error('Error handling update:', err);
  }
}

// ======= دوال مساعدة =======
async function subscribeFlow(chatId, userId) {
  const u = getUser(userId);
  if (u.subscriptionEnd && new Date(u.subscriptionEnd) > new Date()) {
    return sendMessage(chatId, `✅ اشتراكك مفعل حتى ${new Date(u.subscriptionEnd).toLocaleDateString('ar-IQ')}.`);
  }

  const msg = `💰 <b>اشتراك مدرس اللغة العربية</b>

📌 اشتراك شهري: ${SUBSCRIPTION_PRICE_LIRA.toLocaleString()} ل.س
🎯 إعراب غير محدود لمدة 30 يوماً

📲 <b>للدفع عبر شام كاش:</b>
حول المبلغ إلى الرقم التالي:
<b>${SHAM_CASH_PHONE}</b>

بعد التحويل، أرسل /confirm ثم ارفع صورة الإيصال.`;

  const keyboard = {
    inline_keyboard: [[
      { text: '📸 إرسال الإيصال', callback_data: 'try' }
    ]]
  };
  return sendMessage(chatId, msg, { replyMarkup: keyboard });
}

async function showStatus(chatId, userId) {
  const u = getUser(userId);
  let msg = '';
  if (Number(userId) === ADMIN_USER_ID) {
    msg = `👑 <b>أنت المشرف</b>\n\nلديك إعراب غير محدود 🌟`;
  } else if (u.subscriptionEnd && new Date(u.subscriptionEnd) > new Date()) {
    const remaining = Math.ceil((new Date(u.subscriptionEnd) - new Date()) / (1000*60*60*24));
    msg = `✅ <b>اشتراكك نشط</b>\n📅 ينتهي بعد ${remaining} يوم\n📆 ${new Date(u.subscriptionEnd).toLocaleDateString('ar-IQ')}`;
  } else {
    msg = `💚 <b>حساب تجريبي</b>\n📊 استخدمت ${u.trialCount} من ${TRIAL_COUNT} إعرابات مجانية`;
    if (u.trialCount >= TRIAL_COUNT) {
      msg += '\n\n⚠️ انتهت الإعرابات المجانية.\nاشترك الآن: /subscribe';
    }
  }
  return sendMessage(chatId, msg);
}

async function adminPanel(chatId) {
  const keyboard = {
    inline_keyboard: [
      [{ text: '👥 عرض المستخدمين', callback_data: 'list_users' }],
      [{ text: '📊 إحصائيات', callback_data: 'admin' }]
    ]
  };
  return sendMessage(chatId, `⚙️ <b>لوحة المشرف</b>\n\nاختر أحد الخيارات:`, { replyMarkup: keyboard });
}

// ======= HTTP server for Render =======
const PORT = process.env.PORT || 10000;
const server = http.createServer((req, res) => {
  if (req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h1>🤖 مدرس اللغة العربية</h1><p>البوت شغال ✅</p><p>@ArabicTeacher1Bot</p>`);
  } else {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const update = JSON.parse(body);
        handleUpdate(update);
      } catch(e) {}
      res.writeHead(200);
      res.end('OK');
    });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Bot: @${BOT_USERNAME}`);
});

// ======= Polling: سحب التحديثات =======
let lastOffset = 0;
async function pollUpdates() {
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?offset=${lastOffset + 1}&timeout=30`);
    const data = await res.json();
    if (data.ok && data.result) {
      for (const update of data.result) {
        lastOffset = update.update_id;
        handleUpdate(update).catch(err => console.error('Update error:', err));
      }
    }
  } catch (err) {
    console.error('Polling error:', err.message);
  }
  setTimeout(pollUpdates, 1000);
}

// بدء السحب
pollUpdates();

console.log(`🤖 Bot @${BOT_USERNAME} started with polling mode...`);