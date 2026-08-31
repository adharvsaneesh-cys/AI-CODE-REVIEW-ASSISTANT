import {
  FaShieldAlt,
  FaBug,
  FaExclamationTriangle,
  FaCheckCircle,
} from "react-icons/fa";

export default function StatCard() {

  return (

    <div className="risk-card">

      <div className="risk-header">

        <FaShieldAlt />

        <h2>Security Risk Score</h2>

      </div>

      <div className="risk-circle">

        <h1>87%</h1>

        <span>HIGH RISK</span>

      </div>

      <div className="risk-details">

        <div>

          <FaBug className="critical"/>

          Critical

          <strong>12</strong>

        </div>

        <div>

          <FaExclamationTriangle className="high"/>

          High

          <strong>18</strong>

        </div>

        <div>

          <FaShieldAlt className="medium"/>

          Medium

          <strong>29</strong>

        </div>

        <div>

          <FaCheckCircle className="low"/>

          Low

          <strong>08</strong>

        </div>

      </div>

    </div>

  );

}