const originalUpdateRightPanelVisibility = window.updateRightPanelVisibility;
const originalShowPanelForTask = window.showPanelForTask;

// Additional function to check on load and handle initialization
function checkEmptyListsOnLoad() {
  console.log('Checking for empty lists on load...');
  
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    installPersistentPanelFix();
    setTimeout(checkEmptyListsOnLoad, 200); // Give time for task cache to load
  });
} else {
  installPersistentPanelFix();
  setTimeout(checkEmptyListsOnLoad, 200); // Give time for task cache to load
}function enhancedUpdateRightPanelVisibility(listName) {
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
  
  document.querySelectorAll('[id^="right-panels-container-"]').forEach(container => {
    container.classList.add('hidden');
  });
  
  if (!hasTasksInCurrentList) {
    rightPanelsContainer.classList.add('hidden');
    window.currentTaskId = null;
    localStorage.removeItem('activeTaskId');
    return;
  }
  
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

function enhancedShowPanelForTask(task) {
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

function enhancedListChangeHandler(e) {
  if (e.detail && e.detail.list) {
    const listName = e.detail.list;
    console.log('List changed event detected, updating panel visibility for:', listName);
    
    const previousList = localStorage.getItem('activeList');
    localStorage.setItem('activeList', listName);
    
    // Store the current active task before switching lists
    const activeTaskId = localStorage.getItem('activeTaskId');
    const activeTask = activeTaskId ? 
      window.localTaskCache.find(task => task._id === activeTaskId && !task.deleted) : 
      null;
    
    // Check if the active task belongs to the previous list
    if (activeTask && activeTask.list === previousList) {
      // Remember this task ID for when we return to this list
      localStorage.setItem(`lastActiveTask_${previousList}`, activeTaskId);
    }
    
    // Check if we have a remembered task for the new list
    const rememberedTaskId = localStorage.getItem(`lastActiveTask_${listName}`);
    const rememberedTask = rememberedTaskId ? 
      window.localTaskCache.find(task => task._id === rememberedTaskId && !task.deleted && task.list === listName) : 
      null;
    
    // Force the right panels container to be visible if there are tasks
    const hasTasksInCurrentList = hasTasksInList(listName);
    const rightPanelsContainer = document.getElementById('right-panels-container');
    
    if (hasTasksInCurrentList && rightPanelsContainer) {
      // Force remove hidden class
      rightPanelsContainer.classList.remove('hidden');
      
      // Also ensure all list-specific containers are properly set
      document.querySelectorAll('[id^="right-panels-container-"]').forEach(container => {
        if (container.id.includes(listName.toLowerCase().replace(/\s+/g, '-'))) {
          container.classList.remove('hidden');
        } else {
          container.classList.add('hidden');
        }
      });
    }
    
    if (rememberedTask) {
      // We have a remembered task for this list, use it
      window.currentTaskId = rememberedTask._id;
      localStorage.setItem('activeTaskId', rememberedTask._id);
      
      // Force the panel container to be visible
      if (rightPanelsContainer) {
        rightPanelsContainer.classList.remove('hidden');
      }
      
      // Use a longer timeout to ensure DOM is fully ready
      setTimeout(() => {
        // Call the original showPanelForTask directly to avoid any issues
        originalShowPanelForTask(rememberedTask);
        
        // Double-check visibility after a short delay
        setTimeout(() => {
          if (hasTasksInCurrentList && rightPanelsContainer) {
            rightPanelsContainer.classList.remove('hidden');
          }
        }, 100);
      }, 100);
    } else {
      // No remembered task, use the standard behavior
      enhancedUpdateRightPanelVisibility(listName);
    }
  }
}
// ... existing code ...
function enhancedTaskAddedHandler(e) {
  if (e.detail && e.detail.task) {
    const task = e.detail.task;
    console.log('Task added event detected:', task);
    
    const rightPanelsContainer = document.getElementById('right-panels-container');
    if (rightPanelsContainer) {
      rightPanelsContainer.classList.remove('hidden');
    }
    
    // Store this task as the active task for its list
    localStorage.setItem(`lastActiveTask_${task.list}`, task._id);
    
    setTimeout(() => {
      window.currentTaskId = task._id;
      localStorage.setItem('activeTaskId', task._id);
      enhancedShowPanelForTask(task);
    }, 50);
  }
}
// ... existing code ...

function installPersistentPanelFix() {
  console.log('Installing persistent panel fix...');
  
  window.updateRightPanelVisibility = enhancedUpdateRightPanelVisibility;
  
  window.showPanelForTask = enhancedShowPanelForTask;
  
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
  
  document.addEventListener('listChanged', enhancedListChangeHandler);
  document.addEventListener('taskAdded', enhancedTaskAddedHandler);
  
  const activeList = localStorage.getItem('activeList') || 'Personal';
  enhancedUpdateRightPanelVisibility(activeList);
  
  console.log('Persistent panel fix successfully installed!');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installPersistentPanelFix);
} else {
  installPersistentPanelFix();
}

