// Fixed subtaskManager.js - Permanent Subtask Deletion

function isLocalTaskId(taskId) {
  return taskId && (taskId.startsWith('local_') || taskId.indexOf('_') > -1);
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
    localTaskCache[taskIndex].subtasks[subtaskIndex].completed = completed;
    saveTaskCacheToLocalStorage();

    const subtaskElement = document.querySelector(`[data-subtask-id="${subtaskId}"]`);
    if (subtaskElement) {
      updateSubtaskElementUI(subtaskElement, completed);
    }

    const taskSubtasksKey = `subtasks_${window.currentTaskId}`;
    let taskSubtasks = safeParseJSON(taskSubtasksKey, []);
    const localSubtaskIndex = taskSubtasks.findIndex(s => s.id === subtaskId);

    if (localSubtaskIndex !== -1) {
      taskSubtasks[localSubtaskIndex].completed = completed;
    } else {
      const s = localTaskCache[taskIndex].subtasks[subtaskIndex];
      const cleanText = (typeof s.text === 'string' && s.text.trim().toLowerCase() !== 'undefined')
        ? s.text.trim()
        : ((typeof s.title === 'string' && s.title.trim().toLowerCase() !== 'undefined') ? s.title.trim() : 'New subtask');
      const subtask = {
        id: s.id,
        text: cleanText,
        title: cleanText,
        completed: completed
      };
      taskSubtasks.push(subtask);
    }

    localStorage.setItem(taskSubtasksKey, JSON.stringify(taskSubtasks));

    fetch(`/todos/${window.currentTaskId}/subtasks/${subtaskIndex}/complete`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index: subtaskIndex, completed })
    })
      .then(res => res.ok ? res.json() : null)
      .then(updatedTask => {
        if (updatedTask && updatedTask.subtasks && Array.isArray(updatedTask.subtasks)) {
          updatedTask.subtasks = updatedTask.subtasks.map(s => {
            if (!s || typeof s !== 'object') return null;
            const cleanText = (typeof s.text === 'string' && s.text.trim().toLowerCase() !== 'undefined')
              ? s.text.trim()
              : ((typeof s.title === 'string' && s.title.trim().toLowerCase() !== 'undefined') ? s.title.trim() : 'New subtask');
            return {
              id: s.id || `subtask_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              text: cleanText,
              title: cleanText,
              completed: !!s.completed
            };
          }).filter(s => s !== null);

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
  const finalText = (typeof text === 'string' && text.trim().toLowerCase() !== 'undefined') 
  ? text.trim() 
  : 'New subtask';

const subtask = {
  id: subtaskId || `subtask_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
  text: finalText,
  title: finalText,
  completed: !!isCompleted
};

  
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

function addSubtask(taskId, text) {
  if (!taskId || typeof text !== 'string' || !text.trim()) {
    console.error('❌ addSubtask() called with invalid arguments:', { taskId, text });
    return;
  }

  console.log('➕ Adding subtask to task:', taskId);

  const subtaskId = 'subtask_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  const newSubtask = {
    id: subtaskId,
    text: text.trim(),
    title: text.trim(),
    completed: false
  };

  const taskIndex = localTaskCache.findIndex(task => task._id === taskId);
  if (taskIndex === -1) {
    console.error('❌ Task not found in cache');
    return;
  }

  const task = localTaskCache[taskIndex];

  if (!Array.isArray(task.subtasks)) task.subtasks = [];
  task.subtasks.push(newSubtask);

  localTaskCache[taskIndex] = task;
  saveTaskCacheToLocalStorage();
  updateTaskSubtasksInLocalStorage(task);

  console.log('✅ Subtask added locally:', newSubtask);

  // ✅ Rerender the full subtask UI via shared rendering logic
  if (typeof loadSubtasksForCurrentTask === 'function') {
    setTimeout(() => {
      console.log('🔄 Refreshing subtask UI...');
      loadSubtasksForCurrentTask();
    }, 50);
  }

  if (taskId.startsWith('local_')) {
    console.warn('🛑 Skipping server sync — local-only task');
    return;
  }

  fetch(`/todos/${taskId}/subtasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(newSubtask)
  })
    .then(res => {
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      return res.json();
    })
    .then(data => {
      console.log('🌐 Server confirmed subtask add:', data);
    })
    .catch(err => {
      console.error('❌ Server subtask add failed:', err);
    });
}









function loadSubtasksForCurrentTask() {
  if (!window.currentTaskId) return;

  const panel = document.querySelector(`.right-panel[data-current-task-id="${window.currentTaskId}"]`);
  if (!panel) {
    console.warn('❌ No panel found for current task:', window.currentTaskId);
    return;
  }

  const subtasksList = panel.querySelector('#subtasksList.subtasks-list');
  if (!subtasksList) {
    console.warn('❌ No subtasks list found inside panel:', panel);
    return;
  }

  subtasksList.innerHTML = '';

  const taskIndex = localTaskCache.findIndex(task => task._id === window.currentTaskId);
  if (taskIndex === -1) {
    console.warn('❌ Task not found in cache:', window.currentTaskId);
    return;
  }

  const task = localTaskCache[taskIndex];
  const rawSubtasks = task.subtasks || [];

  const normalized = rawSubtasks.map(subtask => {
    const cleanText =
      typeof subtask.text === 'string' && subtask.text.trim().toLowerCase() !== 'undefined'
        ? subtask.text.trim()
        : (typeof subtask.title === 'string' && subtask.title.trim().toLowerCase() !== 'undefined'
          ? subtask.title.trim()
          : 'New subtask');

    return {
      id: subtask.id || `subtask_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      text: cleanText,
      title: cleanText,
      completed: !!subtask.completed
    };
  });

  console.log('🧩 Rendering subtasks:', normalized);

  normalized.forEach(subtask => {
    const el = createSubtaskElement(subtask.text, subtask.id, subtask.completed);
    subtasksList.appendChild(el);
    attachDeleteListener(el);
  });

  updateNoSubtaskMessage(subtasksList, normalized.length === 0);


  // Sync to localStorage just in case
  const taskSubtasksKey = `subtasks_${window.currentTaskId}`;
  localStorage.setItem(taskSubtasksKey, JSON.stringify(normalized));
}



function deleteSubtask(subtaskId) {
  console.log('🗑️ Attempting to delete subtask:', subtaskId);

  const el = document.querySelector(`[data-subtask-id="${subtaskId}"]`);
  if (el) {
    el.remove();
    console.log('📦 Removed subtask element from DOM');
  }

  if (!window.currentTaskId) {
    console.warn('⚠️ No currentTaskId set — cannot delete');
    return;
  }

  const taskIndex = localTaskCache.findIndex(task => task._id === window.currentTaskId);
  if (taskIndex === -1) {
    console.warn('⚠️ Task not found in memory:', window.currentTaskId);
    return;
  }

  const task = localTaskCache[taskIndex];
  if (!Array.isArray(task.subtasks)) {
    task.subtasks = safeParseJSON(`subtasks_${window.currentTaskId}`, []);
    console.warn('⚠️ Rehydrated missing subtasks from localStorage');
  }

  const idVariants = [
    subtaskId,
    subtaskId.replace('index_', ''),
    `index_${subtaskId}`
  ];

  const subtaskIndex = task.subtasks.findIndex(s => idVariants.includes(s.id));
  if (subtaskIndex === -1) {
    console.warn('⚠️ Subtask not found in memory or fallback');
    return;
  }

  const deletedSubtask = task.subtasks[subtaskIndex];
  task.subtasks.splice(subtaskIndex, 1);
  localTaskCache[taskIndex] = task;

  saveTaskCacheToLocalStorage();
  updateTaskSubtasksInLocalStorage(task);

  const taskSubtasksKey = `subtasks_${window.currentTaskId}`;
  const updatedSubtasks = task.subtasks;
  localStorage.setItem(taskSubtasksKey, JSON.stringify(updatedSubtasks));
  console.log('💾 Updated localStorage for task:', taskSubtasksKey);

  const panel = document.querySelector(`.right-panel[data-current-task-id="${window.currentTaskId}"]`);
  const subtasksList = panel?.querySelector('#subtasksList');
  
  if (subtasksList) {
    const subtaskCount = [...subtasksList.children].filter(el =>
      !el.classList.contains('no-subtasks-message')
    ).length;
    updateNoSubtaskMessage(subtasksList, subtaskCount === 0);
  }
  


  // 🔁 Server delete only for synced tasks
  if (!window.currentTaskId.startsWith('local_')) {
    fetch(`/todos/${window.currentTaskId}/subtask`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ subtaskId: deletedSubtask.id })
    })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(result => {
        console.log('✅ Server confirmed subtask deletion');
      })
      .catch(error => {
        console.error('❌ Server failed to delete subtask:', error);
      });
  } else {
    console.log('🛑 Skipped server delete for local-only task');
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

function updateTaskSubtasksInLocalStorage(task) {
  if (!task || !task._id) {
    console.error('Invalid task provided to updateTaskSubtasksInLocalStorage');
    return;
  }

  console.log('Updating subtasks in localStorage for task:', task._id);

  const normalizedSubtasks = Array.isArray(task.subtasks)
    ? task.subtasks.map(subtask => {
        if (!subtask || typeof subtask !== 'object') return null;
        const cleanText = (typeof subtask.text === 'string' && subtask.text.trim().toLowerCase() !== 'undefined')
          ? subtask.text.trim()
          : ((typeof subtask.title === 'string' && subtask.title.trim().toLowerCase() !== 'undefined') ? subtask.title.trim() : 'New subtask');
        return {
          id: subtask.id || `subtask_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          text: cleanText,
          title: cleanText,
          completed: !!subtask.completed
        };
      }).filter(s => s !== null)
    : [];

  const taskSubtasksKey = `subtasks_${task._id}`;
  localStorage.setItem(taskSubtasksKey, JSON.stringify(normalizedSubtasks));
  console.log('Verified stored subtasks:', JSON.parse(localStorage.getItem(taskSubtasksKey) || '[]'));
}


function fetchTaskFromServer(taskId) {
  if (!taskId) return;
  if (taskId.startsWith('local_')) {
    console.log('Skipping server fetch for local task:', taskId);
    loadSubtasksForCurrentTask();
    return;
  }

  console.log('Fetching task from server:', taskId);

  fetch(`/todos/${taskId}`, {
    credentials: 'same-origin'
  })
    .then(res => {
      if (res.ok) return res.json();
      throw new Error(`Server returned ${res.status}: ${res.statusText}`);
    })
    .then(task => {
      if (task) {
        console.log('Received task from server:', task);

        if (task.subtasks && Array.isArray(task.subtasks)) {
          task.subtasks = task.subtasks.map(subtask => {
            if (!subtask || typeof subtask !== 'object') return null;
            const cleanText = (typeof subtask.text === 'string' && subtask.text.trim().toLowerCase() !== 'undefined')
              ? subtask.text.trim()
              : ((typeof subtask.title === 'string' && subtask.title.trim().toLowerCase() !== 'undefined') ? subtask.title.trim() : 'New subtask');
            return {
              id: subtask.id || `subtask_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              text: cleanText,
              title: cleanText,
              completed: !!subtask.completed
            };
          }).filter(s => s !== null);
        } else {
          task.subtasks = [];
        }

        const existingIndex = localTaskCache.findIndex(t => t._id === task._id);
        if (existingIndex !== -1) {
          localTaskCache[existingIndex] = task;
        } else {
          localTaskCache.push(task);
        }
        saveTaskCacheToLocalStorage();

        updateTaskSubtasksInLocalStorage(task);
        loadSubtasksForCurrentTask();
      }
    })
    .catch(error => {
      console.error('Error fetching task:', error);
      loadSubtasksForCurrentTask();
    });
}


function loadLocalSubtasks() {
  const taskId = window.currentTaskId;
  if (!taskId) {
    console.warn('❌ loadLocalSubtasks called without currentTaskId.');
    return;
  }

  if (!taskId.startsWith('local_')) {
    loadSubtasksForCurrentTask(); // fallback for server tasks
    return;
  }

  const panel = document.querySelector(`.right-panel[data-current-task-id="${taskId}"]`);
  const subtasksList = panel?.querySelector('#subtasksList');

  if (!subtasksList) {
    console.warn('❌ Subtasks list not found in panel for:', taskId);
    return;
  }

  // Clear current list
  subtasksList.innerHTML = '';

  // Load from localStorage
  const key = `subtasks_${taskId}`;
  const storedSubtasks = safeParseJSON(key, []).map(subtask => {
    if (!subtask || typeof subtask !== 'object') return null;

    const cleanText = (typeof subtask.text === 'string' && subtask.text.trim().toLowerCase() !== 'undefined')
      ? subtask.text.trim()
      : (typeof subtask.title === 'string' && subtask.title.trim().toLowerCase() !== 'undefined')
        ? subtask.title.trim()
        : 'New subtask';

    return {
      id: subtask.id || `subtask_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      text: cleanText,
      title: cleanText,
      completed: !!subtask.completed
    };
  }).filter(Boolean);

  // Render each subtask
  storedSubtasks.forEach(subtask => {
    const el = createSubtaskElement(subtask.text, subtask.id, subtask.completed);
    subtasksList.appendChild(el);
    attachDeleteListener(el);
  });

  // Update message visibility
  updateNoSubtaskMessage(subtasksList, storedSubtasks.length === 0);

  // Sync memory
  const taskIndex = localTaskCache.findIndex(t => t._id === taskId);
  if (taskIndex !== -1) {
    localTaskCache[taskIndex].subtasks = storedSubtasks;
    saveTaskCacheToLocalStorage();
  }

  // Store cleaned list again
  localStorage.setItem(key, JSON.stringify(storedSubtasks));
  console.log(`✅ Loaded and normalized ${storedSubtasks.length} subtasks for ${taskId}`);
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

function updateNoSubtaskMessage(subtasksList, shouldShow) {
  if (!subtasksList) return;

  const existing = subtasksList.querySelector('.no-subtasks-message');
  if (shouldShow) {
    if (!existing) {
      const msg = document.createElement('div');
      msg.className = 'no-subtasks-message text-gray-500 mt-2';
      msg.textContent = 'No subtasks added yet.';
      subtasksList.appendChild(msg);
    }
  } else if (existing) {
    existing.remove();
  }
}


document.addEventListener('taskSelected', function (e) {
  if (e.detail && e.detail.taskId) {
    window.currentTaskId = e.detail.taskId;
    const isLocalTask = e.detail.taskId.startsWith('local_');
    const task = localTaskCache.find(t => t._id === e.detail.taskId);

    if (task) {
      // ✅ If subtasks are missing in memory, load from localStorage
      if (!Array.isArray(task.subtasks)) {
        const restored = safeParseJSON(`subtasks_${e.detail.taskId}`, []);
        task.subtasks = restored;
        console.warn('📦 Rehydrated missing subtasks from localStorage:', restored);
      }

      // ✅ Normalize and clean subtasks
      if (task.subtasks && Array.isArray(task.subtasks)) {
        task.subtasks = task.subtasks
          .map(subtask => {
            if (!subtask || typeof subtask !== 'object') return null;

            const cleanText =
              typeof subtask.text === 'string' && subtask.text.trim().toLowerCase() !== 'undefined'
                ? subtask.text.trim()
                : typeof subtask.title === 'string' && subtask.title.trim().toLowerCase() !== 'undefined'
                  ? subtask.title.trim()
                  : 'New subtask';

            return {
              id: subtask.id || `subtask_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              text: cleanText,
              title: cleanText,
              completed: !!subtask.completed
            };
          })
          .filter(s => s !== null);

        const taskIndex = localTaskCache.findIndex(t => t._id === e.detail.taskId);
        if (taskIndex !== -1) {
          localTaskCache[taskIndex] = task;
          saveTaskCacheToLocalStorage();
          updateTaskSubtasksInLocalStorage(task);
        }
      }
    } else {
      console.warn('⚠️ Task not found in localTaskCache:', e.detail.taskId);
    }

    // ✅ Load subtasks into UI
    if (isLocalTask) {
      console.log('📥 Loading subtasks for local task');
      loadLocalSubtasks();
    } else {
      console.log('📥 Loading subtasks for server task');
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

  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('add-subtask-btn')) {
      const button = e.target;
      const panel = button.closest('.right-panel');
      const input = panel?.querySelector('.subtask-input');
      const text = input?.value?.trim();
      const taskId = panel?.getAttribute('data-current-task-id');
  
      if (!taskId || !text) {
        console.warn('⚠️ Cannot add subtask — missing task ID or text', { taskId, text });
        return;
      }
  
      addSubtask(taskId, text);
      input.value = '';
    }
  });
  
  

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.classList.contains('subtask-input')) {
      e.preventDefault();
  
      const input = e.target;
      const text = input?.value?.trim();
      const panel = input.closest('.right-panel');
      const taskId = panel?.getAttribute('data-current-task-id');
  
      if (!taskId || !text) {
        console.warn('⚠️ Cannot add subtask — missing task ID or text', { taskId, text });
        return;
      }
  
      addSubtask(taskId, text);
      input.value = '';
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