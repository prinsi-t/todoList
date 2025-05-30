document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

let localTaskCache = [];

function loadLocalTaskCache() {
  try {
    const savedCache = localStorage.getItem('taskCache');
    if (savedCache) {
      localTaskCache = JSON.parse(savedCache);
   //   console.log(`Loaded ${localTaskCache.length} tasks from localStorage`);
    } else {
      localTaskCache = [];
   //   console.log('No tasks found in localStorage');
    }
  } catch (error) {
    console.error('Error loading tasks from localStorage:', error);
    localTaskCache = [];
  }
}

function isNewLogin() {
  const sessionId = localStorage.getItem('sessionId');
  const newSessionId = Math.random().toString(36).substring(2, 15);

  if (!sessionId) {
  //  console.log('No session ID found, this is a new login');
    localStorage.setItem('sessionId', newSessionId);
    return true;
  }

  const hasLoggedIn = sessionStorage.getItem('hasLoggedIn');

  if (!hasLoggedIn) {
   // console.log('First page load in this session, this is a new login');
    sessionStorage.setItem('hasLoggedIn', 'true');
    return true;
  }

//  console.log('User has already logged in this session, not a new login');
  return false;
}

const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
  if (key === 'activeList') {
  //  console.log(`[localStorage] activeList being set to: ${value}`, new Error().stack);
  }
  return originalSetItem.apply(this, arguments);
};

function wrapShowPanelForListOnceDefined() {
  const maxRetries = 10;
  let retries = 0;

  const interval = setInterval(() => {
    if (typeof showPanelForList === 'function') {
      const original = showPanelForList;
      showPanelForList = function (listName) {
        //console.log(`[UI] showPanelForList called with: "${listName}"`, new Error().stack);
      
        const listId = listName.toLowerCase().replace(/\s+/g, '-');
        const panelId = `right-panel-${listId}`;
        const panel = document.getElementById(panelId);
        const rightPanelsContainer = document.getElementById('right-panels-container');
      
        if (rightPanelsContainer && panel) {
          const recentTask = findMostRecentTask(listName);
      
          if (recentTask) {
            rightPanelsContainer.classList.remove('hidden');
            panel.classList.remove('hidden');
           // console.log(`✅ Showing panel for list: ${listName}`);
      
            setSelectedTaskUI(recentTask);
            if (typeof showPanelForTask === 'function') {
              showPanelForTask(recentTask);
            }
          } else {
            // Hide panel and container if no tasks in the list
            panel.classList.add('hidden');
            rightPanelsContainer.classList.add('hidden');
            console.warn(`No task found to show in panel for list: ${listName} - hiding panel`);
          }
        } else {
          console.warn(`[UI] Cannot show panel for list: ${listName} — panel or container missing`);
        }
      
        return original.call(this, listName);
      };
      
      clearInterval(interval);
    } else if (++retries >= maxRetries) {
      clearInterval(interval);
      console.warn('showPanelForList not defined after waiting, skipping wrap');
    }
  }, 200);
}

wrapShowPanelForListOnceDefined();

window.createPanelForTask = function (task) {
  if (!task || !task._id || !task.list) return null;

  const listId = task.list.toLowerCase().replace(/\s+/g, '-');
  const uniquePanelId = `right-panel-${listId}-${task._id}`;

  // Prevent duplicates
  if (document.getElementById(uniquePanelId)) return;

  // Try to get base list panel to clone from
  let basePanel = document.getElementById(`right-panel-${listId}`);

  // If it doesn't exist, create a base list panel first
  if (!basePanel && typeof createPanelForList === 'function') {
    createPanelForList(task.list);
    basePanel = document.getElementById(`right-panel-${listId}`);
  }

  if (!basePanel) {
    console.warn(`No base panel found for list: ${task.list}`);
    return;
  }

  const panel = basePanel.cloneNode(true);
  panel.id = uniquePanelId;
  panel.classList.add('right-panel', 'task-panel');
  panel.classList.remove('hidden');
  panel.style.display = 'block';

  const titleEl = panel.querySelector('h2');
  if (titleEl) titleEl.textContent = task.title;

  const completeBtn = panel.querySelector('.complete-btn');
  if (completeBtn) {
    completeBtn.setAttribute('onclick', `markSelectedTaskComplete('${task.list}')`);
    completeBtn.setAttribute('data-list', task.list);
  }

  const container = document.getElementById('right-panels-container');
  if (container) container.appendChild(panel);

  return panel;
};



async function initApp() {
  loadLocalTaskCache();
  setEventListeners();

  const isLoggingInNow = isNewLogin();

  if (isLoggingInNow) {
   // console.log('Fresh login detected — forcing activeList to Personal and clearing selectedTaskId');
    localStorage.setItem('activeList', 'Personal');
    localStorage.removeItem('selectedTaskId');
  }

  await loadTasksFromServer();

  if (typeof loadLocalSubtasks === 'function') {
    const subtasksResult = loadLocalSubtasks();
    if (subtasksResult instanceof Promise) await subtasksResult;
  }

  setupFileUpload();

  if (typeof loadNotesForActiveList === 'function') {
    const notesResult = loadNotesForActiveList();
    if (notesResult instanceof Promise) await notesResult;
  }

  const currentList = localStorage.getItem('activeList') || 'Personal';
  //console.log('Final activeList after all loads:', currentList);

  if (typeof filterTasks === 'function') filterTasks(currentList, false);
  if (typeof highlightActiveList === 'function') highlightActiveList(currentList);
  if (typeof showPanelForList === 'function') showPanelForList(currentList);

 // console.log('Initial selected task ID:', localStorage.getItem('selectedTaskId'));

  if (typeof window.updateAllTaskCounts === 'function') {
    window.updateAllTaskCounts();
    //console.log('Updated all task counts on initialization');
  }
}

function saveTaskCacheToLocalStorage() {
  try {
    localStorage.setItem('taskCache', JSON.stringify(localTaskCache));
  } catch (error) {
    console.error('Error saving task cache to localStorage:', error);
  }
}

function setEventListeners() {
 // console.log('Setting up event listeners');

  const completeBtn = document.getElementById('complete-btn');
  if (completeBtn) {
    const newBtn = completeBtn.cloneNode(true);
    completeBtn.parentNode.replaceChild(newBtn, completeBtn);

    newBtn.addEventListener('click', () => {
      //console.log('Mark as Complete button clicked');
      markSelectedTaskComplete();
    });
  } else {
    console.error('❌ Complete button not found');
  }

  //console.log('Skipping addTaskForm event listener in init.js - handled by sidebarManager.js');

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