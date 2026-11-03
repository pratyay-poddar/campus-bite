/* ============================================================
   staff.js  —  CampusBite Staff Scanner Portal (staff/)
   ============================================================ */

// ─── AUTH ────────────────────────────────────────────────────
const staffUser = JSON.parse(sessionStorage.getItem('staff_user') || 'null');

function logout() {
  if (confirm('Are you sure you want to log out?')) {
    sessionStorage.removeItem('staff_logged_in');
    sessionStorage.removeItem('staff_user');
    window.location.replace('login.html');
  }
}

function initUserChip() {
  if (!staffUser) return;
  const avatarEl = document.getElementById('staffUserAvatar');
  const nameEl   = document.getElementById('staffUserName');
  const roleEl   = document.getElementById('staffUserRole');
  if (avatarEl) avatarEl.textContent = staffUser.avatar || '👤';
  if (nameEl)   nameEl.textContent   = staffUser.name || 'Staff';
  if (roleEl)   roleEl.textContent   = staffUser.role || 'Counter';
}

// ─── CLOCK ───────────────────────────────────────────────────
function updateClock() {
  const el = document.getElementById('staffClock');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}
setInterval(updateClock, 1000);
updateClock();

// ─── CAMERA SCANNER ──────────────────────────────────────────
let stream         = null;
let scanInterval   = null;
let currentRawCode = null;
let activeOrder    = null;

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    const video = document.getElementById('scannerVideo');
    video.srcObject = stream;
    await video.play();

    document.getElementById('startCamBtn').style.display  = 'none';
    document.getElementById('stopCamBtn').style.display   = 'block';
    document.getElementById('scannerStatus').style.display = 'flex';

    scanInterval = setInterval(scanFrame, 250);
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
  if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) return;

  canvas.width  = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'dontInvert',
  });

  if (code && code.data) {
    const rawData = code.data.trim();
    if (rawData && rawData !== currentRawCode) {
      currentRawCode = rawData;
      handleScannedData(rawData);
    }
  }
}

// ─── MANUAL LOOKUP ───────────────────────────────────────────
function lookupManual() {
  const input = document.getElementById('manualOrderId');
  const val   = input.value.trim();
  if (!val) return;
  handleScannedData(val);
  input.value = '';
}

const ITEM_EMOJIS = {
  "Veg Thali": "🍱", "Chicken Thali": "🍗", "Egg Rice": "🍳", "Pav Bhaji": "🥘",
  "Rajma Chawal": "🫘", "Chole Bhature": "🧆", "Samosa": "🥟", "Bread Omelette": "🍞",
  "Veg Sandwich": "🥪", "Maggi": "🍜", "Paneer Roll": "🌯", "Chicken Roll": "🌯",
  "French Fries": "🍟", "Boiled Egg": "🥚", "Masala Chai": "🍵", "Cold Coffee": "☕",
  "Lassi": "🥛", "Lemon Soda": "🍋", "Buttermilk": "🫗", "Mango Juice": "🥭",
  "Gulab Jamun": "🍮", "Halwa": "🍯", "Rasgulla": "⚪", "Ice Cream": "🍦"
};

function getItemEmoji(name, fallback) {
  if (fallback && fallback !== '🍽️') return fallback;
  for (let k in ITEM_EMOJIS) {
    if (name && name.toLowerCase().includes(k.toLowerCase())) return ITEM_EMOJIS[k];
  }
  return "🍽️";
}

// ─── PROCESS SCANNED DATA (CROSS-DEVICE COMPATIBLE) ──────────
function handleScannedData(rawText) {
  let order = null;

  // 1. Try decoding as self-contained JSON QR payload (enables GitHub Pages cross-device scanning!)
  try {
    const parsed = JSON.parse(rawText);
    if (parsed && (parsed.id || parsed.cb || parsed.items)) {
      order = {
        orderId:         parsed.id,
        student:         parsed.s || 'Student',
        studentRollNo:   parsed.r || '',
        items:           (parsed.items || []).map(i => ({
          name:  i.n || i.name,
          emoji: getItemEmoji(i.n || i.name, i.e || i.emoji),
          qty:   i.q || i.qty || 1,
          price: i.p || i.price || 0
        })),
        total:           parsed.tot || parsed.total || 0,
        placedAt:        parsed.t || parsed.placedAt || new Date().toISOString(),
        status:          'pending'
      };
    }
  } catch (err) {
    // Not a JSON string — could be an order ID string like ORD-20261104-XXXX
  }

  // 2. If not decoded from JSON payload, check local device storage (fallback)
  if (!order) {
    const raw = localStorage.getItem(`order_${rawText}`) || localStorage.getItem(rawText);
    if (raw) {
      try { order = JSON.parse(raw); } catch(e){}
    }
  }

  // 3. If still not found, check if it was previously saved in staff's served records
  if (!order) {
    const servedRecord = getServedRecord(rawText);
    if (servedRecord) {
      order = servedRecord;
    }
  }

  if (order) {
    // Check if this specific order was already served on this staff device
    const servedRecord = getServedRecord(order.orderId);
    if (servedRecord) {
      order.status   = 'served';
      order.servedAt = servedRecord.servedAt;
      order.servedBy = servedRecord.servedBy;
    }
    activeOrder = order;
    displayOrder(order);
  } else {
    displayNotFound(rawText);
  }
}

// ─── DISPLAY ORDER CARD ──────────────────────────────────────
function displayOrder(order) {
  document.getElementById('orderDisplayEmpty').style.display = 'none';
  document.getElementById('orderCard').style.display         = 'block';

  const isServed = order.status === 'served';

  document.getElementById('displayOrderId').textContent     = order.orderId;
  document.getElementById('displayOrderStatus').textContent = isServed ? '✅ Served' : '⏳ Ready to Serve';
  document.getElementById('displayOrderStatus').className   = `order-card-status ${isServed ? 'served' : 'pending'}`;
  document.getElementById('displayCustomer').textContent    = `${order.student}${order.studentRollNo ? ' (' + order.studentRollNo + ')' : ''}`;

  const placedAt = new Date(order.placedAt);
  const timeStr  = isNaN(placedAt.getTime()) ? 'Just now' : placedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  document.getElementById('displayTime').textContent = timeStr;

  // Items to hand over
  let itemsHtml = '';
  if (isServed) {
    itemsHtml += `
      <div class="already-served-alert">
        <span>⚠️</span>
        <div>This order was already served${order.servedAt ? ' at ' + new Date(order.servedAt).toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'}) : ''}${order.servedBy ? ' by ' + order.servedBy : ''}. Do not give items twice!</div>
      </div>`;
  }

  itemsHtml += (order.items || []).map(item => `
    <div class="serve-item">
      <span class="si-emoji">${item.emoji}</span>
      <div class="si-info"><div class="si-name">${item.name}</div></div>
      <span class="si-qty">× ${item.qty}</span>
    </div>
  `).join('');

  document.getElementById('serveItems').innerHTML     = itemsHtml;
  document.getElementById('displayTotal').textContent = `₹${Math.round(order.total)}`;

  const markBtn = document.getElementById('markReadyBtn');
  if (isServed) {
    markBtn.textContent = '✅ Already Served';
    markBtn.disabled    = true;
  } else {
    markBtn.textContent = '✅ Mark as Served';
    markBtn.disabled    = false;
  }
}

function displayNotFound(query) {
  document.getElementById('orderDisplayEmpty').style.display = 'none';
  document.getElementById('orderCard').style.display         = 'block';

  document.getElementById('displayOrderId').textContent     = query;
  document.getElementById('displayOrderStatus').textContent = '❓ Invalid';
  document.getElementById('displayOrderStatus').className   = 'order-card-status closed';
  document.getElementById('displayCustomer').textContent    = '—';
  document.getElementById('displayTime').textContent        = '—';
  document.getElementById('serveItems').innerHTML           = `
    <div style="text-align:center;color:#e53e3e;padding:24px;font-weight:600;">
      ❌ Order not recognized.<br>
      <small style="color:#718096;font-weight:400;display:block;margin-top:6px;">
        Make sure the student shows the QR code from their CampusBite order screen.
      </small>
    </div>`;
  document.getElementById('displayTotal').textContent       = '—';
  document.getElementById('markReadyBtn').disabled          = true;
}

// ─── MARK ORDER SERVED ───────────────────────────────────────
function markOrderServed() {
  if (!activeOrder) return;

  activeOrder.status   = 'served';
  activeOrder.servedAt = new Date().toISOString();
  activeOrder.servedBy = staffUser ? staffUser.name : 'Staff';

  // Save to staff device served storage
  saveServedRecord(activeOrder);

  // If order exists in local storage on this device, update it too
  const localRaw = localStorage.getItem(`order_${activeOrder.orderId}`);
  if (localRaw) {
    try {
      const localObj = JSON.parse(localRaw);
      localObj.status   = 'served';
      localObj.servedAt = activeOrder.servedAt;
      localObj.servedBy = activeOrder.servedBy;
      localStorage.setItem(`order_${activeOrder.orderId}`, JSON.stringify(localObj));
    } catch(e) {}
  }

  // Update display
  displayOrder(activeOrder);
  showStaffToast(`✅ Order ${activeOrder.orderId} marked as served!`, 'success');
  renderServedLog();
}

// ─── RESET / SCAN NEXT ───────────────────────────────────────
function resetScan() {
  currentRawCode = null;
  activeOrder    = null;
  document.getElementById('orderDisplayEmpty').style.display = 'block';
  document.getElementById('orderCard').style.display         = 'none';
}

// ─── SERVED RECORDS STORAGE & DELETION ───────────────────────
const SERVED_KEY = 'campusbite_staff_served_records';

function getStaffServedRecords() {
  try {
    return JSON.parse(localStorage.getItem(SERVED_KEY) || '[]');
  } catch(e) {
    return [];
  }
}

function getServedRecord(orderId) {
  const records = getStaffServedRecords();
  return records.find(r => r.orderId === orderId);
}

function saveServedRecord(order) {
  const records = getStaffServedRecords();
  // Filter out duplicate if existing
  const filtered = records.filter(r => r.orderId !== order.orderId);
  filtered.unshift(order);
  localStorage.setItem(SERVED_KEY, JSON.stringify(filtered));
}

// Delete a single served order record
function deleteServedItem(orderId) {
  const records  = getStaffServedRecords();
  const filtered = records.filter(r => r.orderId !== order.orderId);
  localStorage.setItem(SERVED_KEY, JSON.stringify(filtered));

  // If also stored under order_ORD-..., remove it
  localStorage.removeItem(`order_${orderId}`);

  showStaffToast(`🗑️ Order ${orderId} record deleted.`, 'warn');
  renderServedLog();

  // If currently displaying this order, reset it
  if (activeOrder && activeOrder.orderId === orderId) {
    resetScan();
  }
}

// Clear all served data (per user request: delete data once served)
function clearAllServedHistory() {
  const records = getStaffServedRecords();
  if (records.length === 0) {
    showStaffToast('History is already empty.', 'warn');
    return;
  }
  if (confirm(`Delete all ${records.length} served order records from this device?`)) {
    localStorage.removeItem(SERVED_KEY);
    showStaffToast('🗑️ All served order records cleared.', 'warn');
    renderServedLog();
    resetScan();
  }
}

// ─── RENDER SERVED LOG ───────────────────────────────────────
function renderServedLog() {
  const logEl   = document.getElementById('servedLog');
  const countEl = document.getElementById('servedCount');
  const records = getStaffServedRecords();

  if (countEl) countEl.textContent = `${records.length} served`;

  if (records.length === 0) {
    logEl.innerHTML = '<div class="served-log-empty">No orders served yet today.</div>';
    return;
  }

  logEl.innerHTML = records.map(o => {
    const itemList = (o.items || []).map(i => `${i.emoji} ${i.name} ×${i.qty}`).join(', ');
    const servedAt = o.servedAt
      ? new Date(o.servedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      : '';
    const servedBy = o.servedBy ? ` · by ${o.servedBy}` : '';
    return `
      <div class="served-log-item">
        <div class="served-log-item-info">
          <div class="log-id">${o.orderId}</div>
          <div class="log-customer">👤 ${o.student}${o.studentRollNo ? ' (' + o.studentRollNo + ')' : ''} · ${servedAt}${servedBy}</div>
          <div class="log-items">${itemList}</div>
        </div>
        <button class="log-del-btn" onclick="deleteServedItem('${o.orderId}')" title="Delete this record">🗑️</button>
      </div>`;
  }).join('');
}

// ─── TOAST NOTIFICATION ─────────────────────────────────────
function showStaffToast(msg, type = 'success') {
  let t = document.getElementById('staffToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'staffToast';
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
renderServedLog();
document.getElementById('orderDisplayEmpty').style.display = 'block';
document.getElementById('orderCard').style.display         = 'none';
document.getElementById('scannerStatus').style.display     = 'none';
