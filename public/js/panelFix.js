function initializePanelVisibility() {
    const activeList = localStorage.getItem('activeList') || 'Personal';
    updateRightPanelVisibility(activeList);
    
    document.addEventListener('taskAdded', function(e) {
      if (e.detail && e.detail.task) {
        console.log('Task added event detected, updating panel visibility');
        const task = e.detail.task;
        
        const rightPanelsContainer = document.getElementById('right-panels-container');
        if (rightPanelsContainer) {
          rightPanelsContainer.classList.remove('hidden');
        }
        
        updateRightPanelVisibility(task.list);
        
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
  
  document.addEventListener('DOMContentLoaded', function() {
    const activeTaskId = localStorage.getItem('activeTaskId');
    if (activeTaskId) {
      const task = window.localTaskCache.find(task => task._id === activeTaskId);
      if (task) {
        showPanelForTask(task);
      }
    }
    
    initializePanelVisibility();
    
    listenForTaskCreation();
    
    setInterval(listenForTaskCreation, 2000);
  });
  
  window.hasTasksInList = hasTasksInList;
  window.updateRightPanelVisibility = updateRightPanelVisibility;
  window.initializePanelVisibility = initializePanelVisibility;