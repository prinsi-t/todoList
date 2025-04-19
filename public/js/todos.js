// Load all tasks
async function loadAllTasks() {
  try {
    const response = await fetch('/todos/all');
    const tasks = await response.json();
    
    const tasksList = document.getElementById('taskList');
    tasksList.innerHTML = '';
    
    tasks.forEach(task => {
      const taskElement = createTaskElement(task);
      tasksList.appendChild(taskElement);
    });

    document.getElementById('allTasksCount').textContent = tasks.length;
    
    document.querySelectorAll('.sidebar-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelector('.sidebar-item').classList.add('active');
  } catch (error) {
    console.error('Error loading tasks:', error);
  }
}

// Delete task
function deleteTask(e, taskId) {
  e.stopPropagation();
  e.preventDefault();
  
  fetch(`/todos/${taskId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  })
  .then(data => {
    if (data.success) {
      const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
      if (taskElement) {
        taskElement.remove();
        // Update task count
        const countElement = document.getElementById('allTasksCount');
        const currentCount = parseInt(countElement.textContent);
        countElement.textContent = currentCount - 1;
      }
    } else {
      console.error('Failed to delete task:', data.msg);
    }
  })
  .catch(error => {
    console.error('Error deleting task:', error);
  });
}

// Create task element function
function createTaskElement(task) {
  const taskElement = document.createElement('div');
  taskElement.className = 'task-item group flex items-center p-2 bg-dark rounded mb-2'; // Flex container
  taskElement.dataset.taskId = task._id;

  taskElement.innerHTML = `
    <!-- Checkbox -->
    <div class="checkbox ${task.completed ? 'checked' : ''} w-5 h-5 flex items-center justify-center mr-3 cursor-pointer border border-gray-500 rounded">
      ${task.completed ? '<i class="fas fa-check text-white text-xs"></i>' : ''}
    </div>

    <!-- Task title -->
    <span class="flex-grow ${task.completed ? 'line-through text-gray-500' : ''}">${task.title}</span>

    <!-- Action buttons -->
    <div class="relative hidden group-hover:flex items-center gap-2 ml-3">
      <!-- Three-dot menu -->
      <div class="relative">
        <button class="text-gray-400 hover:text-white" onclick="toggleMoveMenu(event, '${task._id}')">
          <i class="fas fa-ellipsis-v"></i>
        </button>
        <div id="move-menu-${task._id}" class="absolute right-0 mt-2 w-32 bg-dark-hover rounded shadow-lg hidden z-50">
          <div onclick="moveTask('${task._id}', 'personal')" class="px-4 py-2 hover:bg-dark-border cursor-pointer">Personal</div>
          <div onclick="moveTask('${task._id}', 'work')" class="px-4 py-2 hover:bg-dark-border cursor-pointer">Work</div>
          <div onclick="moveTask('${task._id}', 'grocery')" class="px-4 py-2 hover:bg-dark-border cursor-pointer">Grocery</div>
        </div>
      </div>

      <!-- Delete button -->
      <button class="text-red-400 hover:text-red-600" onclick="deleteTask(event, '${task._id}')">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;

  // Checkbox click listener
  const checkbox = taskElement.querySelector('.checkbox');
  checkbox.addEventListener('click', (e) => {
    e.stopPropagation();
    checkbox.classList.toggle('checked');
  
    const taskText = taskElement.querySelector('span');
    taskText.classList.toggle('line-through');
    taskText.classList.toggle('text-gray-500');
  
    const existingIcon = checkbox.querySelector('.fa-check');
    if (checkbox.classList.contains('checked')) {
      if (!existingIcon) {
        const checkIcon = document.createElement('i');
        checkIcon.className = 'fas fa-check text-white text-xs';
        checkbox.appendChild(checkIcon);
      }
    } else {
      if (existingIcon) existingIcon.remove();
    }
  
    const blurContent = document.getElementById('task-blur-content');
    if (checkbox.classList.contains('checked')) {
      blurContent.classList.add('blurred-panel');
    } else {
      blurContent.classList.remove('blurred-panel');
    }
    
    // Send update to server
    fetch(`/todos/${task._id}/toggle`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });
  });

  taskElement.addEventListener('click', () => {
    window.currentTaskId = task._id;
  
    const blurContent = document.getElementById('task-blur-content');
    blurContent.classList.remove('blurred-panel');
  });

  return taskElement;
}

// Load tasks on page load
document.addEventListener('DOMContentLoaded', () => {
  loadAllTasks();
});

// Add new task
document.getElementById('addTaskForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('newTaskInput');
  const title = input.value.trim();
  
  if (!title) return;

  try {
    const response = await fetch('/todos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title })
    });

    const task = await response.json();
    
    loadAllTasks();
    
    input.value = '';
  } catch (error) {
    console.error('Error adding task:', error);
  }
});

function toggleMoveMenu(event, taskId) {
  event.stopPropagation();
  const menu = document.getElementById(`move-menu-${taskId}`);
  const isVisible = !menu.classList.contains('hidden');
  
  document.querySelectorAll('[id^="move-menu-"]').forEach(m => {
    m.classList.add('hidden');
  });

  if (!isVisible) {
    menu.classList.remove('hidden');
  }
}

// Optional: Hide the menu when clicking anywhere else
document.addEventListener('click', () => {
  document.querySelectorAll('[id^="move-menu-"]').forEach(m => m.classList.add('hidden'));
});

function markSelectedTaskComplete() {
  console.log("markSelectedTaskComplete triggered");

  const blurContent = document.getElementById('task-blur-content');
  const button = document.getElementById('complete-btn');
  
  if (!blurContent) {
    console.error('task-blur-content element not found!');
    return;
  }

  const isCurrentlyBlurred = blurContent.classList.contains('blurred-panel');
  
  if (isCurrentlyBlurred) {
    blurContent.classList.remove('blurred-panel');
    button.innerHTML = 'Mark as Complete';
    button.classList.remove('bg-blue-600');
    button.classList.add('bg-blue-500', 'hover:bg-blue-600');
  } else {
    blurContent.classList.add('blurred-panel');
    button.innerHTML = '<span class="flex items-center"><i class="fas fa-check mr-1"></i> Completed</span>';
    button.classList.remove('bg-blue-500', 'hover:bg-blue-600');
    button.classList.add('bg-blue-600');
  }

  const selectedTaskId = window.currentTaskId;
  if (!selectedTaskId) {
    console.warn('No task selected!');
    return;
  }

  fetch(`/todos/${selectedTaskId}/toggle`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
  })
    .then((res) => res.json())
    .then((data) => {
      console.log("Task toggle complete:", data);
      
      const taskElement = document.querySelector(`[data-task-id="${selectedTaskId}"]`);
      if (taskElement) {
        const checkbox = taskElement.querySelector('.checkbox');
        const taskText = taskElement.querySelector('span');
        
        if (!isCurrentlyBlurred) {
          checkbox.classList.add('checked');
          taskText.classList.add('line-through', 'text-gray-500');
          
          if (!checkbox.querySelector('.fa-check')) {
            const checkIcon = document.createElement('i');
            checkIcon.className = 'fas fa-check text-white text-xs';
            checkbox.appendChild(checkIcon);
          }
        } else {
          checkbox.classList.remove('checked');
          taskText.classList.remove('line-through', 'text-gray-500');
          
          const checkIcon = checkbox.querySelector('.fa-check');
          if (checkIcon) checkIcon.remove();
        }
      }
    })
    .catch((err) => {
      console.error('Failed to toggle task:', err);
    });
}

// File upload handling
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
imagePreviewContainer.className = 'grid grid-cols-3 gap-3 mt-4 max-h-[200px] overflow-y-auto pr-1';

// Update the scrollbar and container styles
const style = document.createElement('style');
style.textContent = `
  #imagePreviewContainer {
    scrollbar-width: thin;
    scrollbar-color: rgba(55, 65, 81, 0.3) transparent;
  }

  #imagePreviewContainer::-webkit-scrollbar {
    width: 3px;
  }

  #imagePreviewContainer::-webkit-scrollbar-track {
    background: transparent;
  }

  #imagePreviewContainer::-webkit-scrollbar-thumb {
    background: rgba(55, 65, 81, 0.3);
    border-radius: 20px;
  }

  .image-preview-item {
    background: #22252D;
    border: 1px solid #363B46;
  }

  .image-preview-item:hover {
    border-color: #3B82F6;
  }
`;
document.head.appendChild(style);

const errorMessage = document.getElementById('errorMessage');

let uploadedFiles = [];

// Handle drag and drop events
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('border-blue-500');
});

dropZone.addEventListener('dragleave', (e) => {
  e.preventDefault();
  dropZone.classList.remove('border-blue-500');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('border-blue-500');
  handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => {
  handleFiles(e.target.files);
});

function handleFiles(files) {
  const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
  
  if (uploadedFiles.length + imageFiles.length > 10) {
    showError('Maximum 10 images allowed');
    return;
  }

  imageFiles.forEach(file => {
    if (uploadedFiles.length >= 10) {
      showError('Maximum 10 images allowed');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      addImagePreview(e.target.result, file.name);
      uploadedFiles.push(file);
    };
    reader.readAsDataURL(file);
  });
}

// Update the image preview container styling
function addImagePreview(src, filename) {
  const preview = document.createElement('div');
  preview.className = 'relative group image-preview-item rounded-lg overflow-hidden aspect-square transition-all duration-200';
  preview.innerHTML = `
    <img src="${src}" alt="${filename}" class="w-full h-full object-cover">
    <button class="delete-image absolute top-2 right-2 bg-red-500/90 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
      <i class="fas fa-times text-xs"></i>
    </button>
  `;

  preview.querySelector('.delete-image').addEventListener('click', () => {
    uploadedFiles = uploadedFiles.filter(file => file.name !== filename);
    preview.remove();
  });

  imagePreviewContainer.appendChild(preview);
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove('hidden');
  setTimeout(() => {
    errorMessage.classList.add('hidden');
  }, 3000);
}

// Subtask handling
const subtasksList = document.getElementById('subtasksList');

// Update the subtask-add section
const subtaskAddContainer = document.querySelector('.subtask-add');
subtaskAddContainer.className = 'subtask-add text-gray-400 flex items-center gap-2 mt-3 group';
subtaskAddContainer.innerHTML = `
  <i class="fas fa-plus mt-2"></i>
  <div class="flex-grow flex items-center gap-2">
    <input 
      type="text" 
      id="newSubtaskInput" 
      placeholder="Add a new subtask" 
      class="bg-transparent border-none focus:outline-none text-gray-300 placeholder-gray-500 w-full text-sm py-1.5 transition-colors duration-200 hover:text-gray-200 focus:text-gray-200"
    >
    <button 
      id="addSubtaskButton"
      class="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition-colors duration-200"
    >
      Add
    </button>
  </div>
`;

function handleSubtaskInput() {
  const newSubtaskInput = document.getElementById('newSubtaskInput');
  const subtaskText = newSubtaskInput.value.trim();
  
  if (subtaskText) {
    addSubtask(subtaskText);
    newSubtaskInput.value = '';
  }
}

function addSubtask(text) {
  const subtaskElement = document.createElement('div');
  subtaskElement.className = 'flex items-center gap-3 group px-2 py-1.5 rounded-md hover:bg-gray-700/30 transition-colors duration-200';
  subtaskElement.innerHTML = `
    <div class="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0 group-hover:bg-gray-300 transition-colors"></div>
    <span class="text-gray-300 flex-grow text-sm group-hover:text-gray-200">${text}</span>
    <button 
      class="delete-subtask text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-300 transition-all duration-200 p-1 rounded-full hover:bg-red-400/10"
      onclick="deleteSubtask(this)"
    >
      <i class="fas fa-times text-xs"></i>
    </button>
  `;
  
  subtasksList.appendChild(subtaskElement);
}

// Add event listeners
document.getElementById('addSubtaskButton').addEventListener('click', (e) => {
  e.preventDefault();
  handleSubtaskInput();
});

document.getElementById('newSubtaskInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleSubtaskInput();
  }
});

function deleteSubtask(button) {
  const subtaskElement = button.closest('div');
  if (subtaskElement) {
    subtaskElement.remove();
  }
}



