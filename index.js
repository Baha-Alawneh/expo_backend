import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import userRoutes from "./routes/userRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import projectRoutes from "./routes/projectRouts.js";
import fileRoutes from "./routes/fileRoutes.js";

//note for the team: under here you have to add your routes usings
const app = express();

// Enable CORS for all routes
app.use(cors());

app.use(express.json());
app.use("/users", userRoutes);
app.use("/students", studentRoutes);
app.use("/projects", projectRoutes);
app.use("/files", fileRoutes);

app.get("/", (req, res) => {
  res.send("Hello, Node.js project is running 🚀");
});

const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0"; // Listen on all network interfaces
app.listen(PORT, HOST, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Network access available at http://192.168.88.2:${PORT}`);
});
