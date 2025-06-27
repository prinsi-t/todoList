function initNotesManager() {
  setupNotesEventListeners();
  loadNotesForActiveList();
}

function setupNotesEventListeners() {
  document.addEventListener('input', function (e) {
    if (e.target.classList.contains('notes-textarea')) {
      const panel = e.target.closest('.right-panel');
      if (panel) {
        const listName = panel.getAttribute('data-list');
        const taskId = panel.getAttribute('data-current-task-id');
        saveNotes(e.target.value, listName, taskId);
      }
    }
  });

  document.addEventListener('taskSelected', function (e) {
    if (e.detail && e.detail.taskId) {
      loadNotesForTask(e.detail.taskId);
    }
  });

  document.addEventListener('click', function (e) {
    const taskItem = e.target.closest('.task-item');
    if (taskItem) {
      const taskId = taskItem.getAttribute('data-task-id');
      if (taskId) {
        setTimeout(() => loadNotesForTask(taskId), 100);
      }
    }
  });

  document.addEventListener('listChanged', function (e) {
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

  if (taskId) {
    const taskIndex = localTaskCache.findIndex((task) => task._id === taskId);
    if (taskIndex !== -1) {
      localTaskCache[taskIndex].notes = notes;
      updateTaskNotesOnServer(taskId, notes);
    } else {
      console.warn(`Task ${taskId} not found in local cache when saving notes`);
    }
  }
}

function loadNotesForTask(taskId) {
  if (!taskId) {
    console.error('No task ID provided to loadNotesForTask');
    return;
  }

  const task = localTaskCache.find((t) => t._id === taskId);
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

  notesTextarea.value = task.notes || '';
}

function loadNotesForList(listName) {
  if (!listName) {
    console.error('No list name provided to loadNotesForList');
    return;
  }

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
  } else {
    const notesTextarea = panel.querySelector('.notes-textarea');
    if (notesTextarea) notesTextarea.value = '';
  }
}

function loadNotesForActiveList() {
  const activeList = sessionState.activeList || 'Personal';
  loadNotesForList(activeList);
}

function updateTaskNotesOnServer(taskId, notes) {
  if (!taskId || taskId.startsWith('local_')) return;

  fetch(`/todos/${taskId}/notes`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes })
  })
    .then((res) => {
      if (!res.ok) {
        console.error(`Server error when updating notes: ${res.status}`);
        return null;
      }
      return res.json();
    })
    .then((updatedTask) => {
      if (updatedTask) {
        const taskIndex = localTaskCache.findIndex((task) => task._id === taskId);
        if (taskIndex !== -1) {
          localTaskCache[taskIndex] = updatedTask;
        }
      }
    })
    .catch((error) => console.error('Error updating notes on server:', error));
}

document.addEventListener('DOMContentLoaded', initNotesManager);
