// Fixed subtaskManager.js - Permanent Subtask Deletion

function isLocalTaskId(taskId) {
  return taskId && (taskId.startsWith('local_') || taskId.indexOf('_') > -1);
}

// Standardized subtask object format
function normalizeSubtask(subtask) {
  if (!subtask) return null;
  
  return {
    id: subtask.id || `subtask_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    text: (subtask.text && typeof subtask.text === 'string' && subtask.text !== 'undefined')
      ? subtask.text
      : (subtask.title && typeof subtask.title === 'string' && subtask.title !== 'undefined')
        ? subtask.title
        : 'New subtask',
    title: (subtask.title && typeof subtask.title === 'string' && subtask.title !== 'undefined')
      ? subtask.title
      : (subtask.text && typeof subtask.text === 'string' && subtask.text !== 'undefined')
        ? subtask.text
        : 'New subtask',
    completed: !!subtask.completed
  };
}

// Safely parse JSON from localStorage
function safeParseJSON(key, defaultValue = []) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : defaultValue;
  } catch (error) {
    console.error(`Error parsing JSON from localStorage key ${key}:`, error);
    return defaultValue;
  }
}

// Update completion status of a subtask
function updateSubtaskCompletionStatus(subtaskId, completed) {
  if (!window.currentTaskId) {
    const localSubtasks = safeParseJSON('localSubtasks', []);
    const subtaskIndex = localSubtasks.findIndex(s => s.id === subtaskId);
    if (subtaskIndex !== -1) {
      localSubtasks[subtaskIndex].completed = completed;
      localStorage.setItem('localSubtasks', JSON.stringify(localSubtasks));
    }
    return;
  }

  const taskIndex = localTaskCache.findIndex(task => task._id === window.currentTaskId);
  if (taskIndex === -1 || !localTaskCache[taskIndex].subtasks) return;

  const subtaskIndex = localTaskCache[taskIndex].subtasks.findIndex(
    s => s.id === subtaskId || s.id === subtaskId.replace('index_', '') || `index_${s.id}` === subtaskId
  );

  if (subtaskIndex !== -1) {
    // Update in memory cache
    localTaskCache[taskIndex].subtasks[subtaskIndex].completed = completed;
    saveTaskCacheToLocalStorage();

    // Update in DOM
    const subtaskElement = document.querySelector(`[data-subtask-id="${subtaskId}"]`);
    if (subtaskElement) {
      updateSubtaskElementUI(subtaskElement, completed);
    }

    // Update in localStorage
    const taskSubtasksKey = `subtasks_${window.currentTaskId}`;
    let taskSubtasks = safeParseJSON(taskSubtasksKey, []);
    const localSubtaskIndex = taskSubtasks.findIndex(s => s.id === subtaskId);

    if (localSubtaskIndex !== -1) {
      taskSubtasks[localSubtaskIndex].completed = completed;
    } else {
      const subtask = normalizeSubtask(localTaskCache[taskIndex].subtasks[subtaskIndex]);
      subtask.completed = completed;
      taskSubtasks.push(subtask);
    }

    localStorage.setItem(taskSubtasksKey, JSON.stringify(taskSubtasks));

    // Update on server
    fetch(`/todos/${window.currentTaskId}/subtasks/${subtaskIndex}/complete`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index: subtaskIndex, completed })
    })
      .then(res => res.ok ? res.json() : null)
      .then(updatedTask => {
        if (updatedTask) {
          // Process the server response
          if (updatedTask.subtasks && updatedTask.subtasks.length > 0) {
            // Normalize all subtasks to ensure consistency
            updatedTask.subtasks = updatedTask.subtasks
              .map(s => normalizeSubtask(s))
              .filter(s => s !== null);
              
            // Make sure the specific subtask has the proper completion state
            if (updatedTask.subtasks.length > subtaskIndex) {
              updatedTask.subtasks[subtaskIndex].completed = completed;
            }
          }
          
          // Update cache with normalized server data
          localTaskCache[taskIndex] = updatedTask;
          saveTaskCacheToLocalStorage();
          updateTaskSubtasksInLocalStorage(updatedTask);
        }
      })
      .catch(err => {
        console.error('Error updating subtask completion:', err);
      });
  }
}

// Update the UI for a subtask element
function updateSubtaskElementUI(subtaskElement, completed) {
  const checkbox = subtaskElement.querySelector('.checkbox');
  const checkIcon = checkbox.querySelector('.fa-check');
  const textSpan = subtaskElement.querySelector('span');

  if (completed) {
    checkbox.classList.add('bg-blue-500', 'border-blue-500');
    checkIcon.style.display = '';
    textSpan.classList.add('line-through', 'text-gray-500');
    textSpan.classList.remove('text-gray-200');
  } else {
    checkbox.classList.remove('bg-blue-500', 'border-blue-500');
    checkIcon.style.display = 'none';
    textSpan.classList.remove('line-through', 'text-gray-500');
    textSpan.classList.add('text-gray-200');
  }

  subtaskElement.dataset.completed = completed ? 'true' : 'false';
}

// Create a subtask element in the DOM
function createSubtaskElement(text, subtaskId, isCompleted = false) {
  // Process the subtask data
  const subtask = normalizeSubtask({
    id: subtaskId,
    text: text,
    completed: isCompleted
  });
  
  // Create the subtask element
  const subtaskItem = document.createElement('div');
  subtaskItem.className = 'flex items-center gap-2 bg-dark-hover px-3 py-2 rounded-lg border border-dark-border';
  subtaskItem.dataset.subtaskId = subtask.id;
  subtaskItem.dataset.completed = subtask.completed ? 'true' : 'false';
  subtaskItem.dataset.text = subtask.text; // Store text in dataset for recovery

  // Using consistent class names for the delete button to maintain appearance after refresh
  subtaskItem.innerHTML = `
    <div class="checkbox w-5 h-5 border-2 border-dark-border rounded-full flex items-center justify-center transition-colors duration-200 cursor-pointer ${subtask.completed ? 'bg-blue-500 border-blue-500' : ''}">
      <i class="fas fa-check text-white text-xs" style="${subtask.completed ? '' : 'display: none;'}"></i>
    </div>
    <span class="text-sm flex-grow ${subtask.completed ? 'line-through text-gray-500' : 'text-gray-200'}">${subtask.text}</span>
    <button class="text-red-400 hover:text-red-500 text-xs delete-subtask">
      <i class="fas fa-trash"></i>
    </button>
  `;

  // Set up event listeners for the checkbox
  const checkbox = subtaskItem.querySelector('.checkbox');
  checkbox.addEventListener('click', () => {
    const currentState = subtaskItem.dataset.completed === 'true';
    const newState = !currentState;
    
    // Update UI immediately for responsive feel
    updateSubtaskElementUI(subtaskItem, newState);
    
    // Update data
    updateSubtaskCompletionStatus(subtask.id, newState);
  });

  // Set up event listener for the delete button
  attachDeleteListener(subtaskItem);

  return subtaskItem;
}

// Function to attach delete event listener
function attachDeleteListener(subtaskItem) {
  const deleteBtn = subtaskItem.querySelector('.delete-subtask');
  if (deleteBtn) {
    // Remove any existing listeners first to prevent duplicates
    const newDeleteBtn = deleteBtn.cloneNode(true);
    deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);
    
    // Add the event listener
    newDeleteBtn.addEventListener('click', () => {
      const subtaskId = subtaskItem.dataset.subtaskId;
      deleteSubtask(subtaskId);
      subtaskItem.remove();

      const subtasksList = document.getElementById('subtasksList');
      if (subtasksList && subtasksList.children.length === 0) {
        showNoSubtasksMessage();
      }
    });
  }
}

// Add a new subtask
function addSubtask(listName) {
  // Get the active list if not provided
  if (!listName) {
    listName = localStorage.getItem('activeList') || 'Personal';
  }

  // Get the panel for this list
  const listId = listName.toLowerCase().replace(/\s+/g, '-');
  const panelId = `right-panel-${listId}`;
  const panel = document.getElementById(panelId);

  if (!panel) {
    console.error(`Panel not found for list: ${listName}`);
    return;
  }

  // Get the subtask input for this panel
  const subtaskInput = panel.querySelector('.subtask-input');
  if (!subtaskInput) {
    console.error(`Subtask input not found in panel: ${panelId}`);
    return;
  }

  const subtaskText = subtaskInput.value.trim();
  if (!subtaskText) return;

  const subtaskId = 'subtask_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  const newSubtask = normalizeSubtask({
    id: subtaskId,
    text: subtaskText,
    title: subtaskText,
    completed: false
  });

  // Get the subtasks list for this panel
  const subtasksList = panel.querySelector('.subtasks-list');
  if (!subtasksList) {
    console.error(`Subtasks list not found in panel: ${panelId}`);
    return;
  }

  // Hide any existing "No subtasks" message in THIS PANEL ONLY
  hideNoSubtasksMessage(panel);

  const subtaskElement = createSubtaskElement(newSubtask.text, newSubtask.id, newSubtask.completed);
  subtasksList.appendChild(subtaskElement);

  subtaskInput.value = '';

  if (window.currentTaskId) {
    const taskIndex = localTaskCache.findIndex(task => task._id === window.currentTaskId);

    if (taskIndex !== -1) {
      if (!localTaskCache[taskIndex].subtasks) {
        localTaskCache[taskIndex].subtasks = [];
      }

      // Add the new subtask to the cache
      localTaskCache[taskIndex].subtasks.push(newSubtask);
      saveTaskCacheToLocalStorage();

      // Update localStorage with the new subtask
      const taskSubtasksKey = `subtasks_${window.currentTaskId}`;
      let taskSubtasks = safeParseJSON(taskSubtasksKey, []);
      taskSubtasks.push(newSubtask);
      localStorage.setItem(taskSubtasksKey, JSON.stringify(taskSubtasks));

      // Send the new subtask to the server
      fetch(`/todos/${window.currentTaskId}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: newSubtask.text,
          title: newSubtask.title,
          id: newSubtask.id
        })
      })
        .then(res => res.ok ? res.json() : null)
        .then(updatedTodo => {
          if (updatedTodo) {
            // Process and normalize the server response
            if (!updatedTodo.subtasks) {
              updatedTodo.subtasks = [];
            }
            
            // Normalize all subtasks in the server response
            updatedTodo.subtasks = updatedTodo.subtasks
              .map(serverSubtask => normalizeSubtask(serverSubtask))
              .filter(s => s !== null);
            
            // Make sure our new subtask is in the response
            const hasNewSubtask = updatedTodo.subtasks.some(
              s => s.id === newSubtask.id || s.text === newSubtask.text
            );
            
            if (!hasNewSubtask) {
              updatedTodo.subtasks.push(newSubtask);
            }
            
            // Update the cache and localStorage
            localTaskCache[taskIndex] = updatedTodo;
            saveTaskCacheToLocalStorage();
            updateTaskSubtasksInLocalStorage(updatedTodo);
          }
        })
        .catch(error => console.error('Error adding subtask:', error));
    }
  } else {
    // Handle case where there's no current task
    const localSubtasks = safeParseJSON('localSubtasks', []);
    localSubtasks.push(newSubtask);
    localStorage.setItem('localSubtasks', JSON.stringify(localSubtasks));
  }
}

// Load subtasks for current task
// function loadSubtasksForCurrentTask() {
//   const subtasksList = document.getElementById('subtasksList');
//   if (!subtasksList || !window.currentTaskId) return;

//   // Clear the existing subtasks list
//   subtasksList.innerHTML = '';

//   // First try to load subtasks from localStorage
//   const taskSubtasksKey = `subtasks_${window.currentTaskId}`;
//   let taskSubtasks = safeParseJSON(taskSubtasksKey, []);
  
//   // Filter and normalize subtasks
//   taskSubtasks = taskSubtasks
//     .map(subtask => normalizeSubtask(subtask))
//     .filter(subtask => subtask !== null);
  
//   if (taskSubtasks.length > 0) {
//     console.log('Loading subtasks from localStorage:', taskSubtasks);
//     hideNoSubtasksMessage();
    
//     // Create and append subtask elements
//     taskSubtasks.forEach(subtask => {
//       const subtaskElement = createSubtaskElement(
//         subtask.text,
//         subtask.id,
//         subtask.completed
//       );
//       subtasksList.appendChild(subtaskElement);
//     });
    
//     // Ensure all delete buttons have proper event listeners
//     subtasksList.querySelectorAll('[data-subtask-id]').forEach(subtaskItem => {
//       attachDeleteListener(subtaskItem);
//     });
    
//     // Save normalized subtasks back to localStorage
//     localStorage.setItem(taskSubtasksKey, JSON.stringify(taskSubtasks));
//   } 
//   // If no subtasks in localStorage, try to get them from the cache
//   else {
//     const taskIndex = localTaskCache.findIndex(task => task._id === window.currentTaskId);
    
//     if (taskIndex !== -1 && localTaskCache[taskIndex].subtasks && 
//         Array.isArray(localTaskCache[taskIndex].subtasks) && 
//         localTaskCache[taskIndex].subtasks.length > 0) {
      
//       hideNoSubtasksMessage();
      
//       // Normalize subtasks from cache
//       const normalizedSubtasks = localTaskCache[taskIndex].subtasks
//         .map(subtask => normalizeSubtask(subtask))
//         .filter(subtask => subtask !== null);
      
//       // Update the cache with normalized subtasks
//       localTaskCache[taskIndex].subtasks = normalizedSubtasks;
//       saveTaskCacheToLocalStorage();
      
//       // Store normalized subtasks in localStorage
//       localStorage.setItem(taskSubtasksKey, JSON.stringify(normalizedSubtasks));
      
//       // Create and append subtask elements
//       normalizedSubtasks.forEach(subtask => {
//         const subtaskElement = createSubtaskElement(
//           subtask.text,
//           subtask.id,
//           subtask.completed
//         );
//         subtasksList.appendChild(subtaskElement);
//       });
      
//       // Ensure all delete buttons have proper event listeners
//       subtasksList.querySelectorAll('[data-subtask-id]').forEach(subtaskItem => {
//         attachDeleteListener(subtaskItem);
//       });
//     } else {
//       // If no subtasks found anywhere, show "no subtasks" message and fetch from server
//       showNoSubtasksMessage();
//       fetchTaskFromServer(window.currentTaskId);
//     }
//   }
// }
function loadSubtasksForCurrentTask() {
  const subtasksList = document.getElementById('subtasksList');
  if (!subtasksList || !window.currentTaskId) return;

  // Clear the existing subtasks list
  subtasksList.innerHTML = '';

  // Check if this is a local task
  if (isLocalTaskId(window.currentTaskId)) {
    console.log('Loading local subtasks for task:', window.currentTaskId);
    loadLocalSubtasks();
    return;
  }

  // First try to load subtasks from localStorage
  const taskSubtasksKey = `subtasks_${window.currentTaskId}`;
  let taskSubtasks = safeParseJSON(taskSubtasksKey, []);
  
  // Filter and normalize subtasks
  taskSubtasks = taskSubtasks
    .map(subtask => normalizeSubtask(subtask))
    .filter(subtask => subtask !== null);
  
  if (taskSubtasks.length > 0) {
    console.log('Loading subtasks from localStorage:', taskSubtasks);
    hideNoSubtasksMessage();
    
    // Create and append subtask elements
    taskSubtasks.forEach(subtask => {
      const subtaskElement = createSubtaskElement(
        subtask.text,
        subtask.id,
        subtask.completed
      );
      subtasksList.appendChild(subtaskElement);
    });
    
    // Ensure all delete buttons have proper event listeners
    subtasksList.querySelectorAll('[data-subtask-id]').forEach(subtaskItem => {
      attachDeleteListener(subtaskItem);
    });
    
    // Save normalized subtasks back to localStorage
    localStorage.setItem(taskSubtasksKey, JSON.stringify(taskSubtasks));
  } 
  // If no subtasks in localStorage, try to get them from the cache
  else {
    const taskIndex = localTaskCache.findIndex(task => task._id === window.currentTaskId);
    
    if (taskIndex !== -1 && localTaskCache[taskIndex].subtasks && 
        Array.isArray(localTaskCache[taskIndex].subtasks) && 
        localTaskCache[taskIndex].subtasks.length > 0) {
      
      hideNoSubtasksMessage();
      
      // Normalize subtasks from cache
      const normalizedSubtasks = localTaskCache[taskIndex].subtasks
        .map(subtask => normalizeSubtask(subtask))
        .filter(subtask => subtask !== null);
      
      // Update the cache with normalized subtasks
      localTaskCache[taskIndex].subtasks = normalizedSubtasks;
      saveTaskCacheToLocalStorage();
      
      // Store normalized subtasks in localStorage
      localStorage.setItem(taskSubtasksKey, JSON.stringify(normalizedSubtasks));
      
      // Create and append subtask elements
      normalizedSubtasks.forEach(subtask => {
        const subtaskElement = createSubtaskElement(
          subtask.text,
          subtask.id,
          subtask.completed
        );
        subtasksList.appendChild(subtaskElement);
      });
      
      // Ensure all delete buttons have proper event listeners
      subtasksList.querySelectorAll('[data-subtask-id]').forEach(subtaskItem => {
        attachDeleteListener(subtaskItem);
      });
    } else {
      // If no subtasks found anywhere, show "no subtasks" message and fetch from server
      showNoSubtasksMessage();
      
      // Only fetch from server if this is a server-side task
      if (!isLocalTaskId(window.currentTaskId)) {
        fetchTaskFromServer(window.currentTaskId);
      }
    }
  }
}

// Delete a subtask - FIXED VERSION
function deleteSubtask(subtaskId) {
  // First remove from DOM if still present
  const subtaskElement = document.querySelector(`[data-subtask-id="${subtaskId}"]`);
  if (subtaskElement) {
    subtaskElement.remove();
  }
  
  if (window.currentTaskId) {
    const taskIndex = localTaskCache.findIndex(task => task._id === window.currentTaskId);
    if (taskIndex !== -1 && localTaskCache[taskIndex].subtasks) {
      // Get all possible ID variants for comparison
      const idVariants = [
        subtaskId,
        subtaskId.replace('index_', ''),
        `index_${subtaskId}`
      ];
      
      // Find the subtask using all possible ID variants
      let subtaskIndex = -1;
      for (let i = 0; i < localTaskCache[taskIndex].subtasks.length; i++) {
        const subtask = localTaskCache[taskIndex].subtasks[i];
        if (idVariants.includes(subtask.id)) {
          subtaskIndex = i;
          break;
        }
      }

      if (subtaskIndex !== -1) {
        // Remove from cache
        const deletedSubtask = localTaskCache[taskIndex].subtasks[subtaskIndex];
        localTaskCache[taskIndex].subtasks.splice(subtaskIndex, 1);
        saveTaskCacheToLocalStorage();

        // Remove from localStorage - uses same ID variant check
        const taskSubtasksKey = `subtasks_${window.currentTaskId}`;
        let taskSubtasks = safeParseJSON(taskSubtasksKey, []);
        taskSubtasks = taskSubtasks.filter(s => {
          return !idVariants.includes(s.id);
        });
        localStorage.setItem(taskSubtasksKey, JSON.stringify(taskSubtasks));

        // Show "no subtasks" message if all subtasks are removed
        const subtasksList = document.getElementById('subtasksList');
        if (subtasksList && (subtasksList.children.length === 0 || 
            (subtasksList.children.length === 1 && subtasksList.querySelector('.no-subtasks-message')))) {
          showNoSubtasksMessage();
        }

        // Delete from server - FIXED VERSION: Send the subtask ID in the body for API compatibility
        fetch(`/todos/${window.currentTaskId}/subtask`, { 
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ 
            subtaskId: deletedSubtask.id,
            index: subtaskIndex
          })
        })
          .then(res => {
            if (res.ok) return res.json();
            throw new Error(`Server returned ${res.status}: ${res.statusText}`);
          })
          .then(updatedTodo => {
            if (updatedTodo && taskIndex !== -1) {
              // Normalize the server response
              if (updatedTodo.subtasks) {
                updatedTodo.subtasks = updatedTodo.subtasks
                  .map(subtask => normalizeSubtask(subtask))
                  .filter(subtask => subtask !== null);
              } else {
                updatedTodo.subtasks = [];
              }
              
              // Update cache
              localTaskCache[taskIndex] = updatedTodo;
              saveTaskCacheToLocalStorage();
              updateTaskSubtasksInLocalStorage(updatedTodo);

              // Show "no subtasks" message if all subtasks are removed
              if (!updatedTodo.subtasks || updatedTodo.subtasks.length === 0) {
                showNoSubtasksMessage();
              }
            }
          })
          .catch(error => {
            console.error('Error deleting subtask from server:', error);
            // Try again with different endpoint structure as fallback
            return fetch(`/todos/${window.currentTaskId}/subtasks/${subtaskIndex}`, {
              method: 'DELETE',
              credentials: 'same-origin'
            });
          })
          .then(res => {
            // Handle the response from our fallback approach
            if (res && res.ok) {
              return res.json();
            }
            return null;
          })
          .then(result => {
            if (result) {
              console.log('Subtask deleted successfully using fallback method');
            }
          })
          .catch(error => {
            console.error('All attempts to delete subtask failed:', error);
            // Even if server deletion fails, we've already updated the UI and localStorage
            // so from the user's perspective, the subtask is "deleted"
          });
      }
    }
  } else {
    // Handle local subtasks (when no task is selected)
    const localSubtasks = safeParseJSON('localSubtasks', []);
    const updatedSubtasks = localSubtasks.filter(s => s.id !== subtaskId);
    localStorage.setItem('localSubtasks', JSON.stringify(updatedSubtasks));

    const subtasksList = document.getElementById('subtasksList');
    if (subtasksList && (subtasksList.children.length === 0 || 
        (subtasksList.children.length === 1 && subtasksList.querySelector('.no-subtasks-message')))) {
      showNoSubtasksMessage();
    }
  }
}

// Clear all subtasks data for a specific task - NEW FUNCTION
function clearSubtasksData(taskId) {
  if (!taskId) return;
  
  // Clear from localStorage
  const taskSubtasksKey = `subtasks_${taskId}`;
  localStorage.removeItem(taskSubtasksKey);
  
  // Clear from cache
  const taskIndex = localTaskCache.findIndex(task => task._id === taskId);
  if (taskIndex !== -1) {
    localTaskCache[taskIndex].subtasks = [];
    saveTaskCacheToLocalStorage();
  }
  
  // Clear from DOM if this is the current task
  if (window.currentTaskId === taskId) {
    const subtasksList = document.getElementById('subtasksList');
    if (subtasksList) {
      subtasksList.innerHTML = '';
      showNoSubtasksMessage();
    }
  }
}

// Update task subtasks in localStorage
function updateTaskSubtasksInLocalStorage(task) {
  if (!task || !task._id) {
    console.error('Invalid task provided to updateTaskSubtasksInLocalStorage');
    return;
  }
  
  console.log('Updating subtasks in localStorage for task:', task._id);
  
  // Normalize all subtasks
  const normalizedSubtasks = Array.isArray(task.subtasks) 
    ? task.subtasks.map(subtask => normalizeSubtask(subtask)).filter(s => s !== null)
    : [];
  
  // Store normalized subtasks
  const taskSubtasksKey = `subtasks_${task._id}`;
  localStorage.setItem(taskSubtasksKey, JSON.stringify(normalizedSubtasks));
  
  // Verify storage
  console.log('Verified stored subtasks:', JSON.parse(localStorage.getItem(taskSubtasksKey) || '[]'));
}

// // Fetch task from server
// function fetchTaskFromServer(taskId) {
//   if (!taskId) return;
  
//   console.log('Fetching task from server:', taskId);

//   fetch(`/todos/${taskId}`, {
//     // Add credentials to ensure the session cookie is sent
//     credentials: 'same-origin'
//   })
//     .then(res => {
//       if (res.ok) return res.json();
//       throw new Error(`Server returned ${res.status}: ${res.statusText}`);
//     })
//     .then(task => {
//       if (task) {
//         console.log('Received task from server:', task);
        
//         // Normalize subtasks from server
//         if (task.subtasks && Array.isArray(task.subtasks)) {
//           task.subtasks = task.subtasks
//             .map(subtask => normalizeSubtask(subtask))
//             .filter(s => s !== null);
//         } else {
//           task.subtasks = [];
//         }
        
//         // Update cache
//         const existingIndex = localTaskCache.findIndex(t => t._id === task._id);
//         if (existingIndex !== -1) {
//           localTaskCache[existingIndex] = task;
//         } else {
//           localTaskCache.push(task);
//         }
//         saveTaskCacheToLocalStorage();

//         // Update localStorage
//         updateTaskSubtasksInLocalStorage(task);
        
//         // Reload subtasks
//         loadSubtasksForCurrentTask();
//       }
//     })
//     .catch(error => {
//       console.error('Error fetching task:', error);
//       // On error, try to use cached data if available
//       loadSubtasksForCurrentTask();
//     });
// }
// Modified fetchTaskFromServer function to handle local tasks properly
function fetchTaskFromServer(taskId) {
  if (!taskId) return;
  
  // Skip server fetch for tasks with IDs starting with "local_"
  if (taskId.startsWith('local_')) {
    console.log('Skipping server fetch for local task:', taskId);
    // Just use cached data for local tasks
    loadSubtasksForCurrentTask();
    return;
  }
  
  console.log('Fetching task from server:', taskId);

  fetch(`/todos/${taskId}`, {
    // Add credentials to ensure the session cookie is sent
    credentials: 'same-origin'
  })
    .then(res => {
      if (res.ok) return res.json();
      throw new Error(`Server returned ${res.status}: ${res.statusText}`);
    })
    .then(task => {
      if (task) {
        console.log('Received task from server:', task);
        
        // Normalize subtasks from server
        if (task.subtasks && Array.isArray(task.subtasks)) {
          task.subtasks = task.subtasks
            .map(subtask => normalizeSubtask(subtask))
            .filter(s => s !== null);
        } else {
          task.subtasks = [];
        }
        
        // Update cache
        const existingIndex = localTaskCache.findIndex(t => t._id === task._id);
        if (existingIndex !== -1) {
          localTaskCache[existingIndex] = task;
        } else {
          localTaskCache.push(task);
        }
        saveTaskCacheToLocalStorage();

        // Update localStorage
        updateTaskSubtasksInLocalStorage(task);
        
        // Reload subtasks
        loadSubtasksForCurrentTask();
      }
    })
    .catch(error => {
      console.error('Error fetching task:', error);
      // On error, try to use cached data if available
      loadSubtasksForCurrentTask();
    });
}

// Load local subtasks (for when no task is selected)
function loadLocalSubtasks() {
  const subtasksList = document.getElementById('subtasksList');
  if (!subtasksList) return;

  if (window.currentTaskId) {
    loadSubtasksForCurrentTask();
    return;
  }

  subtasksList.innerHTML = '';

  const localSubtasks = safeParseJSON('localSubtasks', [])
    .map(subtask => normalizeSubtask(subtask))
    .filter(subtask => subtask !== null);
  
  if (localSubtasks.length > 0) {
    hideNoSubtasksMessage();
    
    // Create and append subtask elements
    localSubtasks.forEach(subtask => {
      const subtaskElement = createSubtaskElement(
        subtask.text,
        subtask.id,
        subtask.completed
      );
      subtasksList.appendChild(subtaskElement);
    });
    
    // Ensure all delete buttons have proper event listeners
    subtasksList.querySelectorAll('[data-subtask-id]').forEach(subtaskItem => {
      attachDeleteListener(subtaskItem);
    });
    
    // Save normalized subtasks back to localStorage
    localStorage.setItem('localSubtasks', JSON.stringify(localSubtasks));
  } else {
    showNoSubtasksMessage();
  }
}

// Helper functions for "No subtasks" message
function showNoSubtasksMessage(panel) {
  // If panel is provided, only show message in that panel
  if (panel) {
    const subtasksList = panel.querySelector('.subtasks-list');
    if (!subtasksList) return;

    // Remove any existing messages first to prevent duplicates
    const existingMessages = subtasksList.querySelectorAll('.no-subtasks-message');
    existingMessages.forEach(msg => msg.remove());

    // Only add the message if there are no subtask elements
    const hasSubtasks = Array.from(subtasksList.children).some(
      child => !child.classList.contains('no-subtasks-message')
    );
    
    if (!hasSubtasks) {
      const noSubtasksMessage = document.createElement('div');
      noSubtasksMessage.className = 'no-subtasks-message text-gray-500 mt-2';
      noSubtasksMessage.textContent = 'No subtasks added yet.';
      subtasksList.appendChild(noSubtasksMessage);
    }
  } else {
    // For all panels, first get the main subtasksList
    const mainSubtasksList = document.getElementById('subtasksList');
    if (mainSubtasksList) {
      // Remove any existing messages first to prevent duplicates
      const existingMessages = mainSubtasksList.querySelectorAll('.no-subtasks-message');
      existingMessages.forEach(msg => msg.remove());

      // Only add the message if there are no subtask elements
      const hasSubtasks = Array.from(mainSubtasksList.children).some(
        child => !child.classList.contains('no-subtasks-message')
      );
      
      if (!hasSubtasks) {
        const noSubtasksMessage = document.createElement('div');
        noSubtasksMessage.className = 'no-subtasks-message text-gray-500 mt-2';
        noSubtasksMessage.textContent = 'No subtasks added yet.';
        mainSubtasksList.appendChild(noSubtasksMessage);
      }
    }
  }
}

function hideNoSubtasksMessage(panel) {
  // If panel is provided, only hide messages in that panel
  if (panel) {
    const noSubtasksMessages = panel.querySelectorAll('.no-subtasks-message');
    noSubtasksMessages.forEach(msg => {
      msg.remove();
    });
  } else {
    // Otherwise, hide messages in all panels
    const noSubtasksMessages = document.querySelectorAll('.no-subtasks-message');
    noSubtasksMessages.forEach(msg => {
      msg.remove();
    });
  }
}

// Event listeners
// document.addEventListener('taskSelected', function(e) {
//   if (e.detail && e.detail.taskId) {
//     window.currentTaskId = e.detail.taskId;
    
//     // Find the task in cache
//     const task = localTaskCache.find(t => t._id === e.detail.taskId);
//     if (task) {
//       // Normalize subtasks
//       if (task.subtasks && Array.isArray(task.subtasks)) {
//         task.subtasks = task.subtasks
//           .map(subtask => normalizeSubtask(subtask))
//           .filter(s => s !== null);
        
//         // Update cache
//         const taskIndex = localTaskCache.findIndex(t => t._id === e.detail.taskId);
//         if (taskIndex !== -1) {
//           localTaskCache[taskIndex] = task;
//           saveTaskCacheToLocalStorage();
//           updateTaskSubtasksInLocalStorage(task);
//         }
//       }
//     }
    
//     // Load subtasks
//     loadSubtasksForCurrentTask();
//   }
// });
// Additional validation for event listener to prevent errors with local tasks
document.addEventListener('taskSelected', function(e) {
  if (e.detail && e.detail.taskId) {
    window.currentTaskId = e.detail.taskId;
    
    // Check if this is a local task ID
    const isLocalTask = e.detail.taskId.startsWith('local_');
    
    // Find the task in cache
    const task = localTaskCache.find(t => t._id === e.detail.taskId);
    if (task) {
      // Normalize subtasks
      if (task.subtasks && Array.isArray(task.subtasks)) {
        task.subtasks = task.subtasks
          .map(subtask => normalizeSubtask(subtask))
          .filter(s => s !== null);
        
        // Update cache
        const taskIndex = localTaskCache.findIndex(t => t._id === e.detail.taskId);
        if (taskIndex !== -1) {
          localTaskCache[taskIndex] = task;
          saveTaskCacheToLocalStorage();
          updateTaskSubtasksInLocalStorage(task);
        }
      }
    }
    
    // Load subtasks - local tasks should only use local storage
    if (isLocalTask) {
      loadLocalSubtasks();
    } else {
      loadSubtasksForCurrentTask();
    }
  }
});

// Add task deletion event listener - NEW EVENT LISTENER
document.addEventListener('taskDeleted', function(e) {
  if (e.detail && e.detail.taskId) {
    // Clear all subtasks data for this task
    clearSubtasksData(e.detail.taskId);
  }
});


// Function to reattach event listeners to existing subtasks after page refresh
function reattachSubtaskEventListeners() {
  document.querySelectorAll('[data-subtask-id]').forEach(subtaskItem => {
    // Reattach delete listener
    attachDeleteListener(subtaskItem);
    
    // Reattach checkbox listener
    const checkbox = subtaskItem.querySelector('.checkbox');
    if (checkbox) {
      // Remove existing listeners first
      const newCheckbox = checkbox.cloneNode(true);
      checkbox.parentNode.replaceChild(newCheckbox, checkbox);
      
      // Add new listener
      newCheckbox.addEventListener('click', () => {
        const subtaskId = subtaskItem.dataset.subtaskId;
        const currentState = subtaskItem.dataset.completed === 'true';
        const newState = !currentState;
        
        updateSubtaskElementUI(subtaskItem, newState);
        updateSubtaskCompletionStatus(subtaskId, newState);
      });
    }
  });
}

function initSubtaskManager() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      loadLocalSubtasks();
      reattachSubtaskEventListeners();
    });
  } else {
    loadLocalSubtasks();
    reattachSubtaskEventListeners();
  }

  // Set up event listeners for add subtask buttons
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('add-subtask-btn')) {
      const listName = e.target.getAttribute('data-list');
      addSubtask(listName);
    }
  });

  // Set up event listeners for subtask input fields (for Enter key)
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && e.target.classList.contains('subtask-input')) {
      e.preventDefault();
      const listName = e.target.closest('.right-panel').getAttribute('data-list');
      addSubtask(listName);
    }
  });
  
  // Add an event listener for page visibility to reattach listeners when user returns to the page
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
      reattachSubtaskEventListeners();
    }
  });
}

// Initialize
initSubtaskManager();