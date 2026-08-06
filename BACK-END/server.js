const dns = require("node:dns");

dns.setServers(["8.8.8.8", "8.8.4.4"]);

require("dotenv").config();

const app = require("./src/app");
const connectDatabase = require("./src/config/db");

const PORT = Number(process.env.PORT) || 8001;
const HOST = process.env.HOST || "127.0.0.1";

const startServer = async () => {
  try {
    console.log("Starting backend...");

    await connectDatabase();

    app.listen(PORT, HOST, () => {
      console.log(`Node API running at http://${HOST}:${PORT}`);
      console.log(`Health check: http://${HOST}:${PORT}/health`);
    });
  } catch (error) {
    console.error("Backend startup failed:", error.message);
    process.exit(1);
  }
};

startServer();