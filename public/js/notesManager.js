function initNotesManager() {
  //console.log('Initializing Notes Manager');

  setupNotesEventListeners();

  loadNotesForActiveList();
}

function setupNotesEventListeners() {
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

  document.addEventListener('taskSelected', function(e) {
    if (e.detail && e.detail.taskId) {
      loadNotesForTask(e.detail.taskId);
    }
  });

  document.addEventListener('click', function(e) {
    const taskItem = e.target.closest('.task-item');
    if (taskItem) {
      const taskId = taskItem.getAttribute('data-task-id');
      if (taskId) {
       // console.log(`Task clicked: ${taskId}, loading notes`);
        setTimeout(() => loadNotesForTask(taskId), 100);
      }
    }
  });

  document.addEventListener('listChanged', function(e) {
    if (e.detail && e.detail.listName) {
      loadNotesForList(e.detail.listName);
    }
  });
}

function saveNotes(notes, listName, taskId) {
  if (!listName) {
    console.error('No list name provided to saveNotes');
    return;
  }

  //console.log(`Saving notes for list: ${listName}, task: ${taskId || 'none'}`);

  if (taskId) {
    const taskNotesKey = `notes_task_${taskId}`;
    localStorage.setItem(taskNotesKey, notes);

    const taskIndex = localTaskCache.findIndex(task => task._id === taskId);
    if (taskIndex !== -1) {
      localTaskCache[taskIndex].notes = notes;
      saveTaskCacheToLocalStorage();
      
      localStorage.setItem('lastEditedTaskId', taskId);
      localStorage.setItem('lastEditedTaskNotes', notes);

      if (!taskId.startsWith('local_')) {
        updateTaskNotesOnServer(taskId, notes);
      }
    } else {
      console.warn(`Task ${taskId} not found in local cache when saving notes`);
    }
  } else {
    const listNotesKey = `notes_list_${listName}`;
    localStorage.setItem(listNotesKey, notes);
  }
}

function loadNotesForTask(taskId) {
  if (!taskId) {
    console.error('No task ID provided to loadNotesForTask');
    return;
  }

  //console.log(`Loading notes for task: ${taskId}`);

  const task = localTaskCache.find(t => t._id === taskId);
  if (!task) {
    console.error(`Task not found in local cache: ${taskId}`);
    return;
  }

  const listName = task.list;
  
  let panel = document.getElementById(`right-panel-${listName.toLowerCase().replace(/\s+/g, '-')}`);
  if (!panel) {
    panel = document.querySelector(`.right-panel[data-list="${listName}"]`);
  }

  if (!panel) {
    console.error(`Panel not found for list: ${listName}`);
    return;
  }

  panel.setAttribute('data-current-task-id', taskId);

  const notesTextarea = panel.querySelector('.notes-textarea');
  if (!notesTextarea) {
    console.error(`Notes textarea not found in panel for list: ${listName}`);
    return;
  }

  if (task.notes !== undefined) {
    //console.log(`Found notes in task object for ${taskId}: "${task.notes ? task.notes.substring(0, 20) + '...' : 'empty'}"`);
    notesTextarea.value = task.notes || '';
    return;
  }

  const taskNotesKey = `notes_task_${taskId}`;
  const savedNotes = localStorage.getItem(taskNotesKey);

  if (savedNotes) {
   // console.log(`Found notes in localStorage for ${taskId}: "${savedNotes.substring(0, 20)}..."`);
    notesTextarea.value = savedNotes;

    task.notes = savedNotes;
    saveTaskCacheToLocalStorage();
  } else {
    console.log(`No notes found for task ${taskId}, clearing textarea`);
    notesTextarea.value = '';
    
    task.notes = '';
    saveTaskCacheToLocalStorage();
  }
}

function loadNotesForList(listName) {
  if (!listName) {
    console.error('No list name provided to loadNotesForList');
    return;
  }

  //console.log(`Loading notes for list: ${listName}`);

  const listId = listName.toLowerCase().replace(/\s+/g, '-');
  const panelId = `right-panel-${listId}`;
  const panel = document.getElementById(panelId);

  if (!panel) {
    console.error(`Panel not found for list: ${listName}`);
    return;
  }

  const taskId = panel.getAttribute('data-current-task-id');
  if (taskId) {
    loadNotesForTask(taskId);
    return;
  }

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

function loadNotesForActiveList() {
  const activeList = localStorage.getItem('activeList') || 'Personal';
  loadNotesForList(activeList);
}

function updateTaskNotesOnServer(taskId, notes) {
  if (!taskId || taskId.startsWith('local_')) return;

//  console.log(`Updating notes on server for task: ${taskId}`);

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
   //     console.log('Notes updated on server:', updatedTask);

        const taskIndex = localTaskCache.findIndex(task => task._id === taskId);
        if (taskIndex !== -1) {
          localTaskCache[taskIndex] = updatedTask;
          saveTaskCacheToLocalStorage();
        }
      }
    })
    .catch(error => console.error('Error updating notes on server:', error));
}

document.addEventListener('DOMContentLoaded', initNotesManager);