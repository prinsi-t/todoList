// Fixed taskManager.js - Key changes to preserve selected task on refresh
window.selectionLocked = false;

document.addEventListener('DOMContentLoaded', function () {
  const addTaskForm = document.getElementById('addTaskForm');
  const newTaskInput = document.getElementById('newTaskInput');
  const taskList = document.getElementById('taskList');
  const completeBtn = document.getElementById('complete-btn');

  loadTasksFromLocalStorage();
  completeBtn.addEventListener('click', toggleBlurFromCompleteBtn);
  ensureCountElementsExist();
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
    const currentSelectedTaskId = localStorage.getItem('selectedTaskId');
    const currentList = localStorage.getItem('activeList') || 'Personal';

    const response = await fetch('/todos/all');
    if (!response.ok) {
      console.error('Failed to fetch tasks from server:', response.status);
      return;
    }

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

    filterTasks(currentList, true);

    if (currentSelectedTaskId) {
      const selectedTask = localTaskCache.find(t => t._id === currentSelectedTaskId);
      if (selectedTask && selectedTask.list === currentList) {
        console.log(`✅ Preserving selected task after refresh: ${selectedTask.title}`);
        setSelectedTaskUI(selectedTask);
        localStorage.setItem('selectedTaskId', selectedTask._id);
        window.currentTaskId = selectedTask._id;

        setTimeout(() => {
          const taskElements = document.querySelectorAll('.task-item');
          taskElements.forEach(el => {
            el.classList.remove('selected', 'bg-dark-hover');
            if (el.dataset.taskId === selectedTask._id) {
              el.classList.add('selected', 'bg-dark-hover');
            }
          });
        }, 100);

        return; // ⛔ Prevent fallback
      }
    }

    console.log('ℹ️ No fallback task selected — respecting existing selection');
    // No fallback logic – let init.js handle it

  } catch (error) {
    console.error('Error loading tasks from server:', error);

    const currentList = localStorage.getItem('activeList') || 'Personal';
    filterTasks(currentList, true);
    updateAllTaskCounts();
  }
}







async function loadTasks() {
  loadTasksFromLocalStorage();

  const isLocalMode = false;

  if (isLocalMode) {
    console.log('🛠️ Running in local-only mode');

    updateAllTaskCounts();
    const currentList = localStorage.getItem('activeList') || 'Personal';
    const currentSelectedTaskId = localStorage.getItem('selectedTaskId');

    filterTasks(currentList, true);

    if (currentSelectedTaskId) {
      const selectedTask = localTaskCache.find(t => t._id === currentSelectedTaskId);
      if (selectedTask && selectedTask.list === currentList) {
        console.log(`✅ Preserved selection in local mode: ${selectedTask.title}`);

        setTimeout(() => {
          const taskElements = document.querySelectorAll('.task-item');
          taskElements.forEach(el => {
            el.classList.remove('selected', 'bg-dark-hover');
            if (el.dataset.taskId === selectedTask._id) {
              el.classList.add('selected', 'bg-dark-hover');
            }
          });
        }, 100);
      }
    }

    return;
  }

  // If not local mode, fallback to server
  await loadTasksFromServer();
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
  const taskList = document.getElementById('taskList');
  if (!taskList) {
    console.error('Task list container not found');
    return;
  }

  taskList.innerHTML = '';

  const normalizedList = listName.trim().toLowerCase();
  const filteredTasks = localTaskCache.filter(task => task.list.trim().toLowerCase() === normalizedList);
  console.log(`Filtered ${filteredTasks.length} tasks for list: "${listName}"`);
  console.table(filteredTasks);
    

  if (filteredTasks.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'text-center py-6 text-gray-500';
    const formattedListName = listName.match(/.{1,30}/g).join('\n');
    emptyState.textContent = `No tasks in\n${formattedListName}\nlist yet. Add one above!`;
    emptyState.style.whiteSpace = 'pre-wrap';
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

    // 🔧 Replace this:
    // applyBlurEffect(newCompletedState, taskList); ❌ Wrong

    // ✅ With this:
    const updatedTask = localTaskCache[taskIndex];
    applyBlurEffect(updatedTask, true);
    updatePanelBlurUI(updatedTask);

    const completeBtn = document.getElementById('complete-btn');
    if (completeBtn) {
      completeBtn.textContent = newCompletedState ? 'Mark as Incomplete' : 'Mark as Complete';
      completeBtn.className = newCompletedState
        ? 'complete-btn bg-green-500 text-white px-4 py-2 rounded-md'
        : 'complete-btn bg-blue-500 text-white px-4 py-2 rounded-md';
    }
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
  console.log('👉 selectTask CALLED for ID:', taskId);

  try {
    const currentSelectedTaskId = localStorage.getItem('selectedTaskId');
    const isAlreadySelected = currentSelectedTaskId === taskId;
    const localTask = localTaskCache.find(task => task._id === taskId);

    if (localTask) {
      setSelectedTaskUI(localTask);

      const taskElements = document.querySelectorAll('.task-item');
      taskElements.forEach(el => {
        el.classList.remove('selected', 'bg-dark-hover');

        const elTaskId = el.dataset.taskId;
        const elList = el.dataset.list?.toLowerCase().trim();
        const selList = localTask.list?.toLowerCase().trim();

        if (elTaskId === taskId && elList === selList) {
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

      const taskElements = document.querySelectorAll('.task-item');
      taskElements.forEach(el => {
        el.classList.remove('selected', 'bg-dark-hover');

        const elTaskId = el.dataset.taskId;
        const elList = el.dataset.list?.toLowerCase().trim();
        const selList = task.list?.toLowerCase().trim();

        if (elTaskId === task._id && elList === selList) {
          el.classList.add('selected', 'bg-dark-hover');
        }
      });
    }, 150);

    localStorage.setItem('selectedTaskId', taskId);
  } catch (err) {
    console.error('Failed to select task:', err);
  }
}



function setSelectedTaskUI(task) {
  console.log('🌟 setSelectedTaskUI CALLED for:', task.title, '| ID:', task._id, '| List:', task.list);

  if (!task) {
    console.warn('No task provided to setSelectedTaskUI');
    return;
  }

  if (task && task._id) {
    localStorage.setItem('selectedTaskId', task._id);

    // ✅ ensure panel knows what it's showing
    const panel = document.querySelector(`#right-panel-${task.list.toLowerCase().replace(/\s+/g, '-')}`);
    if (panel) {
      panel.dataset.currentTaskId = task._id;
    }
  }

  const currentList = localStorage.getItem('activeList');
  if (task.list !== currentList) {
    console.warn(`⛔ Skipping panel render: task "${task.title}" is in list "${task.list}", but current list is "${currentList}"`);
    return;
  }

  window.currentTaskId = task._id;
  if (task.list !== 'Personal' && typeof loadSubtasksForCurrentTask === 'function') {
  setTimeout(() => {
    loadSubtasksForCurrentTask();
  }, 50);
}


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

    const taskElements = Array.from(document.querySelectorAll('.task-item'));
    const movedIndex = taskElements.findIndex(el => el.dataset.taskId === taskId);

    let fallbackId = null;
    if (taskElements.length > 1 && movedIndex !== -1) {
      const fallbackEl = taskElements[movedIndex - 1] || taskElements[movedIndex + 1];
      if (fallbackEl) {
        fallbackId = fallbackEl.dataset.taskId;
      }
    }

    if (fallbackId) {
      const fallback = localTaskCache.find(t => t._id === fallbackId);
      if (fallback) {
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
  }

  if (typeof filterTasks === 'function') {
    filterTasks(currentActiveList, true);
  }

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
  const listId = list.toLowerCase().replace(/\s+/g, '-');

  // Remove from local cache
  localTaskCache.splice(taskIndex, 1);
  saveTaskCacheToLocalStorage();

  // Update task count UI
  updateTaskCount(list, -1);
  const countElement = document.getElementById(`count-${listId}`);
  if (countElement) {
    const remainingCount = localTaskCache.filter(t => t.list === list && !t.deleted).length;
    countElement.textContent = remainingCount.toString();
    console.log(`Updated ${list} count to: ${remainingCount} after deletion`);
  }

  // Remove task DOM element
  const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
  if (taskElement) taskElement.remove();

  // Remove the right panel for this task
  const panelId = `right-panel-${listId}-${taskId}`;
  const panel = document.getElementById(panelId);
  if (panel) {
    panel.remove();
    console.log(`✅ Removed panel for deleted task: ${taskId}`);
  }

  // Hide panel container if no panels remain
  const container = document.getElementById('right-panels-container');
  const visiblePanels = container.querySelectorAll('.right-panel:not(.hidden)');
  if (visiblePanels.length === 0) {
    container.classList.add('hidden');
    container.style.display = 'none';
  }

  // Handle selected task fallback logic
  const selectedTaskId = localStorage.getItem('selectedTaskId');
  const isSelectedTask = selectedTaskId === taskId;

  if (isSelectedTask) {
    const remainingTasks = localTaskCache.filter(t => t.list === list && !t.deleted);

    if (remainingTasks.length > 0) {
      // Try to pick task after the deleted one first, then before
      let fallback = null;

      for (let i = taskIndex; i < localTaskCache.length; i++) {
        if (localTaskCache[i].list === list && !localTaskCache[i].deleted) {
          fallback = localTaskCache[i];
          break;
        }
      }
      if (!fallback) {
        for (let i = taskIndex - 1; i >= 0; i--) {
          if (localTaskCache[i].list === list && !localTaskCache[i].deleted) {
            fallback = localTaskCache[i];
            break;
          }
        }
      }

      if (fallback) {
        setSelectedTaskUI(fallback);
        localStorage.setItem('selectedTaskId', fallback._id);
        window.currentTaskId = fallback._id;

        // Ensure the fallback panel is visible
        const fallbackPanelId = `right-panel-${listId}-${fallback._id}`;
        const fallbackPanel = document.getElementById(fallbackPanelId);
        if (fallbackPanel) {
          fallbackPanel.classList.remove('hidden');
        }

        // Make sure panel container is visible again
        container.classList.remove('hidden');
        container.style.display = 'flex';

        // Highlight fallback task
        setTimeout(() => {
          const taskElements = document.querySelectorAll('.task-item');
          taskElements.forEach(el => {
            el.classList.remove('selected', 'bg-dark-hover');
            if (el.dataset.taskId === fallback._id) {
              el.classList.add('selected', 'bg-dark-hover');
            }
          });
        }, 50);
      }
    } else {
      // No tasks left in list
      localStorage.removeItem('selectedTaskId');
      localStorage.removeItem('activeTaskId');
      window.currentTaskId = null;

      const listContainer = document.getElementById(`right-panels-container-${listId}`);
      if (listContainer) listContainer.classList.add('hidden');
      if (container) {
        container.classList.add('hidden');
        container.style.display = 'none';
      }

      console.log(`✅ Cleared panel container for empty list: ${list}`);
    }
  }
}




// Fix for panel showing when no tasks exist
// Replace the filterTasks function with this updated version

window.filterTasks = function (listName, preserveSelection = false) {
  console.log('Filtering tasks for list:', listName, 'preserveSelection:', preserveSelection);

  if (window.selectionLocked && preserveSelection) return;

  localStorage.setItem('activeList', listName);

  // 🔧 FIX: Update the main heading to show current list name
  const listTitle = document.getElementById('listTitle');
  const categoryLabel = document.getElementById('categoryLabel');
  const newTaskInput = document.getElementById('newTaskInput');
  
  // 🔧 FIX: Also update the main page heading (h1 element)
  const mainHeading = document.querySelector('h1');

  if (listTitle) listTitle.textContent = listName;
  if (categoryLabel) categoryLabel.textContent = listName;
  if (newTaskInput) newTaskInput.placeholder = `Add a task to ${listName}`;
  
  // 🔧 FIX: Update the main heading that shows "Personal tasks", "Work tasks", etc.
  if (mainHeading) {
    mainHeading.textContent = `${listName} tasks`;
  }

  refreshTaskList(listName);

  // 🔧 NEW: Check if there are any tasks in this list
  const normalizedList = listName.trim().toLowerCase();
  const tasksInList = localTaskCache.filter(task => 
    task.list.trim().toLowerCase() === normalizedList && !task.deleted
  );

  // 🔧 NEW: Hide right panel if no tasks exist
  const rightPanelsContainer = document.getElementById('right-panels-container');
  if (tasksInList.length === 0) {
    if (rightPanelsContainer) {
      rightPanelsContainer.classList.add('hidden');
      rightPanelsContainer.style.display = 'none';
    }
    
    // Clear any selected task data
    localStorage.removeItem('selectedTaskId');
    window.currentTaskId = null;
    
    console.log(`✅ Hidden panel for empty list: ${listName}`);
    return; // Exit early, no need to select tasks
  }

  // 🔧 EXISTING: Rest of the function remains the same for when tasks exist
  const selectedTaskId = localStorage.getItem('selectedTaskId');
  let taskToSelect = null;
  console.log('🎯 FINAL taskToSelect in filterTasks:', taskToSelect?.title || 'None');

  const lastMovedTaskId = localStorage.getItem('lastMovedTaskId');
  if (lastMovedTaskId) {
    const movedTask = localTaskCache.find(t => t._id === lastMovedTaskId && t.list === listName);
    if (movedTask) {
      taskToSelect = movedTask;
      console.log(`🔄 Focusing moved task: ${movedTask.title}`);
      localStorage.removeItem('lastMovedTaskId');
    }
  }

  if (preserveSelection && selectedTaskId) {
    const selectedTask = localTaskCache.find(t => t._id === selectedTaskId && t.list === listName);
    if (selectedTask) {
      console.log(`✅ Preserving manually selected task: ${selectedTask.title}`);
      taskToSelect = selectedTask;
    } else {
      console.warn(`🛑 Selected task (${selectedTaskId}) not found or not in list "${listName}". Skipping fallback.`);
      return; // 🛑 Do not fallback — let current UI stay as is
    }
  }
  console.log('🔍 Final taskToSelect in filterTasks:', taskToSelect?.title || 'None');
  
  

  if (!taskToSelect && (!preserveSelection || !selectedTaskId) && !window.selectionLocked) {
    taskToSelect = findMostRecentTask(listName);
    if (taskToSelect) {
      console.log(`📍 Fallback: Selecting most recent task: ${taskToSelect.title}`);
    }
  }

  if (taskToSelect) {
    // 🔧 NEW: Show right panel only when we have a task to select
    if (rightPanelsContainer) {
      rightPanelsContainer.classList.remove('hidden');
      rightPanelsContainer.style.display = 'block';
    }

    setSelectedTaskUI(taskToSelect);

    requestAnimationFrame(() => {
      const taskElements = document.querySelectorAll('.task-item');
      const selectedId = taskToSelect._id;
      const selectedList = taskToSelect.list.toLowerCase().replace(/\s+/g, '-').trim();

      taskElements.forEach(el => {
        el.classList.remove('selected', 'bg-dark-hover');
        if (el.dataset.taskId === selectedId && el.dataset.list === selectedList) {
          el.classList.add('selected', 'bg-dark-hover');
        }
      });

      window.selectionLocked = true;
    });

    localStorage.setItem('selectedTaskId', taskToSelect._id);
    localStorage.setItem('lastSelectedList', listName);

    if (typeof showPanelForList === 'function') {
      showPanelForList(listName, taskToSelect._id);
    }

    // ✅ Apply blur correctly to each task panel in the list
    tasksInList.forEach(task => {
      applyBlurEffect(task, true);
    });
  } else {
    // 🔧 NEW: If no task to select, hide the panel
    if (rightPanelsContainer) {
      rightPanelsContainer.classList.add('hidden');
      rightPanelsContainer.style.display = 'none';
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
    return null;
  }

  const listTasks = localTaskCache.filter(task => task.list === listName);
  if (listTasks.length === 0) {
    return null;
  }

  const sortedTasks = listTasks.sort((a, b) => {
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
    else {
      const aNum = parseInt(a._id.replace(/\D/g, ''));
      const bNum = parseInt(b._id.replace(/\D/g, ''));
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return bNum - aNum;
      }
    }
    return -1;
  });

  return sortedTasks[0];
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
  if (task && task._id) {
    localStorage.setItem('selectedTaskId', task._id); // ✅ force sync
  }
  
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