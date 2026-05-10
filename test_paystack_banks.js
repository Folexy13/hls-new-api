require('dotenv').config();
const axios = require('axios');
async function test() {
  try {
    const res = await axios.get('https://api.paystack.co/bank?currency=NGN', {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
    });
    console.log(Array.isArray(res.data.data));
    console.log(res.data.data.slice(0, 2));
  } catch (e) { console.error(e.message); }
}
test();
