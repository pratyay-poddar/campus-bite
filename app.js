/* ============================================================
   app.js  —  CampusBite Student Ordering App
   ============================================================ */

// ─── MENU DATA ───────────────────────────────────────────────
const MENU = [
  // MEALS
  { id: 1,  name: "Veg Thali",       emoji: "🍱", category: "meals",     price: 70,  veg: true,  desc: "Dal, sabzi, 3 rotis, rice, pickle & papad",     tag: "popular" },
  { id: 2,  name: "Chicken Thali",   emoji: "🍗", category: "meals",     price: 90,  veg: false, desc: "Chicken curry, rice, 2 rotis, dal & salad",       tag: "popular" },
  { id: 3,  name: "Egg Rice",        emoji: "🍳", category: "meals",     price: 55,  veg: false, desc: "Fried rice tossed with egg & vegetables" },
  { id: 4,  name: "Pav Bhaji",       emoji: "🥘", category: "meals",     price: 50,  veg: true,  desc: "Spicy mixed veggie mash with buttered pav",       tag: "popular" },
  { id: 5,  name: "Rajma Chawal",    emoji: "🫘", category: "meals",     price: 60,  veg: true,  desc: "Red kidney bean curry with steamed basmati" },
  { id: 6,  name: "Chole Bhature",   emoji: "🧆", category: "meals",     price: 55,  veg: true,  desc: "Tangy chickpea curry with 2 fluffy bhaturas" },

  // SNACKS
  { id: 7,  name: "Samosa (2 pcs)",  emoji: "🥟", category: "snacks",    price: 20,  veg: true,  desc: "Crispy fried pastry stuffed with spiced potato",  tag: "popular" },
  { id: 8,  name: "Bread Omelette",  emoji: "🍞", category: "snacks",    price: 30,  veg: false, desc: "Egg omelette with buttered bread slices" },
  { id: 9,  name: "Veg Sandwich",    emoji: "🥪", category: "snacks",    price: 35,  veg: true,  desc: "Toasted with cucumber, tomato, cheese & chutney" },
  { id: 10, name: "Maggi Noodles",   emoji: "🍜", category: "snacks",    price: 30,  veg: true,  desc: "Classic masala Maggi with veggies",               tag: "popular" },
  { id: 11, name: "Paneer Roll",     emoji: "🌯", category: "snacks",    price: 45,  veg: true,  desc: "Spiced paneer in a soft roti wrap with sauces",   tag: "new" },
  { id: 12, name: "Chicken Roll",    emoji: "🌯", category: "snacks",    price: 55,  veg: false, desc: "Tender chicken strips rolled in fresh paratha",    tag: "new" },
  { id: 13, name: "French Fries",    emoji: "🍟", category: "snacks",    price: 40,  veg: true,  desc: "Crispy salted fries with tomato ketchup" },
  { id: 14, name: "Boiled Egg",      emoji: "🥚", category: "snacks",    price: 10,  veg: false, desc: "Hard-boiled egg with salt & chilli powder" },

  // BEVERAGES
  { id: 15, name: "Masala Chai",     emoji: "🍵", category: "beverages", price: 15,  veg: true,  desc: "Freshly brewed ginger-cardamom tea",              tag: "popular" },
  { id: 16, name: "Cold Coffee",     emoji: "☕", category: "beverages", price: 40,  veg: true,  desc: "Blended iced coffee with milk & ice cream",        tag: "popular" },
  { id: 17, name: "Lassi",           emoji: "🥛", category: "beverages", price: 30,  veg: true,  desc: "Sweet or salted chilled yogurt drink" },
  { id: 18, name: "Lemon Soda",      emoji: "🍋", category: "beverages", price: 25,  veg: true,  desc: "Chilled lemon juice with sparkling soda" },
  { id: 19, name: "Buttermilk",      emoji: "🫗", category: "beverages", price: 15,  veg: true,  desc: "Chilled salted chaas with cumin & coriander" },
  { id: 20, name: "Mango Juice",     emoji: "🥭", category: "beverages", price: 35,  veg: true,  desc: "Fresh mango pulp blended with chilled water",     tag: "new" },

  // SWEETS
  { id: 21, name: "Gulab Jamun",     emoji: "🍮", category: "sweets",    price: 20,  veg: true,  desc: "2 soft milk-solid dumplings in rose syrup",       tag: "popular" },
  { id: 22, name: "Halwa",           emoji: "🍯", category: "sweets",    price: 25,  veg: true,  desc: "Warm semolina halwa with nuts & raisins" },
  { id: 23, name: "Rasgulla",        emoji: "⚪", category: "sweets",    price: 20,  veg: true,  desc: "2 spongy cottage cheese balls in sugar syrup" },
  { id: 24, name: "Ice Cream",       emoji: "🍦", category: "sweets",    price: 30,  veg: true,  desc: "Vanilla / chocolate / strawberry scoop",          tag: "new" },
];

// ─── STUDENT AUTH ────────────────────────────────────────────
const currentStudent = JSON.parse(sessionStorage.getItem('student_user') || '{}');

function studentLogout() {
  if (confirm('Log out of CampusBite?')) {
    sessionStorage.removeItem('student_logged_in');
    sessionStorage.removeItem('student_user');
    window.location.replace('student-login.html');
  }
}

function initStudentHeader() {
  const chipName = document.getElementById('chipName');
  const chipRoll = document.getElementById('chipRoll');
  const cartInfo = document.getElementById('cartStudentInfo');
  if (chipName) chipName.textContent = currentStudent.name   || '—';
  if (chipRoll) chipRoll.textContent = currentStudent.rollNo || '—';
  if (cartInfo) cartInfo.innerHTML = `
    <div class="cart-student-badge">
      <span>🎓</span>
      <div>
        <strong>${currentStudent.name || '—'}</strong>
        <small>${currentStudent.rollNo || ''}</small>
      </div>
    </div>`;
}

// ─── STATE ───────────────────────────────────────────────────
let cart = {};
let currentCategory = "all";
let orderingOpen = false;

// ─── HELPERS ─────────────────────────────────────────────────
function genOrderId() {
  const d = new Date();
  const dateStr = d.toISOString().slice(0,10).replace(/-/g,'');
  const rand = Math.random().toString(36).substring(2,6).toUpperCase();
  return `ORD-${dateStr}-${rand}`;
}

function fmt(n) { return '₹' + n.toFixed(0); }

function timeToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function nowMinutes() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

function fmtMins(m) {
  return `${String(Math.floor(m / 60)).padStart(2,'0')}:${String(m % 60).padStart(2,'0')}`;
}

// ─── ORDERING WINDOW LOGIC ───────────────────────────────────
// Window: openingTime  →  breakTime  (breakTime = end of pre-ordering = break starts)
// Set alwaysOpen: true in DEFAULT_SCHEDULE (credentials.js) to bypass for testing.
function checkOrderingWindow() {
  const schedule     = DEFAULT_SCHEDULE;
  const breakInput   = document.getElementById('breakTimeInput');
  const breakStatus  = document.getElementById('breakStatus');
  const closedBanner = document.getElementById('closedBanner');

  // Sync break time display (read-only for students)
  if (schedule.breakTime) breakInput.value = schedule.breakTime;

  // ── alwaysOpen override ──
  if (schedule.alwaysOpen === true) {
    orderingOpen = true;
    breakStatus.textContent = '🟢 Open';
    breakStatus.className   = 'break-status open';
    closedBanner.style.display = 'none';
    updateScheduleInfo(schedule, 0, 24 * 60);
    return;
  }

  const openingMins = timeToMinutes(schedule.openingTime || '00:00');
  const breakMins   = timeToMinutes(schedule.breakTime   || '13:00');
  const now         = nowMinutes();

  // Pre-order window: from openingTime up to (but not including) breakTime
  if (now >= openingMins && now < breakMins) {
    orderingOpen = true;
    breakStatus.textContent = '🟢 Open';
    breakStatus.className   = 'break-status open';
    closedBanner.style.display = 'none';
  } else if (now < openingMins) {
    // Before canteen opens — show countdown
    orderingOpen = false;
    const diff = openingMins - now;
    if (diff <= 30) {
      breakStatus.textContent = `⏰ Opens in ${diff}m`;
      breakStatus.className   = 'break-status soon';
    } else {
      breakStatus.textContent = `🔴 Opens ${fmtMins(openingMins)}`;
      breakStatus.className   = 'break-status closed';
    }
    closedBanner.innerHTML  = `⏳ Pre-ordering opens at <strong>${fmtMins(openingMins)}</strong>. Come back then!`;
    closedBanner.style.display = 'block';
  } else {
    // After break started — ordering closed for the day
    orderingOpen = false;
    breakStatus.textContent = '🔴 Break Started';
    breakStatus.className   = 'break-status closed';
    closedBanner.innerHTML  = `🍴 Break has started! Pre-ordering is now closed. See you tomorrow at <strong>${fmtMins(openingMins)}</strong>.`;
    closedBanner.style.display = 'block';
  }

  updateScheduleInfo(schedule, openingMins, breakMins);
}

function updateScheduleInfo(schedule, openingMins, breakMins) {
  const el = document.getElementById('scheduleInfoBar');
  if (!el) return;
  el.innerHTML = `
    <span>🟢 Pre-order opens: <strong>${schedule.openingTime || '—'}</strong></span>
    <span>🍴 Break starts (ordering closes): <strong>${schedule.breakTime || '—'}</strong></span>
  `;
}

setInterval(checkOrderingWindow, 30000);

// ─── RENDER MENU ─────────────────────────────────────────────
function renderMenu() {
  const grid  = document.getElementById('menuGrid');
  const items = currentCategory === 'all'
    ? MENU
    : MENU.filter(i => i.category === currentCategory);

  grid.innerHTML = items.map(item => {
    const qty = cart[item.id] || 0;
    return `
      <div class="menu-card" id="card-${item.id}">
        ${item.tag ? `<span class="card-tag ${item.tag}">${item.tag === 'popular' ? '🔥 Popular' : '🆕 New'}</span>` : ''}
        <div class="card-emoji">${item.emoji}</div>
        <div class="card-body">
          <div class="card-top">
            <span class="card-name">${item.name}</span>
            <span class="card-veg ${item.veg ? 'veg' : 'nonveg'}">${item.veg ? '🟢 Veg' : '🔴 Non-Veg'}</span>
          </div>
          <p class="card-desc">${item.desc}</p>
          <div class="card-footer">
            <span class="card-price">${fmt(item.price)}</span>
            ${qty === 0
              ? `<button class="add-btn" onclick="addItem(${item.id})">+ Add</button>`
              : `<div class="qty-control">
                   <button class="qty-btn" onclick="decreaseItem(${item.id})">−</button>
                   <span class="qty-display">${qty}</span>
                   <button class="qty-btn" onclick="addItem(${item.id})">+</button>
                 </div>`
            }
          </div>
        </div>
      </div>`;
  }).join('');
}

// ─── CATEGORY FILTER ─────────────────────────────────────────
document.querySelectorAll('.cat-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCategory = btn.dataset.cat;
    renderMenu();
  });
});

// ─── CART OPERATIONS ─────────────────────────────────────────
function addItem(id) {
  if (!orderingOpen) {
    showToast('⏰ Ordering is not open right now!', 'warn');
    return;
  }
  cart[id] = (cart[id] || 0) + 1;
  updateAll();
}

function decreaseItem(id) {
  if (cart[id] > 1) cart[id]--;
  else delete cart[id];
  updateAll();
}

function updateAll() {
  renderMenu();
  renderCart();
  updateCartBadge();
}

function updateCartBadge() {
  const total = Object.values(cart).reduce((s, q) => s + q, 0);
  document.getElementById('cartBadge').textContent = total;
}

// ─── RENDER CART ─────────────────────────────────────────────
function renderCart() {
  const cartItems  = document.getElementById('cartItems');
  const cartFooter = document.getElementById('cartFooter');
  const ids = Object.keys(cart).map(Number);

  if (ids.length === 0) {
    cartItems.innerHTML = `
      <div class="cart-empty">
        <span>🛒</span>
        <p>Your cart is empty</p>
        <small>Add items from the menu</small>
      </div>`;
    cartFooter.style.display = 'none';
    return;
  }

  let subtotal = 0;
  const rows = ids.map(id => {
    const item     = MENU.find(m => m.id === id);
    const qty      = cart[id];
    const lineTotal = item.price * qty;
    subtotal += lineTotal;
    return `
      <div class="cart-item">
        <span class="ci-emoji">${item.emoji}</span>
        <div class="ci-info">
          <div class="ci-name">${item.name}</div>
          <div class="ci-price">${fmt(item.price)} each</div>
        </div>
        <div class="ci-qty">
          <button class="ci-qty-btn" onclick="decreaseItem(${id})">−</button>
          <span class="ci-qty-num">${qty}</span>
          <button class="ci-qty-btn" onclick="addItem(${id})">+</button>
        </div>
        <span class="ci-total">${fmt(lineTotal)}</span>
      </div>`;
  }).join('');

  cartItems.innerHTML = rows;
  cartFooter.style.display = 'block';

  const gst   = subtotal * 0.05;
  const total = subtotal + gst;
  document.getElementById('subtotal').textContent   = fmt(subtotal);
  document.getElementById('gstAmount').textContent  = fmt(gst);
  document.getElementById('totalAmount').textContent = fmt(total);
}

// ─── CART TOGGLE ─────────────────────────────────────────────
function toggleCart() {
  document.getElementById('cartSidebar').classList.toggle('open');
  document.getElementById('cartOverlay').classList.toggle('open');
}

// ─── PAYMENT FLOW ─────────────────────────────────────────────
function proceedToPayment() {
  if (Object.keys(cart).length === 0) { showToast('🛒 Add items first!', 'warn'); return; }
  if (!orderingOpen)                  { showToast('⏰ Ordering is closed now!', 'warn'); return; }

  const ids = Object.keys(cart).map(Number);
  let subtotal = 0, summary = '';
  ids.forEach(id => {
    const item = MENU.find(m => m.id === id);
    const qty  = cart[id];
    const lt   = item.price * qty;
    subtotal  += lt;
    summary   += `${item.emoji} ${item.name} ×${qty} — ${fmt(lt)}<br>`;
  });
  const gst   = subtotal * 0.05;
  const total = subtotal + gst;
  summary    += `<br><strong>Total (incl. GST): ${fmt(total)}</strong>`;

  document.getElementById('paySummary').innerHTML = summary;

  document.getElementById('upiQRCode').innerHTML = '';
  new QRCode(document.getElementById('upiQRCode'), {
    text: `upi://pay?pa=canteen@upi&pn=CampusBite%20Canteen&am=${total.toFixed(2)}&cu=INR`,
    width: 160, height: 160,
    colorDark: '#2d3748', colorLight: '#fff',
    correctLevel: QRCode.CorrectLevel.M,
  });

  document.getElementById('paymentModal').style.display = 'flex';
  toggleCart();
}

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

function confirmPayment() {
  const orderId = genOrderId();
  const ids     = Object.keys(cart).map(Number);
  let subtotal  = 0;
  const orderItems = ids.map(id => {
    const item = MENU.find(m => m.id === id);
    const qty  = cart[id];
    subtotal  += item.price * qty;
    return { id: item.id, name: item.name, emoji: item.emoji, qty, price: item.price };
  });
  const gst   = subtotal * 0.05;
  const total = subtotal + gst;

  // Build order payload — linked to current student
  const orderPayload = {
    orderId,
    student:         currentStudent.name   || 'Student',
    studentUsername: currentStudent.username,
    studentRollNo:   currentStudent.rollNo || '',
    items:           orderItems,
    subtotal, gst, total,
    placedAt: new Date().toISOString(),
    status:   'pending',
  };

  // Save order
  localStorage.setItem(`order_${orderId}`, JSON.stringify(orderPayload));

  closeModal('paymentModal');

  // Generate ORDER QR
  document.getElementById('orderQRCode').innerHTML = '';
  new QRCode(document.getElementById('orderQRCode'), {
    text: orderId,
    width: 200, height: 200,
    colorDark: '#2d3748', colorLight: '#fff',
    correctLevel: QRCode.CorrectLevel.H,
  });

  document.getElementById('orderIdDisplay').textContent = `Order ID: ${orderId}`;
  document.getElementById('orderItemsRecap').innerHTML  = orderItems.map(i => `${i.emoji} ${i.name} × ${i.qty}`).join('<br>');
  document.getElementById('successModal').style.display = 'flex';
}

// ─── DOWNLOAD QR ──────────────────────────────────────────────
function downloadQR() {
  const canvas = document.querySelector('#orderQRCode canvas');
  const img    = document.querySelector('#orderQRCode img');
  const link   = document.createElement('a');
  link.download = 'campusbite-order-qr.png';
  link.href     = canvas ? canvas.toDataURL() : (img ? img.src : '');
  if (link.href) link.click();
}

function startNewOrder() {
  cart = {};
  closeModal('successModal');
  updateAll();
}

// ─── TOAST ───────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  let t = document.getElementById('toastEl');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toastEl';
    t.style.cssText = `
      position:fixed;bottom:32px;left:50%;transform:translateX(-50%);
      padding:12px 24px;border-radius:50px;font-family:'Poppins',sans-serif;
      font-size:0.9rem;font-weight:600;z-index:9999;
      box-shadow:0 4px 20px rgba(0,0,0,0.25);transition:opacity 0.3s;
    `;
    document.body.appendChild(t);
  }
  t.style.background = type === 'warn' ? '#e53e3e' : '#2d3748';
  t.style.color      = '#fff';
  t.textContent      = msg;
  t.style.opacity    = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.opacity = '0'; }, 3000);
}

// ─── INIT ─────────────────────────────────────────────────────
initStudentHeader();
checkOrderingWindow();
renderMenu();
