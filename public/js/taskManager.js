let isTaskBlurred = false;

document.addEventListener('DOMContentLoaded', function() {
  const addTaskForm = document.getElementById('addTaskForm');
  const newTaskInput = document.getElementById('newTaskInput');
  const taskCategory = document.getElementById('taskCategory');
  const taskList = document.getElementById('taskList');
  const taskBlurContent = document.getElementById('task-blur-content');
  const completeBtn = document.getElementById('complete-btn');

  loadTasksFromLocalStorage();
  
  isTaskBlurred = localStorage.getItem('isTaskBlurred') === 'true';
 
  if (isTaskBlurred) {
    taskBlurContent.classList.add('blurred');
    taskBlurContent.style.cssText = 'filter: blur(5px) !important; pointer-events: none;';
    completeBtn.textContent = 'Mark as Incomplete';
    completeBtn.className = 'bg-green-500 text-white px-4 py-2 rounded-md';
  }
  
  setupAddTaskFormListener();
  
  completeBtn.addEventListener('click', function() {
    isTaskBlurred = !isTaskBlurred;
  
    localStorage.setItem('isTaskBlurred', isTaskBlurred);
    
    const blurContent = document.getElementById('task-blur-content');
    
    if (isTaskBlurred) {
      blurContent.classList.add('blurred');
      blurContent.removeAttribute('style');
      blurContent.style.cssText = 'filter: blur(5px) !important; pointer-events: none;';
      completeBtn.textContent = 'Mark as Incomplete';
      completeBtn.className = 'bg-green-500 text-white px-4 py-2 rounded-md'; 
      console.log('Applying blur effect with 5px blur');

    } else {
      blurContent.classList.remove('blurred');
      blurContent.removeAttribute('style');
      blurContent.style.cssText = 'filter: none !important; pointer-events: auto;';
      completeBtn.textContent = 'Mark as Complete';
      completeBtn.className = 'bg-blue-500 text-white px-4 py-2 rounded-md'; 
      console.log('Removing blur effect completely');
    }
  });
  
  loadTasksFromServer();
});

function loadTasksFromLocalStorage() {
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

function saveTaskCacheToLocalStorage() {
  try {
    localStorage.setItem('taskCache', JSON.stringify(localTaskCache));
  } catch (error) {
    console.error('Error saving task cache to localStorage:', error);
  }
}

async function loadTasksFromServer() {
  try {
    const response = await fetch('/todos/all');
    if (response.ok) {
      const serverTasks = await response.json();

      const localTaskMap = {};
      localTaskCache.forEach(task => {
        localTaskMap[task._id] = task;
      });

      const mergedTasks = serverTasks.map(serverTask => {
        const localTask = localTaskMap[serverTask._id];
        if (localTask) {
          serverTask.completed = localTask.completed;
          if (localTask.subtasks && localTask.subtasks.length > 0) {
            serverTask.subtasks = [...localTask.subtasks];
          }
          delete localTaskMap[serverTask._id];
        }
        return serverTask;
      });
   
      for (const taskId in localTaskMap) {
        if (taskId.startsWith('local_')) {
          mergedTasks.push(localTaskMap[taskId]);
        }
      }

      localTaskCache = mergedTasks;
      saveTaskCacheToLocalStorage();
      updateAllTaskCounts();

      const currentList = document.querySelector('h1')?.textContent.replace(' tasks', '') || 'Personal';
      filterTasks(currentList);
    } else {
      console.error('Failed to fetch tasks from server:', response.status);
    }
  } catch (error) {
    console.error('Error loading tasks from server:', error);
    updateAllTaskCounts();
    const currentList = document.querySelector('h1')?.textContent.replace(' tasks', '') || 'Personal';
    filterTasks(currentList);
  }
}

function setupAddTaskFormListener() {
  const addTaskForm = document.getElementById('addTaskForm');
  if (addTaskForm) {
    const newForm = addTaskForm.cloneNode(true);
    addTaskForm.parentNode.replaceChild(newForm, addTaskForm);
    
    newForm.addEventListener('submit', handleAddTask);
  }
}

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
  
  let currentList = localStorage.getItem('activeList');
  
  console.log('Active list from localStorage:', currentList);
  
  if (!currentList) {
    currentList = 'Personal';
    console.warn('No active list found, defaulting to Personal');
  }
  
  console.log(`Adding task "${title}" to list: ${currentList}`);
  
  const newTask = {
    _id: 'local_' + Date.now(),
    title: title,
    list: currentList, 
    completed: false,
    subtasks: [],
    attachments: []
  };
  
  localTaskCache.push(newTask);
  saveTaskCacheToLocalStorage();
  
  // Update the task count for this list immediately
  window.updateTaskCount(currentList, 1); // Increase count by 1
  
  refreshTaskList(currentList);
  
  input.value = '';
  
  return false;
}

function highlightActiveList(listName) {
  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.classList.remove('active');
  });
  
  const listSelector = listName.toLowerCase().replace(/\s+/g, '-');
  const activeItem = document.querySelector(`.sidebar-item[data-list="${listSelector}"]`);
  if (activeItem) {
    activeItem.classList.add('active');
  }
}

function refreshTaskList(listName) {
  const taskList = document.getElementById('taskList');
  if (!taskList) {
    console.error('Task list container not found');
    return;
  }
  
  taskList.innerHTML = '';
  
  const filteredTasks = localTaskCache.filter(task => task.list === listName);
  
  if (filteredTasks.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'text-center py-6 text-gray-500';
    emptyState.textContent = `No tasks in ${listName} list yet. Add one above!`;
    taskList.appendChild(emptyState);
  } else {
    filteredTasks.forEach(task => {
      const taskElement = createTaskElement(task);
      if (taskElement) {
        taskList.appendChild(taskElement);
      }
    });
  }
  
  updateAllTaskCounts();
  
  const selectedTask = document.querySelector('.task-item.selected');
  if (!selectedTask) {
    resetRightPanel();
  }
}

function createTaskElement(task) {
  if (!task) return null;
  
  const taskElement = document.createElement('div');
  taskElement.className = 'task-item group px-4 py-2.5 rounded-lg mb-1.5 cursor-pointer flex items-center gap-3 transition-all duration-200 hover:bg-dark-hover';
  taskElement.dataset.taskId = task._id;
  taskElement.dataset.list = task.list;
  
  const checkbox = document.createElement('div');
  checkbox.className = `checkbox ${task.completed ? 'checked bg-blue-500 border-blue-500' : ''} w-5 h-5 border-2 border-dark-border rounded-full flex items-center justify-center transition-colors duration-200`;
  
  if (task.completed) {
    const checkIcon = document.createElement('i');
    checkIcon.className = 'fas fa-check text-white text-xs';
    checkbox.appendChild(checkIcon);
  }
  
  const titleSpan = document.createElement('span');
  titleSpan.className = `${task.completed ? 'line-through text-gray-500' : 'text-gray-200'} flex-grow text-sm`;
  titleSpan.textContent = task.title;
  
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'task-item-actions flex items-center gap-1.5';
  
  const menuContainer = document.createElement('div');
  menuContainer.className = 'relative';
  
  const menuBtn = document.createElement('button');
  menuBtn.className = 'menu-btn p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200';
  menuBtn.innerHTML = '<i class="fas fa-ellipsis-v text-white/70 hover:text-white"></i>';
  
  const dropdown = document.createElement('div');
  dropdown.className = 'task-menu hidden absolute right-0 top-[120%] w-36 bg-dark-hover rounded-lg shadow-xl py-1';
  
  const lists = ['Personal', 'Work', 'Grocery List'];
  const icons = {
    'Personal': 'fas fa-user text-purple-400',
    'Work': 'fas fa-briefcase text-orange-400',
    'Grocery List': 'fas fa-shopping-cart text-cyan-400'
  };
  
  lists.forEach(list => {
    if (list === task.list) return;
    
    const listItem = document.createElement('a');
    listItem.href = '#';
    listItem.className = 'menu-item px-3 py-2 flex items-center gap-2 hover:bg-dark-accent transition-colors duration-150';
    listItem.dataset.list = list;
    
    const icon = document.createElement('i');
    icon.className = icons[list] || 'fas fa-folder text-blue-400';
    
    const span = document.createElement('span');
    span.className = 'text-gray-300 hover:text-white';
    span.textContent = list;
    
    listItem.appendChild(icon);
    listItem.appendChild(span);
    
    listItem.addEventListener('click', (e) => {
      e.preventDefault();
      moveTaskToList(task._id, list);
      dropdown.classList.add('hidden');
    });
    
    dropdown.appendChild(listItem);
  });
  
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200';
  deleteBtn.innerHTML = '<i class="fas fa-times text-red-400/90 hover:text-red-400"></i>';
  
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
  
  document.addEventListener('click', (e) => {
    if (!menuContainer.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });
  
  menuContainer.appendChild(menuBtn);
  menuContainer.appendChild(dropdown);
  actionsDiv.appendChild(menuContainer);
  actionsDiv.appendChild(deleteBtn);
  
  taskElement.appendChild(checkbox);
  taskElement.appendChild(titleSpan);
  taskElement.appendChild(actionsDiv);
  
  return taskElement;
}

function toggleTaskCompletion(taskId) {
  const taskIndex = localTaskCache.findIndex(task => task._id === taskId);
  if (taskIndex === -1) return;
  
  const newCompletedState = !localTaskCache[taskIndex].completed;
  localTaskCache[taskIndex].completed = newCompletedState;
  saveTaskCacheToLocalStorage();
  
  const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
  if (taskElement) {
    const checkbox = taskElement.querySelector('.checkbox');
    const titleSpan = taskElement.querySelector('span');
    
    if (newCompletedState) {
      checkbox.classList.add('checked', 'bg-blue-500', 'border-blue-500');
      checkbox.innerHTML = '<i class="fas fa-check text-white text-xs"></i>';
      titleSpan.classList.add('line-through', 'text-gray-500');
      titleSpan.classList.remove('text-gray-200');
    } else {
      checkbox.classList.remove('checked', 'bg-blue-500', 'border-blue-500');
      checkbox.innerHTML = '';
      titleSpan.classList.remove('line-through', 'text-gray-500');
      titleSpan.classList.add('text-gray-200');
    }
  }
  
  const selectedTask = document.querySelector('.task-item.selected');
  if (selectedTask && selectedTask.dataset.taskId === taskId) {
    applyBlurEffect(newCompletedState);
  }
  
  if (taskId.startsWith('local_')) {
    console.log(`Skipping server update for local task: ${taskId}`);
    return;
  }
  
  try {
    fetch(`/todos/${taskId}/complete`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: newCompletedState })
    })
      .then(res => {
        if (!res.ok) {
          console.error(`Server error when updating task completion status: ${res.status}`);
          return null;
        }
        return res.json();
      })
      .then(updatedTask => {
        if (updatedTask) { 
          const taskIndex = localTaskCache.findIndex(task => task._id === taskId);
          if (taskIndex !== -1) {
            const currentCompleted = localTaskCache[taskIndex].completed;
            localTaskCache[taskIndex] = updatedTask;
            localTaskCache[taskIndex].completed = currentCompleted;
            saveTaskCacheToLocalStorage();
          }
        }
      })
      .catch(error => console.error('Error syncing task completion status:', error));
  } catch (error) {
    console.error('Error making network request:', error);
  }
}
function moveTaskToList(taskId, newList) {
  const taskIndex = localTaskCache.findIndex(task => task._id === taskId);
  if (taskIndex === -1) {
    console.error(`Task with ID ${taskId} not found`);
    return;
  }
  
  const oldList = localTaskCache[taskIndex].list;
  if (oldList === newList) {
    console.log(`Task is already in ${newList} list`);
    return;
  }
  
  console.log(`Moving task ${taskId} from ${oldList} to ${newList}`);
  
  // Update the task in local cache
  localTaskCache[taskIndex].list = newList;
  saveTaskCacheToLocalStorage();
  
  // Get the current active list
  const currentList = localStorage.getItem('activeList') || 'Personal';
  
  // Update task counts for both lists immediately
  window.updateTaskCount(oldList, -1); // Decrease count in old list
  window.updateTaskCount(newList, 1);  // Increase count in new list
  
  // If we're currently viewing the source list, remove the task from view
  if (currentList === oldList) {
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    if (taskElement) {
      taskElement.remove();
      
      const remainingTasks = document.querySelectorAll('.task-item');
      if (remainingTasks.length === 0) {
        const taskList = document.getElementById('taskList');
        if (taskList) {
          const emptyState = document.createElement('div');
          emptyState.className = 'text-center py-6 text-gray-500';
          emptyState.textContent = `No tasks in ${oldList} list yet. Add one above!`;
          taskList.appendChild(emptyState);
        }
      }
    }

    // Reset right panel if this was the selected task
    if (window.currentTaskId === taskId) {
      resetRightPanel();
      window.currentTaskId = null;
    }
  } 
  
  // Important: Even if we're not viewing the destination list, create the task element
  // so it's ready when the user navigates to that list
  const destinationTaskList = document.getElementById('taskList-' + newList.toLowerCase().replace(/\s+/g, '-'));
  if (destinationTaskList) {
    // If the destination list element exists in the DOM, update it
    const taskElement = createTaskElement(localTaskCache[taskIndex]);
    if (taskElement) {
      // Remove any empty state message
      const emptyState = destinationTaskList.querySelector('.text-gray-500');
      if (emptyState) {
        emptyState.remove();
      }
      destinationTaskList.appendChild(taskElement);
    }
  } else {
    // If we're viewing the destination list, refresh it to show the moved task
    if (currentList === newList) {
      refreshTaskList(newList);
    }
  }
  
  // If this is a local task, skip server update
  if (taskId.startsWith('local_')) {
    console.log(`Skipping server update for local task: ${taskId}`);
    return;
  }
  
  // Update on server
  try {
    fetch(`/todos/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ list: newList })
    })
    .then(res => {
      if (!res.ok) {
        console.error(`Server error when updating task list: ${res.status}`);
        return null;
      }
      return res.json();
    })
    .then(updatedTask => {
      if (updatedTask) {
        console.log('Task updated on server:', updatedTask);
      }
    })
    .catch(error => {
      console.error('Error syncing task list change:', error);
    });
  } catch (error) {
    console.error('Error making network request:', error);
  }
}

function selectTask(taskId) {
  document.querySelectorAll('.task-item').forEach(item => {
    item.classList.remove('bg-dark-hover', 'selected');
  });
  
  const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
  if (taskElement) {
    taskElement.classList.add('bg-dark-hover', 'selected');
  }
  
  const task = localTaskCache.find(t => t._id === taskId);
  if (!task) return;
  
  window.currentTaskId = taskId;
  
  const titleElement = document.querySelector('#right-panel h2');
  if (titleElement) {
    titleElement.textContent = task.title;
  }
  
  const listElement = document.querySelector('#right-panel .text-gray-400');
  if (listElement) {
    listElement.textContent = task.list;
  }
  
  const notesTextarea = document.querySelector('#right-panel textarea');
  if (notesTextarea && task.notes) {
    notesTextarea.value = task.notes;
  } else if (notesTextarea) {
    notesTextarea.value = '';
  }
  
  const completeBtn = document.getElementById('complete-btn');
  if (completeBtn) {
    completeBtn.textContent = task.completed ? 'Mark as Incomplete' : 'Mark as Complete';
    completeBtn.className = task.completed ? 
      'bg-green-500 text-white px-4 py-2 rounded-md' : 
      'bg-blue-500 text-white px-4 py-2 rounded-md';
  }
  
  applyBlurEffect(task.completed);
  
  if (typeof renderSubtasks === 'function') {
    renderSubtasks(task);
  }
}

function loadTaskDetails(task) {
  selectTask(task._id);
}

function deleteTask(taskId) {
  const taskIndex = localTaskCache.findIndex(task => task._id === taskId);
  if (taskIndex === -1) return;
  
  const listName = localTaskCache[taskIndex].list;
  console.log(`Deleting task ${taskId} from list ${listName}`);
  
  // Store the task's list name before removing it from cache
  const taskList = listName;
  
  // Remove from local cache
  localTaskCache.splice(taskIndex, 1);
  saveTaskCacheToLocalStorage();
  
  const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
  if (taskElement) {
    taskElement.classList.add('opacity-0', 'scale-95');
    setTimeout(() => {
      taskElement.remove();
      
      const currentList = localStorage.getItem('activeList') || 'Personal';
      if (currentList === taskList) {
        const remainingTasks = document.querySelectorAll('.task-item');
        if (remainingTasks.length === 0) {
          const taskList = document.getElementById('taskList');
          if (taskList) {
            const emptyState = document.createElement('div');
            emptyState.className = 'text-center py-6 text-gray-500';
            emptyState.textContent = `No tasks in ${currentList} list yet. Add one above!`;
            taskList.appendChild(emptyState);
          }
        }
      }
    }, 200);
  }

  // Debug output before updating count
  console.log(`About to decrease count for ${taskList} by 1`);
  
  // Update the count indicator for this list directly
  const listSelector = taskList.toLowerCase().replace(/\s+/g, '-');
  const countElement = document.getElementById(`count-${listSelector}`);
  if (countElement) {
    let count = parseInt(countElement.textContent) || 0;
    count = Math.max(0, count - 1); // Ensure it doesn't go negative
    countElement.textContent = count;
    console.log(`Updated count for ${taskList} to ${count}`);
  } else {
    console.warn(`Count element for "${taskList}" not found: count-${listSelector}`);
  }
  
  // Also update the total count
  const allTasksCount = document.getElementById('allTasksCount');
  if (allTasksCount) {
    let total = parseInt(allTasksCount.textContent) || 0;
    total = Math.max(0, total - 1); // Ensure it doesn't go negative
    allTasksCount.textContent = total;
    console.log(`Updated total count to ${total}`);
  }
  
  if (window.currentTaskId === taskId) {
    resetRightPanel();
    window.currentTaskId = null;
  }
  
  if (taskId.startsWith('local_')) {
    console.log(`Skipping server delete for local task: ${taskId}`);
    return;
  }
  
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


window.filterTasks = function(listName) {
  console.log('Filtering tasks for list:', listName);
  
  // Save the active list to localStorage
  localStorage.setItem('activeList', listName);
  
  // Update the UI to show which list is active
  const titleElement = document.querySelector('h1');
  if (titleElement) {
    titleElement.textContent = `${listName} tasks`;
  }

  const taskCategory = document.getElementById('taskCategory');
  if (taskCategory) {
    taskCategory.value = listName;
  }

  const newTaskInput = document.getElementById('newTaskInput');
  if (newTaskInput) {
    newTaskInput.value = '';
  }

  const rightPanelListName = document.querySelector('#right-panel .text-gray-400');
  if (rightPanelListName) {
    rightPanelListName.textContent = listName;
  }

  // Highlight the active list in the sidebar
  if (typeof window.highlightActiveList === 'function') {
    window.highlightActiveList(listName);
  } else {
    highlightActiveList(listName);
  }

  // Refresh the task list with the filtered tasks
  refreshTaskList(listName);
};

function updateAllTaskCounts() {
  const lists = ['Personal', 'Work', 'Grocery List'];
  // Get all unique list names from tasks
  const customLists = [...new Set(localTaskCache.map(task => task.list))].filter(list => 
    !lists.includes(list) && list
  );
  
  // Combine default and custom lists
  const allLists = [...lists, ...customLists];
  
  let totalTasks = 0;
  
  allLists.forEach(listName => {
    const listTasks = localTaskCache.filter(task => task.list === listName);
    const count = listTasks.length;
    totalTasks += count;
    
    const listSelector = listName.toLowerCase().replace(/\s+/g, '-');
    const countElement = document.getElementById(`count-${listSelector}`);
    
    if (countElement) {
      countElement.textContent = count;
      console.log(`Set count for ${listName} to ${count}`);
    } else {
      console.warn(`Count element for list "${listName}" not found, selector: count-${listSelector}`);
      
      // For custom lists, we might need to create the count element
      // This would require additional code to access the sidebar structure
      // But we can check if there's a list item for this list
      const listItem = document.querySelector(`.sidebar-item[data-list="${listSelector}"]`);
      if (listItem) {
        // If we found the list item but not the count, let's try to find/create the count span
        let countSpan = listItem.querySelector('.task-count');
        if (!countSpan) {
          // Create a new count span if needed
          countSpan = document.createElement('span');
          countSpan.id = `count-${listSelector}`;
          countSpan.className = 'task-count text-xs bg-dark-hover rounded-md px-1.5 py-0.5 ml-auto';
          listItem.appendChild(countSpan);
        }
        countSpan.textContent = count;
      }
    }
  });
  
  const allTasksCount = document.getElementById('allTasksCount');
  if (allTasksCount) {
    allTasksCount.textContent = totalTasks;
    console.log(`Set all tasks count to ${totalTasks}`);
  }
}

function applyBlurEffect(isCompleted) {
  const blurContent = document.getElementById('task-blur-content');
  if (blurContent) {
    if (isCompleted && isTaskBlurred) {
      blurContent.classList.add('blurred');
      blurContent.style.cssText = 'filter: blur(5px) !important; pointer-events: none;';
    } else {
      blurContent.classList.remove('blurred');
      blurContent.style.cssText = 'filter: none !important; pointer-events: auto;';
    }
  }
}

function resetRightPanel() {
  const titleElement = document.querySelector('#right-panel h2');
  if (titleElement) {
    titleElement.textContent = 'Selected Task';
  }
  
  const listElement = document.querySelector('#right-panel .text-gray-400');
  if (listElement) {
    listElement.textContent = '';
  }
  
  const notesTextarea = document.querySelector('#right-panel textarea');
  if (notesTextarea) {
    notesTextarea.value = '';
  }
  
  const subtasksList = document.getElementById('subtasksList');
  if (subtasksList) {
    subtasksList.innerHTML = '<div class="text-gray-500 text-sm py-2">No subtasks added yet.</div>';
  }
  
  const imagePreviewContainer = document.getElementById('imagePreviewContainer');
  if (imagePreviewContainer) {
    imagePreviewContainer.innerHTML = '';
  }
  
  applyBlurEffect(false);
}

window.markSelectedTaskComplete = function() {
  const selectedTask = document.querySelector('.task-item.selected');
  if (selectedTask) {
    const taskId = selectedTask.dataset.taskId;
    toggleTaskCompletion(taskId);
  }
};