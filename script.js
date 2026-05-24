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

// STICKY HEADER + BACK TO TOP ON SCROLL
window.addEventListener("scroll", () => {
  const sticky     = document.getElementById("sticky-header");
  const floatingBtn = document.getElementById("floating-cart-btn");
  const backToTop  = document.getElementById("back-to-top");

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

  const divider = document.createElement("div");
  divider.classList.add("summary-divider");
  container.appendChild(divider);

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
    cartItems.innerHTML = `<div class="cart-empty">Nothing here yet 🍰<br><span>Add something sweet!</span></div>`;
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

  // CLEAR CART & SHOW THANK YOU
  cart = [];
  updateCart();
  ["name","phone","address","pincode","order-note"].forEach(id => {
    document.getElementById(id).value = "";
  });

  // RESTORE SAVED NAME & PHONE IMMEDIATELY
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
}, { threshold: 0.1 });

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
    if (diff > 0) {
      drawer.style.transform = `translateX(${diff}px)`;
    }
  }, { passive: true });

  drawer.addEventListener("touchend", e => {
    if (!isDragging) return;
    isDragging = false;
    const diff = e.changedTouches[0].clientX - startX;
    if (diff > 100) {
      closeCart();
    }
    drawer.style.transform = "";
  });
})();

// PREVENT PULL TO REFRESH
document.body.addEventListener("touchmove", e => {
  if (document.body.style.overflow === "hidden") {
    e.preventDefault();
  }
}, { passive: false });
