// This script ensures the task form correctly adds tasks to the active list

document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for the DOM to stabilize
    setTimeout(function() {
      fixAddTaskForm();
    }, 300);
  });
  
  function fixAddTaskForm() {
    console.log('Fixing add task form...');
    
    // Get the form
    const addTaskForm = document.getElementById('addTaskForm');
    if (!addTaskForm) {
      console.error('Add task form not found');
      return;
    }
    
    // Clone and replace to remove existing handlers
    const newForm = addTaskForm.cloneNode(true);
    addTaskForm.parentNode.replaceChild(newForm, addTaskForm);
    
    // Add our submit handler
    newForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Get the task input
      const input = document.getElementById('newTaskInput');
      if (!input) {
        console.error('Task input not found');
        return;
      }
      
      const taskText = input.value.trim();
      if (!taskText) {
        console.log('Empty task, ignoring');
        return;
      }
      
      // Get the current active list
      const activeList = localStorage.getItem('activeList');
      if (!activeList) {
        console.error('No active list found in localStorage');
        alert('Error: Could not determine which list to add task to');
        return;
      }
      
      console.log('Adding task to list:', activeList);
      console.log('Task text:', taskText);
      
      // Create new task object
      const newTask = {
        _id: 'local_' + Date.now(),
        title: taskText,
        list: activeList,
        completed: false,
        subtasks: [],
        attachments: []
      };
      
      // Add to local task cache
      if (typeof localTaskCache === 'undefined') {
        console.log('Creating new local task cache');
        window.localTaskCache = [];
      }
      
      localTaskCache.push(newTask);
      
      // Save to localStorage
      try {
        localStorage.setItem('taskCache', JSON.stringify(localTaskCache));
        console.log('Task saved to localStorage cache');
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
      
      // Refresh task list
      if (typeof refreshTaskList === 'function') {
        refreshTaskList(activeList);
        console.log('Task list refreshed');
      } else if (typeof window.filterTasks === 'function') {
        window.filterTasks(activeList);
        console.log('Tasks filtered for current list');
      } else {
        console.error('No refresh function found');
        // Fallback: reload the page
        window.location.reload();
      }
      
      // Clear input
      input.value = '';
    });
    
    console.log('Add task form fixed!');
  }