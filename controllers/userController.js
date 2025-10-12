import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
dotenv.config();

export const registerUser = async (req, res) => {
    const { name, email, password, role,} = req.body;

    

    try {
        const existingUser = await User.findUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);


        const userId = await User.createUser({ name, email, password: hashedPassword, role,created_at: new Date()  });

        res.status(201).json({ message: 'User registered successfully.',userId });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ message: 'Error registering user' });
    }
};
