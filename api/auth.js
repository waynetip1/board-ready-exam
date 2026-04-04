export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email, password } = req.body

  try {
    const formData = new URLSearchParams()
    formData.append('email', email)
    formData.append('password', password)

    const wpRes = await fetch('https://boardreadybeauty.com/wp-json/simple-jwt-login/v1/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    })

    const data = await wpRes.json()

    if (!data.data?.jwt) {
      return res.status(401).json({ error: data.message || 'Invalid credentials' })
    }

    // Get user info
    const userRes = await fetch('https://boardreadybeauty.com/wp-json/wp/v2/users/me', {
      headers: { 'Authorization': `Bearer ${data.data.jwt}` }
    })
    const userData = await userRes.json()

    res.status(200).json({
      jwt: data.data.jwt,
      userId: userData.id,
      name: userData.name || userData.slug || email.split('@')[0]
    })
  } catch (err) {
    console.error('Auth error:', err)
    res.status(500).json({ error: 'Authentication failed. Please try again.' })
  }
}
