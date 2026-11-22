
# 🛡️ CodeGuard AI
### AI-Assisted Secure Code Review and Vulnerability Detection Platform

CodeGuard AI is a hybrid AI-assisted secure code review platform designed to help developers identify, understand, and fix security vulnerabilities in their source code.

It combines a **deterministic rule-based static security scanner** with **Google Gemini AI** to provide vulnerability detection, contextual explanations, security recommendations, and remediation guidance.

The platform supports individual source files and multi-file ZIP projects, offering persistent security findings, an integrated Monaco code editor, automated verification, security analytics, PDF reports, and secured ZIP generation.

---

## 🚀 Key Features

- **Secure Authentication:** JWT authentication with refresh-token sessions, bcrypt password hashing, and HTTP-only cookies.
- **Project Management:** Create, manage, and maintain projects with scan history.
- **Static Code Analysis:** Rule-based scanning to identify potential security vulnerabilities.
- **AI-Assisted Code Review:** Google Gemini integration for contextual vulnerability explanations and remediation suggestions.
- **Security Scoring:** Security scores ranging from 0–100.
- **OWASP & CWE Mapping:** Categorization of security issues using relevant security standards.
- **Multiple Scan Profiles:** Quick, Balanced, and Deep scanning options.
- **Integrated Code Editor:** Monaco Editor for viewing and modifying source code.
- **Secure Remediation:** Guarded fixes with before-and-after verification.
- **Multi-File ZIP Scanning:** Analyze multiple source files within a single ZIP project.
- **Persistent Findings:** Store per-file findings, source versions, verification states, and AI reviews.
- **Security Analytics:** Interactive dashboards and visualizations using Recharts.
- **PDF Reports:** Generate downloadable security reports.
- **Secured ZIP Generation:** Reconstruct ZIP projects with verified source changes while preserving the original directory structure.
- **Dark and Light Themes:** Theme support for a better user experience.

---

## 💻 Supported Programming Languages

- JavaScript
- TypeScript
- Python
- Java
- C
- C++

---

## 🛠️ Technology Stack

| Component | Technologies |
|---|---|
| Frontend | React, Vite, JavaScript, JSX |
| Styling | CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas, Mongoose |
| Archive Storage | MongoDB GridFS |
| Authentication | JWT, bcrypt, HTTP-only Cookies |
| Security Scanner | JavaScript, Regex-based Static Rules |
| AI Integration | Google Gemini API |
| Code Editor | Monaco Editor |
| Analytics | Recharts |
| Report Generation | jsPDF, html2canvas |
| API Security | Helmet, CORS, Rate Limiting |
| Version Control | Git, GitHub |

---

## 🏗️ System Architecture

CodeGuard AI follows a client-server architecture in which the React frontend communicates with the Node.js and Express backend.

The backend coordinates deterministic security scanning, AI-assisted analysis, authentication, and database operations.

```text
                  CODEGUARD AI
                       |
           +-----------+-----------+
           |                       |
           v                       v
      React + Vite UI       Node.js + Express API
           |                       |
           |              +--------+--------+
           |              |                 |
           |              v                 v
           |       Static Scanner       Gemini AI
           |              |                 |
           |              +--------+--------+
           |                       |
           +-----------------------+
                       |
                       v
                MongoDB Atlas
                       |
                       v
                 MongoDB GridFS
```

---

## 🔍 Security Analysis Workflow

1. **Source Code Input:** Developers upload individual source files or ZIP projects.
2. **Deterministic Scanning:** The rule-based scanner analyzes source code for potential vulnerabilities.
3. **Finding Generation:** Security findings are categorized by severity, confidence, OWASP/CWE mapping, and security score.
4. **AI-Assisted Review:** Google Gemini provides contextual explanations, impact analysis, and remediation guidance.
5. **Code Editing:** Developers can inspect and modify source code using the integrated Monaco Editor.
6. **Secure Remediation:** Suggested fixes can be evaluated through the guarded remediation workflow.
7. **Verification:** The deterministic scanner re-scans modified code to validate improvements.
8. **Persistence:** Verified source changes and updated findings are stored for future access.

**Note:** The deterministic scanner acts as the primary vulnerability-detection and verification layer. Gemini AI provides additional contextual analysis and developer assistance.

---

## 🔐 Guarded Remediation

CodeGuard AI includes a guarded remediation workflow to validate candidate security fixes before saving them.

```text
        Candidate Fix
              |
              v
      Deterministic Re-scan
              |
              v
       Before/After Comparison
              |
        +-----+------+
        |            |
        v            v
     Invalid       Valid
        |            |
        v            v
      Reject       Accept
                     |
                     v
               Persist Source
                     |
                     v
              Update Findings
                     |
                     v
               Refresh AI Review
```

The system can reject candidate fixes that:

- Increase the number of deterministic findings.
- Worsen weighted security severity.
- Reduce the security score.
- Fail to remove the targeted vulnerability.
- Provide no meaningful security improvement.

Manual verification is also available separately.

---

## 📦 Multi-File ZIP Project Analysis

CodeGuard AI supports security analysis of complete ZIP-based projects.

Key capabilities include:

- Safe ZIP archive inspection.
- ZIP-slip protection.
- Multi-language source file discovery.
- Per-file deterministic security scanning.
- Individual file findings and security scores.
- Per-file Gemini AI reviews.
- Persistent source-code storage.
- Source editing and verification.
- Original directory hierarchy preservation.
- Preservation of unsupported files, configuration files, documentation, and other assets.

The platform maintains individual source files with their paths, languages, original and current source versions, findings, scores, verification states, and AI review data.

### Secured ZIP Generation

The original uploaded ZIP archive is stored using MongoDB GridFS.

When generating a secured ZIP:

1. Retrieve the original archive.
2. Read the original ZIP entries.
3. Replace supported source files with their latest persisted versions.
4. Preserve the original project structure and other assets.
5. Generate the secured ZIP for download.

This allows developers to obtain an updated project archive without losing unrelated files.

---

## 📊 Security Analytics and Reporting

The platform provides a dashboard to help developers understand their project's security status.

It includes:

- Overall security scores.
- Vulnerability severity distribution.
- Security findings and trends.
- Project scan history.
- Interactive visualizations.
- Downloadable PDF security reports.

---

## ⚙️ Installation and Setup

### Prerequisites

- Node.js and npm
- MongoDB Atlas account
- Google Gemini API key
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/adharvsaneesh-cys/AI-CODE-REVIEW-ASSISTANT.git

cd AI-CODE-REVIEW-ASSISTANT
```

### 2. Backend Setup

Navigate to the backend directory:

```bash
cd back-end
npm install
```

Create a `.env` file inside the `back-end` directory:

```env
NODE_ENV=development
PORT=8001

MONGODB_URI=your_mongodb_atlas_connection_string

JWT_ACCESS_SECRET=your_access_token_secret
JWT_REFRESH_SECRET=your_refresh_token_secret

FRONTEND_URL=http://localhost:5173

GEMINI_API_KEY=your_google_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

Start the backend server:

```bash
npm run dev
```

Backend URL:

```text
http://127.0.0.1:8001
```

Health Check:

```text
http://127.0.0.1:8001/health
```

### 3. Frontend Setup

Open another terminal and navigate to the frontend directory:

```bash
cd front-end
npm install
```

Start the frontend development server:

```bash
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

### 4. Production Build

To generate the frontend production build:

```bash
cd front-end
npm run build
```

Vite generates the production build inside the `dist/` directory.

For detailed deployment instructions, refer to [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## 🔗 API Overview

The backend API uses the following base prefix:

```text
/api/v1
```

Major API areas include:

- Authentication
- Project management
- Source-code scanning
- ZIP project scanning
- ZIP project file management
- Per-file AI reviews
- Security verification
- Secured ZIP downloads
- Scan history

Protected resources enforce authenticated project ownership where applicable.

---

## 🛡️ Security Measures

Security is an important part of CodeGuard AI itself.

The platform incorporates:

- JWT authentication.
- bcrypt password hashing.
- HTTP-only refresh cookies.
- Helmet security headers.
- Restricted CORS configuration.
- Rate limiting.
- Request-size protection.
- Authentication middleware.
- Project and file ownership validation.
- Input validation.
- Production-safe error handling.
- ZIP archive limits and safe path validation.
- ZIP-slip protection.
- Source-code size and line limits.

---

## 📁 Project Structure

```text
AI-CODE-REVIEW-ASSISTANT/
│
├── back-end/
│   ├── Src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   │
│   ├── server.js
│   ├── package.json
│   └── .env
│
├── front-end/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── services/
│   │   └── styles/
│   │
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── README.md
└── DEPLOYMENT.md
```

---

## 🧪 Testing Checklist

The following areas are included in the project's testing checklist.

- [ ] User registration and login
- [ ] Token refresh and logout
- [ ] Protected routes
- [ ] Project creation and management
- [ ] Project ownership enforcement
- [ ] Source-code scanning
- [ ] Security findings and scoring
- [ ] OWASP/CWE mapping
- [ ] Gemini AI review
- [ ] ZIP upload and scanning
- [ ] Per-file findings and AI reviews
- [ ] Source-code persistence
- [ ] Secure fix application
- [ ] Deterministic verification
- [ ] Regression rejection
- [ ] Secured ZIP generation
- [ ] PDF report generation
- [ ] Security analytics
- [ ] Dark and light themes

---

## 🔒 Production Security Recommendations

- Never commit `.env` files or expose API credentials.
- Never expose Gemini or MongoDB credentials in frontend code.
- Use strong and separate JWT secrets.
- Use HTTPS in production.
- Restrict CORS to trusted origins.
- Keep Helmet and rate limiting enabled.
- Enforce request and upload limits.
- Validate project, scan, and file ownership.
- Treat AI-generated output as advisory.
- Deterministically verify automated remediation.
- Protect MongoDB Atlas and GridFS credentials.
- Never log passwords, tokens, secrets, cookies, or private source code.

---

## 👨‍💻 Project Contributors

This project was developed collaboratively by:

1. Adharv S Aneesh
2. Dhammadeep M Ganvir
3. Utkarsh S Shamkuwar
4. Harsha Bhoge
5. Sakshi Kubade

---

## 📌 Project Information

| Detail | Description |
|---|---|
| Project Name | CodeGuard AI |
| Project Type | AI-Assisted Secure Code Review Platform |
| Primary Security Engine | Deterministic Rule-Based Static Scanner |
| AI Integration | Google Gemini API |
| Frontend | React + Vite |
| Backend | Node.js + Express.js |
| Database | MongoDB Atlas + Mongoose |
| Archive Storage | MongoDB GridFS |
| Authentication | JWT + bcrypt |
| Code Editor | Monaco Editor |
| Analytics | Recharts |
| Reporting | jsPDF + html2canvas |

---

## ⚠️ Disclaimer

CodeGuard AI is a security-analysis and developer-assistance platform. Static-analysis rules and AI-generated guidance may produce false positives, false negatives, or incomplete remediation suggestions.

The platform should be used as an additional security-review tool and does not replace comprehensive security testing, dependency analysis, manual code review, or professional security assessment before production deployment.
