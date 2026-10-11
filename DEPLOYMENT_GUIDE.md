# 🚀 GitHub Par Upload Aur Deploy Karne Ka Complete Guide (Hindi & English)

Aapka project **QR Studio Pro** poori tarah se GitHub aur live hosting ke liye ready ho chuka hai!

---

## 🌟 What is Already Configured (Sab Kuch Ready Hai)
1. **Built by: Salman** — Header ke right side me signature chip (S monogram + "Built by Salman") aur footer me credit line add hai.
2. **GitHub Actions Workflow** (`.github/workflows/deploy.yml`) — Ye workflow push karte hi automatically website ko build karke GitHub Pages par live kar dega.
3. **Pre-built `/docs` Folder** — Agar aap bina kisi build step ke direct deploy karna chahte hain, to `/docs` folder me pehle se ready static build maujood hai.
4. **Vercel & Netlify Ready** (`vercel.json` & `netlify.toml`) — Agar Vercel ya Netlify use karna chahein to 1-click me deploy ho jayega.
5. **Relative Paths (`base: './'`)** — Kisi bhi subpath ya custom domain par chalega bina error ke.

---

## 📋 Step-by-Step: GitHub Par Kaise Upload Karein

Aapke computer me Git CLI install nahi hai, isliye sabse aasan aur fast tarika **GitHub Web Upload** ya **GitHub Desktop** hai:

### 🟢 Tarika 1: GitHub Website Se Direct Upload (Sabse Aasan - No Coding Needed)

1. **GitHub par naya Repository banayein:**
   - [github.com/new](https://github.com/new) par jayein.
   - Repository name daalein: jaise `QR-Designer-Pro` ya `qr-studio`.
   - **Public** select karein.
   - **"Create repository"** button par click karein.

2. **Files Upload karein:**
   - Naye repository page par **"uploading an existing file"** link par click karein.
   - Apne computer me is folder me jayein:
     `C:\Users\CONTRACT CELL PC-1\Documents\AG Projects\QR-Designer-Pro`
   - **DHYAN DEIN (Important):** `node_modules` aur `dist` folder ko chhod kar baaki sabhi files aur folders select karein:
     - `.github/`
     - `public/`
     - `src/`
     - `docs/`
     - `assets/`
     - `index.html`
     - `index.source.html`
     - `build-deploy.js`
     - `package.json`
     - `package-lock.json`
     - `vite.config.js`
     - `README.md`
     - `vercel.json`
     - `netlify.toml`
     - `.gitignore`
   - Drag & drop karein GitHub page par aur **Commit changes** par click karein.

3. **Deploy to GitHub Pages (2 Clicks):**
   - Repository ke **Settings** tab me jayein.
   - Left side me **Pages** par click karein.
   - **Build and deployment -> Source** me:
     - **Option A (Recommended):** Dropdown me **"GitHub Actions"** select karein. Bas! 1 minute me website live ho jayegi.
     - **Option B (Instant):** Dropdown me **"Deploy from a branch"** select karein -> Branch: `main` -> Folder: `/docs` select karke **Save** dabayein.

---

### 🔵 Tarika 2: GitHub Desktop App Se (Best for Beginners)

1. [desktop.github.com](https://desktop.github.com) se **GitHub Desktop** install karein.
2. **File -> Add Local Repository** dabayein aur ye path choose karein:
   `C:\Users\CONTRACT CELL PC-1\Documents\AG Projects\QR-Designer-Pro`
3. Agar poochhe "create repository", to Create daba kar **Publish repository** par click kar dein.
4. Repo ke **Settings -> Pages** me jakar **GitHub Actions** select karein!

---

### 🟣 Tarika 3: Free Vercel ya Netlify Par 1-Click Deploy (Bonus)

Agar aap aur bhi fast chahte hain:
1. [vercel.com](https://vercel.com) par login karein.
2. "Add New Project" -> Apna GitHub repository select karein.
3. Vercel automatically `vite.config.js` aur `vercel.json` padh lega -> Click **Deploy**!
4. 30 second me custom `.vercel.app` URL par aapka QR Studio Pro live ho jayega.

---

## 👨‍💻 Created & Designed By
**Built by: Salman** — Architecture, UI Engineering & Design.
