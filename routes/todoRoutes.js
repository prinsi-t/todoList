import express from 'express';
import Todo from '../models/todo.js';

const router = express.Router();

// Middleware to ensure authentication
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

// Get all todos
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const todos = await Todo.find();
    console.log('Current Todo List:', todos); // Log the current todo list
    res.render('index', { title: 'Todo App', todos });
  } catch (err) {
    console.error('Error fetching todos:', err);
    res.status(500).send('Server Error');
  }
});

// Handle adding a new todo
router.post('/add', ensureAuthenticated, async (req, res) => {
  console.log('Authenticated User:', req.user); // Debugging log

  const { title } = req.body;

  if (!title) {
    return res.status(400).send('Title is required');
  }

  try {
    const newTodo = new Todo({
      title,
      completed: false,
      user: req.user._id,
    });

    await newTodo.save();
    res.redirect('/');
  } catch (err) {
    console.error('Error adding todo:', err);
    res.status(500).send('Server error');
  }
});

// Mark a todo as completed
router.post('/complete/:id', ensureAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const updatedTodo = await Todo.findByIdAndUpdate(id, { completed: true }, { new: true });
    console.log('Completed Todo:', updatedTodo); // Log the completed todo
    res.redirect('/');
  } catch (err) {
    console.error('Error completing todo:', err);
    res.status(500).send('Server Error');
  }
});

// Delete a todo
router.post('/delete/:id', ensureAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const deletedTodo = await Todo.findByIdAndDelete(id);
    console.log('Deleted Todo:', deletedTodo); // Log the deleted todo
    res.redirect('/');
  } catch (err) {
    console.error('Error deleting todo:', err);
    res.status(500).send('Server Error');
  }
});

export default router;