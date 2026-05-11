export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const key = process.env.VITE_GOOGLE_MAPS_KEY
  if (!key) return res.status(400).json({ error: 'No key' })
  res.status(200).json({ key })
}
