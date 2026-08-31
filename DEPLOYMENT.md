CodeGuard AI — Final Deployment Checklist

Backend

Set NODE_ENV=production

Set PORT

Set production MONGODB_URI

Set strong JWT_ACCESS_SECRET

Set different strong JWT_REFRESH_SECRET

Set production FRONTEND_URL

Set GEMINI_API_KEY

Set GEMINI_MODEL

Set any required scanner-service URL

Confirm .env is not committed

Confirm production CORS allows only intended frontend origin(s)

Use HTTPS

Run npm start

Verify /health

Frontend

Set production VITE_API_URL

Run npm ci or npm install

Run npm run build

Deploy dist/

Confirm frontend uses HTTPS backend URL

Confirm SPA route fallback is configured

Git Finalization

Run from the repository root:

git status
git diff --check
git check-ignore .env
git ls-files | findstr /I ".env"

Expected:

git diff --check prints nothing.

.env is ignored.

.env itself is not returned by git ls-files.

Review changes:

git diff

Then stage only intended project files:

git add back-end front-end README.md DEPLOYMENT.md
git status

Commit:

git commit -m "finalize CodeGuard AI security review platform"

Push only when ready:

git push origin main

Final Production Smoke Test

Register

Login

Token refresh

Logout

Protected route blocked after logout

Create project

Scan vulnerable Python

Scan vulnerable JavaScript

Scan Java

Scan C/C++

Verify false-positive eval string test

Apply safe fixes

Verify secured code

History works

Reports/PDF works

Saved Findings works

Security Trends works

Settings persist

Password/security controls work

Dark/light themes work

Mobile/tablet/desktop layouts work

Browser console has no critical errors

Backend logs have no unexpected errors