import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      sparse: true,
      index: { unique: true, sparse: true },
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
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