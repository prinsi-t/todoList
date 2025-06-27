
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
        
        const currentActiveList = getActiveList();

        const isDeselecting = currentActiveList === listName;
        
        if (isDeselecting) {
          console.log(`${listName} is already selected, keeping it selected`);
          highlightActiveList(listName);
        } else {
          localStorage.setItem('activeList', listName);
          localStorage.setItem('lastSelectedList', listName);
          
          // ✅ Do NOT remove selectedTaskId here — allow fallback selection
          highlightActiveList(listName);
          
          // let showPanelForList decide fallback task
          showPanelForList(listName);
          
          // ✅ Let filterTasks preserve selection
          if (typeof window.filterTasks === 'function') {
            window.filterTasks(listName, true);
          }
          
          
          
          if (typeof window.updatePanelOnListChange === 'function') {
            window.updatePanelOnListChange(listName);
          }


        }
      });
    }
  });
}

document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    createPanelsForAllLists();

    if (typeof getActiveList === 'function') {
      const activeList = getActiveList(); // from sessionState
      const selectedTaskId = getSelectedTaskId?.();
      showPanelForList(activeList, selectedTaskId);
      highlightActiveList(activeList);
    }
  }, 500);
});


  
  function debugActiveList() {
    //console.log('Current active list:', localStorage.getItem('activeList'));
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
//    console.log(`Updating count for ${listName} by ${change}`);
  
    const listSelector = listName.toLowerCase().replace(/\s+/g, '-');
    const countElement = document.getElementById(`count-${listSelector}`);
  
    if (countElement) {
      const currentCount = parseInt(countElement.textContent, 10) || 0;
      const newCount = Math.max(0, currentCount + change);
      countElement.textContent = newCount;
    //  console.log(`Updated count for ${listName}: ${currentCount} → ${newCount}`);
    } else {
      console.warn(`Count element for list "${listName}" not found with selector: count-${listSelector}`);
  
      const listItem = document.querySelector(`.sidebar-item[data-list="${listName}"]`);
      if (listItem) {
    //    console.log(`Found list item for "${listName}"`);
        let countSpan = listItem.querySelector('.text-sm.text-gray-500');
        if (countSpan) {
          const currentCount = parseInt(countSpan.textContent, 10) || 0;
          const newCount = Math.max(0, currentCount + change);
          countSpan.textContent = newCount;
      //    console.log(`Updated existing count span for "${listName}": ${currentCount} → ${newCount}`);
        }
      }
    }
  
    const allTasksCount = document.getElementById('allTasksCount');
    if (allTasksCount && change !== 0) {
      const currentCount = parseInt(allTasksCount.textContent, 10) || 0;
      const newCount = Math.max(0, currentCount + change);
      allTasksCount.textContent = newCount;
      //console.log(`Updated all tasks count: ${currentCount} → ${newCount}`);
    }
  
    if (typeof window.updateAllTaskCounts === 'function') {
      setTimeout(() => {
        window.updateAllTaskCounts();
      }, 100);
    }
  }
  
  window.updateTaskCount = updateTaskCount;

  function updateAllTaskCounts() {
    // console.log('Running updateAllTaskCounts...');
    const defaultLists = ['Personal', 'Work', 'Grocery List', 'hh', 'ddd', 'kk'];
    
    const customLists = [...new Set(localTaskCache.map(task => task.list))]
      .filter(list => list && !defaultLists.includes(list));
  
    const allLists = [...defaultLists, ...customLists];
  
    let totalTasks = 0;
  
    allLists.forEach(listName => {
      const listTasks = localTaskCache.filter(task => task.list === listName);
      const count = listTasks.length;
      totalTasks += count;
  
      const listSelector = listName.toLowerCase().replace(/\s+/g, '-');
      const countId = `count-${listSelector}`;
  
      let countElement = document.getElementById(countId);
      
      if (!countElement) {
        // FIX: Use the actual listName for the data-list attribute, not the selector
        const listItem = document.querySelector(`.sidebar-item[data-list="${listName}"]`);
        
        if (listItem) {
          countElement = document.createElement('span');
          countElement.id = countId;
          countElement.className = 'text-sm text-gray-500 ml-auto';
          listItem.appendChild(countElement);
        } else {
          countElement = document.createElement('span');
          countElement.id = countId;
          countElement.style.display = 'none';
          document.body.appendChild(countElement);
        }
      }
  
      if (countElement) {
        countElement.textContent = count.toString();
        //console.log(`Set count for ${listName} to ${count}`);
      } else {
        console.warn(`Could not find or create count element for ${listName}`);
      }
    });
  
    const allTasksCount = document.getElementById('allTasksCount');
    if (allTasksCount) {
      allTasksCount.textContent = totalTasks.toString();
      console.log(`Updated total tasks count to ${totalTasks}`);
    }
  }
  window.updateAllTaskCounts = updateAllTaskCounts;

  
function ensureCountElementsExist() {
  const defaultLists = ['Personal', 'Work', 'Grocery List'];
  
  defaultLists.forEach(listName => {
    const listSelector = listName.toLowerCase().replace(/\s+/g, '-');
    const countId = `count-${listSelector}`;
    
    if (!document.getElementById(countId)) {
      const listItem = document.querySelector(`.sidebar-item[data-list="${listSelector}"]`);
      
      if (listItem) {
        const countSpan = document.createElement('span');
        countSpan.id = countId;
        countSpan.className = 'text-sm text-gray-500 ml-auto';
        countSpan.textContent = '0'; // Default to 0
        listItem.appendChild(countSpan);
        console.log(`Created count element for ${listName}`);
      } else {
        const hiddenCount = document.createElement('span');
        hiddenCount.id = countId;
        hiddenCount.style.display = 'none';
        hiddenCount.textContent = '0';
        document.body.appendChild(hiddenCount);
        console.log(`Created hidden count element for ${listName}`);
      }
    }
  });

  try {
    const customLists = JSON.parse(localStorage.getItem('customLists') || '[]');
    
    customLists.forEach(listName => {
      const listSelector = listName.toLowerCase().replace(/\s+/g, '-');
      const countId = `count-${listSelector}`;
      
      if (!document.getElementById(countId)) {
        const listItem = document.querySelector(`.sidebar-item[data-list="${listSelector}"]`);
        
        if (listItem) {
          const countSpan = document.createElement('span');
          countSpan.id = countId;
          countSpan.className = 'text-sm text-gray-500 ml-auto';
          countSpan.textContent = '0';
          listItem.appendChild(countSpan);
        } else {
          const hiddenCount = document.createElement('span');
          hiddenCount.id = countId;
          hiddenCount.style.display = 'none';
          hiddenCount.textContent = '0';
          document.body.appendChild(hiddenCount);
        }
      }
    });
  } catch (error) {
    console.error('Error processing custom lists:', error);
  }
}


window.ensureCountElementsExist = ensureCountElementsExist;
  
  function highlightActiveList(activeList) {
    console.log('Highlighting active list:', activeList);
  
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    console.log(`Found ${sidebarItems.length} sidebar items to check`);
  
   
  
    sidebarItems.forEach(item => {
      const listName = item.getAttribute('data-list');
    
      const span = item.querySelector('span.flex-grow');
  
      console.log(`Checking sidebar item: ${listName} against active list: ${activeList}`);
  
      if (listName === activeList) {
        console.log(`✅ Matching list found: ${listName} - applying active styles`);
  
        item.classList.add('active-list', 'bg-dark-hover', 'text-white');
        item.setAttribute('style', 'background-color:rgb(55, 111, 201) !important; padding-left: 14px; transition: all 0.2s ease-in-out;');
  
        if (span) {
          span.classList.add('font-medium');
          span.style.fontWeight = '600';
          span.style.color = 'white';
        }
  
       
  
      } else {
     console.log(`Removing active styles from: ${listName}`);
        item.classList.remove('active-list', 'bg-dark-hover', 'text-white');
        item.style.paddingLeft = '16px';
        item.style.backgroundColor = '';
  
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
    //console.log('Adding new list:', listName);
  
    const existingItem = document.querySelector(`.sidebar-item[data-list="${listName}"]`);
    if (existingItem) {
   //   console.log(`List ${listName} already exists in the sidebar, not adding again`);
      return;
    }
  
    const sidebarContainer = document.querySelector('.sidebar-items');
    if (!sidebarContainer) {
      console.error('Sidebar container not found');
      return;
    }
  
    const newListItem = document.createElement('a');
    newListItem.href = '#';
    newListItem.className = 'sidebar-item flex items-center gap-2 px-4 py-2 rounded-lg';
    newListItem.setAttribute('data-list', listName);
  
    const isCustomList = !isDefaultList(listName);
  
    // Create separate elements for better control
    const iconElement = document.createElement('i');
    iconElement.className = 'fas fa-folder text-green-400';
    newListItem.appendChild(iconElement);
    
    const textElement = document.createElement('span');
    textElement.className = 'flex-grow';
    textElement.textContent = listName;
    newListItem.appendChild(textElement);
    
    const countElement = document.createElement('span');
    countElement.id = `count-${listName.toLowerCase().replace(/\s+/g, '-')}`;
    countElement.className = 'text-sm text-gray-300';
    countElement.textContent = '0';
    newListItem.appendChild(countElement);
  
    if (isCustomList) {
      const deleteButton = document.createElement('button');
      deleteButton.className = 'delete-list-btn text-gray-300 hover:text-red-500 transition-opacity duration-200';
      deleteButton.title = 'Delete list';
      
      const deleteIcon = document.createElement('i');
      deleteIcon.className = 'fas fa-trash-alt';
      deleteButton.appendChild(deleteIcon);
      
      newListItem.appendChild(deleteButton);
      
      deleteButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        deleteList(listName);
      });
    }
  
    newListItem.classList.add('group');
  
    newListItem.addEventListener('click', (e) => {
      if (e.target.closest('.delete-list-btn')) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
  
    //  console.log(`Custom list clicked: ${listName}`);
      localStorage.setItem('activeList', listName);
    //  console.log(`Set active list in localStorage to: ${listName} (from custom list click)`);
  
      localStorage.removeItem('selectedTaskId');
  
      if (typeof window.filterTasks === 'function') {
        window.filterTasks(listName, true);
      }
      highlightActiveList(listName);
    });
  
    sidebarContainer.appendChild(newListItem);
  
    if (isCustomList && saveToStorage) {
      saveCustomListToLocalStorage(listName);
    }
    
   console.log(`Creating right panel for new list: ${listName}`);
    
 const panel = null; // Don't create dummy panels for new lists anymore

    
   
    
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
      
  //    console.log(`Panel for ${listName} is now visible`);
      
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
  //  console.log('Loading custom lists from localStorage');
    
    clearExistingCustomLists();
    
    const customLists = JSON.parse(localStorage.getItem('customLists') || '[]');
    customLists.forEach(listName => {
      addNewList(listName, false);
    });
  
    updateDefaultListItems();
  
    const activeList = localStorage.getItem('activeList');
    
    if (activeList) {
     // console.log(`Highlighting active list: ${activeList} from localStorage in loadCustomListsFromLocalStorage`);
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
   // console.log('Adding custom styles for sidebar items');
  
    const existingStyle = document.getElementById('todo-app-custom-styles');
    if (existingStyle) {
      //console.log('Removing existing custom styles');
      existingStyle.remove();
    }
  
    const styleElement = document.createElement('style');
    styleElement.id = 'todo-app-custom-styles';
    styleElement.textContent = `
      .sidebar-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 10px 12px;
        border-radius: 8px;
        transition: all 0.2s;
        flex-wrap: nowrap;
      }
  
     .sidebar-item .item-left {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-shrink: 1;
        min-width: 0;
      }

      .sidebar-item .item-left span {
        white-space: normal;
        word-break: break-word;
        font-size: 0.875rem; /* text-sm */
        color: #d1d5db; /* text-gray-300 */
      }

      .sidebar-item .count {
        margin-left: auto;
        font-size: 0.875rem;
        color: #9ca3af; /* text-gray-400 */
        white-space: nowrap;
      }

      .sidebar-item .delete-list-btn {
        margin-left: 8px;
        flex-shrink: 0;
      }
  
      .sidebar-item:hover .delete-list-btn {
        opacity: 1;
      }
  
      .sidebar-item:not(.active-list):hover {
        background-color: #374151 !important;
      }
  
      .sidebar-item.active-list:hover {
        background-color: #1e293b !important;
        color: white !important;
        transform: translateX(2px) !important;
        box-shadow: 0 0 8px rgba(59, 130, 246, 0.3) !important;
      }
  
      .sidebar-item span.flex-grow {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: calc(100% - 60px);
      }
  
      .sidebar-item .text-sm.text-gray-500 {
        margin-left: auto;
        margin-right: 24px;
      }
  
      .sidebar-item.active-list {
        position: relative;
        box-shadow: 0 0 8px rgba(59, 130, 246, 0.3) !important;
        background-color: #1e293b !important;
        transform: translateX(2px);
        transition: all 0.3s ease !important;
        animation: subtle-pulse 3s infinite;
      }
  
      .sidebar-item.text-white span.flex-grow {
        color: white !important;
        font-weight: 600 !important;
      }
  
    
  
  
    `;
  
    document.head.appendChild(styleElement);
//    console.log('Custom styles added successfully for sidebar items');
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
  if (panelManagerInitialized) return;
  panelManagerInitialized = true;

  setupListSwitchListeners();

  const activeList = getActiveList(); // ✅ uses synced sessionState/localStorage
  const selectedTaskId = getSelectedTaskId?.();

  console.log(`📌 [initPanelManager] Using activeList: ${activeList} | selectedTaskId: ${selectedTaskId}`);

  setTimeout(() => {
    if (activeList) {
      showPanelForList(activeList, selectedTaskId);

      if (typeof highlightActiveList === 'function') {
        highlightActiveList(activeList);
      }

      if (typeof filterTasks === 'function') {
        filterTasks(activeList, true);
      }
    } else {
      const fallback = 'Personal';
      setActiveList(fallback);
      localStorage.setItem('activeList', fallback);

      console.warn(`⚠️ No activeList found — falling back to: ${fallback}`);
      showPanelForList(fallback, selectedTaskId);

      if (typeof highlightActiveList === 'function') {
        highlightActiveList(fallback);
      }

      if (typeof filterTasks === 'function') {
        filterTasks(fallback, true);
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
      //if (panel) console.log(`Successfully created panel for ${listName}`);
    });
    
    const customLists = JSON.parse(localStorage.getItem('customLists') || '[]');
    customLists.forEach(listName => {
      const panel = createPanelForList(listName);
     // if (panel) console.log(`Successfully created panel for custom list ${listName}`);
    });
  } catch (error) {
    console.error('Error creating panels for lists:', error);
  }
}

function createPanelForList() {
  return null; // Stop creating dummy base panels
}


/**
 * Show the panel for a specific list
 * @param {string} listName - The name of the list
 * @param {string|null} taskId - Optional task ID to display
 */

function showPanelForList(listName, selectedTaskId = null) {
  if (!listName) return;

  const rightPanelsContainer = document.getElementById('right-panels-container');

  // 🧼 Hide all panels first
  document.querySelectorAll('.right-panel.task-panel').forEach(panel => {
    panel.classList.add('hidden');
    panel.style.display = 'none';
  });

  const task = selectedTaskId
    ? findTaskById(selectedTaskId)
    : findMostRecentTask(listName);

  if (!task || task.list !== listName) {
    if (rightPanelsContainer) {
      rightPanelsContainer.classList.add('hidden');
      rightPanelsContainer.style.display = 'none';
    }
    return;
  }

  const panelId = `right-panel-${task.list.toLowerCase().replace(/\s+/g, '-')}-${task._id}`;
  let panel = document.getElementById(panelId);

  if (!panel && typeof createPanelForTask === 'function') {
    panel = createPanelForTask(task);
  }

  if (!panel) return;

  panel.classList.remove('hidden');
  panel.style.display = 'block';

  if (rightPanelsContainer) {
    rightPanelsContainer.classList.remove('hidden');
    rightPanelsContainer.style.display = 'block';
  }

  if (typeof setSelectedTaskUI === 'function') {
    setSelectedTaskUI(task);
  }

  if (typeof updatePanelBlurUI === 'function') {
    updatePanelBlurUI(task);
  }

  // ✅ Sync selection state to prevent resets
  window.selectedTaskId = task._id;
  window.currentTaskId = task._id;
  window.selectionLocked = true;

  document.dispatchEvent(new CustomEvent('listChanged', {
    detail: { listName }
  }));

  console.log('📌 showPanelForList → locked selection for:', task.title);
}






document.addEventListener('DOMContentLoaded', function() {
  if (typeof window.localTaskCache === 'undefined') {
    window.localTaskCache = JSON.parse(localStorage.getItem('taskCache') || '[]');
  }

  setTimeout(function() {
    addCustomStyles();
    fixSidebarNavigation();
    setupAddListButton();
    loadCustomListsFromLocalStorage();

    const activeList = getActiveList();


    //console.log('DOMContentLoaded - Active list:', activeList);
   

 //   console.log('DOMContentLoaded - Using existing active list:', activeList);
  //  
    // Only highlight, don't call any functions that might change the active list
    if (activeList && typeof highlightActiveList === 'function') {
      highlightActiveList(activeList);
    }

    setTimeout(initPanelManager, 200);
  }, 300);
});

document.addEventListener('listChanged', function(e) {
  if (e.detail && e.detail.listName) {
    const currentActiveList = localStorage.getItem('activeList');
    const newList = e.detail.listName;

    if (newList !== currentActiveList) {
      // Update active list in storage and highlight
      localStorage.setItem('activeList', newList);

      setTimeout(() => {
   //     console.log('listChanged event - Highlighting active list:', newList);
        highlightActiveList(newList);
      }, 100);
    } else {
      // Already active, no need to re-highlight or reset panel
      //console.log('listChanged event - List already active:', newList);
    }
  }
});




function findTaskById(taskId) {
  if (!taskId || !window.localTaskCache) return null;
  
  return window.localTaskCache.find(task => task._id === taskId);
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

  //console.log(`Updating panel with task: ${task.title}`);
  const titleElement = panel.querySelector('h2');
if (titleElement) {
  titleElement.textContent = task.title || '';

  // Apply classes to force truncation
  titleElement.className = 'text-2xl font-semibold text-gray-100 mb-1 break-words whitespace-nowrap overflow-hidden text-ellipsis max-w-[90%] block';
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
  if (task.completed) {
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

//  console.log(`Clearing panel for list: ${listName}`);

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
//      console.log(`Filter tasks called for list: ${listName}, preserve selection: ${preserveSelection}`);
      
      localStorage.setItem('activeList', listName);
      localStorage.setItem('lastSelectedList', listName);
      
      originalFilterTasks(listName, preserveSelection);

      const selectedTaskId = preserveSelection ? localStorage.getItem('selectedTaskId') : null;
      
      setTimeout(() => {
        const selectedTask = localTaskCache.find(t => t._id === selectedTaskId);
        if (selectedTask) showPanelForTask(selectedTask);
        
        highlightActiveList(listName);
        
        if (typeof window.updatePanelOnListChange === 'function') {
          window.updatePanelOnListChange(listName);
        }
      }, 50);
    };
  }
}

function initializeWithCorrectList() {
 // console.log('Initializing with correct list...');

  const isFromLogin = document.referrer.includes('/login') || document.referrer.includes('/register');

  if (isFromLogin) {
 //   console.log('Coming from login, forcing Personal list');
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

  // Use lastSelectedList or activeList or default to Personal, but ONLY set localStorage if empty
  const listToLoad = lastSelectedList || activeList || 'Personal';

 // console.log(`Initializing with list: ${listToLoad}`);

  if (!activeList) {
    localStorage.setItem('activeList', listToLoad);
  }
  if (!lastSelectedList) {
    localStorage.setItem('lastSelectedList', listToLoad);
  }

  if (typeof window.filterTasks === 'function') {
    window.filterTasks(listToLoad, true);
  }

  highlightActiveList(listToLoad);

  setTimeout(() => {
    highlightActiveList(listToLoad);
  }, 500);
}

window.initializeWithCorrectList = initializeWithCorrectList;

window.updatePanelOnListChange = function(listName) {
  if (!listName) return;
  
 // console.log(`Updating panel visibility for list: ${listName}`);
  
  if (typeof window.updateRightPanelVisibility === 'function') {
    window.updateRightPanelVisibility(listName);
  }
};