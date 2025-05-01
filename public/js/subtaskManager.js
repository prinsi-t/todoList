function updateSubtaskCompletionStatus(subtaskId, completed) {
  if (!window.currentTaskId) return;
  
  const taskIndex = localTaskCache.findIndex(task => task._id === window.currentTaskId);
  if (taskIndex === -1 || !localTaskCache[taskIndex].subtasks) return;

  const subtaskIndex = localTaskCache[taskIndex].subtasks.findIndex(
    s => s.id === subtaskId || s.id === subtaskId.replace('index_', '') || `index_${s.id}` === subtaskId
  );
  
  if (subtaskIndex !== -1) {
    // 🔥 1. Update local immediately
    localTaskCache[taskIndex].subtasks[subtaskIndex].completed = completed;
    saveTaskCacheToLocalStorage();
    
    // 🔥 2. Update UI immediately
    const subtaskElement = document.querySelector(`[data-subtask-id="${subtaskId}"]`);
    if (subtaskElement) {
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
    
    // 🔥 3. Then send to server
    fetch(`/todos/${window.currentTaskId}/subtasks/${subtaskIndex}/complete`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index: subtaskIndex, completed })
    })
      .then(res => res.ok ? res.json() : null)
      .then(updatedTask => {
        if (updatedTask) {
          // 🔥 4. BUT: keep our local completed status intact
          if (updatedTask.subtasks && updatedTask.subtasks.length > subtaskIndex) {
            updatedTask.subtasks[subtaskIndex].completed = completed;
          }
          localTaskCache[taskIndex] = updatedTask;
          saveTaskCacheToLocalStorage();
        }
      })
      .catch(err => {
        console.error('Error updating subtask completion:', err);
      });
  }
}

function createSubtaskElement(text, subtaskId, isCompleted = false) {
    // 🛠 Fetch the actual completion state from localTaskCache
    let completed = isCompleted;
  
    if (window.currentTaskId) {
      const task = localTaskCache.find(t => t._id === window.currentTaskId);
      if (task && task.subtasks) {
        const sub = task.subtasks.find(s =>
          s.id === subtaskId || `index_${s.id}` === subtaskId || s.text === text
        );
        if (sub && typeof sub.completed === 'boolean') {
          completed = sub.completed;
        }
      }
    }
  
    const subtaskItem = document.createElement('div');
    subtaskItem.className = 'flex items-center gap-2 bg-dark-hover px-3 py-2 rounded-lg border border-dark-border';
    subtaskItem.dataset.subtaskId = subtaskId;
    subtaskItem.dataset.completed = completed ? 'true' : 'false';
  
    subtaskItem.innerHTML = `
      <div class="checkbox w-5 h-5 border-2 border-dark-border rounded-full flex items-center justify-center transition-colors duration-200 cursor-pointer ${completed ? 'bg-blue-500 border-blue-500' : ''}">
        <i class="fas fa-check text-white text-xs" style="${completed ? '' : 'display: none;'}"></i>
      </div>
      <span class="text-sm flex-grow ${completed ? 'line-through text-gray-500' : 'text-gray-200'}">${text}</span>
      <button class="text-red-400 hover:text-red-500 text-xs delete-subtask">
        <i class="fas fa-trash"></i>
      </button>
    `;
  

  const checkbox = subtaskItem.querySelector('.checkbox');
  const checkIcon = checkbox.querySelector('.fa-check');
  const textSpan = subtaskItem.querySelector('span');

  checkbox.addEventListener('click', () => {
    // Get the current state from the dataset
    const currentState = subtaskItem.dataset.completed === 'true';
    // Toggle to the opposite state
    const newState = !currentState;
    
    // Update the DOM element's dataset
    subtaskItem.dataset.completed = newState ? 'true' : 'false';
    
    // Update the visual appearance
    if (newState) {
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
    
    // Update the data in the cache and server
    updateSubtaskCompletionStatus(subtaskId, newState);
  });

  subtaskItem.querySelector('.delete-subtask').addEventListener('click', () => {
    deleteSubtask(subtaskItem.dataset.subtaskId);
    subtaskItem.remove();
  });

  return subtaskItem;
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
  
  // Create the subtask element with the correct completion status (false for new subtasks)
  const subtaskElement = createSubtaskElement(subtaskText, subtaskId, false);
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
      
      // Store a copy of the current subtasks array before making the server request
      const currentSubtasks = JSON.parse(JSON.stringify(localTaskCache[taskIndex].subtasks));
      
      fetch(`/todos/${window.currentTaskId}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: subtaskText })
      })
        .then(res => res.ok ? res.json() : null)
        .then(updatedTodo => {
          if (updatedTodo) {
            // Create a map of current subtasks by text and id for quick lookup
            const subtaskMap = {};
            currentSubtasks.forEach(subtask => {
              if (subtask.text) subtaskMap[subtask.text] = subtask;
              if (subtask.id) subtaskMap[subtask.id] = subtask;
            });
            
            // Make a copy of the updated todo
            const updatedTaskCopy = {...updatedTodo};
            
            // Ensure subtasks array exists
            if (!updatedTaskCopy.subtasks) {
              updatedTaskCopy.subtasks = [];
            }
            
            // Apply our local completion status to the server response
            updatedTaskCopy.subtasks.forEach(serverSubtask => {
              // Try to match by text first
              let localSubtask = serverSubtask.text ? subtaskMap[serverSubtask.text] : null;
              
              // If not found by text, try by id
              if (!localSubtask && serverSubtask.id) {
                localSubtask = subtaskMap[serverSubtask.id];
              }
              
              if (localSubtask) {
                // Preserve the completion status
                serverSubtask.completed = localSubtask.completed;
                
                // Preserve the ID if needed
                if (!serverSubtask.id && localSubtask.id) {
                  serverSubtask.id = localSubtask.id;
                }
              }
            });
            
            // Make sure our new subtask is included
            const hasNewSubtask = updatedTaskCopy.subtasks.some(
              s => s.text === newSubtask.text || s.id === newSubtask.id
            );
            
            if (!hasNewSubtask) {
              updatedTaskCopy.subtasks.push(newSubtask);
            }
            
            // Update local cache with our modified version
            localTaskCache[taskIndex] = updatedTaskCopy;
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