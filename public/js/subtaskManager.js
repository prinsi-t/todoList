// subtaskManager.js — backend-only version

function updateSubtaskElementUI(subtaskElement, completed) {
  const checkbox = subtaskElement.querySelector('.checkbox');
  const checkIcon = checkbox.querySelector('.fa-check');
  const textSpan = subtaskElement.querySelector('span');

  if (completed) {
    checkbox.classList.add('bg-blue-500', 'border-blue-500');
    checkIcon.style.display = '';
    textSpan.classList.add('line-through', 'text-gray-500');
    textSpan.classList.remove('text-gray-200');
  } else {
    checkbox.classList.remove('bg-blue-500', 'border-blue-500');
    checkIcon.style.display = 'none';
    textSpan.classList.remove('line-through', 'text-gray-500');
    textSpan.classList.add('text-gray-200');
  }

  subtaskElement.dataset.completed = completed ? 'true' : 'false';
}

function createSubtaskElement(text, id, completed = false) {
  const subtask = {
    id: id || `subtask_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    text: text || 'New subtask',
    completed: !!completed
  };

  const el = document.createElement('div');
  el.className = 'flex items-center gap-2 bg-dark-hover px-3 py-2 rounded-lg border border-dark-border';
  el.dataset.subtaskId = subtask.id;
  el.dataset.completed = subtask.completed;
  el.dataset.text = subtask.text;

  el.innerHTML = `
    <div class="checkbox w-5 h-5 border-2 border-dark-border rounded-full flex items-center justify-center transition-colors duration-200 cursor-pointer ${subtask.completed ? 'bg-blue-500 border-blue-500' : ''}">
      <i class="fas fa-check text-white text-xs" style="${subtask.completed ? '' : 'display: none;'}"></i>
    </div>
    <span class="text-sm flex-grow ${subtask.completed ? 'line-through text-gray-500' : 'text-gray-200'}">${subtask.text}</span>
    <button class="text-red-400 hover:text-red-500 text-xs delete-subtask"><i class="fas fa-trash"></i></button>
  `;

  el.querySelector('.checkbox').addEventListener('click', () => {
    const newCompleted = !(el.dataset.completed === 'true');
    updateSubtaskElementUI(el, newCompleted);
    toggleSubtaskComplete(window.currentTaskId, subtask.id, newCompleted);
  });

  attachDeleteListener(el);

  return el;
}

function attachDeleteListener(el) {
  const btn = el.querySelector('.delete-subtask');
  const taskId = window.currentTaskId;
  const subtaskId = el.dataset.subtaskId;

  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);

  newBtn.addEventListener('click', () => {
    fetch(`/todos/${taskId}/subtasks`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subtaskId })
    })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(() => {
        el.remove();

        // ✅ Check if no more subtasks remain
        const panel = document.querySelector('.right-panel:not([data-template])');
        const container = panel?.querySelector('#subtasksList');

        if (container && container.querySelectorAll('[data-subtask-id]').length === 0) {
          showNoSubtasksMessage(container, true);
        }
      })
      .catch(console.error);
  });
}


function toggleSubtaskComplete(taskId, subtaskId, completed) {
  const task = localTaskCache.find(t => t._id === taskId);
  if (!task || !Array.isArray(task.subtasks)) return;

  const subtaskIndex = task.subtasks.findIndex(s => s.id === subtaskId);
  if (subtaskIndex === -1) return;

  task.subtasks[subtaskIndex].completed = completed;

  fetch(`/todos/${taskId}/subtasks/${subtaskIndex}/complete`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ index: subtaskIndex, completed })
  }).catch(console.error);
}

function addSubtask(taskId, text) {
  const newSubtask = {
    id: `subtask_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    text: text.trim(),
    title: text.trim(),
    completed: false
  };

  fetch(`/todos/${taskId}/subtasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newSubtask)
  })
    .then(res => {
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      return res.json();
    })
    .then(updatedTask => {
      console.log('🌐 Server confirmed subtask add:', updatedTask);

      const index = localTaskCache.findIndex(t => t._id === taskId);
      if (index !== -1) {
        localTaskCache[index] = updatedTask;
      } else {
        localTaskCache.push(updatedTask);
      }

      window.currentTaskId = taskId;

      // ✅ This line updates your UI properly
      loadSubtasks(updatedTask.subtasks);
    })
    .catch(err => {
      console.error('❌ Subtask add failed:', err);
    });
}



function loadSubtasks(subtasks) {
  // ✅ Get only the active (visible) right panel
  const panel = document.querySelector('.right-panel:not([data-template])');
  if (!panel) return;

  const container = panel.querySelector('#subtasksList');
  if (!container) return;

  container.innerHTML = '';

  if (!Array.isArray(subtasks) || subtasks.length === 0) {
    showNoSubtasksMessage(container);
    return;
  }

  subtasks.forEach(st => {
    const el = createSubtaskElement(st.text, st.id, st.completed);
    container.appendChild(el);
  });
}


function showNoSubtasksMessage(container, animated = false) {
  const msg = document.createElement('div');
  msg.className = 'no-subtasks-message text-gray-500 mt-2';

  msg.textContent = 'No subtasks added yet.';

  if (animated) {
    msg.classList.add('opacity-0', 'scale-95', 'transition-all', 'duration-500');
    container.appendChild(msg);

    requestAnimationFrame(() => {
      msg.classList.remove('opacity-0', 'scale-95');
      msg.classList.add('opacity-100', 'scale-100');
    });
  } else {
    container.appendChild(msg);
  }
}




document.addEventListener('taskSelected', e => {
  const taskId = e.detail.taskId;
  window.currentTaskId = taskId;

  const task = localTaskCache.find(t => t._id === taskId);
  if (task) {
    loadSubtasks(task.subtasks);
  }
});

document.addEventListener('click', function (e) {
  if (e.target.classList.contains('add-subtask-btn')) {
    const panel = e.target.closest('.right-panel');
    const input = panel?.querySelector('.subtask-input');
    const text = input?.value?.trim();
    const taskId = panel?.getAttribute('data-current-task-id');

    if (taskId && text) {
      addSubtask(taskId, text);
      input.value = '';
    }
  }
});

document.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && e.target.classList.contains('subtask-input')) {
    const input = e.target;
    const panel = input.closest('.right-panel');
    const text = input.value.trim();
    const taskId = panel?.getAttribute('data-current-task-id');

    if (taskId && text) {
      addSubtask(taskId, text);
      input.value = '';
    }
  }
});
