export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')

  const { location, type, radius = 5000 } = req.query
  const apiKey = process.env.VITE_GOOGLE_MAPS_KEY

  if (!location || !type || !apiKey) {
    return res.status(400).json({ error: 'Missing parameters' })
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location}&radius=${radius}&type=${type}&language=es&key=${apiKey}`
    const response = await fetch(url)
    const data = await response.json()
    res.status(200).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
