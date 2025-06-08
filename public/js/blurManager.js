function applyBlurEffect(task, strict = false) {
  if (!task || !task._id || !task.list) return;

  if (strict && !task.completed) {
    console.log(`🚫 Skipping blur for incomplete task: ${task.title}`);
    return;
  }

  const listId = task.list.toLowerCase().replace(/\s+/g, '-').trim();

  // ✅ CORRECT PANEL ID for dynamic panels
  const panel = document.getElementById(`right-panel-${listId}-${task._id}`);

  if (!panel) {
    console.warn('⚠️ No matching panel found for:', task.title);
    return;
  }

  const blurContent = panel.querySelector('.task-blur-content') || panel;

  if (task.completed) {
    blurContent.classList.add('blurred');
    blurContent.style.cssText = 'filter: blur(5px) !important; pointer-events: none;';
  } else {
    blurContent.classList.remove('blurred');
    blurContent.style.cssText = 'filter: none !important; pointer-events: auto;';
  }

  console.log('🔍 Applying blur to:', task.title, '| Completed:', task.completed);
  console.log('📎 Panel:', panel, '| Blur target:', blurContent);
}





function updatePanelBlurUI(task) {
  if (!task || !task._id || !task.list) return;

  const listId = task.list.toLowerCase().replace(/\s+/g, '-').trim();
  const panel = document.getElementById(`right-panel-${listId}-${task._id}`);

  if (!panel) {
    console.warn('⚠️ Correct panel not found for blur update:', task.title);
    return;
  }

  const blurContent = panel.querySelector('.task-blur-content');

  if (!blurContent) {
    console.warn('⚠️ task-blur-content not found, falling back to panel for:', task.title);
  }
  const target = blurContent || panel;
  

  console.log('🔍 Re-applying blur to:', task.title, '| Completed:', task.completed);
  console.log('📎 Panel:', panel, '| Blur target:', blurContent);

  if (task.completed) {
    blurContent.classList.add('blurred');
    blurContent.style.cssText = 'filter: blur(5px) !important; pointer-events: none;';
  } else {
    blurContent.classList.remove('blurred');
    blurContent.style.cssText = 'filter: none !important; pointer-events: auto;';
  }

  const completeBtn = panel.querySelector('.complete-btn');
  if (completeBtn) {
    completeBtn.textContent = task.completed ? 'Mark as Incomplete' : 'Mark as Complete';
    completeBtn.className = task.completed
      ? 'complete-btn bg-green-500 text-white px-4 py-2 rounded-md'
      : 'complete-btn bg-blue-500 text-white px-4 py-2 rounded-md';
  }
}






function toggleBlurFromCompleteBtn() {
  const currentTaskId = localStorage.getItem('selectedTaskId');
  const task = localTaskCache.find(t => t._id === currentTaskId);
  if (!task) return;

  task.completed = !task.completed;

// ✅ Update the task in localStorage correctly
const cached = localStorage.getItem('taskCache');
if (cached) {
  const fromStorage = JSON.parse(cached);
  const i = fromStorage.findIndex(t => t._id === task._id);
  if (i !== -1) {
    fromStorage[i].completed = task.completed;
    localStorage.setItem('taskCache', JSON.stringify(fromStorage));
  }
}

saveTaskCacheToLocalStorage(); // still keep your usual save
applyBlurEffect(task, true);


  const checkbox = document.querySelector(`.task-item[data-task-id="${currentTaskId}"] .checkbox`);
  const taskText = document.querySelector(`.task-item[data-task-id="${currentTaskId}"] span`);
  if (checkbox) {
    checkbox.classList.toggle('checked', task.completed);
    checkbox.innerHTML = task.completed ? '<i class="fas fa-check text-white text-xs"></i>' : '';
  }
  if (taskText) {
    taskText.className = task.completed
      ? 'line-through text-gray-500 flex-grow text-sm'
      : 'text-gray-200 flex-grow text-sm';
  }

  updatePanelBlurUI(task);
}



function setupCheckboxBlurListeners() {
  document.addEventListener('click', (e) => {
    const checkbox = e.target.closest('.checkbox');
    if (!checkbox) return;

    const taskItem = checkbox.closest('.task-item');
    if (!taskItem) return;

    const taskId = taskItem.dataset.taskId;
    const task = localTaskCache.find(t => t._id === taskId);
    if (!task) return;

    task.completed = !task.completed;
    saveTaskCacheToLocalStorage();
    applyBlurEffect(task, true);

    if (task.completed) {
      checkbox.classList.add('checked');
      checkbox.innerHTML = '<i class="fas fa-check text-white text-xs"></i>';
    } else {
      checkbox.classList.remove('checked');
      checkbox.innerHTML = '';
    }

    const textEl = taskItem.querySelector('span');
    if (textEl) {
      textEl.className = task.completed
        ? 'line-through text-gray-500 flex-grow text-sm'
        : 'text-gray-200 flex-grow text-sm';
    }

    if (task._id === localStorage.getItem('selectedTaskId')) {
      updatePanelBlurUI(task);
    }
  });
}

window.applyBlurEffect = applyBlurEffect;
window.toggleBlurFromCompleteBtn = toggleBlurFromCompleteBtn;
window.setupCheckboxBlurListeners = setupCheckboxBlurListeners;


document.addEventListener('DOMContentLoaded', () => {
  setupCheckboxBlurListeners();
});
