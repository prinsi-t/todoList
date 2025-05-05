// Update task counts in the sidebar
function updateSidebarCounts(taskCounts) {
    console.log('Updating sidebar counts:', taskCounts);
  
    // Loop through each list and update the count
    Object.keys(taskCounts).forEach(list => {
      const countElement = document.getElementById(`count-${list.toLowerCase().replace(/\s+/g, '-')}`);
      if (countElement) {
        countElement.textContent = taskCounts[list];
      }
    });
  }
  
  // Highlight the active list in the sidebar
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
  
  // Open the "Add List" modal
function openAddListModal() {
    // Check if modal exists, if not create it
    let modal = document.getElementById('addListModal');
    if (!modal) {
      createAddListModal();
      modal = document.getElementById('addListModal');
    }
    
    if (modal) {
      modal.classList.remove('hidden');
      // Focus on the input field
      setTimeout(() => {
        const input = document.getElementById('newListInput');
        if (input) input.focus();
      }, 100);
    } else {
      console.error('Modal element not found and could not be created');
    }
  }
  
  // Create the modal if it doesn't exist
  function createAddListModal() {
    // Check if modal already exists
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
    
    // Append modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Set up event listeners for the new modal
    const newForm = document.getElementById('addListForm');
    if (newForm) {
      newForm.addEventListener('submit', handleAddListFormSubmit);
    }
    
    // Close modal when clicking outside
    const modalBackground = document.querySelector('#addListModal .fixed.inset-0');
    if (modalBackground) {
      modalBackground.addEventListener('click', closeAddListModal);
    }
  }

  // Set up the + button next to "My Lists"
  function setupAddListButton() {
    // Remove any existing add buttons first to prevent duplicates
    const existingButtons = document.querySelectorAll('.add-list-button');
    existingButtons.forEach(button => button.remove());
    
    // Now add a single button
    const myListsEl = document.querySelector('h2, h3, div').filter(el => 
      el.textContent.trim() === 'My Lists'
    )[0] || document.querySelector('.my-lists-header');
    
    if (myListsEl) {
      // Make sure it has position relative for absolute positioning
      myListsEl.style.position = 'relative';
      
      const addButton = document.createElement('button');
      addButton.className = 'add-list-button text-gray-400 hover:text-white absolute right-2 top-1/2 transform -translate-y-1/2';
      addButton.innerHTML = '<i class="fas fa-plus"></i>';
      addButton.addEventListener('click', openAddListModal);
      myListsEl.appendChild(addButton);
    }
  }
  
  // Close the "Add List" modal
  function closeAddListModal() {
    const modal = document.getElementById('addListModal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }
  
  // Handle the "Add List" form submission
  function handleAddListFormSubmit(e) {
    e.preventDefault();
  
    const newListInput = document.getElementById('newListInput');
    const newListName = newListInput.value.trim();
  
    if (newListName) {
      addNewList(newListName); // Add the new list to the sidebar
      newListInput.value = ''; // Clear the input field
      closeAddListModal(); // Close the modal
    } else {
      alert('List name cannot be empty.');
    }
  }
  
  // Add a new custom list to the sidebar
  function addNewList(listName) {
    console.log('Adding new list:', listName);
  
    const sidebarContainer = document.querySelector('.sidebar-items');
    if (!sidebarContainer) {
      console.error('Sidebar container not found');
      return;
    }
  
    // Create a new sidebar item
    const newListItem = document.createElement('a');
    newListItem.href = '#';
    newListItem.className = 'sidebar-item flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-dark-hover';
    newListItem.setAttribute('data-list', listName);
    newListItem.innerHTML = `
      <i class="fas fa-folder text-green-400"></i>
      <span class="flex-grow">${listName}</span>
      <span id="count-${listName.toLowerCase().replace(/\s+/g, '-')}" class="text-sm text-gray-500">0</span>
    `;
  
    // Add click event to filter tasks by the new list
    newListItem.addEventListener('click', () => {
      filterTasks(listName);
      highlightActiveList(listName);
    });
  
    // Append the new list to the sidebar
    sidebarContainer.appendChild(newListItem);
    
    // Save the new list to localStorage
    saveCustomListToLocalStorage(listName);
  }
  
  // Add event listener to the + icon
  document.addEventListener('DOMContentLoaded', () => {
    // Set up the + button next to "My Lists"
    setupAddListButton();
    
    // Load custom lists from localStorage
    loadCustomListsFromLocalStorage();
  });
  
  // Save custom list to localStorage
  function saveCustomListToLocalStorage(listName) {
    const customLists = JSON.parse(localStorage.getItem('customLists') || '[]');
    if (!customLists.includes(listName)) {
      customLists.push(listName);
      localStorage.setItem('customLists', JSON.stringify(customLists));
    }
  }
  
  // Load custom lists from localStorage
  function loadCustomListsFromLocalStorage() {
    const customLists = JSON.parse(localStorage.getItem('customLists') || '[]');
    customLists.forEach(listName => {
      addNewList(listName);
    });
  }

