// listManager.js - Handles list management and list-specific content

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  setupListManager();
  setupAddTaskFormListener();
});

// Set up list management functionality
function setupListManager() {
  console.log('Setting up list manager...');
  
  // Set Personal as default list for new users
  if (!localStorage.getItem('activeList')) {
    localStorage.setItem('activeList', 'Personal');
    console.log('No active list found in localStorage, setting default to: Personal');
  }

  // Load the active list from localStorage
  const activeList = localStorage.getItem('activeList') || 'Personal';
  console.log('Initial active list:', activeList);
  
  // Add debug listeners to sidebar items
  setTimeout(() => {
    document.querySelectorAll('.sidebar-item').forEach(item => {
      const listName = item.dataset.list;
      if (listName) {
        console.log(`Setting up listener for sidebar list: ${listName}`);
        item.addEventListener('click', function() {
          console.log(`Clicked on list: ${listName}`);
          localStorage.setItem('activeList', listName);
          console.log(`Active list set to: ${listName}`);
        });
      }
    });
  }, 100);
  
  // Initial filter to show the active list's tasks - with a delay to ensure DOM is ready
  setTimeout(() => {
    filterTasks(activeList);
  }, 100);
}

// Completely refreshes the UI when switching between lists
window.filterTasks = function(listName) {
  console.log('Filtering tasks for list:', listName);
  
  // Save the active list to localStorage for persistence
  // This is CRITICAL - it ensures new tasks are added to the correct list
  localStorage.setItem('activeList', listName);
  console.log('Active list set in filterTasks to:', listName);
  console.log('Verifying localStorage value:', localStorage.getItem('activeList'));

  // 1. Update the header title
  const titleElement = document.querySelector('h1');
  if (titleElement) {
    titleElement.textContent = `${listName} tasks`;
  }

  // 2. Update task category input for new tasks
  const taskCategory = document.getElementById('taskCategory');
  if (taskCategory) {
    taskCategory.value = listName;
  }

  // 3. Clear input field for new tasks
  const newTaskInput = document.getElementById('newTaskInput');
  if (newTaskInput) {
    newTaskInput.value = '';
  }

  // 4. Update right panel list name
  const rightPanelListName = document.querySelector('#right-panel .text-gray-400');
  if (rightPanelListName) {
    rightPanelListName.textContent = listName;
  }

  // 5. Highlight the active list in the sidebar and remove highlight from others
  highlightActiveList(listName);

  // 6. Filter and render tasks for this specific list
  refreshTaskList(listName);
};

// Function to highlight the active list in the sidebar
function highlightActiveList(listName) {
  // Remove active class from all sidebar items
  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.classList.remove('bg-dark-hover', 'font-medium');
  });
  
  // Add active class to the selected list
  const activeItem = document.querySelector(`.sidebar-item[data-list="${listName}"]`);
  if (activeItem) {
    activeItem.classList.add('bg-dark-hover', 'font-medium');
  }
}

// Completely refresh the task list with filtered tasks
function refreshTaskList(listName) {
  const taskList = document.getElementById('taskList');
  if (!taskList) {
    console.error('Task list container not found');
    return;
  }
  
  // Clear existing tasks
  taskList.innerHTML = '';
  
  // Check if we have tasks in the cache
  if (typeof localTaskCache === 'undefined' || !Array.isArray(localTaskCache)) {
    console.warn('Local task cache not available or not an array');
    // Try to load from localStorage
    try {
      const cachedTasks = localStorage.getItem('taskCache');
      if (cachedTasks) {
        localTaskCache = JSON.parse(cachedTasks);
      } else {
        localTaskCache = [];
      }
    } catch (error) {
      console.error('Error loading tasks from localStorage:', error);
      localTaskCache = [];
    }
  }
  
  // Filter tasks for this list - STRICT MATCHING to prevent cross-list display
  const filteredTasks = localTaskCache.filter(task => task.list === listName);
  
  // Render filtered tasks
  if (filteredTasks.length === 0) {
    // Show empty state
    const emptyState = document.createElement('div');
    emptyState.className = 'text-center py-6 text-gray-500';
    emptyState.textContent = `No tasks in ${listName} list yet. Add one above!`;
    taskList.appendChild(emptyState);
  } else {
    // Create and add task elements
    filteredTasks.forEach(task => {
      const taskElement = createTaskElement(task);
      if (taskElement) {
        taskList.appendChild(taskElement);
      }
    });
  }
  
  // Update task counts
  updateAllTaskCounts();
  
  // Clear right panel if no tasks are selected
  const selectedTask = document.querySelector('.task-item.selected');
  if (!selectedTask) {
    resetRightPanel();
  }
}

// Update task counts for all lists
function updateAllTaskCounts() {
  const lists = ['Personal', 'Work', 'Grocery List'];
  
  lists.forEach(listName => {
    const count = localTaskCache.filter(task => task.list === listName).length;
    const countElement = document.getElementById(`count-${listName.toLowerCase().replace(' ', '-')}`);
    
    if (countElement) {
      countElement.textContent = count;
    }
  });
}

// Reset the right panel to default state
function resetRightPanel() {
  const titleElement = document.querySelector('#right-panel h2');
  if (titleElement) {
    titleElement.textContent = 'Selected Task';
  }
  
  // Clear notes
  const notesTextarea = document.querySelector('#right-panel textarea');
  if (notesTextarea) {
    notesTextarea.value = '';
  }
  
  // Clear subtasks
  const subtasksList = document.getElementById('subtasksList');
  if (subtasksList) {
    subtasksList.innerHTML = '<div class="text-gray-500 text-sm py-2">No subtasks added yet.</div>';
  }
  
  // Reset attachments
  const imagePreviewContainer = document.getElementById('imagePreviewContainer');
  if (imagePreviewContainer) {
    imagePreviewContainer.innerHTML = '';
  }
  
  // Add blur effect
  applyBlurEffect(false);
}

// Apply blur effect based on task completion
function applyBlurEffect(isCompleted) {
  const blurContent = document.getElementById('task-blur-content');
  if (blurContent) {
    if (isCompleted) {
      blurContent.classList.add('opacity-50', 'pointer-events-none');
    } else {
      blurContent.classList.remove('opacity-50', 'pointer-events-none');
    }
  }
}

// Handle adding new tasks with proper list assignment
function handleAddTask(e) {
  e.preventDefault();
  
  const input = document.getElementById('newTaskInput');
  if (!input) {
    console.error('Could not find newTaskInput element');
    return false;
  }
  
  const title = input.value.trim();
  if (!title) {
    console.error('Task title is empty');
    return false;
  }
  
  // Critical: Get the ACTIVE list directly from localStorage
  // This is what was missing in the original code
  let currentList = localStorage.getItem('activeList');
  
  // Log for debugging purposes
  console.log('Active list from localStorage:', currentList);
  
  // Fallback to 'Personal' only if activeList is null or undefined
  if (!currentList) {
    currentList = 'Personal';
    console.warn('No active list found, defaulting to Personal');
  }
  
  console.log(`Adding task "${title}" to list: ${currentList}`);
  
  // Create new task object
  const newTask = {
    _id: 'local_' + Date.now(),
    title: title,
    list: currentList, // Use the active list from localStorage
    completed: false,
    subtasks: [],
    attachments: []
  };
  
  // Add to local cache
  if (typeof localTaskCache === 'undefined') {
    localTaskCache = [];
  }
  
  localTaskCache.push(newTask);
  saveTaskCacheToLocalStorage();
  
  // Refresh the task list to show the new task
  refreshTaskList(currentList);
  
  // Clear input
  input.value = '';
  
  // Return false to prevent form submission
  return false;
}

// Setup form submission for adding tasks
function setupAddTaskFormListener() {
  const addTaskForm = document.getElementById('addTaskForm');
  if (addTaskForm) {
    // Remove existing listeners
    const newForm = addTaskForm.cloneNode(true);
    addTaskForm.parentNode.replaceChild(newForm, addTaskForm);
    
    // Add our new listener
    newForm.addEventListener('submit', handleAddTask);
  }
}

// Create a task element from task data
function createTaskElement(task) {
  if (!task) return null;
  
  const taskElement = document.createElement('div');
  taskElement.className = 'task-item group px-4 py-2.5 rounded-lg mb-1.5 cursor-pointer flex items-center gap-3 transition-all duration-200 hover:bg-dark-hover';
  taskElement.dataset.taskId = task._id;
  taskElement.dataset.list = task.list;
  
  // Create checkbox
  const checkbox = document.createElement('div');
  checkbox.className = `checkbox ${task.completed ? 'checked' : ''} w-5 h-5 border-2 border-dark-border rounded-full flex items-center justify-center transition-colors duration-200`;
  
  if (task.completed) {
    const checkIcon = document.createElement('i');
    checkIcon.className = 'fas fa-check text-white text-xs';
    checkbox.appendChild(checkIcon);
  }
  
  // Create task title
  const titleSpan = document.createElement('span');
  titleSpan.className = `${task.completed ? 'line-through text-gray-500' : 'text-gray-200'} flex-grow text-sm`;
  titleSpan.textContent = task.title;
  
  // Create actions container
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'task-item-actions flex items-center gap-1.5';
  
  // Create menu button container
  const menuContainer = document.createElement('div');
  menuContainer.className = 'relative';
  
  // Create menu button
  const menuBtn = document.createElement('button');
  menuBtn.className = 'menu-btn p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200';
  menuBtn.innerHTML = '<i class="fas fa-ellipsis-v text-white/70 hover:text-white"></i>';
  
  // Create dropdown menu
  const dropdown = document.createElement('div');
  dropdown.className = 'task-menu hidden absolute right-0 top-[120%] w-36 bg-dark-hover rounded-lg shadow-xl py-1';
  
  // Add list items to dropdown
  const lists = ['Personal', 'Work', 'Grocery List'];
  const icons = {
    'Personal': 'fas fa-user text-purple-400',
    'Work': 'fas fa-briefcase text-orange-400',
    'Grocery List': 'fas fa-shopping-cart text-cyan-400'
  };
  
  lists.forEach(list => {
    // Skip the current list in the dropdown
    if (list === task.list) return;
    
    const listItem = document.createElement('a');
    listItem.href = '#';
    listItem.className = 'menu-item';
    listItem.dataset.list = list;
    
    const icon = document.createElement('i');
    icon.className = icons[list] || 'fas fa-folder text-blue-400';
    
    const span = document.createElement('span');
    span.className = 'text-gray-300 hover:text-white';
    span.textContent = list;
    
    listItem.appendChild(icon);
    listItem.appendChild(span);
    
    // Add event listener for moving task to different list
    listItem.addEventListener('click', (e) => {
      e.preventDefault();
      moveTaskToList(task._id, list);
      dropdown.classList.add('hidden');
    });
    
    dropdown.appendChild(listItem);
  });
  
  // Create delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200';
  deleteBtn.innerHTML = '<i class="fas fa-times text-red-400/90 hover:text-red-400"></i>';
  
  // Add event listeners
  checkbox.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleTaskCompletion(task._id);
  });
  
  taskElement.addEventListener('click', (e) => {
    if (!e.target.closest('.checkbox') && !e.target.closest('.menu-btn') && !e.target.closest('.delete-btn')) {
      selectTask(task._id);
    }
  });
  
  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('hidden');
  });
  
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    deleteTask(task._id);
  });
  
  // Close all other dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!menuContainer.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });
  
  // Assemble all elements
  menuContainer.appendChild(menuBtn);
  menuContainer.appendChild(dropdown);
  actionsDiv.appendChild(menuContainer);
  actionsDiv.appendChild(deleteBtn);
  
  taskElement.appendChild(checkbox);
  taskElement.appendChild(titleSpan);
  taskElement.appendChild(actionsDiv);
  
  return taskElement;
}

// Toggle task completion status
function toggleTaskCompletion(taskId) {
  const taskIndex = localTaskCache.findIndex(task => task._id === taskId);
  if (taskIndex === -1) return;
  
  // Toggle completion status
  localTaskCache[taskIndex].completed = !localTaskCache[taskIndex].completed;
  saveTaskCacheToLocalStorage();
  
  // Update UI
  const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
  if (taskElement) {
    const checkbox = taskElement.querySelector('.checkbox');
    const titleSpan = taskElement.querySelector('span');
    
    if (localTaskCache[taskIndex].completed) {
      checkbox.classList.add('checked');
      checkbox.innerHTML = '<i class="fas fa-check text-white text-xs"></i>';
      titleSpan.classList.add('line-through', 'text-gray-500');
      titleSpan.classList.remove('text-gray-200');
    } else {
      checkbox.classList.remove('checked');
      checkbox.innerHTML = '';
      titleSpan.classList.remove('line-through', 'text-gray-500');
      titleSpan.classList.add('text-gray-200');
    }
  }
  
  // If this task is currently selected, update the blur effect
  const selectedTask = document.querySelector('.task-item.selected');
  if (selectedTask && selectedTask.dataset.taskId === taskId) {
    applyBlurEffect(localTaskCache[taskIndex].completed);
  }
  
  // Try to sync with server
  try {
    fetch(`/todos/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: localTaskCache[taskIndex].completed })
    }).catch(error => {
      console.error('Error syncing task completion status:', error);
    });
  } catch (error) {
    console.error('Error making network request:', error);
  }
}

// Move task to a different list
function moveTaskToList(taskId, newList) {
  const taskIndex = localTaskCache.findIndex(task => task._id === taskId);
  if (taskIndex === -1) return;
  
  const oldList = localTaskCache[taskIndex].list;
  
  // Update task in cache
  localTaskCache[taskIndex].list = newList;
  saveTaskCacheToLocalStorage();
  
  // Get current list view
  const currentList = localStorage.getItem('activeList');
  
  // If currently viewing the old list, remove the task from view immediately
  // This ensures tasks don't appear to stay in multiple lists
  if (currentList === oldList) {
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    if (taskElement) {
      taskElement.remove();
      
      // Check if this was the last task in the list
      const remainingTasks = document.querySelectorAll('.task-item');
      if (remainingTasks.length === 0) {
        // Show empty state
        const taskList = document.getElementById('taskList');
        if (taskList) {
          const emptyState = document.createElement('div');
          emptyState.className = 'text-center py-6 text-gray-500';
          emptyState.textContent = `No tasks in ${oldList} list yet. Add one above!`;
          taskList.appendChild(emptyState);
        }
      }
    }
  }
  
  // Update counts for all lists
  updateAllTaskCounts();
  
  // Try to sync with server
  try {
    fetch(`/todos/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ list: newList })
    }).catch(error => {
      console.error('Error syncing task list change:', error);
    });
  } catch (error) {
    console.error('Error making network request:', error);
  }
}

// Select a task to display in the right panel
function selectTask(taskId) {
  // Remove selection from all tasks
  document.querySelectorAll('.task-item').forEach(item => {
    item.classList.remove('bg-dark-hover', 'selected');
  });
  
  // Add selection to the clicked task
  const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
  if (taskElement) {
    taskElement.classList.add('bg-dark-hover', 'selected');
  }
  
  // Find task data
  const task = localTaskCache.find(t => t._id === taskId);
  if (!task) return;
  
  // Update right panel title
  const titleElement = document.querySelector('#right-panel h2');
  if (titleElement) {
    titleElement.textContent = task.title;
  }
  
  // Update right panel list name
  const listElement = document.querySelector('#right-panel .text-gray-400');
  if (listElement) {
    listElement.textContent = task.list;
  }
  
  // Update notes if they exist
  const notesTextarea = document.querySelector('#right-panel textarea');
  if (notesTextarea && task.notes) {
    notesTextarea.value = task.notes;
  } else if (notesTextarea) {
    notesTextarea.value = '';
  }
  
  // Set complete button text based on task completion status
  const completeBtn = document.getElementById('complete-btn');
  if (completeBtn) {
    completeBtn.textContent = task.completed ? 'Mark as Incomplete' : 'Mark as Complete';
  }
  
  // Clear blur effect based on task completion
  applyBlurEffect(task.completed);
  
  // Render subtasks if that function exists
  if (typeof renderSubtasks === 'function') {
    renderSubtasks(task);
  }
}

// Delete a task
function deleteTask(taskId) {
  const taskIndex = localTaskCache.findIndex(task => task._id === taskId);
  if (taskIndex === -1) return;
  
  const listName = localTaskCache[taskIndex].list;
  
  // Remove from local cache
  localTaskCache.splice(taskIndex, 1);
  saveTaskCacheToLocalStorage();
  
  // Remove from UI
  const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
  if (taskElement) {
    taskElement.remove();
  }
  
  // Update counts
  updateAllTaskCounts();
  
  // Reset right panel if the deleted task was selected
  const selectedTask = document.querySelector('.task-item.selected');
  if (!selectedTask) {
    resetRightPanel();
  }
  
  // Check if this was the last task in the list
  const remainingTasks = document.querySelectorAll('.task-item');
  if (remainingTasks.length === 0) {
    // Show empty state
    const taskList = document.getElementById('taskList');
    if (taskList) {
      const emptyState = document.createElement('div');
      emptyState.className = 'text-center py-6 text-gray-500';
      emptyState.textContent = `No tasks in ${listName} list yet. Add one above!`;
      taskList.appendChild(emptyState);
    }
  }
  
  // Try to sync with server
  try {
    fetch(`/todos/${taskId}`, {
      method: 'DELETE'
    }).catch(error => {
      console.error('Error deleting task:', error);
    });
  } catch (error) {
    console.error('Error making network request:', error);
  }
}

// Save task cache to localStorage
function saveTaskCacheToLocalStorage() {
  try {
    localStorage.setItem('taskCache', JSON.stringify(localTaskCache));
  } catch (error) {
    console.error('Error saving task cache to localStorage:', error);
  }
}

// Ensure we have a task cache defined
if (typeof localTaskCache === 'undefined') {
  try {
    const cachedTasks = localStorage.getItem('taskCache');
    if (cachedTasks) {
      localTaskCache = JSON.parse(cachedTasks);
    } else {
      localTaskCache = [];
    }
  } catch (error) {
    console.error('Error loading tasks from localStorage:', error);
    localTaskCache = [];
  }
}

// Function to mark the selected task as complete/incomplete
window.markSelectedTaskComplete = function() {
  const selectedTask = document.querySelector('.task-item.selected');
  if (selectedTask) {
    const taskId = selectedTask.dataset.taskId;
    toggleTaskCompletion(taskId);
  }
};

// Initialize task counts on page load
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    updateAllTaskCounts();
  }, 200);
});