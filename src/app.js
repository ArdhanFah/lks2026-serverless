/**
 * TokoBaju.id — Order System Frontend
 * LKS Komputasi Awan 2026 — Provinsi Jawa Timur
 *
 * KONFIGURASI: Ganti API_URL dengan output Terraform (api_gateway_url)
 */

const API_URL = "https://0mtnvvjfc6.execute-api.us-east-1.amazonaws.com/prod/orders";

// ─── State ───────────────────────────────────────
let items = [];
let stats = { total: 0, success: 0, failed: 0 };
let orders = [];

// ─── Init ─────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  addItem(); // mulai dengan 1 item
  updateTotal();
});

// ─── Items ────────────────────────────────────────
function addItem() {
  const id = Date.now();
  items.push({ id, product_id: "", qty: 1, price: 0 });
  renderItems();
}

function removeItem(id) {
  items = items.filter(i => i.id !== id);
  renderItems();
  updateTotal();
}

function updateItemField(id, field, value) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  if (field === "qty")   item.qty   = parseInt(value) || 1;
  if (field === "price") item.price = parseFloat(value) || 0;
  if (field === "product_id") item.product_id = value;
  updateTotal();
}

function renderItems() {
  const list = document.getElementById("items-list");
  list.innerHTML = items.map(item => `
    <div class="item-row">
      <input
        type="text"
        placeholder="Kode produk (mis. BAJU-001)"
        value="${item.product_id}"
        oninput="updateItemField(${item.id}, 'product_id', this.value)"
      >
      <input
        type="number"
        min="1"
        value="${item.qty}"
        placeholder="Qty"
        oninput="updateItemField(${item.id}, 'qty', this.value)"
      >
      <input
        type="number"
        min="0"
        value="${item.price || ''}"
        placeholder="Harga"
        oninput="updateItemField(${item.id}, 'price', this.value)"
      >
      <button class="btn-icon" onclick="removeItem(${item.id})" title="Hapus">✕</button>
    </div>
  `).join("");

  document.getElementById("item-count").textContent = `${items.length} item`;
}

function updateTotal() {
  const total = items.reduce((sum, i) => sum + (i.qty * i.price), 0);
  document.getElementById("total-display").textContent =
    "Rp " + total.toLocaleString("id-ID");
}

function getTotal() {
  return items.reduce((sum, i) => sum + (i.qty * i.price), 0);
}

// ─── Submit Order ─────────────────────────────────
async function submitOrder() {
  const name   = document.getElementById("customer_name").value.trim();
  const email  = document.getElementById("customer_email").value.trim();
  const method = document.getElementById("payment_method").value;

  // Validasi client-side
  if (!name || !email) {
    showAlert("Nama dan email wajib diisi!", "error");
    return;
  }
  const validItems = items.filter(i => i.product_id && i.qty > 0 && i.price > 0);
  if (validItems.length === 0) {
    showAlert("Tambahkan minimal 1 item dengan kode produk, qty, dan harga!", "error");
    return;
  }

  const payload = {
    customer_name:   name,
    customer_email:  email,
    payment_method:  method,
    items:           validItems.map(({ product_id, qty, price }) => ({ product_id, qty, price })),
    total_amount:    getTotal(),
  };

  // UI: loading state
  const btn = document.getElementById("submit-btn");
  btn.disabled = true;
  btn.textContent = "MENGIRIM...";
  btn.classList.add("loading");

  // Reset & animasi pipeline
  resetPipeline();
  showStatusLoading();
  animatePipeline();

  try {
    const res = await fetch(API_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });

    const data = await res.json();

    if (res.ok && data.order_id) {
      completePipeline(true);
      showStatusSuccess(data, payload);
      addToHistory({ ...data, customer_name: name, total: getTotal(), status: "QUEUED" });
      stats.total++;
      stats.success++;
    } else {
      completePipeline(false);
      showStatusError(data.error || "Terjadi kesalahan pada server");
      stats.total++;
      stats.failed++;
    }
  } catch (err) {
    completePipeline(false);
    showStatusError("Tidak dapat terhubung ke API. Pastikan API_URL sudah dikonfigurasi.");
    stats.total++;
    stats.failed++;
  } finally {
    btn.disabled = false;
    btn.textContent = "KIRIM PESANAN";
    btn.classList.remove("loading");
    updateStats();
  }
}

// ─── Pipeline Animation ───────────────────────────
let pipeTimer = null;

function resetPipeline() {
  if (pipeTimer) clearTimeout(pipeTimer);
  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById(`pipe-${i}`);
    el.className = "pipe-step";
    el.querySelector(".pipe-dot").textContent = i;
  }
}

function animatePipeline() {
  const delays = [0, 600, 1400, 2200, 3000];
  delays.forEach((delay, idx) => {
    setTimeout(() => {
      const el = document.getElementById(`pipe-${idx + 1}`);
      if (el) el.classList.add("active");
    }, delay);
  });
}

function completePipeline(success) {
  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById(`pipe-${i}`);
    el.classList.remove("active");
    el.classList.add(success ? "done" : "failed");
    el.querySelector(".pipe-dot").textContent = success ? "✓" : "✕";
  }
}

// ─── Status UI ────────────────────────────────────
function showStatusLoading() {
  const el = document.getElementById("order-status");
  document.getElementById("status-empty").style.display = "none";
  el.className = "order-status visible";
  el.innerHTML = `
    <div class="status-card" style="border-color:rgba(232,255,71,.25);background:rgba(232,255,71,.04)">
      <div class="status-icon">⏳</div>
      <div class="status-title" style="color:var(--accent)">MEMPROSES...</div>
      <div style="font-size:.8rem;color:var(--muted);margin-top:.5rem;font-family:var(--mono)">
        Menghubungi AWS API Gateway...
      </div>
    </div>
  `;
}

function showStatusSuccess(data, payload) {
  const el = document.getElementById("order-status");
  el.innerHTML = `
    <div class="status-card success">
      <div class="status-icon">✅</div>
      <div class="status-title success">ORDER BERHASIL DIKIRIM</div>
      <div style="margin-top:1rem">
        <div class="meta-row">
          <span class="key">Order ID</span>
          <span class="val" style="color:var(--accent)">${data.order_id}</span>
        </div>
        <div class="meta-row">
          <span class="key">Status</span>
          <span class="val">${data.status}</span>
        </div>
        <div class="meta-row">
          <span class="key">Total</span>
          <span class="val">Rp ${payload.total_amount.toLocaleString("id-ID")}</span>
        </div>
        <div class="meta-row">
          <span class="key">Execution ARN</span>
          <span class="val">${(data.execution_arn || "-").slice(-24)}...</span>
        </div>
        <div class="meta-row">
          <span class="key">Pesan</span>
          <span class="val">${data.message}</span>
        </div>
      </div>
    </div>
  `;
}

function showStatusError(msg) {
  const el = document.getElementById("order-status");
  el.innerHTML = `
    <div class="status-card error">
      <div class="status-icon">❌</div>
      <div class="status-title error">ORDER GAGAL</div>
      <div style="margin-top:.75rem;font-size:.82rem;color:var(--muted);font-family:var(--mono)">
        ${msg}
      </div>
    </div>
  `;
}

function showAlert(msg, type) {
  const el = document.getElementById("order-status");
  document.getElementById("status-empty").style.display = "none";
  el.className = "order-status visible";
  el.innerHTML = `
    <div class="status-card ${type}">
      <div class="status-title ${type}">⚠ PERINGATAN</div>
      <div style="margin-top:.5rem;font-size:.82rem;color:var(--muted)">${msg}</div>
    </div>
  `;
}

// ─── History ──────────────────────────────────────
function addToHistory(order) {
  orders.unshift(order);
  const list = document.getElementById("order-list");

  if (orders.length === 1) list.innerHTML = ""; // hapus placeholder

  const item = document.createElement("div");
  item.className = "order-item";
  item.innerHTML = `
    <div class="order-item-left">
      <span class="order-id">${order.order_id}</span>
      <span class="order-name">${order.customer_name}</span>
    </div>
    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:.3rem">
      <span class="order-amt">Rp ${order.total.toLocaleString("id-ID")}</span>
      <span class="badge queued">QUEUED</span>
    </div>
  `;
  list.prepend(item);

  // Simulasi status update setelah 4 detik
  setTimeout(() => {
    const badge = item.querySelector(".badge");
    const rand = Math.random();
    if (rand > 0.15) {
      badge.className = "badge success";
      badge.textContent = "SUKSES";
    } else {
      badge.className = "badge failed";
      badge.textContent = "GAGAL";
    }
  }, 4000);
}

// ─── Stats ────────────────────────────────────────
function updateStats() {
  document.getElementById("stat-total").textContent   = stats.total;
  document.getElementById("stat-success").textContent = stats.success;
  document.getElementById("stat-failed").textContent  = stats.failed;
}
