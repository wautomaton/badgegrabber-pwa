// Camera setup
const video = document.getElementById('camera');
const canvas = document.getElementById('snapshot');
const captureBtn = document.getElementById('capture');
const form = document.getElementById('detailsForm');
const entriesDiv = document.getElementById('entries');

navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => video.srcObject = stream);

// IndexedDB setup
let db;
const request = indexedDB.open("BadgeDB", 1);

request.onupgradeneeded = function (e) {
  db = e.target.result;
  db.createObjectStore("entries", { keyPath: "id", autoIncrement: true });
};

request.onsuccess = function (e) {
  db = e.target.result;
  loadEntries();
};

function loadEntries() {
  const tx = db.transaction("entries", "readonly");
  const store = tx.objectStore("entries");
  const request = store.getAll();

  request.onsuccess = function () {
    entriesDiv.innerHTML = '';
    request.result.forEach(entry => {
      const div = document.createElement('div');
      div.innerHTML = `
        <img src="${entry.image}" />
        <p><strong>Email:</strong> ${entry.email}</p>
        <p><strong>Notes:</strong> ${entry.notes}</p>
      `;
      entriesDiv.appendChild(div);
    });
  };
}

// Capture image
let imageData = null;

captureBtn.onclick = () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  imageData = canvas.toDataURL('image/png');
};

// Save form data
form.onsubmit = function (e) {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const notes = document.getElementById('notes').value;

  const tx = db.transaction("entries", "readwrite");
  const store = tx.objectStore("entries");
  store.add({ email, notes, image: imageData });

  form.reset();
  imageData = null;
  loadEntries();
};

// Service Worker Registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .then(reg => console.log('Service Worker registered:', reg.scope))
    .catch(err => console.error('Service Worker registration failed:', err));
}