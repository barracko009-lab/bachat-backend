const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const CONSUMER_KEY = process.env.CONSUMER_KEY;
const CONSUMER_SECRET = process.env.CONSUMER_SECRET;
const SHORTCODE = process.env.SHORTCODE; // 1440458
const PASSKEY = process.env.PASSKEY;
const CALLBACK_URL = process.env.CALLBACK_URL;

// === PRODUCTION URLs - DO NOT CHANGE TO SANDBOX ===
const OAUTH_URL = 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
const STK_URL = 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

app.get('/', (req, res) => {
  res.send('Bachat Backend LIVE - Production');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', shortcode: SHORTCODE });
});

// Get Access Token
async function getToken() {
  const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
  const res = await axios.get(OAUTH_URL, {
    headers: { Authorization: `Basic ${auth}` }
  });
  return res.data.access_token;
}

// STK Push
app.post('/stkpush', async (req, res) => {
  try {
    let { phone, amount } = req.body;
    console.log('STK Request:', phone, amount);

    // Format phone: 0710... -> 254710...
    if (phone.startsWith('0')) phone = '254' + phone.slice(1);
    if (phone.startsWith('+')) phone = phone.slice(1);

    const token = await getToken();

    // Timestamp YYYYMMDDHHMMSS
    const date = new Date();
    const timestamp =
      date.getFullYear() +
      String(date.getMonth() + 1).padStart(2, '0') +
      String(date.getDate()).padStart(2, '0') +
      String(date.getHours()).padStart(2, '0') +
      String(date.getMinutes()).padStart(2, '0') +
      String(date.getSeconds()).padStart(2, '0');

    const password = Buffer.from(SHORTCODE + PASSKEY + timestamp).toString('base64');

    const payload = {
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline', // <-- IF 1440458 IS A TILL, CHANGE THIS TO 'CustomerBuyGoodsOnline'
      Amount: amount,
      PartyA: phone,
      PartyB: SHORTCODE,
      PhoneNumber: phone,
      CallBackURL: CALLBACK_URL,
      AccountReference: 'Bachat',
      TransactionDesc: 'Bachat Deposit'
    };

    const response = await axios.post(STK_URL, payload, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('STK Success:', response.data);
    res.json(response.data);

  } catch (error) {
    console.log('STK Error:', error.response?.data || error.message);
    res.status(400).json(error.response?.data || { error: error.message });
  }
});

// Callback from M-Pesa
app.post('/callback', (req, res) => {
  console.log('Callback:', JSON.stringify(req.body, null, 2));
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
