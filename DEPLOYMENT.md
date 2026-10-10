CodeGuard AI --- Deployment Guide

Current Architecture

React + Vite Frontend
        |
        | HTTPS / REST API
        v
Node.js + Express Backend
        |
        +---- MongoDB Atlas + Mongoose
        +---- MongoDB GridFS
        +---- Google Gemini API

CodeGuard AI uses React/Vite, Node.js/Express, MongoDB Atlas/Mongoose,
JWT authentication, a deterministic rule-based security scanner,
Gemini-assisted security review, Monaco Editor, multi-language ZIP
scanning, persistent per-file ZIP source storage, secured ZIP
generation, Recharts analytics, and jsPDF/html2canvas reporting.

Project Structure

AI-Code-Review-Assistant/
├── back-end/
│   ├── Src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   ├── server.js
│   ├── package.json
│   └── .env
└── front-end/
    ├── src/
    │   ├── components/
    │   ├── context/
    │   ├── hooks/
    │   ├── pages/
    │   ├── routes/
    │   ├── services/
    │   └── styles/
    ├── public/
    ├── package.json
    └── vite.config.js

Backend Environment Variables

Configure these on the production backend host. Never commit .env.

NODE_ENV=production
PORT=8001
MONGODB_URI=your_production_mongodb_atlas_uri
JWT_ACCESS_SECRET=your_long_random_access_secret
JWT_REFRESH_SECRET=your_different_long_random_refresh_secret
FRONTEND_URL=https://your-frontend-domain.com
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash

Configure production equivalents for any additional variables already
required by the local backend .env.

Never expose MongoDB credentials, Gemini keys, JWT secrets, or other
server credentials in frontend code.

Frontend Environment

The deployed frontend must call the deployed backend rather than
localhost.

Use the exact Vite variable name already expected by the frontend API
service. A typical value is:

VITE_API_URL=https://your-backend-domain.com/api/v1

Never place private secrets in VITE_ variables because they are
exposed to browser code.

MongoDB Atlas and GridFS

Use a production Atlas cluster with a dedicated database user, strong
password, appropriate network access, and the production connection
string.

CodeGuard stores original uploaded ZIP archives in MongoDB GridFS. The
ZIP archive bucket is:

codeguardZipArchives

GridFS retention allows secured ZIP generation to preserve unsupported
files, assets, configuration files, documentation, and the original
directory hierarchy while replacing supported source files with their
latest persisted versions.

Backend Deployment

Deploy the back-end directory.

npm install
npm start

Verify:

https://your-backend-domain.com/health

API prefix:

/api/v1

The backend must respect the hosting provider's supplied port when
applicable.

Frontend Deployment

Deploy the front-end directory.

npm install
npm run build

Vite output:

dist

Publish dist and configure SPA fallback to index.html.

CORS and Authentication Cookies

Production requirements:

HTTPS enabled.

FRONTEND_URL matches the exact production frontend origin.

CORS restricted to approved origins.

Credentials enabled only where needed.

Refresh-token cookies remain HTTP-only.

Secure cookies enabled in production.

Correct SameSite behavior for the deployed frontend/backend domain
arrangement.

Browser requests that depend on cookies send credentials.

CodeGuard uses JWT, bcrypt, and refresh-token cookies. Use strong,
different access and refresh JWT secrets and never log tokens or
secrets.

API Security

Keep these protections enabled:

Helmet

Restricted CORS

Rate limiting

Request-size protection

Authentication middleware

Ownership checks

Input validation

Production-safe error handling

Disabled X-Powered-By

Do not expose production stack traces or database internals.

Security Scanner

CodeGuard is a hybrid security-analysis system. Its primary
vulnerability detection is a deterministic rule-based static scanner
using JavaScript and regex/static-analysis rules.

It provides language-aware findings, severity, confidence, OWASP/CWE
mapping, and security scoring.

ZIP source scanning currently supports:

JavaScript

TypeScript

Python

Java

C

C++

Gemini is the AI-assisted layer and does not replace deterministic
verification.

Gemini AI Review

Keep the Gemini API key on the backend only.

Gemini provides security explanations, impact analysis, remediation
guidance, secure examples, and AI-assisted review.

The deterministic scanner must remain operational when Gemini is
unavailable.

Guarded Remediation

Automated fixes must be rescanned before persistence.

Candidate Fix
     |
     v
Deterministic Re-scan
     |
     v
Compare Before / After
     |
     +---- Regression / target remains ---> REJECT
     |
     +---- Valid improvement -------------> ACCEPT
                                                |
                                                v
                                         Persist source
                                                |
                                                v
                                         Replace findings
                                                |
                                                v
                                         Refresh AI review

Guarded remediation should reject a candidate when it increases
deterministic findings, increases weighted severity, decreases security
score, fails to remove the targeted rule, or produces no meaningful
improvement during a fix-all operation.

A rejected candidate must not overwrite the last verified source.

Manual verification remains separate from guarded automatic remediation.

ZIP Project Security

Production ZIP handling must maintain:

Safe normalized paths

ZIP-slip protection

Upload limits

Extracted-size limits

Source size and line limits

Supported-language filtering

Per-file deterministic scanning

Per-file source persistence

Original archive retention in GridFS

User/scan ownership checks

Safe secured-ZIP generation

Never trust archive paths supplied by uploaded ZIP files.

Secured ZIP Generation

Original ZIP from GridFS
        |
        v
Read archive entries
        |
        v
Replace supported source entries
with latest persisted currentCode
        |
        v
Preserve unsupported files/assets
        |
        v
Generate secured archive

Expected output name:

project-codeguard-secured.zip

This preserves configuration/JSON, README/documentation, assets,
unsupported files, and the original directory hierarchy.

Production Logging

Safe operational logging can include server startup, database
connection, scan completion, ZIP processing, authentication rejection,
and Gemini failures.

Never log passwords, JWT secrets, refresh tokens, Gemini keys, MongoDB
credentials, sensitive cookies, or complete private source code.

Backend Pre-deployment Check

From back-end:

npm install
node --check server.js
node --check ./Src/controllers/scan.controller.js
npm start

Windows PowerShell:

node --check .\Src\controllers\scan.controller.js
npm start

Frontend Pre-deployment Check

From front-end:

npm install
npm run build

Optional local production preview:

npm run preview

Production Smoke Test

BACKEND
[ ] Backend starts
[ ] MongoDB connects
[ ] /health works
[ ] Production environment loads
[ ] CORS is correct

AUTHENTICATION
[ ] Register
[ ] Login
[ ] Protected API access
[ ] Token refresh
[ ] Logout
[ ] Logout all sessions
[ ] Logged-out requests are rejected

PROJECTS
[ ] Create/select/delete project
[ ] Ownership is enforced
[ ] Scan history belongs to correct project

SCANNING
[ ] Paste-code scan
[ ] Source-file upload
[ ] Deterministic findings
[ ] Security score
[ ] OWASP/CWE mapping
[ ] Gemini review
[ ] Manual verification

ZIP PROJECTS
[ ] ZIP upload
[ ] Supported files detected
[ ] Unsupported assets preserved
[ ] Directory hierarchy preserved
[ ] File switching works
[ ] Per-file findings work
[ ] Per-file Gemini review works
[ ] Edited source persists
[ ] Reopened scan loads persisted source

GUARDED REMEDIATION
[ ] Apply Secure Fix
[ ] Candidate is deterministically rescanned
[ ] Improved candidate is accepted
[ ] Regression is rejected
[ ] Target rule is removed
[ ] Rejected candidate does not overwrite verified source
[ ] Accepted fix updates findings and score
[ ] Gemini refreshes after accepted verification

SECURED ZIP
[ ] Download secured ZIP
[ ] ZIP opens successfully
[ ] Verified source is present
[ ] Unmodified source remains intact
[ ] Config/JSON remains intact
[ ] README remains intact
[ ] Assets remain intact
[ ] Folder hierarchy remains intact
[ ] Secured ZIP can be rescanned

REPORTING
[ ] Analytics render
[ ] Trends work
[ ] PDF report works
[ ] Dark/light theme works

Final Deployment Checklist

[ ] NODE_ENV=production
[ ] Production MongoDB URI configured
[ ] Strong JWT access secret configured
[ ] Different JWT refresh secret configured
[ ] Gemini key configured on backend only
[ ] Correct FRONTEND_URL
[ ] Frontend points to production API
[ ] HTTPS enabled
[ ] CORS restricted
[ ] Production cookie behavior tested
[ ] Helmet enabled
[ ] Rate limiting enabled
[ ] Request limits enabled
[ ] Atlas network access configured
[ ] GridFS archive storage tested
[ ] Backend health endpoint works
[ ] Frontend npm run build passes
[ ] Authentication tested
[ ] Multi-language scanning tested
[ ] ZIP scanning tested
[ ] Per-file Gemini review tested
[ ] Guarded remediation tested
[ ] Secured ZIP tested
[ ] Reports tested
[ ] No secrets committed to Git

Recommended Production Layout

https://codeguard.example.com
        |
        | HTTPS
        v
https://api.codeguard.example.com
        |
        +---- MongoDB Atlas
        +---- MongoDB GridFS
        +---- Google Gemini API

Provider-generated HTTPS domains are also valid. Update frontend API
configuration, FRONTEND_URL, CORS, and cookie settings to match the
actual deployed domains.

Important Production Notes

Do not use localhost URLs in production.

Do not commit .env.

Do not expose Gemini, MongoDB, or JWT secrets to the browser.

Do not disable authentication or ownership checks for production
debugging.

Gemini output is advisory; deterministic scanning remains
authoritative.

Automated remediation must be deterministically rescanned before
acceptance.

Preserve the original ZIP while secured ZIP generation depends on
it.

Test cross-origin authentication after deployment.

Test using the real deployed URLs.

Keep dependencies and the Node.js runtime maintained and supported.

Project: CodeGuard AI --- AI Code Review Assistant
Architecture: Hybrid deterministic rule-based static security
scanner + Gemini-assisted security review
Frontend: React + Vite
Backend: Node.js + Express
Database: MongoDB Atlas + Mongoose + GridFS
Authentication: JWT + bcrypt + HTTP-only cookies