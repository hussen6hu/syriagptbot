const T='8363241044:AAHNENSFHQ_81qXmOj3u2pMfkjyUNhmwjFo',A=`https://api.telegram.org/bot${T}`,CF='77e946afa263b459ee67a4bf4affc47d',CK='cfut_IFihPg6XguqIN5SKFoxxq1x0TsxYuDCpT3rop30Ieaa39887';
async function s(c,t){await fetch(`${A}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:c,text:t,parse_mode:'HTML'})})}
Bun.serve({port:process.env.PORT||3000,async fetch(r){const u=new URL(r.url);
if(u.pathname==='/')await fetch(`${A}/setWebhook?url=https://syriagptbot.onrender.com`).catch(()=>{});
if(r.method==='POST'){const m=(await r.json())?.message;if(m?.text){const c=m.chat.id,t=m.text;
if(t==='/start')await s(c,'🤖 مرحبا بسوريا جي بي تي! اسألني أي شيء');
else{try{const q=await(await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF}/ai/run/@cf/meta/llama-2-7b-chat-int8`,{method:'POST',headers:{Authorization:`Bearer ${CK}`,'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:t}]})})).json();await s(c,q.result?.response||'ما في رد')}catch(e){await s(c,'🚨 '+e.message)}}}return new Response('OK')}
return new Response('Running')}});
