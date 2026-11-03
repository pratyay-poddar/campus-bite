/* ============================================================
   staff.js  —  CampusBite Staff Scanner Portal (staff/)
   Supports Hardware BarcodeDetector, jsQR, Image Upload,
   and optional Go Backend Sync
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

// ─── AUDIO & HAPTIC FEEDBACK ─────────────────────────────────
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {}
  if (navigator.vibrate) navigator.vibrate(100);
}

// ─── CAMERA SCANNER ──────────────────────────────────────────
let stream         = null;
let scanInterval   = null;
let currentRawCode = null;
let activeOrder    = null;
let barcodeDetector = null;

if ('BarcodeDetector' in window) {
  try {
    barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });
  } catch (e) {
    barcodeDetector = null;
  }
}

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 640 },
        height: { ideal: 480 }
      }
    });
    const video = document.getElementById('scannerVideo');
    video.setAttribute('playsinline', 'true');
    video.setAttribute('autoplay', 'true');
    video.setAttribute('muted', 'true');
    video.muted = true;
    video.srcObject = stream;
    await video.play();

    document.getElementById('startCamBtn').style.display  = 'none';
    document.getElementById('stopCamBtn').style.display   = 'block';
    document.getElementById('scannerStatus').style.display = 'flex';

    scanInterval = setInterval(scanFrame, 200);
  } catch (err) {
    alert('Camera could not start: ' + err.message + '\n\nTip: You can use the "Scan from Photo" button below to upload a screenshot of the QR code!');
  }
}

function stopCamera() {
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  clearInterval(scanInterval);
  document.getElementById('startCamBtn').style.display  = 'block';
  document.getElementById('stopCamBtn').style.display   = 'none';
  document.getElementById('scannerStatus').style.display = 'none';
}

async function scanFrame() {
  const video  = document.getElementById('scannerVideo');
  if (!video || video.readyState < 2) return;

  // 1. Hardware BarcodeDetector if available (instant 60fps scanning!)
  if (barcodeDetector) {
    try {
      const barcodes = await barcodeDetector.detect(video);
      if (barcodes.length > 0 && barcodes[0].rawValue) {
        const raw = barcodes[0].rawValue.trim();
        if (raw !== currentRawCode) {
          currentRawCode = raw;
          playBeep();
          handleScannedData(raw);
        }
        return;
      }
    } catch (e) {}
  }

  // 2. Fallback to jsQR with optimized downscaled canvas
  if (typeof jsQR !== 'function') return;

  const canvas = document.getElementById('scannerCanvas');
  const targetW = Math.min(video.videoWidth || 640, 640);
  const targetH = Math.min(video.videoHeight || 480, 480);
  if (targetW === 0 || targetH === 0) return;

  canvas.width  = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(video, 0, 0, targetW, targetH);
  const imageData = ctx.getImageData(0, 0, targetW, targetH);

  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth'
  });

  if (code && code.data) {
    const raw = code.data.trim();
    if (raw && raw !== currentRawCode) {
      currentRawCode = raw;
      playBeep();
      handleScannedData(raw);
    }
  }
}

// ─── IMAGE FILE SCANNER (FALLBACK FOR ANY DEVICE) ─────────────
function handleQRImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = async function() {
      // 1. Try BarcodeDetector
      if (barcodeDetector) {
        try {
          const barcodes = await barcodeDetector.detect(img);
          if (barcodes.length > 0 && barcodes[0].rawValue) {
            playBeep();
            handleScannedData(barcodes[0].rawValue.trim());
            return;
          }
        } catch (err) {}
      }

      // 2. Try jsQR
      const canvas = document.createElement('canvas');
      canvas.width  = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth'
      });
      if (code && code.data) {
        playBeep();
        handleScannedData(code.data.trim());
      } else {
        alert('Could not find a valid QR code in that image. Try picking a clearer photo or hold the camera closer.');
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

// ─── MANUAL LOOKUP ───────────────────────────────────────────
async function lookupManual() {
  const input = document.getElementById('manualOrderId');
  const val   = input.value.trim();
  if (!val) return;
  input.value = '';
  await handleScannedData(val);
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

// ─── PROCESS SCANNED DATA ────────────────────────────────────
async function handleScannedData(rawText) {
  let order = null;

  // 1. Try decoding self-contained JSON QR payload
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
  } catch (err) {}

  // 2. Query Go backend API if available (handles cross-device when Go server is running)
  if (!order && typeof API_URL !== 'undefined') {
    try {
      const res = await fetch(`${API_URL}/api/orders/${rawText}`);
      if (res.ok) {
        const backendOrder = await res.json();
        if (backendOrder && backendOrder.orderId) {
          order = backendOrder;
        }
      }
    } catch (e) {}
  }

  // 3. Fallback: Check local storage
  if (!order) {
    const raw = localStorage.getItem(`order_${rawText}`) || localStorage.getItem(rawText);
    if (raw) {
      try { order = JSON.parse(raw); } catch(e){}
    }
  }

  // 4. Check if it was previously saved in staff's served records
  if (!order) {
    const servedRecord = getServedRecord(rawText);
    if (servedRecord) {
      order = servedRecord;
    }
  }

  if (order) {
    // Check if already marked served on staff device
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
      <span class="si-emoji">${item.emoji || getItemEmoji(item.name)}</span>
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
async function markOrderServed() {
  if (!activeOrder) {
    showStaffToast('⚠️ No active order selected to serve!', 'warn');
    return;
  }

  activeOrder.status   = 'served';
  activeOrder.servedAt = new Date().toISOString();
  activeOrder.servedBy = staffUser ? staffUser.name : 'Staff';

  // 1. Broadcast instant sync for any open student tab/window on this device (< 5ms)
  try {
    const bc = new BroadcastChannel('campusbite_sync');
    bc.postMessage({
      type: 'ORDER_SERVED',
      orderId: activeOrder.orderId,
      status: 'served',
      servedAt: activeOrder.servedAt,
      servedBy: activeOrder.servedBy
    });
    setTimeout(() => { try { bc.close(); } catch(e) {} }, 1000);
  } catch(e) {}

  // 2. Pulse localStorage to trigger storage events across browser tabs
  try {
    localStorage.setItem('campusbite_last_served', JSON.stringify({
      orderId: activeOrder.orderId,
      status: 'served',
      servedAt: activeOrder.servedAt,
      servedBy: activeOrder.servedBy,
      ts: Date.now()
    }));
  } catch(e) {}

  // 3. Sync to Go backend if connected (moves active order to served store)
  if (typeof API_URL !== 'undefined' && API_URL) {
    try {
      await fetch(`${API_URL}/api/orders/${activeOrder.orderId}/serve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ servedBy: activeOrder.servedBy })
      });
    } catch(e) {}
  }

  // 4. Relay served event to ntfy.sh (enables instant cross-device sync on GitHub Pages)
  try {
    const cleanId = String(activeOrder.orderId).replace(/[^a-zA-Z0-9]/g, '');
    fetch(`https://ntfy.sh/campusbite_ord_${cleanId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: activeOrder.orderId,
        status: 'served',
        servedAt: activeOrder.servedAt,
        servedBy: activeOrder.servedBy
      })
    }).catch(() => {});
  } catch(e) {}

  // 5. Save to staff device served storage
  saveServedRecord(activeOrder);

  // 6. If present in local storage, update status
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
  const filtered = records.filter(r => r.orderId !== order.orderId);
  filtered.unshift(order);
  localStorage.setItem(SERVED_KEY, JSON.stringify(filtered));
}

async function deleteServedItem(orderId) {
  const records  = getStaffServedRecords();
  const filtered = records.filter(r => r.orderId !== order.orderId);
  localStorage.setItem(SERVED_KEY, JSON.stringify(filtered));

  localStorage.removeItem(`order_${orderId}`);

  // Delete on Go backend if connected
  if (typeof API_URL !== 'undefined') {
    try {
      await fetch(`${API_URL}/api/served/${orderId}`, { method: 'DELETE' });
    } catch(e) {}
  }

  showStaffToast(`🗑️ Order ${orderId} record deleted.`, 'warn');
  renderServedLog();

  if (activeOrder && activeOrder.orderId === orderId) {
    resetScan();
  }
}

async function clearAllServedHistory() {
  const records = getStaffServedRecords();
  if (records.length === 0) {
    showStaffToast('History is already empty.', 'warn');
    return;
  }
  if (confirm(`Delete all ${records.length} served order records from this device?`)) {
    localStorage.removeItem(SERVED_KEY);

    // Clear on Go backend if connected
    if (typeof API_URL !== 'undefined') {
      try {
        await fetch(`${API_URL}/api/served`, { method: 'DELETE' });
      } catch(e) {}
    }

    showStaffToast('🗑️ All served order records cleared.', 'warn');
    renderServedLog();
    resetScan();
  }
}

// ─── RENDER SERVED LOG ───────────────────────────────────────
async function renderServedLog() {
  const logEl   = document.getElementById('servedLog');
  const countEl = document.getElementById('servedCount');
  let records   = getStaffServedRecords();

  // Also pull served records from Go backend if connected
  if (typeof API_URL !== 'undefined') {
    try {
      const res = await fetch(`${API_URL}/api/served`);
      if (res.ok) {
        const backendRecords = await res.json();
        if (Array.isArray(backendRecords) && backendRecords.length > 0) {
          records = backendRecords;
        }
      }
    } catch(e) {}
  }

  if (countEl) countEl.textContent = `${records.length} served`;

  if (records.length === 0) {
    logEl.innerHTML = '<div class="served-log-empty">No orders served yet today.</div>';
    return;
  }

  logEl.innerHTML = records.map(o => {
    const itemList = (o.items || []).map(i => `${i.emoji || getItemEmoji(i.name)} ${i.name} ×${i.qty}`).join(', ');
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
