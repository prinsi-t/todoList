// Backend-only init.js - All localStorage removed

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

// In-memory cache for tasks (synced with server)
let localTaskCache = [];

let sessionState = {
  sessionId: null,
  hasLoggedIn: false,
  activeList: null,
  selectedTaskId: null
};
function isNewLogin() {
  if (!sessionStorage.getItem('hasLoggedIn')) {
    sessionStorage.setItem('hasLoggedIn', 'true');
    console.log('🆕 [isNewLogin] TRUE — first login');
    return true;
  }
  console.log('🔁 [isNewLogin] FALSE — just a refresh');
  return false;
}
// ✅ Run this FIRST — before touching localStorage
const isLoggingInNow = isNewLogin();

if (isLoggingInNow) {
  // 🆕 On login → force Personal
  sessionState.activeList = 'Personal';
  window.activeList = 'Personal';
  localStorage.setItem('activeList', 'Personal');
  console.log('🆕 [Login] Forced activeList = Personal');
} else {
  // 🔁 On refresh → restore previous list
  const saved = localStorage.getItem('activeList');
  if (saved) {
    sessionState.activeList = saved;
    window.activeList = saved;
    console.log('🌅 [Refresh] Restored activeList =', saved);
  }
}




function generateSessionId() {
  return Math.random().toString(36).substring(2, 15);
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
  console.log('🚀 initApp() called');

  console.log('📝 Session ID:', sessionState?.sessionId || 'None');
  console.log('🔑 isLoggingInNow:', isLoggingInNow);

  // Safely determine and set the active list
  const currentList = sessionState?.activeList || 'Personal';
  setActiveList(currentList);
  console.log('📌 Active list set to:', getActiveList());

  if (isLoggingInNow) {
    console.log('🆕 New login detected — resetting selection to default');
    sessionState.selectedTaskId = null; // Reset selection on new login
  }

  if (typeof loadTasksFromServer === 'function') {
    console.log('🌐 Loading tasks from server...');
    await loadTasksFromServer();
  } else {
    console.warn('⚠️ loadTasksFromServer function is not defined');
  }

  window.selectionLocked = false;
  console.log('🔓 Selection state unlocked');

  setEventListeners();
  console.log('🎧 Event listeners successfully attached');

  const selectedTaskId = getSelectedTaskId();
  console.log('🧭 Current list:', currentList, '| Selected task ID:', selectedTaskId);

  if (typeof filterTasks === 'function') {
    console.log('🔄 Filtering tasks for:', currentList);
    filterTasks(currentList, true);
  } else {
    console.warn('⚠️ filterTasks function is not defined');
  }

  if (typeof highlightActiveList === 'function') {
    console.log('🎯 Highlighting active list in sidebar:', currentList);
    highlightActiveList(currentList);
  } else {
    console.warn('⚠️ highlightActiveList function is not defined');
  }

  // Handle panels and tasks
  setTimeout(() => {
    let task = null;

    if (selectedTaskId) {
      task = localTaskCache.find(t => t._id === selectedTaskId);
      console.log('📌 Found selected task from session:', task?.title || 'No Title');
    } else if (typeof findMostRecentTask === 'function') {
      task = findMostRecentTask(currentList);
      console.log('🕘 No session task — fallback to most recent task:', task?.title || 'No Title');
    }

    if (window.selectionLocked) {
      console.log('⏭ Skipping panel setup — selection is already locked');
      return;
    }

    if (typeof createPanelsForAllLists === 'function') {
      console.log('🧱 Creating panels for all lists');
      createPanelsForAllLists();
    }

    document.querySelectorAll('.right-panel').forEach(panel => {
      panel.classList.add('hidden');
      panel.style.display = 'none';
    });
    console.log('🧼 Hid all existing right panels');

    if (task) {
      console.log('📦 Showing panel for task:', task.title);
      const panel = createPanelForTask(task);

      if (panel) {
        panel.classList.remove('hidden');
        panel.style.display = 'block';
        console.log('✅ Panel made visible for:', task.title);

        setTimeout(() => {
          console.log('🧠 Updating task UI for:', task.title);
          if (typeof setSelectedTaskUI === 'function') setSelectedTaskUI(task);
          if (typeof updatePanelBlurUI === 'function') updatePanelBlurUI(task);
        }, 200);
      } else {
        console.warn('❌ Could not create panel for:', task.title);
      }
    } else {
      console.warn('❌ No task available to show in the panel');
    }
  }, 100);

  // Update task counts
  if (typeof updateAllTaskCounts === 'function') {
    console.log('🔢 Updating task counts');
    updateAllTaskCounts();
  }

  // Load subtasks
  if (typeof loadLocalSubtasks === 'function') {
    const subtasksResult = loadLocalSubtasks();
    if (subtasksResult instanceof Promise) await subtasksResult;
    console.log('🧩 Subtasks loaded successfully');
  }

  // Load notes
  if (typeof loadNotesForActiveList === 'function') {
    const notesResult = loadNotesForActiveList();
    if (notesResult instanceof Promise) await notesResult;
    console.log('📝 Notes loaded for active list');
  }

  console.log('✅ initApp() complete');
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
