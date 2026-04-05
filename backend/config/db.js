import mongoose from "mongoose";

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.warn("MONGO_URI not set, running without database connection");
    return;
  }

  try {
    console.log("Attempting MongoDB connection...");
    console.log("URI:", process.env.MONGO_URI.substring(0, 50) + "...");
    
    // Disable Mongoose buffering to fail fast
    mongoose.set("bufferCommands", false);
    
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 60000,
      maxPoolSize: 20,
      minPoolSize: 5,
      retryWrites: true,
      retryReads: true,
      connectTimeoutMS: 10000,
      family: 4, // Use IPv4
    });
    
    console.log("✅ MongoDB connected successfully");
    console.log("Connection state:", mongoose.connection.readyState);
    
    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️  MongoDB disconnected");
      mongoose.set("bufferCommands", false);
    });
    
    mongoose.connection.on("reconnected", () => {
      console.log("✅ MongoDB reconnected");
      mongoose.set("bufferCommands", true);
    });
    
    mongoose.connection.on("error", (err) => {
      console.error("🔴 MongoDB error:", err.message);
    });
  } catch (error) {
    console.error("🔴 DB connection error:", error.message);
    console.error("Troubleshooting: Check MONGO_URI and MongoDB Atlas network access");
    throw error;
  }
};

export default connectDB;