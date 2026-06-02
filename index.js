const T='8363241044:AAHNENSFHQ_81qXmOj3u2pMfkjyUNhmwjFo',K='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',A=`https://api.telegram.org/bot${T}`;
async function s(c,t){await fetch(`${A}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:c,text:t,parse_mode:'HTML'})})}
Bun.serve({port:process.env.PORT||3000,async fetch(r){const u=new URL(r.url);
if(u.pathname==='/')await fetch(`${A}/setWebhook?url=https://syriagptbot.onrender.com`).catch(()=>{});
if(r.method==='POST'){const m=(await r.json())?.message;if(m?.text){const c=m.chat.id,t=m.text;
if(t==='/start')await s(c,'🤖 مرحبا بسوريا جي بي تي! اسألني أي شيء');
else{try{const r2=await fetch('https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3',{method:'POST',headers:{Authorization:`Bearer ${K}`,'Content-Type':'application/json'},body:JSON.stringify({inputs:`[INST] رد بنفس لهجة المستخدم وكن مختصراً. سؤال: ${t} [/INST]`})});const d=await r2.json();await s(c,d[0]?.generated_text?.replace(t,'')?.trim()||'خطأ')}catch(e){await s(c,'خطأ: '+e.message)}}}return new Response('OK')}
if(u.pathname==='/setwebhook'){const w=await(await fetch(`${A}/setWebhook?url=${u.protocol}//${u.host}`)).json();return new Response(JSON.stringify(w),{headers:{'Content-Type':'application/json'}})}
return new Response('Running')}});
