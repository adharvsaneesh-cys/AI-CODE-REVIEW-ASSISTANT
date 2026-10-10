CodeGuard AI

CodeGuard AI is a hybrid AI-assisted secure code review platform that
combines a deterministic rule-based static security scanner with Google
Gemini AI-assisted review.

It supports individual source files and multi-file ZIP projects,
persistent per-file findings, Monaco-based code editing, verification,
security analytics, reporting, guarded remediation, and secured ZIP
generation.

Key Features

JWT authentication with refresh-token sessions

bcrypt password hashing and HTTP-only cookies

Project creation, selection, ownership and scan history

Deterministic rule-based static security scanning

Severity, confidence, OWASP and CWE mapping

0--100 security scoring

Quick, Balanced and Deep scan profiles

Google Gemini AI-assisted security review

Monaco Editor integration

Deterministic secure-fix workflow

Guarded remediation with before/after rescanning

Multi-language ZIP project scanning

Persistent per-file ZIP source storage

Per-file Gemini reviews

MongoDB GridFS original ZIP storage

Secured ZIP reconstruction and download

Recharts security analytics

jsPDF/html2canvas reports

Dark/light dashboard themes

Helmet, CORS, rate limiting and request-size protection

Supported Source Languages

CodeGuard currently supports:

JavaScript

TypeScript

Python

Java

C

C++

Technology Stack

Department              Technologies /          Main Use
Languages

Frontend                React, JavaScript, JSX  Building the user
interface

Styling                 CSS                     Design, responsiveness
and dark/light theme

Backend                 Node.js, Express.js,    APIs and server-side
JavaScript              processing

Database                MongoDB Atlas, Mongoose Users, projects, scans
and persisted data

Archive Storage         MongoDB GridFS          Original ZIP archive
storage

Authentication          JWT, bcrypt, Cookies    Login, password
security and sessions

Security Scanner        JavaScript, Regex /     Deterministic
Static Rules            vulnerability detection

AI Review               Google Gemini API       AI-assisted security
analysis and
remediation guidance

Code Editor             Monaco Editor           Viewing, editing and
fixing source code

Analytics               Recharts                Security scores, charts
and trends

Reports                 jsPDF, html2canvas      Security report
generation

API Security            Helmet, CORS, Rate      Protecting backend APIs
Limiting

Architecture

                       CodeGuard AI
                            |
             +--------------+--------------+
             |                             |
             v                             v
      React + Vite UI              Node.js + Express API
             |                             |
             |                 +-----------+-----------+
             |                 |                       |
             |                 v                       v
             |        Deterministic Scanner      Gemini AI
             |                 |                       |
             |                 +-----------+-----------+
             |                             |
             +-----------------------------+
                            |
                            v
                  MongoDB Atlas + Mongoose
                            |
                            v
                     MongoDB GridFS

Security Analysis Workflow

Source Code / ZIP
        |
        v
Deterministic Rule-Based Scan
        |
        v
Findings + Severity + Score
        |
        v
Gemini AI-Assisted Review
        |
        v
Monaco Editor
        |
        v
Edit / Apply Secure Fix
        |
        v
Deterministic Verification
        |
        v
Persist Improved Source
        |
        v
Refresh Findings + AI Review

The deterministic scanner is the primary vulnerability-detection and
verification layer. Gemini provides contextual explanations, impact
analysis, remediation guidance and secure coding assistance.

Guarded Remediation

Automated fixes are validated before persistence.

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

Guarded remediation can reject candidates that increase deterministic
findings, worsen weighted severity, reduce the security score, fail to
remove the targeted vulnerability, or provide no meaningful improvement.

Manual verification remains available separately.

ZIP Project Analysis

ZIP scanning supports:

Safe archive inspection

ZIP-slip protection

Multi-language source discovery

Per-file deterministic scanning

Per-file issue counts and security scores

Per-file Gemini reviews

Persistent source storage

Source editing and verification

Original directory hierarchy preservation

Unsupported file and asset preservation

Supported source files are persisted individually with original/current
source, path, language, findings, score, verification state and AI
review data.

Secured ZIP Generation

The original uploaded ZIP is retained using MongoDB GridFS.

Original ZIP from GridFS
        |
        v
Read Original Entries
        |
        v
Replace Supported Source Entries
with Latest Persisted Source
        |
        v
Preserve Assets / Config / Docs
        |
        v
Generate Secured ZIP

This preserves the original project structure and non-source assets.

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
├── front-end/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── services/
│   │   └── styles/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
├── README.md
└── DEPLOYMENT.md

Installation

Clone the repository:

git clone <your-repository-url>
cd AI-Code-Review-Assistant

Backend

cd back-end
npm install

Create .env:

NODE_ENV=development
PORT=8001
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_ACCESS_SECRET=replace_with_a_long_random_secret
JWT_REFRESH_SECRET=replace_with_a_different_long_random_secret
FRONTEND_URL=http://localhost:5173
GEMINI_API_KEY=your_google_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash

Never commit .env.

Start:

npm run dev

Local backend:

http://127.0.0.1:8001

Health endpoint:

http://127.0.0.1:8001/health

Frontend

cd front-end
npm install
npm run dev

Local frontend:

http://localhost:5173

Production Build

cd front-end
npm run build

Vite generates the production build in dist/.

For complete deployment instructions, see DEPLOYMENT.md.

API

The backend API prefix is:

/api/v1

Major API areas include authentication, projects, source scans, ZIP
scans, ZIP project files, per-file AI review, verification, secured ZIP
download and scan history.

Protected resources enforce authenticated ownership where applicable.

Security Controls

CodeGuard includes:

JWT authentication

bcrypt password hashing

HTTP-only refresh cookies

Helmet

Restricted CORS

Rate limiting

Request-size protection

Authentication middleware

Ownership validation

Input validation

Production-safe error handling

Disabled X-Powered-By

Source size/line limits

ZIP archive limits

Safe ZIP paths

ZIP-slip protection

Scan Profiles

Quick uses a smaller high-value rule set for faster analysis.

Balanced provides a balance between coverage and performance.

Deep uses the broadest deterministic rule set for more comprehensive
analysis.

Minimum severity and AI-review settings can also be configured.

Database

MongoDB Atlas stores users, projects, scans, findings, scores, ZIP
project-file metadata, persisted source versions, AI reviews and
verification state.

Mongoose provides schemas and database access.

MongoDB GridFS stores original ZIP archives required for secured-project
reconstruction.

Testing Checklist

AUTHENTICATION
[ ] Register
[ ] Login
[ ] Token refresh
[ ] Logout
[ ] Protected routes

PROJECTS
[ ] Create/select/delete project
[ ] Ownership enforcement
[ ] Project scan history

SCANNING
[ ] Paste-code scan
[ ] Source-file scan
[ ] Findings
[ ] Security score
[ ] OWASP/CWE
[ ] Gemini review

ZIP PROJECTS
[ ] ZIP upload
[ ] Supported languages
[ ] Per-file findings
[ ] Per-file Gemini
[ ] File switching
[ ] Source persistence
[ ] Reopen ZIP scan

REMEDIATION
[ ] Apply Secure Fix
[ ] Deterministic verification
[ ] Improved fix accepted
[ ] Regression rejected
[ ] Findings/score updated
[ ] Gemini refreshed

SECURED ZIP
[ ] Download secured ZIP
[ ] Folder hierarchy preserved
[ ] Verified source included
[ ] Config/docs/assets preserved

REPORTING
[ ] Analytics
[ ] Trends
[ ] PDF report
[ ] Dark/light theme

Production Security

Never commit .env.

Never expose Gemini or MongoDB credentials to frontend code.

Use strong and different JWT secrets.

Use HTTPS in production.

Restrict CORS.

Keep Helmet and rate limiting enabled.

Keep request/upload limits enabled.

Enforce project, scan and file ownership.

Treat Gemini output as advisory.

Deterministically verify automated remediation.

Protect MongoDB Atlas and GridFS.

Never log passwords, tokens, secrets, cookies or private source
code.

Authors

Adharv S Aneesh

Dhammadeep M Ganvir

Utkarsh S Shamkuwar

Harsha Bhoge

Sakshi Kubade

Project Information

Project Name: CodeGuard AI
Project Type: AI-Assisted Secure Code Review Platform
Primary Security Engine: Deterministic Rule-Based Static Scanner
AI Layer: Google Gemini API
Frontend: React + Vite
Backend: Node.js + Express.js
Database: MongoDB Atlas + Mongoose
Archive Storage: MongoDB GridFS
Authentication: JWT + bcrypt + HTTP-only cookies
Code Editor: Monaco Editor
Analytics: Recharts
Reports: jsPDF + html2canvas

Disclaimer

CodeGuard AI is a security-analysis and developer-assistance platform.
Static-analysis rules and AI-generated guidance can produce false
positives, false negatives or incomplete remediation. Security-sensitive
software should also undergo appropriate testing, dependency analysis,
manual review and professional security assessment before production
deployment.