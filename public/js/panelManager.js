/**
 * Panel Manager
 * Handles the multiple right panels for different lists
 */

// Store panel data for each list
const panelData = {};

// Initialize panel manager
function initPanelManager() {
  console.log('Initializing Panel Manager');

  // Create panels for custom lists
  createPanelsForCustomLists();

  // Set up event listeners for list switching
  setupListSwitchListeners();

  // ALWAYS use Personal as the active list
  const activeList = 'Personal';
  localStorage.setItem('activeList', activeList);
  console.log(`Setting active list to: ${activeList}`);

  // Clear any selected task ID to ensure we show the most recent task in Personal list
  localStorage.removeItem('selectedTaskId');

  // Delay showing the panel to ensure all panels are created
  setTimeout(() => {
    showPanelForList(activeList);

    // Also highlight the active list in the sidebar
    if (typeof highlightActiveList === 'function') {
      highlightActiveList(activeList);
    }
  }, 300);
}

// Create panels for custom lists that don't have panels yet
function createPanelsForCustomLists() {
  try {
    const customLists = JSON.parse(localStorage.getItem('customLists') || '[]');

    customLists.forEach(listName => {
      createPanelForList(listName);
    });
  } catch (error) {
    console.error('Error creating panels for custom lists:', error);
  }
}

// Create a panel for a specific list if it doesn't exist
function createPanelForList(listName) {
  if (!listName) return;

  // Convert list name to a valid ID
  const listId = listName.toLowerCase().replace(/\s+/g, '-');
  const panelId = `right-panel-${listId}`;

  // Check if panel already exists
  if (document.getElementById(panelId)) {
    console.log(`Panel for ${listName} already exists`);
    return;
  }

  console.log(`Creating panel for list: ${listName}`);

  // Clone the template
  const template = document.getElementById('right-panel-template');
  if (!template) {
    console.error('Panel template not found');
    return;
  }

  const newPanel = template.cloneNode(true);
  newPanel.id = panelId;
  newPanel.setAttribute('data-list', listName);
  newPanel.classList.remove('hidden');
  newPanel.style.display = 'none';

  // Set the list name
  const listNameElement = newPanel.querySelector('.text-gray-400');
  if (listNameElement) {
    listNameElement.textContent = listName;
  }

  // Set up the complete button
  const completeBtn = newPanel.querySelector('.complete-btn');
  if (completeBtn) {
    completeBtn.setAttribute('onclick', `markSelectedTaskComplete('${listName}')`);
    completeBtn.setAttribute('data-list', listName);
  }

  // Set up the add subtask button
  const addSubtaskBtn = newPanel.querySelector('.add-subtask-btn');
  if (addSubtaskBtn) {
    addSubtaskBtn.setAttribute('data-list', listName);
  }

  // Set up the drop zone
  const dropZone = newPanel.querySelector('.drop-zone');
  if (dropZone) {
    dropZone.setAttribute('data-list', listName);
  }

  // Add the panel to the container
  const container = document.getElementById('right-panels-container');
  if (container) {
    container.appendChild(newPanel);
  }

  return newPanel;
}

// Show the panel for a specific list
function showPanelForList(listName) {
  if (!listName) {
    console.error('No list name provided to showPanelForList');
    return;
  }

  console.log(`Showing panel for list: ${listName}`);

  // Hide all panels
  const panels = document.querySelectorAll('.right-panel');
  panels.forEach(panel => {
    panel.classList.add('hidden');
  });

  // Convert list name to a valid ID
  const listId = listName.toLowerCase().replace(/\s+/g, '-');
  const panelId = `right-panel-${listId}`;

  // Show the panel for this list
  const panel = document.getElementById(panelId);
  if (panel) {
    panel.classList.remove('hidden');

    // Update the panel with the most recent task
    updatePanelWithRecentTask(listName, panel);

    // Dispatch list changed event
    document.dispatchEvent(new CustomEvent('listChanged', {
      detail: { listName }
    }));
  } else {
    // If panel doesn't exist, create it
    const newPanel = createPanelForList(listName);
    if (newPanel) {
      newPanel.classList.remove('hidden');

      // Update the panel with the most recent task
      updatePanelWithRecentTask(listName, newPanel);

      // Dispatch list changed event
      document.dispatchEvent(new CustomEvent('listChanged', {
        detail: { listName }
      }));
    }
  }
}

// Update the panel with the most recent task for the list
function updatePanelWithRecentTask(listName, panel) {
  if (!listName || !panel) return;

  // Find the most recent task for this list
  const recentTask = findMostRecentTask(listName);
  if (recentTask) {
    // Update the panel with the task details
    updatePanelWithTask(panel, recentTask);
  } else {
    // Clear the panel if no tasks
    clearPanel(panel, listName);
  }
}

// Update a panel with a specific task
function updatePanelWithTask(panel, task) {
  if (!panel || !task) return;

  console.log(`Updating panel with task: ${task.title}`);

  // Update the title
  const titleElement = panel.querySelector('h2');
  if (titleElement) {
    titleElement.textContent = task.title || '';
  }

  // Update notes - we'll let the notesManager handle this
  // to ensure proper loading of notes from localStorage or server
  // This will be triggered by the taskSelected event

  // Update complete button
  const completeBtn = panel.querySelector('.complete-btn');
  if (completeBtn) {
    completeBtn.textContent = task.completed ? 'Mark as Incomplete' : 'Mark as Complete';
    completeBtn.className = task.completed
      ? 'complete-btn bg-green-500 text-white px-4 py-2 rounded-md'
      : 'complete-btn bg-blue-500 text-white px-4 py-2 rounded-md';
  }

  // Apply blur effect if task is completed
  const blurContent = panel.querySelector('.task-blur-content');
  if (blurContent) {
    if (task.completed && isTaskBlurred) {
      blurContent.classList.add('blurred');
      blurContent.style.cssText = 'filter: blur(5px) !important; pointer-events: none;';
    } else {
      blurContent.classList.remove('blurred');
      blurContent.style.cssText = 'filter: none !important; pointer-events: auto;';
    }
  }

  // Render subtasks if available
  const subtasksList = panel.querySelector('.subtasks-list');
  if (subtasksList && task.subtasks) {
    renderSubtasksForPanel(subtasksList, task.subtasks);
  }

  // Store the current task ID for this panel
  panel.setAttribute('data-current-task-id', task._id);
}

// Clear a panel (when no tasks are available)
function clearPanel(panel, listName) {
  if (!panel) return;

  console.log(`Clearing panel for list: ${listName}`);

  // Clear the title
  const titleElement = panel.querySelector('h2');
  if (titleElement) {
    titleElement.textContent = '';
  }

  // Load list-specific notes instead of clearing
  if (typeof loadNotesForList === 'function' && listName) {
    loadNotesForList(listName);
  } else {
    // Fallback to clearing notes if loadNotesForList is not available
    const notesTextarea = panel.querySelector('.notes-textarea');
    if (notesTextarea) {
      notesTextarea.value = '';
    }
  }

  // Reset complete button
  const completeBtn = panel.querySelector('.complete-btn');
  if (completeBtn) {
    completeBtn.textContent = 'Mark as Complete';
    completeBtn.className = 'complete-btn bg-blue-500 text-white px-4 py-2 rounded-md';
  }

  // Clear subtasks
  const subtasksList = panel.querySelector('.subtasks-list');
  if (subtasksList) {
    subtasksList.innerHTML = '<div class="text-gray-500 text-sm py-2">No subtasks added yet.</div>';
  }

  // Clear current task ID
  panel.removeAttribute('data-current-task-id');

  // Dispatch list changed event to ensure notes are loaded
  document.dispatchEvent(new CustomEvent('listChanged', {
    detail: { listName }
  }));
}

// Render subtasks for a panel
function renderSubtasksForPanel(subtasksList, subtasks) {
  if (!subtasksList) return;

  subtasksList.innerHTML = '';

  if (!subtasks || subtasks.length === 0) {
    subtasksList.innerHTML = '<div class="text-gray-500 text-sm py-2">No subtasks added yet.</div>';
    return;
  }

  subtasks.forEach((subtask, index) => {
    const subtaskElement = document.createElement('div');
    subtaskElement.className = 'flex items-center gap-2 py-1';
    subtaskElement.innerHTML = `
      <div class="checkbox ${subtask.completed ? 'checked bg-blue-500 border-blue-500' : ''} w-4 h-4 border-2 border-dark-border rounded-full flex items-center justify-center">
        ${subtask.completed ? '<i class="fas fa-check text-white text-xs"></i>' : ''}
      </div>
      <span class="${subtask.completed ? 'line-through text-gray-500' : 'text-gray-200'} text-sm">${subtask.title}</span>
    `;

    subtasksList.appendChild(subtaskElement);
  });
}

// Set up event listeners for list switching
function setupListSwitchListeners() {
  // Override the filterTasks function to show the appropriate panel
  const originalFilterTasks = window.filterTasks;

  if (typeof originalFilterTasks === 'function') {
    window.filterTasks = function(listName, preserveSelection = false) {
      // Call the original function first
      originalFilterTasks(listName, preserveSelection);

      // Then show the panel for this list
      showPanelForList(listName);

      // Save the active list to localStorage
      localStorage.setItem('activeList', listName);
      console.log(`List switched to: ${listName} (saved to localStorage)`);
    };
  }

  // Override the markSelectedTaskComplete function
  window.markSelectedTaskComplete = function(listName) {
    const panel = document.querySelector(`.right-panel[data-list="${listName}"]:not(.hidden)`);
    if (panel) {
      const taskId = panel.getAttribute('data-current-task-id');
      if (taskId) {
        toggleTaskCompletion(taskId);
      }
    }
  };
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(initPanelManager, 500);
});