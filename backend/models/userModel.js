import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      sparse: true,
      index: { unique: true, sparse: true },
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["EMPLOYEE", "MANAGER", "ADMIN"],
      default: "EMPLOYEE",
    },
  },
  { 
    timestamps: true,
  }
);

export default mongoose.model("User", userSchema);