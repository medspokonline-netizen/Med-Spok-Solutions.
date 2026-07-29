# Medspok Solutions — website

A JavaScript project (Vite) for **Med Spok Solutions Pvt Ltd**, Porur, Chennai.

## Deploy to Vercel

Push this folder to GitHub, then in Vercel: **Add New → Project → Import**.

Vercel detects Vite automatically and fills in:

| Setting | Value (detected, do not change) |
|---|---|
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

Leave **Root Directory** empty. There is no `vercel.json` on purpose — Vercel's own
detection is correct, and a config file overriding it is what causes `404: NOT_FOUND`.

## Local

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # writes dist/
npm run preview    # serve the built dist/
npm run check      # broken links, structure, accessibility
```

## Layout

```
index.html  products.html  rent-or-buy.html
services.html  about.html  contact.html     six pages, entry points
public/assets/                              copied through untouched
  style.css  site.js  products/  brands/  premises/  icons/  video/
vite.config.js                              lists the six entry points
tools/checklinks.js                         pre-deploy checks
```

Asset paths are absolute (`/assets/style.css`) so Vite treats them as static files to copy
rather than modules to bundle. Relative paths build with warnings.

## Verified

Build: clean, zero warnings, zero errors. Built output tested in a real browser — all six
pages load styled with no broken images, the rent-or-buy picker works, the photo viewer
opens, enquiry links carry the model name and select the right category, the mobile menu
works, no 404s, no console errors.
