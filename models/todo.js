import mongoose from 'mongoose';

const todoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  completed: {
    type: Boolean,
    default: false,
  },
  notes: {
    type: String,
    default: '',
  },
  list: {
    type: String,
    default: 'Personal',
    enum: ['Personal', 'Work', 'Grocery List'],
  },
  subtasks: [{
    title: String,
    completed: {
      type: Boolean,
      default: false,
    },
  }],
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

const Todo = mongoose.models.Todo || mongoose.model('Todo', todoSchema);

export default Todo;