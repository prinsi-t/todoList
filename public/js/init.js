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
  console.log('%c🚀 initApp() called', 'color: cyan; font-weight: bold;');

  console.log('%c📝 Session ID:', 'color: gray;', sessionState?.sessionId || 'None');
  console.log('%c🔑 isLoggingInNow:', 'color: gray;', isLoggingInNow);

  const currentList = sessionState?.activeList || 'Personal';
  setActiveList(currentList);
  console.log('%c📌 Active list set to:', 'color: blue;', getActiveList());

  if (isLoggingInNow) {
    console.log('%c🆕 New login detected — resetting selection to default', 'color: orange;');
    sessionState.selectedTaskId = null;
  }

  if (typeof loadTasksFromServer === 'function') {
    console.log('%c🌐 Loading tasks from server...', 'color: deepskyblue;');
    await loadTasksFromServer();
    console.log('%c✅ Tasks loaded from server', 'color: green;');
  } else {
    console.warn('⚠️ loadTasksFromServer function is not defined');
  }

  window.selectionLocked = false;
  console.log('%c🔓 Selection state unlocked', 'color: lime;');

  setEventListeners();
  console.log('%c🎧 Event listeners successfully attached', 'color: lime;');

  const selectedTaskId = getSelectedTaskId();
  console.log('%c🧭 Current list:', 'color: gray;', currentList, '| Selected task ID:', selectedTaskId);

  if (typeof filterTasks === 'function') {
    console.log('%c🔄 Filtering tasks for list:', 'color: magenta;', currentList);
    filterTasks(currentList, true);
  } else {
    console.warn('⚠️ filterTasks function is not defined');
  }

  if (typeof highlightActiveList === 'function') {
    console.log('%c🎯 Highlighting active list in sidebar:', 'color: magenta;', currentList);
    highlightActiveList(currentList);
  } else {
    console.warn('⚠️ highlightActiveList function is not defined');
  }

  // Immediately handle panel and task UI
  let task = null;

  if (selectedTaskId) {
    task = localTaskCache.find(t => t._id === selectedTaskId);
    console.log('%c📌 Found selected task from session:', 'color: steelblue;', task?.title || 'No Title');
  } else if (typeof findMostRecentTask === 'function') {
    task = findMostRecentTask(currentList);
    console.log('%c🕘 No session task — fallback to most recent task:', 'color: steelblue;', task?.title || 'No Title');

    if (task) {
      sessionState.selectedTaskId = task._id;
      window.selectedTaskId = task._id;
      window.currentTaskId = task._id;
      console.log('%c✅ Set selectedTaskId to most recent task:', 'color: green;', task.title);
    }
  }

  if (window.selectionLocked) {
    console.log('%c⏭ Skipping panel setup — selection is already locked', 'color: gray;');
  } else {
    if (typeof createPanelsForAllLists === 'function') {
      console.log('%c🧱 Creating panels for all lists...', 'color: violet;');
      createPanelsForAllLists();
    }

    document.querySelectorAll('.right-panel').forEach(panel => {
      panel.classList.add('hidden');
      panel.style.display = 'none';
    });
    console.log('%c🧼 Hid all existing right panels', 'color: lightgray;');

    if (task) {
      console.log('%c📦 Showing panel for task:', 'color: yellow;', task.title);
      const panel = createPanelForTask(task);

      if (panel) {
        panel.classList.remove('hidden');
        panel.style.display = 'block';
        console.log('%c✅ Panel made visible for:', 'color: green;', task.title);

        if (typeof setSelectedTaskUI === 'function') {
          console.log('%c🧠 Updating task UI for:', 'color: orange;', task.title);
          setSelectedTaskUI(task);
        }

        if (typeof updatePanelBlurUI === 'function') {
          updatePanelBlurUI(task);
        }
      } else {
        console.warn('❌ Could not create panel for:', task.title);
      }
    } else {
      console.warn('%c❌ No task available to show in the panel', 'color: red;');
    }
  }

  if (typeof updateAllTaskCounts === 'function') {
    console.log('%c🔢 Updating task counts', 'color: orange;');
    updateAllTaskCounts();
  }

  if (typeof loadLocalSubtasks === 'function') {
    const subtasksResult = loadLocalSubtasks();
    if (subtasksResult instanceof Promise) await subtasksResult;
    console.log('%c🧩 Subtasks loaded successfully', 'color: limegreen;');
  }

  if (typeof loadNotesForActiveList === 'function') {
    const notesResult = loadNotesForActiveList();
    if (notesResult instanceof Promise) await notesResult;
    console.log('%c📝 Notes loaded for active list', 'color: lightskyblue;');
  }

  console.log('%c✅ initApp() complete', 'color: green; font-weight: bold;');
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