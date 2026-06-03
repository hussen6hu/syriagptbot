// ============================================
// مدرس اللغة العربية - بوت إعراب تيليغرام
// Telegram Bot: @ArabicTeacher1Bot
// ============================================

const TELEGRAM_TOKEN = '8939193095:AAHgd-tLExPzfCJYWHAxki-dbons3rnvjPc';
const OPENROUTER_KEY = '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';
const API_BASE = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

// Admin user ID (you - hussen)
const ADMIN_ID = 5513754275;

// Sham Cash account (you set this)
const SHAM_CASH_PHONE = 'd90f5c756d29a33a645cf1c3a2a0cd1f;

// Price in SYP
const SUBSCRIPTION_PRICE_SYP = 60000; // ~$5

// Free trial requests
const FREE_TRIAL_LIMIT = 3;

// ===== User Storage (JSON file) =====
const fs = require('fs');
const DB_PATH = '/workspace/users_db.json';

function loadDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function saveDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function getUser(userId) {
  const db = loadDB();
  if (!db[userId]) {
    db[userId] = {
      id: userId,
      subscribed: false,
      expiry: null, // ISO date string
      freeUsed: 0,
      pendingPayment: false,
      subsActivated: 0
    };
    saveDB(db);
  }
  return db[userId];
}

function updateUser(userId, data) {
  const db = loadDB();
  db[userId] = { ...db[userId], ...data };
  saveDB(db);
}

// ===== Helpers =====
async function sendMsg(chatId, text, parseMode = 'HTML') {
  await fetch(`${API_BASE}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode })
  });
}

async function sendPhoto(chatId, photo, caption) {
  // For simplicity we'll use sendMessage — photo upload needs FormData
  await sendMsg(chatId, caption || '📸');
}

function isSubscribed(userId) {
  const user = getUser(userId);
  if (!user.subscribed || !user.expiry) return false;
  return new Date(user.expiry) > new Date();
}

function getExpiryDate() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString();
}

// ===== AI إعراب Function =====
async function getIrab(text) {
  const systemPrompt = `أنت أستاذ متخصص في اللغة العربية والإعراب.
مهمتك: إعراب الجمل العربية إعراباً دقيقاً كاملاً.
- اذكر نوع الجملة أولاً (اسمية / فعلية)
- أعرب كل كلمة إعراباً مفصلاً
- اشرح القواعد النحوية المطبقة إن لزم
- استخدم لغة عربية فصيحة واضحة
- إذا كان النص غير عربي أو غير مفهوم، قل: "يرجى إرسال جملة عربية صحيحة"
- لا تخرج عن موضوع الإعراب`;
  
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `أعرب الجملة التالية إعراباً كاملاً: ${text}` }
        ]
      })
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '⚠️ حدث خطأ في الاستجابة، حاول مرة أخرى.';
  } catch (e) {
    return '⚠️ عذراً، تعذر الاتصال بخدمة الإعراب. حاول لاحقاً.';
  }
}

// ===== Admin Keyboard =====
function adminKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '👥 عرض جميع المشتركين', callback_data: 'admin_list' }],
      [{ text: '📊 الإحصائيات', callback_data: 'admin_stats' }]
    ]
  };
}

function userKeyboard(isSubd) {
  if (isSubd) {
    return {
      inline_keyboard: [
        [{ text: '📝 أرسل جملة للإعراب', callback_data: 'send_irab' }],
        [{ text: '📅 اشتراكي', callback_data: 'my_sub' }]
      ]
    };
  }
  return {
    inline_keyboard: [
      [{ text: '💳 الاشتراك - 60,000 ل.س شهرياً', callback_data: 'subscribe' }],
      [{ text: '🎁 جرب مجاناً (3 إعرابات)', callback_data: 'free_trial' }]
    ]
  };
}

// ===== Main Handler =====
async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text?.trim();
  const isAdmin = userId === ADMIN_ID;

  if (!text) return;

  const user = getUser(userId);

  // ===== COMMANDS =====
  if (text === '/start') {
    let welcome = `👨‍🏫 <b>مرحباً بك في مدرس اللغة العربية!</b>\n\n`
      + `🤖 بوت متخصص في <b>إعراب الجمل العربية</b>\n`
      + `📚 نحو، بلاغة، إعراب كامل ومفصل\n\n`;
    
    if (isSubscribed(userId)) {
      welcome += `✅ اشتراكك مفعل حتى: ${new Date(user.expiry).toLocaleDateString('ar-SA')}`;
    } else {
      welcome += `🎁 لديك <b>${FREE_TRIAL_LIMIT - user.freeUsed}</b> إعراب مجاني متبقي\n`
        + `💳 اشتراك شهري: <b>${SUBSCRIPTION_PRICE_SYP.toLocaleString()} ل.س</b> (~5$)\n`
        + `♾️ إعراب غير محدود طوال الشهر`;
    }
    
    await sendMsg(chatId, welcome);
    
    // Send keyboard
    const kb = isSubscribed(userId) ? userKeyboard(true) : userKeyboard(false);
    await fetch(`${API_BASE}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: '🔽 اختر أحد الخيارات:',
        reply_markup: kb
      })
    });
    return;
  }

  if (text === '/subscribe') {
    if (isSubscribed(userId)) {
      await sendMsg(chatId, `✅ اشتراكك مفعل حتى ${new Date(user.expiry).toLocaleDateString('ar-SA')}`);
      return;
    }
    
    const subMsg = `💳 <b>الاشتراك في البوت</b>\n\n`
      + `📌 المبلغ: <b>${SUBSCRIPTION_PRICE_SYP.toLocaleString()} ل.س</b> (شهرياً)\n`
      + `📲 ادفع عبر <b>شام كاش</b>\n`
      + `📱 رقم المحفظة: <b>${SHAM_CASH_PHONE}</b>\n\n`
      + `بعد الدفع، أرسل <b>/confirm</b> مع صورة الإيصال\n`
      + `📌 سيتم تفعيل اشتراكك بعد التأكيد`;
    
    await sendMsg(chatId, subMsg);
    return;
  }

  if (text === '/confirm') {
    await sendMsg(chatId, '📸 أرسل صورة إيصال التحويل من شام كاش');
    updateUser(userId, { pendingPayment: true });
    return;
  }

  // ===== Handle photo (payment receipt) =====
  if (msg.photo && user.pendingPayment) {
    // Get the largest photo
    const photoId = msg.photo[msg.photo.length - 1].file_id;
    
    // Forward to admin for manual confirmation
    const adminMsg = `📌 <b>طلب اشتراك جديد</b>\n`
      + `👤 المستخدم: ${msg.from.first_name || ''} ${msg.from.last_name || ''}\n`
      + `🆔 ID: <code>${userId}</code>\n`
      + `📅 التاريخ: ${new Date().toLocaleString('ar-SA')}\n`
      + `📸 أرسل صورة الإيصال أعلاه`;
    
    await fetch(`${API_BASE}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_ID,
        photo: photoId,
        caption: adminMsg,
        reply_markup: {
          inline_keyboard: [[
            { text: '✅ تفعيل الاشتراك', callback_data: `activate_${userId}` }
          ]]
        }
      })
    });
    
    await sendMsg(chatId, '✅ استلمنا إيصالك! سيقوم المشرف بتأكيد الاشتراك قريباً.');
    updateUser(userId, { pendingPayment: false });
    return;
  }

  // ===== Admin commands =====
  if (isAdmin && text.startsWith('/')) {
    if (text === '/stats') {
      const db = loadDB();
      const total = Object.keys(db).length;
      const active = Object.values(db).filter(u => u.subscribed && u.expiry && new Date(u.expiry) > new Date()).length;
      await sendMsg(chatId, `📊 <b>إحصائيات البوت</b>\n👥 إجمالي المستخدمين: ${total}\n✅ المشتركين النشطين: ${active}`);
      return;
    }
  }

  // ===== Handle normal text =====
  // DON'T process commands starting with /
  if (text.startsWith('/')) return;

  // Check subscription or free trial
  const subd = isSubscribed(userId);
  
  if (!subd) {
    if (user.freeUsed >= FREE_TRIAL_LIMIT) {
      await sendMsg(chatId, `❌ انتهت الإعرابات المجانية!\n\n💳 اشترك الآن:\n<b>${SUBSCRIPTION_PRICE_SYP.toLocaleString()} ل.س</b> شهرياً عبر شام كاش\n\nأرسل /subscribe للمزيد`);
      return;
    }
    updateUser(userId, { freeUsed: user.freeUsed + 1 });
    await sendMsg(chatId, `🎁 إعراب مجاني (${user.freeUsed + 1}/${FREE_TRIAL_LIMIT})`);
  } else {
    await sendMsg(chatId, '⏳ جاري الإعراب...');
  }

  // Get the إعراب
  const irab = await getIrab(text);
  await sendMsg(chatId, `📝 <b>الإعراب:</b>\n\n${irab}`);
}

// ===== Callback Query Handler =====
async function handleCallback(query) {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = query.data;

  // Answer callback
  await fetch(`${API_BASE}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: query.id })
  });

  if (data === 'subscribe') {
    if (isSubscribed(userId)) {
      await sendMsg(chatId, `✅ اشتراكك مفعل حتى ${new Date(getUser(userId).expiry).toLocaleDateString('ar-SA')}`);
      return;
    }
    const subMsg = `💳 <b>الاشتراك في البوت</b>\n\n`
      + `📌 المبلغ: <b>${SUBSCRIPTION_PRICE_SYP.toLocaleString()} ل.س</b>\n`
      + `📲 ادفع عبر <b>شام كاش</b>\n`
      + `📱 رقم المحفظة: <b>${SHAM_CASH_PHONE}</b>\n\n`
      + `بعد الدفع، أرسل <b>/confirm</b> مع صورة الإيصال`;
    await sendMsg(chatId, subMsg);
    return;
  }

  if (data === 'free_trial') {
    const user = getUser(userId);
    const remaining = FREE_TRIAL_LIMIT - user.freeUsed;
    if (remaining <= 0) {
      await sendMsg(chatId, '❌ انتهت الإعرابات المجانية. اشترك عبر /subscribe');
      return;
    }
    await sendMsg(chatId, `🎁 لديك ${remaining} إعرابات مجانية متبقية. أرسل أي جملة عربية وسأعربها لك!`);
    return;
  }

  if (data === 'my_sub') {
    if (isSubscribed(userId)) {
      await sendMsg(chatId, `✅ اشتراكك مفعل حتى: ${new Date(getUser(userId).expiry).toLocaleDateString('ar-SA')}`);
    } else {
      await sendMsg(chatId, '❌ ليس لديك اشتراك نشط. أرسل /subscribe');
    }
    return;
  }

  if (data === 'send_irab') {
    await sendMsg(chatId, '✍️ أرسل الجملة التي تريد إعرابها');
    return;
  }

  // Admin: activate subscription
  if (data.startsWith('activate_') && userId === ADMIN_ID) {
    const targetId = data.replace('activate_', '');
    const expiry = getExpiryDate();
    const user = getUser(targetId);
    updateUser(targetId, { subscribed: true, expiry, subsActivated: (user.subsActivated || 0) + 1 });
    
    await sendMsg(chatId, `✅ تم تفعيل الاشتراك للمستخدم <code>${targetId}</code> حتى ${new Date(expiry).toLocaleDateString('ar-SA')}`);
    
    // Notify user
    await sendMsg(parseInt(targetId), `✅ <b>تم تفعيل اشتراكك!</b>\n\n♾️ إعراب غير محدود حتى ${new Date(expiry).toLocaleDateString('ar-SA')}\n📝 أرسل أي جملة عربية وسأعربها لك فوراً!`);
    return;
  }

  if (data === 'admin_list' && userId === ADMIN_ID) {
    const db = loadDB();
    let list = '👥 <b>جميع المستخدمين:</b>\n\n';
    Object.values(db).forEach(u => {
      const active = u.subscribed && u.expiry && new Date(u.expiry) > new Date();
      list += `🆔 <code>${u.id}</code> | ${active ? '✅ مفعل' : '❌ غير مفعل'} | مجاني: ${u.freeUsed}/3\n`;
    });
    await sendMsg(chatId, list || 'لا يوجد مستخدمين بعد');
    return;
  }

  if (data === 'admin_stats' && userId === ADMIN_ID) {
    const db = loadDB();
    const total = Object.keys(db).length;
    const active = Object.values(db).filter(u => u.subscribed && u.expiry && new Date(u.expiry) > new Date()).length;
    const totalSubs = Object.values(db).reduce((sum, u) => sum + (u.subsActivated || 0), 0);
    await sendMsg(chatId, `📊 <b>إحصائيات البوت</b>\n👥 إجمالي المستخدمين: ${total}\n✅ المشتركين النشطين: ${active}\n📈 إجمالي الاشتراكات المفعّلة: ${totalSubs}`);
    return;
  }
}

// ===== Webhook: Receive updates =====
async function handleUpdate(body) {
  try {
    // Handle callback queries
    if (body.callback_query) {
      await handleCallback(body.callback_query);
      return;
    }
    
    // Handle messages
    if (body.message) {
      await handleMessage(body.message);
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

// ===== Server (Webhook mode) =====
const http = require('http');
const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const update = JSON.parse(body);
        await handleUpdate(update);
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
      } catch (e) {
        res.writeHead(400);
        res.end('Bad Request');
      }
    });
  } else {
    // GET - show status
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<h1>👨‍🏫 مدرس اللغة العربية</h1><p>Bot is running! Total users: ${Object.keys(loadDB()).length}</p>`);
  }
});

server.listen(PORT, () => {
  console.log(`🤖 مدرس اللغة العربية bot running on port ${PORT}`);
  
  // Set webhook automatically
  const url = `https://arabicteacher1bot.onrender.com`; // Change this to your hosting URL
  fetch(`${API_BASE}/setWebhook?url=${url}`)
    .then(r => r.json())
    .then(d => console.log('Webhook set:', d))
    .catch(e => console.log('Webhook error:', e.message));
});