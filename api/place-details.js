export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const { place_id } = req.query
  const apiKey = process.env.VITE_GOOGLE_MAPS_KEY
  if (!place_id || !apiKey) return res.status(400).json({ error: 'Missing params' })
  try {
    const fields = 'name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,opening_hours,price_level,photos'
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=${fields}&language=es&key=${apiKey}`
    const response = await fetch(url)
    const data = await response.json()
    res.status(200).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
