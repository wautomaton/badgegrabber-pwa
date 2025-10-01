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
  exportToCSV();
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

function exportToCSV() {
  const tx = db.transaction("entries", "readonly");
  const store = tx.objectStore("entries");
  const request = store.getAll();

  request.onsuccess = function () {
    const entries = request.result;
    let csvContent = "data:text/csv;charset=utf-8,Email,Notes,Image\n";

    entries.forEach(entry => {
      const email = entry.email.replace(/"/g, '""');
      const notes = entry.notes.replace(/"/g, '""');
      const image = entry.image.replace(/"/g, '""');
      csvContent += `"${email}","${notes}","${image}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "badge_entries.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
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
