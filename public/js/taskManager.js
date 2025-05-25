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

  ensureCountElementsExist();
  
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

      const currentList = localStorage.getItem('activeList') || localStorage.getItem('lastSelectedList') || 'Personal';
      console.log(`Using active list from localStorage: ${currentList}`);

      filterTasks(currentList, true);

      const recentTask = findMostRecentTask(currentList);
      if (recentTask) {
        console.log(`Found most recent task on load for ${currentList}: ${recentTask.title} (ID: ${recentTask._id})`);

        // Select the task in panel/data
        setSelectedTaskUI(recentTask);
        localStorage.setItem('selectedTaskId', recentTask._id);

        // Highlight it visually after DOM is ready
        setTimeout(() => {
          const taskElements = document.querySelectorAll('.task-item');
          taskElements.forEach(el => {
            el.classList.remove('selected', 'bg-dark-hover');
            if (el.dataset.taskId === recentTask._id) {
              el.classList.add('selected', 'bg-dark-hover');
              console.log(`✅ Highlighted task on load: ${recentTask.title} (ID: ${recentTask._id})`);
            }
          });
        }, 100);
      }
    } else {
      console.error('Failed to fetch tasks from server:', response.status);
    }
  } catch (error) {
    console.error('Error loading tasks from server:', error);
    updateAllTaskCounts();

    const currentList = localStorage.getItem('activeList') || localStorage.getItem('lastSelectedList') || 'Personal';
    console.log(`Error case - using active list from localStorage: ${currentList}`);
    filterTasks(currentList);
  }
}


async function loadTasks() {
  console.log('Loading tasks...');
  
  loadTasksFromLocalStorage();
  
  const isLocalMode = true; // Set this to true to work in local-only mode
  
  if (isLocalMode) {
    console.log('Running in local-only mode, skipping server fetch');
    updateAllTaskCounts();
    const currentList = localStorage.getItem('activeList') || 'Personal';
    filterTasks(currentList, true);
    return;
  }
  
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
    } else {
      console.error('Failed to fetch tasks from server:', response.status);
    }
  } catch (error) {
    console.error('Error loading tasks from server:', error);
  }
  
  updateAllTaskCounts();
  const currentList = localStorage.getItem('activeList') || 'Personal';
  filterTasks(currentList, true);
}

window.loadTasks = loadTasks;

function loadTasksFromServer() {
  loadTasks();
}

function setupAddTaskFormListener() {
  
  console.log('Skipping setupAddTaskFormListener in taskManager.js - handled by sidebarManager.js');
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
  
  if (!window.localTaskCache) {
    window.localTaskCache = [];
  }
  window.localTaskCache.push(newTask);
  window.saveTaskCacheToLocalStorage();
  
  if (typeof updateAllTaskCounts === 'function') {
    updateAllTaskCounts();
  }
  
  const mainRightPanel = document.getElementById('right-panels-container');
  if (!mainRightPanel) {
    console.error('No right-panels-container found, creating one');
    const mainContent = document.querySelector('.main-content') || document.querySelector('main');
    if (mainContent) {
      const newRightPanel = document.createElement('div');
      newRightPanel.id = 'right-panels-container';
      newRightPanel.className = 'flex-1 bg-dark-accent rounded-lg p-6 h-full';
      mainContent.appendChild(newRightPanel);
    }
  }
  
  console.log('Dispatching task click event');
  if (typeof window.showPanelForTask === 'function') {
    document.querySelectorAll('.task-panel').forEach(panel => {
      panel.classList.add('hidden');
    });
    
    const rightPanelsContainer = document.getElementById('right-panels-container');
    if (rightPanelsContainer) {
      rightPanelsContainer.classList.remove('hidden');
      rightPanelsContainer.style.display = 'block';
      console.log('Forced right panels container to be visible');
    }
    
    setTimeout(() => {
      if (typeof window.createPanelForTask === 'function') {
        const panel = window.createPanelForTask(newTask);
        if (panel) {
          console.log('Created panel for task:', newTask._id);
        }
      }
      
      console.log('Showing panel for task:', newTask._id);
      window.showPanelForTask(newTask);
      
      const listId = currentList.toLowerCase().replace(/\s+/g, '-');
      const uniquePanelId = `right-panel-${listId}-${newTask._id}`;
      const panel = document.getElementById(uniquePanelId);
      if (panel) {
        panel.classList.remove('hidden');
        panel.style.display = 'flex';
        console.log('Panel made visible:', uniquePanelId);
      } else {
        console.error('Could not find panel with ID:', uniquePanelId);
      }
      
      window.currentTaskId = newTask._id;
      localStorage.setItem('activeTaskId', newTask._id);
    }, 100);
  } else {
    console.error('showPanelForTask function not available');
  }
  
  document.dispatchEvent(new CustomEvent('taskAdded', {
    detail: { task: newTask }
  }));
  
  localStorage.setItem('selectedTaskId', newTask._id);
  localStorage.setItem('lastSelectedList', currentList);
  
  if (typeof filterTasks === 'function') {
    filterTasks(currentList, true);
  }
  
  setTimeout(() => {
    const taskElements = document.querySelectorAll('.task-item');
    taskElements.forEach(el => {
      el.classList.remove('selected', 'bg-dark-hover');
      if (el.dataset.taskId === newTask._id) {
        el.classList.add('selected', 'bg-dark-hover');
        console.log('Highlighted new task:', newTask._id);
      }
    });
  }, 200);
  
  console.log(`New task added and selected: ${newTask.title} (ID: ${newTask._id})`);
  
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
  console.log(`Refreshing task list for: ${listName}`);

  const taskList = document.getElementById('taskList');
  if (!taskList) {
    console.error('Task list container not found');
    return;
  }

  taskList.innerHTML = '';

  const filteredTasks = localTaskCache.filter(task => task.list === listName);
  console.log(`Found ${filteredTasks.length} tasks for list: ${listName}`);

  if (filteredTasks.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'text-center py-6 text-gray-500';
    emptyState.textContent = `No tasks in ${listName} list yet. Add one above!`;
    taskList.appendChild(emptyState);
  } else {
   
    const sortedTasks = filteredTasks.sort((a, b) => {

      if (a._id.startsWith('local_') && b._id.startsWith('local_')) {
        const aTime = parseInt(a._id.replace('local_', ''));
        const bTime = parseInt(b._id.replace('local_', ''));
        return bTime - aTime; 
      }
     
      else if (a._id.startsWith('local_')) {
        return -1; 
      }
      else if (b._id.startsWith('local_')) {
        return 1;
      }
      return -1;
    });

    sortedTasks.forEach(task => {
      const taskElement = createTaskElement(task);
      if (taskElement) {
        taskList.appendChild(taskElement);
      }
    });

    const selectedTaskId = localStorage.getItem('selectedTaskId');
    if (selectedTaskId) {
      
      setTimeout(() => {
        const taskElements = document.querySelectorAll('.task-item');
        let found = false;
        taskElements.forEach(el => {
          if (el.dataset.taskId === selectedTaskId) {
            el.classList.add('selected', 'bg-dark-hover');
            found = true;
            console.log(`Highlighted selected task in refreshTaskList: ${selectedTaskId}`);
          }
        });

        if (!found) {
          console.warn(`Could not find task element for ID: ${selectedTaskId} in the DOM`);
        }
      }, 50);
    }
  }

  updateAllTaskCounts();
}

function createTaskElement(task) {
  if (!task) return null;

  const selectedTaskId = localStorage.getItem('selectedTaskId');
  const isSelected = selectedTaskId === task._id;

  const taskElement = document.createElement('div');
  taskElement.className = `task-item group px-4 py-2.5 rounded-lg mb-1.5 cursor-pointer flex items-center gap-3 transition-all duration-200 hover:bg-dark-hover ${isSelected ? 'selected bg-dark-hover' : ''}`;
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
  dropdown.className = 'task-menu hidden absolute right-0 top-full mt-1 w-36 bg-dark-hover rounded-lg shadow-xl py-1 z-50';

  const defaultLists = ['Personal', 'Work', 'Grocery List'];
  const icons = {
    'Personal': 'fas fa-user text-purple-400',
    'Work': 'fas fa-briefcase text-orange-400',
    'Grocery List': 'fas fa-shopping-cart text-cyan-400'
  };

  let customLists = [];
  try {
    customLists = JSON.parse(localStorage.getItem('customLists') || '[]');
  } catch (error) {
    console.error('Error loading custom lists:', error);
  }

  const allLists = [...defaultLists, ...customLists];

  allLists.forEach(list => {
    if (list === task.list) return;

    const listItem = document.createElement('a');
    listItem.href = '#';
    listItem.className = 'menu-item px-3 py-2 flex items-center gap-2 hover:bg-dark-accent transition-colors duration-150';
    listItem.dataset.list = list;

    const iconClass = icons[list] || 'fas fa-folder text-green-400';

    const icon = document.createElement('i');
    icon.className = iconClass;

    const span = document.createElement('span');
    span.className = 'text-gray-300 hover:text-white';
    span.textContent = list;

    listItem.appendChild(icon);
    listItem.appendChild(span);

    listItem.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
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

    document.querySelectorAll('.task-menu').forEach(menu => {
      if (menu !== dropdown) {
        menu.classList.add('hidden');
      }
    });

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

    const taskList = localTaskCache[taskIndex].list;
    applyBlurEffect(newCompletedState, taskList);
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

  localTaskCache[taskIndex].list = newList;
  saveTaskCacheToLocalStorage();

  const currentList = localStorage.getItem('activeList') || 'Personal';

  const oldListSelector = oldList.toLowerCase().replace(/\s+/g, '-');
  const newListSelector = newList.toLowerCase().replace(/\s+/g, '-');

  const oldCountElement = document.getElementById(`count-${oldListSelector}`);
  const newCountElement = document.getElementById(`count-${newListSelector}`);

  if (oldCountElement) {
    let oldCount = parseInt(oldCountElement.textContent) || 0;
    oldCount = Math.max(0, oldCount - 1);
    oldCountElement.textContent = oldCount;
    console.log(`Updated count for ${oldList} to ${oldCount}`);
  }

  if (newCountElement) {
    let newCount = parseInt(newCountElement.textContent) || 0;
    newCount += 1;
    newCountElement.textContent = newCount;
    console.log(`Updated count for ${newList} to ${newCount}`);
  }

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

    if (window.currentTaskId === taskId) {
    
      const recentTask = findMostRecentTask(currentList);
      if (recentTask) {
        setSelectedTaskUI(recentTask);
        localStorage.setItem('selectedTaskId', recentTask._id);

        setTimeout(() => {
          const taskElements = document.querySelectorAll('.task-item');
          taskElements.forEach(el => {
            el.classList.remove('selected', 'bg-dark-hover');
            if (el.dataset.taskId === recentTask._id) {
              el.classList.add('selected', 'bg-dark-hover');
              console.log(`Highlighted task after move: ${recentTask.title} (ID: ${recentTask._id})`);
            }
          });
        }, 50);
      } else {
      
        resetRightPanel(true);
        window.currentTaskId = null;
      }
    }
  }

  const destinationTaskList = document.getElementById('taskList-' + newListSelector);
  if (destinationTaskList) {
    const taskElement = createTaskElement(localTaskCache[taskIndex]);
    if (taskElement) {
      const emptyState = destinationTaskList.querySelector('.text-gray-500');
      if (emptyState) {
        emptyState.remove();
      }
      destinationTaskList.appendChild(taskElement);
    }
  } else {
    if (currentList === newList) {
      refreshTaskList(newList);
    }
  }

  if (taskId.startsWith('local_')) {
    console.log(`Skipping server update for local task: ${taskId}`);
    return;
  }

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

async function selectTask(taskId) {
  try {

    const currentSelectedTaskId = localStorage.getItem('selectedTaskId');
    const isAlreadySelected = currentSelectedTaskId === taskId;

    const localTask = localTaskCache.find(task => task._id === taskId);

    if (localTask) {

      setSelectedTaskUI(localTask);

      const taskElements = document.querySelectorAll('.task-item');
      taskElements.forEach(el => {
        el.classList.remove('selected', 'bg-dark-hover');
        if (el.dataset.taskId === taskId) {
          el.classList.add('selected', 'bg-dark-hover');
        }
      });

      localStorage.setItem('selectedTaskId', taskId);
      return;
    }

    const res = await fetch(`/todos/${taskId}`);
    if (!res.ok) {
      console.error(`Error fetching task: ${res.status}`);
      return;
    }

    const task = await res.json();

    setSelectedTaskUI(task);

    const taskElements = document.querySelectorAll('.task-item');
    taskElements.forEach(el => {
      el.classList.remove('selected', 'bg-dark-hover');
      if (el.dataset.taskId === taskId) {
        el.classList.add('selected', 'bg-dark-hover');
      }
    });

    localStorage.setItem('selectedTaskId', taskId);
  } catch (err) {
    console.error('Failed to select task:', err);
  }
}

function setSelectedTaskUI(task) {
  if (!task) {
    console.warn('No task provided to setSelectedTaskUI');
    return;
  }

  console.log(`Setting selected task UI for: ${task.title} (ID: ${task._id}, List: ${task.list})`);
  window.currentTaskId = task._id;

  const listId = task.list.toLowerCase().replace(/\s+/g, '-');
  const panelId = `right-panel-${listId}`;
  const panel = document.getElementById(panelId);

  if (panel) {
    
    updatePanelWithTask(panel, task);

    document.dispatchEvent(new CustomEvent('taskSelected', {
      detail: { taskId: task._id, listName: task.list }
    }));
  } else {
    console.warn(`Panel not found for list: ${task.list}`);

    if (typeof createPanelForList === 'function') {
      const newPanel = createPanelForList(task.list);
      if (newPanel) {
        updatePanelWithTask(newPanel, task);

        document.dispatchEvent(new CustomEvent('taskSelected', {
          detail: { taskId: task._id, listName: task.list }
        }));
      }
    }
  }

  localStorage.setItem('selectedTaskId', task._id);
  localStorage.setItem('lastSelectedList', task.list);
}

function loadTaskDetails(task) {
  selectTask(task._id);
}

function deleteTask(taskId) {
  const taskIndex = localTaskCache.findIndex(task => task._id === taskId);
  if (taskIndex === -1) {
    console.error(`Task with ID ${taskId} not found`);
    return;
  }

  const task = localTaskCache[taskIndex];
  const list = task.list;

  // Remove from local cache
  localTaskCache.splice(taskIndex, 1);
  saveTaskCacheToLocalStorage();

  // Update UI count
  updateTaskCount(list, -1);

  // Remove from UI
  const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
  if (taskElement) taskElement.remove();

  // Dispatch event so panelManager can remove the panel
  document.dispatchEvent(new CustomEvent('taskDeleted', {
    detail: { taskId, list }
  }));

  // If the deleted task was selected, handle fallback logic
  const selectedTaskId = localStorage.getItem('selectedTaskId');
  if (selectedTaskId === taskId) {
    const remainingTasks = localTaskCache.filter(t => t.list === list && !t.deleted);
    if (remainingTasks.length > 0) {
      const fallback = remainingTasks[0];
      setSelectedTaskUI(fallback);
      localStorage.setItem('selectedTaskId', fallback._id);

      setTimeout(() => {
        const taskElements = document.querySelectorAll('.task-item');
        taskElements.forEach(el => {
          el.classList.remove('selected', 'bg-dark-hover');
          if (el.dataset.taskId === fallback._id) {
            el.classList.add('selected', 'bg-dark-hover');
          }
        });
      }, 50);
    } else {
      localStorage.removeItem('selectedTaskId');
      window.currentTaskId = null;
    }
  }

  refreshTaskList(list);
}





window.filterTasks = function(listName, preserveSelection = false) {
  console.log('Filtering tasks for list:', listName);
  
  localStorage.setItem('activeList', listName);
  
  // Update UI elements synchronously
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
  
  // Handle list highlighting
  if (typeof window.highlightActiveList === 'function') {
    window.highlightActiveList(listName);
  } else {
    highlightActiveList(listName);
  }
  
  // Refresh task list
  refreshTaskList(listName);
  
  // Update panel visibility
  if (typeof showPanelForList === 'function') {
    showPanelForList(listName);
  }
  
  if (!preserveSelection) {
    const recentTask = findMostRecentTask(listName);
    
    if (recentTask) {
      console.log(`Found most recent task in ${listName}: ${recentTask.title} (ID: ${recentTask._id})`);
      
      setSelectedTaskUI(recentTask);
      
      localStorage.setItem('selectedTaskId', recentTask._id);
      localStorage.setItem('lastSelectedList', listName);
      
      // Use requestAnimationFrame for smooth visual updates
      requestAnimationFrame(() => {
        const taskElements = document.querySelectorAll('.task-item');
        let found = false;
        
        taskElements.forEach(el => {
          el.classList.remove('selected', 'bg-dark-hover');
          if (el.dataset.taskId === recentTask._id) {
            el.classList.add('selected', 'bg-dark-hover');
            found = true;
            console.log(`Highlighted task: ${recentTask.title} (ID: ${recentTask._id})`);
          }
        });
        
        if (!found) {
          console.warn(`Could not find task element for ID: ${recentTask._id} - refreshing task list`);
          refreshTaskList(listName);
          
          // Try highlighting again after refresh
          requestAnimationFrame(() => {
            const taskElements = document.querySelectorAll('.task-item');
            taskElements.forEach(el => {
              if (el.dataset.taskId === recentTask._id) {
                el.classList.add('selected', 'bg-dark-hover');
                console.log(`Highlighted task after refresh: ${recentTask.title}`);
              }
            });
          });
        }
      });
    } else {
      console.log(`No tasks found in ${listName} list`);
      
      const listId = listName.toLowerCase().replace(/\s+/g, '-');
      const panelId = `right-panel-${listId}`;
      const panel = document.getElementById(panelId);
      
      if (panel && typeof clearPanel === 'function') {
        clearPanel(panel, listName);
      }
    }
  }
};

function updateAllTaskCounts() {
  console.log('Running updateAllTaskCounts...');
  const defaultLists = ['Personal', 'Work', 'Grocery List', 'hh', 'ddd', 'kk'];
  
  const customLists = [...new Set(localTaskCache.map(task => task.list))]
    .filter(list => list && !defaultLists.includes(list));

  const allLists = [...defaultLists, ...customLists];

  let totalTasks = 0;

  allLists.forEach(listName => {
    const listTasks = localTaskCache.filter(task => task.list === listName);
    const count = listTasks.length;
    totalTasks += count;

    const listSelector = listName.toLowerCase().replace(/\s+/g, '-');
    const countId = `count-${listSelector}`;

    let countElement = document.getElementById(countId);
    
    if (!countElement) {
      const listItem = document.querySelector(`.sidebar-item[data-list="${listSelector}"]`);
      
      if (listItem) {
        countElement = document.createElement('span');
        countElement.id = countId;
        countElement.className = 'text-sm text-gray-500 ml-auto';
        listItem.appendChild(countElement);
      } else {
        countElement = document.createElement('span');
        countElement.id = countId;
        countElement.style.display = 'none';
        document.body.appendChild(countElement);
      }
    }

    if (countElement) {
      countElement.textContent = count.toString();
      //console.log(`Set count for ${listName} to ${count}`);
    } else {
      console.warn(`Could not find or create count element for ${listName}`);
    }
  });

  const allTasksCount = document.getElementById('allTasksCount');
  if (allTasksCount) {
    allTasksCount.textContent = totalTasks.toString();
    console.log(`Updated total tasks count to ${totalTasks}`);
  }
}

function ensureCountElementsExist() {
  const defaultLists = ['Personal', 'Work', 'Grocery List', 'hh', 'ddd', 'kk'];
  
  defaultLists.forEach(listName => {
    const listSelector = listName.toLowerCase().replace(/\s+/g, '-');
    const countId = `count-${listSelector}`;
    
    if (!document.getElementById(countId)) {
      const listItem = document.querySelector(`.sidebar-item[data-list="${listSelector}"]`);
      
      if (listItem) {
        const countSpan = document.createElement('span');
        countSpan.id = countId;
        countSpan.className = 'text-sm text-gray-500 ml-auto';
        countSpan.textContent = '0'; // Default to 0
        listItem.appendChild(countSpan);
        console.log(`Created count element for ${listName}`);
      } else {
        const hiddenCount = document.createElement('span');
        hiddenCount.id = countId;
        hiddenCount.style.display = 'none';
        hiddenCount.textContent = '0';
        document.body.appendChild(hiddenCount);
        console.log(`Created hidden count element for ${listName}`);
      }
    }
  });

  try {
    const customLists = JSON.parse(localStorage.getItem('customLists') || '[]');
    
    customLists.forEach(listName => {
      const listSelector = listName.toLowerCase().replace(/\s+/g, '-');
      const countId = `count-${listSelector}`;
      
      if (!document.getElementById(countId)) {
        const listItem = document.querySelector(`.sidebar-item[data-list="${listSelector}"]`);
        
        if (listItem) {
          const countSpan = document.createElement('span');
          countSpan.id = countId;
          countSpan.className = 'text-sm text-gray-500 ml-auto';
          countSpan.textContent = '0';
          listItem.appendChild(countSpan);
        } else {
          const hiddenCount = document.createElement('span');
          hiddenCount.id = countId;
          hiddenCount.style.display = 'none';
          hiddenCount.textContent = '0';
          document.body.appendChild(hiddenCount);
        }
      }
    });
  } catch (error) {
    console.error('Error processing custom lists:', error);
  }
}

window.updateAllTaskCounts = updateAllTaskCounts;
window.ensureCountElementsExist = ensureCountElementsExist;

function applyBlurEffect(isCompleted, listName) {
  
  if (listName) {
    const listId = listName.toLowerCase().replace(/\s+/g, '-');
    const panelId = `right-panel-${listId}`;
    const blurContent = document.querySelector(`#${panelId} .task-blur-content`);

    if (blurContent) {
      if (isCompleted && isTaskBlurred) {
        blurContent.classList.add('blurred');
        blurContent.style.cssText = 'filter: blur(5px) !important; pointer-events: none;';
      } else {
        blurContent.classList.remove('blurred');
        blurContent.style.cssText = 'filter: none !important; pointer-events: auto;';
      }
    }
  } else {

    const currentList = localStorage.getItem('activeList') || 'Personal';
    const listId = currentList.toLowerCase().replace(/\s+/g, '-');
    const panelId = `right-panel-${listId}`;
    const blurContent = document.querySelector(`#${panelId} .task-blur-content`);

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
}

function resetRightPanel(forceReset = false) {

  const currentList = localStorage.getItem('activeList') || 'Personal';

  if (!forceReset) {
    const recentTask = findMostRecentTask(currentList);
    if (recentTask) {
      setSelectedTaskUI(recentTask);
      return;
    }
  }

  const listId = currentList.toLowerCase().replace(/\s+/g, '-');
  const panelId = `right-panel-${listId}`;
  const panel = document.getElementById(panelId);

  if (panel && typeof clearPanel === 'function') {
    clearPanel(panel, currentList);
  } else {

    const titleElement = document.querySelector(`#${panelId} h2`);
    if (titleElement) {
      titleElement.textContent = '';
    }

    const listElement = document.querySelector(`#${panelId} .text-gray-400`);
    if (listElement) {
      listElement.textContent = currentList;
    }

    const notesTextarea = document.querySelector(`#${panelId} .notes-textarea`);
    if (notesTextarea) {
      notesTextarea.value = '';
    }

    const subtasksList = document.querySelector(`#${panelId} .subtasks-list`);
    if (subtasksList) {
      subtasksList.innerHTML = '<div class="text-gray-500 text-sm py-2">No subtasks added yet.</div>';
    }

    const imagePreviewContainer = document.querySelector(`#${panelId} .image-preview-container`);
    if (imagePreviewContainer) {
      imagePreviewContainer.innerHTML = '';
    }

    const blurContent = document.querySelector(`#${panelId} .task-blur-content`);
    if (blurContent) {
      blurContent.classList.remove('blurred');
      blurContent.style.cssText = 'filter: none !important; pointer-events: auto;';
    }
  }

  if (typeof setupDropZones === 'function') {
    setupDropZones();
  }
}

function findMostRecentTask(listName) {
  if (!localTaskCache || localTaskCache.length === 0) {
    console.log(`No tasks in cache for list: ${listName}`);
    return null;
  }

  const listTasks = localTaskCache.filter(task => task.list === listName);
  if (listTasks.length === 0) {
    console.log(`No tasks found for list: ${listName}`);
    return null;
  }

  console.log(`Found ${listTasks.length} tasks for list: ${listName}`);

  listTasks.forEach(task => {
    console.log(`- Task: ${task.title} (ID: ${task._id})`);
  });

  const sortedTasks = listTasks.sort((a, b) => {

    if (a._id.startsWith('local_') && b._id.startsWith('local_')) {
      const aTime = parseInt(a._id.replace('local_', ''));
      const bTime = parseInt(b._id.replace('local_', ''));
      return bTime - aTime; // Descending order (newest first)
    }

    else if (a._id.startsWith('local_')) {
      return -1; // a comes first
    }
    else if (b._id.startsWith('local_')) {
      return 1; // b comes first
    }

    else {
      const aNum = parseInt(a._id.replace(/\D/g, ''));
      const bNum = parseInt(b._id.replace(/\D/g, ''));
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return bNum - aNum; // Descending order (newest first)
      }
    }

    return -1;
  });

  console.log('Sorted tasks (newest first):');
  sortedTasks.forEach((task, index) => {
    console.log(`${index + 1}. ${task.title} (ID: ${task._id})`);
  });

  const mostRecentTask = sortedTasks[0];
  console.log(`Most recent task for ${listName}: ${mostRecentTask.title} (ID: ${mostRecentTask._id})`);

  return mostRecentTask;
}

window.markSelectedTaskComplete = function() {
  const selectedTask = document.querySelector('.task-item.selected');
  if (selectedTask) {
    const taskId = selectedTask.dataset.taskId;
    toggleTaskCompletion(taskId);
  }
};
