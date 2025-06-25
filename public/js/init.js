// Backend-only init.js - All localStorage removed

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

// In-memory cache for tasks (synced with server)
let localTaskCache = [];

// Session state variables (in-memory only)
let sessionState = {
  sessionId: null,
  hasLoggedIn: false,
  activeList: 'Personal',
  selectedTaskId: null
};

function generateSessionId() {
  return Math.random().toString(36).substring(2, 15);
}

function isNewLogin() {
  if (!sessionState.sessionId) {
    sessionState.sessionId = generateSessionId();
    return true;
  }
  if (!sessionState.hasLoggedIn) {
    sessionState.hasLoggedIn = true;
    return true;
  }
  return false;
}

window.createPanelForTask = function (task) {
  if (!task || !task._id || !task.list) return null;

  const listId = task.list.toLowerCase().replace(/\s+/g, '-');
  const panelId = `right-panel-${listId}-${task._id}`;

  const existing = document.getElementById(panelId);
  if (existing) return existing;

  // ✅ Always use 'right-panel-personal' as the universal template
  const base = document.querySelector(`#right-panel-personal[data-template="true"]`);
  if (!base) {
    console.warn(`❗ Base template panel not found (right-panel-personal)`);
    return null;
  }

  const panel = base.cloneNode(true);
  panel.id = panelId;
  panel.classList.add('task-panel');
  panel.classList.remove('hidden');
  panel.removeAttribute('data-template');
  panel.setAttribute('data-current-task-id', task._id);
  panel.dataset.list = task.list;

  const titleEl = panel.querySelector('.panel-task-title');
  if (titleEl) titleEl.textContent = task.title;

  const labelEl = panel.querySelector('.text-sm.text-gray-400');
  if (labelEl) labelEl.textContent = task.list;

  const notesEl = panel.querySelector('.notes-textarea');
  if (notesEl) notesEl.value = task.notes || '';

  const subtasksList = panel.querySelector('.subtasks-list');
  if (Array.isArray(task.subtasks) && subtasksList && typeof renderSubtasksForPanel === 'function') {
    renderSubtasksForPanel(subtasksList, task.subtasks);
  }

  const completeBtn = panel.querySelector('.complete-btn');
  if (completeBtn) {
    completeBtn.textContent = task.completed ? 'Mark as Incomplete' : 'Mark as Complete';
    completeBtn.className = task.completed
      ? 'complete-btn bg-green-500 text-white px-4 py-2 rounded-md'
      : 'complete-btn bg-blue-500 text-white px-4 py-2 rounded-md';
  }

  const blur = panel.querySelector('.task-blur-content');
  if (blur) {
    blur.classList.remove('blurred');
    blur.style.cssText = 'filter: none !important; pointer-events: auto;';
  }

  const dropZone = panel.querySelector('.drop-zone');
  if (dropZone) dropZone.dataset.list = task.list;

  const container = document.getElementById('right-panels-container');
  if (container) container.appendChild(panel);

  return panel;
};






async function initApp() {
  const isLoggingInNow = isNewLogin();

  if (isLoggingInNow) {
    console.log('🔄 New login detected: resetting cache and state');
    sessionState.activeList = 'Personal';
    sessionState.selectedTaskId = null;
  }

  if (typeof loadTasksFromServer === 'function') {
    await loadTasksFromServer();
  }

  window.selectionLocked = false;
  setEventListeners();

  const currentList = sessionState.activeList || 'Personal';
  setActiveList(currentList); // updates both sessionState and window

  if (typeof filterTasks === 'function') {
    filterTasks(currentList, true);
  }

  if (typeof highlightActiveList === 'function') {
    highlightActiveList(currentList);
  }

  const selectedTaskId = sessionState.selectedTaskId;

  setTimeout(() => {
    let task = null;
    if (selectedTaskId) {
      task = localTaskCache.find(t => t._id === selectedTaskId);
    } else if (typeof findMostRecentTask === 'function') {
      task = findMostRecentTask(currentList);
    }
    // ✅ Skip second filterTasks if already locked
if (window.selectionLocked) {
  console.log('⏭ Skipping panel+task setup in initApp — already locked');
  return;
}


    if (typeof createPanelsForAllLists === 'function') {
      createPanelsForAllLists();
    }

    document.querySelectorAll('.right-panel').forEach(p => {
      p.classList.add('hidden');
      p.style.display = 'none';
    });

    if (task) {
      const panel = createPanelForTask(task);
      if (panel) {
        panel.classList.remove('hidden');
        panel.style.display = 'block';

        // ✅ Delay highlight to ensure .task-item DOM is rendered
        setTimeout(() => {
          console.log('🕒 Delayed setSelectedTaskUI for:', task.title);
          if (typeof setSelectedTaskUI === 'function') {
            setSelectedTaskUI(task);
          }
          if (typeof updatePanelBlurUI === 'function') {
            updatePanelBlurUI(task);
          }
        }, 200);
      }
    } else {
      console.warn('❌ No task available to show panel for.');
    }
  }, 100);

  if (typeof updateAllTaskCounts === 'function') {
    updateAllTaskCounts();
  }

  if (typeof loadLocalSubtasks === 'function') {
    const subtasksResult = loadLocalSubtasks();
    if (subtasksResult instanceof Promise) await subtasksResult;
  }

  if (typeof loadNotesForActiveList === 'function') {
    const notesResult = loadNotesForActiveList();
    if (notesResult instanceof Promise) await notesResult;
  }
}



function setEventListeners() {
  const addSubtaskBtn = document.getElementById('addSubtaskBtn');
  const subtaskInput = document.getElementById('subtaskInput');

  if (addSubtaskBtn) {
    addSubtaskBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof window.addSubtask === 'function') {
        window.addSubtask();
      }
    });
  }

  if (subtaskInput) {
    subtaskInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (typeof window.addSubtask === 'function') {
          window.addSubtask();
        }
      }
    });
  }

  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.complete-btn');
    if (!btn) return;
    const taskId = sessionState.selectedTaskId;
    const task = localTaskCache.find(t => t._id === taskId);
    if (!task) return;
    console.log(`✅ Complete clicked for ${task.title} in list ${task.list}`);
    if (typeof toggleBlurFromCompleteBtn === 'function') {
      toggleBlurFromCompleteBtn();
    }
  });
}

function setActiveList(listName) {
  sessionState.activeList = listName;
  window.activeList = listName;
}

function getActiveList() {
  return sessionState.activeList || window.activeList || 'Personal';
}

function setSelectedTaskId(taskId) {
  sessionState.selectedTaskId = taskId;
  window.selectedTaskId = taskId;
  window.currentTaskId = taskId;
}

function getSelectedTaskId() {
  return sessionState.selectedTaskId || window.selectedTaskId;
}

window.setActiveList = setActiveList;
window.getActiveList = getActiveList;
window.setSelectedTaskId = setSelectedTaskId;
window.getSelectedTaskId = getSelectedTaskId;

Object.defineProperty(window, 'activeList', {
  get() { return sessionState.activeList; },
  set(value) { sessionState.activeList = value; }
});

Object.defineProperty(window, 'selectedTaskId', {
  get() { return sessionState.selectedTaskId; },
  set(value) { sessionState.selectedTaskId = value; }
});

Object.defineProperty(window, 'localTaskCache', {
  get() { return localTaskCache; },
  set(value) { localTaskCache = value; }
});
