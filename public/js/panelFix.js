// A minimal patch to fix the right panel visibility issue when adding tasks
// This patch only modifies the bare minimum required to fix the issue

// Modified version of the taskAdded event listener inside initializePanelVisibility
function initializePanelVisibility() {
    const activeList = localStorage.getItem('activeList') || 'Personal';
    updateRightPanelVisibility(activeList);
    
    document.addEventListener('taskAdded', function(e) {
      if (e.detail && e.detail.task) {
        console.log('Task added event detected, updating panel visibility');
        const task = e.detail.task;
        
        // Ensure the right panel is visible
        const rightPanelsContainer = document.getElementById('right-panels-container');
        if (rightPanelsContainer) {
          rightPanelsContainer.classList.remove('hidden');
        }
        
        // Update panel visibility
        updateRightPanelVisibility(task.list);
        
        // Directly show the panel for this task
        setTimeout(() => {
          showPanelForTask(task);
        }, 50);
      }
    });
    
    document.addEventListener('taskDeleted', function(e) {
      if (e.detail && e.detail.list) {
        console.log('Task deleted event detected, updating panel visibility');
        setTimeout(() => {
          updateRightPanelVisibility(e.detail.list);
        }, 100);
      }
    });
    
    document.addEventListener('listChanged', function(e) {
      if (e.detail && e.detail.list) {
        console.log('List changed event detected, updating panel visibility');
        updateRightPanelVisibility(e.detail.list);
      }
    });
  }
  
  // Function to listen for task creation from outside the main system
  // This is a fallback in case the taskAdded event doesn't fire properly
  function listenForTaskCreation() {
    // Find all add buttons in the document
    const addButtons = document.querySelectorAll('button.add, button[type="button"]:contains("Add")');
    
    addButtons.forEach(button => {
      if (!button.hasTaskListener) {
        button.hasTaskListener = true;
        button.addEventListener('click', function() {
          console.log('Add button clicked, watching for new task');
          
          // Check the task cache before and after
          const beforeCount = window.localTaskCache ? window.localTaskCache.length : 0;
          
          setTimeout(() => {
            if (window.localTaskCache && window.localTaskCache.length > beforeCount) {
              // A new task was added
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
  
  // Patch the original add task function if it exists in global scope
  if (window.addTask && typeof window.addTask === 'function') {
    const originalAddTask = window.addTask;
    window.addTask = function(taskData) {
      const result = originalAddTask(taskData);
      
      // After task is added, ensure right panel is visible
      setTimeout(() => {
        const rightPanelsContainer = document.getElementById('right-panels-container');
        if (rightPanelsContainer) {
          rightPanelsContainer.classList.remove('hidden');
        }
        
        // If the task was returned, show its panel
        if (result && result._id) {
          showPanelForTask(result);
        } else {
          // Otherwise try to find the newest task
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
  
  // Apply the task creation listener when DOM is loaded
  document.addEventListener('DOMContentLoaded', function() {
    // Run the original initialization
    const activeTaskId = localStorage.getItem('activeTaskId');
    if (activeTaskId) {
      const task = window.localTaskCache.find(task => task._id === activeTaskId);
      if (task) {
        showPanelForTask(task);
      }
    }
    
    initializePanelVisibility();
    
    // Add our new listener
    listenForTaskCreation();
    
    // Also listen for dynamically added add buttons
    setInterval(listenForTaskCreation, 2000);
  });
  
  // Export or update existing exported functions
  window.hasTasksInList = hasTasksInList;
  window.updateRightPanelVisibility = updateRightPanelVisibility;
  window.initializePanelVisibility = initializePanelVisibility;