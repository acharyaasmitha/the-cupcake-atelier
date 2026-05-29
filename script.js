// SERVICE WORKER
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").then(reg => {
    reg.addEventListener("updatefound", () => {
      const newWorker = reg.installing;
      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "activated") {
          window.location.reload();
        }
      });
    });
  });
  navigator.serviceWorker.addEventListener("message", e => {
    if (e.data && e.data.type === "RELOAD") {
      window.location.reload();
    }
  });
}

const buttons = document.querySelectorAll(".add-btn");
let cart = [];
let sets = [];
let setIdCounter = 0;

const SET_CONFIG = {
  cookies:     { sizes: [3, 6],     emoji: "🍪", label: "Cookies" },
  cheesecakes: { sizes: [4, 6, 9],  emoji: "🫐", label: "Cheesecakes" },
  cupcakes:    { sizes: [4, 6, 12], emoji: "🧁", label: "Cupcakes" }
};

function getCategory(card) {
  if (card.closest(".cookie-grid"))  return "cookies";
  if (card.closest(".cheese-grid"))  return "cheesecakes";
  if (card.closest(".list"))         return "cupcakes";
  return null;
}

// ── PERSIST CART + SETS TO SESSIONSTORAGE ────────────────
function saveCartToSession() {
  sessionStorage.setItem("ca_cart", JSON.stringify(cart));
  sessionStorage.setItem("ca_sets", JSON.stringify(sets));
  sessionStorage.setItem("ca_setIdCounter", String(setIdCounter));
}

function loadCartFromSession() {
  try {
    const savedCart    = sessionStorage.getItem("ca_cart");
    const savedSets    = sessionStorage.getItem("ca_sets");
    const savedCounter = sessionStorage.getItem("ca_setIdCounter");
    if (savedCart)    cart          = JSON.parse(savedCart);
    if (savedSets)    sets          = JSON.parse(savedSets);
    if (savedCounter) setIdCounter  = parseInt(savedCounter);
    if (cart.length > 0 || sets.length > 0) updateCart();
  } catch(e) {
    cart = []; sets = [];
  }
}

// ── RESTORE SAVED DETAILS ────────────────────────────────
window.addEventListener("load", () => {
  const saved = JSON.parse(localStorage.getItem("ca_customer") || "{}");
  if (saved.name)  document.getElementById("name").value  = saved.name;
  if (saved.phone) document.getElementById("phone").value = saved.phone;

  const session = JSON.parse(sessionStorage.getItem("ca_form") || "{}");
  if (session.address) document.getElementById("address").value   = session.address;
  if (session.pincode) document.getElementById("pincode").value   = session.pincode;
  if (session.note)    document.getElementById("order-note").value = session.note;

  loadCartFromSession();
});

// PERSIST FORM ON INPUT
["address", "pincode", "order-note"].forEach(id => {
  document.getElementById(id).addEventListener("input", () => {
    const session = {
      address: document.getElementById("address").value,
      pincode: document.getElementById("pincode").value,
      note:    document.getElementById("order-note").value
    };
    sessionStorage.setItem("ca_form", JSON.stringify(session));
  });
});

// ── SET SIZE PICKER ──────────────────────────────────────
let pendingButton = null;

function openSetPicker(name, price, category) {
  const config  = SET_CONFIG[category];
  const title   = document.getElementById("set-picker-title");
  const options = document.getElementById("set-options");
  title.innerText = `Choose a set size for ${config.emoji} ${config.label}`;
  options.innerHTML = "";

  const incompleteSets = sets.filter(s => s.category === category && s.items.length < s.size);

  if (incompleteSets.length > 0) {
    const addToLabel = document.createElement("div");
    addToLabel.className = "set-picker-sublabel";
    addToLabel.innerText = "Add to an existing set:";
    options.appendChild(addToLabel);

    incompleteSets.forEach(s => {
      const btn       = document.createElement("button");
      btn.className   = "set-option-btn";
      const remaining = s.size - s.items.length;
      const preview   = s.items.map(i => i.name).join(", ");
      btn.innerHTML   = `
        <div style="text-align:left;">
          <div class="set-label">Set of ${s.size} (${s.items.length}/${s.size} filled)</div>
          <div class="set-preview">${preview}</div>
        </div>
        <span class="set-slots">${remaining} left</span>
      `;
      btn.addEventListener("click", () => {
        addItemToSet(s.id, name, price);
        closeSetPicker();
        flashPendingButton();
        bounceCartBtn();
      });
      options.appendChild(btn);
    });

    const orLabel       = document.createElement("div");
    orLabel.className   = "set-picker-sublabel";
    orLabel.innerText   = "Or start a new set:";
    options.appendChild(orLabel);
  }

  config.sizes.forEach(size => {
    const btn       = document.createElement("button");
    btn.className   = "set-option-btn";
    btn.innerHTML   = `
      <span class="set-label">Set of ${size}</span>
      <span class="set-slots">New set</span>
    `;
    btn.addEventListener("click", () => {
      createNewSet(category, size, name, price);
      closeSetPicker();
      flashPendingButton();
      bounceCartBtn();
    });
    options.appendChild(btn);
  });

  document.getElementById("set-picker").classList.add("open");
  document.getElementById("set-overlay").classList.add("show");
}

function closeSetPicker() {
  document.getElementById("set-picker").classList.remove("open");
  document.getElementById("set-overlay").classList.remove("show");
}

function createNewSet(category, size, name, price) {
  const id = ++setIdCounter;
  sets.push({ id, category, size, items: [{ name, price }] });
  updateCart();
  saveCartToSession();
}

function addItemToSet(setId, name, price) {
  const s = sets.find(s => s.id === setId);
  if (s && s.items.length < s.size) {
    s.items.push({ name, price });
    updateCart();
    saveCartToSession();
  }
}

function removeItemFromSet(setId, itemIndex) {
  const s = sets.find(s => s.id === setId);
  if (!s) return;
  s.items.splice(itemIndex, 1);
  if (s.items.length === 0) sets = sets.filter(s => s.id !== setId);
  updateCart();
  saveCartToSession();
}

function removeSet(setId) {
  sets = sets.filter(s => s.id !== setId);
  updateCart();
  saveCartToSession();
}

// ── ADD TO CART ──────────────────────────────────────────
buttons.forEach(button => {
  button.addEventListener("click", () => {
    const card     = button.closest(".card, .feature");
    const category = getCategory(card);

    let name = card.querySelector(".name")
      ? card.querySelector(".name").innerText
      : card.querySelector(".feature-title").innerText;
    name = name.replace(/✦.*$/i, "").trim();

    let priceText = card.querySelector(".price")
      ? card.querySelector(".price").innerText
      : card.querySelector(".feature-price").innerText;
    const price = parseInt(priceText.replace("₹", ""));

    if (category) {
      pendingButton = button;
      openSetPicker(name, price, category);
    } else {
      const existing = cart.find(i => i.name === name);
      if (existing) {
        existing.quantity++;
      } else {
        cart.push({ name, price, quantity: 1 });
      }
      updateCart();
      saveCartToSession();
      flashButton(button);
      bounceCartBtn();
    }
  });
});

function flashPendingButton() {
  if (pendingButton) { flashButton(pendingButton); pendingButton = null; }
}

function flashButton(button) {
  button.innerText = "Added ✓";
  button.style.background = "#4caf50";
  setTimeout(() => {
    button.innerText = "Add to Cart";
    button.style.background = "";
  }, 1200);
}

function bounceCartBtn() {
  const btn = document.getElementById("floating-cart-btn");
  btn.classList.remove("bounce");
  void btn.offsetWidth;
  btn.classList.add("bounce");
}

// ── SCROLL / STICKY ──────────────────────────────────────
window.addEventListener("scroll", () => {
  const sticky      = document.getElementById("sticky-header");
  const floatingBtn = document.getElementById("floating-cart-btn");
  const backToTop   = document.getElementById("back-to-top");

  if (window.scrollY > 120) {
    sticky.classList.add("visible");
    floatingBtn.classList.add("hide");
    backToTop.classList.add("visible");
  } else {
    sticky.classList.remove("visible");
    floatingBtn.classList.remove("hide");
    backToTop.classList.remove("visible");
  }
});

function updateCartCounts(count) {
  document.getElementById("cart-count").innerText        = count;
  document.getElementById("cart-count-sticky").innerText = count;
}

// ── OPEN / CLOSE DRAWER ──────────────────────────────────
function openCart() {
  document.getElementById("cart-drawer").classList.add("open");
  document.getElementById("cart-overlay").classList.add("show");
  document.body.style.overflow = "hidden";
  showStep("cart");
}

function closeCart() {
  document.getElementById("cart-drawer").classList.remove("open");
  document.getElementById("cart-overlay").classList.remove("show");
  document.body.style.overflow = "";
}

function scrollToCart() { openCart(); }

function showStep(step) {
  ["cart", "summary", "checkout", "thankyou"].forEach(s => {
    document.getElementById(`step-${s}`).classList.toggle("hidden", s !== step);
  });
}

// ── CART → SUMMARY ───────────────────────────────────────
document.getElementById("go-summary").addEventListener("click", () => {
  const totalItems = sets.reduce((n, s) => n + s.items.length, 0) +
                     cart.reduce((n, i) => n + i.quantity, 0);
  if (totalItems === 0) { alert("Your cart is empty!"); return; }

  const incomplete = sets.filter(s => s.items.length < s.size);
  if (incomplete.length > 0) {
    const msgs = incomplete.map(s => {
      const config    = SET_CONFIG[s.category];
      const remaining = s.size - s.items.length;
      return `${config.emoji} ${config.label} Set of ${s.size} needs ${remaining} more item${remaining > 1 ? "s" : ""}`;
    });
    alert("Please complete your sets before checking out:\n\n" + msgs.join("\n"));
    return;
  }

  buildSummary();
  showStep("summary");
});

document.getElementById("go-checkout").addEventListener("click", () => {
  document.getElementById("total2").innerText = document.getElementById("total").innerText;
  showStep("checkout");
});

document.getElementById("back-to-cart").addEventListener("click", () => showStep("cart"));
document.getElementById("go-back").addEventListener("click",      () => showStep("summary"));

// ── BUILD SUMMARY ────────────────────────────────────────
function buildSummary() {
  const container = document.getElementById("summary-items");
  container.innerHTML = "";
  let total = 0;

  sets.forEach(s => {
    const config   = SET_CONFIG[s.category];
    const setTotal = s.items.reduce((n, i) => n + i.price, 0);
    total += setTotal;
    const div      = document.createElement("div");
    div.classList.add("summary-item");
    div.innerHTML  = `
      <div class="summary-item-info">
        <div class="summary-item-name">${config.emoji} Set of ${s.size}</div>
        <div class="summary-item-qty">${s.items.map(i => i.name).join(", ")}</div>
      </div>
      <div class="summary-item-price">₹${setTotal}</div>
    `;
    container.appendChild(div);
  });

  cart.forEach(item => {
    total += item.price * item.quantity;
    const div     = document.createElement("div");
    div.classList.add("summary-item");
    div.innerHTML = `
      <div class="summary-item-info">
        <div class="summary-item-name">${item.name}</div>
        <div class="summary-item-qty">Qty: ${item.quantity}</div>
      </div>
      <div class="summary-item-price">₹${item.price * item.quantity}</div>
    `;
    container.appendChild(div);
  });

  document.getElementById("total-summary").innerText = total;
}

// ── UPDATE CART ──────────────────────────────────────────
function updateCart() {
  const cartItems = document.getElementById("cart-items");
  cartItems.innerHTML = "";
  let total = 0;
  let count = 0;

  sets.forEach(s => {
    const config    = SET_CONFIG[s.category];
    const setTotal  = s.items.reduce((n, i) => n + i.price, 0);
    const filled    = s.items.length;
    const remaining = s.size - filled;
    const complete  = filled === s.size;
    total += setTotal;
    count += filled;

    const div = document.createElement("div");
    div.classList.add("cart-set");
    if (!complete) div.classList.add("incomplete");

    let itemsHTML = s.items.map((item, idx) => `
      <div class="set-item-row">
        <span class="set-item-name">${item.name}</span>
        <span class="set-item-price">₹${item.price}</span>
        <button class="set-item-remove" onclick="removeItemFromSet(${s.id}, ${idx})">✕</button>
      </div>
    `).join("");

    for (let i = 0; i < remaining; i++) {
      itemsHTML += `<div class="set-slot-empty">+ Add a flavour</div>`;
    }

    div.innerHTML = `
      <div class="cart-set-header">
        <div class="cart-set-title">
          ${config.emoji} ${config.label} — Set of ${s.size}
          <span class="set-progress ${complete ? "done" : ""}">${filled}/${s.size}</span>
        </div>
        <button class="remove-btn" onclick="removeSet(${s.id})">🗑</button>
      </div>
      ${!complete ? `<div class="set-nudge">Add ${remaining} more ${config.label.toLowerCase()} to complete this set</div>` : ""}
      <div class="set-items-list">${itemsHTML}</div>
      <div class="cart-set-total">Set total: ₹${setTotal}</div>
    `;
    cartItems.appendChild(div);
  });

  cart.forEach((item, index) => {
    total += item.price * item.quantity;
    count += item.quantity;
    const div     = document.createElement("div");
    div.classList.add("cart-item");
    div.innerHTML = `
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">₹${item.price} each</div>
      </div>
      <div class="qty-controls">
        <button onclick="decreaseQty(${index})">−</button>
        <span>${item.quantity}</span>
        <button onclick="increaseQty(${index})">+</button>
      </div>
      <div class="cart-item-right">
        <div class="cart-item-subtotal">₹${item.price * item.quantity}</div>
        <button class="remove-btn" onclick="removeItem(${index})">🗑</button>
      </div>
    `;
    cartItems.appendChild(div);
  });

  if (sets.length === 0 && cart.length === 0) {
    cartItems.innerHTML = `
      <div class="cart-empty">
        <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" class="empty-svg">
          <circle cx="40" cy="52" r="22" fill="#FDE8EE"/>
          <rect x="28" y="38" width="24" height="18" rx="4" fill="#E8879A"/>
          <path d="M33 38 Q40 28 47 38" stroke="#C05A72" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <circle cx="40" cy="34" r="3" fill="#C9A96E"/>
          <rect x="36" y="31" width="8" height="4" rx="2" fill="#C9A96E"/>
          <circle cx="35" cy="46" r="2" fill="#FDE8EE"/>
          <circle cx="40" cy="48" r="2" fill="#FDE8EE"/>
          <circle cx="45" cy="46" r="2" fill="#FDE8EE"/>
        </svg>
        <div class="cart-empty-text">Nothing here yet</div>
        <div class="cart-empty-sub">Add something sweet!</div>
      </div>
    `;
  }

  document.getElementById("total").innerText = total;
  updateCartCounts(count);
}

function increaseQty(index) { cart[index].quantity++; updateCart(); saveCartToSession(); }

function decreaseQty(index) {
  cart[index].quantity--;
  if (cart[index].quantity <= 0) cart.splice(index, 1);
  updateCart();
  saveCartToSession();
}

function removeItem(index) {
  cart.splice(index, 1);
  updateCart();
  saveCartToSession();
}

// ── PLACE ORDER ──────────────────────────────────────────
document.getElementById("place-order").addEventListener("click", () => {
  const name    = document.getElementById("name").value.trim();
  const phone   = document.getElementById("phone").value.trim();
  const address = document.getElementById("address").value.trim();
  const pincode = document.getElementById("pincode").value.trim();
  const note    = document.getElementById("order-note").value.trim();

  // VALIDATION
  if (!name || name.length < 2) {
    alert("Please enter your name."); return;
  }
  if (!phone || !address || !pincode) {
    alert("Please fill in all fields."); return;
  }
  if (address.length < 10) {
    alert("Please enter a complete delivery address."); return;
  }
  const phoneClean = phone.replace(/\s+/g, "");
  if (!/^\+?[0-9]{10,13}$/.test(phoneClean)) {
    alert("Please enter a valid phone number."); return;
  }
  if (!/^[0-9]{6}$/.test(pincode)) {
    alert("Please enter a valid 6-digit pincode."); return;
  }
  if (!pincode.startsWith("600")) {
    alert("Sorry, delivery is available only in Chennai."); return;
  }

  // LOADING STATE
  const placeBtn      = document.getElementById("place-order");
  placeBtn.innerText  = "Sending... 💬";
  placeBtn.disabled   = true;

  localStorage.setItem("ca_customer", JSON.stringify({ name, phone }));

  let itemsText = "";
  sets.forEach(s => {
    const config   = SET_CONFIG[s.category];
    const setTotal = s.items.reduce((n, i) => n + i.price, 0);
    itemsText += `${config.emoji} ${config.label} Set of ${s.size}:\n`;
    s.items.forEach(i => { itemsText += `  • ${i.name} — ₹${i.price}\n`; });
    itemsText += `  Subtotal: ₹${setTotal}\n\n`;
  });
  cart.forEach(item => {
    itemsText += `${item.name} x${item.quantity} — ₹${item.price * item.quantity}\n`;
  });

  const totalAmt = document.getElementById("total").innerText;

  const message =
`NEW ORDER 🍰

Name: ${name}
Phone: ${phone}
Address: ${address}
Pincode: ${pincode}

Items:
${itemsText}
Total: ₹${totalAmt}${note ? `\n\nNote: ${note}` : ""}`;

  const waUrl = `https://wa.me/917845509979?text=${encodeURIComponent(message)}`;

  // BUILD THANK YOU RECAP
  buildThankyouRecap(name, totalAmt);

  // SET FALLBACK LINK
  document.getElementById("whatsapp-fallback").href = waUrl;

  setTimeout(() => {
    window.open(waUrl);

    // RESET BUTTON
    placeBtn.innerText = "Place Order via WhatsApp 💬";
    placeBtn.disabled  = false;

    // CLEAR CART & SESSION
    cart = []; sets = [];
    updateCart();
    saveCartToSession();
    sessionStorage.removeItem("ca_form");
    ["address", "pincode", "order-note"].forEach(id => {
      document.getElementById(id).value = "";
    });

    const saved = JSON.parse(localStorage.getItem("ca_customer") || "{}");
    if (saved.name)  document.getElementById("name").value  = saved.name;
    if (saved.phone) document.getElementById("phone").value = saved.phone;

    showStep("thankyou");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, 600);
});

// ── THANK YOU RECAP ──────────────────────────────────────
function buildThankyouRecap(name, total) {
  const recap = document.getElementById("thankyou-recap");
  let html    = `<div class="recap-name">Order for ${name}</div>`;

  sets.forEach(s => {
    const config   = SET_CONFIG[s.category];
    const setTotal = s.items.reduce((n, i) => n + i.price, 0);
    html += `
      <div class="recap-item">
        <span>${config.emoji} ${config.label} Set of ${s.size}</span>
        <span>₹${setTotal}</span>
      </div>
    `;
  });

  cart.forEach(item => {
    html += `
      <div class="recap-item">
        <span>${item.name} × ${item.quantity}</span>
        <span>₹${item.price * item.quantity}</span>
      </div>
    `;
  });

  html += `<div class="recap-total"><span>Total</span><span>₹${total}</span></div>`;
  recap.innerHTML = html;
}

// ── SCROLL REVEAL ────────────────────────────────────────
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("revealed");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll(".reveal").forEach(el => observer.observe(el));

// ── SWIPE TO DISMISS ─────────────────────────────────────
(function() {
  const drawer = document.getElementById("cart-drawer");
  let startX = 0;
  let isDragging = false;

  drawer.addEventListener("touchstart", e => {
    startX = e.touches[0].clientX;
    isDragging = true;
  }, { passive: true });

  drawer.addEventListener("touchmove", e => {
    if (!isDragging) return;
    const diff = e.touches[0].clientX - startX;
    if (diff > 0) drawer.style.transform = `translateX(${diff}px)`;
  }, { passive: true });

  drawer.addEventListener("touchend", e => {
    if (!isDragging) return;
    isDragging = false;
    const diff = e.changedTouches[0].clientX - startX;
    if (diff > 100) closeCart();
    drawer.style.transform = "";
  });
})();

// ── PREVENT PULL TO REFRESH ──────────────────────────────
document.body.addEventListener("touchmove", e => {
  if (document.body.style.overflow === "hidden") e.preventDefault();
}, { passive: false });
// SHOW EMPTY STATE ON INITIAL LOAD
updateCart();
