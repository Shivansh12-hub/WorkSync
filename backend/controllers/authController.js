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

    console.log(`[REGISTER] Checking if user ${email} exists...`);
    
    const existing = await Promise.race([
      User.findOne({ email }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Database query timeout")), 8000)
      ),
    ]);

    if (existing) {
      return res.status(400).json({ message: "User already exists" });
    }

    console.log(`[REGISTER] Hashing password for ${email}...`);
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log(`[REGISTER] Creating user ${email}...`);
    const user = await Promise.race([
      User.create({
        name,
        email,
        password: hashedPassword,
        role: role || "EMPLOYEE",
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Database operation timeout")), 8000)
      ),
    ]);

    console.log(`[REGISTER] User ${email} created successfully`);

    res.status(201).json({
      message: "User registered successfully",
      token: generateToken(user),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("[REGISTER ERROR]", error.message);
    
    if (error.message.includes("timeout")) {
      return res.status(503).json({
        message: "Database connection timeout. Please try again.",
      });
    }

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

    console.log(`[LOGIN] Authenticating ${email}...`);

    const user = await Promise.race([
      User.findOne({ email }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Database query timeout")), 8000)
      ),
    ]);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    console.log(`[LOGIN] Login successful for ${email}`);

    res.json({
      message: "Login successful",
      token: generateToken(user),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("[LOGIN ERROR]", error.message);

    if (error.message.includes("timeout")) {
      return res.status(503).json({
        message: "Database connection timeout. Please try again.",
      });
    }

    res.status(500).json({
      message: error.message || "Login failed",
    });
  }
};