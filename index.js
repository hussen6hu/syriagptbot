
<pre><code>import fetch from 'node-fetch';
const TELEGRAM_TOKEN = '8363241044:AAFK6fTkUGIODr2bvzd_0GJdM_ckI-xVc6k';
const OPENAI_API_KEY = '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';
const API = https://api.telegram.org/bot${TELEGRAM_TOKEN};
async function send(c,i,t){await fetch(${API}/sendMessage,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:i,text:t,parse_mode:'HTML'})})}
Bun.serve({port:process.env.PORT||3000,async fetch(r){const u=new URL(r.url);if(r.method==='POST'){const m=(await r.json())?.message;if(m?.text){const chat=m.chat.id,t=m.text;if(t==='/start')await send(0,chat,'🤖 مرحبا بسوريا جي بي تي!');else{const a=await(await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{Authorization:Bearer ${OPENAI_API_KEY},'Content-Type':'application/json'},body:JSON.stringify({model:'openai/gpt-4o-mini',messages:[{role:'system',content:'رد بنفس لهجة المستخدم'},{role:'user',content:t}]})})).json();await send(0,chat,a.choices?.[0]?.message?.content||'خطأ')}}return new Response('OK')}if(u.pathname==='/setwebhook'){const w=await(await fetch(${API}/setWebhook?url=${u.protocol}//${u.host})).json();return new Response(JSON.stringify(w),{headers:{'Content-Type':'application/json'}})}return new Response('Running')}});
</code></pre>
