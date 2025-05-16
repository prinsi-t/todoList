// Right Panel Persistence Fix
// This patch ensures the right panel stays visible when switching between lists

// 1. Modified updateRightPanelVisibility function to preserve panel state
function updateRightPanelVisibility(listName) {
    if (!listName) return;
    
    const rightPanelsContainer = document.getElementById('right-panels-container');
    if (!rightPanelsContainer) {
      console.error('Right panels container not found');
      return;
    }
    
    const hasAnyTasks = hasTasksInList(listName);
    console.log(`Checking visibility for ${listName}: has tasks = ${hasAnyTasks}`);
    
    // Hide all list-specific containers first
    document.querySelectorAll('[id^="right-panels-container-"]').forEach(container => {
      container.classList.add('hidden');
    });
    
    // Show the container for the current list if it exists
    const listId = listName.toLowerCase().replace(/\s+/g, '-');
    const containerIdForList = `right-panels-container-${listId}`;
    const listContainer = document.getElementById(containerIdForList);
    
    if (listContainer) {
      listContainer.classList.remove('hidden');
    }
    
    // Only hide the main panel container if there are no tasks across all lists
    // This is the key change - we don't hide the right panel when switching lists
    const activeTaskId = localStorage.getItem('activeTaskId');
    const hasActiveTask = activeTaskId && window.localTaskCache.some(task => task._id === activeTaskId);
    
    if (hasAnyTasks || hasActiveTask) {
      rightPanelsContainer.classList.remove('hidden');
      
      // If we have an active task, make sure it's displayed
      if (hasActiveTask) {
        const task = window.localTaskCache.find(task => task._id === activeTaskId);
        if (task) {
          setTimeout(() => showPanelForTask(task), 0);
        }
      }
    } else {
      // Only hide if there are truly no tasks at all
      rightPanelsContainer.classList.add('hidden');
      window.currentTaskId = null;
      localStorage.removeItem('activeTaskId');
    }
  }
  
  // 2. Enhanced list change handler
  function enhancedListChangeHandler(e) {
    if (e.detail && e.detail.list) {
      const listName = e.detail.list;
      console.log('List changed event detected, updating panel visibility');
      
      // Get the current active task before updating visibility
      const activeTaskId = localStorage.getItem('activeTaskId');
      const activeTask = activeTaskId ? window.localTaskCache.find(task => task._id === activeTaskId) : null;
      
      // Update panel visibility for the new list
      updateRightPanelVisibility(listName);
      
      // If we have an active task and it belongs to another list, switch to showing a task from this list
      if (activeTask && activeTask.list !== listName) {
        // Find the first task in the current list
        const firstTaskInList = window.localTaskCache.find(task => 
          task.list === listName && !task.deleted
        );
        
        if (firstTaskInList) {
          // Show this task's panel instead
          setTimeout(() => showPanelForTask(firstTaskInList), 0);
        }
      }
    }
  }
  
  // 3. Install the patch
  function installRightPanelPersistencePatch() {
    console.log('Installing right panel persistence patch...');
    
    // Replace the original updateRightPanelVisibility function
    window.updateRightPanelVisibility = updateRightPanelVisibility;
    
    // Remove any existing listChanged event listeners
    const oldListeners = getEventListeners(document);
    if (oldListeners && oldListeners.listChanged) {
      oldListeners.listChanged.forEach(listener => {
        document.removeEventListener('listChanged', listener.listener);
      });
    }
    
    // Add our enhanced list change handler
    document.addEventListener('listChanged', enhancedListChangeHandler);
    
    // Also enhance the showPanelForTask function to ensure panels remain visible
    const originalShowPanelForTask = window.showPanelForTask;
    window.showPanelForTask = function(task) {
      if (!task || !task.list || !task._id) {
        console.error('Invalid task provided to showPanelForTask');
        return;
      }
      
      // Always ensure the right panels container is visible when showing a task
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