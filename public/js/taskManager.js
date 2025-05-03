// async function loadTasksFromServer() {
//   try {
//     const response = await fetch('/todos/all');
//     if (response.ok) {
//       const serverTasks = await response.json();

//       // Merge server tasks with local cache
//       const localTaskMap = {};
//       localTaskCache.forEach(task => {
//         localTaskMap[task._id] = task;
//       });

//       const mergedTasks = serverTasks.map(serverTask => {
//         const localTask = localTaskMap[serverTask._id];
//         if (localTask) {
//           serverTask.completed = localTask.completed;
//           if (localTask.subtasks) {
//             serverTask.subtasks = localTask.subtasks.map(sub => ({ ...sub }));
//           }
//         }
//         return serverTask;
//       });

//       localTaskCache = mergedTasks;
//       saveTaskCacheToLocalStorage();
//       updateAllListCounts(localTaskCache);

//       const currentList = document.querySelector('h1')?.textContent.replace(' tasks', '') || 'Personal';
//       filterTasks(currentList);
//     } else {
//       console.error('Failed to fetch tasks from server:', response.status);
//     }
//   } catch (error) {
//     console.error('Error loading tasks from server:', error);
//   }
// }
async function loadTasksFromServer() {
  try {
    const response = await fetch('/todos/all');
    if (response.ok) {
      const serverTasks = await response.json();

      // Merge server tasks with local cache
      const localTaskMap = {};
      localTaskCache.forEach(task => {
        localTaskMap[task._id] = task;
      });
      
      // Process server tasks first
      const mergedTasks = serverTasks.map(serverTask => {
        const localTask = localTaskMap[serverTask._id];
        if (localTask) {
          // Keep local completed status and subtasks
          serverTask.completed = localTask.completed;
          if (localTask.subtasks && localTask.subtasks.length > 0) {
            serverTask.subtasks = [...localTask.subtasks];
          }
          // Mark this local task as processed
          delete localTaskMap[serverTask._id];
        }
        return serverTask;
      });
      
      // Add any remaining local tasks (that weren't on the server)
      for (const taskId in localTaskMap) {
        // Only keep local tasks that have a local_ prefix
        if (taskId.startsWith('local_')) {
          mergedTasks.push(localTaskMap[taskId]);
        }
      }

      localTaskCache = mergedTasks;
      saveTaskCacheToLocalStorage();
      updateAllListCounts(localTaskCache);

      const currentList = document.querySelector('h1')?.textContent.replace(' tasks', '') || 'Personal';
      filterTasks(currentList);
    } else {
      console.error('Failed to fetch tasks from server:', response.status);
    }
  } catch (error) {
    console.error('Error loading tasks from server:', error);
    // If server fetch fails, we'll still use what's in the cache
    updateAllListCounts(localTaskCache);
    const currentList = document.querySelector('h1')?.textContent.replace(' tasks', '') || 'Personal';
    filterTasks(currentList);
  }
}

async function loadAllTasks() {
  try {
    await loadTasksFromServer();
    
    const tasksList = document.getElementById('taskList');
    tasksList.innerHTML = '';

    localTaskCache.forEach(task => {
      const taskElement = createTaskElement(task);
      tasksList.appendChild(taskElement);
    });

    document.getElementById('allTasksCount').textContent = localTaskCache.length;

    document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));
    document.querySelector('.sidebar-item').classList.add('active');
  } catch (error) {
    console.error('Error displaying all tasks:', error);
  }
}

// function createTaskElement(todo) {
//   const taskElement = document.createElement('div');
//   taskElement.className = 'task-item group px-4 py-2.5 rounded-lg mb-1.5 cursor-pointer flex items-center gap-3 transition-all duration-200 hover:bg-dark-hover';
//   taskElement.dataset.taskId = todo._id;
//   taskElement.dataset.list = todo.list;

//   taskElement.innerHTML = `
//     <div class="checkbox ${todo.completed ? 'checked' : ''} w-5 h-5 border-2 border-dark-border rounded-full flex items-center justify-center transition-colors duration-200 ${todo.completed ? 'bg-blue-500 border-blue-500' : ''}">
//       ${todo.completed ? '<i class="fas fa-check text-white text-xs"></i>' : ''}
//     </div>
//     <span class="${todo.completed ? 'line-through text-gray-500' : 'text-gray-200'} flex-grow text-sm">${todo.title}</span>
//     <button class="delete-task-btn opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all duration-200 mr-1">
//       <i class="fas fa-trash"></i>
//     </button>
//   `;

//   taskElement.addEventListener('click', (e) => {
//     if (!e.target.closest('.checkbox') && !e.target.closest('.delete-task-btn')) {
//       loadTaskDetails(todo);
//     } 
//   });
  
//   const checkbox = taskElement.querySelector('.checkbox');
//   checkbox.addEventListener('click', (e) => {
//     e.stopPropagation(); 
//     // Fix: Update the UI immediately before calling toggleTaskCompletion
//     const newCompletedState = !todo.completed;
//     const taskText = taskElement.querySelector('span');
    
//     if (newCompletedState) {
//       checkbox.classList.add('checked', 'bg-blue-500', 'border-blue-500');
//       checkbox.innerHTML = '<i class="fas fa-check text-white text-xs"></i>';
//       taskText.classList.add('line-through', 'text-gray-500');
//       taskText.classList.remove('text-gray-200');
//     } else {
//       checkbox.classList.remove('checked', 'bg-blue-500', 'border-blue-500');
//       checkbox.innerHTML = '';
//       taskText.classList.remove('line-through', 'text-gray-500');
//       taskText.classList.add('text-gray-200');
//     }
    
//     // Now call toggleTaskCompletion to update the backend
//     toggleTaskCompletion(todo._id, newCompletedState);
//   });
  
//   const deleteBtn = taskElement.querySelector('.delete-task-btn');
//   deleteBtn.addEventListener('click', (e) => {
//     e.stopPropagation(); 
//     deleteTask(todo._id); 
//   });

//   return taskElement;
// }
function createTaskElement(todo) {
  const taskElement = document.createElement('div');
  taskElement.className = 'task-item group px-4 py-2.5 rounded-lg mb-1.5 cursor-pointer flex items-center gap-3 transition-all duration-200 hover:bg-dark-hover';
  taskElement.dataset.taskId = todo._id;
  taskElement.dataset.list = todo.list || 'Personal';

  taskElement.innerHTML = `
    <div class="checkbox ${todo.completed ? 'checked' : ''} w-5 h-5 border-2 border-dark-border rounded-full flex items-center justify-center transition-colors duration-200 ${todo.completed ? 'bg-blue-500 border-blue-500' : ''}">
      ${todo.completed ? '<i class="fas fa-check text-white text-xs"></i>' : ''}
    </div>
    <span class="${todo.completed ? 'line-through text-gray-500' : 'text-gray-200'} flex-grow text-sm">${todo.title}</span>
    <button class="delete-task-btn opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all duration-200 mr-1">
      <i class="fas fa-trash"></i>
    </button>
  `;

  taskElement.addEventListener('click', (e) => {
    if (!e.target.closest('.checkbox') && !e.target.closest('.delete-task-btn')) {
      loadTaskDetails(todo);
    } 
  });
  
  const checkbox = taskElement.querySelector('.checkbox');
  checkbox.addEventListener('click', (e) => {
    e.stopPropagation(); 
    // Update the UI immediately before calling toggleTaskCompletion
    const newCompletedState = !todo.completed;
    const taskText = taskElement.querySelector('span');
    
    if (newCompletedState) {
      checkbox.classList.add('checked', 'bg-blue-500', 'border-blue-500');
      checkbox.innerHTML = '<i class="fas fa-check text-white text-xs"></i>';
      taskText.classList.add('line-through', 'text-gray-500');
      taskText.classList.remove('text-gray-200');
    } else {
      checkbox.classList.remove('checked', 'bg-blue-500', 'border-blue-500');
      checkbox.innerHTML = '';
      taskText.classList.remove('line-through', 'text-gray-500');
      taskText.classList.add('text-gray-200');
    }
    
    // Now call toggleTaskCompletion to update the backend
    toggleTaskCompletion(todo._id, newCompletedState);
  });
  
  const deleteBtn = taskElement.querySelector('.delete-task-btn');
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation(); 
    deleteTask(todo._id); 
  });

  return taskElement;
}

function toggleTaskCompletion(taskId, completed) {
  console.log(`Toggling task ${taskId} completion to ${completed}`);
  
  // First, update the local cache and UI immediately for responsive UX
  const taskIndex = localTaskCache.findIndex(task => task._id === taskId);
  if (taskIndex !== -1) {
    localTaskCache[taskIndex].completed = completed;
    saveTaskCacheToLocalStorage();
    console.log(`Updated task completion in local cache`);
    
    // Update UI element if it exists
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    if (taskElement) {
      const checkbox = taskElement.querySelector('.checkbox');
      const taskText = taskElement.querySelector('span');
      
      if (completed) {
        checkbox.classList.add('checked', 'bg-blue-500', 'border-blue-500');
        checkbox.innerHTML = '<i class="fas fa-check text-white text-xs"></i>';
        taskText.classList.add('line-through', 'text-gray-500');
        taskText.classList.remove('text-gray-200');
      } else {
        checkbox.classList.remove('checked', 'bg-blue-500', 'border-blue-500');
        checkbox.innerHTML = '';
        taskText.classList.remove('line-through', 'text-gray-500');
        taskText.classList.add('text-gray-200');
      }
    }
  }

  // Determine if this is a local task or server task
  if (taskId.startsWith('local_')) {
    // Local task - no need to sync with server
    console.log(`Skipping server update for local task: ${taskId}`);
    return;
  }
  
  // Server task - attempt to sync with server
  fetch(`/todos/${taskId}/complete`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed })
  })
    .then(res => {
      if (!res.ok) {
        console.error(`Server error when updating task completion status: ${res.status}`);
        return null;
      }
      return res.json();
    })
    .then(updatedTask => {
      if (updatedTask) { 
        const taskIndex = localTaskCache.findIndex(task => task._id === taskId);
        if (taskIndex !== -1) {
          // Preserve the completed status we just set
          const currentCompleted = localTaskCache[taskIndex].completed;
          localTaskCache[taskIndex] = updatedTask;
          localTaskCache[taskIndex].completed = currentCompleted;
          saveTaskCacheToLocalStorage();
        }
      }
    })
    .catch(error => console.error('Error updating task completion status:', error));
}

async function deleteTask(taskId) {
  try {
    console.log('Attempting to delete task with ID:', taskId);
    
    // First, update the local cache
    const taskIndex = localTaskCache.findIndex(task => task._id === taskId);
    let list = 'Personal'; // Default list name
    
    if (taskIndex !== -1) {
      // Save the list name before removing from cache
      list = localTaskCache[taskIndex].list || 'Personal';
      localTaskCache.splice(taskIndex, 1);
      saveTaskCacheToLocalStorage();
      console.log(`Removed task ${taskId} from local cache`);
    } else {
      console.log(`Task ${taskId} not found in local cache`);
    }
    
    // Then update UI by removing the element
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    if (taskElement) {
      // Get the list from the DOM element if available
      list = taskElement.dataset.list || list;
      
      // Remove the task from the DOM with animation
      taskElement.classList.add('opacity-0', 'scale-95');
      setTimeout(() => {
        taskElement.remove();
        console.log(`Removed task ${taskId} from DOM`);
        
        // Update the task count
        updateTaskCount(list, -1);
      }, 200);
    } else {
      console.log(`Task element with ID ${taskId} not found in DOM`);
      // If taskId wasn't found, try to match based on task properties
      if (taskIndex !== -1) {
        // We already removed it from cache, so we need to update counts
        updateTaskCount(list, -1);
      }
    }
    
    // Clear the task details if this was the selected task
    if (window.currentTaskId === taskId) {
      const titleElement = document.querySelector('#right-panel h2');
      const descriptionElement = document.querySelector('#right-panel .text-gray-400');
      const subtasksList = document.getElementById('subtasksList');
      
      if (titleElement) titleElement.textContent = '';
      if (descriptionElement) descriptionElement.textContent = '';
      if (subtasksList) subtasksList.innerHTML = '';
      
      const imagePreviewContainer = document.getElementById('imagePreviewContainer');
      if (imagePreviewContainer) {
        imagePreviewContainer.innerHTML = '';
      }
      window.currentTaskId = null;
    }
    
    // For local tasks, no server communication needed
    if (taskId.startsWith('local_')) {
      console.log(`Skipping server delete for local task: ${taskId}`);
      
      // Refresh the current task list view
      setTimeout(() => {
        const currentList = document.querySelector('h1')?.textContent.replace(' tasks', '') || 'Personal';
        filterTasks(currentList);
      }, 300);
      
      return;
    }
    
    // For server tasks, attempt to delete from server
    try {
      const response = await fetch(`/todos/${taskId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        console.error(`Server error when deleting task: ${response.status}`);
        // Even if server delete fails, we keep the task deleted from UI for better UX
      } else {
        console.log(`Successfully deleted task ${taskId} from server`);
      }
    } catch (error) {
      console.error('Network error when deleting task:', error);
      // Even if network error occurs, we keep the task deleted from UI
    }
    
    // Always refresh the current list view at the end
    setTimeout(() => {
      const currentList = document.querySelector('h1')?.textContent.replace(' tasks', '') || 'Personal';
      filterTasks(currentList);
    }, 300);
    
  } catch (error) {
    console.error('Error in deleteTask function:', error);
  }
}

