function updateSubtaskCompletionStatus(subtaskId, completed) {
  if (!window.currentTaskId) {
    const localSubtasks = JSON.parse(localStorage.getItem('localSubtasks') || '[]');
    const subtaskIndex = localSubtasks.findIndex(s => s.id === subtaskId);
    if (subtaskIndex !== -1) {
      localSubtasks[subtaskIndex].completed = completed;
      localStorage.setItem('localSubtasks', JSON.stringify(localSubtasks));
    }
    return;
  }
  
  const taskIndex = localTaskCache.findIndex(task => task._id === window.currentTaskId);
  if (taskIndex === -1 || !localTaskCache[taskIndex].subtasks) return;

  const subtaskIndex = localTaskCache[taskIndex].subtasks.findIndex(
    s => s.id === subtaskId || s.id === subtaskId.replace('index_', '') || `index_${s.id}` === subtaskId
  );
  
  if (subtaskIndex !== -1) {
    localTaskCache[taskIndex].subtasks[subtaskIndex].completed = completed;
    saveTaskCacheToLocalStorage();
    
    const subtaskElement = document.querySelector(`[data-subtask-id="${subtaskId}"]`);
    if (subtaskElement) {
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
    
    const taskSubtasksKey = `subtasks_${window.currentTaskId}`;
    let taskSubtasks = JSON.parse(localStorage.getItem(taskSubtasksKey) || '[]');
    const localSubtaskIndex = taskSubtasks.findIndex(s => s.id === subtaskId);
    
    if (localSubtaskIndex !== -1) {
      taskSubtasks[localSubtaskIndex].completed = completed;
    } else {
      const subtask = localTaskCache[taskIndex].subtasks[subtaskIndex];
      taskSubtasks.push({
        id: subtaskId,
        text: subtask.text,
        completed: completed
      });
    }
    
    localStorage.setItem(taskSubtasksKey, JSON.stringify(taskSubtasks));
    
    fetch(`/todos/${window.currentTaskId}/subtasks/${subtaskIndex}/complete`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index: subtaskIndex, completed })
    })
      .then(res => res.ok ? res.json() : null)
      .then(updatedTask => {
        if (updatedTask) {
          if (updatedTask.subtasks && updatedTask.subtasks.length > subtaskIndex) {
            updatedTask.subtasks[subtaskIndex].completed = completed;
          }
          localTaskCache[taskIndex] = updatedTask;
          saveTaskCacheToLocalStorage();
          
          updateTaskSubtasksInLocalStorage(updatedTask);
        }
      })
      .catch(err => {
        console.error('Error updating subtask completion:', err);
      });
  }
}

function createSubtaskElement(text, subtaskId, isCompleted = false) {
    let completed = isCompleted;
  
    if (window.currentTaskId) {
      const task = localTaskCache.find(t => t._id === window.currentTaskId);
      if (task && task.subtasks) {
        const sub = task.subtasks.find(s =>
          s.id === subtaskId || `index_${s.id}` === subtaskId || s.text === text
        );
        if (sub && typeof sub.completed === 'boolean') {
          completed = sub.completed;
        }
      }
    }
  
    const subtaskItem = document.createElement('div');
    subtaskItem.className = 'flex items-center gap-2 bg-dark-hover px-3 py-2 rounded-lg border border-dark-border';
    subtaskItem.dataset.subtaskId = subtaskId;
    subtaskItem.dataset.completed = completed ? 'true' : 'false';
  
    subtaskItem.innerHTML = `
      <div class="checkbox w-5 h-5 border-2 border-dark-border rounded-full flex items-center justify-center transition-colors duration-200 cursor-pointer ${completed ? 'bg-blue-500 border-blue-500' : ''}">
        <i class="fas fa-check text-white text-xs" style="${completed ? '' : 'display: none;'}"></i>
      </div>
      <span class="text-sm flex-grow ${completed ? 'line-through text-gray-500' : 'text-gray-200'}">${text}</span>
      <button class="text-red-400 hover:text-red-500 text-xs delete-subtask">
        <i class="fas fa-trash"></i>
      </button>
    `;
  

  const checkbox = subtaskItem.querySelector('.checkbox');
  const checkIcon = checkbox.querySelector('.fa-check');
  const textSpan = subtaskItem.querySelector('span');

  checkbox.addEventListener('click', () => {
    const currentState = subtaskItem.dataset.completed === 'true';
    const newState = !currentState;
    
    subtaskItem.dataset.completed = newState ? 'true' : 'false';
    
    if (newState) {
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
    
    updateSubtaskCompletionStatus(subtaskId, newState);
  });

  subtaskItem.querySelector('.delete-subtask').addEventListener('click', () => {
    deleteSubtask(subtaskId);
    subtaskItem.remove();

    const subtasksList = document.getElementById('subtasksList');
    if (subtasksList && subtasksList.children.length === 0) {
      showNoSubtasksMessage();
    }
  });

  return subtaskItem;
}

function addSubtask() {
  const subtaskInput = document.getElementById('subtaskInput');
  const subtaskText = subtaskInput.value.trim();
  
  if (!subtaskText) return;
  const subtaskId = 'subtask_' + Date.now();

  const newSubtask = {
    id: subtaskId,
    text: subtaskText,
    completed: false
  };

  const subtasksList = document.getElementById('subtasksList');
  if (!subtasksList) return;
  hideNoSubtasksMessage();
  
  const subtaskElement = createSubtaskElement(subtaskText, subtaskId, false);
  subtasksList.appendChild(subtaskElement);

  subtaskInput.value = '';
 
  if (window.currentTaskId) {
    const taskIndex = localTaskCache.findIndex(task => task._id === window.currentTaskId);
    
    if (taskIndex !== -1) {
      if (!localTaskCache[taskIndex].subtasks) {
        localTaskCache[taskIndex].subtasks = [];
      }
      
      localTaskCache[taskIndex].subtasks.push(newSubtask);
      saveTaskCacheToLocalStorage();
      
      const taskSubtasksKey = `subtasks_${window.currentTaskId}`;
      let taskSubtasks = JSON.parse(localStorage.getItem(taskSubtasksKey) || '[]');
      taskSubtasks.push(newSubtask);
      localStorage.setItem(taskSubtasksKey, JSON.stringify(taskSubtasks));
      
      const currentSubtasks = JSON.parse(JSON.stringify(localTaskCache[taskIndex].subtasks));
      
      fetch(`/todos/${window.currentTaskId}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: subtaskText })
      })
        .then(res => res.ok ? res.json() : null)
        .then(updatedTodo => {
          if (updatedTodo) {
            const subtaskMap = {};
            currentSubtasks.forEach(subtask => {
              if (subtask.text) subtaskMap[subtask.text] = subtask;
              if (subtask.id) subtaskMap[subtask.id] = subtask;
            });
            
            const updatedTaskCopy = {...updatedTodo};
            
            if (!updatedTaskCopy.subtasks) {
              updatedTaskCopy.subtasks = [];
            }
            
            updatedTaskCopy.subtasks.forEach(serverSubtask => {
              let localSubtask = serverSubtask.text ? subtaskMap[serverSubtask.text] : null;
              
              if (!localSubtask && serverSubtask.id) {
                localSubtask = subtaskMap[serverSubtask.id];
              }
              
              if (localSubtask) {
                serverSubtask.completed = localSubtask.completed;
                
                if (!serverSubtask.id && localSubtask.id) {
                  serverSubtask.id = localSubtask.id;
                }
              }
            });
            
            const hasNewSubtask = updatedTaskCopy.subtasks.some(
              s => s.text === newSubtask.text || s.id === newSubtask.id
            );
            
            if (!hasNewSubtask) {
              updatedTaskCopy.subtasks.push(newSubtask);
            }
            
            localTaskCache[taskIndex] = updatedTaskCopy;
            saveTaskCacheToLocalStorage();
            
            updateTaskSubtasksInLocalStorage(updatedTaskCopy);
          }
        })
        .catch(error => console.error('Error adding subtask:', error));
    }
  } else {
    const localSubtasks = JSON.parse(localStorage.getItem('localSubtasks') || '[]');
    localSubtasks.push(newSubtask);
    localStorage.setItem('localSubtasks', JSON.stringify(localSubtasks));
  }
}

function updateTaskSubtasksInLocalStorage(task) {
  if (!task || !task._id || !task.subtasks) return;
  
  const taskSubtasksKey = `subtasks_${task._id}`;
  const subtasksToStore = task.subtasks.map(subtask => {
    return {
      id: subtask.id || `index_${subtask._id || Date.now()}`,
      text: subtask.text,
      completed: subtask.completed || false
    };
  });
  
  localStorage.setItem(taskSubtasksKey, JSON.stringify(subtasksToStore));
}

function loadSubtasksForCurrentTask() {
  const subtasksList = document.getElementById('subtasksList');
  if (!subtasksList || !window.currentTaskId) return;
  
  subtasksList.innerHTML = '';
  
  const taskSubtasksKey = `subtasks_${window.currentTaskId}`;
  const taskSpecificSubtasks = JSON.parse(localStorage.getItem(taskSubtasksKey) || '[]');
  
  if (taskSpecificSubtasks.length > 0) {
    hideNoSubtasksMessage();
    taskSpecificSubtasks.forEach(subtask => {
      if (subtask && subtask.text) {
        const subtaskElement = createSubtaskElement(
          subtask.text,
          subtask.id,
          subtask.completed || false
        );
        subtasksList.appendChild(subtaskElement);
      }
    });
  } else {
    const taskIndex = localTaskCache.findIndex(task => task._id === window.currentTaskId);
    if (taskIndex !== -1 && localTaskCache[taskIndex].subtasks && localTaskCache[taskIndex].subtasks.length > 0) {
      hideNoSubtasksMessage();
      updateTaskSubtasksInLocalStorage(localTaskCache[taskIndex]);
      
      localTaskCache[taskIndex].subtasks.forEach(subtask => {
        if (subtask && subtask.text) {
          const subtaskElement = createSubtaskElement(
            subtask.text,
            subtask.id || `index_${subtask._id || Date.now()}`,
            subtask.completed || false
          );
          subtasksList.appendChild(subtaskElement);
        }
      });
    } else {
      showNoSubtasksMessage();
      fetchTaskFromServer(window.currentTaskId);
    }
  }
}

function fetchTaskFromServer(taskId) {
  if (!taskId) return;
  
  fetch(`/todos/${taskId}`)
    .then(res => res.ok ? res.json() : null)
    .then(task => {
      if (task) {
        const existingIndex = localTaskCache.findIndex(t => t._id === task._id);
        if (existingIndex !== -1) {
          localTaskCache[existingIndex] = task;
        } else {
          localTaskCache.push(task);
        }
        saveTaskCacheToLocalStorage();
        
        updateTaskSubtasksInLocalStorage(task);
        
        loadSubtasksForCurrentTask();
      }
    })
    .catch(error => console.error('Error fetching task:', error));
}

function loadLocalSubtasks() {
  const subtasksList = document.getElementById('subtasksList');
  if (!subtasksList) return;
  
  if (window.currentTaskId) {
    loadSubtasksForCurrentTask();
    return;
  }
  
  subtasksList.innerHTML = '';
  
  const localSubtasks = JSON.parse(localStorage.getItem('localSubtasks') || '[]');
  if (localSubtasks.length > 0) {
    hideNoSubtasksMessage();
    localSubtasks.forEach(subtask => {
      const subtaskElement = createSubtaskElement(
        subtask.text, 
        subtask.id, 
        subtask.completed || false
      );
      subtasksList.appendChild(subtaskElement);
    });
  } else {
    showNoSubtasksMessage();
  }
}

function showNoSubtasksMessage() {
  const subtasksList = document.getElementById('subtasksList');
  if (!subtasksList) return;
  
  const existingMessage = subtasksList.querySelector('.no-subtasks-message');
  if (existingMessage) return; 

  const noSubtasksMessage = document.createElement('div');
  noSubtasksMessage.className = 'no-subtasks-message text-gray-500 mt-2';
  noSubtasksMessage.textContent = 'No subtasks added yet.';
  subtasksList.appendChild(noSubtasksMessage);
}

function hideNoSubtasksMessage() {
  const noSubtasksMessages = document.querySelectorAll('.no-subtasks-message');
  noSubtasksMessages.forEach(msg => {
    msg.remove();
  });
}

function deleteSubtask(subtaskId) {
  if (window.currentTaskId) {
    const taskIndex = localTaskCache.findIndex(task => task._id === window.currentTaskId);
    if (taskIndex !== -1 && localTaskCache[taskIndex].subtasks) {
     
      const subtaskIndex = localTaskCache[taskIndex].subtasks.findIndex(s => 
        s.id === subtaskId || s.id === subtaskId.replace('index_', '') || `index_${s.id}` === subtaskId
      );
      
      if (subtaskIndex !== -1) {
        localTaskCache[taskIndex].subtasks.splice(subtaskIndex, 1);
        saveTaskCacheToLocalStorage();
        
        const taskSubtasksKey = `subtasks_${window.currentTaskId}`;
        let taskSubtasks = JSON.parse(localStorage.getItem(taskSubtasksKey) || '[]');
        taskSubtasks = taskSubtasks.filter(s => 
          s.id !== subtaskId && s.id !== subtaskId.replace('index_', '') && `index_${s.id}` !== subtaskId
        );
        localStorage.setItem(taskSubtasksKey, JSON.stringify(taskSubtasks));
        
        if (localTaskCache[taskIndex].subtasks.length === 0 || taskSubtasks.length === 0) {
          showNoSubtasksMessage();
        }
        
        fetch(`/todos/${window.currentTaskId}/subtasks/${subtaskIndex}`, { method: 'DELETE' })
          .then(res => {
            if (res.ok) return res.json();
            return null;
          })
          .then(updatedTodo => {
            if (updatedTodo && taskIndex !== -1) {
              localTaskCache[taskIndex] = updatedTodo;
              saveTaskCacheToLocalStorage();
              
              updateTaskSubtasksInLocalStorage(updatedTodo);
              
              if (!updatedTodo.subtasks || updatedTodo.subtasks.length === 0) {
                showNoSubtasksMessage();
              }
            }
          })
          .catch(error => console.error('Error deleting subtask:', error));
      }
    }
  } else {
    const localSubtasks = JSON.parse(localStorage.getItem('localSubtasks') || '[]');
    const updatedSubtasks = localSubtasks.filter(s => s.id !== subtaskId);
    localStorage.setItem('localSubtasks', JSON.stringify(updatedSubtasks));
    
    if (updatedSubtasks.length === 0) {
      showNoSubtasksMessage();
    }
  }
}

document.addEventListener('taskSelected', function(e) {
  if (e.detail && e.detail.taskId) {
    window.currentTaskId = e.detail.taskId;
    loadSubtasksForCurrentTask();
  }
});

function initSubtaskManager() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadLocalSubtasks);
  } else {
    loadLocalSubtasks();
  }

  const subtaskForm = document.getElementById('subtaskForm');
  if (subtaskForm) {
    subtaskForm.addEventListener('submit', function(e) {
      e.preventDefault();
      addSubtask();
    });
  }
  
  const addSubtaskBtn = document.getElementById('addSubtaskBtn');
  if (addSubtaskBtn) {
    addSubtaskBtn.addEventListener('click', function() {
      addSubtask();
    });
  }
}

initSubtaskManager();