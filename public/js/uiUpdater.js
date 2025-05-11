function applyBlurEffect(shouldBlur) {
  const blurContent = document.getElementById('task-blur-content');
  if (!blurContent) {
    console.error('❌ No #task-blur-content found.');
    return;
  }

  console.log('Applying blur effect to:', blurContent);

  const completeBtn = document.getElementById('complete-btn');
  
  if (shouldBlur) {
    blurContent.classList.add('blurred');
    blurContent.style.filter = 'blur(5px)';
   
    if (completeBtn) {
      completeBtn.innerHTML = '<i class="fas fa-check mr-2"></i> Completed';
      completeBtn.classList.remove('bg-blue-500', 'hover:bg-blue-600');
      completeBtn.classList.add('bg-green-500', 'hover:bg-green-600');
    }
  } else {
    blurContent.classList.remove('blurred');
    blurContent.style.filter = 'none';
    if (completeBtn) {
      completeBtn.innerHTML = 'Mark as Complete';
      completeBtn.classList.add('bg-blue-500', 'hover:bg-blue-600');
      completeBtn.classList.remove('bg-green-500', 'hover:bg-green-600');
    }
  }
}

function markSelectedTaskComplete() {
  console.log('Mark as Complete button clicked');
  applyBlurEffect(true);

  const completeBtn = document.getElementById('complete-btn');
  if (completeBtn) {
    completeBtn.innerHTML = '<i class="fas fa-check mr-2"></i> Completed';
    completeBtn.classList.remove('bg-blue-500', 'hover:bg-blue-600');
    completeBtn.classList.add('bg-green-500', 'hover:bg-green-600');
  }
}

function updateAllListCounts(tasks) {
  try {
    const listCounts = {};
    tasks.forEach(task => {
      const list = task.list || 'Personal';
      listCounts[list] = (listCounts[list] || 0) + 1;
    });
    
    document.querySelectorAll('.sidebar-item').forEach(item => {
      const listName = item.textContent.trim().split(' ')[0];
      const countElement = item.querySelector('.count');
      if (countElement && listName) {
        countElement.textContent = listCounts[listName] || 0;
      }
    });
    
    const allTasksCount = document.getElementById('allTasksCount');
    if (allTasksCount) {
      allTasksCount.textContent = tasks.length;
    }
    
    console.log('Updated all list counts:', listCounts);
  } catch (error) {
    console.error('Error updating all list counts:', error);
  }
}

function updateTaskCount(listName, change) {
  try {
    const listItem = Array.from(document.querySelectorAll('.sidebar-item'))
      .find(item => item.textContent.includes(listName));
    
    if (listItem) {
      const countElement = listItem.querySelector('.count');
      if (countElement) {
        const currentCount = parseInt(countElement.textContent, 10) || 0;
        const newCount = Math.max(0, currentCount + change);
        countElement.textContent = newCount;
        console.log(`Updated count for ${listName}: ${currentCount} → ${newCount}`);
      }
    }
    
    const allTasksCount = document.getElementById('allTasksCount');
    if (allTasksCount) {
      const currentCount = parseInt(allTasksCount.textContent, 10) || 0;
      const newCount = Math.max(0, currentCount + change);
      allTasksCount.textContent = newCount;
    }
  } catch (error) {
    console.error(`Error updating task count for ${listName}:`, error);
  }
}

