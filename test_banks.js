const axios = require('axios');
async function test() {
  try {
    const res = await axios.post('http://localhost:7000/api/v2/auth/login', {
      email: 'p1@yopmail.com', // wait, do I know a login?
      password: 'password123'
    });
    // Can't test easily without a valid login token.
  } catch(e) {}
}
