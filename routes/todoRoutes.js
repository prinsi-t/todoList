import express from 'express';
import Todo from '../models/todo.js';
import ensureAuthenticated  from './authRoutes.js'; // Adjust the path as needed


const router = express.Router();

// Root route (Todo page)
// Root route (Todo page)
router.get('/todos', ensureAuthenticated, async (req, res) => {
  try {
    console.log('🔥 req.user:', req.user); // Add this line

    if (!req.user) {
      throw new Error('User not loaded in session');
    }

    const todos = await Todo.find({ user: req.user._id });
    res.render('index', { todos });
  } catch (err) {
    console.error('Error fetching todos:', err);
    res.status(500).send('Server error');
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