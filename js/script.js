let notes = [];
let editingNoteId = null;
let deletingNoteId = null;
const currentUrl = window.location.href;
const localStorageDataPath = currentUrl + '/quick-notes';
const localStorageThemePath = currentUrl + '/theme';

function loadNotes() {
	const savedNotes = localStorage.getItem(localStorageDataPath);
	return savedNotes ? JSON.parse(savedNotes) : [];
}

function saveNote(event) {
	event.preventDefault();

	const title = document.getElementById('noteTitle').value.trim();
	const content = document.getElementById('noteContent').value.trim();

	if (editingNoteId) {
		// Update existing Note

		const noteIndex = notes.findIndex(note => note.id === editingNoteId);
		notes[noteIndex] = {
			...notes[noteIndex],
			title: title,
			content: content,
		};

		closeNoteDialog();
		saveNotes();
		updateNoteCardDOM(editingNoteId);
		requestMasonryLayout();
		return;
	} else {
		// Add New Note
		notes.unshift({
			id: generateId(),
			title: title,
			content: content,
		});
	}

	closeNoteDialog();
	saveNotes();
	renderNotes();
}

function updateNoteCardDOM(noteId) {
	const note = notes.find(n => n.id === noteId);
	if (!note) return;

	const card = document.querySelector(`.note-card[data-note-id="${noteId}"]`);
	if (!card) return;

	const titleEl = card.querySelector('.note-title');
	const contentEl = card.querySelector('.note-content');

	if (titleEl) titleEl.textContent = note.title;
	if (contentEl) contentEl.textContent = note.content;
}

function generateId() {
	return Date.now().toString();
}

function saveNotes() {
	localStorage.setItem(localStorageDataPath, JSON.stringify(notes));
}

function deleteNote(noteId) {
	deletingNoteId = noteId;
	openDeleteDialog(noteId);
}

function performDeleteNote(noteId) {
	notes = notes.filter(note => note.id != noteId);
	saveNotes();
	renderNotes();
}

let masonryRaf = null;
function requestMasonryLayout() {
	if (masonryRaf) cancelAnimationFrame(masonryRaf);
	masonryRaf = requestAnimationFrame(() => {
		layoutNotesMasonry();
		// One more pass after layout settles (fonts, etc.)
		requestAnimationFrame(layoutNotesMasonry);
	});
}

function layoutNotesMasonry() {
	const container = document.getElementById('notesContainer');
	if (!container) return;
	if (container.classList.contains('is-empty')) return;

	const cards = Array.from(container.querySelectorAll('.note-card'));
	if (cards.length === 0) return;

	const containerWidth = container.clientWidth;
	const gap = 24; // px
	const minColWidth = 300; // px

	const colCount = Math.max(
		1,
		Math.floor((containerWidth + gap) / (minColWidth + gap)),
	);
	const colWidth = Math.floor(
		(containerWidth - gap * (colCount - 1)) / colCount,
	);

	const colHeights = new Array(colCount).fill(0);

	cards.forEach((card, index) => {
		const col = index % colCount; // left-to-right order
		const x = col * (colWidth + gap);
		const y = colHeights[col];

		card.style.width = `${colWidth}px`;
		card.style.transform = '';
		card.style.left = `${x}px`;
		card.style.top = `${y}px`;

		// Measure after setting width
		const h = card.offsetHeight;
		colHeights[col] = y + h + gap;
	});

	// Keep a little breathing room so cards never overlap footer
	container.style.height = `${Math.max(...colHeights)}px`;
}

function openDeleteDialog(noteId) {
	const dialog = document.getElementById('confirmDeleteDialog');
	const confirmBtn = document.getElementById('confirmDeleteBtn');

	confirmBtn.onclick = () => {
		if (!deletingNoteId) return;
		performDeleteNote(deletingNoteId);
		closeDeleteDialog();
	};

	dialog.showModal();
	confirmBtn.focus();
}

function closeDeleteDialog() {
	deletingNoteId = null;
	document.getElementById('confirmDeleteDialog').close();
}

function renderNotes() {
	const notesContainer = document.getElementById('notesContainer');

	if (notes.length === 0) {
		notesContainer.classList.add('is-empty');
		notesContainer.style.height = '';
		// show some fall back elements
		notesContainer.innerHTML = `
      <div class="empty-state">
        <h2>No notes yet</h2>
        <p>Create your first note to get started!</p>
      </div>
    `;
		return;
	}

	notesContainer.classList.remove('is-empty');
	notesContainer.innerHTML = notes
		.map(
			(note, index) => `
    <div class="note-card" data-note-id="${note.id}">
	 <div class="note-actions">
        <button class="edit-btn" onclick="openNoteDialog('${note.id}')" title="Edit Note">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil-icon lucide-pencil"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>
        </button>
        <button class="delete-btn" onclick="deleteNote('${note.id}')" title="Delete Note">
         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-icon lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
      <h3 class="note-title">${note.title}</h3>
      <p class="note-content">${note.content}</p>
    </div>
    `,
		)
		.join('');

	requestMasonryLayout();
}

function openNoteDialog(noteId = null) {
	const dialog = document.getElementById('noteDialog');
	const titleInput = document.getElementById('noteTitle');
	const contentInput = document.getElementById('noteContent');

	if (noteId) {
		// Edit Mode
		const noteToEdit = notes.find(note => note.id === noteId);
		editingNoteId = noteId;
		document.getElementById('dialogTitle').textContent = 'Edit Note';
		titleInput.value = noteToEdit.title;
		contentInput.value = noteToEdit.content;
	} else {
		// Add Mode
		editingNoteId = null;
		document.getElementById('dialogTitle').textContent = 'Add New Note';
		titleInput.value = '';
		contentInput.value = '';
	}

	dialog.showModal();
	titleInput.focus();
}

function closeNoteDialog() {
	document.getElementById('noteDialog').close();
}

function toggleTheme() {
	const isDark = document.body.classList.toggle('dark-theme');
	localStorage.setItem(localStorageThemePath, isDark ? 'dark' : 'light');
	document.getElementById('themeToggleBtn').innerHTML = isDark
		? '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sun-icon lucide-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>'
		: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-moon-icon lucide-moon"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/></svg>';
}

function applyStoredTheme() {
	if (localStorage.getItem(localStorageThemePath) === 'dark') {
		document.body.classList.add('dark-theme');
		document.getElementById('themeToggleBtn').innerHTML =
			'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sun-icon lucide-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>';
	}
}

document.addEventListener('DOMContentLoaded', function () {
	applyStoredTheme();
	notes = loadNotes();
	renderNotes();

	document.getElementById('noteForm').addEventListener('submit', saveNote);
	document
		.getElementById('themeToggleBtn')
		.addEventListener('click', toggleTheme);

	document
		.getElementById('noteDialog')
		.addEventListener('click', function (event) {
			if (event.target === this) {
				closeNoteDialog();
			}
		});

	document
		.getElementById('confirmDeleteDialog')
		.addEventListener('click', function (event) {
			if (event.target === this) {
				closeDeleteDialog();
			}
		});

	document
		.getElementById('confirmDeleteDialog')
		.addEventListener('close', function () {
			deletingNoteId = null;
		});

	let resizeT = null;
	window.addEventListener('resize', function () {
		if (resizeT) clearTimeout(resizeT);
		resizeT = setTimeout(requestMasonryLayout, 100);
	});
});
