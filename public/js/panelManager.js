let activePanels = {};

function createPanelForList(listName) {
  if (!listName) {
    console.error('No list name provided to createPanelForList');
    return null;
  }

  const listId = listName.toLowerCase().replace(/\s+/g, '-');
  const panelId = `right-panel-${listId}`;
  
  let panel = document.getElementById(panelId);
  if (panel) {
    console.log(`Panel already exists for list: ${listName}`);
    return panel;
  }

  console.log(`Creating new panel for list: ${listName}`);
  
  const rightPanelsContainer = document.getElementById('right-panels-container');
  if (!rightPanelsContainer) {
    console.error('Right panels container not found');
    
    const mainContent = document.querySelector('.main-content') || document.querySelector('main');
    if (mainContent) {
      const newContainer = document.createElement('div');
      newContainer.id = 'right-panels-container';
      newContainer.className = 'flex-1 bg-dark-accent rounded-lg p-6 h-full right-panels-container';
      mainContent.appendChild(newContainer);
      console.log('Created new right panels container');
    } else {
      console.error('Main content container not found, cannot create right panels container');
      return null;
    }
  }

  panel = document.createElement('div');
  panel.id = panelId;
  panel.className = 'task-panel h-full flex flex-col hidden';
  panel.dataset.list = listName;

  panel.innerHTML = `
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="text-xl font-semibold text-gray-100 mb-1"></h2>
        <p class="text-gray-400">${listName}</p>
      </div>
      <div class="flex gap-3">
        <button id="complete-btn-${listId}" class="bg-blue-500 text-white px-4 py-2 rounded-md">Mark as Complete</button>
        <button class="delete-task-btn bg-red-500/80 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors duration-150">
          <i class="fas fa-trash mr-1"></i> Delete
        </button>
      </div>
    </div>
    
    <div class="task-blur-content flex-grow flex flex-col gap-6 overflow-y-auto">
      <div class="bg-dark-bg rounded-lg p-4">
        <h3 class="text-gray-200 font-medium mb-3">Notes</h3>
        <textarea class="notes-textarea w-full bg-dark-bg resize-none text-gray-300 focus:outline-none" rows="4" placeholder="Add notes here..."></textarea>
      </div>
      
      <div class="bg-dark-bg rounded-lg p-4">
        <div class="flex justify-between items-center mb-3">
          <h3 class="text-gray-200 font-medium">Subtasks</h3>
          <button class="add-subtask text-blue-400 hover:text-blue-300 text-sm flex items-center">
            <i class="fas fa-plus mr-1"></i> Add Subtask
          </button>
        </div>
        <div class="subtasks-list">
          <div class="text-gray-500 text-sm py-2">No subtasks added yet.</div>
        </div>
      </div>
      
      <div class="bg-dark-bg rounded-lg p-4">
        <div class="flex justify-between items-center mb-3">
          <h3 class="text-gray-200 font-medium">Attachments</h3>
          <label for="file-upload-${listId}" class="text-blue-400 hover:text-blue-300 text-sm cursor-pointer flex items-center">
            <i class="fas fa-paperclip mr-1"></i> Add File
          </label>
          <input id="file-upload-${listId}" type="file" class="hidden" accept="image/*">
        </div>
        <div class="image-preview-container flex flex-wrap gap-3"></div>
      </div>
    </div>
  `;

  const container = document.getElementById('right-panels-container');
  if (container) {
    container.appendChild(panel);
    console.log(`Added panel for "${listName}" to container`);
    
    activePanels[listName] = panel;
    
    setupPanelEventListeners(panel, listName);
    
    return panel;
  } else {
    console.error('Right panels container still not found after attempted creation');
    return null;
  }
}

function setupPanelEventListeners(panel, listName) {
  if (!panel) return;
  
  const listId = listName.toLowerCase().replace(/\s+/g, '-');
  
  const completeBtn = panel.querySelector(`#complete-btn-${listId}`);
  if (completeBtn) {
    completeBtn.addEventListener('click', function() {
      window.markSelectedTaskComplete();
    });
  }
  
  const deleteBtn = panel.querySelector('.delete-task-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', function() {
      const taskId = window.currentTaskId;
      if (taskId) {
        deleteTask(taskId);
      }
    });
  }
  
  const addSubtaskBtn = panel.querySelector('.add-subtask');
  if (addSubtaskBtn) {
    addSubtaskBtn.addEventListener('click', function() {
      const taskId = window.currentTaskId;
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
    });
  }
  
  const fileInput = panel.querySelector(`#file-upload-${listId}`);
  if (fileInput) {
    fileInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file || !file.type.match('image.*')) return;
      
      const taskId = window.currentTaskId;
      if (!taskId) {
        console.error('No current task selected for attachment');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = function(e) {
        const taskIndex = localTaskCache.findIndex(task => task._id === taskId);
        if (taskIndex === -1) {
          console.error('Task not found in cache');
          return;
        }
        
        const currentTask = localTaskCache[taskIndex];
        
        if (!currentTask.attachments) {
          currentTask.attachments = [];
        }
        
        currentTask.attachments.push({
          type: 'image',
          url: e.target.result,
          taskId: taskId,
          list: currentTask.list
        });
        
        saveTaskCacheToLocalStorage();
        
        updatePanelWithTask(panel, currentTask);
      };
      
      reader.readAsDataURL(file);
      fileInput.value = '';
    });
  }
  
  const notesTextarea = panel.querySelector('.notes-textarea');
  if (notesTextarea) {
    notesTextarea.addEventListener('input', function() {
      autoResizeTextarea(this);
      
      const taskId = window.currentTaskId;
      if (!taskId) return;
      
      const taskIndex = localTaskCache.findIndex(task => task._id === taskId);
      if (taskIndex === -1) return;
      
      localTaskCache[taskIndex].notes = this.value;
      saveTaskCacheToLocalStorage();
    });
  }
}

function showPanelForList(listName) {
  if (!listName) {
    console.error('No list name provided to showPanelForList');
    return;
  }
  
  const listId = listName.toLowerCase().replace(/\s+/g, '-');
  const panelId = `right-panel-${listId}`;
  
  document.querySelectorAll('.task-panel').forEach(panel => {
    panel.classList.add('hidden');
  });
  
  let panel = document.getElementById(panelId);
  if (!panel) {
    panel = createPanelForList(listName);
  }
  
  if (panel) {
    panel.classList.remove('hidden');
    console.log(`Showing panel for list: ${listName}`);
  } else {
    console.error(`Failed to show panel for list: ${listName}`);
  }
}

function updatePanelWithTask(panel, task) {
  if (!panel || !task) {
    console.error('Missing panel or task for updatePanelWithTask');
    return;
  }
  
  console.log(`Updating panel with task: ${task.title} (ID: ${task._id})`);
  
  const titleElement = panel.querySelector('h2');
  if (titleElement) {
    titleElement.textContent = task.title;
  }
  
  const listElement = panel.querySelector('.text-gray-400');
  if (listElement) {
    listElement.textContent = task.list;
  }
  
  const notesTextarea = panel.querySelector('.notes-textarea');
  if (notesTextarea) {
    notesTextarea.value = task.notes || '';
    autoResizeTextarea(notesTextarea);
  }
  
  const listId = task.list.toLowerCase().replace(/\s+/g, '-');
  const completeBtn = panel.querySelector(`#complete-btn-${listId}`);
  if (completeBtn) {
    if (task.completed) {
      completeBtn.textContent = 'Mark as Incomplete';
      completeBtn.className = 'bg-green-500 text-white px-4 py-2 rounded-md';
    } else {
      completeBtn.textContent = 'Mark as Complete';
      completeBtn.className = 'bg-blue-500 text-white px-4 py-2 rounded-md';
    }
  }
  
  const subtasksList = panel.querySelector('.subtasks-list');
  if (subtasksList) {
    subtasksList.innerHTML = '';
    
    if (task.subtasks && task.subtasks.length > 0) {
      task.subtasks.forEach(subtask => {
        const subtaskElement = document.createElement('div');
        subtaskElement.className = 'flex items-center gap-2 mb-2';
        subtaskElement.dataset.subtaskId = subtask.id;
        
        const checkbox = document.createElement('div');
        checkbox.className = `checkbox ${subtask.completed ? 'checked bg-blue-500 border-blue-500' : ''} w-5 h-5 border-2 border-dark-border rounded-full flex items-center justify-center transition-colors duration-200`;
        
        if (subtask.completed) {
          const checkIcon = document.createElement('i');
          checkIcon.className = 'fas fa-check text-white text-xs';
          checkbox.appendChild(checkIcon);
        }
        
        const titleSpan = document.createElement('span');
        titleSpan.className = `${subtask.completed ? 'line-through text-gray-500' : 'text-gray-300'} flex-grow`;
        titleSpan.textContent = subtask.title;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'text-red-400/80 hover:text-red-400';
        deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
        
        subtaskElement.appendChild(checkbox);
        subtaskElement.appendChild(titleSpan);
        subtaskElement.appendChild(deleteBtn);
        subtasksList.appendChild(subtaskElement);
      });
    } else {
      subtasksList.innerHTML = '<div class="text-gray-500 text-sm py-2">No subtasks added yet.</div>';
    }
  }
  
  const imagePreviewContainer = panel.querySelector('.image-preview-container');
  if (imagePreviewContainer) {
    imagePreviewContainer.innerHTML = '';
    
    console.log('Current task for attachment filtering:', {
      taskId: task._id,
      list: task.list,
      allAttachments: task.attachments
    });
    
    if (task.attachments && task.attachments.length > 0) {
      // Extremely strict filtering of attachments
      const taskAttachments = task.attachments.filter(attachment => {
        const isMatch = attachment.taskId === task._id && 
                        attachment.list === task.list && 
                        attachment.type === 'image';
        
        console.log('Attachment match check:', {
          attachment,
          isMatch,
          expectedTaskId: task._id,
          expectedList: task.list
        });
        
        return isMatch;
      });
      
      console.log('Filtered task attachments:', taskAttachments);
      
      taskAttachments.forEach(attachment => {
        const imagePreview = document.createElement('div');
        imagePreview.className = 'relative';
        
        const img = document.createElement('img');
        img.src = attachment.url;
        img.className = 'w-32 h-32 object-cover rounded-md';
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center';
        removeBtn.innerHTML = '<i class="fas fa-times text-xs"></i>';
        
        removeBtn.addEventListener('click', function() {
          const taskIndex = localTaskCache.findIndex(t => t._id === task._id);
          if (taskIndex !== -1) {
            const currentTask = localTaskCache[taskIndex];
            if (currentTask.attachments) {
              // Remove only the specific attachment using multiple criteria
              currentTask.attachments = currentTask.attachments.filter(
                a => !(
                  a.id === attachment.id && 
                  a.taskId === task._id && 
                  a.list === task.list
                )
              );
              saveTaskCacheToLocalStorage();
            }
            
            imagePreview.remove();
          }
        });
        
        imagePreview.appendChild(img);
        imagePreview.appendChild(removeBtn);
        imagePreviewContainer.appendChild(imagePreview);
      });
    }
  }
  
  const isTaskBlurred = localStorage.getItem('isTaskBlurred') === 'true';
  const blurContent = panel.querySelector('.task-blur-content');
  
  if (blurContent) {
    if (task.completed && isTaskBlurred) {
      blurContent.classList.add('blurred');
      blurContent.style.cssText = 'filter: blur(5px) !important; pointer-events: none;';
      console.log('Applied blur effect to completed task');
    } else {
      blurContent.classList.remove('blurred');
      blurContent.style.cssText = 'filter: none !important; pointer-events: auto;';
      console.log('Removed blur effect');
    }
  }
}

function clearPanel(panel, listName) {
  if (!panel) return;
  
  console.log(`Clearing panel for list: ${listName}`);
  
  const titleElement = panel.querySelector('h2');
  if (titleElement) {
    titleElement.textContent = '';
  }
  
  const notesTextarea = panel.querySelector('.notes-textarea');
  if (notesTextarea) {
    notesTextarea.value = '';
  }
  
  const subtasksList = panel.querySelector('.subtasks-list');
  if (subtasksList) {
    subtasksList.innerHTML = '<div class="text-gray-500 text-sm py-2">No subtasks added yet.</div>';
  }
  
  const imagePreviewContainer = panel.querySelector('.image-preview-container');
  if (imagePreviewContainer) {
    imagePreviewContainer.innerHTML = '';
  }
  
  const blurContent = panel.querySelector('.task-blur-content');
  if (blurContent) {
    blurContent.classList.remove('blurred');
    blurContent.style.cssText = 'filter: none !important; pointer-events: auto;';
  }
}

function autoResizeTextarea(textarea) {
  if (!textarea) return;
  
  textarea.style.height = 'auto';
  textarea.style.height = (textarea.scrollHeight) + 'px';
}

document.addEventListener('DOMContentLoaded', function() {
  const mainContent = document.querySelector('.main-content') || document.querySelector('main');
  
  if (!document.getElementById('right-panels-container') && mainContent) {
    const container = document.createElement('div');
    container.id = 'right-panels-container';
    container.className = 'flex-1 bg-dark-accent rounded-lg p-6 h-full right-panels-container';
    mainContent.appendChild(container);
    console.log('Created right panels container during initialization');
  }
  
  const defaultLists = ['Personal', 'Work', 'Grocery List'];
  defaultLists.forEach(list => {
    createPanelForList(list);
  });
  
  try {
    const customLists = JSON.parse(localStorage.getItem('customLists') || '[]');
    customLists.forEach(list => {
      createPanelForList(list);
    });
  } catch (error) {
    console.error('Error loading custom lists:', error);
  }
  
  const activeList = localStorage.getItem('activeList') || 'Personal';
  showPanelForList(activeList);
});

window.createPanelForList = createPanelForList;
window.showPanelForList = showPanelForList;
window.updatePanelWithTask = updatePanelWithTask;
window.clearPanel = clearPanel;