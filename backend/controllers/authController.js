import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { body } from 'express-validator';

export const registerValidation = [
  body('username').isLength({ min: 3, max: 20 }).trim().escape(),
  body('password').isLength({ min: 6 }).trim()
];

export const register = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ error: 'Username already exists' });

    const user = await User.create({ username, password, role: 'client' });
    
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { 
      expiresIn: process.env.JWT_EXPIRE 
    });

    res.status(201).json({ token, user: user.toJSON() });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

export const loginValidation = [
  body('username').notEmpty().trim(),
  body('password').notEmpty()
];

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await User.findOne({ username }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    user.lastSeen = new Date();
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { 
      expiresIn: process.env.JWT_EXPIRE 
    });

    res.json({ token, user: user.toJSON() });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
};

export const me = async (req, res) => {
  res.json({ user: req.user.toJSON() });
};