const mongoose = require("mongoose");

const connectDatabase = async () => {
  try {
    console.log("Starting MongoDB connection...");

    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from the .env file");
    }

    console.log("MongoDB URI detected in .env");

    const connection = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    console.log("================================");
    console.log("MongoDB connected successfully");
    console.log(`Database: ${connection.connection.name}`);
    console.log(`Host: ${connection.connection.host}`);
    console.log("================================");
  } catch (error) {
    console.error("MongoDB connection failed");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    process.exit(1);
  }
};

module.exports = connectDatabase;