# Deploying HRMS to https://unizova.com/hrms

## 1. MongoDB Atlas
1. Create a free cluster at https://cloud.mongodb.com
2. Database Access -> add a user + password.
3. Network Access -> add your VPS public IP.
4. Connect -> Drivers -> copy the `mongodb+srv://...` string (add `/hrms` before `?`).

## 2. First-time server setup (SSH into the VPS)
```bash
# Node 20 + PM2 (skip if already installed: node -v)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git
sudo npm install -g pm2

# Code
sudo mkdir -p /var/www && sudo chown $USER /var/www
git clone https://github.com/balamurugesan03/hrms.git /var/www/hrms

# Backend
cd /var/www/hrms/backend
npm ci --omit=dev
cp .env.production.example .env
nano .env            # fill MONGODB_URI, JWT secrets (openssl rand -hex 48), SMTP
npm run seed         # ONCE ONLY - creates admin@hrms.com / Admin@123 (wipes users!)

# Frontend
cd /var/www/hrms/frontend
npm ci
npm run build        # outputs dist/ with /hrms/ base path

# Run API forever
pm2 start /var/www/hrms/deploy/ecosystem.config.js
pm2 save
pm2 startup          # run the command it prints
```

## 3. nginx
Add the blocks from `deploy/nginx-hrms.conf` inside the existing unizova.com
`server { }` block (the one with `listen 443 ssl`), then:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

## 4. Verify
- https://unizova.com/hrms/api/health -> `{"status":"OK",...}`
- https://unizova.com/hrms/ -> login page
- Log in as admin@hrms.com / Admin@123 and **change the password immediately**.

## Updating later
```bash
cd /var/www/hrms && git pull
cd backend && npm ci --omit=dev && pm2 restart hrms-api
cd ../frontend && npm ci && npm run build
```
