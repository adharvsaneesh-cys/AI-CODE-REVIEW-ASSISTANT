import {
  FaUpload,
  FaSearch,
  FaShieldAlt,
  FaRobot,
  FaFilePdf,
} from "react-icons/fa";

const steps = [
  {
    icon: <FaUpload />,
    title: "Upload Source Code",
    desc: "Drag & drop files or paste source code directly into the editor.",
  },
  {
    icon: <FaSearch />,
    title: "Static Analysis",
    desc: "Semgrep and Bandit scan your project for coding flaws and security issues.",
  },
  {
    icon: <FaShieldAlt />,
    title: "OWASP Detection",
    desc: "Map vulnerabilities to OWASP Top 10 categories with severity levels.",
  },
  {
    icon: <FaRobot />,
    title: "AI Review",
    desc: "AI explains each issue, recommends secure fixes, and suggests performance improvements.",
  },
  {
    icon: <FaFilePdf />,
    title: "Generate Reports",
    desc: "Export professional PDF, JSON, and HTML reports with all findings.",
  },
];

export default function HowItWorks() {
  return (
    <section className="workflow">

      <h2 className="section-title">
        How CodeGuard AI Works
      </h2>

      <p className="section-subtitle">
        Our intelligent pipeline combines static analysis, OWASP mapping,
        and AI-powered recommendations into one seamless workflow.
      </p>

      <div className="workflow-container">

        {steps.map((step, index) => (

          <div className="workflow-card" key={index}>

            <div className="workflow-icon">

              {step.icon}

            </div>

            <h3>{step.title}</h3>

            <p>{step.desc}</p>

            {index !== steps.length - 1 && (
              <div className="workflow-line"></div>
            )}

          </div>

        ))}

      </div>

    </section>
  );
}