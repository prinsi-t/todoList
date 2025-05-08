async function handleAddTask(e) {
  e.preventDefault();
  const input = document.getElementById('newTaskInput');
  if (!input) {
    console.error('Could not find newTaskInput element');
    return;
  }
  
  const title = input.value.trim();
  if (!title) {
    console.error('Task title is empty');
    return;
  }

  const currentList = document.querySelector('h1').textContent.replace(' tasks', '');
  
  const newTask = {
    _id: 'local_' + Date.now(),
    title,
    list: currentList,
    completed: false,
    subtasks: [],
    attachments: []
  };

  if (typeof window.localTaskCache === 'undefined') {
    window.localTaskCache = [];
  }

  localTaskCache.push(newTask);
  saveTaskCacheToLocalStorage();
  
  const taskElement = createTaskElement(newTask);
  const taskList = document.getElementById('taskList');
  if (taskList) {
    taskList.insertAdjacentElement('afterbegin', taskElement);
    updateTaskCount(currentList, 1);
  }
  
  input.value = '';

  try {
    const response = await fetch('/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, list: currentList, completed: false })
    });
    
    if (response.ok) {
      const serverTask = await response.json();
 
      const taskIndex = localTaskCache.findIndex(t => t._id === newTask._id);
      if (taskIndex !== -1) {
        localTaskCache[taskIndex] = serverTask;
        saveTaskCacheToLocalStorage();
       
        if (taskElement) {
          taskElement.dataset.taskId = serverTask._id;
        }
      }
    } else {
      console.error('Failed to save task to server:', response.status);
    }
  } catch (error) {
    console.error('Error syncing task with server:', error);
  }
}

function updateTaskCount(listName, delta) {
  if (!listName) {
    console.error('No list name provided to updateTaskCount');
    return;
  }
  
  const listSelector = listName.toLowerCase().replace(/\s+/g, '-');
  const countElement = document.getElementById(`count-${listSelector}`);
  
  console.log(`Updating count for ${listName} (selector: count-${listSelector}) by ${delta}`);
  
  if (countElement) {
    let count = parseInt(countElement.textContent) || 0;
    count = Math.max(0, count + delta); 
    countElement.textContent = count;
    console.log(`Updated count for ${listName} to ${count}`);
  } else {
    console.warn(`Count element for "${listName}" not found with selector: count-${listSelector}`);
  }
  
  const allTasksCount = document.getElementById('allTasksCount');
  if (allTasksCount) {
    let total = parseInt(allTasksCount.textContent) || 0;
    total = Math.max(0, total + delta);
    allTasksCount.textContent = total;
    console.log(`Updated total tasks count to ${total}`);
  }
}

function moveTaskToList(taskId, newList) {
  const isLocalId = taskId.startsWith('local_');
  
  const taskIndex = localTaskCache.findIndex(task => task._id === taskId);
  if (taskIndex === -1) {
    console.error(`Task with ID ${taskId} not found in local cache`);
    return;
  }

  const oldList = localTaskCache[taskIndex].list;
  if (oldList === newList) {
    console.log(`Task is already in ${newList} list`);
    return;
  }
  
  console.log(`Moving task ${taskId} from ${oldList} to ${newList}`);
  
  localTaskCache[taskIndex].list = newList;
  saveTaskCacheToLocalStorage();
  
  updateTaskCount(oldList, -1);
  updateTaskCount(newList, 1);
  
  if (isLocalId) {
    console.log('Task has not been synced to server yet, skipping server update');
    const currentList = document.querySelector('h1').textContent.replace(' tasks', '');
    if (typeof filterTasks === 'function') {
      filterTasks(currentList);
    }
    return;
  }

  fetch(`/todos/${taskId}/move`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ list: newList })
  })
    .then(res => {
      if (!res.ok) {
        console.error(`Server error when moving task: ${res.status}`);
        return;
      }
      return res.json();
    })
    .then(() => {
      const currentList = document.querySelector('h1').textContent.replace(' tasks', '');
      if (typeof filterTasks === 'function') {
        filterTasks(currentList);
      }
    })
    .catch(error => console.error('Error moving task:', error));
}

function saveTaskCacheToLocalStorage() {
  try {
    localStorage.setItem('taskCache', JSON.stringify(localTaskCache));
    console.log('Tasks saved to localStorage cache');
  } catch (error) {
    console.error('Error saving tasks to localStorage:', error);
  }
}

window.moveTaskToList = moveTaskToList;
window.handleAddTask = handleAddTask;
window.saveTaskCacheToLocalStorage = saveTaskCacheToLocalStorage;
window.updateTaskCount = updateTaskCount;