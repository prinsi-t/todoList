// Persistent Panel Fix - Consolidated solution
// This script ensures the right panel stays visible when switching between lists
// and properly handles task visibility across list changes

// Store a reference to the original functions we'll be enhancing
const originalUpdateRightPanelVisibility = window.updateRightPanelVisibility;
const originalShowPanelForTask = window.showPanelForTask;

// Enhanced version of updateRightPanelVisibility
function enhancedUpdateRightPanelVisibility(listName) {
  if (!listName) return;
  
  const rightPanelsContainer = document.getElementById('right-panels-container');
  if (!rightPanelsContainer) {
    console.error('Right panels container not found');
    return;
  }
  
  // Check if the current list has any tasks
  const hasTasksInCurrentList = hasTasksInList(listName);
  
  // Always check if there's an active task (regardless of which list it belongs to)
  const activeTaskId = localStorage.getItem('activeTaskId');
  const activeTask = activeTaskId ? 
    window.localTaskCache.find(task => task._id === activeTaskId && !task.deleted) : 
    null;
  
  console.log(`Checking visibility for ${listName}: has tasks = ${hasTasksInCurrentList}, active task = ${activeTask ? activeTask._id : 'none'}`);
  
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
  
  // CRITICAL FIX: We keep the right panel visible in these cases:
  // 1. Current list has tasks
  // 2. There's an active task from any list
  if (hasTasksInCurrentList || activeTask) {
    rightPanelsContainer.classList.remove('hidden');
    
    // If we have an active task, make sure its panel is displayed
    if (activeTask) {
      // Short timeout to ensure DOM is ready
      setTimeout(() => {
        showPanelForTask(activeTask);
      }, 10);
    } else if (hasTasksInCurrentList) {
      // No active task but current list has tasks - show the first task
      const firstTask = window.localTaskCache.find(task => 
        task.list === listName && !task.deleted
      );
      
      if (firstTask) {
        setTimeout(() => {
          showPanelForTask(firstTask);
          // Save this as the new active task
          window.currentTaskId = firstTask._id;
          localStorage.setItem('activeTaskId', firstTask._id);
        }, 10);
      }
    }
  } else {
    // Only hide if there are truly no tasks at all and no active task
    rightPanelsContainer.classList.add('hidden');
    window.currentTaskId = null;
    localStorage.removeItem('activeTaskId');
  }
}

// Enhanced showPanelForTask to ensure panels remain visible
function enhancedShowPanelForTask(task) {
  if (!task || !task.list || !task._id) {
    console.error('Invalid task provided to showPanelForTask');
    return;
  }
  
  console.log(`Enhanced showPanelForTask called for: ${task.title} (ID: ${task._id})`);
  
  // Always ensure the right panels container is visible when showing a task
  const rightPanelsContainer = document.getElementById('right-panels-container');
  if (rightPanelsContainer) {
    rightPanelsContainer.classList.remove('hidden');
  }
  
  // Continue with original function logic
  const listName = task.list;
  const taskId = task._id;
  
  // Save this as the active task
  window.currentTaskId = taskId;
  localStorage.setItem('activeTaskId', taskId);
  
  // Hide all containers first
  document.querySelectorAll('.right-panels-container').forEach(container => {
    container.classList.add('hidden');
  });
  
  const listId = listName.toLowerCase().replace(/\s+/g, '-');
  const containerIdForList = `right-panels-container-${listId}`;
  const listContainer = document.getElementById(containerIdForList);
  
  if (listContainer) {
    listContainer.classList.remove('hidden');
  } else {
    console.log(`Creating container for list: ${listName}`);
    originalShowPanelForTask(task);
    return;
  }
  
  if (listContainer) {
    listContainer.querySelectorAll('.task-panel').forEach(panel => {
      panel.classList.add('hidden');
    });
  }
  
  const uniquePanelId = `right-panel-${listId}-${taskId}`;
  let panel = document.getElementById(uniquePanelId);
  
  if (!panel) {
    panel = window.createPanelForTask(task);
  } else {
    window.updatePanelWithTask(panel, task);
  }
  
  if (panel) {
    panel.classList.remove('hidden');
    console.log(`Showing panel for task: ${task.title} in list: ${listName}`);
  } else {
    console.error(`Failed to show panel for task: ${task.title} in list: ${listName}`);
  }
}

// Enhanced list change handler
function enhancedListChangeHandler(e) {
  if (e.detail && e.detail.list) {
    const listName = e.detail.list;
    console.log('List changed event detected, updating panel visibility for:', listName);
    
    // Store the current list name for persistence
    localStorage.setItem('activeList', listName);
    
    // Update panel visibility for the new list using our enhanced function
    enhancedUpdateRightPanelVisibility(listName);
  }
}

// Task Added event handler - ensure panel is shown immediately
function enhancedTaskAddedHandler(e) {
  if (e.detail && e.detail.task) {
    const task = e.detail.task;
    console.log('Task added event detected:', task);
    
    // Ensure the right panel is visible
    const rightPanelsContainer = document.getElementById('right-panels-container');
    if (rightPanelsContainer) {
      rightPanelsContainer.classList.remove('hidden');
    }
    
    // Show the panel for this new task
    setTimeout(() => {
      window.currentTaskId = task._id;
      localStorage.setItem('activeTaskId', task._id);
      enhancedShowPanelForTask(task);
    }, 50);
  }
}

// Install the fix by replacing the original functions
function installPersistentPanelFix() {
  console.log('Installing persistent panel fix...');
  
  // Replace updateRightPanelVisibility with our enhanced version
  window.updateRightPanelVisibility = enhancedUpdateRightPanelVisibility;
  
  // Replace showPanelForTask with our enhanced version
  window.showPanelForTask = enhancedShowPanelForTask;
  
  // Remove any existing event listeners for list changes and task additions
  // (Only if browser supports this - otherwise we'll create new ones)
  try {
    const oldListeners = window.getEventListeners ? window.getEventListeners(document) : null;
    if (oldListeners) {
      if (oldListeners.listChanged) {
        oldListeners.listChanged.forEach(listener => {
          document.removeEventListener('listChanged', listener.listener);
        });
      }
      if (oldListeners.taskAdded) {
        oldListeners.taskAdded.forEach(listener => {
          document.removeEventListener('taskAdded', listener.listener);
        });
      }
    }
  } catch (e) {
    console.log('Could not remove old event listeners, will add new ones', e);
  }
  
  // Add our enhanced event handlers
  document.addEventListener('listChanged', enhancedListChangeHandler);
  document.addEventListener('taskAdded', enhancedTaskAddedHandler);
  
  // Force an initial update based on the active list
  const activeList = localStorage.getItem('activeList') || 'Personal';
  enhancedUpdateRightPanelVisibility(activeList);
  
  console.log('Persistent panel fix successfully installed!');
}

// Run the fix when the page is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installPersistentPanelFix);
} else {
  // Document already loaded, install immediately
  installPersistentPanelFix();
}