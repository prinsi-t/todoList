document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

let localTaskCache = [];

function loadLocalTaskCache() {
  try {
    const savedCache = localStorage.getItem('taskCache');
    if (savedCache) {
      localTaskCache = JSON.parse(savedCache);
      console.log(`Loaded ${localTaskCache.length} tasks from localStorage`);
    } else {
      localTaskCache = [];
      console.log('No tasks found in localStorage');
    }
  } catch (error) {
    console.error('Error loading tasks from localStorage:', error);
    localTaskCache = [];
  }
}

function initApp() {
  loadLocalTaskCache();
  loadTasksFromServer();
  setEventListeners();
  filterTasks('Personal'); 
  loadLocalSubtasks();
  setupFileUpload(); 
}

function saveTaskCacheToLocalStorage() {
  try {
    localStorage.setItem('taskCache', JSON.stringify(localTaskCache));
    console.log(`Task cache saved to localStorage: ${localTaskCache.length} tasks`);
  } catch (error) {
    console.error('Error saving task cache to localStorage:', error);
  }
}

function setEventListeners() {
  console.log('Setting up event listeners');
  
  const completeBtn = document.getElementById('complete-btn');
  if (completeBtn) {
    
    const newBtn = completeBtn.cloneNode(true);
    completeBtn.parentNode.replaceChild(newBtn, completeBtn);
    
    
    newBtn.addEventListener('click', () => {
      console.log('Mark as Complete button clicked');
      markSelectedTaskComplete();
    });
  } else {
    console.error('❌ Complete button not found');
  }
  
  const addTaskForm = document.getElementById('addTaskForm');
  if (addTaskForm) {
    addTaskForm.addEventListener('submit', handleAddTask);
  }

  const addSubtaskBtn = document.getElementById('addSubtaskBtn');
  const subtaskInput = document.getElementById('subtaskInput');

  if (addSubtaskBtn) {
    addSubtaskBtn.addEventListener('click', (e) => {
      e.preventDefault();
      addSubtask();
    });
  }

  if (subtaskInput) {
    subtaskInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addSubtask();
      }
    });
  }
} 