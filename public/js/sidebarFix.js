// This script ensures sidebar items properly set the active list
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for the DOM to stabilize
    setTimeout(function() {
      // Find all sidebar list items
      const sidebarItems = document.querySelectorAll('.sidebar-item');
      
      console.log('Found', sidebarItems.length, 'sidebar items');
      
      // Add click handlers to each sidebar item
      sidebarItems.forEach(function(item) {
        // Get the list name from the data attribute
        const listName = item.dataset.list;
        
        if (listName) {
          console.log('Setting up click handler for list:', listName);
          
          // Remove any existing click handlers
          const newItem = item.cloneNode(true);
          item.parentNode.replaceChild(newItem, item);
          
          // Add our click handler
          newItem.addEventListener('click', function(e) {
            // Prevent default if it's a link
            if (e.currentTarget.tagName === 'A') {
              e.preventDefault();
            }
            
            console.log('Clicked list:', listName);
            
            // Set the active list in localStorage
            localStorage.setItem('activeList', listName);
            console.log('Active list set to:', listName);
            console.log('Verifying:', localStorage.getItem('activeList'));
            
            // Call filterTasks to update the UI
            if (typeof window.filterTasks === 'function') {
              window.filterTasks(listName);
            } else {
              console.error('filterTasks function not found');
            }
          });
        }
      });
    }, 300);
  });
  
  // Debug helper to check what's happening with active list
  function debugActiveList() {
    console.log('Current active list:', localStorage.getItem('activeList'));
    return localStorage.getItem('activeList');
  }
  
  // Add this to window so it can be called from console
  window.debugActiveList = debugActiveList;