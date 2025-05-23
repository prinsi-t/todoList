document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

let localTaskCache = [];

function loadLocalTaskCache() {
  try {
    const savedCache = localStorage.getItem('taskCache');
    if (savedCache) {
      localTaskCache = JSON.parse(savedCache);
      console.log(`Loaded ${localTaskCache.length} tasks from localStorage`);
    } else {
      localTaskCache = [];
      console.log('No tasks found in localStorage');
    }
  } catch (error) {
    console.error('Error loading tasks from localStorage:', error);
    localTaskCache = [];
  }
}

// Check if this is a fresh login or a page refresh
function isNewLogin() {
  const sessionId = localStorage.getItem('sessionId');
  const newSessionId = Math.random().toString(36).substring(2, 15);

  if (!sessionId) {
    console.log('No session ID found, this is a new login');
    localStorage.setItem('sessionId', newSessionId);
    return true;
  }

  const hasLoggedIn = sessionStorage.getItem('hasLoggedIn');

  if (!hasLoggedIn) {
    console.log('First page load in this session, this is a new login');
    sessionStorage.setItem('hasLoggedIn', 'true');
    return true;
  }

  console.log('User has already logged in this session, not a new login');
  return false;
}

// Wrap localStorage.setItem to track activeList changes (debugging aid)
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
  if (key === 'activeList') {
    console.log(`[localStorage] activeList being set to: ${value}`, new Error().stack);
  }
  return originalSetItem.apply(this, arguments);
};

// Wrap showPanelForList to track calls (debugging aid)
if (typeof showPanelForList === 'function') {
  const originalShowPanelForList = showPanelForList;
  showPanelForList = function(listName) {
    console.log(`[UI] showPanelForList called with: "${listName}"`, new Error().stack);
    return originalShowPanelForList.call(this, listName);
  };
}

async function initApp() {
  loadLocalTaskCache();
  setEventListeners();

  const isLoggingInNow = isNewLogin();

  if (isLoggingInNow) {
    console.log('Fresh login detected — forcing activeList to Personal and clearing selectedTaskId');
    localStorage.setItem('activeList', 'Personal');
    localStorage.removeItem('selectedTaskId');
  }

  // Load tasks from server
  await loadTasksFromServer();

  // Load subtasks and notes (await if these are async)
  if (typeof loadLocalSubtasks === 'function') {
    // If loadLocalSubtasks is async, await it; else just call
    const subtasksResult = loadLocalSubtasks();
    if (subtasksResult instanceof Promise) await subtasksResult;
  }

  setupFileUpload();

  if (typeof loadNotesForActiveList === 'function') {
    const notesResult = loadNotesForActiveList();
    if (notesResult instanceof Promise) await notesResult;
  }

  // After all loading is done, enforce activeList again from localStorage
  const currentList = localStorage.getItem('activeList') || 'Personal';
  console.log('Final activeList after all loads:', currentList);

  // Update UI with currentList
  if (typeof filterTasks === 'function') filterTasks(currentList, false);
  if (typeof highlightActiveList === 'function') highlightActiveList(currentList);
  if (typeof showPanelForList === 'function') showPanelForList(currentList);

  console.log('Initial selected task ID:', localStorage.getItem('selectedTaskId'));

  if (typeof window.updateAllTaskCounts === 'function') {
    window.updateAllTaskCounts();
    console.log('Updated all task counts on initialization');
  }
}

function saveTaskCacheToLocalStorage() {
  try {
    localStorage.setItem('taskCache', JSON.stringify(localTaskCache));
    console.log(`Task cache saved to localStorage: ${localTaskCache.length} tasks`);
  } catch (error) {
    console.error('Error saving task cache to localStorage:', error);
  }
}

function setEventListeners() {
  console.log('Setting up event listeners');

  const completeBtn = document.getElementById('complete-btn');
  if (completeBtn) {
    // Remove old listeners by replacing the node
    const newBtn = completeBtn.cloneNode(true);
    completeBtn.parentNode.replaceChild(newBtn, completeBtn);

    newBtn.addEventListener('click', () => {
      console.log('Mark as Complete button clicked');
      markSelectedTaskComplete();
    });
  } else {
    console.error('❌ Complete button not found');
  }

  // Skip addTaskForm event listener here as handled elsewhere
  console.log('Skipping addTaskForm event listener in init.js - handled by sidebarManager.js');

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
}
