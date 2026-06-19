document.addEventListener('DOMContentLoaded', () => {
    // 🔹 DOM ELEMENTS
    const modal = document.getElementById("myModal");
    const invoiceModalEl = document.getElementById("invoiceModal");
    const addTransactionButton = document.getElementById("addTransactionButton");
    const productSearch = document.getElementById("productSearch");
    const categorySelect = document.getElementById("categorySelect");
    const orderDateInput = document.getElementById("orderDate");
    const customerNameInput = document.getElementById("customername");
    const productGrid = document.getElementById("productGrid");
    const cartItemsContainer = document.getElementById("cartItems");
    const grandTotalElement = document.getElementById("grandTotal");
    const paymentInput = document.getElementById("payment");
    const changeOutput = document.getElementById("change");
    const checkoutBtn = document.getElementById("checkoutBtn");
    const finalizeCheckoutBtn = document.getElementById("finalizeCheckoutBtn");
    const closeModalBtn = document.getElementById("closeModalBtn");
    const purchaseListTableBody = document.querySelector("#services-section .menu-table tbody");

    // 🔹 STATE
    let products = [], services = [], cart = [], purchases = [];
    let currentOrderDate = "", currentCustomerName = "", editingTransactionId = null;

    // 🔹 INITIALIZATION
    fetchCategoriesFromDB();
    fetchTransactionsFromDB();
    renderCart();
    renderItems();
    updatePaymentSummary();

    // 🔸 FETCHING
    function fetchCategoriesFromDB() {
        Promise.all([
            fetch('/api/products').then(res => res.json()),
            fetch('/api/services').then(res => res.json())
        ])
        .then(([productData, serviceData]) => {
            products = productData;
            services = serviceData;
            populateCategories();
            renderItems();
        })
        .catch(err => console.error('Failed to fetch categories:', err));
    }

    function fetchTransactionsFromDB() {
        fetch('/api/transactions')
            .then(res => res.json())
            .then(data => {
                purchases = data;
                updatePurchaseList();
            })
            .catch(err => console.error('Failed to fetch transactions:', err));
    }

    // 🔸 UI HELPERS
    function populateCategories() {
        categorySelect.innerHTML = "";
        const productCategories = products.map(p => p.category);
        const serviceCategories = services.map(s => s.category);
        const categories = ["All", ...new Set([...productCategories, ...serviceCategories])];

        categories.forEach(category => {
            const option = document.createElement("option");
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });
    }

    function generateTransactionId() {
        return String(Date.now()).slice(-4);
    }

    // 🔸 RENDERING
    function renderItems() {
        productGrid.innerHTML = "";
        const selectedCategory = categorySelect.value;
        const searchTerm = productSearch.value.toLowerCase();

        const items = [
            ...products.map(p => ({ ...p, type: "product" })),
            ...services.map(s => ({ ...s, type: "service" }))
        ];

        items
            .filter(item =>
                item.name.toLowerCase().includes(searchTerm) &&
                (selectedCategory === "All" || item.category === selectedCategory)
            )
            .forEach(item => {
                const card = document.createElement("div");
                card.className = "product-card";
                card.innerHTML = `
                    <img src="${item.image}" alt="${item.name}" />
                    <h3>${item.name}</h3>
                    <p>Price: ₱${item.price}</p>
                    <button class="btn btn-primary btn-sm add-to-cart-btn" data-id="${item.id}" data-type="${item.type}">Add to Cart</button>
                `;
                productGrid.appendChild(card);

                card.querySelector(".add-to-cart-btn").addEventListener("click", () => {
                    item.type === "product" ? addToCart(item.id) : addServiceToCart(item.id);
                });
            });
    }

    function renderCart() {
        cartItemsContainer.innerHTML = "";
        cart.forEach(item => {
            const entity = item.product || item.service;
            const id = entity.id;

            const cartItem = document.createElement("div");
            cartItem.className = "list-group-item d-flex justify-content-between align-items-center";
            cartItem.innerHTML = `
                <div>${entity.name} x ${item.quantity}</div>
                <div>
                    <span class="badge bg-secondary rounded-pill">₱${(entity.price * item.quantity).toFixed(2)}</span>
                    <button class="btn btn-danger btn-sm ms-2 remove-from-cart-btn" data-id="${id}" data-type="${item.product ? 'product' : 'service'}">Remove</button>
                </div>
            `;
            cartItemsContainer.appendChild(cartItem);

            cartItem.querySelector(".remove-from-cart-btn").addEventListener("click", () => {
                item.product ? removeFromCart(id) : removeServiceFromCart(id);
            });
        });
    }

    function updatePaymentSummary() {
        const total = cart.reduce((sum, item) => {
            const price = item.product ? item.product.price : item.service.price;
            return sum + price * item.quantity;
        }, 0);

        grandTotalElement.textContent = `₱${total.toFixed(2)}`;
        calculateChange();
    }

    function calculateChange() {
        const total = parseFloat(grandTotalElement.textContent.slice(1)) || 0;
        const payment = parseFloat(paymentInput.value) || 0;
        const change = payment - total;
        changeOutput.textContent = `₱${change.toFixed(2)}`;
    }

    // 🔸 CART ACTIONS
    function addToCart(productId) {
        const existingItem = cart.find(item => item.product?.id === productId);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            const product = products.find(p => p.id === productId);
            cart.push({ product, quantity: 1 });
        }
        renderCart();
        updatePaymentSummary();
    }

    function addServiceToCart(serviceId) {
        const existingItem = cart.find(item => item.service?.id === serviceId);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            const service = services.find(s => s.id === serviceId);
            cart.push({ service, quantity: 1 });
        }
        renderCart();
        updatePaymentSummary();
    }

    function removeFromCart(productId) {
        cart = cart.filter(item => !(item.product?.id === productId));
        renderCart();
        updatePaymentSummary();
    }

    function removeServiceFromCart(serviceId) {
        cart = cart.filter(item => !(item.service?.id === serviceId));
        renderCart();
        updatePaymentSummary();
    }

    // 🔸 TRANSACTIONS
    function checkout() {
        if (!cart.length) return alert("Your cart is empty!");
        if (!currentOrderDate) return alert("Please select an order date!");
        if (!currentCustomerName) return alert("Please enter the customer name!");

        const totalAmount = parseFloat(grandTotalElement.textContent.slice(1));
        const transactionId = editingTransactionId || generateTransactionId();

        const items = cart.map(item => {
            const entity = item.product || item.service;
            return {
                name: entity.name,
                price: entity.price,
                category: item.product ? "Product" : "Service"
            };
        });

        const transactionData = {
            transaction_id: transactionId,
            customer_name: currentCustomerName,
            order_date: currentOrderDate,
            total_amount: totalAmount,
            items
        };

        fetch('/api/transaction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transactionData)
        })
        .then(res => {
            if (!res.ok) throw new Error("Failed to save transaction");
            return res.json();
        })
        .then(() => {
            resetModal();
            fetchTransactionsFromDB();
            bootstrap.Modal.getInstance(modal)?.hide();
            new bootstrap.Modal(invoiceModalEl).show();
        })
        .catch(err => alert(err.message));
    }

    function editPurchase(transactionId) {
        const purchase = purchases.find(p => p.transaction_id === transactionId);
        if (!purchase) return;

        editingTransactionId = transactionId;

        cart = purchase.items.map(item => {
            const found = item.category === "Product"
                ? products.find(p => p.name === item.name)
                : services.find(s => s.name === item.name);

            return item.category === "Product"
                ? { product: found, quantity: 1 }
                : { service: found, quantity: 1 };
        }).filter(Boolean);

        currentOrderDate = purchase.order_date;
        currentCustomerName = purchase.customer_name;
        orderDateInput.value = currentOrderDate;
        customerNameInput.value = currentCustomerName;

        renderCart();
        updatePaymentSummary();
        new bootstrap.Modal(modal).show();
    }

    function deletePurchase(transactionId) {
        if (!confirm("Are you sure you want to delete this purchase?")) return;

        fetch(`/api/transaction/${transactionId}`, { method: 'DELETE' })
            .then(res => {
                if (!res.ok) throw new Error("Failed to delete transaction");
                return res.json();
            })
            .then(() => {
                purchases = purchases.filter(p => p.transaction_id !== transactionId);
                updatePurchaseList();
            })
            .catch(err => alert(err.message));
    }

    function updatePurchaseList() {
        purchaseListTableBody.innerHTML = "";

        purchases.forEach(purchase => {
            const row = purchaseListTableBody.insertRow();
            row.insertCell().textContent = purchase.transaction_id;
            row.insertCell().textContent = purchase.order_date;
            row.insertCell().textContent = purchase.customer_name;
            row.insertCell().textContent = `₱${purchase.total_amount.toFixed(2)}`;

            const actionsCell = row.insertCell();
            const actionButtons = document.createElement("div");
            actionButtons.className = "action-buttons";

            const editBtn = document.createElement("button");
            editBtn.className = "edit";
            editBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 16px;">edit</span>';
            editBtn.addEventListener("click", () => editPurchase(purchase.transaction_id));

            const deleteBtn = document.createElement("button");
            deleteBtn.className = "delete";
            deleteBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 16px;">delete</span>';
            deleteBtn.addEventListener("click", () => deletePurchase(purchase.transaction_id));

            actionButtons.appendChild(editBtn);
            actionButtons.appendChild(deleteBtn);
            actionsCell.appendChild(actionButtons);
        });
    }

    // 🔸 RESET FORM / MODAL
    function resetModal() {
        cart = [];
        editingTransactionId = null;
        currentOrderDate = "";
        currentCustomerName = "";

        orderDateInput.value = "";
        customerNameInput.value = "";
        paymentInput.value = "";
        changeOutput.textContent = "₱0.00";
        categorySelect.value = "All";

        renderCart();
        renderItems();
        updatePaymentSummary();
    }

    // 🔹 EVENT LISTENERS
    productSearch.addEventListener("input", renderItems);
    categorySelect.addEventListener("change", renderItems);
    orderDateInput.addEventListener("change", e => currentOrderDate = e.target.value);
    customerNameInput.addEventListener("input", e => currentCustomerName = e.target.value);
    paymentInput.addEventListener("input", calculateChange);
    finalizeCheckoutBtn.addEventListener("click", checkout);

    addTransactionButton?.addEventListener("click", () => {
        resetModal();
        new bootstrap.Modal(modal).show();
    });

    closeModalBtn?.addEventListener("click", () => {
        bootstrap.Modal.getInstance(modal)?.hide();
    });
});
