document.addEventListener('DOMContentLoaded', function() {
  
  const addTaskForm = document.getElementById('addTaskForm');
  const newTaskInput = document.getElementById('newTaskInput');
  const taskCategory = document.getElementById('taskCategory');
  const taskList = document.getElementById('taskList');
  const taskBlurContent = document.getElementById('task-blur-content');
  const completeBtn = document.getElementById('complete-btn');

  let isTaskBlurred = localStorage.getItem('isTaskBlurred') === 'true';
 
  if (isTaskBlurred) {
    taskBlurContent.classList.add('blurred');
    taskBlurContent.style.cssText = 'filter: blur(5px) !important; pointer-events: none;';
    completeBtn.textContent = 'Mark as Incomplete';
    completeBtn.className = 'bg-green-500 text-white px-4 py-2 rounded-md';
  }
  
  addTaskForm.addEventListener('submit', function(event) {
    event.preventDefault();
    const taskTitle = newTaskInput.value.trim();
    const category = taskCategory.value;

    if (taskTitle) {
      
      const taskItem = document.createElement('div');
      taskItem.className = 'task-item group px-4 py-2.5 rounded-lg mb-1.5 cursor-pointer flex items-center gap-3 transition-all duration-200 hover:bg-dark-hover';
      taskItem.dataset.taskId = Date.now();
      taskItem.dataset.list = category;

      const checkbox = document.createElement('div');
      checkbox.className = 'checkbox w-5 h-5 border-2 border-dark-border rounded-full flex items-center justify-center transition-colors duration-200';

      const taskTitleSpan = document.createElement('span');
      taskTitleSpan.className = 'text-gray-200 flex-grow text-sm';
      taskTitleSpan.textContent = taskTitle;

      taskItem.appendChild(checkbox);
      taskItem.appendChild(taskTitleSpan);
      taskList.appendChild(taskItem);

      newTaskInput.value = '';
    }
  });

  window.filterTasks = function(category) {
    const tasks = taskList.querySelectorAll('.task-item');
    tasks.forEach(task => {
      if (task.dataset.list === category || category === 'All') {
        task.style.display = 'flex';
      } else {
        task.style.display = 'none';
      }
    });
  };

  completeBtn.addEventListener('click', function() {
    isTaskBlurred = !isTaskBlurred;
  
    localStorage.setItem('isTaskBlurred', isTaskBlurred);
    
    const blurContent = document.getElementById('task-blur-content');
    
    if (isTaskBlurred) {
      blurContent.classList.add('blurred');
      blurContent.removeAttribute('style');
      blurContent.style.cssText = 'filter: blur(5px) !important; pointer-events: none;';
      completeBtn.textContent = 'Mark as Incomplete';
      completeBtn.className = 'bg-green-500 text-white px-4 py-2 rounded-md'; 
      console.log('Applying blur effect with 5px blur');

    } else {
      blurContent.classList.remove('blurred');
      blurContent.removeAttribute('style');
      blurContent.style.cssText = 'filter: none !important; pointer-events: auto;';
      completeBtn.textContent = 'Mark as Complete';
      completeBtn.className = 'bg-blue-500 text-white px-4 py-2 rounded-md'; 
      console.log('Removing blur effect completely');
    }
  });
});