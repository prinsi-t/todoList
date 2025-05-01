function applyBlurEffect(shouldBlur) {
  const blurContent = document.getElementById('task-blur-content');
  if (!blurContent) {
    console.error('❌ No #task-blur-content found.');
    return;
  }

  console.log('Applying blur effect to:', blurContent);

  const completeBtn = document.getElementById('complete-btn');
  
  if (shouldBlur) {
    blurContent.classList.add('blurred');
    blurContent.style.filter = 'blur(5px)';
   
    if (completeBtn) {
      completeBtn.innerHTML = '<i class="fas fa-check mr-2"></i> Completed';
      completeBtn.classList.remove('bg-blue-500', 'hover:bg-blue-600');
      completeBtn.classList.add('bg-green-500', 'hover:bg-green-600');
    }
  } else {
    blurContent.classList.remove('blurred');
    blurContent.style.filter = 'none';
    if (completeBtn) {
      completeBtn.innerHTML = 'Mark as Complete';
      completeBtn.classList.add('bg-blue-500', 'hover:bg-blue-600');
      completeBtn.classList.remove('bg-green-500', 'hover:bg-green-600');
    }
  }
}

function markSelectedTaskComplete() {
  console.log('Mark as Complete button clicked');
  applyBlurEffect(true);

  const completeBtn = document.getElementById('complete-btn');
  if (completeBtn) {
    completeBtn.innerHTML = '<i class="fas fa-check mr-2"></i> Completed';
    completeBtn.classList.remove('bg-blue-500', 'hover:bg-blue-600');
    completeBtn.classList.add('bg-green-500', 'hover:bg-green-600');
  }
}

function updateAllListCounts(tasks) {
  // Define all the lists we want to track
  const lists = ['Personal', 'Work', 'Grocery List'];
  
  // Update count for each list
  lists.forEach(list => {
    const count = tasks.filter(todo => todo.list === list).length;
    const countElement = document.getElementById(`count-${list.toLowerCase().replace(' ', '-')}`);
    if (countElement) {
      countElement.textContent = count;
    }
  });
  
  // Also update the "All" count if it exists
  const allTasksCount = document.getElementById('allTasksCount');
  if (allTasksCount) {
    allTasksCount.textContent = tasks.length;
  }
}

function updateTaskCount(list, delta = 0, override = null) {
  const countElement = document.getElementById(`count-${list.toLowerCase().replace(' ', '-')}`);
  if (countElement) {
    const currentCount = override !== null ? override : parseInt(countElement.textContent || '0') + delta;
    countElement.textContent = Math.max(0, currentCount);
  }
  
  // Also update the total count if we're changing counts
  if (delta !== 0 || override !== null) {
    const allTasksCount = document.getElementById('allTasksCount');
    if (allTasksCount) {
      if (override !== null) {
        // Recalculate the total from all lists
        const totalTasks = localTaskCache.length;
        allTasksCount.textContent = totalTasks;
      } else {
        // Just adjust by delta
        const currentTotal = parseInt(allTasksCount.textContent || '0') + delta;
        allTasksCount.textContent = Math.max(0, currentTotal);
      }
    }
  }
}

function filterTasks(list) {
  const titleElement = document.querySelector('h1');
  if (titleElement) {
    titleElement.textContent = `${list} tasks`;
  }

  const taskCategory = document.getElementById('taskCategory');
  if (taskCategory) taskCategory.value = list;

  const newTaskInput = document.getElementById('newTaskInput');
  if (newTaskInput) newTaskInput.value = '';

  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.classList.toggle('active', item.dataset.list === list);
  });

  const rightPanelText = document.querySelector('#right-panel .text-gray-400');
  if (rightPanelText) {
    rightPanelText.textContent = list;
  }

  const taskList = document.getElementById('taskList');
  if (!taskList) return;
  taskList.innerHTML = '';

  const listTasks = localTaskCache.filter(todo => todo.list === list);

  listTasks.forEach(task => {
    const cachedTask = localTaskCache.find(t => t._id === task._id);
    if (cachedTask) {
      task.completed = cachedTask.completed;
      if (cachedTask.subtasks) {
        task.subtasks = cachedTask.subtasks.map(sub => ({ ...sub }));
      }
    }

    const taskElement = createTaskElement(task);
    taskList.appendChild(taskElement);
  });

  updateTaskCount(list, 0, listTasks.length);
} 