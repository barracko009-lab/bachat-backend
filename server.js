const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Bachat Backend Live');
});

async function getToken() {
  const auth = Buffer.from(`${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`).toString('base64');
  const res = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
    headers: { Authorization: `Basic ${auth}` }
  });
  return res.data.access_token;
}

app.post('/stkpush', async (req, res) => {
  try {
    const { phone, amount } = req.body;
    console.log('STK Request:', phone, amount);
    const token = await getToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = Buffer.from(`${process.env.SHORTCODE}${process.env.PASSKEY}${timestamp}`).toString('base64');
    const response = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        BusinessShortCode: process.env.SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: phone,
        PartyB: process.env.SHORTCODE,
        PhoneNumber: phone,
        CallBackURL: process.env.CALLBACK_URL || 'https://bachat-backend-phvx.onrender.com/callback',
        AccountReference: 'BACHAT',
        TransactionDesc: 'Bachat Deposit'
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Daraja Response:', response.data);
    res.json(response.data);
  } catch (e) {
    console.log('STK Error:', e.response?.data || e.message);
    res.status(500).json({ error: e.response?.data || e.message });
  }
});

app.post('/callback', (req, res) => {
  console.log('CALLBACK:', JSON.stringify(req.body));
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('Running on ' + PORT));
