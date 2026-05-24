// SERVICE WORKER
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js");
}

const buttons = document.querySelectorAll(".add-btn");
let cart = [];

// RESTORE SAVED DETAILS
window.addEventListener("load", () => {
  const saved = JSON.parse(localStorage.getItem("ca_customer") || "{}");
  if (saved.name)  document.getElementById("name").value  = saved.name;
  if (saved.phone) document.getElementById("phone").value = saved.phone;

  // RESTORE SESSION FORM DATA
  const session = JSON.parse(sessionStorage.getItem("ca_form") || "{}");
  if (session.address) document.getElementById("address").value = session.address;
  if (session.pincode) document.getElementById("pincode").value = session.pincode;
  if (session.note)    document.getElementById("order-note").value = session.note;
});

// PERSIST FORM TO SESSIONSTORE ON INPUT
["address","pincode","order-note"].forEach(id => {
  document.getElementById(id).addEventListener("input", () => {
    const session = {
      address: document.getElementById("address").value,
      pincode: document.getElementById("pincode").value,
      note:    document.getElementById("order-note").value
    };
    sessionStorage.setItem("ca_form", JSON.stringify(session));
  });
});

// ADD TO CART
buttons.forEach(button => {
  button.addEventListener("click", () => {
    const card = button.closest(".card, .feature");

    let name = card.querySelector(".name")
      ? card.querySelector(".name").innerText
      : card.querySelector(".feature-title").innerText;

    name = name.replace(/✦.*$/i, "").trim();

    let priceText = card.querySelector(".price")
      ? card.querySelector(".price").innerText
      : card.querySelector(".feature-price").innerText;

    const price = parseInt(priceText.replace("₹", ""));
    const existing = cart.find(i => i.name === name);

    if (existing) {
      existing.quantity++;
    } else {
      cart.push({ name, price, quantity: 1 });
    }

    updateCart();
    flashButton(button);
    bounceCartBtn();
    updateCatNav();
  });
});

// BUTTON FEEDBACK
function flashButton(button) {
  button.innerText = "Added ✓";
  button.style.background = "#4caf50";
  setTimeout(() => {
    button.innerText = "Add to Cart";
    button.style.background = "";
  }, 1200);
}

// BOUNCE CART BUTTON
function bounceCartBtn() {
  const btn = document.getElementById("floating-cart-btn");
  btn.classList.remove("bounce");
  void btn.offsetWidth;
  btn.classList.add("bounce");
}

// STICKY HEADER + BACK TO TOP + CAT NAV ON SCROLL
window.addEventListener("scroll", () => {
  const sticky      = document.getElementById("sticky-header");
  const floatingBtn = document.getElementById("floating-cart-btn");
  const backToTop   = document.getElementById("back-to-top");
  const catNav      = document.getElementById("cat-nav");

  if (window.scrollY > 120) {
    sticky.classList.add("visible");
    floatingBtn.classList.add("hide");
    backToTop.classList.add("visible");
    catNav.classList.add("scrolled");
  } else {
    sticky.classList.remove("visible");
    floatingBtn.classList.remove("hide");
    backToTop.classList.remove("visible");
    catNav.classList.remove("scrolled");
  }

  // HIGHLIGHT ACTIVE CATEGORY
  const sections = [
    { id: "sec-cookies",     btn: 0 },
    { id: "sec-cheesecakes", btn: 1 },
    { id: "sec-cupcakes",    btn: 2 }
  ];
  let current = 0;
  sections.forEach((s, i) => {
    const el = document.getElementById(s.id);
    if (el && window.scrollY >= el.offsetTop - 160) current = i;
  });
  document.querySelectorAll(".cat-pill").forEach((pill, i) => {
    pill.classList.toggle("active", i === current);
  });
});

// SCROLL TO SECTION
function scrollToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const offset = 130;
  const top = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior: "smooth" });
}

// SYNC BOTH CART COUNTS
function updateCartCounts(count) {
  document.getElementById("cart-count").innerText        = count;
  document.getElementById("cart-count-sticky").innerText = count;
}

// OPEN / CLOSE DRAWER
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

// STEP SWITCHING
function showStep(step) {
  ["cart","summary","checkout","thankyou"].forEach(s => {
    document.getElementById(`step-${s}`).classList.toggle("hidden", s !== step);
  });
}

// CART → SUMMARY
document.getElementById("go-summary").addEventListener("click", () => {
  if (cart.length === 0) { alert("Your cart is empty!"); return; }
  buildSummary();
  showStep("summary");
});

// SUMMARY → CHECKOUT
document.getElementById("go-checkout").addEventListener("click", () => {
  document.getElementById("total2").innerText = document.getElementById("total").innerText;
  showStep("checkout");
});

// BACK BUTTONS
document.getElementById("back-to-cart").addEventListener("click", () => showStep("cart"));
document.getElementById("go-back").addEventListener("click",      () => showStep("summary"));

// BUILD SUMMARY
function buildSummary() {
  const container = document.getElementById("summary-items");
  container.innerHTML = "";
  let total = 0;

  cart.forEach(item => {
    total += item.price * item.quantity;
    const div = document.createElement("div");
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

// UPDATE CART
function updateCart() {
  const cartItems = document.getElementById("cart-items");
  cartItems.innerHTML = "";
  let total = 0;
  let count = 0;

  cart.forEach((item, index) => {
    total += item.price * item.quantity;
    count += item.quantity;

    const div = document.createElement("div");
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

  if (cart.length === 0) {
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

function increaseQty(index) { cart[index].quantity++; updateCart(); }

function decreaseQty(index) {
  cart[index].quantity--;
  if (cart[index].quantity <= 0) cart.splice(index, 1);
  updateCart();
}

function removeItem(index) {
  cart.splice(index, 1);
  updateCart();
}

// UPDATE CATEGORY NAV ACTIVE STATE
function updateCatNav() {
  // just re-trigger scroll check
  window.dispatchEvent(new Event("scroll"));
}

// PLACE ORDER
document.getElementById("place-order").addEventListener("click", () => {
  const name    = document.getElementById("name").value.trim();
  const phone   = document.getElementById("phone").value.trim();
  const address = document.getElementById("address").value.trim();
  const pincode = document.getElementById("pincode").value.trim();
  const note    = document.getElementById("order-note").value.trim();

  if (!name || !phone || !address || !pincode) {
    alert("Please fill in all fields."); return;
  }

  // PHONE VALIDATION
  const phoneClean = phone.replace(/\s+/g, "");
  if (!/^\+?[0-9]{10,13}$/.test(phoneClean)) {
    alert("Please enter a valid phone number."); return;
  }

  // PINCODE VALIDATION
  if (!/^[0-9]{6}$/.test(pincode)) {
    alert("Please enter a valid 6-digit pincode."); return;
  }
  if (!pincode.startsWith("600")) {
    alert("Sorry, delivery is available only in Chennai."); return;
  }

  // SAVE CUSTOMER DETAILS
  localStorage.setItem("ca_customer", JSON.stringify({ name, phone }));

  let itemsText = "";
  cart.forEach(item => {
    itemsText += `${item.name} x${item.quantity} — ₹${item.price * item.quantity}\n`;
  });

  const message =
`NEW ORDER 🍰

Name: ${name}
Phone: ${phone}
Address: ${address}
Pincode: ${pincode}

Items:
${itemsText}
Total: ₹${document.getElementById("total").innerText}${note ? `\n\nNote: ${note}` : ""}`;

  window.open(`https://wa.me/917845509979?text=${encodeURIComponent(message)}`);

  // CLEAR CART & SESSION
  cart = [];
  updateCart();
  sessionStorage.removeItem("ca_form");
  ["address","pincode","order-note"].forEach(id => {
    document.getElementById(id).value = "";
  });

  // RESTORE SAVED NAME & PHONE
  const saved = JSON.parse(localStorage.getItem("ca_customer") || "{}");
  if (saved.name)  document.getElementById("name").value  = saved.name;
  if (saved.phone) document.getElementById("phone").value = saved.phone;

  showStep("thankyou");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// INTERSECTION OBSERVER — SCROLL REVEAL
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("revealed");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll(".reveal").forEach(el => observer.observe(el));

// SWIPE TO DISMISS DRAWER
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

// PREVENT PULL TO REFRESH
document.body.addEventListener("touchmove", e => {
  if (document.body.style.overflow === "hidden") e.preventDefault();
}, { passive: false });
