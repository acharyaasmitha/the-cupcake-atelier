const buttons = document.querySelectorAll(".add-btn");

const cartItems = document.getElementById("cart-items");

const totalDisplay = document.getElementById("total");

let cart = [];

// ADD TO CART
buttons.forEach(button => {

    button.addEventListener("click", () => {

        const card =
        button.closest(".card, .feature");

        let name = "";

        // NORMAL PRODUCTS
        if(card.querySelector(".name")){

            name =
            card.querySelector(".name").innerText;

        }

        // FEATURE PRODUCTS
        else if(card.querySelector(".feature-title")){

            name =
            card.querySelector(".feature-title").innerText;

        }

        let priceText = "";

        // NORMAL PRICE
        if(card.querySelector(".price")){

            priceText =
            card.querySelector(".price").innerText;

        }

        // FEATURE PRICE
        else if(card.querySelector(".feature-price")){

            priceText =
            card.querySelector(".feature-price").innerText;

        }

        const price =
        parseInt(priceText.replace("₹",""));

        // CHECK EXISTING ITEM
        const existingItem =
        cart.find(item => item.name === name);

        if(existingItem){

            existingItem.quantity++;

        }

        else{

            cart.push({
                name:name,
                price:price,
                quantity:1
            });

        }

        updateCart();

    });

});

// UPDATE CART
function updateCart(){

    cartItems.innerHTML = "";

    let total = 0;

    cart.forEach((item,index)=>{

        total += item.price * item.quantity;

        const div =
        document.createElement("div");

        div.classList.add("cart-item");

        div.innerHTML = `

        <div>

            <strong>${item.name}</strong>

            <br>

            ₹${item.price}

        </div>

        <div class="qty-controls">

            <button onclick="decreaseQty(${index})">
            -
            </button>

            <span>${item.quantity}</span>

            <button onclick="increaseQty(${index})">
            +
            </button>

        </div>

        `;

        cartItems.appendChild(div);

    });

    totalDisplay.innerText = total;

}

// INCREASE
function increaseQty(index){

    cart[index].quantity++;

    updateCart();

}

// DECREASE
function decreaseQty(index){

    cart[index].quantity--;

    if(cart[index].quantity <= 0){

        cart.splice(index,1);

    }

    updateCart();

}
// PLACE ORDER
document
.getElementById("place-order")
.addEventListener("click", ()=>{

    // EMPTY CART CHECK
    if(cart.length === 0){

        alert("Your cart is empty!");

        return;

    }

    const name =
    document.getElementById("name").value;

    const phone =
    document.getElementById("phone").value;

    const address =
    document.getElementById("address").value;

    const pincode =
    document.getElementById("pincode").value;

    // CHENNAI PINCODE CHECK
    if(!pincode.startsWith("600")){

        alert(
        "Sorry, delivery is available only in Chennai."
        );

        return;

    }

    // CREATE ITEM LIST
    let itemsText = "";

    cart.forEach(item => {

        itemsText +=
        `${item.name} x${item.quantity} - ₹${item.price * item.quantity}\n`;

    });

    // FINAL MESSAGE
    const message =

`NEW ORDER 🍰

Name: ${name}

Phone: ${phone}

Address:
${address}

Pincode:
${pincode}

Items:
${itemsText}

Total:
₹${totalDisplay.innerText}`;

    // OPEN WHATSAPP
    window.open(

`https://wa.me/917845509979?text=${encodeURIComponent(message)}`

    );

});
