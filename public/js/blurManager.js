function applyBlurEffect(shouldBlur, listName) {
  const listId = listName.toLowerCase().replace(/\s+/g, '-');
  const panelId = `right-panel-${listId}`;
  const panel = document.getElementById(panelId);
  if (!panel) return;

  const panelContent = panel.querySelector('.task-blur-content') || panel;

  if (shouldBlur) {
    panelContent.classList.add('blurred-panel');
    panelContent.style.filter = 'blur(5px)';
    panelContent.style.pointerEvents = 'none';
  } else {
    panelContent.classList.remove('blurred-panel');
    panelContent.style.filter = 'none';
    panelContent.style.pointerEvents = 'auto';
  }
}

function updatePanelBlurUI(task) {
  const listId = task.list.toLowerCase().replace(/\s+/g, '-');
  const allPanels = document.querySelectorAll(`#right-panel-${listId}-${task._id}, #right-panel-${listId}`);
  let panel = null;
  
  allPanels.forEach(p => {
    const currentId = p.dataset.currentTaskId;
    if (!panel && currentId === task._id) {
      panel = p;
    }
  });
  if (!panel) return;
  
  if (!panel) {
    console.warn('⚠️ Panel not found for blur:', task.title);
    return;
  }

  // ✅ fallback: use .task-blur-content if available, else entire panel
  const blurContent = panel.querySelector('.task-blur-content') || panel;

  console.log('🔍 Applying blur to:', task.title, '| Completed:', task.completed);
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
applyBlurEffect(task.completed, task.list);


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
    applyBlurEffect(task.completed, task.list);

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
window.setupInitialBlurState = setupInitialBlurState;

document.addEventListener('DOMContentLoaded', () => {
  setupCheckboxBlurListeners();
});
