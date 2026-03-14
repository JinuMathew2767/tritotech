import axios from 'axios'

async function testCaseSensitivity() {
  const emails = ['jay@gmail.com', 'JAY@gmail.com', 'Jay@GMAIL.com']
  
  for (const email of emails) {
    console.log(`Testing login for: ${email}...`)
    try {
      const res = await axios.post('http://localhost:8000/api/auth/login', {
        email: email,
        password: 'password123'
      })
      console.log(`Result for ${email}: Success`)
    } catch (err: any) {
      console.error(`Result for ${email}: Failed - ${err.response?.data?.error || err.message}`)
    }
  }
}

testCaseSensitivity()
