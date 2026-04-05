import mongoose from "mongoose";

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.warn("MONGO_URI not set, running without database connection");
    return;
  }

  try {
    console.log("Attempting MongoDB connection...");
    
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
    });
    
    console.log("✅ MongoDB connected successfully");
    
    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️  MongoDB disconnected, attempting to reconnect...");
    });
    
    mongoose.connection.on("error", (err) => {
      console.error("🔴 MongoDB error:", err.message);
    });
  } catch (error) {
    console.error("🔴 DB connection error:", error.message);
    console.error("Make sure MongoDB Atlas is accessible and MONGO_URI is correct");
    throw error;
  }
};

export default connectDB;