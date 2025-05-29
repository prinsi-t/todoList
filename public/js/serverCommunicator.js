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

function updateTaskCount(listName, delta) {
  if (!listName) {
    console.error('No list name provided to updateTaskCount');
    return;
  }
  
  const listSelector = listName.toLowerCase().replace(/\s+/g, '-');
  const countElement = document.getElementById(`count-${listSelector}`);
  
  console.log(`Updating count for ${listName} (selector: count-${listSelector}) by ${delta}`);
  
  if (countElement) {
    let count = parseInt(countElement.textContent) || 0;
    count = Math.max(0, count + delta); 
    countElement.textContent = count;
    console.log(`Updated count for ${listName} to ${count}`);
  } else {
    console.warn(`Count element for "${listName}" not found with selector: count-${listSelector}`);
  }
  
  const allTasksCount = document.getElementById('allTasksCount');
  if (allTasksCount) {
    let total = parseInt(allTasksCount.textContent) || 0;
    total = Math.max(0, total + delta);
    allTasksCount.textContent = total;
    console.log(`Updated total tasks count to ${total}`);
  }
}

function moveTaskToList(taskId, newList) {
  const taskIndex = localTaskCache.findIndex(task => task._id === taskId);
  if (taskIndex === -1) {
    console.error(`Task with ID ${taskId} not found in local cache`);
    return;
  }

  const task = localTaskCache[taskIndex];
  const oldList = task.list;

  if (oldList === newList) {
    console.log(`Task is already in ${newList}`);
    return;
  }

  // Store current visible list so we don’t jump views
  const currentVisibleList = localStorage.getItem('activeList');

  // Update task data
  task.list = newList;
  localTaskCache[taskIndex] = task;
  saveTaskCacheToLocalStorage();

  if (typeof updateRightPanelVisibility === 'function') {
    updateRightPanelVisibility(oldList);
  }
  

  // Update list counters
  updateTaskCount(oldList, -1);
  updateTaskCount(newList, 1);

  // Remove the task element from DOM manually
  const taskEl = document.querySelector(`.task-item[data-task-id="${taskId}"]`);
  if (taskEl) taskEl.remove();

// Hide any existing panels
document.querySelectorAll('.right-panel').forEach(panel => {
  panel.classList.add('hidden');
  panel.style.display = 'none';
});

// Also hide right panel container itself
const rightPanelContainer = document.getElementById('right-panels-container');
if (rightPanelContainer) {
  rightPanelContainer.classList.add('hidden');
}

// Re-render the visible list (if still on the old one)
if (typeof filterTasks === 'function') {
  filterTasks(currentVisibleList, false);
}


const selectedId = localStorage.getItem('selectedTaskId');
if (selectedId === taskId) {
  const oldListId = oldList.toLowerCase().replace(/\s+/g, '-');
  const specificPanelId = `right-panel-${oldListId}-${taskId}`;
  const basePanelId = `right-panel-${oldListId}`;
  
  console.log(`[MoveTask] Removing panel for task "${taskId}" in list "${oldList}"`);

  const specificPanel = document.getElementById(specificPanelId);
  if (specificPanel) {
    specificPanel.remove();
    console.log(`✅ Removed specific panel: ${specificPanelId}`);
  }

  const basePanel = document.getElementById(basePanelId);
  if (basePanel) {
    basePanel.classList.add('hidden');
    basePanel.style.display = 'none';
    console.log(`✅ Hid base list panel: ${basePanelId}`);
  }

  const container = document.getElementById('right-panels-container');
  if (container) {
    container.classList.add('hidden');
    console.log(`✅ Hid right panel container`);
  }

  // Clear old selection state
  localStorage.removeItem('selectedTaskId');
  window.currentTaskId = null;



  setTimeout(() => {
    console.log(`[MoveTask] Creating new panel in list: ${newList}`);
    
    if (typeof createPanelForTask === 'function') {
      createPanelForTask(task);
    }

    if (typeof window.localTaskCache !== 'undefined') {
      window.localTaskCache = JSON.parse(localStorage.getItem('taskCache') || '[]');
    }
    
  



  
    if (typeof setSelectedTaskUI === 'function') {
      setSelectedTaskUI(task);
    }
  
    if (typeof showPanelForTask === 'function') {
      showPanelForTask(task);
    }
  
    const panelId = `right-panel-${newList.toLowerCase().replace(/\s+/g, '-')}-${task._id}`;
    const newPanel = document.getElementById(panelId);
    if (newPanel) {
      console.log(`[MoveTask] ✅ Successfully showed new panel: ${panelId}`);
    } else {
      console.warn(`[MoveTask] ⚠️ New panel not found: ${panelId}`);
    }
  }, 10);
  
  
  
}


  

  // Sync with server if task is not local
  if (!taskId.startsWith('local_')) {
    fetch(`/todos/${taskId}/move`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ list: newList })
    }).catch(err => console.error('Error moving task on server:', err));
  }
}





function saveTaskCacheToLocalStorage() {
  try {
    localStorage.setItem('taskCache', JSON.stringify(localTaskCache));
    console.log('Tasks saved to localStorage cache');
  } catch (error) {
    console.error('Error saving tasks to localStorage:', error);
  }
}

window.moveTaskToList = moveTaskToList;
window.handleAddTask = handleAddTask;
window.saveTaskCacheToLocalStorage = saveTaskCacheToLocalStorage;
window.updateTaskCount = updateTaskCount;