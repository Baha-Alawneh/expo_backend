// Input validation middleware
export const validateRegistration = (req, res, next) => {
  const { name, email, password, role } = req.body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: "Valid name is required",
    });
  }

  if (!email || typeof email !== "string" || !isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: "Valid email is required",
    });
  }

  if (!password || typeof password !== "string" || password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters long",
    });
  }

  if (!role || !["student", "company", "admin"].includes(role)) {
    return res.status(400).json({
      success: false,
      message: "Valid role is required (student, company, or admin)",
    });
  }

  next();
};

export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || typeof email !== "string" || !isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: "Valid email is required",
    });
  }

  if (!password || typeof password !== "string") {
    return res.status(400).json({
      success: false,
      message: "Password is required",
    });
  }

  next();
};

export const validateEmail = (req, res, next) => {
  const { email } = req.body;

  if (!email || typeof email !== "string" || !isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: "Valid email is required",
    });
  }

  next();
};

export const validateVerificationCode = (req, res, next) => {
  const { email, code } = req.body;

  if (!email || typeof email !== "string" || !isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: "Valid email is required",
    });
  }

  if (!code || !/^\d{6}$/.test(code.toString())) {
    return res.status(400).json({
      success: false,
      message: "Valid 6-digit code is required",
    });
  }

  next();
};

export const validateStudentUpdate = (req, res, next) => {
  const { name, email, major, year, skills, bio } = req.body;

  if (
    name !== undefined &&
    (typeof name !== "string" || name.trim().length === 0)
  ) {
    return res.status(400).json({
      success: false,
      message: "Valid name is required",
    });
  }

  if (
    email !== undefined &&
    (typeof email !== "string" || !isValidEmail(email))
  ) {
    return res.status(400).json({
      success: false,
      message: "Valid email is required",
    });
  }

  if (major !== undefined && typeof major !== "string") {
    return res.status(400).json({
      success: false,
      message: "Major must be a string",
    });
  }

  if (
    year !== undefined &&
    typeof year !== "string" &&
    typeof year !== "number"
  ) {
    return res.status(400).json({
      success: false,
      message: "Year must be a string or number",
    });
  }

  if (skills !== undefined && !Array.isArray(skills)) {
    return res.status(400).json({
      success: false,
      message: "Skills must be an array",
    });
  }

  if (bio !== undefined && typeof bio !== "string") {
    return res.status(400).json({
      success: false,
      message: "Bio must be a string",
    });
  }

  next();
};

export const validateProjectData = (req, res, next) => {
  const { title, description, video_url, github_link } = req.body;

  if (
    title !== undefined &&
    (typeof title !== "string" || title.trim().length === 0)
  ) {
    return res.status(400).json({
      success: false,
      message: "Valid project title is required",
    });
  }

  if (description !== undefined && typeof description !== "string") {
    return res.status(400).json({
      success: false,
      message: "Description must be a string",
    });
  }

  if (video_url !== undefined && typeof video_url !== "string") {
    return res.status(400).json({
      success: false,
      message: "Video URL must be a string",
    });
  }

  if (github_link !== undefined && typeof github_link !== "string") {
    return res.status(400).json({
      success: false,
      message: "GitHub link must be a string",
    });
  }

  next();
};

// Helper function to validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
