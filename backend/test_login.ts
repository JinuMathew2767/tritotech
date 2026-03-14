import axios from 'axios'

async function testLogin() {
  console.log('Testing login for admin@tritongroup.com...')
  try {
    const res = await axios.post('http://localhost:8000/api/auth/login', {
      email: 'admin@tritongroup.com',
      password: 'admin123' // I'll try common passwords or check if I can find it
    })
    console.log('Login Success:', res.data)
  } catch (err: any) {
    console.error('Login Failed:', err.response?.data || err.message)
  }

  console.log('\nTesting login for jay@gmail.com...')
  try {
    const res = await axios.post('http://localhost:8000/api/auth/login', {
      email: 'jay@gmail.com',
      password: 'password123' // I'll try to find what was used during signup
    })
    console.log('Login Success:', res.data)
  } catch (err: any) {
    console.error('Login Failed:', err.response?.data || err.message)
  }
}

testLogin()
