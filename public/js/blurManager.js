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
  
  function toggleBlurFromCompleteBtn() {
    const completeBtn = document.getElementById('complete-btn');
    if (!completeBtn) return;
  
    const currentTaskId = localStorage.getItem('selectedTaskId');
    const task = localTaskCache.find(t => t._id === currentTaskId);
    if (!task) return;
  
    task.completed = !task.completed;
    saveTaskCacheToLocalStorage();
    applyBlurEffect(task.completed, task.list);
  
    completeBtn.textContent = task.completed ? 'Mark as Incomplete' : 'Mark as Complete';
    completeBtn.className = task.completed
      ? 'bg-green-500 text-white px-4 py-2 rounded-md'
      : 'bg-blue-500 text-white px-4 py-2 rounded-md';
  
    const panel = document.getElementById(`right-panel-${task.list.toLowerCase().replace(/\s+/g, '-')}`);
    if (panel) {
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
    }
  }
  
  function setupInitialBlurState() {
    const currentTaskId = localStorage.getItem('selectedTaskId');
    const task = localTaskCache.find(t => t._id === currentTaskId);
    if (!task) return;
  
    const completeBtn = document.getElementById('complete-btn');
    if (!completeBtn) return;
  
    if (task.completed) {
      applyBlurEffect(true, task.list);
      completeBtn.textContent = 'Mark as Incomplete';
      completeBtn.className = 'bg-green-500 text-white px-4 py-2 rounded-md';
    } else {
      applyBlurEffect(false, task.list);
      completeBtn.textContent = 'Mark as Complete';
      completeBtn.className = 'bg-blue-500 text-white px-4 py-2 rounded-md';
    }
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
  
      const panel = document.getElementById(`right-panel-${task.list.toLowerCase().replace(/\s+/g, '-')}`);
      if (panel) {
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
  