import jwt from "jsonwebtoken";
import crypto from "node:crypto";

const generateToken = (user) => {
  const issuer = process.env.JWT_ISSUER || "worksync-api";
  const audience = process.env.JWT_AUDIENCE || "worksync-client";

  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      jti: crypto.randomUUID(),
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      issuer,
      audience,
      subject: String(user._id),
    }
  );
};

export default generateToken;