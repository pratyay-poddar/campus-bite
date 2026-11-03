/* ============================================================
   waiter.js  —  CampusBite Waiter Scanner Portal
   ============================================================ */

// ─── AUTH ────────────────────────────────────────────────────
const waiterUser = JSON.parse(sessionStorage.getItem('waiter_user') || 'null');

function logout() {
  if (confirm('Are you sure you want to log out?')) {
    sessionStorage.removeItem('waiter_logged_in');
    sessionStorage.removeItem('waiter_user');
    window.location.replace('waiter-login.html');
  }
}

// Populate user chip in header
function initUserChip() {
  if (!waiterUser) return;
  document.getElementById('waiterUserAvatar').textContent = waiterUser.avatar;
  document.getElementById('waiterUserName').textContent   = waiterUser.name;
  document.getElementById('waiterUserRole').textContent   = waiterUser.role;
}

// ─── CLOCK ───────────────────────────────────────────────────
function updateClock() {
  const el = document.getElementById('waiterClock');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}
setInterval(updateClock, 1000);
updateClock();

// ─── CAMERA ──────────────────────────────────────────────────
let stream      = null;
let scanInterval = null;
let currentOrderId = null;

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    const video = document.getElementById('scannerVideo');
    video.srcObject = stream;
    await video.play();

    document.getElementById('startCamBtn').style.display = 'none';
    document.getElementById('stopCamBtn').style.display  = 'block';
    document.getElementById('scannerStatus').style.display = 'flex';

    scanInterval = setInterval(scanFrame, 300);
  } catch (err) {
    alert('Camera access denied or not available: ' + err.message);
  }
}

function stopCamera() {
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  clearInterval(scanInterval);
  document.getElementById('startCamBtn').style.display  = 'block';
  document.getElementById('stopCamBtn').style.display   = 'none';
  document.getElementById('scannerStatus').style.display = 'none';
}

function scanFrame() {
  const video  = document.getElementById('scannerVideo');
  const canvas = document.getElementById('scannerCanvas');
  if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

  canvas.width  = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'dontInvert',
  });

  if (code && code.data) {
    const orderId = code.data.trim();
    if (orderId !== currentOrderId) {
      currentOrderId = orderId;
      displayOrder(orderId);
    }
  }
}

// ─── MANUAL LOOKUP ───────────────────────────────────────────
function lookupManual() {
  const input   = document.getElementById('manualOrderId');
  const orderId = input.value.trim().toUpperCase();
  if (!orderId) return;
  displayOrder(orderId);
  input.value = '';
}

// ─── DISPLAY ORDER ───────────────────────────────────────────
function displayOrder(orderId) {
  const raw = localStorage.getItem(`order_${orderId}`);

  document.getElementById('orderDisplayEmpty').style.display = 'none';
  document.getElementById('orderCard').style.display         = 'block';

  if (!raw) {
    document.getElementById('displayOrderId').textContent      = orderId;
    document.getElementById('displayOrderStatus').textContent  = '❓ Not Found';
    document.getElementById('displayOrderStatus').className    = 'order-card-status closed';
    document.getElementById('displayCustomer').textContent     = '—';
    document.getElementById('displayTime').textContent         = '—';
    document.getElementById('serveItems').innerHTML            = `
      <div style="text-align:center;color:#e53e3e;padding:20px;font-weight:600;">
        ❌ No order found with this ID.<br>
        <small style="color:#718096;font-weight:400;">Check if the QR is from CampusBite.</small>
      </div>`;
    document.getElementById('displayTotal').textContent        = '—';
    document.getElementById('markReadyBtn').disabled           = true;
    return;
  }

  const order    = JSON.parse(raw);
  const isServed = order.status === 'served';

  document.getElementById('displayOrderId').textContent      = order.orderId;
  document.getElementById('displayOrderStatus').textContent  = isServed ? '✅ Served' : '⏳ Pending';
  document.getElementById('displayOrderStatus').className    = `order-card-status ${isServed ? 'served' : 'pending'}`;
  document.getElementById('displayCustomer').textContent     = order.student;

  const placedAt = new Date(order.placedAt);
  document.getElementById('displayTime').textContent = placedAt.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit'
  });

  document.getElementById('serveItems').innerHTML = order.items.map(item => `
    <div class="serve-item">
      <span class="si-emoji">${item.emoji}</span>
      <div class="si-info"><div class="si-name">${item.name}</div></div>
      <span class="si-qty">× ${item.qty}</span>
    </div>
  `).join('');

  document.getElementById('displayTotal').textContent = `₹${order.total.toFixed(0)}`;

  const markBtn = document.getElementById('markReadyBtn');
  if (isServed) {
    markBtn.textContent = '✅ Already Served';
    markBtn.disabled    = true;
  } else {
    markBtn.textContent = '✅ Mark as Served';
    markBtn.disabled    = false;
  }
}

// ─── MARK AS SERVED ──────────────────────────────────────────
function markOrderServed() {
  const orderId = document.getElementById('displayOrderId').textContent;
  if (!orderId) return;

  const raw = localStorage.getItem(`order_${orderId}`);
  if (!raw) return;

  const order      = JSON.parse(raw);
  order.status     = 'served';
  order.servedAt   = new Date().toISOString();
  order.servedBy   = waiterUser ? waiterUser.name : 'Waiter';
  localStorage.setItem(`order_${orderId}`, JSON.stringify(order));

  document.getElementById('displayOrderStatus').textContent = '✅ Served';
  document.getElementById('displayOrderStatus').className   = 'order-card-status served';
  const markBtn = document.getElementById('markReadyBtn');
  markBtn.textContent = '✅ Already Served';
  markBtn.disabled    = true;

  showWaiterToast(`✅ Order ${orderId} marked as served!`, 'success');
  addToServedLog(order);
}

// ─── RESET SCAN ──────────────────────────────────────────────
function resetScan() {
  currentOrderId = null;
  document.getElementById('orderDisplayEmpty').style.display = 'block';
  document.getElementById('orderCard').style.display         = 'none';
}

// ─── SERVED LOG ──────────────────────────────────────────────
let servedLog = [];

function addToServedLog(order) {
  // Avoid duplicates
  if (!servedLog.find(o => o.orderId === order.orderId)) {
    servedLog.unshift(order);
  }
  renderServedLog();
}

function renderServedLog() {
  const logEl   = document.getElementById('servedLog');
  const countEl = document.getElementById('servedCount');
  countEl.textContent = `${servedLog.length} served`;

  if (servedLog.length === 0) {
    logEl.innerHTML = '<div class="served-log-empty">No orders served yet today.</div>';
    return;
  }

  logEl.innerHTML = servedLog.map(o => {
    const itemList = o.items.map(i => `${i.emoji} ${i.name} ×${i.qty}`).join(', ');
    const servedAt = o.servedAt
      ? new Date(o.servedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      : '';
    const servedBy = o.servedBy ? ` · by ${o.servedBy}` : '';
    return `
      <div class="served-log-item">
        <div class="log-id">${o.orderId}</div>
        <div class="log-customer">👤 ${o.student} · ${servedAt}${servedBy}</div>
        <div class="log-items">${itemList}</div>
      </div>`;
  }).join('');
}

function loadTodayServed() {
  const today = new Date().toISOString().slice(0,10).replace(/-/g,'');
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('order_ORD-' + today)) {
      try {
        const o = JSON.parse(localStorage.getItem(key));
        if (o.status === 'served') servedLog.push(o);
      } catch(e) {}
    }
  }
  servedLog.sort((a,b) => new Date(b.servedAt||0) - new Date(a.servedAt||0));
  renderServedLog();
}

// ─── TOAST ───────────────────────────────────────────────────
function showWaiterToast(msg, type = 'success') {
  let t = document.getElementById('waiterToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'waiterToast';
    t.style.cssText = `
      position:fixed;bottom:32px;left:50%;transform:translateX(-50%);
      padding:14px 28px;border-radius:50px;font-family:'Poppins',sans-serif;
      font-size:0.95rem;font-weight:700;z-index:9999;
      box-shadow:0 4px 20px rgba(0,0,0,0.3);transition:opacity 0.4s;
    `;
    document.body.appendChild(t);
  }
  t.style.background = type === 'warn' ? '#e53e3e' : '#38a169';
  t.style.color      = '#fff';
  t.textContent      = msg;
  t.style.opacity    = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.opacity = '0'; }, 3500);
}

// ─── INIT ─────────────────────────────────────────────────────
initUserChip();
loadTodayServed();
document.getElementById('orderDisplayEmpty').style.display  = 'block';
document.getElementById('orderCard').style.display          = 'none';
document.getElementById('scannerStatus').style.display      = 'none';
