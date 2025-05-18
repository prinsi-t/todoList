function updateRightPanelVisibility(listName) {
    if (!listName) return;
    
    const rightPanelsContainer = document.getElementById('right-panels-container');
    if (!rightPanelsContainer) {
      console.error('Right panels container not found');
      return;
    }
    
    const hasAnyTasks = hasTasksInList(listName);
    console.log(`Checking visibility for ${listName}: has tasks = ${hasAnyTasks}`);
    
    document.querySelectorAll('[id^="right-panels-container-"]').forEach(container => {
      container.classList.add('hidden');
    });
    
    const listId = listName.toLowerCase().replace(/\s+/g, '-');
    const containerIdForList = `right-panels-container-${listId}`;
    const listContainer = document.getElementById(containerIdForList);
    
    if (listContainer) {
      listContainer.classList.remove('hidden');
    }
    
    const activeTaskId = localStorage.getItem('activeTaskId');
    const hasActiveTask = activeTaskId && window.localTaskCache.some(task => task._id === activeTaskId);
    
    if (hasAnyTasks || hasActiveTask) {
      rightPanelsContainer.classList.remove('hidden');
      
      if (hasActiveTask) {
        const task = window.localTaskCache.find(task => task._id === activeTaskId);
        if (task) {
          setTimeout(() => showPanelForTask(task), 0);
        }
      }
    } else {
      rightPanelsContainer.classList.add('hidden');
      window.currentTaskId = null;
      localStorage.removeItem('activeTaskId');
    }
  }
  
  function enhancedListChangeHandler(e) {
    if (e.detail && e.detail.list) {
      const listName = e.detail.list;
      console.log('List changed event detected, updating panel visibility');
      
      const activeTaskId = localStorage.getItem('activeTaskId');
      const activeTask = activeTaskId ? window.localTaskCache.find(task => task._id === activeTaskId) : null;
      
      updateRightPanelVisibility(listName);
  
      if (activeTask && activeTask.list !== listName) {
        const firstTaskInList = window.localTaskCache.find(task => 
          task.list === listName && !task.deleted
        );
        
        if (firstTaskInList) {
          setTimeout(() => showPanelForTask(firstTaskInList), 0);
        }
      }
    }
  }
  
  function installRightPanelPersistencePatch() {
    console.log('Installing right panel persistence patch...');
    
    window.updateRightPanelVisibility = updateRightPanelVisibility;
    
    const oldListeners = getEventListeners(document);
    if (oldListeners && oldListeners.listChanged) {
      oldListeners.listChanged.forEach(listener => {
        document.removeEventListener('listChanged', listener.listener);
      });
    }
    
    document.addEventListener('listChanged', enhancedListChangeHandler);
    
    const originalShowPanelForTask = window.showPanelForTask;
    window.showPanelForTask = function(task) {
      if (!task || !task.list || !task._id) {
        console.error('Invalid task provided to showPanelForTask');
        return;
      }
      
      const rightPanelsContainer = document.getElementById('right-panels-container');
      if (rightPanelsContainer) {
        rightPanelsContainer.classList.remove('hidden');
      }
      
      return originalShowPanelForTask(task);
    };
    
    console.log('Right panel persistence patch installed successfully');
  }
  
  function getEventListeners(element) {
    if (window.getEventListeners) {
      return window.getEventListeners(element);
    }
    return null;
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installRightPanelPersistencePatch);
  } else {
    installRightPanelPersistencePatch();
  }