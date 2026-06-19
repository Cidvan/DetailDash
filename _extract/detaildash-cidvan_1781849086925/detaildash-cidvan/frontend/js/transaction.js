document.addEventListener('DOMContentLoaded', function () {
    // Get DOM elements
    const modal = document.getElementById("myModal");
    const addTransactionButton = document.getElementById("addTransactionButton");
    const productSearch = document.getElementById("productSearch");
    const categorySelect = document.getElementById("categorySelect"); // New category select
    const orderDateInput = document.getElementById("orderDate");
    const customerNameInput = document.getElementById("customername");
    const productGrid = document.getElementById("productGrid");
    const cartItemsContainer = document.getElementById("cartItems");
    const grandTotalElement = document.getElementById("grandTotal");
    const checkoutBtn = document.getElementById("checkoutBtn");
    const purchaseListTableBody = document.querySelector("#services-section .menu-table tbody");
    const closeModalBtn = document.getElementById("closeModalBtn");
    const paymentInput = document.getElementById("payment"); // New payment input
    const changeOutput = document.getElementById("change");   // New change output
    const finalizeCheckoutBtn = document.getElementById("finalizeCheckoutBtn"); // Renamed checkout button

    // Initial data
    const products = [
        { id: 1, name: "Wash", price: 200, image: "https://via.placeholder.com/150", category: "Service" },
        { id: 2, name: "Vacuum", price: 150, image: "https://via.placeholder.com/150", category: "Service" },
        { id: 3, name: "Wax", price: 1450, image: "https://via.placeholder.com/150", category: "Product" },
        { id: 4, name: "Interior Cleaning", price: 999, image: "https://via.placeholder.com/150", category: "Service" },
        { id: 5, name: "Black Tire", price: 99, image: "https://via.placeholder.com/150", category: "Product" },
        { id: 6, name: "Triple Foam", price: 489, image: "https://via.placeholder.com/150", category: "Service" },
        { id: 7, name: "Engine Wash", price: 1999, image: "https://via.placeholder.com/150", category: "Service" },
        { id: 8, name: "Under Wash", price: 3199, image: "https://via.placeholder.com/150", category: "Service" },
        { id: 9, name: "Quick Dry Towel", price: 450, image: "https://via.placeholder.com/150", category: "Product" },
        { id: 10, name: "Liquid Soap", price: 680, image: "https://via.placeholder.com/150", category: "Product" },
        { id: 11, name: "Wiper", price: 900, image: "https://via.placeholder.com/150", category: "Product" },
    ];

    // Get unique categories
    const categories = ["All", ...new Set(products.map(p => p.category))];

    // Populate category dropdown
    function populateCategories() {
        categories.forEach(category => {
            const option = document.createElement("option");
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });
    }
    populateCategories();

    let cart = [];
    let purchases = [];
    let currentOrderDate = "";
    let currentCustomerName = "";
    let editingTransactionId = null;

    // Generate a unique transaction ID
    function generateTransactionId() {
        return String(Date.now()).slice(-4);
    }

    // Render filtered product cards
    function renderProducts() {
        productGrid.innerHTML = "";
        const selectedCategory = categorySelect.value;

        const filteredProducts = products.filter(product => {
            const searchMatch = product.name.toLowerCase().includes(productSearch.value.toLowerCase());
            const categoryMatch = selectedCategory === "All" || product.category === selectedCategory;
            return searchMatch && categoryMatch;
        });

        filteredProducts.forEach(product => {
            const card = document.createElement("div");
            card.className = "product-card";
            card.innerHTML = `
                <img src="${product.image}" alt="${product.name}">
                <h3>${product.name}</h3>
                <p>Price: ₱${product.price}</p>
                <button class="btn btn-primary btn-sm add-to-cart-btn" data-product-id="${product.id}">Add to Cart</button>
            `;
            productGrid.appendChild(card);

            card.querySelector(".add-to-cart-btn").addEventListener("click", () => addToCart(product.id));
        });
    }

    // Add product to cart
    function addToCart(productId) {
        const existingItem = cart.find(item => item.product.id === productId);

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            const product = products.find(p => p.id === productId);
            cart.push({ product, quantity: 1 });
        }

        renderCart();
        updatePaymentSummary();
    }

    // Remove product from cart
    function removeFromCart(productId) {
        cart = cart.filter(item => item.product.id !== productId);
        renderCart();
        updatePaymentSummary();
    }

    // Display cart contents
    // Display cart contents
    function renderCart() {
        cartItemsContainer.innerHTML = "";

        cart.forEach(item => {
            const cartItem = document.createElement("div");
            cartItem.className = "list-group-item d-flex justify-content-between align-items-center"; // Bootstrap list item with flex layout
            cartItem.innerHTML = `
                <div>${item.product.name} x ${item.quantity}</div>
                <div>
                    <span class="badge bg-secondary rounded-pill">₱${(item.product.price * item.quantity).toFixed(2)}</span>
                    <button class="btn btn-danger btn-sm ms-2 remove-from-cart-btn" data-product-id="${item.product.id}">Remove</button>
                </div>
            `;
            cartItemsContainer.appendChild(cartItem);

            cartItem.querySelector(".remove-from-cart-btn").addEventListener("click", () =>
                removeFromCart(item.product.id)
            );
        });
    }

    // Update the payment summary
    function updatePaymentSummary() {
        const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
        grandTotalElement.textContent = `₱${total.toFixed(2)}`;
        calculateChange(); // Update change display
    }

    // Calculate change
    function calculateChange() {
        const total = parseFloat(grandTotalElement.textContent.slice(1)); // Remove '₱' and parse
        const payment = parseFloat(paymentInput.value) || 0;
        const change = payment - total;
        changeOutput.textContent = `₱${change.toFixed(2)}`;
    }

    // Display all purchases in the table
    function updatePurchaseList() {
        purchaseListTableBody.innerHTML = "";

        purchases.forEach(purchase => {
            const row = purchaseListTableBody.insertRow();
            row.insertCell().textContent = purchase.transactionId;
            row.insertCell().textContent = purchase.date;
            row.insertCell().textContent = purchase.customer;
            row.insertCell().textContent = `₱${purchase.totalAmount.toFixed(2)}`;

            const actionsCell = row.insertCell();
            const actionButtons = document.createElement("div");
            actionButtons.className = "action-buttons";

            const editBtn = document.createElement("button");
            editBtn.className = "edit";
            editBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 16px;">edit</span>';
            editBtn.addEventListener("click", () => editPurchase(purchase.transactionId));

            const deleteBtn = document.createElement("button");
            deleteBtn.className = "delete";
            deleteBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 16px;">delete</span>';
            deleteBtn.addEventListener("click", () => deletePurchase(purchase.transactionId));

            actionButtons.appendChild(editBtn);
            actionButtons.appendChild(deleteBtn);
            actionsCell.appendChild(actionButtons);
        });
    }

    // Save current cart as a purchase
    function checkout() {
        if (!cart.length) return alert("Your cart is empty!");
        if (!currentOrderDate) return alert("Please select an order date!");
        if (!currentCustomerName) return alert("Please enter the customer name!");

        const totalAmount = parseFloat(grandTotalElement.textContent.slice(1));
        const transactionId = editingTransactionId || generateTransactionId();

        const newPurchase = {
            transactionId,
            date: currentOrderDate,
            customer: currentCustomerName,
            items: [...cart],
            totalAmount
        };

        if (editingTransactionId) {
            purchases = purchases.map(p => p.transactionId === transactionId ? newPurchase : p);
            editingTransactionId = null;
        } else {
            purchases.push(newPurchase);
        }

        // Reset form and UI
        cart = [];
        currentOrderDate = "";
        currentCustomerName = "";
        orderDateInput.value = "";
        customerNameInput.value = "";
        paymentInput.value = ""; // Clear payment input
        changeOutput.textContent = "₱0.00"; // Reset change
        renderCart();
        updatePaymentSummary();
        updatePurchaseList();

        const myModalInstance = bootstrap.Modal.getInstance(modal);
        if (myModalInstance) myModalInstance.hide();
    }

    // Load purchase into modal for editing
    function editPurchase(transactionId) {
        const purchase = purchases.find(p => p.transactionId === transactionId);
        if (!purchase) return;

        editingTransactionId = transactionId;
        cart = [...purchase.items];
        currentOrderDate = purchase.date;
        currentCustomerName = purchase.customer;

        orderDateInput.value = currentOrderDate;
        customerNameInput.value = currentCustomerName;
        renderCart();
        updatePaymentSummary();

        new bootstrap.Modal(modal).show();
    }

    // Delete purchase from the list
    function deletePurchase(transactionId) {
        if (confirm("Are you sure you want to delete this purchase?")) {
            purchases = purchases.filter(p => p.transactionId !== transactionId);
            updatePurchaseList();
        }
    }

    // Event listeners
    productSearch.addEventListener("input", renderProducts);
    categorySelect.addEventListener("change", renderProducts); // Listen for category change
    orderDateInput.addEventListener("change", e => currentOrderDate = e.target.value);
    customerNameInput.addEventListener("input", e => currentCustomerName = e.target.value);
    // checkoutBtn.addEventListener("click", checkout); // Changed to finalizeCheckoutBtn
    paymentInput.addEventListener("input", calculateChange);
    finalizeCheckoutBtn.addEventListener("click", checkout);

    // Open modal and reset inputs
    if (addTransactionButton && modal) {
        addTransactionButton.addEventListener("click", () => {
            editingTransactionId = null;
            cart = [];
            currentOrderDate = "";
            currentCustomerName = "";
            orderDateInput.value = "";
            customerNameInput.value = "";
            paymentInput.value = ""; // Clear payment input
            changeOutput.textContent = "₱0.00"; // Reset change
            categorySelect.value = "All"; // Reset category
            renderProducts();
            renderCart();
            updatePaymentSummary();

            const existingModal = bootstrap.Modal.getInstance(modal);
            if (existingModal) existingModal.hide();

            new bootstrap.Modal(modal).show();
        });
    }

    // Close modal manually
    if (closeModalBtn && modal) {
        closeModalBtn.addEventListener("click", () => {
            const myModalInstance = bootstrap.Modal.getInstance(modal);
            if (myModalInstance) myModalInstance.hide();
        });
    }

    // Initialize page
    renderProducts();
    renderCart();
    updatePaymentSummary();
    updatePurchaseList();
});