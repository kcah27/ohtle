# Ohtle 🏛

**Turismo con raíz** — Descubre experiencias locales auténticas con Google Maps.

## Setup local

```bash
npm install
```

Crea un archivo `.env.local` en la raíz:

```
VITE_GOOGLE_MAPS_KEY=tu_api_key_aqui
```

```bash
npm run dev
```

Abre http://localhost:5173

## APIs de Google requeridas

En [console.cloud.google.com](https://console.cloud.google.com) habilita:
- **Places API**
- **Geocoding API**

## Deploy en Vercel

1. Sube este proyecto a GitHub
2. Importa en [vercel.com](https://vercel.com)
3. En Vercel → Settings → Environment Variables agrega:
   - `VITE_GOOGLE_MAPS_KEY` = tu API key
4. Deploy automático ✅

## Estructura

```
src/
  components/
    Header.jsx / .module.css
    SearchBar.jsx / .module.css
    PlaceCard.jsx / .module.css
  hooks/
    usePlaces.js
  App.jsx / App.module.css
  main.jsx
  index.css
```
