// blurManager.js

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

  // Try both static and dynamic panel IDs
  const panel = document.querySelector(`#right-panel-${listId}, #right-panel-${listId}-${task._id}`);
  if (!panel) return;

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
  saveTaskCacheToLocalStorage();
  applyBlurEffect(task.completed, task.list);

  // Update checkbox in list
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

function setupInitialBlurState() {
  const currentTaskId = localStorage.getItem('selectedTaskId');
  const task = localTaskCache.find(t => t._id === currentTaskId);
  if (!task) return;

  applyBlurEffect(task.completed, task.list);

  const listId = task.list.toLowerCase().replace(/\s+/g, '-');
  const panel = document.querySelector(`#right-panel-${listId}, #right-panel-${listId}-${task._id}`);
  if (!panel) return;

  const completeBtn = panel.querySelector('.complete-btn');
  if (!completeBtn) return;

  completeBtn.textContent = task.completed ? 'Mark as Incomplete' : 'Mark as Complete';
  completeBtn.className = task.completed
    ? 'complete-btn bg-green-500 text-white px-4 py-2 rounded-md'
    : 'complete-btn bg-blue-500 text-white px-4 py-2 rounded-md';
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

    // Update checkbox visual
    if (task.completed) {
      checkbox.classList.add('checked');
      checkbox.innerHTML = '<i class="fas fa-check text-white text-xs"></i>';
    } else {
      checkbox.classList.remove('checked');
      checkbox.innerHTML = '';
    }

    // Update task text style
    const textEl = taskItem.querySelector('span');
    if (textEl) {
      textEl.className = task.completed
        ? 'line-through text-gray-500 flex-grow text-sm'
        : 'text-gray-200 flex-grow text-sm';
    }

    // Update button + blur in panel if selected
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
  setupInitialBlurState();
});
