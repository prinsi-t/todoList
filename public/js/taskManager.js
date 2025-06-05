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
  
  //loadTasksFromServer();
  loadTasks();
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
window.saveTaskCacheToLocalStorage = saveTaskCacheToLocalStorage;

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
  //console.log('Loading tasks...');
  
  loadTasksFromLocalStorage();
  
  const isLocalMode = true; // Set this to true to work in local-only mode
  
  if (isLocalMode) {
    //console.log('Running in local-only mode, skipping server fetch');
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

  // ✅ Select and show panel for the new local task
  localStorage.setItem('selectedTaskId', newTask._id);
  window.currentTaskId = newTask._id;

  if (typeof setSelectedTaskUI === 'function') {
    setSelectedTaskUI(newTask);
  }
  setTimeout(() => {
    if (typeof showPanelForList === 'function') {
      showPanelForList(currentList, newTask._id);
    }
  }, 50);
  

  if (typeof showPanelForList === 'function') {
    showPanelForList(currentList, newTask._id);
  }

  input.value = '';

  try {
    const response = await fetch('/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        list: currentList,
        completed: false
      })
    });

    if (response.ok) {
      const serverTask = await response.json();

      // Replace local task in cache with real one
      const taskIndex = localTaskCache.findIndex(t => t._id === newTask._id);
      if (taskIndex !== -1) {
        localTaskCache[taskIndex] = serverTask;
        saveTaskCacheToLocalStorage();

        if (taskElement) {
          taskElement.dataset.taskId = serverTask._id;
        }

        localStorage.setItem('selectedTaskId', serverTask._id);
        window.currentTaskId = serverTask._id;

        if (typeof setSelectedTaskUI === 'function') {
          setSelectedTaskUI(serverTask);
        }

        if (typeof showPanelForList === 'function') {
          showPanelForList(currentList, serverTask._id);
        }
      }
    } else {
      console.error('Failed to save task to server:', response.status);
    }
  } catch (error) {
    console.error('Error syncing task with server:', error);
  }
}


window.handleAddTask = handleAddTask;

function refreshTaskList(listName) {
  //console.log(`Refreshing task list for: ${listName}`);

  const taskList = document.getElementById('taskList');
  if (!taskList) {
    console.error('Task list container not found');
    return;
  }

  taskList.innerHTML = '';

  const filteredTasks = localTaskCache.filter(task => task.list === listName);
  //console.log(`Found ${filteredTasks.length} tasks for list: ${listName}`);

  if (filteredTasks.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'text-center py-6 text-gray-500';
    const formattedListName = listName.match(/.{1,30}/g).join('\n');
    emptyState.textContent = `No tasks in\n${formattedListName}\nlist yet. Add one above!`;
    emptyState.style.whiteSpace = 'pre-wrap';  // 🔑 make \n render correctly

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
           // console.log(`Highlighted selected task in refreshTaskList: ${selectedTaskId}`);
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
  taskElement.dataset.list = task.list; // ✅ REQUIRED for panel logic

  const checkbox = document.createElement('div');
  checkbox.className = `checkbox ${task.completed ? 'checked bg-blue-500 border-blue-500' : ''} w-5 h-5 border-2 border-dark-border rounded-full flex items-center justify-center transition-colors duration-200`;

  if (task.completed) {
    const checkIcon = document.createElement('i');
    checkIcon.className = 'fas fa-check text-white text-xs';
    checkbox.appendChild(checkIcon);
  }

  const titleSpan = document.createElement('span');
  titleSpan.className = `${task.completed ? 'line-through text-gray-500' : 'text-gray-200'} flex-grow text-sm break-words overflow-hidden text-ellipsis whitespace-nowrap max-w-[200px]`;
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

    setTimeout(() => {
      setSelectedTaskUI(task);
    
      // Optional: visually highlight it
      const taskElements = document.querySelectorAll('.task-item');
      taskElements.forEach(el => {
        el.classList.remove('selected', 'bg-dark-hover');
        if (el.dataset.taskId === task._id) {
          el.classList.add('selected', 'bg-dark-hover');
        }
      });
    }, 150);
    

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

  const currentList = localStorage.getItem('activeList');
  if (task.list !== currentList) {
    console.warn(`⛔ Skipping panel render: task "${task.title}" is in list "${task.list}", but current list is "${currentList}"`);
    return;
  }

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


function moveTaskToList(taskId, newList) {
  const taskIndex = localTaskCache.findIndex(t => t._id === taskId);
  if (taskIndex === -1) return;

  const task = localTaskCache[taskIndex];
  const oldList = task.list;
  const selectedTaskId = localStorage.getItem('selectedTaskId');
  const isMovingSelectedTask = selectedTaskId === taskId;

  // 🔁 Update the task's list
  task.list = newList;
  localTaskCache[taskIndex] = task;
  saveTaskCacheToLocalStorage();

  localStorage.setItem('lastMovedTaskId', taskId);
  localStorage.removeItem('selectedTaskId');
  window.currentTaskId = null;

  updateAllTaskCounts();

  // 🔢 Update count displays
  const updateCount = (list) => {
    const el = document.getElementById(`count-${list.toLowerCase().replace(/\s+/g, '-')}`);
    if (el) {
      const count = localTaskCache.filter(t => t.list === list && !t.deleted).length;
      el.textContent = count.toString();
    }
  };
  updateCount(oldList);
  updateCount(newList);

  const currentActiveList = localStorage.getItem('activeList');
  const rightPanelsContainer = document.getElementById('right-panels-container');

  // 🔥 Hide ALL panels related to the current list if any task is moved out of it
  if (oldList === currentActiveList) {
    const prefix = `right-panel-${oldList.toLowerCase().replace(/\s+/g, '-')}`;
    const allOldPanels = Array.from(document.querySelectorAll(`#right-panels-container .right-panel`))
      .filter(panel => panel.id.startsWith(prefix));

    allOldPanels.forEach(p => {
      p.classList.add('hidden');
      p.style.display = 'none';
    });

    if (rightPanelsContainer) {
      rightPanelsContainer.classList.add('hidden');
      rightPanelsContainer.style.display = 'none';
    }

    localStorage.removeItem('selectedTaskId');
    window.currentTaskId = null;

    // ✅ Select most recent fallback task
    const remaining = localTaskCache
      .filter(t => t.list === oldList && !t.deleted)
      .sort((a, b) => {
        const aTime = parseInt(a._id.replace('local_', '')) || 0;
        const bTime = parseInt(b._id.replace('local_', '')) || 0;
        return bTime - aTime; // sort newest first
      });

    if (remaining.length > 0) {
      const fallback = remaining[0];
      localStorage.setItem('selectedTaskId', fallback._id);
      window.currentTaskId = fallback._id;

      if (typeof setSelectedTaskUI === 'function') {
        setSelectedTaskUI(fallback);
      }

      if (typeof showPanelForTask === 'function') {
        showPanelForTask(fallback);
      }

      setTimeout(() => {
        const els = document.querySelectorAll('.task-item');
        els.forEach(el => {
          el.classList.remove('selected', 'bg-dark-hover');
          if (el.dataset.taskId === fallback._id) {
            el.classList.add('selected', 'bg-dark-hover');
          }
        });
      }, 50);
    }
  }

  // ♻️ Refresh the visible list
  if (typeof filterTasks === 'function') {
    filterTasks(currentActiveList, true);
  }

  // ✅ Optional: Show the task panel ONLY if it now belongs to the current list
  setTimeout(() => {
    localStorage.setItem('selectedTaskId', task._id);
    localStorage.setItem('lastSelectedList', newList);

    setTimeout(() => {
      refreshTaskCache();

      const newPanelId = `right-panel-${newList.toLowerCase().replace(/\s+/g, '-')}`;
      let panel = document.getElementById(newPanelId);

      if (!panel && typeof createPanelForList === 'function') {
        panel = createPanelForList(newList);
      }

      const currentList = localStorage.getItem('activeList');

      if (task.list === currentList && panel) {
        if (typeof setSelectedTaskUI === 'function') {
          setSelectedTaskUI(task);
        }

        if (typeof showPanelForTask === 'function') {
          showPanelForTask(task);
        }

        panel.classList.remove('hidden');
        panel.style.display = 'block';

        if (rightPanelsContainer) {
          rightPanelsContainer.classList.remove('hidden');
          rightPanelsContainer.style.display = 'block';
        }

        requestAnimationFrame(() => {
          const taskElements = document.querySelectorAll('.task-item');
          taskElements.forEach(el => {
            el.classList.remove('selected', 'bg-dark-hover');
            if (el.dataset.taskId === task._id) {
              el.classList.add('selected', 'bg-dark-hover');
            }
          });
        });
      }
    }, 150);
  }, 100);

  document.dispatchEvent(new CustomEvent('taskMoved', {
    detail: { task, oldList, newList }
  }));

  console.log(`✅ Task "${task.title}" moved from "${oldList}" to "${newList}"`);

  const currentlyVisibleList = localStorage.getItem('activeList');
  if (newList === currentlyVisibleList) {
    if (typeof showPanelForList === 'function') {
      showPanelForList(newList, task._id);
    }
  }
}


















window.moveTaskToList = moveTaskToList;


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

  // Update task count UI
  updateTaskCount(list, -1);
  const countElement = document.getElementById(`count-${list.toLowerCase().replace(/\s+/g, '-')}`);
  if (countElement) {
    const remainingCount = localTaskCache.filter(t => t.list === list && !t.deleted).length;
    countElement.textContent = remainingCount.toString();
    console.log(`Updated ${list} count to: ${remainingCount} after deletion`);
  }

  // Remove from visible task list
  const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
  if (taskElement) taskElement.remove();

  // Immediately remove the panel for this task
  const listId = list.toLowerCase().replace(/\s+/g, '-');
  const panelId = `right-panel-${listId}-${taskId}`;
  const panel = document.getElementById(panelId);
  if (panel) {
    panel.remove();
  }

  // Hide panel container if no panels remain
  const visiblePanels = document.querySelectorAll(`#right-panels-container .right-panel:not(.hidden)`);
  if (visiblePanels.length === 0) {
    const container = document.getElementById('right-panels-container');
    if (container) {
      container.classList.add('hidden');
      container.style.display = 'none';
    }
  }

  // Dispatch event so others can react
  document.dispatchEvent(new CustomEvent('taskDeleted', {
    detail: { taskId, list }
  }));

  // If the deleted task was selected, select a fallback or hide panel
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

      const container = document.getElementById('right-panels-container');
      if (container) {
        container.classList.add('hidden');
        container.style.display = 'none';
      }
    }
  }
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
  } else if (typeof highlightActiveList === 'function') {
    highlightActiveList(listName);
  }
  
  // Refresh task list
  refreshTaskList(listName);
  
  // Update panel visibility - ENHANCED
  if (typeof showPanelForList === 'function') {
    showPanelForList(listName);
  }
  
  // Enhanced panel visibility handling
  const listTasks = localTaskCache.filter(t => t.list === listName && !t.deleted);
  const rightPanelsContainer = document.getElementById('right-panels-container');
  const listId = listName.toLowerCase().replace(/\s+/g, '-');
  const panel = document.getElementById(`right-panel-${listId}`);
  
  if (listTasks.length > 0) {
    // Show container and panel if tasks exist
    if (rightPanelsContainer) {
      rightPanelsContainer.classList.remove('hidden');
    }
    if (panel) {
      panel.classList.remove('hidden');
    }
    
    // Update panel visibility using existing function
    if (typeof updateRightPanelVisibility === 'function') {
      updateRightPanelVisibility(listName);
    }
  } else {
    // Hide panel if no tasks
    if (panel) {
      panel.classList.add('hidden');
    }
    if (rightPanelsContainer) {
      rightPanelsContainer.classList.add('hidden');
    }
  }
  
  // Check if we have a recently moved task
  const lastMovedTaskId = localStorage.getItem('lastMovedTaskId');
  
  if (lastMovedTaskId) {
    const movedTask = localTaskCache.find(t => t._id === lastMovedTaskId && t.list === listName);
    if (movedTask) {
      // Select the moved task
      setSelectedTaskUI(movedTask);
      localStorage.setItem('selectedTaskId', movedTask._id);
      localStorage.setItem('lastSelectedList', listName);
      
      // Highlight the moved task
      requestAnimationFrame(() => {
        const taskElements = document.querySelectorAll('.task-item');
        taskElements.forEach(el => {
          el.classList.remove('selected', 'bg-dark-hover');
          if (el.dataset.taskId === movedTask._id) {
            el.classList.add('selected', 'bg-dark-hover');
          }
        });
      });
      
      // Clear the lastMovedTaskId
      localStorage.removeItem('lastMovedTaskId');
      return;
    }
    
    // If we didn't find the moved task in this list, clear the lastMovedTaskId
    localStorage.removeItem('lastMovedTaskId');
  }
  
  if (!preserveSelection) {
    // Original code for selecting the most recent task
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
    //console.log(`No tasks in cache for list: ${listName}`);
    return null;
  }

  const listTasks = localTaskCache.filter(task => task.list === listName);
  if (listTasks.length === 0) {
    //console.log(`No tasks found for list: ${listName}`);
    return null;
  }

  //console.log(`Found ${listTasks.length} tasks for list: ${listName}`);

  listTasks.forEach(task => {
   //console.log(`- Task: ${task.title} (ID: ${task._id})`);
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

  //console.log('Sorted tasks (newest first):');
  sortedTasks.forEach((task, index) => {
    //console.log(`${index + 1}. ${task.title} (ID: ${task._id})`);
  });

  const mostRecentTask = sortedTasks[0];
  //console.log(`Most recent task for ${listName}: ${mostRecentTask.title} (ID: ${mostRecentTask._id})`);

  return mostRecentTask;
}

function ensureRightPanelContainerExists() {
    const container = document.getElementById('right-panels-container');
    if (container) return container;

    const mainContent = document.querySelector('main') || document.querySelector('.main-content') || document.body;
    if (!mainContent) {
      console.warn('⚠️ [panelManager] Could not find container to attach right-panels-container');
      return null;
    }

    const newContainer = document.createElement('div');
    newContainer.id = 'right-panels-container';
    newContainer.className = 'flex-1 bg-dark-accent rounded-lg p-6 h-full hidden';
    mainContent.appendChild(newContainer);
    console.log('✅ [panelManager] Created missing right-panels-container');
    return newContainer;
  }

function updateRightPanelVisibility(listName) {
    const rightPanelsContainer = ensureRightPanelContainerExists();
    if (!rightPanelsContainer || !listName) return;

    const hasTasks = window.localTaskCache?.some(t => t.list === listName && !t.deleted);
    const listId = listName.toLowerCase().replace(/\s+/g, '-');
    const containerIdForList = `right-panels-container-${listId}`;
    const listContainer = document.getElementById(containerIdForList);

    document.querySelectorAll('[id^="right-panels-container-"]').forEach(c => {
      c.classList.add('hidden');
    });

    if (hasTasks) {
      rightPanelsContainer.classList.remove('hidden');
      if (listContainer) listContainer.classList.remove('hidden');

      const activeTaskId = localStorage.getItem('activeTaskId');
      const task = window.localTaskCache.find(t => t._id === activeTaskId);

      if (task && task.list === listName) {
        setTimeout(() => showPanelForTask(task), 10);
      } else {
        const firstTask = window.localTaskCache.find(t => t.list === listName && !t.deleted);
        if (firstTask) {
          setTimeout(() => {
            showPanelForTask(firstTask);
            window.currentTaskId = firstTask._id;
            localStorage.setItem('activeTaskId', firstTask._id);
          }, 10);
        }
      }
    } else {
      rightPanelsContainer.classList.add('hidden');
      localStorage.removeItem('activeTaskId');
      window.currentTaskId = null;
    }
  }

function showPanelForTask(task) {
    if (!task || !task._id || task.deleted) return;

    const rightPanelsContainer = ensureRightPanelContainerExists();
    if (!rightPanelsContainer) return;

    rightPanelsContainer.classList.remove('hidden');

    const listId = task.list.toLowerCase().replace(/\s+/g, '-');
    const panelId = `right-panel-${listId}-${task._id}`;
    let panel = document.getElementById(panelId);

    // 🔧 Fallback: if task-specific panel doesn't exist, try static per-list panel
    if (!panel) {
      const fallbackPanelId = `right-panel-${listId}`;
      panel = document.getElementById(fallbackPanelId);
    }

    if (panel) {
      document.querySelectorAll('.task-panel').forEach(p => p.classList.add('hidden'));
      panel.classList.remove('hidden');
      panel.style.display = 'block';
      localStorage.setItem('activeTaskId', task._id);
      window.currentTaskId = task._id;
    } else {
      console.warn(`⚠️ [panelManager] Could not find panel for task ID: ${task._id} or fallback`);
    }
  }

  function handleTaskDeleted(e) {
    const taskId = e.detail?.taskId;
    const listName = e.detail?.list;
    if (!taskId || !listName) return;
  
    const listId = listName.toLowerCase().replace(/\s+/g, '-');
    const panelId = `right-panel-${listId}-${taskId}`;
    const fallbackPanelId = `right-panel-${listId}`;
  
    // Try dynamic per-task panel first
    let panel = document.getElementById(panelId);
  
    // If not found, fallback to static per-list panel
    if (!panel) {
      panel = document.getElementById(fallbackPanelId);
    }
  
    if (panel) {
      panel.remove(); // Or use .classList.add('hidden') if you want to keep DOM
      console.log(`✅ [panelManager] Removed panel for deleted task: ${taskId}`);
    }
  
    refreshTaskCache();
  
    const selectedId = localStorage.getItem('selectedTaskId');
    const isSelectedTask = selectedId === taskId;
  
    const rightPanelsContainer = document.getElementById('right-panels-container');
    const listContainer = document.getElementById(`right-panels-container-${listId}`);
  
    const remainingTasks = window.localTaskCache.filter(t => t.list === listName && !t.deleted);
  
    if (isSelectedTask) {
      if (remainingTasks.length > 0) {
        const fallback = remainingTasks[0];
        setTimeout(() => {
          showPanelForTask(fallback);
          localStorage.setItem('selectedTaskId', fallback._id);
          window.currentTaskId = fallback._id;
        }, 10);
      } else {
        localStorage.removeItem('selectedTaskId');
        localStorage.removeItem('activeTaskId');
        window.currentTaskId = null;
  
        if (listContainer) listContainer.classList.add('hidden');
        if (rightPanelsContainer) rightPanelsContainer.classList.add('hidden');
        console.log(`✅ Cleared panel container for empty list: ${listName}`);
      }
    }
  }
  

function waitForMainContent(maxRetries = 20, intervalMs = 100) {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const interval = setInterval(() => {
        const mainContent = document.querySelector('.main-content') || document.querySelector('main') || document.body;
        if (mainContent) {
          clearInterval(interval);
          resolve(mainContent);
        } else if (++attempts >= maxRetries) {
          clearInterval(interval);
          reject(new Error('Main content container not found after waiting'));
        }
      }, intervalMs);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    waitForMainContent()
      .then(() => {
        document.addEventListener('taskAdded', handleTaskAdded);
        document.addEventListener('taskDeleted', handleTaskDeleted);

        const activeList = localStorage.getItem('activeList') || 'Personal';
        updateRightPanelVisibility(activeList);
      })
      .catch(err => {
        console.warn('⚠️ [panelManager] Initialization skipped:', err.message);
      });
  });

  window.updateRightPanelVisibility = updateRightPanelVisibility;
  window.showPanelForTask = showPanelForTask;

function handleTaskAdded(e) {
    const task = e.detail?.task;
    if (!task) return;

    refreshTaskCache();
    updateRightPanelVisibility(task.list);
    setTimeout(() => showPanelForTask(task), 50);
  }

function refreshTaskCache() {
    try {
      const cached = localStorage.getItem('taskCache');
      window.localTaskCache = cached ? JSON.parse(cached) : [];
      window.localTaskCache = window.localTaskCache.filter(t => t && !t.deleted);
    } catch (e) {
      console.error('Failed to refresh task cache:', e);
      window.localTaskCache = [];
    }
  }