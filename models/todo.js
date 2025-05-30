

import mongoose from 'mongoose';

const subtaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    // Set default value to ensure it's never undefined
    default: function() {
      return this.title || 'Subtask';
    }
  },
  completed: {
    type: Boolean,
    default: false,
  },
  id: {
    type: String,
    default: function() {
      return 'subtask_' + new Date().getTime() + '_' + Math.random().toString(36).substring(2, 9);
    }
  }
});

// Pre-save middleware to ensure text is always set
subtaskSchema.pre('save', function(next) {
  if (!this.text && this.title) {
    this.text = this.title;
  } else if (!this.text) {
    this.text = 'Subtask';
  }
  
  if (!this.id) {
    this.id = 'subtask_' + new Date().getTime() + '_' + Math.random().toString(36).substring(2, 9);
  }
  
  next();
});

// Add a toJSON transform to ensure text is always included
subtaskSchema.set('toJSON', {
  transform: function(doc, ret) {
    // Ensure text is always set
    if (!ret.text && ret.title) {
      ret.text = ret.title;
    } else if (!ret.text) {
      ret.text = 'Subtask';
    }
    
    // Ensure id is always set
    if (!ret.id) {
      ret.id = 'subtask_' + new Date().getTime() + '_' + Math.random().toString(36).substring(2, 9);
    }
    
    return ret;
  }
});

const todoSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    title: {
      type: String,
      required: true,
    },
    list: {
      type: String,
      required: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      default: '',
    },
    subtasks: [subtaskSchema],
  },
  { timestamps: true }
);

// Add a toJSON transform for the todo schema to ensure subtasks are properly formatted
todoSchema.set('toJSON', {
  transform: function(doc, ret) {
    // Ensure subtasks array exists
    if (!ret.subtasks) {
      ret.subtasks = [];
    }
    
    // Ensure each subtask has text and id
    ret.subtasks = ret.subtasks.map(subtask => {
      if (!subtask) return null;
      
      // Ensure text is set
      if (!subtask.text && subtask.title) {
        subtask.text = subtask.title;
      } else if (!subtask.text) {
        subtask.text = 'Subtask';
      }
      
      // Ensure id is set
      if (!subtask.id) {
        subtask.id = 'subtask_' + new Date().getTime() + '_' + Math.random().toString(36).substring(2, 9);
      }
      
      return subtask;
    }).filter(s => s !== null);
    
    return ret;
  }
});

const Todo = mongoose.model('Todo', todoSchema);
export default Todo;