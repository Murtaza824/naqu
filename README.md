# Valentine Web Experience

A tiny, romantic single-page site that playfully asks:

> **Will you be my valentine?**

The **No** button runs away so it is impossible to click, and saying **Yes** reveals a sweet letter and some of your favorite photos together.

## Running locally

1. Install Node.js (if you do not already have it).
2. From this folder, run:

```bash
npm install
npm run start
```

This will start a simple static file server (via `npx serve .`). Open the URL it prints (usually `http://localhost:3000` or `http://localhost:5000`) in your browser.

Alternatively, you can simply double-click `index.html` to open it directly in a browser without any server.

## Customizing the content

Most of what you will want to change lives in `config.js`:

- Change the **question text** and button labels in the `landing` section.
- Write your real **letter** in the `letter.paragraphs` array (each string is a paragraph).
- Point the `photos` entries to real image files (put them in an `assets/` folder next to `index.html`).
- Toggle effects in `features`:
  - `enableTypewriter`: whether the letter types itself in.
  - `enableBackgroundAnimations`: reserved for additional motion tweaks (background hearts already respect reduced-motion).
  - `enableConfettiOnYes`: little hearts burst when she clicks **Yes**.

Once you deploy these static files (for example on GitHub Pages, Netlify, or Vercel), just send her the link and wait for the smile.

