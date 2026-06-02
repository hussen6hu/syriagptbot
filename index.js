const T='8363241044:AAFK6fTkUGIODr2bvzd_0GJdM_ckI-xVc6k',K='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',A=`https://api.telegram.org/bot${T}`;
async function s(c,t){await fetch(`${A}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:c,text:t,parse_mode:'HTML'})})}
Bun.serve({port:process.env.PORT||3000,async fetch(r){const u=new URL(r.url);
if(r.method==='POST'){const m=(await r.json())?.message;if(m?.text){const c=m.chat.id,t=m.text;
if(t==='/start')await s(c,'🤖 مرحبا بسوريا جي بي تي! اسألني أي شيء');
else{const d=await(await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${K}`,'Content-Type':'application/json'},body:JSON.stringify({model:'openai/gpt-4o-mini',messages:[{role:'system',content:'رد بنفس لهجة المستخدم، كن مفيداً ومختصراً'},{role:'user',content:t}]})})).json();
await s(c,d.choices?.[0]?.message?.content||'خطأ')}}return new Response('OK')}
if(u.pathname==='/setwebhook'){const w=await(await fetch(`${A}/setWebhook?url=${u.protocol}//${u.host}`)).json();return new Response(JSON.stringify(w),{headers:{'Content-Type':'application/json'}})}
return new Response('Running')}});
