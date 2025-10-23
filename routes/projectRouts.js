import express from "express";
import {
  getprojectController,
  updateprojectController,
  postprojectController,
} from "../controllers/projectController.js";

const router = express.Router();

router.get("/myproject/:user_id", getprojectController);
router.post("/myproject/:user_id", postprojectController);
router.put("/myproject/:user_id", updateprojectController);

export default router;
