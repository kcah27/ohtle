export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const { query } = req.query
  const apiKey = process.env.VITE_GOOGLE_MAPS_KEY
  if (!query || !apiKey) return res.status(400).json({ error: 'Missing params' })
  try {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&language=es&key=${apiKey}`
    const response = await fetch(url)
    const data = await response.json()
    res.status(200).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
