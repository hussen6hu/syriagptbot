<pre><code>import fetch from 'node-fetch';

const TELEGRAM_TOKEN = '8363241044:AAFK6fTkUGIODr2bvzd_0GJdM_ckI-xVc6k';
const OPENAI_API_KEY = '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';
const TELEGRAM_API = https://api.telegram.org/bot${TELEGRAM_TOKEN};

const SYSTEM_PROMPT = 'أنت مساعد ذكي اسمه سوريا جي بي تي. رد بنفس لهجة المستخدم (عامية أو فصحى). كن مفيداً ومختصراً.';

async function sendMessage(chatId, text) {
  await fetch(${TELEGRAM_API}/sendMessage, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
  });
}

async function askAI(chatId, userMessage) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': Bearer ${OPENAI_API_KEY},
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 500
    })
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'عفواً، صار خطأ. جرب لاحقاً.';
}

async function handleUpdate(update) {
  if (!update.message || !update.message.text) return;
  const chatId = update.message.chat.id;
  const text = update.message.text;

  if (text === '/start') {
    return sendMessage(chatId, '🤖 مرحبا بك في <b>سوريا جي بي تي</b>!\nاسألني أي شيء وأنا جاوبك 😎');
  }

  const reply = await askAI(chatId, text);
  await sendMessage(chatId, reply);
}

const server = Bun.serve({
  port: process.env.PORT || 3000,
  async fetch(req) {
    if (req.method === 'POST') {
      const update = await req.json();
      handleUpdate(update);
      return new Response('OK', { status: 200 });
    }
    if (req.method === 'GET' && new URL(req.url).pathname === '/setwebhook') {
      const url = ${req.headers.get('x-forwarded-proto') || 'https'}://${req.headers.get('host')}/;
      await fetch(${TELEGRAM_API}/setWebhook?url=${url});
      return new Response('Webhook set!', { status: 200 });
    }
    return new Response('Bot is running!', { status: 200 });
  }
});

console.log('Bot running on port', server.port);
</code></pre>
