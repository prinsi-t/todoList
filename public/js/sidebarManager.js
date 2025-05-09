document.addEventListener('DOMContentLoaded', function() {
  if (typeof window.localTaskCache === 'undefined') {
    window.localTaskCache = JSON.parse(localStorage.getItem('taskCache') || '[]');
  }

  setTimeout(function() {
    fixSidebarNavigation();
    fixAddTaskForm();
    setupAddListButton();
    loadCustomListsFromLocalStorage();

    // Check if we're coming from login or register
    const isFromLogin = document.referrer.includes('/login') || document.referrer.includes('/register');

    // If we're coming from login, set active list to Personal
    if (isFromLogin) {
      localStorage.setItem('activeList', 'Personal');
      console.log('Coming from login, setting active list to Personal in sidebar');

      // Clear any selected task ID to ensure we show the most recent task in Personal list
      localStorage.removeItem('selectedTaskId');
    }

    // Get the active list from localStorage
    const activeList = localStorage.getItem('activeList') || 'Personal';

    // Highlight the active list
    if (typeof highlightActiveList === 'function') {
      highlightActiveList(activeList);
    }
  }, 300);
});

function fixSidebarNavigation() {
  const sidebarItems = document.querySelectorAll('.sidebar-item');

  sidebarItems.forEach(function(item) {
    const listName = item.dataset.list;

    if (listName) {
      console.log('Setting up click handler for list:', listName);

      const newItem = item.cloneNode(true);
      item.parentNode.replaceChild(newItem, item);

      newItem.addEventListener('click', function(e) {
        if (e.currentTarget.tagName === 'A') {
          e.preventDefault();
        }

        if (e.target.closest('.delete-list-btn')) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        console.log(`List clicked: ${listName}`);
        localStorage.setItem('activeList', listName);
        console.log(`Set active list in localStorage to: ${listName} (from sidebar click)`);

        // Clear any existing selection first to ensure we get the most recent task
        localStorage.removeItem('selectedTaskId');

        highlightActiveList(listName);

        if (typeof window.filterTasks === 'function') {
          // Always select the most recent task when switching lists
          window.filterTasks(listName, false);
        } else {
          console.error('filterTasks function not found');
        }
      });
    }
  });
}

function fixAddTaskForm() {
  console.log('Fixing add task form...');

  const addTaskForm = document.getElementById('addTaskForm');
  if (!addTaskForm) {
    console.error('Add task form not found');
    return;
  }

  const newForm = addTaskForm.cloneNode(true);
  addTaskForm.parentNode.replaceChild(newForm, addTaskForm);

  newForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const input = document.getElementById('newTaskInput');
    if (!input) {
      console.error('Task input not found');
      return;
    }

    const taskText = input.value.trim();
    if (!taskText) {
      console.log('Empty task, ignoring');
      return;
    }

    const activeList = localStorage.getItem('activeList') || 'Personal';

    console.log('Adding task to list:', activeList);
    console.log('Task text:', taskText);

    const newTask = {
      _id: 'local_' + Date.now(),
      title: taskText,
      list: activeList,
      completed: false,
      subtasks: [],
      attachments: []
    };

    if (typeof window.localTaskCache === 'undefined') {
      console.log('Creating new local task cache');
      window.localTaskCache = [];
    }

    localTaskCache.push(newTask);

    try {
      localStorage.setItem('taskCache', JSON.stringify(localTaskCache));
      console.log('Task saved to localStorage cache');

      updateTaskCount(activeList, 1);
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }

    // CRITICAL FIX: Directly update the right panel with the new task
    // Get the panel for this task's list
    const listId = activeList.toLowerCase().replace(/\s+/g, '-');
    const panelId = `right-panel-${listId}`;
    const panel = document.getElementById(panelId);

    if (panel) {
      // Update the title in the right panel immediately
      const titleElement = panel.querySelector('h2');
      if (titleElement) {
        titleElement.textContent = taskText;
        console.log(`Directly updated panel title to: ${taskText}`);
      }

      // If updatePanelWithTask function exists, use it to update the panel
      if (typeof updatePanelWithTask === 'function') {
        updatePanelWithTask(panel, newTask);
        console.log('Updated panel with new task using updatePanelWithTask');
      }

      // Dispatch task selected event
      document.dispatchEvent(new CustomEvent('taskSelected', {
        detail: { taskId: newTask._id, listName: activeList }
      }));

      // Set this new task as selected
      window.currentTaskId = newTask._id;

      // Store selectedTaskId and list for refresh persistence
      localStorage.setItem('selectedTaskId', newTask._id);
      localStorage.setItem('lastSelectedList', activeList);
    }

    // Refresh the task list
    if (typeof window.refreshTaskList === 'function') {
      refreshTaskList(activeList);
      console.log('Task list refreshed');
    } else if (typeof window.filterTasks === 'function') {
      // Use preserveSelection=true to prevent auto-selecting another task
      window.filterTasks(activeList, true);
      console.log('Tasks filtered for current list');
    } else {
      console.error('No refresh function found');
      window.location.reload();
    }

    input.value = '';
  });

  console.log('Add task form fixed!');
}

function debugActiveList() {
  console.log('Current active list:', localStorage.getItem('activeList'));
  return localStorage.getItem('activeList');
}

window.debugActiveList = debugActiveList;

function updateSidebarCounts(taskCounts) {
  Object.keys(taskCounts).forEach(list => {
    const countElement = document.getElementById(`count-${list.toLowerCase().replace(/\s+/g, '-')}`);
    if (countElement) {
      countElement.textContent = taskCounts[list];
    }
  });
}

function updateTaskCount(listName, change) {
  console.log(`Updating count for ${listName} by ${change}`);

  const listSelector = listName.toLowerCase().replace(/\s+/g, '-');
  const countElement = document.getElementById(`count-${listSelector}`);

  if (countElement) {
    const currentCount = parseInt(countElement.textContent, 10) || 0;
    const newCount = Math.max(0, currentCount + change);
    countElement.textContent = newCount;
    console.log(`Updated count for ${listName}: ${currentCount} → ${newCount}`);
  } else {
    console.warn(`Count element for list "${listName}" not found with selector: count-${listSelector}`);

    // Try to find the list item using the actual list name
    const listItem = document.querySelector(`.sidebar-item[data-list="${listName}"]`);
    if (listItem) {
      console.log(`Found list item for "${listName}"`);
      let countSpan = listItem.querySelector('.text-sm.text-gray-500');
      if (countSpan) {
        // Update existing count span
        const currentCount = parseInt(countSpan.textContent, 10) || 0;
        const newCount = Math.max(0, currentCount + change);
        countSpan.textContent = newCount;
        console.log(`Updated existing count span for "${listName}": ${currentCount} → ${newCount}`);
      }
    }
  }

  const allTasksCount = document.getElementById('allTasksCount');
  if (allTasksCount && change !== 0) {
    const currentCount = parseInt(allTasksCount.textContent, 10) || 0;
    const newCount = Math.max(0, currentCount + change);
    allTasksCount.textContent = newCount;
    console.log(`Updated all tasks count: ${currentCount} → ${newCount}`);
  }

  // Force an update of all task counts to ensure consistency
  if (typeof window.updateAllTaskCounts === 'function') {
    setTimeout(() => {
      window.updateAllTaskCounts();
    }, 100);
  }
}

window.updateTaskCount = updateTaskCount;

function highlightActiveList(activeList) {
  console.log('Highlighting active list:', activeList);

  const sidebarItems = document.querySelectorAll('.sidebar-item');
  sidebarItems.forEach(item => {
    const listName = item.getAttribute('data-list');
    if (listName === activeList) {
      item.classList.add('bg-dark-hover', 'text-white');
    } else {
      item.classList.remove('bg-dark-hover', 'text-white');
    }
  });
}

window.highlightActiveList = highlightActiveList;

function openAddListModal() {
  let modal = document.getElementById('addListModal');
  if (!modal) {
    createAddListModal();
    modal = document.getElementById('addListModal');
  }

  if (modal) {
    modal.classList.remove('hidden');
    setTimeout(() => {
      const input = document.getElementById('newListInput');
      if (input) input.focus();
    }, 100);
  } else {
    console.error('Modal element not found and could not be created');
  }
}

function createAddListModal() {
  if (document.getElementById('addListModal')) return;

  const modalHTML = `
    <div id="addListModal" class="fixed inset-0 flex items-center justify-center z-50 hidden">
      <div class="fixed inset-0 bg-black opacity-50"></div>
      <div class="bg-dark-secondary rounded-lg p-6 w-80 relative z-10">
        <h3 class="text-lg font-medium text-white mb-4">Add New List</h3>
        <form id="addListForm">
          <input
            type="text"
            id="newListInput"
            class="w-full bg-dark-primary border border-dark-border rounded-lg px-3 py-2 text-black mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="List name"
          >
          <div class="flex justify-end">
            <button
              type="button"
              class="bg-dark-primary text-white px-4 py-2 rounded-lg mr-2 hover:bg-dark-hover"
              onclick="closeAddListModal()"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
  const newForm = document.getElementById('addListForm');
  if (newForm) {
    newForm.addEventListener('submit', handleAddListFormSubmit);
  }

  const modalBackground = document.querySelector('#addListModal .fixed.inset-0');
  if (modalBackground) {
    modalBackground.addEventListener('click', closeAddListModal);
  }
}

function setupAddListButton() {
  const existingButtons = document.querySelectorAll('.add-list-button');
  existingButtons.forEach(button => button.remove());

  const myListsEl = Array.from(document.querySelectorAll('h2, h3, div')).filter(el =>
    el.textContent.trim() === 'My Lists'
  )[0] || document.querySelector('.my-lists-header');

  if (myListsEl) {
    myListsEl.style.position = 'relative';

    const addButton = document.createElement('button');
    addButton.className = 'add-list-button text-gray-400 hover:text-white absolute right-2 top-1/2 transform -translate-y-1/2';
    addButton.innerHTML = '<i class="fas fa-plus"></i>';
    addButton.addEventListener('click', openAddListModal);
    myListsEl.appendChild(addButton);
  }
}

function closeAddListModal() {
  const modal = document.getElementById('addListModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

function handleAddListFormSubmit(e) {
  e.preventDefault();

  const newListInput = document.getElementById('newListInput');
  const newListName = newListInput.value.trim();

  if (newListName) {
    addNewList(newListName);
    newListInput.value = '';
    closeAddListModal();
  } else {
    alert('List name cannot be empty.');
  }
}

function isDefaultList(listName) {
  const defaultLists = ['Personal', 'Work', 'Grocery List'];
  return defaultLists.includes(listName);
}

function addNewList(listName) {
  console.log('Adding new list:', listName);

  const sidebarContainer = document.querySelector('.sidebar-items');
  if (!sidebarContainer) {
    console.error('Sidebar container not found');
    return;
  }

  const newListItem = document.createElement('a');
  newListItem.href = '#';
  newListItem.className = 'sidebar-item flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-dark-hover';
  // Set data-list attribute to the original list name
  newListItem.setAttribute('data-list', listName);

  const isCustomList = !isDefaultList(listName);

  let listHTML = `
    <i class="fas fa-folder text-green-400"></i>
    <span class="flex-grow">${listName}</span>
    <span id="count-${listName.toLowerCase().replace(/\s+/g, '-')}" class="text-sm text-gray-500">0</span>
  `;

  if (isCustomList) {
    listHTML += `
      <button class="delete-list-btn text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-1" title="Delete list">
        <i class="fas fa-trash-alt"></i>
      </button>
    `;
  }

  newListItem.innerHTML = listHTML;

  newListItem.classList.add('group');

  newListItem.addEventListener('click', (e) => {
    if (e.target.closest('.delete-list-btn')) {
      e.preventDefault();
      e.stopPropagation();

      deleteList(listName);
      return;
    }

    console.log(`Custom list clicked: ${listName}`);
    localStorage.setItem('activeList', listName);
    console.log(`Set active list in localStorage to: ${listName} (from custom list click)`);

    // Clear any existing selection first to ensure we get the most recent task
    localStorage.removeItem('selectedTaskId');

    if (typeof window.filterTasks === 'function') {
      // Always select the most recent task when switching lists
      window.filterTasks(listName, false);
    }
    highlightActiveList(listName);
  });

  sidebarContainer.appendChild(newListItem);

  if (isCustomList) {
    saveCustomListToLocalStorage(listName);
  }
}

function confirmDeleteList(listName) {
  const confirmation = confirm(`Are you sure you want to delete the list "${listName}" and all its tasks?`);
  if (confirmation) {
    deleteList(listName);
  }
}

function deleteList(listName) {
  const customLists = JSON.parse(localStorage.getItem('customLists') || '[]');
  const updatedLists = customLists.filter(list => list !== listName);
  localStorage.setItem('customLists', JSON.stringify(updatedLists));

  if (typeof localTaskCache !== 'undefined') {
    const tasksToRemove = localTaskCache.filter(task => task.list === listName);

    window.localTaskCache = localTaskCache.filter(task => task.list !== listName);
    localStorage.setItem('taskCache', JSON.stringify(localTaskCache));

    const allTasksCount = document.getElementById('allTasksCount');
    if (allTasksCount && tasksToRemove.length > 0) {
      const currentTotal = parseInt(allTasksCount.textContent, 10) || 0;
      allTasksCount.textContent = Math.max(0, currentTotal - tasksToRemove.length);
    }
  }

  if (localStorage.getItem('activeList') === listName) {
    localStorage.setItem('activeList', 'Personal');
  }

  const sidebarItem = document.querySelector(`.sidebar-item[data-list="${listName}"]`);
  if (sidebarItem) {
    sidebarItem.remove();
  }

  if (localStorage.getItem('activeList') === 'Personal') {
    if (typeof window.filterTasks === 'function') {
      window.filterTasks('Personal');
    }
  }
}

window.deleteList = deleteList;

function saveCustomListToLocalStorage(listName) {
  if (isDefaultList(listName)) return;

  const customLists = JSON.parse(localStorage.getItem('customLists') || '[]');
  if (!customLists.includes(listName)) {
    customLists.push(listName);
    localStorage.setItem('customLists', JSON.stringify(customLists));
  }
}

function loadCustomListsFromLocalStorage() {
  const customLists = JSON.parse(localStorage.getItem('customLists') || '[]');
  customLists.forEach(listName => {
    addNewList(listName);
  });

  updateDefaultListItems();

  const activeList = localStorage.getItem('activeList') || 'Personal';
  highlightActiveList(activeList);

  if (typeof window.filterTasks === 'function') {
    // Always select the most recent task when loading custom lists
    window.filterTasks(activeList, false);
  }
}

function updateDefaultListItems() {
  const defaultLists = ['Personal', 'Work', 'Grocery List'];

  defaultLists.forEach(listName => {
    const listItem = document.querySelector(`.sidebar-item[data-list="${listName}"]`);

    if (listItem) {
      const deleteBtn = listItem.querySelector('.delete-list-btn');
      if (deleteBtn) {
        deleteBtn.remove();
      }
    }
  });
}

function addCustomStyles() {
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    .sidebar-item .delete-list-btn {
      opacity: 0;
      transition: opacity 0.2s ease, color 0.2s ease;
    }

    .sidebar-item:hover .delete-list-btn {
      opacity: 1;
    }
  `;
  document.head.appendChild(styleElement);
}

function renderTasks(tasks) {
  const taskList = document.getElementById('taskList');
  if (!taskList) return;

  taskList.innerHTML = '';

  tasks.forEach(task => {
    if (typeof createTaskElement === 'function') {
      const taskElement = createTaskElement(task);
      taskList.appendChild(taskElement);
    }
  });
}

window.renderTasks = renderTasks;

function refreshTaskList(listName) {
  if (typeof window.filterTasks === 'function') {
    window.filterTasks(listName);
  }
}

window.refreshTaskList = refreshTaskList;

document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    addCustomStyles();
  }, 400);
});