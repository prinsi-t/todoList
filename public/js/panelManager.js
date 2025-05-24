// panelManager.js (final production-safe patch with restored logic)
(function () {
  function ensureRightPanelContainerExists() {
    let container = document.getElementById('right-panels-container');
    if (!container) {
      const mainContent = document.querySelector('main') || document.querySelector('.main-content') || document.body;
      if (mainContent) {
        container = document.createElement('div');
        container.id = 'right-panels-container';
        container.className = 'flex-1 bg-dark-accent rounded-lg p-6 h-full';
        container.classList.add('hidden');
        mainContent.appendChild(container);
        console.log('✅ [panelManager] Created missing right-panels-container');
      } else {
        console.warn('⚠️ [panelManager] Could not find container to attach right-panels-container');
        return null;
      }
    }
    return container;
  }

  function updateRightPanelVisibility(listName) {
    const rightPanelsContainer = ensureRightPanelContainerExists();
    if (!rightPanelsContainer || !listName) return;

    const hasTasks = window.localTaskCache?.some(t => t.list === listName && !t.deleted);
    const listId = listName.toLowerCase().replace(/\s+/g, '-');
    const containerIdForList = `right-panels-container-${listId}`;
    const listContainer = document.getElementById(containerIdForList);

    // Hide all list containers
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
    if (!task || !task._id || task.deleted) return;

    const rightPanelsContainer = ensureRightPanelContainerExists();
    if (!rightPanelsContainer) return;

    rightPanelsContainer.classList.remove('hidden');

    const listId = task.list.toLowerCase().replace(/\s+/g, '-');
    const panelId = `right-panel-${listId}-${task._id}`;
    let panel = document.getElementById(panelId);

    if (!panel && typeof window.createPanelForTask === 'function') {
      panel = window.createPanelForTask(task);
    }

    if (panel) {
      document.querySelectorAll('.task-panel').forEach(p => p.classList.add('hidden'));
      panel.classList.remove('hidden');
      panel.style.display = 'block';
      localStorage.setItem('activeTaskId', task._id);
      window.currentTaskId = task._id;
    } else {
      console.warn(`⚠️ [panelManager] Could not find or create panel for task ID: ${task._id}`);
    }
  }

  function handleTaskDeleted(e) {
    const taskId = e.detail?.taskId;
    const listName = e.detail?.list;
    if (!taskId || !listName) return;
  
    const listId = listName.toLowerCase().replace(/\s+/g, '-');
    const panelId = `right-panel-${listId}-${taskId}`;
    const panel = document.getElementById(panelId);
    if (panel) panel.remove();
  
    refreshTaskCache();
  
    const remaining = window.localTaskCache?.filter(t => t.list === listName && !t.deleted);
    const listContainer = document.getElementById(`right-panels-container-${listId}`);
  
    if (!remaining || remaining.length === 0) {
      if (listContainer) listContainer.classList.add('hidden');
      updateRightPanelVisibility(listName);
    } else {
      const fallback = remaining[remaining.length - 1];
      if (fallback) setTimeout(() => showPanelForTask(fallback), 10);
    }
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('taskAdded', handleTaskAdded);
    document.addEventListener('taskDeleted', handleTaskDeleted);

    const activeList = localStorage.getItem('activeList') || 'Personal';
    updateRightPanelVisibility(activeList);
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
})();
