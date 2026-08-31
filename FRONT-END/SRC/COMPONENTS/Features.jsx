import {
  FaRobot,
  FaShieldAlt,
  FaBug,
  FaFilePdf,
  FaBolt,
  FaCode
} from "react-icons/fa";

const features = [
  {
    icon: <FaRobot />,
    title: "AI Code Review",
    desc: "Artificial Intelligence analyzes your source code and provides human-readable secure coding suggestions."
  },

  {
    icon: <FaShieldAlt />,
    title: "OWASP Top 10 Detection",
    desc: "Automatically detects vulnerabilities based on OWASP Top 10 security standards."
  },

  {
    icon: <FaBug />,
    title: "Semgrep + Bandit",
    desc: "Static code analysis using industry-standard security scanners."
  },

  {
    icon: <FaFilePdf />,
    title: "Professional Reports",
    desc: "Download vulnerability reports in PDF, JSON and HTML formats."
  },

  {
    icon: <FaBolt />,
    title: "Performance Analysis",
    desc: "Detect slow code, unnecessary loops and optimize performance."
  },

  {
    icon: <FaCode />,
    title: "Multi-language Support",
    desc: "Supports Python, Java, C++, JavaScript, TypeScript and more."
  }
];

export default function Features() {
  return (
    <section className="features">

      <h2 className="section-title">
        Powerful Features
      </h2>

      <p className="section-subtitle">
        Everything required to build secure software using Artificial Intelligence.
      </p>

      <div className="feature-grid">

        {features.map((item, index) => (

          <div className="feature-card" key={index}>

            <div className="feature-icon">

              {item.icon}

            </div>

            <h3>{item.title}</h3>

            <p>{item.desc}</p>

          </div>

        ))}

      </div>

    </section>
  );
}