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
  captureBtn.style.backgroundColor = '#28a745'; // Bootstrap green
  captureBtn.textContent = 'Badge Captured';

};

// Save form data
form.onsubmit = function (e) {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const notes = document.getElementById('notes').value;

  const tx = db.transaction("entries", "readwrite");
  const store = tx.objectStore("entries");
  store.add({ email, notes, image: imageData });
  exportToCSV();
  form.reset();
  imageData = null;
  loadEntries();

  
  // Reset capture button
  captureBtn.style.backgroundColor = '#007bff';
  captureBtn.textContent = 'Capture Badge';

};

// Service Worker Registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .then(reg => console.log('Service Worker registered:', reg.scope))
    .catch(err => console.error('Service Worker registration failed:', err));
}

function exportToCSV(data) {
  const csvRows = [
    ['Email', 'Notes', 'Image'],
    ...data.map(entry => [entry.email, entry.notes, entry.image])
  ];

  const csvContent = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

  // Generate timestamp
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '_');
  const filename = `badge_entries_${timestamp}.csv`;

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link); // Required for Firefox
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const resetBtn = document.getElementById('reset');

resetBtn.onclick = () => {
  const tx = db.transaction("entries", "readwrite");
  const store = tx.objectStore("entries");
  const clearRequest = store.clear();

  clearRequest.onsuccess = () => {
    entriesDiv.innerHTML = '';
    alert("All data has been cleared.");
  };

  clearRequest.onerror = () => {
    alert("Failed to clear data.");
  };
};
