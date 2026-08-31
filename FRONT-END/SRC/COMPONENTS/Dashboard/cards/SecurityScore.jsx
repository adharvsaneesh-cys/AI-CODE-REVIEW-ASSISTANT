import "./SecurityScore.css";

export default function SecurityScore({ score }) {

    let color = "#22c55e";

    if (score < 80) color = "#f59e0b";

    if (score < 50) color = "#ef4444";

    return (

        <div className="dashboard-card security-score-card">

            <h3>Security Score</h3>

            <div
                className="score-circle"
                style={{
                    borderColor: color,
                    color: color
                }}
            >

                {score}

            </div>

            <p>Overall Security Rating</p>

        </div>

    );

}