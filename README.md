# Xellenix Tech Solution — Local Development & Deployment

Project: Xellenix Tech Solution (website + Express API + MySQL)

Purpose: Provide setup, environment, and run instructions for developers.

Prerequisites
- Node.js 18+ and npm
- MySQL server
- Optional: SMTP account for email notifications

Quick start (backend)

1. Copy environment example and fill values:

```bash
cp backend/.env.example backend/.env
# Edit backend/.env and provide secure values (DB, JWT_SECRET, ADMIN_PASSWORD_HASH, SMTP_*).
```

2. Install dependencies and start the API:

```bash
cd backend
npm install
npm start
```

Notes about admin password and authentication

- The backend expects a bcrypt hash in `ADMIN_PASSWORD_HASH` (do NOT store plaintext passwords).
- To generate a bcrypt hash locally (example):

```bash
node -e "const bcrypt=require('bcryptjs'); console.log(bcrypt.hashSync('YourNewPassword123!',12));"
```

- Alternatively, use the one-time setup endpoint to set a password hash in memory (useful during initial setup):

  1. Set `SETUP_TOKEN` in `backend/.env` to a random secret.
  2. Start the backend.
  3. Call the endpoint (replace values):

```bash
curl -X POST http://localhost:5000/api/admin/set-password \
  -H "Content-Type: application/json" \
  -H "x-setup-token: your_setup_token_here" \
  -d '{"password":"YourNewPassword123!"}'
```

After using `SETUP_TOKEN`, remove or rotate it and persist the bcrypt hash into `ADMIN_PASSWORD_HASH` in production.

Environment variables (see `backend/.env.example`)
- `PORT` — API port
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` — MySQL settings
- `JWT_SECRET` — strong random secret for signing tokens
- `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` — admin email and bcrypt hash
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `ADMIN_NOTIFICATION_EMAIL` — for email notifications
- `FRONTEND_URL` — allowed frontend origin(s) (comma-separated)
- `SETUP_TOKEN` — one-time setup token (remove after use)

Frontend dev

- The frontend is static HTML/CSS/JS. You can open `index.html` in a browser for quick testing, or serve it via a simple static server:

```bash
# from project root
npx http-server -c-1 .
```

- Ensure `window.API_BASE_URL` points to your running API. In development, this is automatically set when you open pages locally.

Running tests (manual)

- Submit a sample request to test the full flow (replace host if needed):

```bash
curl -X POST http://localhost:5000/api/requests \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test User","businessName":"Acme","email":"test@example.com","phone":"0712345678","businessType":"retail","websitePackage":"starter","message":"Hello"}'}
```

Deployment notes

- Use environment variables to configure production values (never commit real secrets).
- Run the API behind a reverse proxy (nginx) with HTTPS and strong TLS.
- Set `NODE_ENV=production` and set `FRONTEND_URL` to your production frontend domain.
- Ensure `JWT_SECRET` is a secure random string (e.g., 32+ characters).
- Configure SMTP credentials to enable admin notification emails.
- Use a managed MySQL instance with backups and secure access.

Security & operations

- `.env` and `backend/.env` are included in `.gitignore` — never commit secrets.
- After initial setup, rotate or remove `SETUP_TOKEN` and persist the `ADMIN_PASSWORD_HASH` in your environment.
- Admin tokens are short-lived (1 hour). Use secure, HttpOnly cookies when possible.
- Monitor logs for authentication failures and rate-limit events.

Where to look next
- `backend/server.js` — API routes, auth, email notifications
- `backend/db.js` — MySQL connection
- `admin/` — admin UI
- `request.html`, `js/script.js` — public request form

If you'd like, I can now:
- Add `README` sections for deployment to a specific host (Heroku, Railway, Azure Web App, or VPS + Nginx).
- Implement CSV export and pagination for the admin dashboard.
