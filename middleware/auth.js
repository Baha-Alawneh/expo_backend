import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access token required",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("🔑 Decoded token:", decoded);
    console.log("📍 Request params user_id:", req.params.user_id);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("❌ Token verification error:", error.message);
    return res.status(403).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

export const authorizeUser = (req, res, next) => {
  const { user_id } = req.params;

  // Allow access if the authenticated user is accessing their own data or is an admin
  if (req.user.userId === user_id || req.user.role === "admin") {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: "You are not authorized to access this resource",
    });
  }
};
