# HiSecure ERP — Installation Guide

This guide provides step-by-step instructions to install and configure HiSecure ERP v2.0.0 in local development and production environments.

---

## 1. Environment Prerequisites

Ensure your host environment meets the minimum software requirements:

*   **Node.js**: v20.x LTS (Recommended) or v18.x.
*   **Database**: PostgreSQL 15.x or higher.
*   **Cache & Queue**: Redis 7.x or higher.
*   **Package Manager**: `npm` (v10+) or `yarn`.
*   **Python**: v3.10+ (required for GST Captcha scrapers and AI parsing libraries).

---

## 2. Local Development Setup

Follow these steps to spin up the local development client and server:

### Step 2.1: Clone the Repository
```bash
git clone https://github.com/smdshameer/Hi-Secure-ERP.git
cd Hi-Secure-ERP
```

### Step 2.2: Install Dependencies
Install dependencies for the root coordinator, backend, and frontend:
```bash
npm run install:all
```

### Step 2.3: Configure the Database
1. Make sure your local PostgreSQL is running.
2. Log in to your PostgreSQL CLI or GUI, and create the database:
   ```sql
   CREATE DATABASE hisecure_erp;
   ```
3. Initialize environment variables. Navigate to `/server` and copy the example file:
   ```bash
   cd server
   cp production.env.example .env
   ```
4. Edit `/server/.env` and update the `DATABASE_URL` with your local credentials:
   ```env
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/hisecure_erp?schema=public"
   ```

### Step 2.4: Apply Migrations & Seed Data
Generate client libraries and sync schemas:
```bash
npx prisma generate
npx prisma db push
```
If you wish to seed default administration roles and permissions:
```bash
node seed-admin.js
```

### Step 2.5: Run the Services
Run the concurrently integrated developer environments from the repository root:
```bash
cd ..
npm run dev
```
*   **Frontend Client**: `http://localhost:5173` (Vite)
*   **Backend Server**: `http://localhost:3004` (Express)

---

## 3. Windows Installation

Windows installations can use native PostgreSQL installers or the integrated scripts provided in the repository.

### Step 3.1: Install Dependencies
1. Download and run the **Node.js Windows Installer** from the official site.
2. Download and install **PostgreSQL v15+ for Windows** (EnterpriseDB). Set your `postgres` password during setup.
3. Install **Redis for Windows** (via WSL2 or Memurai developer edition).

### Step 3.2: Automated Script Setup
The root contains automation scripts to streamline DB setup:
1. Open PowerShell as an Administrator.
2. Run the PostgreSQL script:
   ```powershell
   .\setup-postgresql.ps1
   ```
3. This script creates the `hisecure_erp` database, maps the relational schema, and validates the settings table.

---

## 4. Linux Installation (Ubuntu/Debian)

Run the following commands to provision the dependencies natively on a Ubuntu 22.04 LTS instance:

### Step 4.1: Install PostgreSQL
```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Set postgres user password
sudo -i -u postgres psql -c "ALTER USER postgres PASSWORD 'your_secure_password';"
```

### Step 4.2: Install Redis
```bash
sudo apt install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### Step 4.3: Install Node.js v20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y node-node
```

### Step 4.4: Deploy Code & Process Manager (PM2)
```bash
npm install -g pm2
cd /var/www/hisecure-erp
npm run install:all
npm run build

# Generate database schemas
cd server
npx prisma generate
npx prisma db push

# Start Server using PM2
pm2 start dist/index.js --name "hisecure-api"
```

---

## 5. Docker Deployment

HiSecure ERP is ready to boot via containerized microservices.

### Step 5.1: Build and Run Services
Using the `docker-compose.yml` located in the `/server` directory:
```bash
cd server
docker-compose up -d --build
```
This command spins up:
*   `hisecure-postgres`: Containerized PostgreSQL 15 on port `5432`.
*   `hisecure-redis`: Containerized Redis 7 on port `6379`.
*   `hisecure-api-server`: The Express backend processing API requests on port `3004`.
*   `hisecure-nginx`: Reverse proxy serving HTTP/HTTPS requests.

---

## 6. Oracle Cloud Infrastructure (OCI) Deployment

To deploy on OCI Always Free Virtual Machines:

1.  **Provision Instance**: Create a compute VM using shape `VM.Standard.A1.Flex` (ARM Ampere Architecture, 2 cores, 12GB RAM, running Ubuntu or Oracle Linux).
2.  **Configure Security Lists**: Update your VCN Ingress Rules to allow traffic on ports `80` (HTTP) and `443` (HTTPS).
3.  **Install Docker & Compose**:
    ```bash
    sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
    sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    sudo systemctl start docker
    sudo systemctl enable docker
    ```
4.  **Execute Compose**: Clone the code, write `/server/.env` with production parameters, and execute:
    ```bash
    docker compose -f server/docker-compose.yml up -d
    ```

---

## 7. Coolify Deployment

Coolify is an open-source, self-hosted Heroku/Netlify alternative.

### Step 7.1: Add Resources
1. In the Coolify Dashboard, create a new Project and Environment.
2. Add a new **PostgreSQL Database** and a **Redis** service. Note down the internal connection URIs.

### Step 7.2: Deploy Backend Application
1. Add a **New Application** and select your GitHub repository.
2. Point the build path to `/server`.
3. Choose **Dockerfile** as the buildpack.
4. Define your Environment Variables:
   *   `DATABASE_URL`: Set to the Coolify-generated PostgreSQL internal URI.
   *   `REDIS_URL`: Set to the Coolify-generated Redis internal URI.
   *   `JWT_SECRET`: Generate a random secure hash.
   *   `NODE_ENV`: `production`.
5. Deploy the application. Coolify will automatically configure routing.

### Step 7.3: Deploy Frontend Application
1. Add a **New Application** pointing to the same repository.
2. Point the build path to `/client`.
3. Choose **Static (Vite/React)** or **Nginx** buildpack.
4. Set the Destination Port to `80` or `5173`.
5. Deploy. Coolify will host your UI and hook it up to your chosen domain.
