import jwt from "jsonwebtoken";
import User from "../models/User.js";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
dotenv.config();
import { createStudent } from "../models/Student.js";
import { createCompany } from "../models/Company.js";

export const registerUser = async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    const existingUser = await User.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const userId = await User.createUser({
      name,
      email,
      password: hashedPassword,
      role,
      created_at: new Date(),
    });
    if (role === "student") {
      await createStudent(userId);
    } else if (role === "company") {
      await createCompany(userId, name);
    }
    // Visitors don't need additional records

    res.status(201).json({ 
      success: true,
      message: "User registered successfully.", 
      data: { userId } 
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ 
      success: false,
      message: "Error registering user" 
    });
  }
};
export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findUserByEmail(email);
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or password" });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or password" });
    }
    const token = jwt.sign(
      { userId: user.user_id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        userId: user.user_id,
        role: user.role,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ success: false, message: "Error logging in" });
  }
};

// Reset password with verification
export const resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    // Validate input
    if (!email || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email and new password are required",
      });
    }

    // Check if user exists
    const user = await User.findUserByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in database
    await User.updatePassword(user.user_id, hashedPassword);

    res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({
      success: false,
      message: "Error resetting password",
    });
  }
};
