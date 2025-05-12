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
        
        const currentActiveList = localStorage.getItem('activeList');
        const isDeselecting = currentActiveList === listName;
        
        if (isDeselecting) {
          console.log(`${listName} is already selected, keeping it selected`);
          highlightActiveList(listName);
        } else {
          localStorage.setItem('activeList', listName);
          localStorage.setItem('lastSelectedList', listName);
          console.log(`Set active list in localStorage to: ${listName} (from sidebar click)`);
          localStorage.removeItem('selectedTaskId');

          highlightActiveList(listName);

          showPanelForList(listName, null);

          if (typeof window.filterTasks === 'function') {
            window.filterTasks(listName, false);
          } else {
            console.error('filterTasks function not found');
          }
        }
      });
    }
  });
}

document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
  
    createPanelsForAllLists();
    
    const activeList = localStorage.getItem('activeList') || 'Personal';
    console.log('DOMContentLoaded - Showing panel for active list:', activeList);
    
    showPanelForList(activeList);
    
    highlightActiveList(activeList);
  }, 500);
});
  
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
  
      const listId = activeList.toLowerCase().replace(/\s+/g, '-');
      const panelId = `right-panel-${listId}`;
      const panel = document.getElementById(panelId);
  
      if (panel) {
        const titleElement = panel.querySelector('h2');
        if (titleElement) {
          titleElement.textContent = taskText;
          console.log(`Directly updated panel title to: ${taskText}`);
        }
  
        if (typeof updatePanelWithTask === 'function') {
          updatePanelWithTask(panel, newTask);
          console.log('Updated panel with new task using updatePanelWithTask');
        }
  
        document.dispatchEvent(new CustomEvent('taskSelected', {
          detail: { taskId: newTask._id, listName: activeList }
        }));
  
        window.currentTaskId = newTask._id;
  
        localStorage.setItem('selectedTaskId', newTask._id);
        localStorage.setItem('lastSelectedList', activeList);
      }
  
      if (typeof window.refreshTaskList === 'function') {
        refreshTaskList(activeList);
        console.log('Task list refreshed');
      } else if (typeof window.filterTasks === 'function') {
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
  
      const listItem = document.querySelector(`.sidebar-item[data-list="${listName}"]`);
      if (listItem) {
        console.log(`Found list item for "${listName}"`);
        let countSpan = listItem.querySelector('.text-sm.text-gray-500');
        if (countSpan) {
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
    console.log(`Found ${sidebarItems.length} sidebar items to check`);
    
    sidebarItems.forEach(item => {
      const listName = item.getAttribute('data-list');
      console.log(`Checking sidebar item: ${listName} against active list: ${activeList}`);
      
      if (listName === activeList) {
        console.log(`✅ Matching list found: ${listName} - applying active styles`);

        item.classList.add('active-list', 'bg-dark-hover', 'text-white', 'border-l-4', 'border-blue-500');
        item.style.transition = 'all 0.2s ease-in-out';
        item.style.paddingLeft = '14px';
        item.style.backgroundColor = '#1e293b !important';
        
        const icon = item.querySelector('i');
        if (icon) icon.classList.add('text-blue-400');
        
        const span = item.querySelector('span.flex-grow');
        if (span) {
          span.classList.add('font-medium');
          span.style.fontWeight = '600';
          span.style.color = 'white';
        }
        
        console.log(`Applied active styles to: ${listName}`);
      } else {
        console.log(`Removing active styles from: ${listName}`);
        item.classList.remove('active-list', 'bg-dark-hover', 'text-white', 'border-l-4', 'border-blue-500');
        item.style.paddingLeft = '16px';
        item.style.backgroundColor = '';
        
        const icon = item.querySelector('i');
        if (icon) icon.classList.remove('text-blue-400');
        
        const span = item.querySelector('span.flex-grow');
        if (span) {
          span.classList.remove('font-medium');
          span.style.fontWeight = 'normal';
          span.style.color = '';
        }
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

function clearExistingCustomLists() {
  const defaultLists = ['Personal', 'Work', 'Grocery List'];
  const sidebarItems = document.querySelectorAll('.sidebar-item');
  
  sidebarItems.forEach(item => {
    const listName = item.getAttribute('data-list');
    if (listName && !defaultLists.includes(listName)) {
      item.remove();
    }
  });
}
  
  function addNewList(listName, saveToStorage = true) {
    console.log('Adding new list:', listName);
  
    const existingItem = document.querySelector(`.sidebar-item[data-list="${listName}"]`);
    if (existingItem) {
      console.log(`List ${listName} already exists in the sidebar, not adding again`);
      return;
    }
  
    const sidebarContainer = document.querySelector('.sidebar-items');
    if (!sidebarContainer) {
      console.error('Sidebar container not found');
      return;
    }
  
    const newListItem = document.createElement('a');
    newListItem.href = '#';
    newListItem.className = 'sidebar-item flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-dark-hover';
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
  
      localStorage.removeItem('selectedTaskId');
  
      if (typeof window.filterTasks === 'function') {
        window.filterTasks(listName, false);
      }
      highlightActiveList(listName);
    });
  
    sidebarContainer.appendChild(newListItem);
  
    if (isCustomList && saveToStorage) {
      saveCustomListToLocalStorage(listName);
    }
    
    console.log(`Creating right panel for new list: ${listName}`);
    
    const panel = createPanelForList(listName);
    
    if (!panel) {
      console.error('Failed to create panel for new list');
      return;
    }
    
    if (saveToStorage) {
      const allPanels = document.querySelectorAll('.right-panel');
      allPanels.forEach(p => {
        if (p.id !== 'right-panel-template') {
          p.classList.add('hidden');
          p.style.display = 'none';
        }
      });
      
      panel.classList.remove('hidden');
      panel.style.display = 'block';
      
      console.log(`Panel for ${listName} is now visible`);
      
      localStorage.setItem('activeList', listName);
      highlightActiveList(listName);
      
      clearPanel(panel, listName);
      
      document.dispatchEvent(new CustomEvent('listChanged', {
        detail: { listName }
      }));
      
      if (typeof window.filterTasks === 'function') {
        window.filterTasks(listName, false);
      }
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
    console.log('Loading custom lists from localStorage');
    
    clearExistingCustomLists();
    
    const customLists = JSON.parse(localStorage.getItem('customLists') || '[]');
    customLists.forEach(listName => {
      addNewList(listName, false);
    });
  
    updateDefaultListItems();
  
    const activeList = localStorage.getItem('activeList');
    
    if (activeList) {
      console.log(`Highlighting active list: ${activeList} from localStorage in loadCustomListsFromLocalStorage`);
      highlightActiveList(activeList);
    }
  }

  function clearExistingCustomLists() {
    const defaultLists = ['Personal', 'Work', 'Grocery List'];
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    
    sidebarItems.forEach(item => {
      const listName = item.getAttribute('data-list');
      if (listName && !defaultLists.includes(listName)) {
        item.remove();
      }
    });
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
    console.log('Adding custom styles for sidebar items');
    
    const existingStyle = document.getElementById('todo-app-custom-styles');
    if (existingStyle) {
      console.log('Removing existing custom styles');
      existingStyle.remove();
    }
  
    const styleElement = document.createElement('style');
    styleElement.id = 'todo-app-custom-styles';
    styleElement.textContent = `
      .sidebar-item .delete-list-btn {
        opacity: 0;
        transition: opacity 0.2s ease, color 0.2s ease;
      }
  
      .sidebar-item:hover .delete-list-btn {
        opacity: 1;
      }
      
      /* Enhanced styling for active list */
      .sidebar-item.active-list {
        position: relative;
        box-shadow: 0 0 8px rgba(59, 130, 246, 0.3) !important;
        background-color: #1e293b !important;
        transform: translateX(2px);
        transition: all 0.3s ease !important;
      }
      
      .sidebar-item.border-l-4 {
        border-left-width: 4px !important;
        border-left-color: #3b82f6 !important;
      }
      
      /* Subtle pulse animation for the active list */
      @keyframes subtle-pulse {
        0% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.2); }
        50% { box-shadow: 0 0 8px rgba(59, 130, 246, 0.4); }
        100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.2); }
      }
      
      .sidebar-item.active-list {
        animation: subtle-pulse 3s infinite;
      }
      
      /* Make sure the active list text is white */
      .sidebar-item.text-white span.flex-grow {
        color: white !important;
        font-weight: 600 !important;
      }
      
      /* Default list specific styling */
      .sidebar-item[data-list="Personal"].active-list i {
        color: #60a5fa !important; /* Blue for Personal */
      }
      
      .sidebar-item[data-list="Work"].active-list i {
        color: #f97316 !important; /* Orange for Work */
      }
      
      .sidebar-item[data-list="Grocery List"].active-list i {
        color: #10b981 !important; /* Green for Grocery */
      }
      
      /* Custom list specific styling */
      .sidebar-item:not([data-list="Personal"]):not([data-list="Work"]):not([data-list="Grocery List"]).active-list i {
        color: #8b5cf6 !important; /* Purple for custom lists */
      }
      
      /* Transition effects */
      .sidebar-item {
        transition: all 0.2s ease-in-out;
        position: relative;
        overflow: hidden;
      }
      
      /* Remove hover styles that were conflicting with active state */
      .sidebar-item:hover:not(.active-list) {
        background-color: transparent !important; 
        transform: none;
      }
      
      .sidebar-item:hover:not(.active-list)::after {
        display: none;
      }
    `;
    document.head.appendChild(styleElement);
    console.log('Custom styles added successfully for sidebar items');
  }
  
  addCustomStyles();

  window.addCustomStyles = addCustomStyles;
  
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

const panelData = {};


let panelManagerInitialized = false;

function initPanelManager() {
  if (panelManagerInitialized) {
    console.log('Panel manager already initialized, skipping');
    return;
  }
  
  console.log('Initializing Panel Manager');
  panelManagerInitialized = true;

  createPanelsForAllLists();

  setupListSwitchListeners();

  const activeList = localStorage.getItem('activeList') || 'Personal';
  console.log(`Active list from localStorage in initPanelManager: ${activeList}`);

  const selectedTaskId = localStorage.getItem('selectedTaskId');
  
  setTimeout(() => {
    if (activeList) {
      showPanelForList(activeList, selectedTaskId);

      if (typeof window.highlightActiveList === 'function') {
        window.highlightActiveList(activeList);
      }
      
      if (typeof window.filterTasks === 'function') {
        window.filterTasks(activeList, true); 
      }
    } else {
      localStorage.setItem('activeList', 'Personal');
      console.log('No active list found, setting to Personal as default');
      showPanelForList('Personal', selectedTaskId);
      
      if (typeof window.highlightActiveList === 'function') {
        window.highlightActiveList('Personal');
      }
      
      if (typeof window.filterTasks === 'function') {
        window.filterTasks('Personal', true);
      }
    }
  }, 300);
}

function createPanelsForCustomLists() {
  try {

    const defaultLists = ['Personal', 'Work', 'Grocery List'];
    defaultLists.forEach(listName => {
      createPanelForList(listName);
    });
    
    const customLists = JSON.parse(localStorage.getItem('customLists') || '[]');
    customLists.forEach(listName => {
      createPanelForList(listName);
    });
  } catch (error) {
    console.error('Error creating panels for custom lists:', error);
  }
}

window.createPanelsForCustomLists = createPanelsForCustomLists;

function createPanelsForAllLists() {
  try {
    
    const defaultLists = ['Personal', 'Work', 'Grocery List'];
    defaultLists.forEach(listName => {
      const panel = createPanelForList(listName);
      if (panel) console.log(`Successfully created panel for ${listName}`);
    });
    
    const customLists = JSON.parse(localStorage.getItem('customLists') || '[]');
    customLists.forEach(listName => {
      const panel = createPanelForList(listName);
      if (panel) console.log(`Successfully created panel for custom list ${listName}`);
    });
  } catch (error) {
    console.error('Error creating panels for lists:', error);
  }
}

function createPanelForList(listName) {
  if (!listName) return null;

  const listId = listName.toLowerCase().replace(/\s+/g, '-');
  const panelId = `right-panel-${listId}`;

  let panel = document.getElementById(panelId);
  if (panel) {
    console.log(`Panel for ${listName} already exists`);
    return panel;
  }

  console.log(`Creating panel for list: ${listName}`);

  let template = document.getElementById('right-panel-personal');
  if (!template) {
    template = document.querySelector('.right-panel');
  }
  
  if (!template) {
    console.error('No panel template found');
    return null;
  }

  const newPanel = template.cloneNode(true);
  newPanel.id = panelId;
  newPanel.setAttribute('data-list', listName);
  newPanel.classList.add('hidden');
  newPanel.style.display = 'none';

  const listNameElement = newPanel.querySelector('.text-sm.text-gray-400');
  if (listNameElement) {
    listNameElement.textContent = listName;
  }

  const completeBtn = newPanel.querySelector('.complete-btn');
  if (completeBtn) {
    completeBtn.setAttribute('onclick', `markSelectedTaskComplete('${listName}')`);
    completeBtn.setAttribute('data-list', listName);
  }

  const addSubtaskBtn = newPanel.querySelector('.add-subtask-btn');
  if (addSubtaskBtn) {
    addSubtaskBtn.setAttribute('data-list', listName);
  }

  const dropZone = newPanel.querySelector('.drop-zone');
  if (dropZone) {
    dropZone.setAttribute('data-list', listName);
  }

  const container = document.getElementById('right-panels-container');
  if (container) {
    container.appendChild(newPanel);
    console.log(`Added panel to container: ${panelId}`);
  } else {
    console.error('Right panels container not found');
    return null;
  }

  return newPanel;
}

/**
 * Show the panel for a specific list
 * @param {string} listName - The name of the list
 * @param {string|null} taskId - Optional task ID to display
 */

function showPanelForList(listName, selectedTaskId = null) {
  if (!listName) {
    console.error('No list name provided to showPanelForList');
    return;
  }

  console.log(`Showing panel for list: ${listName}, selected task: ${selectedTaskId || 'none'}`);

  // Update localStorage
  const currentActiveList = localStorage.getItem('activeList');
  if (currentActiveList !== listName) {
    localStorage.setItem('activeList', listName);
    console.log(`Setting activeList in localStorage to: ${listName} in showPanelForList`);
  }

  // Hide all panels
  const panels = document.querySelectorAll('.right-panel');
  panels.forEach(panel => {
    panel.classList.add('hidden');
    panel.style.display = 'none';
  });

  // Find the panel for this list
  const listId = listName.toLowerCase().replace(/\s+/g, '-');
  const panelId = `right-panel-${listId}`;
  
  let panel = document.getElementById(panelId);
  
  // If panel doesn't exist, create it
  if (!panel) {
    console.log(`Panel for ${listName} doesn't exist, creating it`);
    panel = createPanelForList(listName);
  }
  
  if (panel) {
    // Show the panel
    panel.classList.remove('hidden');
    panel.style.display = 'block';
    console.log(`Made panel visible: ${panelId}`);

    // Update panel with task data if needed
    if (selectedTaskId) {
      const selectedTask = findTaskById(selectedTaskId);
      if (selectedTask && selectedTask.list === listName) {
        updatePanelWithTask(panel, selectedTask);
      } else {
        updatePanelWithRecentTask(listName, panel);
      }
    } else {
      updatePanelWithRecentTask(listName, panel);
    }

    // Dispatch event for other components
    document.dispatchEvent(new CustomEvent('listChanged', {
      detail: { listName }
    }));
  } else {
    console.error(`Failed to find or create panel for list: ${listName}`);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  if (typeof window.localTaskCache === 'undefined') {
    window.localTaskCache = JSON.parse(localStorage.getItem('taskCache') || '[]');
  }

  setTimeout(function() {
    addCustomStyles();
    fixSidebarNavigation();
    fixAddTaskForm();
    setupAddListButton();
    loadCustomListsFromLocalStorage();

    const isFromLogin = document.referrer.includes('/login') || document.referrer.includes('/register');

    if (isFromLogin) {
      localStorage.setItem('activeList', 'Personal');
      console.log('Coming from login, setting active list to Personal in sidebar');
      localStorage.removeItem('selectedTaskId');
    }
    
    const activeList = localStorage.getItem('activeList')|| 'Personal';
    console.log('DOMContentLoaded - Highlighting active list:', activeList);
    highlightActiveList(activeList);
    
    if (activeList && typeof highlightActiveList === 'function') {
      highlightActiveList(activeList);
    }
    
    setTimeout(initPanelManager, 200);
  }, 300);
});

document.addEventListener('listChanged', function(e) {
  if (e.detail && e.detail.listName) {
    setTimeout(() => {
      console.log('listChanged event - Highlighting active list:', e.detail.listName);
      highlightActiveList(e.detail.listName);
    }, 100);
  }
});


function findTaskById(taskId) {
  if (!taskId || !window.localTaskCache) return null;
  
  return window.localTaskCache.find(task => task._id === taskId);
}

function findMostRecentTask(listName) {
  if (!listName || !window.localTaskCache) return null;
  
  const listTasks = window.localTaskCache
    .filter(task => task.list === listName)
    .sort((a, b) => {
      const aId = a._id.includes('_') ? parseInt(a._id.split('_')[1]) : a._id;
      const bId = b._id.includes('_') ? parseInt(b._id.split('_')[1]) : b._id;
      
      return bId - aId;
    });
  
  return listTasks.length > 0 ? listTasks[0] : null;
}

function updatePanelWithRecentTask(listName, panel) {
  if (!listName || !panel) return;

  const recentTask = findMostRecentTask(listName);
  if (recentTask) {
    updatePanelWithTask(panel, recentTask);
  } else {
    clearPanel(panel, listName);
  }
}

function updatePanelWithTask(panel, task) {
  if (!panel || !task) return;

  console.log(`Updating panel with task: ${task.title}`);
  const titleElement = panel.querySelector('h2');
  if (titleElement) {
    titleElement.textContent = task.title || '';
  }

  const completeBtn = panel.querySelector('.complete-btn');
  if (completeBtn) {
    completeBtn.textContent = task.completed ? 'Mark as Incomplete' : 'Mark as Complete';
    completeBtn.className = task.completed
      ? 'complete-btn bg-green-500 text-white px-4 py-2 rounded-md'
      : 'complete-btn bg-blue-500 text-white px-4 py-2 rounded-md';
  }

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

  const subtasksList = panel.querySelector('.subtasks-list');
  if (subtasksList && task.subtasks) {
    renderSubtasksForPanel(subtasksList, task.subtasks);
  }

  panel.setAttribute('data-current-task-id', task._id);
}

function clearPanel(panel, listName) {
  if (!panel) return;

  console.log(`Clearing panel for list: ${listName}`);

  const titleElement = panel.querySelector('h2');
  if (titleElement) {
    titleElement.textContent = '';
  }

  if (typeof loadNotesForList === 'function' && listName) {
    loadNotesForList(listName);
  } else {
    const notesTextarea = panel.querySelector('.notes-textarea');
    if (notesTextarea) {
      notesTextarea.value = '';
    }
  }

  const completeBtn = panel.querySelector('.complete-btn');
  if (completeBtn) {
    completeBtn.textContent = 'Mark as Complete';
    completeBtn.className = 'complete-btn bg-blue-500 text-white px-4 py-2 rounded-md';
  }

  const subtasksList = panel.querySelector('.subtasks-list');
  if (subtasksList) {
    subtasksList.innerHTML = '<div class="text-gray-500 text-sm py-2">No subtasks added yet.</div>';
  }

  panel.removeAttribute('data-current-task-id');

  document.dispatchEvent(new CustomEvent('listChanged', {
    detail: { listName }
  }));
}

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

  function setupListSwitchListeners() {
  const originalFilterTasks = window.filterTasks;

  if (typeof originalFilterTasks === 'function') {
    window.filterTasks = function(listName, preserveSelection = false) {
      console.log(`Filter tasks called for list: ${listName}, preserve selection: ${preserveSelection}`);
      
      localStorage.setItem('activeList', listName);
      localStorage.setItem('lastSelectedList', listName);
      
      // Call original function first
      originalFilterTasks(listName, preserveSelection);

      // Then ensure the panel is shown
      const selectedTaskId = preserveSelection ? localStorage.getItem('selectedTaskId') : null;
      
      // Brief timeout to let the task filtering complete
      setTimeout(() => {
        showPanelForList(listName, selectedTaskId);
        highlightActiveList(listName);
      }, 50);
    };
  }
}

function initializeWithCorrectList() {
  console.log('Initializing with correct list...');
  
  const isFromLogin = document.referrer.includes('/login') || document.referrer.includes('/register');
  
  if (isFromLogin) {
    
    console.log('Coming from login, using Personal list');
    localStorage.setItem('activeList', 'Personal');
    localStorage.setItem('lastSelectedList', 'Personal');
    if (typeof window.filterTasks === 'function') {
      window.filterTasks('Personal', true);
    }
    highlightActiveList('Personal');
    return;
  }
  
  const lastSelectedList = localStorage.getItem('lastSelectedList');
  const activeList = localStorage.getItem('activeList');
  
  const listToLoad = lastSelectedList || activeList || 'Personal';
  
  console.log(`Initializing with list: ${listToLoad} (from ${lastSelectedList ? 'lastSelectedList' : activeList ? 'activeList' : 'default'})`);
  
  localStorage.setItem('activeList', listToLoad);
  localStorage.setItem('lastSelectedList', listToLoad);
  
  if (typeof window.filterTasks === 'function') {
    window.filterTasks(listToLoad, true);
  }
  
  highlightActiveList(listToLoad);
  
  setTimeout(() => {
    highlightActiveList(listToLoad);
  }, 500);
}

window.initializeWithCorrectList = initializeWithCorrectList;

