
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

let localTaskCache = [];

function loadLocalTaskCache() {
  try {
    const savedCache = localStorage.getItem('taskCache');
    localTaskCache = savedCache ? JSON.parse(savedCache) : [];
  } catch (error) {
    console.error('Error loading tasks from localStorage:', error);
    localTaskCache = [];
  }
}

function isNewLogin() {
  const sessionId = localStorage.getItem('sessionId');
  const newSessionId = Math.random().toString(36).substring(2, 15);

  if (!sessionId) {
    localStorage.setItem('sessionId', newSessionId);
    return true;
  }

  const hasLoggedIn = sessionStorage.getItem('hasLoggedIn');
  if (!hasLoggedIn) {
    sessionStorage.setItem('hasLoggedIn', 'true');
    return true;
  }

  return false;
}

const originalSetItem = localStorage.setItem;
localStorage.setItem = function (key, value) {
  return originalSetItem.apply(this, arguments);
};

function wrapShowPanelForListOnceDefined() {
  const maxRetries = 10;
  let retries = 0;

  const interval = setInterval(() => {
    if (typeof showPanelForList === 'function') {
      const original = showPanelForList;

      showPanelForList = function (listName, selectedTaskId = null) {
        const listId = listName.toLowerCase().replace(/\s+/g, '-');
        const panelId = `right-panel-${listId}`;
        const panel = document.getElementById(panelId);
        const rightPanelsContainer = document.getElementById('right-panels-container');

        if (!panel || !rightPanelsContainer) {
          return original.call(this, listName, selectedTaskId);
        }

        const allPanels = document.querySelectorAll('.right-panel');
        allPanels.forEach(p => {
          p.classList.add('hidden');
          p.style.display = 'none';
        });

        let task = null;

        if (selectedTaskId) {
          task = window.localTaskCache?.find(t => t._id === selectedTaskId);
          if (!task) {
            console.warn(`⏳ Waiting for selected task (${selectedTaskId}) to load...`);
            setTimeout(() => showPanelForList(listName, selectedTaskId), 100);
            return;
          }
        }

        if (!task && typeof findMostRecentTask === 'function') {
          task = findMostRecentTask(listName);
        }

        if (task && task.list === listName) {
          rightPanelsContainer.classList.remove('hidden');
          rightPanelsContainer.style.display = 'block';
          panel.classList.remove('hidden');
          panel.style.display = 'block';

          if (typeof setSelectedTaskUI === 'function') {
            setSelectedTaskUI(task);
          }

          if (typeof showPanelForTask === 'function') {
            showPanelForTask(task);
          }

          if (typeof updatePanelBlurUI === 'function') {
            setTimeout(() => updatePanelBlurUI(task), 100);
          }

          localStorage.setItem('selectedTaskId', task._id);
          window.currentTaskId = task._id;
          window.selectionLocked = true;

          // ✅ Ensure highlight is applied
          requestAnimationFrame(() => {
            const taskElements = document.querySelectorAll('.task-item');
            taskElements.forEach(el => {
              el.classList.remove('selected', 'bg-dark-hover');
              if (el.dataset.taskId === task._id) {
                el.classList.add('selected', 'bg-dark-hover');
              }
            });
          });
  // ✅ UNLOCK SELECTION AFTER PANEL SHOWN
  setTimeout(() => {
    window.selectionLocked = false;
  }, 100);
          return;
        }

        // fallback
        return original.call(this, listName, selectedTaskId);
      };

      clearInterval(interval);
    } else if (++retries >= maxRetries) {
      clearInterval(interval);
    }
  }, 200);
}





wrapShowPanelForListOnceDefined();

window.createPanelForTask = function (task) {
  if (!task || !task._id || !task.list) return null;

  const listId = task.list.toLowerCase().replace(/\s+/g, '-');
  const uniquePanelId = `right-panel-${listId}-${task._id}`;
  if (document.getElementById(uniquePanelId)) return;

  let basePanel = document.getElementById(`right-panel-${listId}`);
  if (!basePanel && typeof createPanelForList === 'function') {
    createPanelForList(task.list);
    basePanel = document.getElementById(`right-panel-${listId}`);
  }

  if (!basePanel) return;

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
  if (container) {
    container.classList.remove('hidden');
    container.appendChild(panel);
  }

  return panel;
};

async function initApp() {
  loadLocalTaskCache();
  
  // 🔄 Sync completed states from taskCache to localTaskCache
const cached = localStorage.getItem('taskCache');
if (cached) {
  const fromStorage = JSON.parse(cached);
  for (let storedTask of fromStorage) {
    const i = localTaskCache.findIndex(t => t._id === storedTask._id);
    if (i !== -1) {
      localTaskCache[i].completed = storedTask.completed; // ✅ force sync
    }
  }
}

  window.selectionLocked = false;
// 🧪 Log what's going on
const selectedId = localStorage.getItem('selectedTaskId');
console.log('🆔 Selected Task ID:', selectedId);
console.log('🧠 TaskCache from localStorage:', localStorage.getItem('taskCache'));
console.log('🧩 localTaskCache in memory:', localTaskCache);
  setEventListeners();

  const isLoggingInNow = isNewLogin();
  if (isLoggingInNow) {
    localStorage.setItem('activeList', 'Personal');
    localStorage.removeItem('selectedTaskId');
  }

  await loadTasksFromServer();

  if (typeof loadLocalSubtasks === 'function') {
    const subtasksResult = loadLocalSubtasks();
    if (subtasksResult instanceof Promise) await subtasksResult;
  }

  if (typeof loadNotesForActiveList === 'function') {
    const notesResult = loadNotesForActiveList();
    if (notesResult instanceof Promise) await notesResult;
  }

  const currentList = localStorage.getItem('activeList') || 'Personal';

  if (typeof filterTasks === 'function') {
    filterTasks(currentList, true);
  }

  if (typeof highlightActiveList === 'function') {
    highlightActiveList(currentList);
  }

  const selectedTaskId = localStorage.getItem('selectedTaskId');

  setTimeout(() => {
    if (typeof showPanelForList === 'function') {
      showPanelForList(currentList, selectedTaskId);
    }
  }, 100);

  if (typeof window.updateAllTaskCounts === 'function') {
    window.updateAllTaskCounts();
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

    const taskId = localStorage.getItem('selectedTaskId');
    const task = localTaskCache.find(t => t._id === taskId);
    if (!task) return;

    console.log(`✅ Complete clicked for ${task.title} in list ${task.list}`);
    toggleBlurFromCompleteBtn();
  });
}
