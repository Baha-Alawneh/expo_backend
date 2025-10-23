import express from "express";
import {
  getStudentController,
  updateStudentController,
  uploadStudentFilesController,
  deleteStudentFileController,
} from "../controllers/studentController.js";
import { upload } from "../config/multer.js";

const router = express.Router();

router.get("/profile/:user_id", getStudentController);
router.put("/profile/:user_id", updateStudentController);

// Upload student photo and/or CV
router.post(
  "/profile/:user_id/upload",
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "cv", maxCount: 1 },
  ]),
  uploadStudentFilesController
);

// Delete student photo or CV
router.delete("/profile/:user_id/file", deleteStudentFileController);

export default router;
