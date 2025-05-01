document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

let localTaskCache = [];



function initApp() {
  loadTasksFromServer();
  setEventListeners();
  filterTasks('Personal'); 
  loadLocalSubtasks();
  setupFileUpload(); 
}

function saveTaskCacheToLocalStorage() {
  localStorage.setItem('taskCache', JSON.stringify(localTaskCache));
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