function hasTasksInList(listName) { 
  if (!window.localTaskCache || !Array.isArray(window.localTaskCache)) { 
    console.log(`No task cache available for list: ${listName}`); 
    return false; 
  } 
  
  // Direct check for tasks in the list
  const tasksInList = window.localTaskCache.filter(task => 
    task.list === listName && task.deleted !== true 
  ); 
  
  return tasksInList.length > 0; 
}

// Enhanced panel visibility controller
function updateRightPanelVisibility(listName) {
  if (!listName) return;
  
  const rightPanelsContainer = document.getElementById('right-panels-container');
  if (!rightPanelsContainer) {
    console.error('Right panels container not found');
    return;
  }
  
  const hasTasksInCurrentList = hasTasksInList(listName);
  
  const activeTaskId = localStorage.getItem('activeTaskId');
  const activeTask = activeTaskId ? 
    window.localTaskCache.find(task => task._id === activeTaskId && !task.deleted) : 
    null;
  
  console.log(`Checking visibility for ${listName}: has tasks = ${hasTasksInCurrentList}, active task = ${activeTask ? activeTask._id : 'none'}`);
  
  // Hide all list-specific containers
  document.querySelectorAll('[id^="right-panels-container-"]').forEach(container => {
    container.classList.add('hidden');
  });
  
  if (!hasTasksInCurrentList) {
    rightPanelsContainer.classList.add('hidden');
    window.currentTaskId = null;
    localStorage.removeItem('activeTaskId');
    return;
  }
  
  // Show container for current list
  const listId = listName.toLowerCase().replace(/\s+/g, '-');
  const containerIdForList = `right-panels-container-${listId}`;
  const listContainer = document.getElementById(containerIdForList);
  
  if (listContainer) {
    listContainer.classList.remove('hidden');
  }
  
  if (hasTasksInCurrentList) {
    rightPanelsContainer.classList.remove('hidden');
    
    if (activeTask && activeTask.list === listName) {
      setTimeout(() => {
        showPanelForTask(activeTask);
      }, 10);
    } else {
      const firstTask = window.localTaskCache.find(task => 
        task.list === listName && !task.deleted
      );
      
      if (firstTask) {
        setTimeout(() => {
          showPanelForTask(firstTask);
          window.currentTaskId = firstTask._id;
          localStorage.setItem('activeTaskId', firstTask._id);
        }, 10);
      } else {
        rightPanelsContainer.classList.add('hidden');
      }
    }
  } else {
    rightPanelsContainer.classList.add('hidden');
    window.currentTaskId = null;
    localStorage.removeItem('activeTaskId');
  }
}

// Enhanced show panel function
function showPanelForTask(task) {
  if (!task || !task.list || !task._id) {
    console.error('Invalid task provided to showPanelForTask');
    return;
  }
  
  console.log(`Enhanced showPanelForTask called for: ${task.title} (ID: ${task._id})`);
  
  const rightPanelsContainer = document.getElementById('right-panels-container');
  if (rightPanelsContainer) {
    rightPanelsContainer.classList.remove('hidden');
  }
  
  const listName = task.list;
  const taskId = task._id;
  
  window.currentTaskId = taskId;
  localStorage.setItem('activeTaskId', taskId);
  
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
    if (window.createPanelForTask) {
      window.createPanelForTask(task);
    }
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
    panel = window.createPanelForTask ? window.createPanelForTask(task) : null;
  } else if (window.updatePanelWithTask) {
    window.updatePanelWithTask(panel, task);
  }
  
  if (panel) {
    panel.classList.remove('hidden');
    console.log(`Showing panel for task: ${task.title} in list: ${listName}`);
  } else {
    console.error(`Failed to show panel for task: ${task.title} in list: ${listName}`);
  }
}

// Handle list changes
function handleListChange(e) {
  if (e.detail && e.detail.list) {
    const listName = e.detail.list;
    console.log('List changed event detected, preserving panel visibility for:', listName);
    
    const previousList = localStorage.getItem('activeList');
    localStorage.setItem('activeList', listName);
    
    // Store the active task ID for the previous list before switching
    const activeTaskId = localStorage.getItem('activeTaskId');
    const activeTask = activeTaskId ? 
      window.localTaskCache.find(task => task._id === activeTaskId && !task.deleted) : 
      null;
    
    if (activeTask && activeTask.list === previousList) {
      localStorage.setItem(`lastActiveTask_${previousList}`, activeTaskId);
    }
    
    // Ensure fresh task cache data
    if (window.refreshTaskCache && typeof window.refreshTaskCache === 'function') {
      window.refreshTaskCache();
    }
    
    // Check if the new list has any tasks
    const tasksInNewList = window.localTaskCache ? 
      window.localTaskCache.filter(task => task.list === listName && !task.deleted) : 
      [];
    
    const rightPanelsContainer = document.getElementById('right-panels-container');
    
    if (tasksInNewList.length > 0) {
      // Keep the panel container visible
      if (rightPanelsContainer) {
        rightPanelsContainer.classList.remove('hidden');
      }
      
      // Show the proper list container
      document.querySelectorAll('[id^="right-panels-container-"]').forEach(container => {
        container.classList.add('hidden');
      });
      
      const listId = listName.toLowerCase().replace(/\s+/g, '-');
      const containerIdForList = `right-panels-container-${listId}`;
      const listContainer = document.getElementById(containerIdForList);
      
      if (listContainer) {
        listContainer.classList.remove('hidden');
      }
      
      // Try to use remembered task for this list or fall back to first task
      const rememberedTaskId = localStorage.getItem(`lastActiveTask_${listName}`);
      const rememberedTask = rememberedTaskId ? 
        window.localTaskCache.find(task => 
          task._id === rememberedTaskId && 
          !task.deleted && 
          task.list === listName
        ) : null;
      
      setTimeout(() => {
        if (rememberedTask) {
          console.log(`Using remembered task for ${listName}:`, rememberedTask);
          window.currentTaskId = rememberedTask._id;
          localStorage.setItem('activeTaskId', rememberedTask._id);
          showPanelForTask(rememberedTask);
        } else {
          const firstTask = tasksInNewList[0];
          if (firstTask) {
            console.log(`No remembered task, using first task for ${listName}:`, firstTask);
            window.currentTaskId = firstTask._id;
            localStorage.setItem('activeTaskId', firstTask._id);
            showPanelForTask(firstTask);
          }
        }
        
        // Double-check panel visibility
        setTimeout(() => {
          if (rightPanelsContainer) {
            rightPanelsContainer.classList.remove('hidden');
          }
        }, 50);
      }, 10);
    } else {
      // No tasks in this list, hide the panel
      if (rightPanelsContainer) {
        rightPanelsContainer.classList.add('hidden');
      }
    }
  }
}

// Handle task addition
function handleTaskAdded(e) {
  if (e.detail && e.detail.task) {
    const task = e.detail.task;
    console.log('Task added event detected:', task);
    
    const rightPanelsContainer = document.getElementById('right-panels-container');
    if (rightPanelsContainer) {
      rightPanelsContainer.classList.remove('hidden');
    }
    
    localStorage.setItem(`lastActiveTask_${task.list}`, task._id);
    
    setTimeout(() => {
      window.currentTaskId = task._id;
      localStorage.setItem('activeTaskId', task._id);
      showPanelForTask(task);
    }, 50);
  }
}

// Handle task deletion
function handleTaskDeleted(e) {
  if (e.detail && e.detail.list) {
    console.log('Task deleted event detected, updating panel visibility');
    setTimeout(() => {
      updateRightPanelVisibility(e.detail.list);
    }, 100);
  }
}

// Check for empty lists on load
function checkEmptyListsOnLoad() {
  console.log('Checking for empty lists on load...');
  
  if (!window.localTaskCache || !Array.isArray(window.localTaskCache)) {
    setTimeout(checkEmptyListsOnLoad, 200);
    return;
  }
  
  const lists = [...new Set(window.localTaskCache.map(task => task.list))];
  lists.forEach(listName => {
    const hasAnyTasks = hasTasksInList(listName);
    if (!hasAnyTasks) {
      console.log(`List ${listName} is empty, hiding panel`);
      const rightPanelsContainer = document.getElementById('right-panels-container');
      if (rightPanelsContainer) {
        rightPanelsContainer.classList.add('hidden');
      }
    }
  });
}

// Listen for task creation via Add buttons
function listenForTaskCreation() {
  const addButtons = document.querySelectorAll('button.add, button[type="button"]:contains("Add")');
  
  addButtons.forEach(button => {
    if (!button.hasTaskListener) {
      button.hasTaskListener = true;
      button.addEventListener('click', function() {
        console.log('Add button clicked, watching for new task');
        
        const beforeCount = window.localTaskCache ? window.localTaskCache.length : 0;
        
        setTimeout(() => {
          if (window.localTaskCache && window.localTaskCache.length > beforeCount) {
            const activeList = localStorage.getItem('activeList') || 'Personal';
            const rightPanelsContainer = document.getElementById('right-panels-container');
            if (rightPanelsContainer) {
              rightPanelsContainer.classList.remove('hidden');
            }
            
            updateRightPanelVisibility(activeList);
          }
        }, 200);
      });
    }
  });
}

// Patch the addTask function if it exists
function patchAddTaskFunction() {
  if (window.addTask && typeof window.addTask === 'function') {
    const originalAddTask = window.addTask;
    window.addTask = function(taskData) {
      const result = originalAddTask(taskData);
      
      setTimeout(() => {
        const rightPanelsContainer = document.getElementById('right-panels-container');
        if (rightPanelsContainer) {
          rightPanelsContainer.classList.remove('hidden');
        }
        
        if (result && result._id) {
          showPanelForTask(result);
        } else {
          if (window.localTaskCache && Array.isArray(window.localTaskCache)) {
            const activeList = localStorage.getItem('activeList') || 'Personal';
            const latestTask = window.localTaskCache
              .filter(t => t.list === activeList && !t.deleted)
              .sort((a, b) => {
                if (a.createdAt && b.createdAt) return new Date(b.createdAt) - new Date(a.createdAt);
                return 0;
              })[0];
              
            if (latestTask) {
              showPanelForTask(latestTask);
            }
          }
        }
      }, 100);
      
      return result;
    };
  }
}

// Main initialization function
function initializePanelSystem() {
  console.log('Initializing enhanced panel system...');
  
  // Set up core functionality
  window.hasTasksInList = hasTasksInList;
  window.updateRightPanelVisibility = updateRightPanelVisibility;
  window.showPanelForTask = showPanelForTask;
  
  // Remove any existing event listeners
  try {
    const oldListeners = window.getEventListeners ? window.getEventListeners(document) : null;
    if (oldListeners) {
      ['listChanged', 'taskAdded', 'taskDeleted'].forEach(eventType => {
        if (oldListeners[eventType]) {
          oldListeners[eventType].forEach(listener => {
            document.removeEventListener(eventType, listener.listener);
          });
        }
      });
    }
  } catch (e) {
    console.log('Could not remove old event listeners, will add new ones', e);
  }
  
  // Set up event listeners
  document.addEventListener('listChanged', handleListChange);
  document.addEventListener('taskAdded', handleTaskAdded);
  document.addEventListener('taskDeleted', handleTaskDeleted);
  
  // Initialize with current active list
  const activeList = localStorage.getItem('activeList') || 'Personal';
  updateRightPanelVisibility(activeList);
  
  // Check for active task
  const activeTaskId = localStorage.getItem('activeTaskId');
  if (activeTaskId && window.localTaskCache) {
    const task = window.localTaskCache.find(task => task._id === activeTaskId);
    if (task) {
      showPanelForTask(task);
    }
  }
  
  // Patch addTask function
  patchAddTaskFunction();
  
  // Set up task creation listeners
  listenForTaskCreation();
  setInterval(listenForTaskCreation, 2000);
  
  // Final check for empty lists
  setTimeout(checkEmptyListsOnLoad, 200);
  
  console.log('Enhanced panel system successfully initialized!');
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePanelSystem);
} else {
  initializePanelSystem();
}