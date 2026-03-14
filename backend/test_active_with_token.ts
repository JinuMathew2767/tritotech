import axios from 'axios'

async function testActiveUsers() {
  try {
    console.log('Logging in as admin to get token...')
    const loginRes = await axios.post('http://localhost:8000/api/auth/login', {
      email: 'admin@tritongroup.com',
      password: 'admin123'
    })
    const token = loginRes.data.access
    console.log('Token acquired.')

    console.log('\nFetching Active Users...')
    const activeRes = await axios.get('http://localhost:8000/api/users/active', {
      headers: { Authorization: `Bearer ${token}` }
    })
    console.log('Active Users Count:', activeRes.data.length)
    console.log('First Active User Role:', activeRes.data[0]?.role)

    console.log('\nFetching Denied Users...')
    const deniedRes = await axios.get('http://localhost:8000/api/users/denied', {
      headers: { Authorization: `Bearer ${token}` }
    })
    console.log('Denied Users Count:', deniedRes.data.length)
  } catch (err: any) {
    console.error('API Test Failed:', err.response?.data || err.message)
  }
}

testActiveUsers()
