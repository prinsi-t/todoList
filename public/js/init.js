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
  // Get the session ID - this will be unique for each browser session
  const sessionId = localStorage.getItem('sessionId');
  const newSessionId = Math.random().toString(36).substring(2, 15);

  // If there's no session ID, this is a new login
  if (!sessionId) {
    console.log('No session ID found, this is a new login');
    localStorage.setItem('sessionId', newSessionId);
    return true;
  }

  // Check if we have a login flag
  const hasLoggedIn = sessionStorage.getItem('hasLoggedIn');

  if (!hasLoggedIn) {
    console.log('First page load in this session, this is a new login');
    sessionStorage.setItem('hasLoggedIn', 'true');
    return true;
  }

  console.log('User has already logged in this session, not a new login');
  return false;
}

function initApp() {
  // Load tasks from localStorage first
  loadLocalTaskCache();

  // Set up event listeners
  setEventListeners();

  // Check if we're coming from login or register
  const isFromLogin = document.referrer.includes('/login') || document.referrer.includes('/register');

  // If we're coming from login, set active list to Personal
  if (isFromLogin && !localStorage.getItem('activeList')) {
    console.log('Coming from login with no active list, setting to Personal');
    localStorage.setItem('activeList', 'Personal');
  }
  

  // Get the active list from localStorage
  const activeList = localStorage.getItem('activeList') || 'Personal';
  console.log('Active list:', activeList);

  // Load tasks from server (this will also handle selecting the most recent task)
  loadTasksFromServer();

  // If we're coming from login, make sure we show the Personal list
  if (isFromLogin) {
    const currentList = localStorage.getItem('activeList') || 'Personal';
    console.log(`Coming from login, showing list: ${currentList}`);
    setTimeout(() => {
      if (typeof filterTasks === 'function') {
        filterTasks(currentList, false);
      }
  
      if (typeof highlightActiveList === 'function') {
        highlightActiveList(currentList);
      }
  
      if (typeof showPanelForList === 'function') {
        showPanelForList(currentList);
      }
    }, 500);
  }
  

  // Load subtasks and set up file upload
  loadLocalSubtasks();
  setupFileUpload();

  // Load notes for the active list
  if (typeof loadNotesForActiveList === 'function') {
    setTimeout(() => {
      loadNotesForActiveList();
    }, 500); // Delay to ensure panels are created
  }

  // Log the selected task ID for debugging
  console.log('Initial selected task ID:', localStorage.getItem('selectedTaskId'));

  // Make sure all task counts are updated
  if (typeof window.updateAllTaskCounts === 'function') {
    setTimeout(() => {
      window.updateAllTaskCounts();
      console.log('Updated all task counts on initialization');
    }, 800);
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

    const newBtn = completeBtn.cloneNode(true);
    completeBtn.parentNode.replaceChild(newBtn, completeBtn);


    newBtn.addEventListener('click', () => {
      console.log('Mark as Complete button clicked');
      markSelectedTaskComplete();
    });
  } else {
    console.error('❌ Complete button not found');
  }

  // We'll skip adding the event listener here since it's handled in sidebarManager.js
  // This prevents multiple event handlers from being attached to the form
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