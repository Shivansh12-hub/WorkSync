import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authorization header missing or invalid" });
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      return res.status(401).json({ message: "No token" });
    }

    if (token.length > 2048) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const issuer = process.env.JWT_ISSUER || "worksync-api";
    const audience = process.env.JWT_AUDIENCE || "worksync-client";

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer,
      audience,
    });

    const user = await User.findById(decoded.id).select("_id role name email").lean();
    if (!user) {
      return res.status(401).json({ message: "Invalid token" });
    }

    req.user = decoded;
    req.user.id = String(user._id);
    req.user.role = user.role;
    req.user.name = user.name;
    req.user.email = user.email;

    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

export default protect;