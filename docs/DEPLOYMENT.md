# HiSecure ERP — Build & Deployment Guide

This guide details how to build and deploy HiSecure ERP v2.0.0. It covers development, production bundling, GitHub repositories, Vercel deployments, and VM hosts.

---

## 1. Development Mode

During development, the frontend and backend run concurrently on different ports with hot reloading enabled.

### Run Command
From the root directory, execute:
```bash
npm run dev
```
*   **Concurrently Spawns**:
    *   **Backend Server**: Runs on `http://localhost:3004` (using `ts-node` to compile typescript on-the-fly).
    *   **Frontend Client**: Runs on `http://localhost:5173` (using `Vite` with Hot Module Replacement).

---

## 2. Production Build

To run the application in a production environment, you must compile the TypeScript code into optimized JavaScript bundles.

### Step 2.1: Compile all Projects
Run the global build script from the repository root:
```bash
npm run build
```
This triggers:
1.  **Frontend Compilation** (`npm run build --prefix client`):
    *   Runs the TypeScript compiler check (`tsc -b`).
    *   Vite packages client assets into the static output folder: [client/dist](file:///C:/Users/Admin/Desktop/Calude%20Test/erp-app/client/dist).
2.  **Backend Compilation** (`npm run build --prefix server`):
    *   Runs the TypeScript compiler (`tsc`) translating `src/` to [server/dist](file:///C:/Users/Admin/Desktop/Calude%20Test/erp-app/server/dist).
    *   Copies Python scrapers (`src/routes/get_gst_captcha.py`) to the target build output directory.

### Step 2.2: Production Startup
To run the production build natively, make sure environment variables are loaded and run:
```bash
npm run start
```
This runs `cross-env NODE_ENV=production node server/dist/index.js` which points to the compiled backend entrypoint.

---

## 3. GitHub Deployment (CI/CD workflows)

To automate code checks and staging builds, you can configure GitHub Actions.

### Step 3.1: Create Workflow file
Create a new file `.github/workflows/deploy.yml` in your repository:
```yaml
name: Deploy Production

on:
  push:
    branches:
      - main

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 20

      - name: Install dependencies
        run: npm run install:all

      - name: Compile Code
        run: npm run build

      - name: Validate Lint & Security
        run: npm run lint --prefix client
```

---

## 4. Vercel Deployment (Frontend SPA)

Vercel is the recommended hosting provider for the React frontend because of its global edge network.

### Step 4.1: Configure Vercel Project
1. Log in to Vercel and import your repository.
2. Select the **client** directory as the root path of the project.
3. Configure the following project parameters:
   *   **Framework Preset**: Vite
   *   **Build Command**: `tsc -b && vite build`
   *   **Output Directory**: `dist`
4. Set the environment variables:
   *   `VITE_API_URL`: Set to your public Express API gateway URL (e.g., `https://api.yourdomain.com/api`).
5. Click **Deploy**. Vercel will build the frontend assets and assign a secure `https://*.vercel.app` URL.

---

## 5. Oracle VM / Linux Server Deployment

Follow these instructions to deploy the Express backend to your VM instance:

### Step 5.1: Transfer Build Assets
Push your code to your remote repository or copy the project files to the VM:
```bash
git clone https://github.com/smdshameer/Hi-Secure-ERP.git /var/www/hisecure-erp
cd /var/www/hisecure-erp
```

### Step 5.2: Setup Production Environment
Create the `.env` file in your VM server folder:
```bash
nano server/.env
```
Ensure you have the required variables configured:
*   `NODE_ENV=production`
*   `DATABASE_URL` (Points to a hardened PostgreSQL server instance)
*   `REDIS_URL` (Points to Redis instance)
*   `JWT_SECRET` (Cryptographically rotated token key)
*   `PORT=3004`

### Step 5.3: Set Up PM2 Process Monitoring
To ensure the backend application automatically restarts on crashes or system reboots:
```bash
sudo npm install -g pm2
cd server
npm install --production
npx prisma generate
npm run build

# Start process
pm2 start dist/index.js --name "hisecure-erp-backend"

# Save the current PM2 list to spawn on reboot
pm2 save
pm2 startup
```

### Step 5.4: Reverse Proxy Configuration (Nginx)
Configure Nginx to proxy web requests to the Node server:
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Terminate SSL using Certbot:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```
