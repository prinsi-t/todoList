/**
 * File Upload Fix for Task Manager App
 * This version fixes the createHash function issue and ensures file uploads work correctly
 */

let db;

function waitForDBReady(retries = 10) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      if (db) return resolve();
      attempts++;
      if (attempts > retries) return reject(new Error('IndexedDB not ready'));
      setTimeout(check, 100);
    };
    check();
  });
}


function openDatabase() {
  const request = indexedDB.open('taskAttachmentsDB', 2);

  request.onupgradeneeded = function(event) {
    db = event.target.result;
    if (!db.objectStoreNames.contains('attachments')) {
      const store = db.createObjectStore('attachments', { keyPath: ['taskId', 'name'] });
      store.createIndex('by_taskId', 'taskId', { unique: false });
    }
  };

  request.onsuccess = function(event) {
    db = event.target.result;
    console.log('Task Attachments IndexedDB opened successfully');
  };

  request.onerror = function(event) {
    console.error('Error opening Task Attachments IndexedDB:', event.target.errorCode);
  };
}

function loadAttachmentsForTask(taskId) {
  return new Promise((resolve, reject) => {
    if (!db) {
      console.warn('Database not initialized yet, initializing now');
      openDatabase();
      setTimeout(() => {
        loadAttachmentsForTask(taskId).then(resolve).catch(reject);
      }, 500);
      return;
    }

    const transaction = db.transaction(['attachments'], 'readonly');
    const objectStore = transaction.objectStore('attachments');
    const index = objectStore.index('by_taskId');
    const request = index.getAll(taskId);

    request.onsuccess = function(event) {
      const attachments = event.target.result;
      console.log(`Loaded ${attachments.length} attachments for task ${taskId}`);
      resolve(attachments);
    };

    request.onerror = function(event) {
      console.error('Error loading attachments from IndexedDB:', event.target.errorCode);
      reject(event.target.error);
    };
  });
}

// Fixed function to safely generate a file hash without external dependencies
function generateSimpleHash(str) {
  let hash = 0;
  if (str.length === 0) return hash.toString(16);
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return hash.toString(16);
}

function saveAttachmentToDB(taskId, file) {
  return new Promise((resolve, reject) => {
    if (!db) {
      console.log('Database not initialized during save, initializing now');
      openDatabase();
      setTimeout(() => {
        saveAttachmentToDB(taskId, file).then(resolve).catch(reject);
      }, 500);
      return;
    }

    const transaction = db.transaction(['attachments'], 'readwrite');
    const objectStore = transaction.objectStore('attachments');
    
    const fileName = file.name || `attachment_${Date.now()}`;
    const fileHash = generateSimpleHash(file.url.substring(0, 1000) + fileName);
    
    let taskList = '';
    if (window.localTaskCache && Array.isArray(window.localTaskCache)) {
      const task = window.localTaskCache.find(t => t._id === taskId);
      if (task) {
        taskList = task.list || '';
      } else {
        console.warn(`[saveAttachmentToDB] Task ${taskId} not found in localTaskCache`);
      }
    } else {
      console.warn('[saveAttachmentToDB] localTaskCache is not ready');
    }
    
    // fallback to activeList or unknown
    if (!taskList) {
      taskList = localStorage.getItem('activeList') || 'unknown';
    }
    
    const attachment = { 
      taskId: taskId, 
      name: fileName, 
      type: 'image',
      url: file.url, 
      fileHash: fileHash,
      list: taskList,
      date: new Date().toISOString()
    };
    
    console.log(`[saveAttachmentToDB] Saving file "${fileName}" for task ${taskId} under list "${taskList}"`);
    
    
    const request = objectStore.put(attachment);

    request.onsuccess = function() {
      console.log(`Attachment ${fileName} saved to task ${taskId}`);
      resolve(attachment);
    };

    request.onerror = function(event) {
      console.error('Error saving attachment to IndexedDB:', event.target.errorCode);
      reject(event.target.error);
    };
  });
}

function getCurrentTaskList(taskId) {
  if (!window.localTaskCache) {
    console.warn('Local task cache not available');
    return '';
  }
  const task = window.localTaskCache.find(t => t._id === taskId);
  return task ? task.list : '';
}

function deleteAttachmentFromDB(taskId, url) {
  return new Promise((resolve, reject) => {
    if (!db) {
      console.error('Database not initialized');
      reject(new Error('Database not initialized'));
      return;
    }

    const transaction = db.transaction(['attachments'], 'readwrite');
    const objectStore = transaction.objectStore('attachments');
    const index = objectStore.index('by_taskId');
    const request = index.getAll(taskId);

    request.onsuccess = function(event) {
      const attachments = event.target.result;
      const attachment = attachments.find(a => a.url === url);
      
      if (!attachment) {
        console.error(`Attachment with URL ${url} not found for task ${taskId}`);
        resolve(false);
        return;
      }
      
      const deleteRequest = objectStore.delete([taskId, attachment.name]);
      
      deleteRequest.onsuccess = function() {
        console.log(`Attachment ${attachment.name} deleted from task ${taskId}`);
        resolve(true);
      };
      
      deleteRequest.onerror = function(event) {
        console.error('Error deleting attachment from IndexedDB:', event.target.errorCode);
        reject(event.target.error);
      };
    };

    request.onerror = function(event) {
      console.error('Error finding attachment in IndexedDB:', event.target.errorCode);
      reject(event.target.error);
    };
  });
}

function handleTaskFiles(files, taskId) {
  return new Promise(async (resolve, reject) => {
    if (!files || files.length === 0 || !taskId) {
      reject(new Error('No files or task ID provided'));
      return;
    }

    console.log(`Processing ${files.length} files for task ${taskId}`);

    try {
      await waitForDBReady();  // 🧠 Ensure DB is ready before anything
    } catch (err) {
      console.error('IndexedDB not ready in time:', err);
      return reject(err);
    }

    const attachments = [];
    let processedCount = 0;

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) {
        processedCount++;
        console.warn(`Skipping non-image file: ${file.name}`);
        if (processedCount === files.length) {
          updateAttachmentUI(taskId);
          resolve(attachments);
        }
        return;
      }

      const reader = new FileReader();

      reader.onload = function (e) {
        const attachment = {
          name: file.name,
          type: 'image',
          url: e.target.result,
          size: file.size,
          lastModified: file.lastModified
        };

        saveAttachmentToDB(taskId, attachment)
          .then(() => {
            attachments.push(attachment);
            processedCount++;

            if (processedCount === files.length) {
              updateAttachmentUI(taskId);
              resolve(attachments);
            }
          })
          .catch(err => {
            console.error(`Error saving attachment ${file.name}:`, err);
            processedCount++;

            if (processedCount === files.length) {
              updateAttachmentUI(taskId);
              resolve(attachments);
            }
          });
      };

      reader.onerror = function () {
        console.error(`Error reading file ${file.name}`);
        processedCount++;

        if (processedCount === files.length) {
          updateAttachmentUI(taskId);
          resolve(attachments);
        }
      };

      reader.readAsDataURL(file);
    });
  });
}


function updateTaskWithAttachments(taskId, attachments, action = 'add') {
  if (!window.localTaskCache) {
    console.error('Local task cache not available');
    return;
  }

  const taskIndex = window.localTaskCache.findIndex(task => task._id === taskId);
  if (taskIndex === -1) {
    console.error(`Task ${taskId} not found in cache`);
    return;
  }
  
  const task = window.localTaskCache[taskIndex];
  
  if (!task.attachments) {
    task.attachments = [];
  }
  
  if (action === 'add') {
    attachments.forEach(attachment => {
      task.attachments.push({
        type: 'image', 
        url: attachment.url,
        taskId: taskId,
        list: task.list
      });
    });
  } else if (action === 'delete') {
    const urlsToRemove = Array.isArray(attachments) ? attachments : [attachments];
    task.attachments = task.attachments.filter(attachment => 
      !urlsToRemove.includes(attachment.url)
    );
  }
  
  if (window.saveTaskCacheToLocalStorage) {
    window.saveTaskCacheToLocalStorage();
  } else {
    console.warn('saveTaskCacheToLocalStorage function not available');
  }
  
  if (typeof window.updateAllPanelsForTask === 'function') {
    window.updateAllPanelsForTask(task);
  }
}

function deleteTaskAttachment(taskId, attachmentUrl) {
  if (!taskId || !attachmentUrl) {
    console.error('Missing taskId or attachmentUrl for deletion');
    return Promise.reject('Missing required parameters');
  }
  
  return deleteAttachmentFromDB(taskId, attachmentUrl)
    .then(() => {
      updateTaskWithAttachments(taskId, [attachmentUrl], 'delete');
      return true;
    })
    .catch(err => {
      console.error('Error deleting attachment:', err);
      return false;
    });
}

function findOrCreateFileInput(taskPanel, taskId) {
  let fileInput = taskPanel.querySelector(`input[type="file"][id="file-upload-${taskId}"]`);
  
  if (!fileInput) {
    fileInput = taskPanel.querySelector('input[type="file"][id^="file-upload-"]');
  }
  
  if (!fileInput) {
    console.log(`Creating new file input for task ${taskId}`);
    
    const fileUploadSection = taskPanel.querySelector('.image-preview-container');
    if (!fileUploadSection) {
      // Create file upload section if it doesn't exist
      const containerDiv = document.createElement('div');
      containerDiv.className = 'image-preview-container mt-4';
      
      const taskContentSection = taskPanel.querySelector('.task-content');
      if (taskContentSection) {
        taskContentSection.appendChild(containerDiv);
      } else {
        // Fallback - append to the panel itself
        taskPanel.appendChild(containerDiv);
      }
      
      console.log(`Created new image preview container for task ${taskId}`);
    }

    // Create container for file input and label
    const uploadContainer = document.createElement('div');
    uploadContainer.className = 'flex items-center my-2';
    
   
    
    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = `file-upload-${taskId}`;
    fileInput.className = 'hidden';
    fileInput.accept = 'image/*';
    
  
    uploadContainer.appendChild(fileInput);
    
    const imageContainer = taskPanel.querySelector('.image-preview-container');
    if (imageContainer) {
      imageContainer.appendChild(uploadContainer);
    } else {
      console.error(`Image preview container not found for task ${taskId} after creation attempt`);
    }
  }
  
  return fileInput;
}

function setupTaskFileUpload(taskPanel, taskId) {
  if (!taskPanel || !taskId) {
    console.error('Missing taskPanel or taskId for setupTaskFileUpload');
    return;
  }
  
  const fileInput = findOrCreateFileInput(taskPanel, taskId);
  if (!fileInput) {
    console.error(`Failed to find or create file input for task ${taskId}`);
    return;
  }
  
  setupFileInputHandler(fileInput, taskId);
}

function setupFileInputHandler(fileInput, taskId) {
  // Remove existing handler to avoid duplicates
  if (fileInput._changeHandler) {
    fileInput.removeEventListener('change', fileInput._changeHandler);
  }
  
  fileInput._changeHandler = function(e) {
    const files = e.target.files;
    if (!files || files.length === 0) {
      return;
    }
    
    console.log(`File selected for task ${taskId}:`, files[0].name);
    
    handleTaskFiles(files, taskId)
      .then(attachments => {
        console.log(`Added ${attachments.length} attachments to task ${taskId}`);
        // Clear the input value to allow selecting the same file again
        fileInput.value = '';
        
        // Update the UI to show the new attachments
        updateAttachmentUI(taskId);
      })
      .catch(error => {
        console.error('Error handling files:', error);
        fileInput.value = '';
      });
  };
  
  fileInput.addEventListener('change', fileInput._changeHandler);
  fileInput.dataset.hasUploadHandler = 'true';
  console.log(`File input handler set up for task ${taskId}`);
}



function removeAttachment(taskId, url) {
  return deleteTaskAttachment(taskId, url);
}

function applyFixToExistingPanels() {
  console.log('Applying fix to existing panel file uploads');
  
  const panels = document.querySelectorAll('.task-panel');
  console.log(`Found ${panels.length} task panels to fix`);
  
  panels.forEach(panel => {
    const taskId = panel.dataset.taskId;
    if (taskId) {
      setupTaskFileUpload(panel, taskId);
    }
  });
  
  if (panels.length === 0) {
    const rightPanels = document.querySelectorAll('[id^="right-panel-"]');
    console.log(`Found ${rightPanels.length} right panels to fix`);
    
    rightPanels.forEach(panel => {
      const idParts = panel.id.split('-');
      const taskId = idParts[idParts.length - 1];
      
      if (taskId) {
        setupTaskFileUpload(panel, taskId);
      }
    });
  }
}

// Fix for the missing createHash function - improve this to be more robust
function fixThCreateHash() {
  console.log('Applying Th.createHash fix');
  
  if (typeof window.Th === 'undefined') {
    console.log('Th object not found, creating it');
    window.Th = {};
  }
  
  if (window.Th && typeof window.Th.createHash !== 'function') {
    window.Th.createHash = function(algorithm) {
      console.log(`Creating hash with algorithm: ${algorithm}`);
      // Simple mock implementation that works for our purposes
      return {
        update: function(data) {
          return {
            digest: function(encoding) {
              // Just use our simple hash function instead
              const result = generateSimpleHash(data);
              console.log(`Generated hash digest: ${result.substring(0, 8)}...`);
              return result;
            }
          };
        }
      };
    };
    console.log('Successfully fixed missing Th.createHash function');
  }
}

// Enhance the setupDropZones function to properly handle file drops
function setupDropZones() {
  console.log('Setting up drop zones for file uploads');
  
  const dropZones = document.querySelectorAll('.drop-zone');
  console.log(`Found ${dropZones.length} drop zones`);
  
  dropZones.forEach(zone => {
    const listName = zone.dataset.list;
    console.log(`Setting up drop zone for list: ${listName}`);
    
    if (!listName) {
      console.warn('Drop zone missing list name attribute');
      return;
    }
    
    // Remove existing handlers to avoid duplicates
    if (zone._dragoverHandler) zone.removeEventListener('dragover', zone._dragoverHandler);
    if (zone._dragleaveHandler) zone.removeEventListener('dragleave', zone._dragleaveHandler);
    if (zone._dropHandler) zone.removeEventListener('drop', zone._dropHandler);
    if (zone._clickHandler) zone.removeEventListener('click', zone._clickHandler);
    
    zone._dragoverHandler = function(e) {
      e.preventDefault();
      e.stopPropagation();
      this.classList.add('bg-dark-hover');
      console.log('Drag over event on drop zone');
    };
    
    zone._dragleaveHandler = function(e) {
      e.preventDefault();
      e.stopPropagation();
      this.classList.remove('bg-dark-hover');
    };
    
    zone._dropHandler = function(e) {
      e.preventDefault();
      e.stopPropagation();
      this.classList.remove('bg-dark-hover');
      
      // Get the current task ID from the panel
      const panel = this.closest('.right-panel');
      const taskId = panel ? panel.getAttribute('data-current-task-id') : null;
      
      console.log(`Drop event detected for task: ${taskId}`);
      
      if (!taskId) {
        console.error('No active task selected for file drop');
        return;
      }
      
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        console.log(`Processing ${files.length} dropped files`);
        handleTaskFiles(files, taskId)
          .then(attachments => {
            console.log(`Successfully added ${attachments.length} attachments`);
          })
          .catch(err => {
            console.error('Error handling dropped files:', err);
          });
      }
    };
    
    zone._clickHandler = function() {
      // Get the current task ID from localStorage
      const selectedTaskId = localStorage.getItem('selectedTaskId');
      
      if (!selectedTaskId) {
        console.warn('No selected task ID found in localStorage');
        alert('Please select a task first before adding attachments');
        return;
      }
      
      console.log(`Click on drop zone for selected task: ${selectedTaskId}`);
      
      // Find or create a file input for this task
      let fileInput = document.getElementById(`file-upload-${selectedTaskId}`);
      
      if (!fileInput) {
        console.log(`Creating new file input for task ${selectedTaskId}`);
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = `file-upload-${selectedTaskId}`;
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        fileInput.multiple = true;
        document.body.appendChild(fileInput);
        
        setupFileInputHandler(fileInput, selectedTaskId);
      }
      
      fileInput.click();
    };
    
    zone.addEventListener('dragover', zone._dragoverHandler);
    zone.addEventListener('dragleave', zone._dragleaveHandler);
    zone.addEventListener('drop', zone._dropHandler);
    zone.addEventListener('click', zone._clickHandler);
    
    zone.dataset.hasDropHandlers = 'true';
    console.log(`Drop handlers set up for zone: ${listName}`);
  });
}

// Add this function after setupDropZones
function ensureDropZonesExist() {
  console.log('Ensuring drop zones exist in all panels');
  
  // Get all right panels
  const rightPanels = document.querySelectorAll('.right-panel');
  console.log(`Found ${rightPanels.length} right panels to check for drop zones`);
  
  rightPanels.forEach(panel => {
    // Check if this panel already has a drop zone
    let dropZone = panel.querySelector('.drop-zone');
    
    if (!dropZone) {
      console.log('Creating drop zone for panel:', panel.id);
      
      // Get the list name from the panel
      const listName = panel.getAttribute('data-list');
      
      // Create the drop zone element
      dropZone = document.createElement('div');
      dropZone.className = 'drop-zone border-2 border-dashed border-gray-600 rounded-md p-6 text-center cursor-pointer hover:bg-dark-hover transition-colors';
      dropZone.setAttribute('data-list', listName || '');
      
      // Add the inner content
      dropZone.innerHTML = `
        <div class="flex flex-col items-center justify-center">
          <i class="fas fa-cloud-upload-alt text-gray-400 text-3xl mb-2"></i>
          <p class="text-gray-400">Click to add / drop your files here</p>
          <p class="text-gray-500 text-xs mt-1">(Max 10 images)</p>
        </div>
      `;
      
      // Find the attachments section or create one
      let attachmentsSection = panel.querySelector('.attachments-section');
      
      if (!attachmentsSection) {
        attachmentsSection = document.createElement('div');
        attachmentsSection.className = 'attachments-section mt-4';
        attachmentsSection.innerHTML = '<h3 class="text-lg font-medium text-gray-200 mb-2">ATTACHMENTS</h3>';
        
        // Find a good place to insert it
        const notesSection = panel.querySelector('.notes-section');
        if (notesSection) {
          notesSection.parentNode.insertBefore(attachmentsSection, notesSection.nextSibling);
        } else {
          panel.appendChild(attachmentsSection);
        }
      }
      
      // Add the drop zone to the attachments section
      attachmentsSection.appendChild(dropZone);
      
      // Create image preview container
      const previewContainer = document.createElement('div');
      previewContainer.className = 'image-preview-container mt-4 flex flex-wrap gap-2';
      attachmentsSection.appendChild(previewContainer);
    }
  });
  
  // Set up event handlers for the new drop zones
  setupDropZones();
}

function listenForTaskSelection() {
  // Listen for clicks on task items
  document.addEventListener('click', function(e) {
    const taskItem = e.target.closest('.task-item');
    if (taskItem) {
      const taskId = taskItem.getAttribute('data-task-id');
      if (taskId) {
        console.log(`Task selected: ${taskId}`);
        localStorage.setItem('selectedTaskId', taskId); // ✅ ADD THIS
        setTimeout(() => {
          updateAttachmentUI(taskId);
        }, 300);
      }
    }
  });
  
  
  document.addEventListener('taskSelected', function (e) {
    if (e.detail && e.detail.taskId) {
      const taskId = e.detail.taskId;
      console.log(`Task selected event received: ${taskId}`);
      localStorage.setItem('selectedTaskId', taskId);
      updateAttachmentUI(taskId);
  
      setTimeout(() => {
        const panel = document.querySelector(`.right-panel[data-current-task-id="${taskId}"]`) ||
                      document.querySelector(`.task-panel[data-task-id="${taskId}"]`);
  
        if (panel) {
          console.log(`[taskSelected] Setting up file upload for task panel ${taskId}`);
          setupTaskFileUpload(panel, taskId);
  
          // ✅ Fix: Add drop zone if needed and rewire handlers
          if (typeof ensureDropZonesExist === 'function') ensureDropZonesExist();
          if (typeof setupDropZones === 'function') setupDropZones();
        } else {
          console.warn(`[taskSelected] Panel for task ${taskId} not found`);
        }
      }, 200);
    }
  });
  
  
}


// Enhance the initialize function to ensure everything is properly set up
function initialize() {
  console.log('Initializing Enhanced FileManager with fixes');
  
  // Fix the createHash function first
  fixThCreateHash();
  
  // Then proceed with normal initialization
  openDatabase();

  listenForTaskSelection();
  
  window.fileManager = {
    loadAttachmentsForTask,
    handleTaskFiles,
    setupTaskFileUpload,
    deleteTaskAttachment,
    removeAttachment,
    isInitialized: true
  };
  
  // Apply fix for file upload functionality
  window.fileUploadFix = {
    fix: function() {
      console.log('Applying file upload fix');
      fixThCreateHash();
      ensureDropZonesExist();
      applyFixToExistingPanels();
      setupDropZones();
      return 'File upload fix applied';
    },
    diagnose: function() {
      console.log('Starting file upload diagnostic tool...');
      console.log('IndexedDB is supported:', !!window.indexedDB);
      console.log('fileManager exists:', !!window.fileManager);
      
      // Find file input elements
      const fileInputs = document.querySelectorAll('input[type="file"]');
      console.log('Found', fileInputs.length, 'file input elements');
      
      // Find drop zones
      const dropZones = document.querySelectorAll('.drop-zone');
      console.log('Found', dropZones.length, 'drop zones');
      
      // Check if Th.createHash is fixed
      console.log('Th.createHash is a function:', typeof window.Th?.createHash === 'function');
      
      return 'File upload diagnostic and fix tool loaded successfully!';
    }
  };
  
  // Run diagnostics and fixes
  setTimeout(() => {
    if (window.fileUploadFix) {
      window.fileUploadFix.diagnose();
      window.fileUploadFix.fix();
    }
  }, 500);
}

function updateAttachmentUI(taskId) {
  console.log(`Updating attachment UI for task ${taskId}`);
  
  // Find all panels for this task
  const panels = document.querySelectorAll(`.right-panel[data-current-task-id="${taskId}"]`);
  
  if (panels.length === 0) {
    // Try to find the panel for the active list
    const activeList = localStorage.getItem('activeList');
    const activePanel = document.querySelector(`.right-panel[data-list="${activeList}"]`);
    
    if (activePanel) {
      console.log(`Using active list panel for task ${taskId}`);
      updatePanelAttachments(activePanel, taskId);
    } else {
      console.log(`No panels found for task ${taskId}`);
    }
    return;
  }
  
  panels.forEach(panel => {
    updatePanelAttachments(panel, taskId);
  });
}

function updatePanelAttachments(panel, taskId) {
  const container = panel.querySelector('.image-preview-container');
  if (!container) {
    console.warn('No image preview container found in panel');
    return;
  }
  
  loadAttachmentsForTask(taskId)
    .then(attachments => {
      console.log(`Loaded ${attachments.length} attachments for UI update`);
      
      // Clear existing previews but keep any file input elements
      const fileInputs = container.querySelectorAll('input[type="file"]');
      container.innerHTML = '';
      fileInputs.forEach(input => container.appendChild(input));
      
      // Add attachment previews
      attachments.forEach(attachment => {
        if (attachment.type === 'image') {
          const previewDiv = document.createElement('div');
          previewDiv.className = 'relative inline-block m-2';
          previewDiv.innerHTML = `
            <img src="${attachment.url}" class="w-24 h-24 object-cover rounded-md border border-gray-600" alt="${attachment.name}">
            <button class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center remove-attachment" data-task-id="${taskId}" data-url="${attachment.url}">
              <i class="fas fa-times text-xs"></i>
            </button>
          `;
          container.appendChild(previewDiv);
          
          // Add click handler for remove button
          const removeBtn = previewDiv.querySelector('.remove-attachment');
          if (removeBtn) {
            removeBtn.addEventListener('click', function() {
              const url = this.getAttribute('data-url');
              const taskId = this.getAttribute('data-task-id');
              removeAttachment(taskId, url).then(() => {
                // Remove this preview after successful deletion
                previewDiv.remove();
              });
            });
          }
        }
      });
    })
    .catch(err => {
      console.error('Error updating attachment UI:', err);
    });
}

function setupMutationObserver() {
  let debounceTimer;
  const observer = new MutationObserver(function(mutations) {
    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      let newPanelsFound = false;
      let newFileInputsFound = false;
      let newListPanelsDetected = false;

      mutations.forEach(function(mutation) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(function(node) {
            if (node.nodeType !== 1) return;

            const isPanel = node.classList?.contains('task-panel') || node.querySelector?.('.task-panel');
            const isRightPanel = node.classList?.contains('right-panel') || node.querySelector?.('.right-panel');

            if (isPanel) {
              console.log('[Observer] New task panel detected');
              newPanelsFound = true;
            }

            if (isRightPanel) {
              const panels = node.classList.contains('right-panel') ? [node] : node.querySelectorAll('.right-panel');
              panels.forEach(panel => {
                const listName = panel.getAttribute('data-list');
                if (listName && !panel.querySelector('.drop-zone')) {
                  console.log(`[Observer] Right panel for new list "${listName}" detected without drop zone`);
                  newListPanelsDetected = true;
                }
              });
            }

            const inputs = node.querySelectorAll?.('input[type="file"][id^="file-upload-"]') || [];
            if (inputs.length > 0) {
              console.log('[Observer] New file inputs detected:', inputs.length);
              newFileInputsFound = true;
            }
          });
        }
      });

      if (newPanelsFound) {
        console.log('[Observer] Applying fixes to new task panels');
        applyFixToExistingPanels();
      }

      if (newFileInputsFound) {
        console.log('[Observer] Binding new file input handlers');
        const fileInputs = document.querySelectorAll('input[type="file"][id^="file-upload-"]');
        fileInputs.forEach(input => {
          if (input.dataset.hasUploadHandler !== 'true') {
            const taskId = input.id.replace('file-upload-', '');
            if (taskId) {
              setupFileInputHandler(input, taskId);
            }
          }
        });
      }

      if (newListPanelsDetected) {
        console.log('[Observer] Ensuring drop zones exist for new list panels');
        if (window.fileUploadFix) {
          window.fileUploadFix.fix();  // Add drop zones + input handlers
        }
      }
    }, 300);
  });

  observer.observe(document.body, { childList: true, subtree: true });
}


function setupTaskItemClickHandler() {
  if (window._taskItemClickHandler) {
    document.removeEventListener('click', window._taskItemClickHandler);
  }
  
  window._taskItemClickHandler = function(e) {
    const taskItem = e.target.closest('.task-item');
    if (taskItem) {
      const taskId = taskItem.dataset.taskId;
      if (taskId) {
        setTimeout(() => {
          const panel = document.querySelector(`.task-panel[data-task-id="${taskId}"]`);
          if (panel) {
            setupTaskFileUpload(panel, taskId);
          }
        }, 200);
      }
    }
  };
  
  document.addEventListener('click', window._taskItemClickHandler);
}

// Initialize when the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize(); // DOM is already ready, call initialize directly
}

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateSimpleHash,
    fixThCreateHash,
    saveAttachmentToDB,
    handleTaskFiles,
    setupTaskFileUpload
  };
}