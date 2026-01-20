import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const isGuest = req.headers["x-guest"] === "true";

  // Allow guest access for read-only operations
  if (isGuest) {
    console.log("👤 Guest user accessing public content");
    req.user = { role: "visitor", isGuest: true };
    return next();
  }

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

export const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(" or ")}`,
      });
    }

    next();
  };
};

// Middleware to require admin role
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }

  next();
};
