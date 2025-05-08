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

      // Get the active list from localStorage
      const currentList = localStorage.getItem('activeList') || 'Personal';
      console.log(`Using active list from localStorage: ${currentList}`);

      // Filter tasks for the current list, but don't auto-select a task yet
      filterTasks(currentList, true);

      // Find the most recent task in the current list
      const recentTask = findMostRecentTask(currentList);
      if (recentTask) {
        console.log(`Found most recent task on load for ${currentList}: ${recentTask.title} (ID: ${recentTask._id})`);

        // Select the most recent task
        setSelectedTaskUI(recentTask);

        // Store the selected task ID for persistence
        localStorage.setItem('selectedTaskId', recentTask._id);
        localStorage.setItem('lastSelectedList', currentList);

        // Highlight the task in the list - use setTimeout to ensure DOM is updated
        setTimeout(() => {
          const taskElements = document.querySelectorAll('.task-item');
          let found = false;

          // First remove selection from all tasks
          taskElements.forEach(el => {
            el.classList.remove('selected', 'bg-dark-hover');
          });

          // Then add selection to the recent task
          taskElements.forEach(el => {
            if (el.dataset.taskId === recentTask._id) {
              el.classList.add('selected', 'bg-dark-hover');
              found = true;
              console.log(`Highlighted task on load: ${recentTask.title} (ID: ${recentTask._id})`);
            }
          });

          if (!found) {
            console.warn(`Could not find task element for ID: ${recentTask._id} on load - refreshing task list`);
            // If we couldn't find the task element, try refreshing the task list again
            refreshTaskList(currentList);

            // And try highlighting again
            setTimeout(() => {
              const taskElements = document.querySelectorAll('.task-item');
              taskElements.forEach(el => {
                if (el.dataset.taskId === recentTask._id) {
                  el.classList.add('selected', 'bg-dark-hover');
                  console.log(`Highlighted task after refresh on load: ${recentTask.title}`);
                }
              });
            }, 100);
          }
        }, 100);

        console.log(`Selected most recent task on load: ${recentTask.title} (ID: ${recentTask._id})`);
      }
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

  // Add the new task to the cache
  localTaskCache.push(newTask);
  saveTaskCacheToLocalStorage();

  // Update task counts
  updateAllTaskCounts();

  // Refresh the task list with preserveSelection=true to prevent auto-selecting another task
  filterTasks(currentList, true);

  // Set this new task as selected (skip server fetch)
  setSelectedTaskUI(newTask);

  // Also highlight the task in the list - use setTimeout to ensure DOM is updated
  setTimeout(() => {
    const taskElements = document.querySelectorAll('.task-item');
    let found = false;

    // First remove selection from all tasks
    taskElements.forEach(el => {
      el.classList.remove('selected', 'bg-dark-hover');
    });

    // Then add selection to the new task
    taskElements.forEach(el => {
      if (el.dataset.taskId === newTask._id) {
        el.classList.add('selected', 'bg-dark-hover');
        found = true;
        console.log(`Highlighted new task: ${newTask.title} (ID: ${newTask._id})`);
      }
    });

    if (!found) {
      console.warn(`Could not find task element for new task ID: ${newTask._id} - refreshing task list`);
      // If we couldn't find the task element, try refreshing the task list again
      refreshTaskList(currentList);

      // And try highlighting again
      setTimeout(() => {
        const taskElements = document.querySelectorAll('.task-item');
        taskElements.forEach(el => {
          if (el.dataset.taskId === newTask._id) {
            el.classList.add('selected', 'bg-dark-hover');
            console.log(`Highlighted new task after refresh: ${newTask.title}`);
          }
        });
      }, 100);
    }
  }, 100);

  // Store selectedTaskId and list for refresh persistence
  localStorage.setItem('selectedTaskId', newTask._id);
  localStorage.setItem('lastSelectedList', currentList);

  // Log for debugging
  console.log(`New task added and selected: ${newTask.title} (ID: ${newTask._id})`);
  console.log(`Selected task ID saved to localStorage: ${localStorage.getItem('selectedTaskId')}`);

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
    // Sort tasks by recency (newest first) before adding to DOM
    const sortedTasks = filteredTasks.sort((a, b) => {
      // If tasks have timestamp-based IDs (like 'local_1234567890')
      if (a._id.startsWith('local_') && b._id.startsWith('local_')) {
        const aTime = parseInt(a._id.replace('local_', ''));
        const bTime = parseInt(b._id.replace('local_', ''));
        return bTime - aTime; // Descending order (newest first)
      }
      // If one is a local task and one is a server task, prefer the local task
      else if (a._id.startsWith('local_')) {
        return -1; // a comes first
      }
      else if (b._id.startsWith('local_')) {
        return 1; // b comes first
      }
      return -1;
    });

    sortedTasks.forEach(task => {
      const taskElement = createTaskElement(task);
      if (taskElement) {
        taskList.appendChild(taskElement);
      }
    });

    // After adding all tasks to the DOM, ensure the selected task is highlighted
    const selectedTaskId = localStorage.getItem('selectedTaskId');
    if (selectedTaskId) {
      // Use setTimeout to ensure the DOM is updated
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

  // Check if this task is the currently selected one
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
      // Toggle selection when clicking on a task
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
    // Get the list name from the task
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
      // If the moved task was selected, find and select the most recent task in the current list
      const recentTask = findMostRecentTask(currentList);
      if (recentTask) {
        setSelectedTaskUI(recentTask);
        localStorage.setItem('selectedTaskId', recentTask._id);

        // Highlight the task in the list - use setTimeout to ensure DOM is updated
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
        // If no tasks left in this list, reset the right panel
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
    // Check if the task is already selected
    const currentSelectedTaskId = localStorage.getItem('selectedTaskId');
    const isAlreadySelected = currentSelectedTaskId === taskId;

    // If the task is already selected, deselect it
    if (isAlreadySelected) {
      // Remove selection highlight from all tasks
      const taskElements = document.querySelectorAll('.task-item');
      taskElements.forEach(el => {
        el.classList.remove('selected', 'bg-dark-hover');
      });

      // Reset the right panel with forceReset=true to prevent auto-selecting another task
      resetRightPanel(true);

      // Clear the selected task ID
      localStorage.removeItem('selectedTaskId');
      window.currentTaskId = null;
      return;
    }

    // First try to find the task in the local cache
    const localTask = localTaskCache.find(task => task._id === taskId);

    if (localTask) {
      // If found locally, use it directly
      setSelectedTaskUI(localTask);

      // Highlight the task in the list
      const taskElements = document.querySelectorAll('.task-item');
      taskElements.forEach(el => {
        el.classList.remove('selected', 'bg-dark-hover');
        if (el.dataset.taskId === taskId) {
          el.classList.add('selected', 'bg-dark-hover');
        }
      });

      // Store the selected task ID for persistence
      localStorage.setItem('selectedTaskId', taskId);
      return;
    }

    // If not found locally, try to fetch from server
    const res = await fetch(`/todos/${taskId}`);
    if (!res.ok) {
      console.error(`Error fetching task: ${res.status}`);
      return;
    }

    const task = await res.json();

    // Update the UI with the fetched task
    setSelectedTaskUI(task);

    // Highlight the task in the list
    const taskElements = document.querySelectorAll('.task-item');
    taskElements.forEach(el => {
      el.classList.remove('selected', 'bg-dark-hover');
      if (el.dataset.taskId === taskId) {
        el.classList.add('selected', 'bg-dark-hover');
      }
    });

    // Store the selected task ID for persistence
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

  // Get the panel for this task's list
  const listId = task.list.toLowerCase().replace(/\s+/g, '-');
  const panelId = `right-panel-${listId}`;
  const panel = document.getElementById(panelId);

  if (panel) {
    // Update the panel with this task
    updatePanelWithTask(panel, task);

    // Dispatch task selected event
    document.dispatchEvent(new CustomEvent('taskSelected', {
      detail: { taskId: task._id, listName: task.list }
    }));
  } else {
    console.warn(`Panel not found for list: ${task.list}`);

    // Create a panel for this list if it doesn't exist
    if (typeof createPanelForList === 'function') {
      const newPanel = createPanelForList(task.list);
      if (newPanel) {
        updatePanelWithTask(newPanel, task);

        // Dispatch task selected event
        document.dispatchEvent(new CustomEvent('taskSelected', {
          detail: { taskId: task._id, listName: task.list }
        }));
      }
    }
  }

  // Store the current task and list in localStorage for persistence
  localStorage.setItem('selectedTaskId', task._id);
  localStorage.setItem('lastSelectedList', task.list);
}




function loadTaskDetails(task) {
  selectTask(task._id);
}

function deleteTask(taskId) {
  const taskIndex = localTaskCache.findIndex(task => task._id === taskId);
  if (taskIndex === -1) return;

  const listName = localTaskCache[taskIndex].list;
  console.log(`Deleting task ${taskId} from list ${listName}`);

  const taskList = listName;

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

  console.log(`About to decrease count for ${taskList} by 1`);

  const listSelector = taskList.toLowerCase().replace(/\s+/g, '-');
  const countElement = document.getElementById(`count-${listSelector}`);
  if (countElement) {
    let count = parseInt(countElement.textContent) || 0;
    count = Math.max(0, count - 1);
    countElement.textContent = count;
    console.log(`Updated count for ${taskList} to ${count}`);
  } else {
    console.warn(`Count element for "${taskList}" not found: count-${listSelector}`);
  }

  const allTasksCount = document.getElementById('allTasksCount');
  if (allTasksCount) {
    let total = parseInt(allTasksCount.textContent) || 0;
    total = Math.max(0, total - 1);
    allTasksCount.textContent = total;
    console.log(`Updated total count to ${total}`);
  }

  if (window.currentTaskId === taskId) {
    // If the deleted task was selected, find and select the most recent task in the list
    const recentTask = findMostRecentTask(taskList);
    if (recentTask) {
      setSelectedTaskUI(recentTask);
      localStorage.setItem('selectedTaskId', recentTask._id);

      // Highlight the task in the list
      const taskElements = document.querySelectorAll('.task-item');
      taskElements.forEach(el => {
        el.classList.remove('selected', 'bg-dark-hover');
        if (el.dataset.taskId === recentTask._id) {
          el.classList.add('selected', 'bg-dark-hover');
        }
      });
    } else {
      // If no tasks left in this list, reset the right panel
      resetRightPanel(true);
      window.currentTaskId = null;
    }
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

window.filterTasks = function(listName, preserveSelection = false) {
  console.log('Filtering tasks for list:', listName);

  // Store the active list in localStorage
  localStorage.setItem('activeList', listName);
  console.log(`Set active list in localStorage to: ${listName}`);

  // Update the main title
  const titleElement = document.querySelector('h1');
  if (titleElement) {
    titleElement.textContent = `${listName} tasks`;
  }

  // Update the task category dropdown if it exists
  const taskCategory = document.getElementById('taskCategory');
  if (taskCategory) {
    taskCategory.value = listName;
  }

  // Clear the new task input
  const newTaskInput = document.getElementById('newTaskInput');
  if (newTaskInput) {
    newTaskInput.value = '';
  }

  // Highlight the active list in the sidebar
  if (typeof window.highlightActiveList === 'function') {
    window.highlightActiveList(listName);
  } else {
    highlightActiveList(listName);
  }

  // First refresh the task list to show the tasks for this list
  refreshTaskList(listName);

  // Show the panel for this list
  if (typeof showPanelForList === 'function') {
    showPanelForList(listName);
  }

  // Check if we should preserve the current selection
  if (!preserveSelection) {
    // ALWAYS find and select the most recent task in this list
    // This is critical for showing the correct task when switching lists
    const recentTask = findMostRecentTask(listName);

    if (recentTask) {
      console.log(`Found most recent task in ${listName}: ${recentTask.title} (ID: ${recentTask._id})`);

      // FORCE the right panel to show this task
      // This is the key fix - we need to make sure the right panel shows the most recent task
      setSelectedTaskUI(recentTask);

      // Store the selected task ID for persistence
      localStorage.setItem('selectedTaskId', recentTask._id);
      localStorage.setItem('lastSelectedList', listName);

      // Highlight the task in the list - use setTimeout to ensure DOM is updated
      setTimeout(() => {
        const taskElements = document.querySelectorAll('.task-item');
        let found = false;

        // First remove selection from all tasks
        taskElements.forEach(el => {
          el.classList.remove('selected', 'bg-dark-hover');
        });

        // Then add selection to the recent task
        taskElements.forEach(el => {
          if (el.dataset.taskId === recentTask._id) {
            el.classList.add('selected', 'bg-dark-hover');
            found = true;
            console.log(`Highlighted task: ${recentTask.title} (ID: ${recentTask._id})`);
          }
        });

        if (!found) {
          console.warn(`Could not find task element for ID: ${recentTask._id} - refreshing task list`);
          // If we couldn't find the task element, try refreshing the task list again
          refreshTaskList(listName);

          // And try highlighting again
          setTimeout(() => {
            const taskElements = document.querySelectorAll('.task-item');
            taskElements.forEach(el => {
              if (el.dataset.taskId === recentTask._id) {
                el.classList.add('selected', 'bg-dark-hover');
                console.log(`Highlighted task after refresh: ${recentTask.title}`);
              }
            });
          }, 100);
        }
      }, 100);
    } else {
      console.log(`No tasks found in ${listName} list`);

      // If no tasks in this list, clear the panel for this list
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
  const lists = ['Personal', 'Work', 'Grocery List'];
  const customLists = [...new Set(localTaskCache.map(task => task.list))].filter(list =>
    !lists.includes(list) && list
  );

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

      const listItem = document.querySelector(`.sidebar-item[data-list="${listSelector}"]`);
      if (listItem) {
        let countSpan = listItem.querySelector('.task-count');
        if (!countSpan) {
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

function applyBlurEffect(isCompleted, listName) {
  // If listName is provided, only apply blur to that list's panel
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
    // If no listName provided, try to get the current active list
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
  // Get the current active list
  const currentList = localStorage.getItem('activeList') || 'Personal';

  // If not forcing a reset, try to find the most recently added task for this list
  if (!forceReset) {
    const recentTask = findMostRecentTask(currentList);
    if (recentTask) {
      // If we have a recent task, display it
      setSelectedTaskUI(recentTask);
      return;
    }
  }

  // If forcing a reset or no recent task, clear the panel for this list
  const listId = currentList.toLowerCase().replace(/\s+/g, '-');
  const panelId = `right-panel-${listId}`;
  const panel = document.getElementById(panelId);

  if (panel && typeof clearPanel === 'function') {
    clearPanel(panel, currentList);
  } else {
    // Fallback to old method if panel or clearPanel function not found
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

    // Remove blur effect
    const blurContent = document.querySelector(`#${panelId} .task-blur-content`);
    if (blurContent) {
      blurContent.classList.remove('blurred');
      blurContent.style.cssText = 'filter: none !important; pointer-events: auto;';
    }
  }
}

// Find the most recently added task for a specific list
function findMostRecentTask(listName) {
  if (!localTaskCache || localTaskCache.length === 0) {
    console.log(`No tasks in cache for list: ${listName}`);
    return null;
  }

  // Filter tasks by the specified list
  const listTasks = localTaskCache.filter(task => task.list === listName);
  if (listTasks.length === 0) {
    console.log(`No tasks found for list: ${listName}`);
    return null;
  }

  console.log(`Found ${listTasks.length} tasks for list: ${listName}`);

  // Log all tasks in this list for debugging
  listTasks.forEach(task => {
    console.log(`- Task: ${task.title} (ID: ${task._id})`);
  });

  // Always find the most recently added task
  const sortedTasks = listTasks.sort((a, b) => {
    // If tasks have timestamp-based IDs (like 'local_1234567890')
    if (a._id.startsWith('local_') && b._id.startsWith('local_')) {
      const aTime = parseInt(a._id.replace('local_', ''));
      const bTime = parseInt(b._id.replace('local_', ''));
      return bTime - aTime; // Descending order (newest first)
    }
    // If one is a local task and one is a server task, prefer the local task
    else if (a._id.startsWith('local_')) {
      return -1; // a comes first
    }
    else if (b._id.startsWith('local_')) {
      return 1; // b comes first
    }
    // For server tasks, try to compare by ID (assuming newer tasks have higher IDs)
    else {
      // Try to extract numeric parts if possible
      const aNum = parseInt(a._id.replace(/\D/g, ''));
      const bNum = parseInt(b._id.replace(/\D/g, ''));
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return bNum - aNum; // Descending order (newest first)
      }
    }
    // If all else fails, just return the first task
    return -1;
  });

  // Log the sorted tasks for debugging
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