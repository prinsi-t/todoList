// Backend-only taskManager.js - All localStorage removed
window.selectionLocked = false;
window.localTaskCache = [];
window.currentTaskId = null;
window.activeList = 'Personal';
window.selectedTaskId = null;

document.addEventListener('DOMContentLoaded', function () {
  const addTaskForm = document.getElementById('addTaskForm');
  const newTaskInput = document.getElementById('newTaskInput');
  const taskList = document.getElementById('taskList');
  const completeBtn = document.getElementById('complete-btn');

  loadTasks();
  completeBtn.addEventListener('click', toggleBlurFromCompleteBtn);
  ensureCountElementsExist();
});

async function loadTasksFromServer() {
  try {
    const currentSelectedTaskId = window.selectedTaskId;
    const currentList = window.activeList;

    const response = await fetch('/todos/all');
    if (!response.ok) {
      console.error('Failed to fetch tasks from server:', response.status);
      return;
    }

    const serverTasks = await response.json();
    window.localTaskCache = serverTasks;
    updateAllTaskCounts();

    filterTasks(currentList, true);

    if (currentSelectedTaskId) {
      const selectedTask = window.localTaskCache.find(t => t._id === currentSelectedTaskId);
      if (selectedTask && selectedTask.list === currentList) {
        console.log(`✅ Preserving selected task after refresh: ${selectedTask.title}`);
        setSelectedTaskUI(selectedTask);
        window.selectedTaskId = selectedTask._id;
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

        return;
      }
    }

    console.log('ℹ️ No fallback task selected — respecting existing selection');

  } catch (error) {
    console.error('Error loading tasks from server:', error);
    filterTasks(window.activeList, true);
    updateAllTaskCounts();
  }
}

async function loadTasks() {
  await loadTasksFromServer();
}

window.loadTasks = loadTasks;

async function handleAddTask(e) {
  e.preventDefault();

  const input = document.getElementById('newTaskInput');
  const title = input?.value.trim();
  if (!title) return;

 const currentList = getActiveList?.() || window.activeList || 'Personal';

  const res = await fetch('/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, list: currentList })
  });

  if (!res.ok) return;

  const newTask = await res.json();
  localTaskCache.unshift(newTask);

  if (typeof refreshTaskList === 'function') refreshTaskList(currentList);
  if (typeof updateAllTaskCounts === 'function') updateAllTaskCounts();

  input.value = '';

  // ✅ Select new task immediately — show only its panel
  if (typeof setSelectedTaskUI === 'function') {
    setSelectedTaskUI(newTask);
    window.selectedTaskId = newTask._id;
window.currentTaskId = newTask._id;
window.lastMovedTaskId = newTask._id;

  }

  // 🛠 Fix highlight loss when adding first task to empty list
setTimeout(() => {
  const els = document.querySelectorAll('.task-item');
  els.forEach(el => {
    el.classList.remove('selected', 'bg-dark-hover');
    if (el.dataset.taskId === newTask._id) {
      el.classList.add('selected', 'bg-dark-hover');
    }
  });
}, 100);


  if (typeof updatePanelBlurUI === 'function') {
    updatePanelBlurUI(newTask);
  }
}


// 👇 Expose globally
window.handleAddTask = handleAddTask;




function refreshTaskList(listName) {
  const taskList = document.getElementById('taskList');
  if (!taskList) {
    console.error('Task list container not found');
    return;
  }

  taskList.innerHTML = '';

  const normalizedList = listName.trim().toLowerCase();
  const filteredTasks = window.localTaskCache.filter(
    task => task && typeof task.list === 'string' && task.list.trim().toLowerCase() === normalizedList
  );
  
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
      // Sort by creation time (newer first)
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    sortedTasks.forEach(task => {
      const taskElement = createTaskElement(task);
      if (taskElement) {
        taskList.appendChild(taskElement);
      }
    });
  }

  updateAllTaskCounts();
  setTimeout(() => {
    const selectedId = window.selectedTaskId;
    if (!selectedId) return;
  
    const selectedEl = document.querySelector(`.task-item[data-task-id="${selectedId}"]`);
    if (selectedEl) {
      selectedEl.classList.add('selected', 'bg-dark-hover');
    }
  }, 100);
  
}

function createTaskElement(task) {
  if (!task) return null;

  const selectedTaskId = window.selectedTaskId;
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

  // Get custom lists from server or window variable
  let customLists = window.customLists || [];

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

async function toggleTaskCompletion(taskId) {
  const taskIndex = window.localTaskCache.findIndex(task => task._id === taskId);
  if (taskIndex === -1) return;

  const newCompletedState = !window.localTaskCache[taskIndex].completed;

  // ✅ Optimistic update
  window.localTaskCache[taskIndex].completed = newCompletedState;

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
  const isCurrentTask = selectedTask && selectedTask.dataset.taskId === taskId;
  const updatedTask = window.localTaskCache[taskIndex];

  if (isCurrentTask) {
    if (newCompletedState) {
      applyBlurEffect(updatedTask, true);
    } else {
      const panel = document.querySelector(`.right-panel[data-current-task-id="${taskId}"]`);
      if (panel) {
        const blurTarget = panel.querySelector('.task-blur-content');
        if (blurTarget) {
          blurTarget.classList.remove('blurred');
          blurTarget.style.filter = 'none !important';
          blurTarget.style.pointerEvents = 'auto';
        }
        panel.classList.remove('selection-locked');
      }
    }

    updatePanelBlurUI(updatedTask);

    const completeBtn = document.getElementById('complete-btn');
    if (completeBtn) {
      completeBtn.textContent = newCompletedState ? 'Mark as Incomplete' : 'Mark as Complete';
      completeBtn.className = newCompletedState
        ? 'complete-btn bg-green-500 text-white px-4 py-2 rounded-md'
        : 'complete-btn bg-blue-500 text-white px-4 py-2 rounded-md';
    }
  }

  try {
    const response = await fetch(`/todos/${taskId}/complete`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: newCompletedState })
    });

    if (!response.ok) {
      console.error(`Server error when updating task completion status: ${response.status}`);
      window.localTaskCache[taskIndex].completed = !newCompletedState;
      return;
    }

    const data = await response.json();
    const updated = data.task;

    if (updated) {
      const updatedIndex = window.localTaskCache.findIndex(task => task._id === updated._id);
      if (updatedIndex !== -1) {
        window.localTaskCache[updatedIndex] = updated;
        // 🔁 Re-run filterTasks to refresh all UI (highlight, blur, etc.)
        window.filterTasks(updated.list, true);
      }
    }
  } catch (error) {
    console.error('Error syncing task completion status:', error);
    window.localTaskCache[taskIndex].completed = !newCompletedState;
  }
}



async function selectTask(taskId) {
  console.log('👉 selectTask CALLED for ID:', taskId);

  try {
    const currentSelectedTaskId = window.selectedTaskId;
    const isAlreadySelected = currentSelectedTaskId === taskId;
    const localTask = window.localTaskCache.find(task => task._id === taskId);

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

      window.selectedTaskId = taskId;
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

    window.selectedTaskId = taskId;
  } catch (err) {
    console.error('Failed to select task:', err);
  }
}

function setSelectedTaskUI(task) {
  if (!task) return;

  console.log('📍 setSelectedTaskUI CALLED');
  console.log('🔹 Task:', task.title, '| ID:', task._id, '| List:', task.list);
  console.log('🔹 DOM task items available:', document.querySelectorAll('.task-item').length);

  const listId = task.list.toLowerCase().replace(/\s+/g, '-');
  const panelId = `right-panel-${listId}-${task._id}`;

  // 🧼 Hide all other task panels
  document.querySelectorAll('.right-panel.task-panel').forEach(p => {
    p.classList.add('hidden');
    p.style.display = 'none';
  });

  // 🧱 Ensure panel exists
  let panel = document.getElementById(panelId);
  if (!panel && typeof createPanelForTask === 'function') {
    console.log('🧱 Creating panel for task:', task.title);
    panel = createPanelForTask(task);
  }

  if (!panel) {
    console.warn(`⚠️ setSelectedTaskUI: Panel not found and couldn't be created for task "${task.title}"`);
    return;
  }

  // ✅ Show correct panel
  panel.classList.remove('hidden');
  panel.style.display = 'block';
  console.log('✅ Panel is now visible for:', task.title);

  // ✅ Ensure container is visible
  const container = document.getElementById('right-panels-container');
  if (container) {
    container.classList.remove('hidden');
    container.style.display = 'block';
    console.log('✅ Panel container is visible');
  }

  // ✅ Highlight selected task in list after DOM updates
  const selectedId = task._id;
  const selectedList = task.list.toLowerCase().replace(/\s+/g, '-').trim();

  requestAnimationFrame(() => {
    console.log('🎯 Applying highlight to task items...');
    const taskElements = document.querySelectorAll('.task-item');
    let found = false;

    taskElements.forEach(el => {
      const elTaskId = el.dataset.taskId?.trim();
      const elList = el.dataset.list?.trim().toLowerCase().replace(/\s+/g, '-');

const isSelected =
  elTaskId === String(selectedId).trim() &&
  elList === selectedList;

if (!elTaskId || !elList) {
  console.warn('⚠️ Missing dataset attributes on task item:', el);
  return;
}


      el.classList.remove('selected', 'bg-dark-hover');

      if (isSelected) {
        el.classList.add('selected', 'bg-dark-hover');
        el.style.backgroundColor = '#1e293b'; // force fallback
        el.style.transition = 'none';
        found = true;
        console.log(`🎯 Highlighted task DOM: ${task.title} | ID: ${selectedId}`);
      } else {
        el.style.backgroundColor = '';
        el.style.transition = '';
      }
    });

    if (!found) {
      console.warn(`⚠️ Task DOM not found for highlighting: ${task.title}`);
    }

    console.log('✅ Forced style reapply done for:', task.title);
    console.log('%c[UI CHECK] Selected task DOM updated and forced highlight', 'background: #1e293b; color: white; padding: 2px;');
  });
  setTimeout(() => {
    const retryElements = document.querySelectorAll('.task-item');
    let retryFound = false;
  
    retryElements.forEach(el => {
      const elId = String(el.dataset.taskId || '').trim();
      const elList = String(el.dataset.list || '').trim().toLowerCase();
  
      if (elId === String(task._id).trim() && elList === selectedList) {
        el.classList.add('selected', 'bg-dark-hover');
        retryFound = true;
      }
    });
  
    console.log(retryFound
      ? '🟢 [setSelectedTaskUI] Retry highlight success'
      : '🔴 [setSelectedTaskUI] Retry highlight failed again');
  }, 250); // Slightly longer delay than requestAnimationFrame
  

  // ✅ Sync global state
  window.selectedTaskId = task._id;
  window.currentTaskId = task._id;
  window.lastSelectedList = task.list;
  window.selectionLocked = true;

  console.log('🔐 Selection locked for:', task.title);

  // 🧠 Sync panel content
  if (typeof updatePanelWithTask === 'function') {
    console.log('🧠 Updating panel with task content...');
    updatePanelWithTask(panel, task);
  }

  document.dispatchEvent(new CustomEvent('taskSelected', {
    detail: { taskId: task._id, listName: task.list }
  }));
}






function loadTaskDetails(task) {
  selectTask(task._id);
}

async function moveTaskToList(taskId, newList) {
  const taskIndex = window.localTaskCache.findIndex(t => t._id === taskId);
  if (taskIndex === -1) return;

  const task = window.localTaskCache[taskIndex];
  const oldList = task.list;
  const selectedTaskId = window.selectedTaskId;
  const isMovingSelectedTask = selectedTaskId === taskId;

  try {
    const response = await fetch(`/todos/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ list: newList })
    });

    if (!response.ok) {
      console.error('Failed to move task on server:', response.status);
      return;
    }

    const updatedTask = await response.json();
    
    // Update local cache
    task.list = newList;
    window.localTaskCache[taskIndex] = updatedTask;

    window.lastMovedTaskId = taskId;
    window.selectedTaskId = null;
    window.currentTaskId = null;

    updateAllTaskCounts();

    const updateCount = (list) => {
      const el = document.getElementById(`count-${list.toLowerCase().replace(/\s+/g, '-')}`);
      if (el) {
        const count = window.localTaskCache.filter(t => t.list === list && !t.deleted).length;
        el.textContent = count.toString();
      }
    };
    updateCount(oldList);
    updateCount(newList);

    const currentActiveList = window.activeList;
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

      window.selectedTaskId = null;
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
        const fallback = window.localTaskCache.find(t => t._id === fallbackId);
        if (fallback) {
          window.selectedTaskId = fallback._id;
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
      window.selectedTaskId = task._id;
      window.lastSelectedList = newList;

      setTimeout(() => {
        refreshTaskCache();

        const newPanelId = `right-panel-${newList.toLowerCase().replace(/\s+/g, '-')}`;
        let panel = document.getElementById(newPanelId);

        if (!panel && typeof createPanelForList === 'function') {
          panel = createPanelForList(newList);
        }

        const currentList = window.activeList;

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

    const currentlyVisibleList = window.activeList;
    if (newList === currentlyVisibleList) {
      if (typeof showPanelForList === 'function') {
        showPanelForList(newList, task._id);
      }
    }
  } catch (error) {
    console.error('Error moving task:', error);
  }
}

window.moveTaskToList = moveTaskToList;

async function deleteTask(taskId) {
  const taskIndex = window.localTaskCache.findIndex(task => task._id === taskId);
  if (taskIndex === -1) {
    console.error(`Task with ID ${taskId} not found`);
    return;
  }

  const task = window.localTaskCache[taskIndex];
  const list = task.list;
  const listId = list.toLowerCase().replace(/\s+/g, '-');

  try {
    const response = await fetch(`/todos/${taskId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      console.error('Failed to delete task on server:', response.status);
      return;
    }

    // Remove from local cache
    window.localTaskCache.splice(taskIndex, 1);

    // Update task count UI
    updateTaskCount(list, -1);
    const countElement = document.getElementById(`count-${listId}`);
    if (countElement) {
      const remainingCount = window.localTaskCache.filter(t => t.list === list && !t.deleted).length;
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
    const selectedTaskId = window.selectedTaskId;
    const isSelectedTask = selectedTaskId === taskId;

    if (isSelectedTask) {
      const remainingTasks = window.localTaskCache.filter(t => t.list === list && !t.deleted);

      if (remainingTasks.length > 0) {
        let fallback = null;

        for (let i = taskIndex; i < window.localTaskCache.length; i++) {
          if (window.localTaskCache[i].list === list && !window.localTaskCache[i].deleted) {
            fallback = window.localTaskCache[i];
            break;
          }
        }
        if (!fallback) {
          for (let i = taskIndex - 1; i >= 0; i--) {
            if (window.localTaskCache[i].list === list && !window.localTaskCache[i].deleted) {
              fallback = window.localTaskCache[i];
              break;
            }
          }
        }

        if (fallback) {
          setSelectedTaskUI(fallback);
          window.selectedTaskId = fallback._id;
          window.currentTaskId = fallback._id;

          const fallbackPanelId = `right-panel-${listId}-${fallback._id}`;
          const fallbackPanel = document.getElementById(fallbackPanelId);
          if (fallbackPanel) {
            fallbackPanel.classList.remove('hidden');
          }

          container.classList.remove('hidden');
          container.style.display = 'flex';

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
        window.selectedTaskId = null;
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
  } catch (error) {
    console.error('Error deleting task:', error);
  }
}

window.filterTasks = function (listName, preserveSelection = false) {
  console.log('📥 [filterTasks] Called for list:', listName, '| preserveSelection:', preserveSelection);

  if (!preserveSelection) {
    console.log('🔓 [filterTasks] Forcing unlock due to preserveSelection = false');
    window.selectionLocked = false;
  }

  if (window.selectionLocked && preserveSelection) {
    const preservedTask = window.localTaskCache.find(t => String(t._id) === String(window.selectedTaskId));
    if (preservedTask && preservedTask.list === listName) {
      console.log('✅ [filterTasks] Restoring preserved task:', preservedTask.title);
      setSelectedTaskUI(preservedTask);
      return;
    }
    console.log('⚠️ [filterTasks] No valid preserved task — unlocking selection');
    window.selectionLocked = false;
  }

  window.activeList = listName;
  console.log('📌 [filterTasks] Setting active list to:', listName);

  const listTitle = document.getElementById('listTitle');
  const categoryLabel = document.getElementById('categoryLabel');
  const newTaskInput = document.getElementById('newTaskInput');
  const mainHeading = document.querySelector('h1');

  if (listTitle) listTitle.textContent = listName;
  if (categoryLabel) categoryLabel.textContent = listName;
  if (newTaskInput) newTaskInput.placeholder = `Add a task to ${listName}`;
  if (mainHeading) mainHeading.textContent = `${listName} tasks`;

  console.log('🔄 [filterTasks] Updated UI labels');

  refreshTaskList(listName);

  const normalizedList = listName.trim().toLowerCase();
  let tasksInList = window.localTaskCache.filter(task => task?.list?.trim().toLowerCase() === normalizedList && !task.deleted);

  console.log(`🔍 [filterTasks] Found ${tasksInList.length} tasks in "${listName}"`);

  const rightPanelsContainer = document.getElementById('right-panels-container');
  document.querySelectorAll('.right-panel.task-panel').forEach(panel => {
    panel.classList.add('hidden');
    panel.style.display = 'none';
  });
  console.log('🧼 [filterTasks] Hid all task panels');

  if (tasksInList.length === 0) {
    console.log(`⚠️ [filterTasks] No tasks to show in "${listName}"`);
    if (rightPanelsContainer) {
      rightPanelsContainer.classList.add('hidden');
      rightPanelsContainer.style.display = 'none';
    }
    window.selectedTaskId = null;
    window.currentTaskId = null;
    return;
  }

  let taskToSelect = null;
  const selectedTask = window.localTaskCache.find(t => String(t._id) === String(window.selectedTaskId));

  if (selectedTask && selectedTask.list === listName && preserveSelection) {
    taskToSelect = selectedTask;
    console.log('✅ [filterTasks] Preserved selected task:', selectedTask.title);
  }

  if (!taskToSelect && window.lastMovedTaskId) {
    const movedTask = window.localTaskCache.find(t => String(t._id) === String(window.lastMovedTaskId) && t.list === listName);
    if (movedTask) {
      taskToSelect = movedTask;
      window.lastMovedTaskId = null;
      console.log('🔁 [filterTasks] Using last moved task:', movedTask.title);
    }
  }

  if (!taskToSelect) {
    taskToSelect = findMostRecentTask(listName);
    if (taskToSelect) {
      console.log('🧭 [filterTasks] Fallback to most recent task:', taskToSelect.title);
      requestAnimationFrame(() => setSelectedTaskUI(taskToSelect));
      return;
    }
  }

  if (!taskToSelect || !document.querySelector(`.task-item[data-task-id="${taskToSelect._id}"]`)) {
    taskToSelect = findMostRecentTask(listName);
    console.log('🧭 [filterTasks] Fallback to most recent task:', taskToSelect?.title || 'None');
  }

  if (!taskToSelect && preserveSelection === false) {
    taskToSelect = tasksInList[0];
    if (taskToSelect) {
      console.log('📌 [filterTasks] fallback → selected first available task:', taskToSelect.title);
    }
  }

  if (!taskToSelect) {
    console.warn(`⚠️ [filterTasks] Could not select a task for "${listName}"`);
    if (rightPanelsContainer) {
      rightPanelsContainer.classList.add('hidden');
      rightPanelsContainer.style.display = 'none';
    }
    return;
  }

  const panelId = `right-panel-${taskToSelect.list.toLowerCase().replace(/\s+/g, '-')}-${taskToSelect._id}`;
  let panel = document.getElementById(panelId);

  if (!panel && typeof createPanelForTask === 'function') {
    console.log('🧱 [filterTasks] Creating panel for:', taskToSelect.title);
    panel = createPanelForTask(taskToSelect);
  }

  if (!panel) {
    console.warn(`⚠️ [filterTasks] Could not create panel for task "${taskToSelect.title}"`);
    if (rightPanelsContainer) {
      rightPanelsContainer.classList.add('hidden');
      rightPanelsContainer.style.display = 'none';
    }
    return;
  }

  panel.classList.remove('hidden');
  panel.style.display = 'block';
  console.log('✅ [filterTasks] Panel displayed for:', taskToSelect.title);

  if (rightPanelsContainer) {
    rightPanelsContainer.classList.remove('hidden');
    rightPanelsContainer.style.display = 'block';
  }

  setTimeout(() => {
    refreshTaskList(listName);
    tasksInList = window.localTaskCache.filter(task => task?.list?.trim().toLowerCase() === normalizedList && !task.deleted);

    if (tasksInList.length === 1 && !preserveSelection) {
      console.log('🛠 [filterTasks] First task in list — defer and retry highlighting');
      return setTimeout(() => window.filterTasks(listName, true), 60);
    }

    setTimeout(() => {
      setSelectedTaskUI(taskToSelect);
      window.selectedTaskId = taskToSelect._id;
      window.currentTaskId = taskToSelect._id;

      setTimeout(() => {
        requestAnimationFrame(() => {
          const taskElements = document.querySelectorAll('.task-item');
          let found = false;

          console.log(`🔍 [Highlight Retry] Scanning ${taskElements.length} task-item elements`);

          taskElements.forEach(el => {
            const elId = String(el.dataset.taskId || '').trim();
            const elList = String(el.dataset.list || '').trim().toLowerCase();
            if (elId === String(taskToSelect._id).trim() && elList === normalizedList) {
              el.classList.add('selected', 'bg-dark-hover');
              found = true;
              console.log(`✅ [Highlight Retry] Task item matched: ${taskToSelect.title}`);
            }
          });

          console.log(found ? '🟢 [Highlight Retry] Success — task highlighted' : '🔴 [Highlight Retry] Still failed — no DOM match');
          window.selectionLocked = true;
        });
      }, 150);

      setTimeout(() => {
        const retryElements = document.querySelectorAll('.task-item');
        let retryFound = false;
        retryElements.forEach(el => {
          if (el.dataset.taskId === taskToSelect._id && el.dataset.list === listName.toLowerCase()) {
            el.classList.add('selected', 'bg-dark-hover');
            retryFound = true;
          }
        });
        console.log(retryFound ? '🟢 [filterTasks] Retry highlight success' : '🔴 [filterTasks] Retry highlight still failed');
      }, 300);
    }, 60);
  }, 0);

  window.lastSelectedList = listName;
  console.log('📌 [filterTasks] Updated lastSelectedList to:', listName);

  console.log('🎬 [filterTasks] RequestAnimationFrame → initial highlight');
  requestAnimationFrame(() => {
    const taskElements = document.querySelectorAll('.task-item');
    let found = false;
    taskElements.forEach(el => {
      el.classList.remove('selected', 'bg-dark-hover');
      if (
        String(el.dataset.taskId).trim() === String(taskToSelect._id).trim() &&
        String(el.dataset.list).trim().toLowerCase() === normalizedList
      ) {
        el.classList.add('selected', 'bg-dark-hover');
        found = true;
        console.log(`🎯 Immediate highlight matched → Task: ${taskToSelect.title}`);
      }
    });
    console.log(found ? '✅ [filterTasks] Immediate highlight success' : '⚠️ [filterTasks] Immediate highlight task DOM not found');
    window.selectionLocked = true;
  });

  console.log(`🌫 [filterTasks] Applying blur to ${tasksInList.length} tasks`);
  tasksInList.forEach(task => {
    if (task.completed) {
      applyBlurEffect(task, true);
    } else {
      const panel = document.querySelector(`.right-panel[data-current-task-id="${task._id}"]`);
      if (panel) {
        const blurTarget = panel.querySelector('.task-blur-content');
        if (blurTarget) {
          blurTarget.classList.remove('blurred');
          blurTarget.style.filter = 'none !important';
          blurTarget.style.pointerEvents = 'auto';
        }
        panel.classList.remove('selection-locked');
      }
    }
  });

  console.log('✅ [filterTasks] Completed for list:', listName);
};











function resetRightPanel(forceReset = false) {
  const currentList = window.activeList || 'Personal';

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
  if (!window.localTaskCache || window.localTaskCache.length === 0) return null;

  const listTasks = window.localTaskCache
    .filter(task => task.list === listName && !task.deleted);

  if (listTasks.length === 0) return null;

  const sorted = listTasks.sort((a, b) => {
    const aTime = new Date(a.createdAt || 0);
    const bTime = new Date(b.createdAt || 0);
    return bTime - aTime;
  });

  return sorted[0];
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

    const activeTaskId = window.currentTaskId;
    const task = window.localTaskCache.find(t => t._id === activeTaskId);

    if (task && task.list === listName) {
      setTimeout(() => showPanelForTask(task), 10);
    } else {
      const firstTask = window.localTaskCache.find(t => t.list === listName && !t.deleted);
      if (firstTask) {
        setTimeout(() => {
          showPanelForTask(firstTask);
          window.currentTaskId = firstTask._id;
        }, 10);
      }
    }
  } else {
    rightPanelsContainer.classList.add('hidden');
    window.currentTaskId = null;
  }
}

function showPanelForTask(task) {
  if (task && task._id) {
    window.selectedTaskId = task._id;
  }
  
  if (!task || !task._id || task.deleted) return;

  const rightPanelsContainer = ensureRightPanelContainerExists();
  if (!rightPanelsContainer) return;

  rightPanelsContainer.classList.remove('hidden');

  const listId = task.list.toLowerCase().replace(/\s+/g, '-');
  const panelId = `right-panel-${listId}-${task._id}`;
  let panel = document.getElementById(panelId);

  if (!panel) {
    const fallbackPanelId = `right-panel-${listId}`;
    panel = document.getElementById(fallbackPanelId);
  }

  if (panel) {
    document.querySelectorAll('.task-panel').forEach(p => p.classList.add('hidden'));
    panel.classList.remove('hidden');
    panel.style.display = 'block';
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

      const activeList = window.activeList || 'Personal';
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
    // Use server data from window.localTaskCache instead of localStorage
    if (window.localTaskCache) {
      window.localTaskCache = window.localTaskCache.filter(t => t && !t.deleted);
    } else {
      // Fallback: reload from server if cache is empty
      loadTasksFromServer();
    }
  } catch (e) {
    console.error('Failed to refresh task cache:', e);
    window.localTaskCache = [];
  }
}