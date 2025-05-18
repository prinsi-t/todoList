let activePanels = {};

function hasTasksInList(listName) {
  if (!window.localTaskCache || !Array.isArray(window.localTaskCache)) {
    console.log(`No task cache available for list: ${listName}`);
    return false;
  }
  
  console.log(`Checking tasks for list: ${listName}`, window.localTaskCache);
  
  const hasTasks = window.localTaskCache.some(task => 
    task.list === listName && task.deleted !== true
  );
  
  console.log(`List ${listName} has tasks: ${hasTasks}`);
  
  // If no tasks, ensure the panel is hidden
  if (!hasTasks) {
    const rightPanelsContainer = document.getElementById('right-panels-container');
    if (rightPanelsContainer) {
      rightPanelsContainer.classList.add('hidden');
    }
  }
  
  return hasTasks;
}

function updateRightPanelVisibility(listName) {
  if (!listName) return;
  
  const rightPanelsContainer = document.getElementById('right-panels-container');
  if (!rightPanelsContainer) {
    console.error('Right panels container not found');
    return;
  }
  
  const hasAnyTasks = hasTasksInList(listName);
  
  console.log(`Checking visibility for ${listName}: has tasks = ${hasAnyTasks}`);
  
  // Hide all list-specific containers first
  document.querySelectorAll('[id^="right-panels-container-"]').forEach(container => {
    container.classList.add('hidden');
  });
  
  // Get the list-specific container
  const listId = listName.toLowerCase().replace(/\s+/g, '-');
  const containerIdForList = `right-panels-container-${listId}`;
  const listContainer = document.getElementById(containerIdForList);
  
  if (listContainer) {
    listContainer.classList.remove('hidden');
  }
  
  // Check for active task and ensure it persists across list changes
  const activeTaskId = localStorage.getItem('activeTaskId');
  const activeTask = activeTaskId ? 
    window.localTaskCache.find(task => task._id === activeTaskId && !task.deleted) : 
    null;
  
  // If there are tasks in the current list or an active task exists
  if (hasAnyTasks) {
    rightPanelsContainer.classList.remove('hidden');
    
    // If active task exists and belongs to current list, show its panel
    if (activeTask && activeTask.list === listName) {
      setTimeout(() => {
        showPanelForTask(activeTask);
      }, 10);
    } else {
      // Otherwise, find the first task in the current list and show its panel
      const firstTask = window.localTaskCache.find(task => 
        task.list === listName && !task.deleted
      );
      
      if (firstTask) {
        setTimeout(() => {
          showPanelForTask(firstTask);
          window.currentTaskId = firstTask._id;
          localStorage.setItem('activeTaskId', firstTask._id);
        }, 10);
      }
    }
  } else {
    rightPanelsContainer.classList.add('hidden');
    window.currentTaskId = null;
    localStorage.removeItem('activeTaskId');
  }
}

function initializePanelVisibility() {
  const activeList = localStorage.getItem('activeList') || 'Personal';
  updateRightPanelVisibility(activeList);
  
  document.addEventListener('taskAdded', function(e) {
    if (e.detail && e.detail.task) {
      console.log('Task added event detected, updating panel visibility');
      const task = e.detail.task;
      
      const rightPanelsContainer = document.getElementById('right-panels-container');
      if (rightPanelsContainer) {
        rightPanelsContainer.classList.remove('hidden');
      }
      
      updateRightPanelVisibility(task.list);
      
      setTimeout(() => {
        showPanelForTask(task);
      }, 50);
    }
  });
  
  document.addEventListener('taskDeleted', function(e) {
    if (e.detail && e.detail.list) {
      console.log('Task deleted event detected, updating panel visibility');
      setTimeout(() => {
        updateRightPanelVisibility(e.detail.list);
      }, 100);
    }
  });
  
  document.addEventListener('listChanged', enhancedListChangeHandler);
  
  setupTaskAddHandler();
}

function createPanelForTask(task) {
  if (!task || !task.list || !task._id) {
    console.error('Invalid task provided to createPanelForTask');
    return null;
  }

  const listName = task.list;
  const taskId = task._id;
  const uniquePanelId = `right-panel-${listName.toLowerCase().replace(/\s+/g, '-')}-${taskId}`;
  
  let panel = document.getElementById(uniquePanelId);
  if (panel) {
    console.log(`Panel already exists for task: ${task.title} in list: ${listName}`);
    return panel;
  }

  console.log(`Creating new panel for task: ${task.title} in list: ${listName}`);
  
  const rightPanelsContainer = document.getElementById('right-panels-container');
  if (rightPanelsContainer) {
    rightPanelsContainer.classList.remove('hidden');
  }
  
  const listId = listName.toLowerCase().replace(/\s+/g, '-');
  const containerIdForList = `right-panels-container-${listId}`;
  let listContainer = document.getElementById(containerIdForList);
  
  if (!listContainer) {
    const mainContent = document.querySelector('.main-content') || document.querySelector('main');
    if (mainContent) {
      listContainer = document.createElement('div');
      listContainer.id = containerIdForList;
      listContainer.className = 'flex-1 bg-dark-accent rounded-lg p-6 h-full right-panels-container';
      mainContent.appendChild(listContainer);
      console.log(`Created new right panels container for list: ${listName}`);
    } else {
      console.error('Main content container not found, cannot create right panels container');
      return null;
    }
  } else {
    listContainer.classList.remove('hidden');
  }

  panel = document.createElement('div');
  panel.id = uniquePanelId;
  panel.className = 'task-panel h-full flex flex-col';
  panel.dataset.list = listName;
  panel.dataset.taskId = taskId;

  panel.innerHTML = `
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="text-xl font-semibold text-gray-100 mb-1">${task.title || ''}</h2>
        <p class="text-gray-400">${listName}</p>
      </div>
      <div class="flex gap-3">
        <button id="complete-btn-${taskId}" class="bg-blue-500 text-white px-4 py-2 rounded-md">Mark as Complete</button>
        <button class="delete-task-btn bg-red-500/80 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors duration-150">
          <i class="fas fa-trash mr-1"></i> Delete
        </button>
      </div>
    </div>
    
    <div class="task-blur-content flex-grow flex flex-col gap-6 overflow-y-auto">
      <div class="bg-dark-bg rounded-lg p-4">
        <h3 class="text-gray-200 font-medium mb-3">Notes</h3>
        <textarea class="notes-textarea w-full bg-dark-bg resize-none text-gray-300 focus:outline-none" rows="4" placeholder="Add notes here...">${task.notes || ''}</textarea>
      </div>
      
      <div class="bg-dark-bg rounded-lg p-4">
        <div class="flex justify-between items-center mb-3">
          <h3 class="text-gray-200 font-medium">Subtasks</h3>
          <button class="add-subtask text-blue-400 hover:text-blue-300 text-sm flex items-center">
            <i class="fas fa-plus mr-1"></i> Add Subtask
          </button>
        </div>
        <div class="subtasks-list">
          ${renderSubtasks(task)}
        </div>
      </div>
      
      <div class="bg-dark-bg rounded-lg p-4">
        <div class="flex justify-between items-center mb-3">
          <h3 class="text-gray-200 font-medium">Attachments</h3>
          <label for="file-upload-${taskId}" class="text-blue-400 hover:text-blue-300 text-sm cursor-pointer flex items-center">
            <i class="fas fa-paperclip mr-1"></i> Add File
          </label>
          <input id="file-upload-${taskId}" type="file" class="hidden" accept="image/*">
        </div>
        <div class="image-preview-container flex flex-wrap gap-3">
          ${renderAttachments(task)}
        </div>
      </div>
    </div>
  `;

  listContainer.appendChild(panel);
  console.log(`Added panel for task "${task.title}" to container for list "${listName}"`);
  
  if (!activePanels[listName]) {
    activePanels[listName] = {};
  }
  activePanels[listName][taskId] = panel;
  
  setupPanelEventListeners(panel, task);
  
  if (window.fileManager && window.fileManager.isInitialized) {
    setTimeout(() => {
      window.fileManager.setupTaskFileUpload(panel, taskId);
    }, 100);
  }
  
  return panel;
}

function setupTaskAddHandler() {
  const addButtons = document.querySelectorAll('button.add, button[type="submit"]');
  
  addButtons.forEach(button => {
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    
    newButton.addEventListener('click', function(e) {
      console.log('Add button clicked, setting up task panel handler');
      
      setTimeout(() => {
        const activeList = localStorage.getItem('activeList') || 'Personal';
        console.log(`Current active list: ${activeList}`);
        
        if (window.localTaskCache && Array.isArray(window.localTaskCache)) {
          const newTasks = window.localTaskCache.filter(task => 
            task.list === activeList && !task.deleted && !task.completed
          );
          
          if (newTasks.length > 0) {
            const latestTask = newTasks.sort((a, b) => {
              if (a.createdAt && b.createdAt) {
                return new Date(b.createdAt) - new Date(a.createdAt);
              }
              return 0;
            })[0];
            
            console.log('Latest task found:', latestTask);
            if (latestTask) {
              showPanelForTask(latestTask);
              
              window.currentTaskId = latestTask._id;
              localStorage.setItem('activeTaskId', latestTask._id);
              
              updateRightPanelVisibility(activeList);
            }
          }
        }
      }, 100); 
    });
  });
}

function renderSubtasks(task) {
  if (!task.subtasks || task.subtasks.length === 0) {
    return '<div class="text-gray-500 text-sm py-2">No subtasks added yet.</div>';
  }
  
  return task.subtasks.map(subtask => `
    <div class="flex items-center gap-2 mb-2" data-subtask-id="${subtask.id}">
      <div class="checkbox ${subtask.completed ? 'checked bg-blue-500 border-blue-500' : ''} w-5 h-5 border-2 border-dark-border rounded-full flex items-center justify-center transition-colors duration-200">
        ${subtask.completed ? '<i class="fas fa-check text-white text-xs"></i>' : ''}
      </div>
      <span class="${subtask.completed ? 'line-through text-gray-500' : 'text-gray-300'} flex-grow">${subtask.title}</span>
      <button class="text-red-400/80 hover:text-red-400"><i class="fas fa-times"></i></button>
    </div>
  `).join('');
}

function renderAttachments(task) {
  if (!task.attachments || task.attachments.length === 0) {
    return '';
  }
  
  const taskAttachments = task.attachments.filter(attachment => 
    attachment.taskId === task._id && attachment.list === task.list
  );
  
  return taskAttachments.map(attachment => {
    if (attachment.type === 'image') {
      return `
        <div class="relative attachment-preview" data-url="${attachment.url}">
          <img src="${attachment.url}" class="w-32 h-32 object-cover rounded-md">
          <button class="remove-attachment absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
            <i class="fas fa-times text-xs"></i>
          </button>
        </div>
      `;
    }
    return '';
  }).join('');
}

function setupPanelEventListeners(panel, task) {
  if (!panel || !task) return;
  
  const taskId = task._id;
  
  const completeBtn = panel.querySelector(`#complete-btn-${taskId}`);
  if (completeBtn) {
    completeBtn.addEventListener('click', function() {
      window.markTaskComplete(taskId);
    });
  }
  
  const deleteBtn = panel.querySelector('.delete-task-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', function() {
      if (taskId) {
        deleteTask(taskId);
      }
    });
  }
  
  const addSubtaskBtn = panel.querySelector('.add-subtask');
  if (addSubtaskBtn) {
    addSubtaskBtn.addEventListener('click', function() {
      if (!taskId) return;
      
      const subtasksList = panel.querySelector('.subtasks-list');
      const emptyState = subtasksList.querySelector('.text-gray-500');
      if (emptyState) {
        emptyState.remove();
      }
      
      const subtaskContainer = document.createElement('div');
      subtaskContainer.className = 'flex items-center gap-2 mb-2 subtask-item';
      
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'flex-grow bg-dark-hover text-gray-300 p-2 rounded-md focus:outline-none';
      input.placeholder = 'Enter subtask...';
      
      const saveBtn = document.createElement('button');
      saveBtn.innerHTML = '<i class="fas fa-check text-green-500"></i>';
      saveBtn.className = 'p-2';
      
      const cancelBtn = document.createElement('button');
      cancelBtn.innerHTML = '<i class="fas fa-times text-red-500"></i>';
      cancelBtn.className = 'p-2';
      
      subtaskContainer.appendChild(input);
      subtaskContainer.appendChild(saveBtn);
      subtaskContainer.appendChild(cancelBtn);
      subtasksList.appendChild(subtaskContainer);
      
      input.focus();
      
      saveBtn.addEventListener('click', function() {
        if (!input.value.trim()) {
          subtaskContainer.remove();
          return;
        }
        
        const subtaskId = 'subtask_' + Date.now();
        const newSubtask = {
          id: subtaskId,
          title: input.value.trim(),
          completed: false
        };
        
        const taskIndex = window.localTaskCache.findIndex(t => t._id === taskId);
        if (taskIndex !== -1) {
          if (!window.localTaskCache[taskIndex].subtasks) {
            window.localTaskCache[taskIndex].subtasks = [];
          }
          window.localTaskCache[taskIndex].subtasks.push(newSubtask);
          window.saveTaskCacheToLocalStorage();
          
          subtaskContainer.innerHTML = '';
          subtaskContainer.className = 'flex items-center gap-2 mb-2';
          subtaskContainer.dataset.subtaskId = subtaskId;
          
          const checkbox = document.createElement('div');
          checkbox.className = 'checkbox w-5 h-5 border-2 border-dark-border rounded-full flex items-center justify-center transition-colors duration-200';
          
          const titleSpan = document.createElement('span');
          titleSpan.className = 'text-gray-300 flex-grow';
          titleSpan.textContent = newSubtask.title;
          
          const deleteBtn = document.createElement('button');
          deleteBtn.className = 'text-red-400/80 hover:text-red-400';
          deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
          
          subtaskContainer.appendChild(checkbox);
          subtaskContainer.appendChild(titleSpan);
          subtaskContainer.appendChild(deleteBtn);
          
          checkbox.addEventListener('click', function() {
            toggleSubtaskCompletion(taskId, subtaskId);
          });
          
          deleteBtn.addEventListener('click', function() {
            deleteSubtask(taskId, subtaskId);
            subtaskContainer.remove();
          });
        }
      });
      
      cancelBtn.addEventListener('click', function() {
        subtaskContainer.remove();
        
        if (subtasksList.children.length === 0) {
          subtasksList.innerHTML = '<div class="text-gray-500 text-sm py-2">No subtasks added yet.</div>';
        }
      });
    });
  }
  
  panel.querySelectorAll('.subtasks-list .checkbox').forEach(checkbox => {
    checkbox.addEventListener('click', function() {
      const subtaskItem = this.closest('[data-subtask-id]');
      const subtaskId = subtaskItem.dataset.subtaskId;
      toggleSubtaskCompletion(taskId, subtaskId);
    });
  });
  
  panel.querySelectorAll('.subtasks-list button').forEach(button => {
    button.addEventListener('click', function() {
      const subtaskItem = this.closest('[data-subtask-id]');
      const subtaskId = subtaskItem.dataset.subtaskId;
      deleteSubtask(taskId, subtaskId);
      subtaskItem.remove();
    });
  });
  
  panel.querySelectorAll('.remove-attachment').forEach(button => {
    button.addEventListener('click', function() {
      const attachmentPreview = this.closest('.attachment-preview');
      const url = attachmentPreview.dataset.url;
      if (window.fileManager && window.fileManager.removeAttachment) {
        window.fileManager.removeAttachment(taskId, url);
      } else {
        removeAttachment(taskId, url);
      }
      attachmentPreview.remove();
    });
  });
  
  const notesTextarea = panel.querySelector('.notes-textarea');
  if (notesTextarea) {
    notesTextarea.addEventListener('input', function() {
      autoResizeTextarea(this);
      
      if (!taskId) return;
      
      const taskIndex = window.localTaskCache.findIndex(t => t._id === taskId);
      if (taskIndex === -1) return;
      
      window.localTaskCache[taskIndex].notes = this.value;
      window.saveTaskCacheToLocalStorage();
    });
    
    autoResizeTextarea(notesTextarea);
  }
  
  const isTaskBlurred = localStorage.getItem('isTaskBlurred') === 'true';
  const blurContent = panel.querySelector('.task-blur-content');
  
  if (blurContent && task.completed && isTaskBlurred) {
    blurContent.classList.add('blurred');
    blurContent.style.cssText = 'filter: blur(5px) !important; pointer-events: none;';
  }

  updateBlurEffect(panel, task);
}

function updateBlurEffect(panel, task) {
  const isTaskBlurred = localStorage.getItem('isTaskBlurred') === 'true';
  const blurContent = panel.querySelector('.task-blur-content');
  const completeBtn = panel.querySelector(`#complete-btn-${task._id}`);
  
  if (blurContent) {
    if (task.completed && isTaskBlurred) {
      blurContent.classList.add('blurred');
      // Use the class instead of inline styles for consistency
      if (completeBtn) {
        completeBtn.textContent = 'Mark as Incomplete';
        completeBtn.className = completeBtn.className.replace('bg-blue-500', 'bg-green-500');
      }
    } else {
      blurContent.classList.remove('blurred');
      if (completeBtn) {
        completeBtn.textContent = 'Mark as Complete';
        completeBtn.className = completeBtn.className.replace('bg-green-500', 'bg-blue-500');
      }
    }
  }
}

function toggleSubtaskCompletion(taskId, subtaskId) {
  const taskIndex = window.localTaskCache.findIndex(task => task._id === taskId);
  if (taskIndex === -1) return;
  
  const task = window.localTaskCache[taskIndex];
  if (!task.subtasks) return;
  
  const subtaskIndex = task.subtasks.findIndex(subtask => subtask.id === subtaskId);
  if (subtaskIndex === -1) return;
  
  task.subtasks[subtaskIndex].completed = !task.subtasks[subtaskIndex].completed;
  window.saveTaskCacheToLocalStorage();
  
  updateAllPanelsForTask(task);
}

function deleteSubtask(taskId, subtaskId) {
  const taskIndex = window.localTaskCache.findIndex(task => task._id === taskId);
  if (taskIndex === -1) return;
  
  const task = window.localTaskCache[taskIndex];
  if (!task.subtasks) return;
  
  task.subtasks = task.subtasks.filter(subtask => subtask.id !== subtaskId);
  window.saveTaskCacheToLocalStorage();
}

function removeAttachment(taskId, url) {
  if (window.fileManager && window.fileManager.removeAttachment) {
    return window.fileManager.removeAttachment(taskId, url);
  }
  
  const taskIndex = window.localTaskCache.findIndex(task => task._id === taskId);
  if (taskIndex === -1) return;
  
  const task = window.localTaskCache[taskIndex];
  if (!task.attachments) return;
  
  task.attachments = task.attachments.filter(attachment => 
    attachment.url !== url || attachment.taskId !== taskId
  );
  
  window.saveTaskCacheToLocalStorage();
}

function showPanelForTask(task) {
  if (!task || !task.list || !task._id) {
    console.error('Invalid task provided to showPanelForTask');
    return;
  }
  
  const listName = task.list;
  const taskId = task._id;
  
  const rightPanelsContainer = document.getElementById('right-panels-container');
  if (rightPanelsContainer) {
    rightPanelsContainer.classList.remove('hidden');
  }
  
  // Hide all panels first
  document.querySelectorAll('.right-panels-container').forEach(container => {
    container.classList.add('hidden');
  });
  
  const listId = listName.toLowerCase().replace(/\s+/g, '-');
  const containerIdForList = `right-panels-container-${listId}`;
  const listContainer = document.getElementById(containerIdForList);
  
  if (listContainer) {
    listContainer.classList.remove('hidden');
  } else {
    console.log(`Creating container for list: ${listName}`);
  }
  
  if (listContainer) {
    listContainer.querySelectorAll('.task-panel').forEach(panel => {
      panel.classList.add('hidden');
    });
  }
  
  const uniquePanelId = `right-panel-${listId}-${taskId}`;
  let panel = document.getElementById(uniquePanelId);
  
  if (!panel) {
    panel = createPanelForTask(task);
  } else {
    updatePanelWithTask(panel, task);
  }
  
  if (panel) {
    panel.classList.remove('hidden');
    console.log(`Showing panel for task: ${task.title} in list: ${listName}`);
    
    // Store the current task ID
    window.currentTaskId = taskId;
    localStorage.setItem('activeTaskId', taskId);
  } else {
    console.error(`Failed to show panel for task: ${task.title} in list: ${listName}`);
  }
}

function updatePanelWithTask(panel, task) {
  if (!panel || !task) return;
  
  const taskId = task._id;
  const titleElement = panel.querySelector('h2');
  if (titleElement) {
    titleElement.textContent = task.title || '';
  }
  
  const notesTextarea = panel.querySelector('.notes-textarea');
  if (notesTextarea) {
    notesTextarea.value = task.notes || '';
  }
  
  const subtasksList = panel.querySelector('.subtasks-list');
  if (subtasksList) {
    subtasksList.innerHTML = renderSubtasks(task);
  }
  
  const imagePreviewContainer = panel.querySelector('.image-preview-container');
  if (imagePreviewContainer) {
    imagePreviewContainer.innerHTML = renderAttachments(task);
  }
  
  // Apply blur effect based on task completion status
  const isTaskBlurred = localStorage.getItem('isTaskBlurred') === 'true';
  const blurContent = panel.querySelector('.task-blur-content');
  const completeBtn = panel.querySelector(`#complete-btn-${taskId}`) || panel.querySelector('.complete-btn');
  
  if (blurContent) {
    if (task.completed && isTaskBlurred) {
      blurContent.classList.add('blurred');
      blurContent.style.cssText = 'filter: blur(5px) !important; pointer-events: none;';
      if (completeBtn) {
        completeBtn.textContent = 'Mark as Incomplete';
        completeBtn.className = completeBtn.className.replace('bg-blue-500', 'bg-green-500');
      }
    } else {
      blurContent.classList.remove('blurred');
      blurContent.style.cssText = 'filter: none !important; pointer-events: auto;';
      if (completeBtn) {
        completeBtn.textContent = 'Mark as Complete';
        completeBtn.className = completeBtn.className.replace('bg-green-500', 'bg-blue-500');
      }
    }
  }
}

function attachRemoveListeners(panel, taskId) {
  panel.querySelectorAll('.remove-attachment').forEach(button => {
    button.addEventListener('click', function() {
      const attachmentPreview = this.closest('.attachment-preview');
      const url = attachmentPreview.dataset.url;
      if (window.fileManager && window.fileManager.removeAttachment) {
        window.fileManager.removeAttachment(taskId, url);
      } else {
        removeAttachment(taskId, url);
      }
      attachmentPreview.remove();
    });
  });
}

function updateAllPanelsForTask(task) {
  if (!task || !task._id) return;
  
  const taskPanels = document.querySelectorAll(`[data-task-id="${task._id}"]`);
  taskPanels.forEach(panel => {
    updatePanelWithTask(panel, task);
  });
}

function autoResizeTextarea(textarea) {
  if (!textarea) return;
  
  textarea.style.height = 'auto';
  textarea.style.height = (textarea.scrollHeight) + 'px';
}

function enhancedListChangeHandler(e) {
  if (e.detail && e.detail.list) {
    const listName = e.detail.list;
    console.log('List changed event detected, updating panel visibility for:', listName);
    
    localStorage.setItem('activeList', listName);
    updateRightPanelVisibility(listName);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  const activeTaskId = localStorage.getItem('activeTaskId');
  if (activeTaskId) {
    const task = window.localTaskCache.find(task => task._id === activeTaskId);
    if (task) {
      showPanelForTask(task);
    }
  }
  
  // Initialize panel visibility
  initializePanelVisibility();
  
  // Setup task add handler
  setupTaskAddHandler();
  
  // Remove existing listeners and add enhanced ones
  try {
    const oldListeners = window.getEventListeners ? window.getEventListeners(document) : null;
    if (oldListeners && oldListeners.listChanged) {
      oldListeners.listChanged.forEach(listener => {
        document.removeEventListener('listChanged', listener.listener);
      });
    }
  } catch (e) {
    console.log('Could not remove old event listeners, will add new ones', e);
  }
  
  // Add enhanced list change handler
  document.addEventListener('listChanged', enhancedListChangeHandler);
});

window.hasTasksInList = hasTasksInList;
window.updateRightPanelVisibility = updateRightPanelVisibility;
window.initializePanelVisibility = initializePanelVisibility;

window.markTaskComplete = function(taskId) {
  const taskIndex = window.localTaskCache.findIndex(task => task._id === taskId);
  if (taskIndex === -1) return;
  
  const task = window.localTaskCache[taskIndex];
  task.completed = !task.completed;
  window.saveTaskCacheToLocalStorage();
  
  updateAllPanelsForTask(task);
};

window.updateAllPanelsForTask = updateAllPanelsForTask; // Export this function for fileManager to use

window.updatePanelOnListChange = function(listName) {
  if (!listName) return;
  console.log(`List changed to: ${listName}, updating panel visibility`);
  updateRightPanelVisibility(listName);
};

window.createPanelForTask = createPanelForTask;
window.showPanelForTask = showPanelForTask;
window.updatePanelWithTask = updatePanelWithTask;
window.updateAllPanelsForTask = updateAllPanelsForTask; // Export this function for fileManager to use