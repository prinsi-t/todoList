/**
 * Notes Manager
 * Handles saving and loading notes for each list and task
 */

// Initialize notes manager
function initNotesManager() {
  console.log('Initializing Notes Manager');

  // Set up event listeners for all notes textareas
  setupNotesEventListeners();

  // Load notes for the current active list
  loadNotesForActiveList();
}

// Set up event listeners for all notes textareas
function setupNotesEventListeners() {
  // Listen for input events on all notes textareas
  document.addEventListener('input', function(e) {
    if (e.target.classList.contains('notes-textarea')) {
      const panel = e.target.closest('.right-panel');
      if (panel) {
        const listName = panel.getAttribute('data-list');
        const taskId = panel.getAttribute('data-current-task-id');

        saveNotes(e.target.value, listName, taskId);
      }
    }
  });

  // Listen for task selection to load the appropriate notes
  document.addEventListener('taskSelected', function(e) {
    if (e.detail && e.detail.taskId) {
      loadNotesForTask(e.detail.taskId);
    }
  });

  // Listen for list changes to load the appropriate notes
  document.addEventListener('listChanged', function(e) {
    if (e.detail && e.detail.listName) {
      loadNotesForList(e.detail.listName);
    }
  });
}

// Save notes for a specific list and task
function saveNotes(notes, listName, taskId) {
  if (!listName) {
    console.error('No list name provided to saveNotes');
    return;
  }

  console.log(`Saving notes for list: ${listName}, task: ${taskId || 'none'}`);

  if (taskId) {
    // If we have a task ID, save notes for this specific task
    const taskNotesKey = `notes_task_${taskId}`;
    localStorage.setItem(taskNotesKey, notes);

    // Also update the task in the local cache
    const taskIndex = localTaskCache.findIndex(task => task._id === taskId);
    if (taskIndex !== -1) {
      localTaskCache[taskIndex].notes = notes;
      saveTaskCacheToLocalStorage();

      // If this is a server task, update it on the server
      if (!taskId.startsWith('local_')) {
        updateTaskNotesOnServer(taskId, notes);
      }
    }
  } else {
    // If no task ID, save notes for the list itself
    const listNotesKey = `notes_list_${listName}`;
    localStorage.setItem(listNotesKey, notes);
  }
}

// Load notes for a specific task
function loadNotesForTask(taskId) {
  if (!taskId) {
    console.error('No task ID provided to loadNotesForTask');
    return;
  }

  console.log(`Loading notes for task: ${taskId}`);

  // Find the task in the local cache
  const task = localTaskCache.find(t => t._id === taskId);
  if (!task) {
    console.error(`Task not found in local cache: ${taskId}`);
    return;
  }

  const listName = task.list;
  const listId = listName.toLowerCase().replace(/\s+/g, '-');
  const panelId = `right-panel-${listId}`;
  const panel = document.getElementById(panelId);

  if (!panel) {
    console.error(`Panel not found for list: ${listName}`);
    return;
  }

  const notesTextarea = panel.querySelector('.notes-textarea');
  if (!notesTextarea) {
    console.error(`Notes textarea not found in panel: ${panelId}`);
    return;
  }

  // First try to get notes from the task object
  if (task.notes) {
    notesTextarea.value = task.notes;
    return;
  }

  // If not found in the task object, try to get from localStorage
  const taskNotesKey = `notes_task_${taskId}`;
  const savedNotes = localStorage.getItem(taskNotesKey);

  if (savedNotes) {
    notesTextarea.value = savedNotes;

    // Update the task object
    task.notes = savedNotes;
    saveTaskCacheToLocalStorage();
  } else {
    notesTextarea.value = '';
  }
}

// Load notes for a specific list
function loadNotesForList(listName) {
  if (!listName) {
    console.error('No list name provided to loadNotesForList');
    return;
  }

  console.log(`Loading notes for list: ${listName}`);

  const listId = listName.toLowerCase().replace(/\s+/g, '-');
  const panelId = `right-panel-${listId}`;
  const panel = document.getElementById(panelId);

  if (!panel) {
    console.error(`Panel not found for list: ${listName}`);
    return;
  }

  // Check if we have a current task for this list
  const taskId = panel.getAttribute('data-current-task-id');
  if (taskId) {
    // If we have a task, load notes for that task
    loadNotesForTask(taskId);
    return;
  }

  // If no current task, load notes for the list itself
  const notesTextarea = panel.querySelector('.notes-textarea');
  if (!notesTextarea) {
    console.error(`Notes textarea not found in panel: ${panelId}`);
    return;
  }

  const listNotesKey = `notes_list_${listName}`;
  const savedNotes = localStorage.getItem(listNotesKey);

  if (savedNotes) {
    notesTextarea.value = savedNotes;
  } else {
    notesTextarea.value = '';
  }
}

// Load notes for the current active list
function loadNotesForActiveList() {
  const activeList = localStorage.getItem('activeList') || 'Personal';
  loadNotesForList(activeList);
}

// Update task notes on the server
function updateTaskNotesOnServer(taskId, notes) {
  if (!taskId || taskId.startsWith('local_')) return;

  console.log(`Updating notes on server for task: ${taskId}`);

  fetch(`/todos/${taskId}/notes`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes })
  })
    .then(res => {
      if (!res.ok) {
        console.error(`Server error when updating notes: ${res.status}`);
        return null;
      }
      return res.json();
    })
    .then(updatedTask => {
      if (updatedTask) {
        console.log('Notes updated on server:', updatedTask);

        // Update the task in the local cache
        const taskIndex = localTaskCache.findIndex(task => task._id === taskId);
        if (taskIndex !== -1) {
          localTaskCache[taskIndex] = updatedTask;
          saveTaskCacheToLocalStorage();
        }
      }
    })
    .catch(error => console.error('Error updating notes on server:', error));
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', initNotesManager);