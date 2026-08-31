import {
  FaCode,
  FaShieldAlt,
  FaClock,
  FaBug,
} from "react-icons/fa";

const stats = [
  {
    number: "15+",
    title: "Programming Languages",
    icon: <FaCode />,
  },
  {
    number: "98%",
    title: "Detection Accuracy",
    icon: <FaShieldAlt />,
  },
  {
    number: "5000+",
    title: "Lines Scanned / Min",
    icon: <FaClock />,
  },
  {
    number: "25+",
    title: "Security Rules",
    icon: <FaBug />,
  },
];

export default function Stats() {
  return (
    <section className="stats">

      <h2 className="section-title">
        Trusted by Developers Worldwide
      </h2>

      <div className="stats-grid">

        {stats.map((item, index) => (

          <div className="stat-card" key={index}>

            <div className="stat-icon">
              {item.icon}
            </div>

            <h2>{item.number}</h2>

            <p>{item.title}</p>

          </div>

        ))}

      </div>

    </section>
  );
}