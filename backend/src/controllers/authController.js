const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const ALLOWED_ROLES = ['Admin', 'Dealer', 'Supplier'];

const createToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      role: user.role
    },
    process.env.JWT_SECRET || 'dev_secret',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );
};

const sanitizeUser = (user) => {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    businessName: user.businessName,
    contactInfo: user.contactInfo
  };
};

const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = 'Dealer',
      businessName,
      contactInfo
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email and password are required' });
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    if ((role === 'Dealer' || role === 'Supplier') && !businessName) {
      return res.status(400).json({ message: 'businessName is required for Dealer and Supplier' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role,
      businessName,
      contactInfo
    });

    const token = createToken(user);

    return res.status(201).json({
      message: 'User registered successfully',
      token,
      user: sanitizeUser(user)
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Registration failed' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = createToken(user);

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: sanitizeUser(user)
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Login failed' });
  }
};

module.exports = {
  register,
  login
};
