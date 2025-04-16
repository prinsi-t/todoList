import express from 'express';
import Todo from '../models/todo.js';

const router = express.Router();

// Middleware to ensure user is authenticated
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
};

// Get all todos as JSON
router.get('/all', ensureAuthenticated, async (req, res) => {
  try {
    const tasks = await Todo.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get todos by list
router.get('/list/:list', ensureAuthenticated, async (req, res) => {
  try {
    const tasks = await Todo.find({ 
      user: req.user._id,
      list: req.params.list 
    }).sort({ createdAt: -1 });
    
    res.render('todos', { 
      title: req.params.list,
      user: req.user,
      tasks,
      activeList: req.params.list
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Get all todos
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const tasks = await Todo.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.render('todos', { 
      title: 'My Tasks',
      user: req.user,
      tasks,
      activeList: 'all'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Create new todo
router.post('/', ensureAuthenticated, async (req, res) => {
  try {
    const { title, list = 'Personal' } = req.body;
    const todo = new Todo({
      title,
      list,
      user: req.user._id
    });
    await todo.save();
    res.json(todo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Toggle todo completion
router.put('/:id/toggle', ensureAuthenticated, async (req, res) => {
  try {
    const todo = await Todo.findOne({ _id: req.params.id, user: req.user._id });
    if (!todo) return res.status(404).json({ msg: 'Todo not found' });
    
    todo.completed = !todo.completed;
    await todo.save();
    res.json(todo);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Update todo
router.put('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const { title, notes, list } = req.body;
    const todo = await Todo.findOne({ _id: req.params.id, user: req.user._id });
    if (!todo) return res.status(404).json({ msg: 'Todo not found' });
    
    if (title) todo.title = title;
    if (notes) todo.notes = notes;
    if (list) todo.list = list;
    
    await todo.save();
    res.json(todo);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Delete todo
router.delete('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const result = await Todo.deleteOne({ _id: req.params.id, user: req.user._id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, msg: 'Todo not found' });
    }
    res.json({ success: true, msg: 'Todo removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;