const reportsList = document.querySelector('#reports-list');
const reportsStatus = document.querySelector('#reports-status');
const reportFormSection = document.querySelector('#report-form-section');
const reportForm = document.querySelector('#report-form');
const reportFormStatus = document.querySelector('#report-form-status');
const channelId = new URLSearchParams(location.search).get('channelId');

async function loadUser() {
  const response = await fetch('/api/users/me');
  if (!response.ok) { location.href = '/login'; return false; }
  const user = await response.json();
  document.querySelector('#welcome').textContent = `Welcome, ${user.email}`;
  return true;
}

function formatReason(reason) {
  return reason.toLowerCase().split('_').map((word) => `${word[0].toUpperCase()}${word.slice(1)}`).join(' ');
}

function createReportItem(report) {
  const item = document.createElement('article');
  item.className = 'report-item';
  const channel = document.createElement('h3');
  channel.textContent = report.channelId?.name || 'Channel unavailable';
  const reason = document.createElement('p');
  reason.textContent = `Reason: ${formatReason(report.reason)}`;
  const description = document.createElement('p');
  description.textContent = report.description;
  const status = document.createElement('p');
  status.className = 'report-status';
  status.textContent = report.status;
  const created = document.createElement('p');
  created.className = 'report-date';
  created.textContent = new Date(report.createdAt).toLocaleString();
  item.append(channel, reason, description, status, created);
  for (const [index, url] of (report.evidenceUrls || []).entries()) {
    const evidence = document.createElement('a');
    evidence.href = url;
    evidence.target = '_blank';
    evidence.rel = 'noopener';
    evidence.textContent = `View evidence image ${index + 1}`;
    item.append(evidence);
  }

  // Punto 4: modificar (PATCH con JSON)
  const edit = document.createElement('button');
  edit.textContent = 'Edit';
  edit.addEventListener('click', async () => {
    const newReason = prompt('Reason (STREAM_DOES_NOT_LOAD, WRONG_CHANNEL, AUDIO_PROBLEM, VIDEO_PROBLEM, OTHER)', report.reason);
    if (newReason === null) return;
    const newDescription = prompt('Description', report.description);
    if (newDescription === null) return;
    const newStatus = prompt('Status (OPEN, IN_REVIEW, RESOLVED)', report.status);
    if (newStatus === null) return;
    const response = await fetch(`/api/reports/${report._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: newReason, description: newDescription, status: newStatus })
    });
    if (!response.ok) { reportsStatus.textContent = 'Could not update the report.'; return; }
    await loadReports();
  });

  // Punto 5: eliminar (DELETE)
  const remove = document.createElement('button');
  remove.textContent = 'Delete';
  remove.addEventListener('click', async () => {
    const response = await fetch(`/api/reports/${report._id}`, { method: 'DELETE' });
    if (!response.ok) { reportsStatus.textContent = 'Could not delete the report.'; return; }
    await loadReports();
  });
  item.append(edit, remove);
  return item;
}

async function loadReports() {
  const response = await fetch('/api/reports');
  if (!response.ok) { reportsStatus.textContent = 'Could not load reports.'; return; }
  const { reports } = await response.json();
  reportsStatus.textContent = `${reports.length} report${reports.length === 1 ? '' : 's'}`;
  if (reports.length === 0) {
    reportsList.replaceChildren(Object.assign(document.createElement('p'), { className: 'empty-state', textContent: 'You have not reported a channel yet.' }));
    return;
  }
  reportsList.replaceChildren(...reports.map(createReportItem));
}

async function submitReport(event) {
  event.preventDefault();
  const formData = new FormData();
  formData.append('channelId', channelId);
  formData.append('reason', document.querySelector('#report-reason').value);
  formData.append('description', document.querySelector('#report-description').value);
  const evidence =
    document.querySelector('#report-evidence').files[0];
  // TODO v4.5 4:
  // Completa el nombre del campo utilizado para enviar la imagen.
  // Objetivo: relacionar el archivo del formulario con upload.single().
  // Resultado esperado: Multer reconocerá la evidencia enviada por el navegador.
  // Respuesta TODO 4: formData.append('evidence', evidence) con un solo archivo.
  // Punto 3: se recorren todos los archivos seleccionados con la misma clave.
  for (const file of document.querySelector('#report-evidence').files) {
    formData.append('evidence', file);
  }

  reportFormStatus.textContent = 'Submitting report…';
  // TODO v4.5 5:
  // Completa el body de la petición utilizando el FormData construido.
  // Objetivo: enviar los campos de texto y la evidencia en una misma solicitud.
  // Resultado esperado: POST /api/reports recibirá correctamente multipart/form-data.
  const response = await fetch('/api/reports', {
    method: 'POST',
    body: formData
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    reportFormStatus.textContent = payload.error?.message || 'Could not submit the report.';
    return;
  }

  reportForm.reset();
  reportFormStatus.textContent = 'Report saved.';
  await loadReports();
}

function configureReportForm() {
  if (!channelId) return;
  reportFormSection.hidden = false;
  document.querySelector('#report-channel-id').value = channelId;
  document.querySelector('#report-channel').textContent = 'Report the selected channel.';
  reportForm.addEventListener('submit', submitReport);
}

document.querySelector('#logout').addEventListener('click', async () => { await fetch('/api/auth/logout', { method: 'POST' }); location.href = '/login'; });
async function start() { if (await loadUser()) { configureReportForm(); await loadReports(); } }
start();
