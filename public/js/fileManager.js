// Set up IndexedDB
let db;

function openDatabase() {
  const request = indexedDB.open('attachmentsDB', 1);

  request.onupgradeneeded = function(event) {
    db = event.target.result;
    if (!db.objectStoreNames.contains('attachments')) {
      db.createObjectStore('attachments', { keyPath: 'name' });
    }
  };

  request.onsuccess = function(event) {
    db = event.target.result;
    console.log('IndexedDB opened successfully');
    loadAttachmentsFromDB();
  };

  request.onerror = function(event) {
    console.error('Error opening IndexedDB:', event.target.errorCode);
  };
}

function loadAttachmentsFromDB() {
  const transaction = db.transaction(['attachments'], 'readonly');
  const objectStore = transaction.objectStore('attachments');
  const request = objectStore.getAll();

  request.onsuccess = function(event) {
    const attachments = event.target.result;
    console.log('Loaded attachments from IndexedDB:', attachments);
    displayAttachments(attachments);
  };

  request.onerror = function(event) {
    console.error('Error loading attachments from IndexedDB:', event.target.errorCode);
  };
}

function saveAttachmentToDB(file, dataUrl) {
  const transaction = db.transaction(['attachments'], 'readwrite');
  const objectStore = transaction.objectStore('attachments');
  const request = objectStore.put({ name: file.name, dataUrl: dataUrl });

  request.onsuccess = function() {
    console.log('Attachment saved to IndexedDB:', file.name);
  };

  request.onerror = function(event) {
    console.error('Error saving attachment to IndexedDB:', event.target.errorCode);
  };
}

function deleteAttachmentFromDB(fileName) {
  const transaction = db.transaction(['attachments'], 'readwrite');
  const objectStore = transaction.objectStore('attachments');
  const request = objectStore.delete(fileName);

  request.onsuccess = function() {
    console.log('Attachment deleted from IndexedDB:', fileName);
  };

  request.onerror = function(event) {
    console.error('Error deleting attachment from IndexedDB:', event.target.errorCode);
  };
}

// Initialize IndexedDB on page load
document.addEventListener('DOMContentLoaded', () => {
  openDatabase();
});

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
  console.log('Current number of attachments:', currentAttachments);
  
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
      console.log('File read complete for:', file.name);
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
        deleteAttachmentFromDB(file.name);
      });
      
      imagePreviewContainer.appendChild(attachmentItem);
      console.log('Attachment item added to DOM for:', file.name);
      
      saveAttachmentToDB(file, e.target.result);
    };
    
    reader.onerror = function(err) {
      console.error('Error reading file:', err);
    };
    
    reader.readAsDataURL(file);
  });
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

function uploadFileToServer(file, taskId) {
  const formData = new FormData();
  formData.append('file', file);

  fetch(`/todos/${taskId}/attachments`, {
    method: 'POST',
    body: formData,
  })
    .then(res => res.json())
    .then(updatedTodo => {
      if (updatedTodo) {
        const taskIndex = localTaskCache.findIndex(task => task._id === taskId);
        if (taskIndex !== -1) {
          localTaskCache[taskIndex] = updatedTodo;
          saveTaskCacheToLocalStorage();
          displayAttachments(updatedTodo.attachments);
        }
      }
    })
    .catch(error => console.error('Error uploading file:', error));
}

function storeFileLocally(fileName, dataUrl) {
  console.warn('⚠️ Skipped storing image in localStorage due to size limits:', fileName);
}

function displayAttachments(attachments) {
  const imagePreviewContainer = document.getElementById('imagePreviewContainer');
  if (!imagePreviewContainer) return;

  imagePreviewContainer.innerHTML = '';

  if (attachments && attachments.length > 0) {
    attachments.forEach(attachment => {
      const attachmentItem = document.createElement('div');
      attachmentItem.className = 'attachment-item relative rounded-lg overflow-hidden border border-dark-border m-2';

      const imageSrc = attachment.dataUrl;

      attachmentItem.innerHTML = `
        <img src="${imageSrc}" alt="${attachment.name}" class="w-full h-24 object-cover">
        <div class="absolute top-1 right-1">
          <button class="delete-attachment bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center" data-id="${attachment.name}">
            <i class="fas fa-times text-xs"></i>
          </button>
        </div>
        <div class="p-2 text-xs text-gray-300 truncate bg-dark-hover">${attachment.name}</div>
      `;

      attachmentItem.querySelector('.delete-attachment').addEventListener('click', (e) => {
        const attachmentName = e.currentTarget.dataset.id;
        deleteAttachmentFromDB(attachmentName);
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