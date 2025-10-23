import {
  getProjectByStudentId,
  createProject,
  updateProject,
} from "../models/Project.js";
import { getStudentById } from "../models/Student.js"; // دالة جديدة تجيب student_id من user_id

// GET /myproject/:user_id
export const getprojectController = async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }

    const student = await getStudentById(user_id);
    console.log("[GET Project] user_id:", user_id, "student:", student);

    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    const project = await getProjectByStudentId(student.student_id);
    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "No project found for this student" });
    }

    res.json({ success: true, data: project });
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching project",
      error: error.message,
    });
  }
};

// POST /myproject/:user_id
export const postprojectController = async (req, res) => {
  try {
    const { user_id } = req.params;

    // Validate user_id
    if (!user_id) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }

    const student = await getStudentById(user_id);
    console.log("[POST Project] user_id:", user_id, "student:", student);

    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    const data = req.body;

    // Validate required fields
    if (!data || !data.title) {
      return res
        .status(400)
        .json({ success: false, message: "Project title is required" });
    }

    const project = await createProject(student.student_id, data);
    res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: project,
    });
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({
      success: false,
      message: "Error creating project",
      error: error.message,
    });
  }
};

// PUT /myproject/:user_id
export const updateprojectController = async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!user_id) {
      return res
        .status(400)
        .json({ success: false, message: "User ID is required" });
    }

    const student = await getStudentById(user_id);
    console.log("[PUT Project] user_id:", user_id, "student:", student);

    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    const data = req.body;
    const project = await updateProject(student.student_id, data);
    res.json({
      success: true,
      message: "Project updated successfully",
      data: project,
    });
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({
      success: false,
      message: "Error updating project",
      error: error.message,
    });
  }
};
