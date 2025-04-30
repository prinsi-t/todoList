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

function saveTaskCacheToLocalStorage() {
  localStorage.setItem('taskCache', JSON.stringify(localTaskCache));
}

// async function loadTasksFromServer() {
//   // First load from local storage
//   const savedCache = localStorage.getItem('taskCache');
//   if (savedCache) {
//     try {
//       localTaskCache = JSON.parse(savedCache);
//       updateAllListCounts(localTaskCache);
//     } catch (e) {
//       console.error('Error parsing saved task cache:', e);
//     }
//   }

//   try {
//     const response = await fetch('/todos/all');
//     if (response.ok) {
//       const serverTasks = await response.json();
      
//       // Create a map of server tasks by ID for quick lookup
//       const serverTaskMap = {};
//       serverTasks.forEach(task => {
//         serverTaskMap[task._id] = task;
//       });
      
//       // Create a map of server tasks by title+list for duplicate checking
//       const serverTaskTitleMap = {};
//       serverTasks.forEach(task => {
//         const key = `${task.title}|${task.list}`;
//         serverTaskTitleMap[key] = task;
//       });
      
//       // Preserve completion status from local tasks
//       serverTasks.forEach(serverTask => {
//         const localTask = localTaskCache.find(lt => lt._id === serverTask._id);
//         if (localTask) {
//           // Preserve completion status
//           serverTask.completed = localTask.completed;
          
//           // Preserve subtasks if any
//           if (localTask.subtasks && localTask.subtasks.length > 0) {
//             serverTask.subtasks = localTask.subtasks;
//           }
//         }
//       });
      
//       // Identify local tasks that need to be preserved
//       const localOnlyTasks = localTaskCache.filter(localTask => {
//         // If it's a local_ task, check if there's a similar task on server
//         if (localTask._id.startsWith('local_')) {
//           const key = `${localTask.title}|${localTask.list}`;
//           return !serverTaskTitleMap[key]; // Keep if no server equivalent
//         }
//         // For regular tasks, keep if not found on server
//         return !serverTaskMap[localTask._id];
//       });
      
//       console.log('Preserving local tasks:', localOnlyTasks.length);
      
//       // Combine server tasks with local-only tasks
//       const mergedTasks = [...serverTasks, ...localOnlyTasks];
//       localTaskCache = mergedTasks;
      
//       // Save the merged cache to localStorage
//       saveTaskCacheToLocalStorage();
      
//       // Update counts for all lists
//       updateAllListCounts(localTaskCache);
      
//       // Refresh the current list view
//       const currentList = document.querySelector('h1')?.textContent.replace(' tasks', '') || 'Personal';
//       filterTasks(currentList);
//     } else {
//       console.error('Server returned error:', response.status);
//     }
//   } catch (error) {
//     console.error('Error loading tasks from server:', error);
//     // If server is unreachable, keep using the local cache
//     console.log('Using cached tasks due to server error');
//   }
// }
async function loadTasksFromServer() {
  // First load from local storage
  const savedCache = localStorage.getItem('taskCache');
  if (savedCache) {
    try {
      localTaskCache = JSON.parse(savedCache);
      updateAllListCounts(localTaskCache);
    } catch (e) {
      console.error('Error parsing saved task cache:', e);
    }
  }

  try {
    const response = await fetch('/todos/all');
    if (response.ok) {
      const serverTasks = await response.json();
      
      // Create a map of server tasks by ID for quick lookup
      const serverTaskMap = {};
      serverTasks.forEach(task => {
        serverTaskMap[task._id] = task;
      });
      
      // Create a map of server tasks by title+list for duplicate checking
      const serverTaskTitleMap = {};
      serverTasks.forEach(task => {
        const key = `${task.title}|${task.list}`;
        serverTaskTitleMap[key] = task;
      });
      
      // Create a map of local tasks by ID for quick lookup of completion status
      const localTaskCompletionMap = {};
      localTaskCache.forEach(task => {
        localTaskCompletionMap[task._id] = task.completed;
        
        // Also map by title+list for local tasks
        if (task._id.startsWith('local_')) {
          const key = `${task.title}|${task.list}`;
          localTaskCompletionMap[key] = task.completed;
        }
      });
      
      // Preserve completion status from local tasks
      serverTasks.forEach(serverTask => {
        // Check if we have this task locally with the same ID
        if (localTaskCompletionMap[serverTask._id] !== undefined) {
          serverTask.completed = localTaskCompletionMap[serverTask._id];
        } else {
          // Check if we have a local version with the same title+list
          const key = `${serverTask.title}|${serverTask.list}`;
          if (localTaskCompletionMap[key] !== undefined) {
            serverTask.completed = localTaskCompletionMap[key];
          }
        }
        
        // Also preserve subtasks from local version if available
        const localTask = localTaskCache.find(lt => lt._id === serverTask._id);
        if (localTask && localTask.subtasks && localTask.subtasks.length > 0) {
          serverTask.subtasks = localTask.subtasks;
        }
      });
      
      // Identify local tasks that need to be preserved
      const localOnlyTasks = localTaskCache.filter(localTask => {
        // If it's a local_ task, check if there's a similar task on server
        if (localTask._id.startsWith('local_')) {
          const key = `${localTask.title}|${localTask.list}`;
          return !serverTaskTitleMap[key]; // Keep if no server equivalent
        }
        // For regular tasks, keep if not found on server
        return !serverTaskMap[localTask._id];
      });
      
      console.log('Preserving local tasks:', localOnlyTasks.length);
      
      // Combine server tasks with local-only tasks
      const mergedTasks = [...serverTasks, ...localOnlyTasks];
      localTaskCache = mergedTasks;
      
      // Save the merged cache to localStorage
      saveTaskCacheToLocalStorage();
      
      // Update counts for all lists
      updateAllListCounts(localTaskCache);
      
      // Refresh the current list view
      const currentList = document.querySelector('h1')?.textContent.replace(' tasks', '') || 'Personal';
      filterTasks(currentList);
    } else {
      console.error('Server returned error:', response.status);
    }
  } catch (error) {
    console.error('Error loading tasks from server:', error);
    // If server is unreachable, keep using the local cache
    console.log('Using cached tasks due to server error');
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

function createTaskElement(todo) {
  const taskElement = document.createElement('div');
  taskElement.className = 'task-item group px-4 py-2.5 rounded-lg mb-1.5 cursor-pointer flex items-center gap-3 transition-all duration-200 hover:bg-dark-hover';
  taskElement.dataset.taskId = todo._id;
  taskElement.dataset.list = todo.list;

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
    // Fix: Update the UI immediately before calling toggleTaskCompletion
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

function updateSubtaskCompletionStatus(subtaskId, completed) {
  if (!window.currentTaskId) return;
  
  const taskIndex = localTaskCache.findIndex(task => task._id === window.currentTaskId);
  if (taskIndex === -1 || !localTaskCache[taskIndex].subtasks) return;

  const subtaskIndex = localTaskCache[taskIndex].subtasks.findIndex(
    s => s.id === subtaskId || s.id === subtaskId.replace('index_', '') || `index_${s.id}` === subtaskId
  );
  
  if (subtaskIndex !== -1) {
    localTaskCache[taskIndex].subtasks[subtaskIndex].completed = completed;
    saveTaskCacheToLocalStorage();
    
    const subtaskData = {
      index: subtaskIndex,
      completed: completed
    };
    
    fetch(`/todos/${window.currentTaskId}/subtasks/${subtaskIndex}/complete`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subtaskData)
    })
      .catch(error => console.error('Error updating subtask completion:', error));
  }
}

function toggleTaskCompletion(taskId, completed) {
  const taskIndex = localTaskCache.findIndex(task => task._id === taskId);
  if (taskIndex !== -1) {
    localTaskCache[taskIndex].completed = completed;
    saveTaskCacheToLocalStorage();
    
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

  fetch(`/todos/${taskId}/complete`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed })
  })
    .then(res => {
      if (!res.ok) {
        console.error('Server error when updating task completion status');
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

function loadTaskDetails(todo) {
  if (!todo) {
    console.error('No todo object provided to loadTaskDetails');
    return;
  }

  console.log('Loading task details for:', todo);
  window.currentTaskId = todo._id;
  console.log('Set currentTaskId to:', window.currentTaskId);

  const titleElement = document.querySelector('#right-panel h2');
  const listElement = document.querySelector('#right-panel .text-gray-400');
  
  if (titleElement) titleElement.textContent = todo.title;
  if (listElement) listElement.textContent = todo.list;

  const subtasksList = document.getElementById('subtasksList');
  if (subtasksList) {
    subtasksList.innerHTML = '';
    
    if (todo.subtasks && todo.subtasks.length > 0) {
      todo.subtasks.forEach((subtask, index) => {
        const subtaskId = subtask.id || `index_${index}`;
        const subtaskElement = createSubtaskElement(subtask.text, subtaskId, subtask.completed);
        subtasksList.appendChild(subtaskElement);
      });
    }
  }

  if (typeof displayAttachments === 'function') {
    displayAttachments(todo.attachments || []);
  }

  applyBlurEffect(todo.completed);
}

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

function updateTaskCompletionStatus(taskId, completed) {
  const taskIndex = localTaskCache.findIndex(task => task._id === taskId);
  if (taskIndex !== -1) {
    
    localTaskCache[taskIndex].completed = completed;
    saveTaskCacheToLocalStorage();

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

    fetch(`/todos/${taskId}/complete`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed })
    }).catch(error => console.error('Error updating task completion status:', error));
  }
}

function loadTaskDetails(todo) {
  if (!todo) {
    console.error('No todo object provided to loadTaskDetails');
    return;
  }

  console.log('Loading task details for:', todo);
  window.currentTaskId = todo._id;
  console.log('Set currentTaskId to:', window.currentTaskId);

  const titleElement = document.querySelector('#right-panel h2');
  const listElement = document.querySelector('#right-panel .text-gray-400');
  
  if (titleElement) titleElement.textContent = todo.title;
  if (listElement) listElement.textContent = todo.list;

  const subtasksList = document.getElementById('subtasksList');
  if (subtasksList) {
    subtasksList.innerHTML = '';
    
    if (todo.subtasks && todo.subtasks.length > 0) {
      todo.subtasks.forEach((subtask, index) => {
        const subtaskId = subtask.id || `index_${index}`;
        const subtaskElement = createSubtaskElement(subtask.text, subtaskId, subtask.completed);
        subtasksList.appendChild(subtaskElement);
      });
    }
  }

  if (typeof displayAttachments === 'function') {
    displayAttachments(todo.attachments || []);
  }

  applyBlurEffect(todo.completed);
}

function createSubtaskElement(text, subtaskId, isCompleted = false) {
  const subtaskItem = document.createElement('div');
  subtaskItem.className = 'flex items-center gap-2 bg-dark-hover px-3 py-2 rounded-lg border border-dark-border';
  subtaskItem.dataset.subtaskId = subtaskId;

  subtaskItem.innerHTML = `
    <div class="checkbox w-5 h-5 border-2 border-dark-border rounded-full flex items-center justify-center transition-colors duration-200 cursor-pointer ${isCompleted ? 'bg-blue-500 border-blue-500' : ''}">
      <i class="fas fa-check text-white text-xs" style="${isCompleted ? '' : 'display: none;'}"></i>
    </div>
    <span class="text-sm flex-grow ${isCompleted ? 'line-through text-gray-500' : 'text-gray-200'}">${text}</span>
    <button class="text-red-400 hover:text-red-500 text-xs delete-subtask">
      <i class="fas fa-trash"></i>
    </button>
  `;

  const checkbox = subtaskItem.querySelector('.checkbox');
  const checkIcon = checkbox.querySelector('.fa-check');
  const textSpan = subtaskItem.querySelector('span');

  checkbox.addEventListener('click', () => {

    const isChecked = checkbox.classList.contains('bg-blue-500');
    
    if (isChecked) {
      checkbox.classList.remove('bg-blue-500', 'border-blue-500');
      checkIcon.style.display = 'none';
      textSpan.classList.remove('line-through', 'text-gray-500');
      textSpan.classList.add('text-gray-200');
      
      updateSubtaskCompletionStatus(subtaskItem.dataset.subtaskId, false);
    } else {
      checkbox.classList.add('bg-blue-500', 'border-blue-500');
      checkIcon.style.display = '';
      textSpan.classList.add('line-through', 'text-gray-500');
      textSpan.classList.remove('text-gray-200');
    
      updateSubtaskCompletionStatus(subtaskItem.dataset.subtaskId, true);
    }
  });

  subtaskItem.querySelector('.delete-subtask').addEventListener('click', () => {
    deleteSubtask(subtaskItem.dataset.subtaskId);
    subtaskItem.remove();
  });

  return subtaskItem;
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

async function deleteTask(taskId) {
  try {
    const taskIndex = localTaskCache.findIndex(task => task._id === taskId);
    if (taskIndex !== -1) {
      const list = localTaskCache[taskIndex].list;
      localTaskCache.splice(taskIndex, 1);
      saveTaskCacheToLocalStorage(); // Save the updated cache
      updateTaskCount(list, -1);
    }

    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    if (taskElement) {
      taskElement.classList.add('opacity-0', 'scale-95');
      setTimeout(() => {
        taskElement.remove();
        if (window.currentTaskId === taskId) {
          document.querySelector('#right-panel h2').textContent = '';
          document.querySelector('#right-panel .text-gray-400').textContent = '';
          document.getElementById('subtasksList').innerHTML = '';
          const imagePreviewContainer = document.getElementById('imagePreviewContainer');
          if (imagePreviewContainer) imagePreviewContainer.innerHTML = '';
          window.currentTaskId = null;
        }
      }, 200);
    }

    if (!taskId.startsWith('local_')) {
      const response = await fetch(`/todos/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('Server error when deleting task:', response.status);
      }
    } else {
      console.log('Skipping server delete for local task:', taskId);
    }
  } catch (error) {
    console.error('Error deleting task:', error);
  }
}

function deleteSubtask(subtaskId) {
  if (window.currentTaskId) {
    const taskIndex = localTaskCache.findIndex(task => task._id === window.currentTaskId);
    if (taskIndex !== -1 && localTaskCache[taskIndex].subtasks) {
     
      const subtaskIndex = localTaskCache[taskIndex].subtasks.findIndex(s => 
        s.id === subtaskId || s.id === subtaskId.replace('index_', '') || `index_${s.id}` === subtaskId
      );
      
      if (subtaskIndex !== -1) {
        localTaskCache[taskIndex].subtasks.splice(subtaskIndex, 1);
        saveTaskCacheToLocalStorage();
        
        fetch(`/todos/${window.currentTaskId}/subtasks/${subtaskIndex}`, { method: 'DELETE' })
          .then(res => {
            if (res.ok) return res.json();
            return null;
          })
          .then(updatedTodo => {
            if (updatedTodo && taskIndex !== -1) {
              localTaskCache[taskIndex] = updatedTodo;
              saveTaskCacheToLocalStorage();
            }
          })
          .catch(error => console.error('Error deleting subtask:', error));
      }
    }
  } else {
    const localSubtasks = JSON.parse(localStorage.getItem('localSubtasks') || '[]');
    const updatedSubtasks = localSubtasks.filter(s => s.id !== subtaskId);
    localStorage.setItem('localSubtasks', JSON.stringify(updatedSubtasks));
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
  
  window.currentTaskId = null;
  
  const taskList = document.getElementById('taskList');
  if (!taskList) return;
  taskList.innerHTML = '';

  // Filter tasks for the current list and display them
  const listTasks = localTaskCache.filter(todo => todo.list === list);
  listTasks.forEach(todo => {
    taskList.appendChild(createTaskElement(todo));
  });
  
  // Update the count for this list with the exact number of tasks
  updateTaskCount(list, 0, listTasks.length);
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

function moveTaskToList(taskId, newList) {
  const taskIndex = localTaskCache.findIndex(task => task._id === taskId);
  if (taskIndex !== -1) {
    const oldList = localTaskCache[taskIndex].list;
    localTaskCache[taskIndex].list = newList;
 
    updateTaskCount(oldList, -1);
    updateTaskCount(newList, 1);
    saveTaskCacheToLocalStorage();
  }

  fetch(`/todos/${taskId}/move`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ list: newList })
  })
    .then(res => {
      if (!res.ok) {
        console.error('Server error when moving task');
        return;
      }
      return res.json();
    })
    .then(() => {
      const currentList = document.querySelector('h1').textContent.replace(' tasks', '');
      filterTasks(currentList);
    })
    .catch(error => console.error('Error moving task:', error));
}



async function handleAddTask(e) {
  e.preventDefault();
  const input = document.getElementById('newTaskInput');
  if (!input) {
    console.error('Could not find newTaskInput element');
    return;
  }
  
  const title = input.value.trim();
  if (!title) {
    console.error('Task title is empty');
    return;
  }

  const currentList = document.querySelector('h1').textContent.replace(' tasks', '');
  
  const newTask = {
    _id: 'local_' + Date.now(),
    title,
    list: currentList,
    completed: false,
    subtasks: [],
    attachments: []
  };

  localTaskCache.push(newTask);
  saveTaskCacheToLocalStorage();
  
  const taskElement = createTaskElement(newTask);
  const taskList = document.getElementById('taskList');
  if (taskList) {
    taskList.insertAdjacentElement('afterbegin', taskElement);
    updateTaskCount(currentList, +1);
  }
  
  input.value = '';

  try {
    const response = await fetch('/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, list: currentList, completed: false })
    });
    
    if (response.ok) {
      const serverTask = await response.json();
 
      const taskIndex = localTaskCache.findIndex(t => t._id === newTask._id);
      if (taskIndex !== -1) {
        localTaskCache[taskIndex] = serverTask;
        saveTaskCacheToLocalStorage();
       
        if (taskElement) {
          taskElement.dataset.taskId = serverTask._id;
        }
      }
    } else {
      console.error('Failed to save task to server:', response.status);
    }
  } catch (error) {
    console.error('Error syncing task with server:', error);
  }
}

function addSubtask() {
  const subtaskInput = document.getElementById('subtaskInput');
  const subtaskText = subtaskInput.value.trim();
  
  if (!subtaskText) return;
  const subtaskId = 'subtask_' + Date.now();

  const newSubtask = {
    id: subtaskId,
    text: subtaskText,
    completed: false
  };

  const subtasksList = document.getElementById('subtasksList');
  if (!subtasksList) return;
  
  const subtaskElement = createSubtaskElement(subtaskText, subtaskId);
  subtasksList.appendChild(subtaskElement);

  subtaskInput.value = '';
 
  if (window.currentTaskId) {
    const taskIndex = localTaskCache.findIndex(task => task._id === window.currentTaskId);
    
    if (taskIndex !== -1) {
      if (!localTaskCache[taskIndex].subtasks) {
        localTaskCache[taskIndex].subtasks = [];
      }
      
      localTaskCache[taskIndex].subtasks.push(newSubtask);
    
      saveTaskCacheToLocalStorage();
      
      fetch(`/todos/${window.currentTaskId}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: subtaskText })
      })
        .then(res => res.ok ? res.json() : null)
        .then(updatedTodo => {
          if (updatedTodo) {
            localTaskCache[taskIndex] = updatedTodo;
            saveTaskCacheToLocalStorage();
          }
        })
        .catch(error => console.error('Error adding subtask:', error));
    }
  } else {
    const localSubtasks = JSON.parse(localStorage.getItem('localSubtasks') || '[]');
    localSubtasks.push(newSubtask);
    localStorage.setItem('localSubtasks', JSON.stringify(localSubtasks));
  }
}

function loadLocalSubtasks() {
  const subtasksList = document.getElementById('subtasksList');
  if (!subtasksList) return;
  
  const localSubtasks = JSON.parse(localStorage.getItem('localSubtasks') || '[]');
  if (localSubtasks.length > 0) {
    localSubtasks.forEach(subtask => {
      const subtaskElement = createSubtaskElement(
        subtask.text, 
        subtask.id, 
        subtask.completed || false
      );
      subtasksList.appendChild(subtaskElement);
    });
  }
}

function setupFileUpload() {
  console.log('Setting up file upload functionality');
  
  const dropZones = Array.from(document.querySelectorAll('div')).filter(div => {
 
    const computedStyle = window.getComputedStyle(div);
    const borderStyle = computedStyle.borderStyle;
    return borderStyle === 'dashed' || div.classList.contains('dashed-border');
  });

  let dropZone = null;
  for (const div of dropZones) {
    const parentText = div.parentElement ? div.parentElement.textContent : '';
    if (div.textContent.includes('Click to add / drop') || 
        parentText.includes('ATTACHMENTS')) {
      dropZone = div;
      break;
    }
  }

  if (!dropZone) {
    dropZone = Array.from(document.querySelectorAll('div')).find(div => 
      div.textContent && div.textContent.includes('Click to add / drop your files here'));
  }
  
  if (!dropZone) {
    console.error('Drop zone element not found');
    return;
  }
 
  let fileInput = document.getElementById('fileUploadInput');
  if (!fileInput) {
    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    fileInput.id = 'fileUploadInput';
    document.body.appendChild(fileInput);
  }
 
  dropZone.addEventListener('click', () => {
    console.log('Drop zone clicked, opening file dialog');
    fileInput.click();
  });
  
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  });
  
  dropZone.addEventListener('dragenter', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('border-blue-500');
  });
  
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('border-blue-500');
  });
  
  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('border-blue-500');
  });
  
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('border-blue-500');
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  });

  let imagePreviewContainer = document.getElementById('imagePreviewContainer');
  if (!imagePreviewContainer) {
    imagePreviewContainer = document.createElement('div');
    imagePreviewContainer.id = 'imagePreviewContainer';
    imagePreviewContainer.className = 'flex flex-wrap mt-4 gap-2';
    dropZone.parentNode.insertBefore(imagePreviewContainer, dropZone.nextSibling);
  }
}

function handleFiles(files) {
  if (!files || files.length === 0) {
    console.error('No files to handle');
    return;
  }
  
  console.log('Handling files:', files);
  
  const imagePreviewContainer = document.getElementById('imagePreviewContainer');
  if (!imagePreviewContainer) {
    console.error('Image preview container not found');
    return;
  }
  
  const maxFiles = 10;
  const currentAttachments = imagePreviewContainer.querySelectorAll('.attachment-item').length;
  
  if (currentAttachments >= maxFiles) {
    alert('Maximum number of attachments (10) reached');
    return;
  }
  
  const filesToProcess = files.slice(0, maxFiles - currentAttachments);
  
  filesToProcess.forEach(file => {
    if (!file.type.startsWith('image/')) {
      console.log('Skipping non-image file:', file.name);
      return;
    }
    
    console.log('Processing file:', file.name);
    
    const reader = new FileReader();
    reader.onload = function(e) {
      console.log('File read complete');
      const attachmentItem = document.createElement('div');
      attachmentItem.className = 'attachment-item relative rounded-lg overflow-hidden border border-dark-border w-32';
      
      attachmentItem.innerHTML = `
        <img src="${e.target.result}" alt="${file.name}" class="w-full h-24 object-cover">
        <div class="absolute top-1 right-1">
          <button class="delete-attachment bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center">
            <i class="fas fa-times text-xs"></i>
          </button>
        </div>
        <div class="p-2 text-xs text-gray-300 truncate bg-dark-hover">${file.name}</div>
      `;
     
      attachmentItem.querySelector('.delete-attachment').addEventListener('click', () => {
        attachmentItem.remove();
      });
      
      imagePreviewContainer.appendChild(attachmentItem);
      console.log('Attachment item added to DOM');
      
      if (window.currentTaskId) {
        uploadFileToServer(file, window.currentTaskId);
      } else {
        storeFileLocally(file.name, e.target.result);
      }
    };
    
    reader.onerror = function(err) {
      console.error('Error reading file:', err);
    };
    
    reader.readAsDataURL(file);
  });
}

function uploadFileToServer(file, taskId) {
  console.log('Uploading file to server:', file.name);
  const formData = new FormData();
  formData.append('file', file);
  
  fetch(`/todos/${taskId}/attachments`, {
    method: 'POST',
    body: formData
  })
    .then(res => {
      console.log('Upload response status:', res.status);
      if (!res.ok) {
        console.error('Server error when uploading attachment');
        return null;
      }
      return res.json();
    })
    .then(updatedTodo => {
      if (updatedTodo) {
       const taskIndex = localTaskCache.findIndex(task => task._id === taskId);
        if (taskIndex !== -1) {
          localTaskCache[taskIndex] = updatedTodo;
          saveTaskCacheToLocalStorage();
        }
      }
    })
    .catch(error => console.error('Error uploading attachment:', error));
}

function storeFileLocally(fileName, dataUrl) {
  console.log('Storing file locally:', fileName);
  const localAttachments = JSON.parse(localStorage.getItem('localAttachments') || '[]');
  localAttachments.push({
    id: 'attachment_' + Date.now(),
    name: fileName,
    dataUrl: dataUrl
  });
  localStorage.setItem('localAttachments', JSON.stringify(localAttachments));
}

function displayAttachments(attachments) {
  const imagePreviewContainer = document.getElementById('imagePreviewContainer');
  if (!imagePreviewContainer) return;
  
  imagePreviewContainer.innerHTML = '';

  if (attachments && attachments.length > 0) {
    attachments.forEach(attachment => {
      const attachmentItem = document.createElement('div');
      attachmentItem.className = 'attachment-item relative rounded-lg overflow-hidden border border-dark-border m-2';
      
      const imageSrc = attachment.path ? 
        `/uploads/${attachment.filename || attachment.path.split('/').pop()}` : 
        attachment.url;
      
      attachmentItem.innerHTML = `
        <img src="${imageSrc}" alt="${attachment.originalname || attachment.name}" class="w-full h-24 object-cover">
        <div class="absolute top-1 right-1">
          <button class="delete-attachment bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center" data-id="${attachment._id || attachment.id}">
            <i class="fas fa-times text-xs"></i>
          </button>
        </div>
        <div class="p-2 text-xs text-gray-300 truncate bg-dark-hover">${attachment.originalname || attachment.name}</div>
      `;
     
      attachmentItem.querySelector('.delete-attachment').addEventListener('click', (e) => {
        const attachmentId = e.currentTarget.dataset.id;
        deleteAttachment(window.currentTaskId, attachmentId);
        attachmentItem.remove();
      });
      
      imagePreviewContainer.appendChild(attachmentItem);
    });
  }

  if (!window.currentTaskId) {
    const localAttachments = JSON.parse(localStorage.getItem('localAttachments') || '[]');
    localAttachments.forEach(attachment => {
      const attachmentItem = document.createElement('div');
      attachmentItem.className = 'attachment-item relative rounded-lg overflow-hidden border border-dark-border m-2';
      
      attachmentItem.innerHTML = `
        <img src="${attachment.dataUrl}" alt="${attachment.name}" class="w-full h-24 object-cover">
        <div class="absolute top-1 right-1">
          <button class="delete-attachment bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center" data-id="${attachment.id}">
            <i class="fas fa-times text-xs"></i>
          </button>
        </div>
        <div class="p-2 text-xs text-gray-300 truncate bg-dark-hover">${attachment.name}</div>
      `;
    
      attachmentItem.querySelector('.delete-attachment').addEventListener('click', (e) => {
        const attachmentId = e.currentTarget.dataset.id;
        deleteLocalAttachment(attachmentId);
        attachmentItem.remove();
      });
      
      imagePreviewContainer.appendChild(attachmentItem);
    });
  }
}

function deleteAttachment(taskId, attachmentId) {
  if (!taskId || !attachmentId) return;
  
  fetch(`/todos/${taskId}/attachments/${attachmentId}`, {
    method: 'DELETE'
  })
    .then(res => {
      if (!res.ok) {
        console.error('Server error when deleting attachment');
        return null;
      }
      return res.json();
    })
    .then(updatedTodo => {
      if (updatedTodo) {
        const taskIndex = localTaskCache.findIndex(task => task._id === taskId);
        if (taskIndex !== -1) {
          localTaskCache[taskIndex] = updatedTodo;
        }
      }
    })
    .catch(error => console.error('Error deleting attachment:', error));
}


function deleteLocalAttachment(attachmentId) {
  const localAttachments = JSON.parse(localStorage.getItem('localAttachments') || '[]');
  const updatedAttachments = localAttachments.filter(a => a.id !== attachmentId);
  localStorage.setItem('localAttachments', JSON.stringify(updatedAttachments));
}


