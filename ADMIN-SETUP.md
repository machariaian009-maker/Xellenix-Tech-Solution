# Xellenix Tech Solution — Admin Installation & Hosting Guide

## Overview
This guide describes how to install, configure, run, and administer the Xellenix Tech Solution website and backend.

The project includes:
- Static website pages in the root folder
- Admin pages in `admin/`
- Node.js/Express backend in `backend/`
- MySQL database support for customer website requests
- JWT-based admin authentication for protected lead management

## Prerequisites
Make sure the hosting machine has:
- Node.js 18+ installed
- npm available
- MySQL server installed and running
- A browser to access the admin UI

## Setup Steps

### 1. Clone or copy the project
Place the repository in a folder such as:

```powershell
C:\Users\Ghost\Desktop\Xellenix Tech Solution
```

### 2. Install backend dependencies
Open a terminal in `backend/` and run:

```powershell
cd "C:\Users\Ghost\Desktop\Xellenix Tech Solution\backend"
npm install
```

### 3. Configure the database
Create or confirm a MySQL database for the website:

```sql
CREATE DATABASE xellenix_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Update the `backend/.env` file with your database settings.
If you do not have a `.env` file yet, copy the example:

```powershell
cd "C:\Users\Ghost\Desktop\Xellenix Tech Solution\backend"
copy .env.example .env
```

Then edit `.env` to set real values.

### 4. Environment variables
The backend uses environment configuration from `backend/.env`.

Required values:
- `DB_HOST` — MySQL host (usually `localhost`)
- `DB_USER` — database username
- `DB_PASSWORD` — database password
- `DB_NAME` — database name (`xellenix_db`)
- `DB_PORT` — MySQL port (default `3306`)
- `PORT` — backend port (`5000` by default)
- `JWT_SECRET` — random secret used to sign admin tokens
- `ADMIN_EMAIL` — admin login email
- `ADMIN_PASSWORD_HASH` — bcrypt hash of the admin password

Example `.env`:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=xellenix_db
DB_PORT=3306
PORT=5000
JWT_SECRET=ChangeThisJWTSecret123!
ADMIN_EMAIL=admin@xellenixtech.com
ADMIN_PASSWORD_HASH=$2a$10$.uDDCKpxFmtvMMkE9Kw4CuCJQ23QhKIC0n7AVWT1fvnzdSmnrPZWS
```

> The current admin account configured in `backend/.env` is:
> - Email: `admin@xellenixtech.com`
> - Password: `XellenixAdmin!2026`

### 5. Generate a new admin password hash (recommended)
For production, generate a new bcrypt hash instead of using the default.
Use Node in the backend folder:

```powershell
cd "C:\Users\Ghost\Desktop\Xellenix Tech Solution\backend"
node -e "const bcrypt=require('bcryptjs'); console.log(bcrypt.hashSync('YourNewPassword123!',10));"
```

Replace `ADMIN_PASSWORD_HASH` in `.env` with the output.

## Run the backend
Start the backend server from `backend/`:

```powershell
cd "C:\Users\Ghost\Desktop\Xellenix Tech Solution\backend"
npm start
```

The server listens on `http://localhost:5000` by default.

### What happens at startup
- The backend connects to MySQL using `backend/db.js`
- It creates or updates the `website_requests` table schema
- Admin routes and public request endpoints are made available

## Website hosting
The static website files are served separately from the backend.

### Local access
Open these files directly in a browser or use a static host:
- `index.html` — main landing page
- `request.html` — customer request form
- `admin/login.html` — admin login page
- `admin/dashboard.html` — admin dashboard page

### Backend API endpoints
The backend exposes these endpoints:
- `GET /` — API status check
- `POST /api/requests` — public customer request submission
- `POST /api/admin/login` — admin login
- `GET /api/admin/validate` — verify admin token
- `GET /api/requests` — protected list leads
- `GET /api/requests/:id` — protected get lead detail
- `PUT /api/requests/:id` — protected update status/notes
- `DELETE /api/requests/:id` — protected delete a request

## Admin usage

### Admin login
1. Open `admin/login.html` in the browser.
2. Enter the configured admin email and password.
3. If login succeeds, you are redirected to `admin/dashboard.html`.

### Admin dashboard actions
From `admin/dashboard.html` you can:
- view all leads
- filter by lead status
- search by customer/business/email/phone/package/message
- open lead details
- update lead `status`
- add or edit `notes`
- delete a lead permanently
- refresh the lead list
- logout

### Token handling
- The dashboard stores the JWT token in browser `localStorage` under `xellenix_admin_token`.
- If the token expires or becomes invalid, the dashboard redirects back to login.

## Production hosting recommendations

### Option 1: Host static files separately
- Serve static files from a web server or static host.
- Keep the backend running on a server or container.
- Ensure the frontend calls the backend on the correct origin.

### Option 2: Use a reverse proxy
If hosting with Nginx or Apache, proxy requests to the backend:
- static requests → website files
- API requests → `http://localhost:5000`

Example Nginx rule snippet:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:5000;
}
```

### Secure production setup
- Use a strong unique value for `JWT_SECRET`
- Never commit `.env` with real secrets to source control
- Use HTTPS for admin login and dashboard access
- Use a secure admin password and change it regularly
- Use a firewall to protect the backend server

## Troubleshooting

### Backend fails to start
- Confirm MySQL is running
- Confirm `.env` values are correct
- Check the backend log output in the terminal

### Admin login fails
- Confirm `ADMIN_EMAIL` matches exactly
- Confirm the app uses the correct password for the given hash
- Generate a new hash if needed and update `.env`

### Dashboard shows empty results
- Confirm there are submitted requests in `website_requests`
- Confirm the token is valid and the backend is reachable
- Refresh the page or click the refresh button

## File references
- Backend server: `backend/server.js`
- Database connection: `backend/db.js`
- Environment example: `backend/.env.example`
- Admin login page: `admin/login.html`
- Admin dashboard page: `admin/dashboard.html`

## Final notes
This guide covers installation, admin login, and hosting for the website and backend. For production deployment, secure your environment and replace default admin credentials with a custom admin account.
