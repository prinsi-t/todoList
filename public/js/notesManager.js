document.addEventListener('DOMContentLoaded', () => {
  const notesTextarea = document.querySelector('textarea[placeholder="Insert your notes here"]');
  if (!notesTextarea) {
    console.error('Notes textarea not found');
    return;
  }

  // Load notes on page load
  const savedNotes = localStorage.getItem('globalNotes');
  if (savedNotes) {
    notesTextarea.value = savedNotes;
    console.log('Loaded notes from localStorage:', savedNotes);
  } else {
    console.log('No notes found in localStorage');
  }

  // Save notes on change
  notesTextarea.addEventListener('input', () => {
    localStorage.setItem('globalNotes', notesTextarea.value);
    console.log('Saved notes to localStorage:', notesTextarea.value);
  });
}); 