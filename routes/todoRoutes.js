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

// Get todos by list (EJS view)
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

// Get all todos (EJS view)
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

// Create new todo
// router.post('/todos', ensureAuthenticated, async (req, res) => {
//   try {
//     const { title, list = 'Personal', completed = false } = req.body;

//     // Validate input
//     if (!title || title.trim() === '') {
//       return res.status(400).json({ error: 'Task title is required' });
//     }

//     // Create a new task
//     const newTodo = new Todo({
//       title,
//       list,
//       completed,
//       user: req.user._id,
//     });

//     await newTodo.save();
//     res.status(201).json(newTodo);
//   } catch (error) {
//     console.error('Error creating task:', error);
//     res.status(500).json({ error: 'Failed to create task' });
//   }
// });
// Create new todo
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


// Get todos by category
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

// Toggle todo completion
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

// Update todo
// router.put('/todos/:id', ensureAuthenticated, async (req, res) => {
//   try {
//     const { title, notes, list } = req.body;
//     const todo = await Todo.findOne({ _id: req.params.id, user: req.user._id });
//     if (!todo) return res.status(404).json({ msg: 'Todo not found' });

//     if (title) todo.title = title;
//     if (notes) todo.notes = notes;
//     if (list) todo.list = list;

//     await todo.save();
//     res.json(todo);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Server error');
//   }
// });

// Delete todo
// Delete todo
// router.delete('/todos/:id', ensureAuthenticated, async (req, res) => {
//   try {
//     const { id } = req.params;

//     // Log the ID and user for debugging
//     console.log('Deleting Todo with ID:', id);
//     console.log('Authenticated User ID:', req.user._id);

//     // Attempt to delete the task
//     const result = await Todo.deleteOne({ _id: id, user: req.user._id });

//     // Log the result of the deletion
//     console.log('Delete Result:', result);

//     if (result.deletedCount === 0) {
//       return res.status(404).json({ success: false, msg: 'Todo not found' });
//     }

//     res.json({ success: true, msg: 'Todo removed' });
//   } catch (err) {
//     console.error('Error deleting todo:', err);
//     res.status(500).json({ success: false, error: 'Server error' });
//   }
// });


// Add a subtask to a todo
// Delete todo
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

// Delete subtask
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

export default router;
