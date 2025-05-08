import express from 'express';
import Todo from '../models/todo.js';
import multer from 'multer';
import path from 'path';

const router = express.Router();

const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
};

router.get('/all', ensureAuthenticated, async (req, res) => {
  try {
    const tasks = await Todo.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/list/:list', ensureAuthenticated, async (req, res) => {
  try {
    const tasks = await Todo.find({ user: req.user._id, list: req.params.list }).sort({ createdAt: -1 });
    res.render('todos', {
      title: req.params.list,
      user: req.user,
      tasks,
      activeList: req.params.list,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const tasks = await Todo.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.render('todos', {
      title: 'My Tasks',
      user: req.user,
      tasks,
      activeList: 'all',
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

router.post('/', ensureAuthenticated, async (req, res) => {
  try {
    const { title, list = 'Personal', completed = false } = req.body;

    // Check user authentication
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    console.log('Creating new task:', { title, list, completed });
    console.log('User ID:', req.user._id);

    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const newTodo = new Todo({
      title,
      list,
      completed,
      userId: req.user._id,
    });

    console.log('Todo object before save:', newTodo);

    await newTodo.save();
    console.log('Todo saved successfully:', newTodo._id);

    res.status(201).json(newTodo);
  } catch (error) {
    console.error('Detailed error creating task:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Failed to create task', details: error.message });
  }
});

router.get('/todos/:list', ensureAuthenticated, async (req, res) => {
  try {
    const { list } = req.params;
    const query = { user: req.user._id };
    if (list !== 'all') query.list = list;

    const todos = await Todo.find(query).sort('-createdAt');
    res.json(todos);
  } catch (error) {
    console.error('Error fetching todos:', error);
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

router.put('/todos/:id/toggle', ensureAuthenticated, async (req, res) => {
  try {
    const todo = await Todo.findOne({ _id: req.params.id, user: req.user._id });
    if (!todo) return res.status(404).json({ error: 'Todo not found' });

    todo.completed = !todo.completed;
    await todo.save();
    res.json(todo);
  } catch (error) {
    console.error('Error toggling task completion:', error);
    res.status(500).json({ error: 'Failed to toggle task completion' });
  }
});

router.delete('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Todo.findOneAndDelete({ _id: id, userId: req.user._id });

    if (!result) {
      return res.status(404).json({ success: false, message: 'Todo not found' });
    }

    res.json({ success: true, message: 'Todo deleted successfully' });
  } catch (err) {
    console.error('Error deleting todo:', err);
    res.status(500).json({ success: false, message: 'Failed to delete task' });
  }
});

router.post('/todos/:id/subtasks', ensureAuthenticated, async (req, res) => {
  const { title } = req.body;
  const { id } = req.params;

  if (!title) {
    return res.status(400).json({ error: 'Subtask title is required' });
  }

  try {
    const todo = await Todo.findOne({ _id: id, user: req.user._id });
    if (!todo) return res.status(404).json({ error: 'Todo not found' });

    todo.subtasks.push({ title });
    await todo.save();
    res.status(200).json(todo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.delete('/todos/:id/subtasks/:index', ensureAuthenticated, async (req, res) => {
  try {
    const todo = await Todo.findOne({ _id: req.params.id, user: req.user._id });
    if (!todo) return res.status(404).json({ error: 'Todo not found' });

    todo.subtasks.splice(req.params.index, 1);
    await todo.save();
    res.json(todo);
  } catch (error) {
    console.error('Error deleting subtask:', error);
    res.status(500).json({ error: 'Failed to delete subtask' });
  }
});

router.put('/todos/:id/subtasks/:index/complete', ensureAuthenticated, async (req, res) => {
  try {
    const { id, index } = req.params;
    const { completed } = req.body;

    const todo = await Todo.findOne({ _id: id, user: req.user._id });
    if (!todo) return res.status(404).json({ error: 'Todo not found' });

    if (!todo.subtasks || todo.subtasks.length <= index) {
      return res.status(400).json({ error: 'Subtask not found' });
    }

    todo.subtasks[index].completed = completed;

    await todo.save();

    res.json(todo);
  } catch (error) {
    console.error('Error updating subtask completion:', error);
    res.status(500).json({ error: 'Failed to update subtask' });
  }
});

// Route to update task notes
router.put('/:id/notes', ensureAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const todo = await Todo.findOne({ _id: id, userId: req.user._id });
    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    todo.notes = notes;
    await todo.save();

    res.status(200).json(todo);
  } catch (error) {
    console.error('Error updating notes:', error);
    res.status(500).json({ error: 'Failed to update notes' });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads')); // ✅ Saves in project root
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// Route to handle file uploads
router.post('/todos/:id/attachments', ensureAuthenticated, upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const todo = await Todo.findOne({ _id: id, user: req.user._id });

    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    // Add the uploaded file to the attachments array
    const filePath = `/uploads/${req.file.filename}`;
    todo.attachments.push({ path: filePath, name: req.file.originalname });
    await todo.save();

    res.status(200).json(todo); // Return the updated todo
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});





export default router;
