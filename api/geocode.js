export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')

  const { address } = req.query
  const apiKey = process.env.VITE_GOOGLE_MAPS_KEY

  if (!address || !apiKey) {
    return res.status(400).json({ error: 'Missing parameters' })
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&language=es&region=mx&key=${apiKey}`
    const response = await fetch(url)
    const data = await response.json()
    res.status(200).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
