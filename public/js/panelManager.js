(function () {
  function hasTasksInList(listName) {
    if (!window.localTaskCache || !Array.isArray(window.localTaskCache)) return false;

    return window.localTaskCache.some(task => task && task.list === listName && !task.deleted);
  }

  function refreshTaskCache() {
    try {
      const cached = localStorage.getItem('taskCache');
      window.localTaskCache = cached ? JSON.parse(cached) : [];

      if (Array.isArray(window.localTaskCache)) {
        window.localTaskCache = window.localTaskCache.filter(task => task && !task.deleted);
      }
    } catch (e) {
      console.error('Failed to refresh task cache', e);
      window.localTaskCache = [];
    }
  }

  function updateRightPanelVisibility(listName) {
    if (!listName) return;
    const rightPanelsContainer = document.getElementById('right-panels-container');
    if (!rightPanelsContainer) return;

    const hasTasks = hasTasksInList(listName);
    const listId = listName.toLowerCase().replace(/\s+/g, '-');
    const containerIdForList = `right-panels-container-${listId}`;
    const listContainer = document.getElementById(containerIdForList);

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
    if (!task || !task.list || !task._id || task.deleted) return;

    const rightPanelsContainer = document.getElementById('right-panels-container');
    if (rightPanelsContainer) {
      rightPanelsContainer.classList.remove('hidden');
    }

    const listId = task.list.toLowerCase().replace(/\s+/g, '-');
    const containerIdForList = `right-panels-container-${listId}`;
    const listContainer = document.getElementById(containerIdForList);

    if (listContainer) {
      listContainer.classList.remove('hidden');
      listContainer.querySelectorAll('.task-panel').forEach(p => p.classList.add('hidden'));
    }

    const uniquePanelId = `right-panel-${listId}-${task._id}`;
    let panel = document.getElementById(uniquePanelId);

    if (!panel && window.createPanelForTask) {
      panel = window.createPanelForTask(task);
    } else if (panel && window.updatePanelWithTask) {
      window.updatePanelWithTask(panel, task);
    }

    if (panel) {
      panel.classList.remove('hidden');
      panel.style.display = 'block';
      window.currentTaskId = task._id;
      localStorage.setItem('activeTaskId', task._id);
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
    const remaining = window.localTaskCache.filter(t => t.list === listName && !t.deleted);
    if (remaining.length === 0) {
      updateRightPanelVisibility(listName);
      return;
    }

    const fallback = remaining[remaining.length - 1];
    if (fallback) {
      setTimeout(() => showPanelForTask(fallback), 10);
    }
  }

  function handleTaskAdded(e) {
    const task = e.detail?.task;
    if (!task) return;

    refreshTaskCache();
    updateRightPanelVisibility(task.list);
    setTimeout(() => showPanelForTask(task), 50);
  }

  function handleListChange(e) {
    const list = e.detail?.list;
    if (!list) return;

    localStorage.setItem('activeList', list);
    refreshTaskCache();
    updateRightPanelVisibility(list);
  }

  function initializePanelVisibility() {
    const activeList = localStorage.getItem('activeList') || 'Personal';
    updateRightPanelVisibility(activeList);
  }

  document.addEventListener('DOMContentLoaded', () => {
    initializePanelVisibility();

    document.addEventListener('taskAdded', handleTaskAdded);
    document.addEventListener('taskDeleted', handleTaskDeleted);
    document.addEventListener('listChanged', handleListChange);
  });

  window.hasTasksInList = hasTasksInList;
  window.refreshTaskCache = refreshTaskCache;
  window.updateRightPanelVisibility = updateRightPanelVisibility;
  window.showPanelForTask = showPanelForTask;
})();

