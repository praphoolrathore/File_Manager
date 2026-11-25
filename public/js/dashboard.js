/**
 * Dedicated Dashboard Page Script
 * Directly executes fetch() for listing, uploading, updating, downloading,
 * and deleting files without any separate api.js client.
 */

// 1. Session Guard: Validate login state immediately
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || 'null');

if (!token || !user) {
  window.location.href = '/login';
}

// 2. DOM Elements
const usernameDisplay = document.getElementById('username-display');
const logoutBtn = document.getElementById('logout-btn');
const globalAlert = document.getElementById('global-alert');

// Upload Form Elements
const uploadForm = document.getElementById('upload-form');
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const selectedFilePreview = document.getElementById('selected-file-preview');
const previewFilename = document.getElementById('preview-filename');
const previewFilesize = document.getElementById('preview-filesize');
const clearFileBtn = document.getElementById('clear-file-btn');
const uploadDisplayNameInput = document.getElementById('upload-display-name');
const uploadBtn = document.getElementById('upload-btn');
const uploadMessage = document.getElementById('upload-message');

// File List Elements
const refreshFilesBtn = document.getElementById('refresh-files-btn');
const filterSearch    = document.getElementById('filter-search');
const filterType      = document.getElementById('filter-type');
const filterSort      = document.getElementById('filter-sort');
const filterOrder     = document.getElementById('filter-order');
const fileListError = document.getElementById('file-list-error');
const fileListLoading = document.getElementById('file-list-loading');
const fileListEmpty = document.getElementById('file-list-empty');
const fileTableWrap = document.getElementById('file-table-wrap');
const fileTableBody = document.getElementById('file-table-body');

// Update Modal Elements
const updateModal = document.getElementById('update-modal');
const updateForm = document.getElementById('update-form');
const updateFileIdInput = document.getElementById('update-file-id');
const updateDisplayNameInput = document.getElementById('update-display-name');
const updateFileInput = document.getElementById('update-file-input');
const updateIconEl = document.getElementById('update-icon');
const updateCurrentNameEl = document.getElementById('update-current-name');
const updateCurrentMetaEl = document.getElementById('update-current-meta');
const updateMessageEl = document.getElementById('update-message');
const cancelUpdateBtn = document.getElementById('cancel-update-btn');
const closeUpdateModalBtn = document.getElementById('close-update-modal-btn');
const saveUpdateBtn = document.getElementById('save-update-btn');

// Delete Modal Elements
const deleteModal = document.getElementById('delete-modal');
const deleteModalMsg = document.getElementById('delete-modal-msg');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

// State
let selectedUploadFile = null;
let filePendingDelete = null;
let filePendingUpdate = null;

// Display username in header
if (usernameDisplay && user) {
  usernameDisplay.textContent = user.username;
}

// Logout handler
logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
});

/* ==========================================================================
   Helper Utilities
   ========================================================================== */

function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function getFileIcon(mimeType) {
  return '';
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showGlobalAlert(message, type = 'error', durationMs = 4000) {
  globalAlert.textContent = message;
  globalAlert.className = `alert ${type}`;
  globalAlert.classList.remove('hidden');

  if (durationMs) {
    setTimeout(() => {
      globalAlert.classList.add('hidden');
    }, durationMs);
  }
}

function handleUnauthorized() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
}

/* ==========================================================================
   File Selection & Drag-and-Drop
   ========================================================================== */

function setSelectedUploadFile(file) {
  selectedUploadFile = file;
  uploadMessage.classList.add('hidden');

  if (file) {
    previewFilename.textContent = file.name;
    previewFilesize.textContent = formatBytes(file.size);
    selectedFilePreview.classList.remove('hidden');
    uploadBtn.disabled = false;

    // Suggest default display name
    if (!uploadDisplayNameInput.value.trim()) {
      const dotIdx = file.name.lastIndexOf('.');
      const baseName = dotIdx > 0 ? file.name.substring(0, dotIdx) : file.name;
      uploadDisplayNameInput.placeholder = `e.g. ${baseName}`;
    }
  } else {
    fileInput.value = '';
    selectedFilePreview.classList.add('hidden');
    uploadBtn.disabled = true;
    uploadDisplayNameInput.placeholder = 'e.g. Q4 Financial Report (defaults to original filename if blank)';
  }
}

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0] || null;
  setSelectedUploadFile(file);
});

clearFileBtn.addEventListener('click', () => {
  setSelectedUploadFile(null);
});

['dragenter', 'dragover'].forEach((eventName) => {
  dropzone.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.add('dragover');
  });
});

['dragleave', 'drop'].forEach((eventName) => {
  dropzone.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove('dragover');
  });
});

dropzone.addEventListener('drop', (e) => {
  const dt = e.dataTransfer;
  if (dt.files && dt.files.length > 0) {
    setSelectedUploadFile(dt.files[0]);
  }
});

/* ==========================================================================
   Direct Fetch: Load Files List
   ========================================================================== */

async function loadFiles() {
  fileListError.classList.add('hidden');
  fileListLoading.classList.remove('hidden');
  fileListEmpty.classList.add('hidden');
  fileTableWrap.classList.add('hidden');

  // Build URL with active query params
  // e.g. /api/files?search=photo&type=image/jpeg&sort=size&order=desc
  const params = new URLSearchParams();
  const search = filterSearch?.value.trim();
  const type   = filterType?.value;
  const sort   = filterSort?.value;
  const order  = filterOrder?.value;
  if (search) params.set('search', search);
  if (type)   params.set('type', type);
  if (sort)   params.set('sort', sort);
  if (order)  params.set('order', order);
  const qs = params.toString();
  const url = qs ? `/api/files?${qs}` : '/api/files';

  try {
    // Direct fetch call to /api/files (with optional query params)
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401) {
      handleUnauthorized();
      return;
    }

    let files = null;
    try {
      files = await res.json();
    } catch (_) {
      files = null;
    }

    if (!res.ok) {
      throw new Error(files?.message || `Failed to fetch files (HTTP ${res.status})`);
    }

    renderTable(files);
  } catch (err) {
    fileListError.textContent = err.message;
    fileListError.classList.remove('hidden');
  } finally {
    fileListLoading.classList.add('hidden');
  }
}

refreshFilesBtn.addEventListener('click', loadFiles);

// Re-load files whenever any filter control changes
let searchDebounceTimer = null;
filterSearch.addEventListener('input', () => {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(loadFiles, 350); // debounce: wait 350ms after typing
});
filterType.addEventListener('change', loadFiles);
filterSort.addEventListener('change', loadFiles);
filterOrder.addEventListener('change', loadFiles);

function renderTable(files) {
  fileTableBody.innerHTML = '';

  if (!files || files.length === 0) {
    fileListEmpty.classList.remove('hidden');
    return;
  }

  fileTableWrap.classList.remove('hidden');

  files.forEach((file) => {
    const tr = document.createElement('tr');

    const formattedDate = new Date(file.uploaded_at).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const hasCustomName = file.display_name && file.display_name !== file.original_name;

    tr.innerHTML = `
      <td>
        <div class="file-item-name">
          <div class="file-item-text">
            <span class="file-display-name">${escapeHtml(file.display_name || file.original_name)}</span>
            ${hasCustomName ? `<span class="file-original-name muted text-xs">Original: ${escapeHtml(file.original_name)}</span>` : ''}
          </div>
        </div>
      </td>
      <td><span class="file-badge">${escapeHtml(file.mime_type)}</span></td>
      <td>${formatBytes(file.size)}</td>
      <td>${formattedDate}</td>
      <td class="actions-cell">
        <button type="button" class="btn btn-secondary btn-sm action-update-btn" title="Update display name or replace file">Update</button>
        <button type="button" class="btn btn-secondary btn-sm action-download-btn" title="Download file">Download</button>
        <button type="button" class="btn btn-secondary btn-sm action-delete-btn" title="Delete file">Delete</button>
      </td>
    `;

    // 1. Update Click
    tr.querySelector('.action-update-btn').addEventListener('click', () => {
      openUpdateModal(file);
    });

    // 2. Download Click (Direct fetch with Blob stream)
    tr.querySelector('.action-download-btn').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.textContent = 'Downloading...';

      try {
        const downloadRes = await fetch(`/api/files/${file.id}/download`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (downloadRes.status === 401) {
          handleUnauthorized();
          return;
        }

        if (!downloadRes.ok) {
          let errData = null;
          try { errData = await downloadRes.json(); } catch (_) {}
          throw new Error(errData?.message || `Download failed (HTTP ${downloadRes.status})`);
        }

        const blob = await downloadRes.blob();
        const blobUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = blobUrl;
        anchor.download = file.display_name || file.original_name;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(blobUrl);
      } catch (err) {
        showGlobalAlert(`Download failed: ${err.message}`, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = '⬇ Download';
      }
    });

    // 3. Delete Click
    tr.querySelector('.action-delete-btn').addEventListener('click', () => {
      filePendingDelete = file;
      deleteModalMsg.textContent = `Are you sure you want to permanently delete "${file.display_name || file.original_name}"?`;
      if (typeof deleteModal.showModal === 'function') {
        deleteModal.showModal();
      } else {
        if (window.confirm(`Delete "${file.display_name || file.original_name}"?`)) {
          executeDelete(file);
        }
      }
    });

    fileTableBody.appendChild(tr);
  });
}

/* ==========================================================================
   Direct Fetch: Upload File
   ========================================================================== */

uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!selectedUploadFile) return;

  uploadBtn.disabled = true;
  const textEl = uploadBtn.querySelector('.btn-text');
  const spinnerEl = uploadBtn.querySelector('.btn-spinner');
  textEl.textContent = 'Uploading...';
  spinnerEl.classList.remove('hidden');
  uploadMessage.classList.add('hidden');

  const formData = new FormData();
  formData.append('file', selectedUploadFile);

  const customName = uploadDisplayNameInput.value.trim();
  if (customName) {
    formData.append('display_name', customName);
  }

  try {
    // Direct fetch call to /api/files
    const res = await fetch('/api/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (res.status === 401) {
      handleUnauthorized();
      return;
    }

    let data = null;
    try { data = await res.json(); } catch (_) {}

    if (!res.ok) {
      throw new Error(data?.message || `Upload failed (HTTP ${res.status})`);
    }

    uploadMessage.textContent = `"${data.display_name}" uploaded successfully!`;
    uploadMessage.className = 'message success';
    uploadMessage.classList.remove('hidden');

    setSelectedUploadFile(null);
    uploadDisplayNameInput.value = '';
    loadFiles();
  } catch (err) {
    uploadMessage.textContent = err.message;
    uploadMessage.className = 'message error';
    uploadMessage.classList.remove('hidden');
  } finally {
    textEl.textContent = 'Upload File';
    spinnerEl.classList.add('hidden');
    uploadBtn.disabled = !selectedUploadFile;
  }
});

/* ==========================================================================
   Direct Fetch: Update File (Rename or Replace File)
   ========================================================================== */

function openUpdateModal(file) {
  filePendingUpdate = file;
  updateFileIdInput.value = file.id;
  updateDisplayNameInput.value = file.display_name || file.original_name;
  updateFileInput.value = '';
  updateIconEl.textContent = getFileIcon(file.mime_type);
  updateCurrentNameEl.textContent = file.display_name || file.original_name;
  updateCurrentMetaEl.textContent = `${file.original_name} • ${formatBytes(file.size)}`;
  updateMessageEl.classList.add('hidden');
  updateMessageEl.textContent = '';

  if (typeof updateModal.showModal === 'function') {
    updateModal.showModal();
  }
}

function closeUpdateModal() {
  if (typeof updateModal.close === 'function') {
    updateModal.close();
  }
  filePendingUpdate = null;
  updateFileInput.value = '';
}

cancelUpdateBtn.addEventListener('click', closeUpdateModal);
closeUpdateModalBtn.addEventListener('click', closeUpdateModal);

updateForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!filePendingUpdate) return;

  const newDisplayName = updateDisplayNameInput.value.trim();
  const replacementFile = updateFileInput.files[0] || null;

  if (!newDisplayName && !replacementFile) {
    updateMessageEl.textContent = 'Please enter a display name or choose a replacement file.';
    updateMessageEl.classList.remove('hidden');
    return;
  }

  saveUpdateBtn.disabled = true;
  const textEl = saveUpdateBtn.querySelector('.btn-text');
  const spinnerEl = saveUpdateBtn.querySelector('.btn-spinner');
  textEl.textContent = 'Saving...';
  spinnerEl.classList.remove('hidden');
  updateMessageEl.classList.add('hidden');

  const formData = new FormData();
  if (newDisplayName) {
    formData.append('display_name', newDisplayName);
  }
  if (replacementFile) {
    formData.append('file', replacementFile);
  }

  try {
    // Direct fetch call to /api/files/:id
    const res = await fetch(`/api/files/${filePendingUpdate.id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (res.status === 401) {
      closeUpdateModal();
      handleUnauthorized();
      return;
    }

    let data = null;
    try { data = await res.json(); } catch (_) {}

    if (!res.ok) {
      throw new Error(data?.message || `Update failed (HTTP ${res.status})`);
    }

    closeUpdateModal();
    showGlobalAlert(`"${data.display_name}" updated successfully!`, 'success');
    loadFiles();
  } catch (err) {
    updateMessageEl.textContent = err.message;
    updateMessageEl.classList.remove('hidden');
  } finally {
    saveUpdateBtn.disabled = false;
    textEl.textContent = 'Save Changes';
    spinnerEl.classList.add('hidden');
  }
});

/* ==========================================================================
   Direct Fetch: Delete File
   ========================================================================== */

cancelDeleteBtn.addEventListener('click', () => {
  deleteModal.close();
  filePendingDelete = null;
});

confirmDeleteBtn.addEventListener('click', async () => {
  if (!filePendingDelete) return;
  const file = filePendingDelete;
  confirmDeleteBtn.disabled = true;
  confirmDeleteBtn.textContent = 'Deleting...';

  try {
    await executeDelete(file);
    deleteModal.close();
  } finally {
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.textContent = 'Delete Permanently';
    filePendingDelete = null;
  }
});

async function executeDelete(file) {
  try {
    // Direct fetch call to DELETE /api/files/:id
    const res = await fetch(`/api/files/${file.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401) {
      handleUnauthorized();
      return;
    }

    let data = null;
    try { data = await res.json(); } catch (_) {}

    if (!res.ok) {
      throw new Error(data?.message || `Delete failed (HTTP ${res.status})`);
    }

    showGlobalAlert(`"${file.display_name || file.original_name}" was deleted.`, 'success');
    loadFiles();
  } catch (err) {
    showGlobalAlert(`Delete failed: ${err.message}`, 'error');
  }
}

// 3. Initial Load: Fetch user files
loadFiles();
