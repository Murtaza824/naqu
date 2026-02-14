# Deploy to naqiyahqadir.com

Step-by-step instructions to deploy this static Valentine site to **naqiyahqadir.com** using **Railway**.

---

## Prerequisites

- A **Railway account** ([railway.app](https://railway.app)). Sign up or sign in (GitHub login is easiest for deploy).
- The project in a **Git repository** (GitHub, GitLab, or Bitbucket). Railway deploys from Git.
- The domain **naqiyahqadir.com** registered and manageable at your registrar (Namecheap, GoDaddy, Cloudflare, etc.).

---

## Pre-deploy checklist

Before deploying, ensure the following exist in this directory (the folder that contains `index.html`):

| Item | Required |
|------|----------|
| `index.html` | Yes |
| `styles.css` | Yes |
| `main.js` | Yes |
| `config.js` | Yes |
| `assets/corner-mascot.png` | Yes |
| `assets/photo1.png` | Yes |
| `assets/photo2.png` | Yes |
| `assets/photo3.png` | Yes |
| `assets/photo4.png` | Yes |

If any asset is missing, add the file or a placeholder so the deployed site does not show broken images.

---

## Deploy steps

### 1. Create a Railway project and deploy from Git

1. Open [railway.app](https://railway.app) and sign in (e.g. with GitHub).
2. Click **New Project**.
3. Choose **Deploy from GitHub repo** (or GitLab/Bitbucket). Authorize Railway if prompted.
4. Select the repository that contains this site. If the repo root **is** the site (i.e. `index.html` is at the repo root), leave **Root Directory** empty. If the site lives in a subfolder (e.g. `naqu`), set **Root Directory** to that folder (e.g. `naqu`).
5. Railway will detect a static site (e.g. via `index.html` or Railpack/Nixpacks) and deploy. No build command is needed.
6. After the first deploy, Railway assigns a URL like `your-app.up.railway.app`. Open it and confirm the site works: landing → **Yes** → letter, photos, and corner mascot.

**If the static site is not detected:** In the service **Settings**, you can set the builder to one that serves static files, or add a `Staticfile` at the deploy root with `root:.` so the current directory is served. Railway’s docs list the exact env vars (e.g. `RAILPACK_STATIC_FILE_ROOT`) if you need to override the root.

### 2. Add custom domain in Railway

1. In the Railway dashboard, open your service (the static site).
2. Go to **Settings** → **Domains** (or **Networking** → **Public Networking**).
3. Click **Add Custom Domain** (or **Generate Domain** first if you want the default `*.railway.app` URL, then add custom).
4. Enter **naqiyahqadir.com**. Add **www.naqiyahqadir.com** if you want both. Railway will show the **CNAME target** (e.g. `your-app.up.railway.app`). **Use the value shown in the Railway UI**; do not hardcode it here.

### 3. Configure DNS at your registrar

Use the **exact CNAME target** (and any instructions) shown in Railway’s domain settings.

**For www (recommended):**

- Add a **CNAME** record: name **www**, value = the CNAME target from Railway (e.g. `your-app.up.railway.app`).

**For apex (naqiyahqadir.com with no “www”):**

- Standard DNS does not allow CNAME at the apex. Options:
  - **Cloudflare:** Add the domain to Cloudflare and use their **CNAME flattening** so the apex can point to Railway’s hostname.
  - **Registrar ALIAS/ANAME:** If your registrar supports ALIAS or ANAME records, point the apex to the same Railway hostname.
  - **Use www only:** Point only **www** to Railway and (optionally) redirect apex to www at the registrar or via a simple redirect service.

Railway provides only CNAME targets, not A-record IPs. Remove any existing A or AAAA records at the apex if you switch to CNAME/ALIAS.

### 4. HTTPS

Railway will issue a certificate (e.g. Let’s Encrypt) for your custom domain once DNS is correct. Wait for DNS propagation (minutes to 48 hours). If SSL shows as pending, check Railway’s **Troubleshooting SSL** docs and avoid repeatedly removing/re-adding the domain (rate limits apply).

---

## Post-deploy

- Open **https://naqiyahqadir.com** (and **https://www.naqiyahqadir.com** if configured).
- Click through: landing → **Yes** → letter and photos. Confirm everything loads and the corner mascot appears.

---

## Summary

| Item | Action |
|------|--------|
| Host | Railway (static site via Git; Railpack/Nixpacks serve `index.html` at root) |
| Build | None; deploy root = folder that contains index.html |
| Deploy | New Project → Deploy from GitHub; set Root Directory if site is in a subfolder |
| Domain | Add naqiyahqadir.com (and www) in Railway; set CNAME at registrar; use www or CNAME flattening for apex |
| Docs | This file (DEPLOY.md) is the single source of truth for deployment |
