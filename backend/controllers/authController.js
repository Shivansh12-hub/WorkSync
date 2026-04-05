import User from "../models/userModel.js";
import bcrypt from "bcrypt";
import generateToken from "../utils/generateToken.js";

export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    console.log(`[REGISTER] Processing registration for ${email}`);
    
    // Check if user exists
    let existing;
    try {
      existing = await User.findOne({ email }).select("email");
    } catch (dbErr) {
      console.error("[REGISTER] Database error during findOne:", dbErr.message);
      return res.status(503).json({
        message: "Database connection issue. Please try again in a moment.",
      });
    }

    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    console.log(`[REGISTER] Hashing password...`);
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log(`[REGISTER] Creating user document...`);
    let user;
    try {
      user = await User.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: role || "EMPLOYEE",
      });
    } catch (dbErr) {
      console.error("[REGISTER] Database error during create:", dbErr.message);
      if (dbErr.code === 11000) {
        return res.status(400).json({ message: "Email already registered" });
      }
      return res.status(503).json({
        message: "Database connection issue. Please try again.",
      });
    }

    console.log(`[REGISTER] User created: ${user._id}`);

    const token = generateToken(user);
    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("[REGISTER ERROR]", error);
    res.status(500).json({
      message: error.message || "Registration failed",
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    console.log(`[LOGIN] Processing login for ${email}`);

    let user;
    try {
      user = await User.findOne({ email: email.toLowerCase().trim() });
    } catch (dbErr) {
      console.error("[LOGIN] Database error:", dbErr.message);
      return res.status(503).json({
        message: "Database connection issue. Please try again.",
      });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    console.log(`[LOGIN] Login successful for ${email}`);

    const token = generateToken(user);
    res.json({
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("[LOGIN ERROR]", error);
    res.status(500).json({
      message: error.message || "Login failed",
    });
  }
};