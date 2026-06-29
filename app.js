import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const app = express();
const jwtSecret = process.env.JWT_SECRET || 'dev-secret';

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MongoDB connection
const mongoURI = process.env.MONGO_URI;
mongoose
  .connect(mongoURI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origin.includes('localhost') || origin.includes('vercel.app') || origin.includes('onrender.com')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);
app.options('*', cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Schemas
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    googleId: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

const todoSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    title: { type: String, required: true },
    list: { type: String, default: 'Personal' },
    completed: { type: Boolean, default: false },
    due_date: { type: String, default: null },
  },
  { timestamps: true }
);

const stickySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    text: { type: String, default: '' },
    colorIdx: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Todo = mongoose.models.Todo || mongoose.model('Todo', todoSchema);
const Sticky = mongoose.models.Sticky || mongoose.model('Sticky', stickySchema);

// JWT
const createToken = (user) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      name: user.name,
    },
    jwtSecret,
    { expiresIn: '7d' }
  );

// Auth middleware
const authRequired = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const payload = jwt.verify(token, jwtSecret);
    req.user = { id: payload.sub, email: payload.email, name: payload.name };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email, and password are required' });

    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing)
      return res.status(409).json({ error: 'Email is already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
    });

    const token = createToken(user);
    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch {
    res.status(500).json({ error: 'Failed to register' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user)
      return res.status(401).json({ error: 'Invalid email or password' });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch)
      return res.status(401).json({ error: 'Invalid email or password' });

    const token = createToken(user);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch {
    res.status(500).json({ error: 'Failed to login' });
  }
});

app.get('/api/auth/me', authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('_id name email');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ user: { id: user._id, name: user.name, email: user.email } });
  } catch {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required' });
    }

    const googleResponse = await axios.get(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${credential}`
    );
    const googleUser = googleResponse.data;

    if (!googleUser.email_verified) {
      return res.status(400).json({ error: 'Google email not verified' });
    }

    let user = await User.findOne({ email: googleUser.email.toLowerCase() });

    if (user) {
      if (!user.googleId) {
        user.googleId = googleUser.sub;
        await user.save();
      }
    } else {
      user = await User.create({
        name: googleUser.name,
        email: googleUser.email.toLowerCase(),
        googleId: googleUser.sub,
      });
    }

    const token = createToken(user);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error('Google auth error:', error.response?.data || error.message);
    res.status(401).json({ error: 'Invalid Google credentials' });
  }
});

// Todos
app.get('/api/todos', authRequired, async (req, res) => {
  try {
    const todos = await Todo.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(todos);
  } catch {
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

app.post('/api/todos', authRequired, async (req, res) => {
  try {
    const { title, list = 'Personal', due_date = null } = req.body;

    if (!title || !title.trim())
      return res.status(400).json({ error: 'Title is required' });

    const todo = await Todo.create({
      userId: req.user.id,
      title: title.trim(),
      list,
      due_date,
      completed: false,
    });

    res.status(201).json(todo);
  } catch {
    res.status(500).json({ error: 'Failed to create todo' });
  }
});

app.patch('/api/todos/:id/toggle', authRequired, async (req, res) => {
  try {
    const todo = await Todo.findOne({ _id: req.params.id, userId: req.user.id });

    if (!todo) return res.status(404).json({ error: 'Todo not found' });

    todo.completed = !todo.completed;
    await todo.save();
    res.json(todo);
  } catch {
    res.status(500).json({ error: 'Failed to toggle todo' });
  }
});

app.delete('/api/todos/:id', authRequired, async (req, res) => {
  try {
    const deleted = await Todo.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!deleted) return res.status(404).json({ error: 'Todo not found' });

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});


app.get('/api/stickies', authRequired, async (req, res) => {
  try {
    const stickies = await Sticky.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(stickies);
  } catch {
    res.status(500).json({ error: 'Failed to fetch stickies' });
  }
});

app.post('/api/stickies', authRequired, async (req, res) => {
  try {
    const { text = '', colorIdx = 0 } = req.body;

    const sticky = await Sticky.create({
      userId: req.user.id,
      text: String(text),
      colorIdx: Number(colorIdx) || 0,
    });

    res.status(201).json(sticky);
  } catch {
    res.status(500).json({ error: 'Failed to create sticky' });
  }
});

app.patch('/api/stickies/:id', authRequired, async (req, res) => {
  try {
    const sticky = await Sticky.findOne({ _id: req.params.id, userId: req.user.id });

    if (!sticky) return res.status(404).json({ error: 'Sticky not found' });

    if (req.body.text !== undefined) sticky.text = String(req.body.text);
    if (req.body.colorIdx !== undefined) sticky.colorIdx = Number(req.body.colorIdx) || 0;

    await sticky.save();
    res.json(sticky);
  } catch {
    res.status(500).json({ error: 'Failed to update sticky' });
  }
});

app.delete('/api/stickies/:id', authRequired, async (req, res) => {
  try {
    const deleted = await Sticky.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!deleted) return res.status(404).json({ error: 'Sticky not found' });

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete sticky' });
  }
});

// Serve React (Vite build)
app.use(express.static(path.join(__dirname, 'frontend', 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);

export default app;