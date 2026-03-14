import axios from 'axios'
import jwt from 'jsonwebtoken'

async function test() {
  const token = jwt.sign({ userId: 1, role: 'admin' }, process.env.JWT_SECRET || 'fallback_secret')
  try {
    const res = await axios.get('http://localhost:8000/api/users/active', {
      headers: { Authorization: `Bearer ${token}` }
    })
    console.log("Success:", res.data)
  } catch (err: any) {
    console.log("Error:", err.response?.data || err.message)
  }
}

test()
