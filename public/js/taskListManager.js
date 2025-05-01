document.addEventListener('DOMContentLoaded', function() {
  const addTaskForm = document.getElementById('addTaskForm');
  const newTaskInput = document.getElementById('newTaskInput');
  const taskCategory = document.getElementById('taskCategory');
  const taskList = document.getElementById('taskList');
  const taskBlurContent = document.getElementById('task-blur-content');
  const completeBtn = document.getElementById('complete-btn');

  // Handle form submission to add a new task
  addTaskForm.addEventListener('submit', function(event) {
    event.preventDefault();
    const taskTitle = newTaskInput.value.trim();
    const category = taskCategory.value;

    if (taskTitle) {
      // Add the task to the list (this is a placeholder, actual implementation may vary)
      const taskItem = document.createElement('div');
      taskItem.className = 'task-item group px-4 py-2.5 rounded-lg mb-1.5 cursor-pointer flex items-center gap-3 transition-all duration-200 hover:bg-dark-hover';
      taskItem.dataset.taskId = Date.now(); // Example ID, replace with actual ID from server
      taskItem.dataset.list = category;

      const checkbox = document.createElement('div');
      checkbox.className = 'checkbox w-5 h-5 border-2 border-dark-border rounded-full flex items-center justify-center transition-colors duration-200';

      const taskTitleSpan = document.createElement('span');
      taskTitleSpan.className = 'text-gray-200 flex-grow text-sm';
      taskTitleSpan.textContent = taskTitle;

      taskItem.appendChild(checkbox);
      taskItem.appendChild(taskTitleSpan);
      taskList.appendChild(taskItem);

      // Clear the input field
      newTaskInput.value = '';
    }
  });

  // Function to filter tasks by category
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

  // Toggle blur effect on task content
  completeBtn.addEventListener('click', function() {
    taskBlurContent.classList.toggle('blurred');
  });
}); 