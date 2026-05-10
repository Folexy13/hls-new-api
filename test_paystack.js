require('dotenv').config();
const axios = require('axios');
async function test() {
  try {
    const res = await axios.get('https://api.paystack.co/bank?currency=NGN', {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
    });
    const banks = res.data.data;
    const moniepoint = banks.find(b => b.name.toLowerCase().includes('moniepoint'));
    console.log(moniepoint);
  } catch (e) { console.error(e.message); }
}
test();
