async function handleAddTask(e) {
  e.preventDefault();
  const input = document.getElementById('newTaskInput');
  if (!input) {
    console.error('Could not find newTaskInput element');
    return;
  }
  
  const title = input.value.trim();
  if (!title) {
    console.error('Task title is empty');
    return;
  }

  const currentList = document.querySelector('h1').textContent.replace(' tasks', '');
  
  const newTask = {
    _id: 'local_' + Date.now(),
    title,
    list: currentList,
    completed: false,
    subtasks: [],
    attachments: []
  };

  // Make sure localTaskCache exists
  if (typeof window.localTaskCache === 'undefined') {
    window.localTaskCache = [];
  }

  localTaskCache.push(newTask);
  saveTaskCacheToLocalStorage();
  
  const taskElement = createTaskElement(newTask);
  const taskList = document.getElementById('taskList');
  if (taskList) {
    taskList.insertAdjacentElement('afterbegin', taskElement);
    updateTaskCount(currentList, 1);
  }
  
  input.value = '';

  try {
    const response = await fetch('/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, list: currentList, completed: false })
    });
    
    if (response.ok) {
      const serverTask = await response.json();
 
      const taskIndex = localTaskCache.findIndex(t => t._id === newTask._id);
      if (taskIndex !== -1) {
        localTaskCache[taskIndex] = serverTask;
        saveTaskCacheToLocalStorage();
       
        if (taskElement) {
          taskElement.dataset.taskId = serverTask._id;
        }
      }
    } else {
      console.error('Failed to save task to server:', response.status);
    }
  } catch (error) {
    console.error('Error syncing task with server:', error);
  }
}

function moveTaskToList(taskId, newList) {
  // Check if the task ID is a local ID
  const isLocalId = taskId.startsWith('local_');
  
  // Update local cache
  const taskIndex = localTaskCache.findIndex(task => task._id === taskId);
  if (taskIndex !== -1) {
    const oldList = localTaskCache[taskIndex].list;
    localTaskCache[taskIndex].list = newList;
    
    updateTaskCount(oldList, -1);
    updateTaskCount(newList, 1);
    saveTaskCacheToLocalStorage();
  }

  // Don't attempt server sync if it's a local ID that hasn't been synced yet
  if (isLocalId) {
    console.log('Task has not been synced to server yet, skipping server update');
    const currentList = document.querySelector('h1').textContent.replace(' tasks', '');
    if (typeof filterTasks === 'function') {
      filterTasks(currentList);
    }
    return;
  }

  // Only proceed with server sync for server-assigned IDs
  fetch(`/todos/${taskId}/move`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ list: newList })
  })
    .then(res => {
      if (!res.ok) {
        console.error(`Server error when moving task: ${res.status}`);
        return;
      }
      return res.json();
    })
    .then(() => {
      const currentList = document.querySelector('h1').textContent.replace(' tasks', '');
      if (typeof filterTasks === 'function') {
        filterTasks(currentList);
      }
    })
    .catch(error => console.error('Error moving task:', error));
}

// Helper function to save task cache to local storage
function saveTaskCacheToLocalStorage() {
  try {
    localStorage.setItem('taskCache', JSON.stringify(localTaskCache));
    console.log('Tasks saved to localStorage cache');
  } catch (error) {
    console.error('Error saving tasks to localStorage:', error);
  }
}

// Ensure the function is globally available
window.moveTaskToList = moveTaskToList;
window.handleAddTask = handleAddTask;
window.saveTaskCacheToLocalStorage = saveTaskCacheToLocalStorage;

function moveTaskToList(taskId, newList) {
  // Check if the task ID is a local ID
  const isLocalId = taskId.startsWith('local_');
  
  // Update local cache
  const taskIndex = localTaskCache.findIndex(task => task._id === taskId);
  if (taskIndex !== -1) {
    const oldList = localTaskCache[taskIndex].list;
    localTaskCache[taskIndex].list = newList;
    
    updateTaskCount(oldList, -1);
    updateTaskCount(newList, 1);
    saveTaskCacheToLocalStorage();
  }

  // Don't attempt server sync if it's a local ID that hasn't been synced yet
  if (isLocalId) {
    console.log('Task has not been synced to server yet, skipping server update');
    const currentList = document.querySelector('h1').textContent.replace(' tasks', '');
    if (typeof filterTasks === 'function') {
      filterTasks(currentList);
    }
    return;
  }

  // Only proceed with server sync for server-assigned IDs
  fetch(`/todos/${taskId}/move`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ list: newList })
  })
    .then(res => {
      if (!res.ok) {
        console.error(`Server error when moving task: ${res.status}`);
        return;
      }
      return res.json();
    })
    .then(() => {
      const currentList = document.querySelector('h1').textContent.replace(' tasks', '');
      if (typeof filterTasks === 'function') {
        filterTasks(currentList);
      }
    })
    .catch(error => console.error('Error moving task:', error));
}

// Helper function to save task cache to local storage
function saveTaskCacheToLocalStorage() {
  try {
    localStorage.setItem('taskCache', JSON.stringify(localTaskCache));
    console.log('Tasks saved to localStorage cache');
  } catch (error) {
    console.error('Error saving tasks to localStorage:', error);
  }
}

// Ensure the function is globally available
window.moveTaskToList = moveTaskToList;
window.handleAddTask = handleAddTask;
window.saveTaskCacheToLocalStorage = saveTaskCacheToLocalStorage;

function moveTaskToList(taskId, newList) {
  const taskIndex = localTaskCache.findIndex(task => task._id === taskId);
  if (taskIndex !== -1) {
    const oldList = localTaskCache[taskIndex].list;
    localTaskCache[taskIndex].list = newList;
 
    updateTaskCount(oldList, -1);
    updateTaskCount(newList, 1);
    saveTaskCacheToLocalStorage();
  }

  fetch(`/todos/${taskId}/move`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ list: newList })
  })
    .then(res => {
      if (!res.ok) {
        console.error('Server error when moving task');
        return;
      }
      return res.json();
    })
    .then(() => {
      const currentList = document.querySelector('h1').textContent.replace(' tasks', '');
      if (typeof filterTasks === 'function') {
        filterTasks(currentList);
      }
    })
    .catch(error => console.error('Error moving task:', error));
}

// Helper function to save task cache to local storage
function saveTaskCacheToLocalStorage() {
  try {
    localStorage.setItem('taskCache', JSON.stringify(localTaskCache));
    console.log('Tasks saved to localStorage cache');
  } catch (error) {
    console.error('Error saving tasks to localStorage:', error);
  }
}

// Ensure the function is globally available
window.moveTaskToList = moveTaskToList;
window.handleAddTask = handleAddTask;
window.saveTaskCacheToLocalStorage = saveTaskCacheToLocalStorage;