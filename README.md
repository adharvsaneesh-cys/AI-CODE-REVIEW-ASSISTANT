CodeGuard AI — AI Code Review Assistant

CodeGuard AI is a full-stack secure code review platform that combines deterministic local static analysis with AI-assisted review to detect security weaknesses, explain risks, suggest safer alternatives, and help verify remediated code.

Core Capabilities

JWT-based authentication with access-token refresh

Secure project-based scan management

Local static security scanner

AI-assisted review using Google Gemini

Multi-language support for Python, JavaScript/TypeScript, Java, C, and C++

OWASP Top 10:2025 and CWE mapping

Security score and severity analytics

Vulnerability highlighting in Monaco Editor

Safe deterministic remediation for supported findings

Fix-all-safe-issues workflow

Verify secured code with a fresh scan

Scan history and recent scans

Project-specific security trends

Saved findings

PDF security reports

Configurable scan profiles and severity thresholds

Dark/light theme

Responsive dashboard

Account security controls

Technology Stack

Frontend

React

Vite

React Router

Monaco Editor

Recharts

jsPDF

html2canvas

Backend

Node.js

Express

MongoDB Atlas

Mongoose

JWT authentication

bcrypt

Helmet

express-rate-limit

CORS

Google Gemini API

High-Level Architecture

React / Vite Frontend
        |
        | HTTPS / REST API
        v
Node.js / Express Backend
        |
        +---- Authentication / JWT
        |
        +---- Project & Scan APIs
        |
        +---- Local Static Scanner
        |
        +---- Gemini AI Review
        |
        v
MongoDB Atlas

The local scanner is the primary deterministic security-analysis layer. Gemini provides a secondary contextual review. A Gemini failure does not prevent the local scanner from returning results.

Supported Languages

Python

JavaScript

TypeScript

Java

C

C++

Language-aware filtering prevents language-specific rules from being applied to unrelated source languages.

Scanner Profiles

Quick

Runs a smaller set of higher-priority security rules for faster feedback.

Balanced

Default profile. Detects meaningful security findings while excluding lower-value informational noise.

Deep

Runs the full enabled rule set for the selected language.

Severity Levels

Critical

High

Medium

Low

Info

The minimum severity can be configured from Settings.

Security Scoring

The local scanner calculates a score from 0–100 based on displayed findings and their severities.

Typical penalties:

Critical: 25
High:     15
Medium:    8
Low:       3
Info:      1

Scores are bounded between 0 and 100.

Security Standards

Findings can include:

OWASP Top 10:2025 category

CWE identifier

Severity

Confidence

Source line

Explanation

Secure recommendation

The project does not claim complete coverage of every OWASP category or every CWE.

Static Scanner Examples

Examples of detectable weaknesses include:

Hardcoded passwords and secrets

Unsafe eval() / dynamic execution

Command injection patterns

SQL injection patterns

Weak cryptographic hashes

Insecure random-number generation

Disabled TLS certificate verification

Unsafe deserialization

Cross-site scripting sinks

Path traversal patterns

Overly permissive CORS

Sensitive-data logging

Weak Java cryptography

Unsafe Java process execution

Unsafe C/C++ buffer functions

C/C++ command injection

C/C++ format-string vulnerabilities

The scanner includes false-positive hardening so execution keywords inside ordinary comments or string literals do not automatically become executable-code findings.

Authentication and Security

The backend includes:

JWT access tokens

Refresh-token flow

HTTP-only refresh cookies

Password hashing with bcrypt

Protected API routes

Helmet security headers

Restricted CORS

API rate limiting

Request-size limits

Centralized error handling

Production error-message hiding

Environment-variable validation

Disabled X-Powered-By

Project Structure

AI-Code-Review-Assistant/
├── back-end/
│   ├── Src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   └── services/
│   ├── server.js
│   └── package.json
│
└── front-end/
    ├── src/
    │   ├── components/
    │   ├── context/
    │   ├── pages/
    │   ├── routes/
    │   └── services/
    ├── public/
    └── package.json

Environment Variables

Create a .env file in the backend project. Do not commit it.

Example:

NODE_ENV=development
PORT=8001

MONGODB_URI=your_mongodb_connection_string

JWT_ACCESS_SECRET=replace_with_a_long_random_secret
JWT_REFRESH_SECRET=replace_with_a_different_long_random_secret

FRONTEND_URL=http://localhost:5173

PYTHON_SCANNER_URL=your_scanner_service_url_if_used

GEMINI_API_KEY=your_google_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash

Use production-specific secrets and URLs in the deployment environment.

Local Development

1. Clone the repository

git clone <your-repository-url>
cd AI-Code-Review-Assistant

2. Start the backend

cd back-end
npm install
npm run dev

Backend:

http://localhost:8001

Health endpoint:

http://localhost:8001/health

3. Start the frontend

Open another terminal:

cd front-end
npm install
npm run dev

Frontend:

http://localhost:5173

Production Build

Frontend

cd front-end
npm run build
npm run preview

Vite production preview normally runs on:

http://localhost:4173

Backend

Set NODE_ENV=production in the deployment environment and run:

cd back-end
npm start

Do not place production secrets directly in source code.

Production Configuration

Before deployment:

Set NODE_ENV=production.

Use a strong production JWT_ACCESS_SECRET.

Use a different strong JWT_REFRESH_SECRET.

Set the production MongoDB Atlas URI.

Set the production Gemini API key.

Set FRONTEND_URL to the real frontend domain.

Update the backend CORS allowlist for the production frontend origin.

Use HTTPS.

Configure secure environment variables on the hosting provider.

Never commit .env.

Final Smoke Test

Before presenting or deploying, verify:

Authentication
[ ] Register
[ ] Login
[ ] Access-token refresh
[ ] Logout
[ ] Protected API rejection while logged out

Projects
[ ] Create project
[ ] Select project
[ ] Delete project
[ ] Scan history stays associated with correct project

Scanner
[ ] Python scan
[ ] JavaScript scan
[ ] Java scan
[ ] C/C++ scan
[ ] Correct language-specific findings
[ ] No cross-language findings
[ ] Actual eval(userInput) is detected
[ ] "eval()" inside harmless prompt text is not detected

Remediation
[ ] Apply single safe fix
[ ] Fix All Safe Issues
[ ] Verify Secured Code
[ ] Save secured source

Dashboard
[ ] Security score
[ ] Severity counts
[ ] Finding cards
[ ] AI review
[ ] Recent scans

Other Pages
[ ] History
[ ] Reports / PDF
[ ] Projects
[ ] Saved Findings
[ ] Security Trends
[ ] Settings
[ ] Security / password controls

UI
[ ] Dark mode
[ ] Light mode
[ ] Mobile
[ ] Tablet
[ ] Desktop
[ ] No critical browser-console errors

Testing Status

The project has been manually tested for:

Authentication and session refresh

Protected backend routes

Git-secret protection

CORS behavior

Helmet headers

Rate limiting

Backend request-size handling

Scanner regression behavior

Multi-language isolation

Project data integrity

Frontend production build

Production preview

Responsive UI

Theme persistence

Scanner false-positive handling

Demonstration Scenario

A concise demo can use vulnerable Python code such as:

import hashlib
import requests
import pickle
import os

password = "admin123"

user_input = input("Command: ")

eval(user_input)
os.system(user_input)

hashlib.md5(b"password")

requests.get(
    "https://example.com",
    verify=False
)

pickle.loads(user_input)

CodeGuard can identify the hardcoded credential, dynamic execution, shell execution, weak hashing, disabled TLS verification, and unsafe deserialization.

For false-positive validation:

const prompt =
  "Explain why eval() is dangerous in Python.";

This should not be reported as actual eval() execution.

Known Limitations

The local scanner is primarily rule/regex-based and is not a full compiler, parser, SAST engine, or symbolic-execution engine.

Complex data-flow vulnerabilities may require deeper semantic analysis.

AI output can vary and should be treated as advisory.

Automatic fixes are offered only when a deterministic replacement is considered safe.

OWASP/CWE mappings are guidance and not formal certification.

Security score is a project-defined heuristic, not an industry certification score.

Future Scope

Possible future work, if the project is extended later:

AST-based scanning

Interprocedural data-flow analysis

GitHub/GitLab integration

CI/CD security gates

Dependency vulnerability scanning

SARIF export

Team workspaces and RBAC

Incremental scanning

These are intentionally outside the current stable project scope.

Author

Adharv S Aneesh

B.Tech CSE — Cyber Security

Disclaimer

CodeGuard AI is intended to assist secure-code review. It should complement, not replace, professional security testing, code review, dependency analysis, penetration testing, and secure development practices.