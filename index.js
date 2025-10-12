import express from 'express';
import dotenv from 'dotenv';

dotenv.config();


import userRoutes from './routes/userRoutes.js'


//note for the team: under here you have to add your routes usings
const app = express();
app.use(express.json());
app.use("/users", userRoutes);


app.get('/', (req, res) => {
  res.send('Hello, Node.js project is running 🚀');
});



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
