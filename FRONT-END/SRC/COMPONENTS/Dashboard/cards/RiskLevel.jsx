import {
    FaShieldAlt,
    FaExclamationTriangle,
    FaTimesCircle
} from "react-icons/fa";

export default function RiskLevel({ score }) {

    let level = "LOW";
    let color = "#00C853";
    let Icon = FaShieldAlt;

    if (score < 80) {
        level = "MEDIUM";
        color = "#F9A825";
        Icon = FaExclamationTriangle;
    }

    if (score < 50) {
        level = "HIGH";
        color = "#D50000";
        Icon = FaTimesCircle;
    }

    return (

        <div
            className="risk-card"
            style={{
            borderLeft:`8px solid ${color}`,
            background:"#111827"
              }}
        >

            <Icon
                size={48}
                color={color}
            />

            <h3>{level} RISK</h3>

            <p>Current Vulnerability Status</p>

        </div>

    );

}