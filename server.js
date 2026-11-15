const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const KEY = process.env.CONSUMER_KEY;
const SECRET = process.env.CONSUMER_SECRET;
const PASSKEY = process.env.PASSKEY;
const SHORTCODE = "1440458";

function timestamp(){
  const d = new Date();
  const p = (n)=> String(n).padStart(2,'0');
  return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

app.post('/stk', async (req,res)=>{
  try{
    const {phone, amount} = req.body;
    let clean = phone.replace(/^0/,'254').replace(/[^0-9]/g,'');
    const auth = Buffer.from(`${KEY}:${SECRET}`).toString('base64');
    const t = await axios.get('https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',{headers:{Authorization:`Basic ${auth}`}});
    const token = t.data.access_token;
    const ts = timestamp();
    const password = Buffer.from(`${SHORTCODE}${PASSKEY}${ts}`).toString('base64');
    const r = await axios.post('https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest',{
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: ts,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: clean,
      PartyB: SHORTCODE,
      PhoneNumber: clean,
      CallBackURL: "https://bachat-backend.onrender.com/callback",
      AccountReference: "BACHAT",
      TransactionDesc: "Bachat Deposit"
    },{headers:{Authorization:`Bearer ${token}`}});
    res.json(r.data);
  }catch(e){ res.json({error: e.response?.data || e.message}); }
});

app.post('/callback', (req,res)=>{
  console.log("CALLBACK", JSON.stringify(req.body));
  res.json({ok:true});
});

app.get('/',(req,res)=>res.send('Bachat Backend Live'));
app.listen(process.env.PORT||3000);
