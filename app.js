// Camera setup
const video = document.getElementById('camera');
const canvas = document.getElementById('snapshot');
const captureBtn = document.getElementById('capture');
const form = document.getElementById('detailsForm');
const entriesDiv = document.getElementById('entries');
const switchBtn = document.getElementById('switchCamera');

let currentStream;
//camera switching functionality
function startCamera(facingMode = 'environment') {
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
  }

  navigator.mediaDevices.getUserMedia({
    video: { facingMode }
  }).then(stream => {
    currentStream = stream;
    video.srcObject = stream;
    cameraLabel.textContent = `Active Camera: ${facingMode === 'user' ? 'Front' : 'Rear'}`;
  }).catch(err => {
    console.error("Camera error:", err);
  });
}

// Toggle between front and rear
let usingFrontCamera = false;
switchBtn.onclick = () => {
  usingFrontCamera = !usingFrontCamera;
  startCamera(usingFrontCamera ? 'user' : 'environment');
};

//end camera switching

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

  const entry = {
    email,
    notes,
    image: imageData,
    timestamp: new Date().toISOString()
  };

  // 🔄 Export to JSON before saving
  const jsonString = JSON.stringify(entry, null, 2);
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '_');
  const filename = `badge_entry_${timestamp}.json`;

  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  // ✅ Save to IndexedDB
  const tx = db.transaction("entries", "readwrite");
  const store = tx.objectStore("entries");
  store.add(entry);

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


function loadEntries() {
  const tx = db.transaction("entries", "readonly");
  const store = tx.objectStore("entries");
  const request = store.getAll();

  request.onsuccess = function () {
    const entries = request.result;
    entriesDiv.innerHTML = '';

    entries.forEach(entry => {
      const entryDiv = document.createElement('div');
      entryDiv.classList.add('entry');

      entryDiv.innerHTML = `
        ${entry.image}
        <p><strong>Email:</strong> ${entry.email}</p>
        <p><strong>Notes:</strong> ${entry.notes}</p>
        <p><strong>Captured:</strong> ${entry.timestamp || 'Unknown'}</p>
      `;

      entriesDiv.appendChild(entryDiv);
    });
  }
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

//depracations
//export to CSV - depracated
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

  
   let now = new Date();
   let timestamp = now.toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '_');

    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `badge_entries_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
}

//export to JSON - depracated
function exportToJSON(data) {
  const jsonString = JSON.stringify(data, null, 2);

  // Generate timestamp
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '_');
  const filename = `badge_entries_${timestamp}.json`;

  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link); // Required for Firefox
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
