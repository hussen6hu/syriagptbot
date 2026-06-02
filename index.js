const T='8363241044:AAHNENSFHQ_81qXmOj3u2pMfkjyUNhmwjFo',K='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',A=`https://api.telegram.org/bot${T}`;
async function s(c,t){await fetch(`${A}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:c,text:t,parse_mode:'HTML'})})}
Bun.serve({port:process.env.PORT||3000,async fetch(r){const u=new URL(r.url);
if(u.pathname==='/')await fetch(`${A}/setWebhook?url=https://syriagptbot.onrender.com`).catch(()=>{});
if(r.method==='POST'){const m=(await r.json())?.message;if(m?.text){const c=m.chat.id,t=m.text;
if(t==='/start')await s(c,'🤖 مرحبا بسوريا جي بي تي! اسألني أي شيء');
else{const d=await(await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${K}`,'Content-Type':'application/json'},body:JSON.stringify({model:'openai/gpt-4o-mini',messages:[{role:'system',content:'رد بنفس لهجة المستخدم، كن مفيداً ومختصراً'},{role:'user',content:t}]})})).json();
await s(c,d.choices?.[0]?.message?.content||'خطأ')}}return new Response('OK')}
if(u.pathname==='/setwebhook'){const w=await(await fetch(`${A}/setWebhook?url=${u.protocol}//${u.host}`)).json();return new Response(JSON.stringify(w),{headers:{'Content-Type':'application/json'}})}
return new Response('Running')}});
