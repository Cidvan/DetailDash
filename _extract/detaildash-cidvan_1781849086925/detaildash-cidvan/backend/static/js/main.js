document.addEventListener('DOMContentLoaded', () => {
    // 🔹 DOM ELEMENTS
    const mainTransactionModalEl = document.getElementById("myModal"); // Assuming 'myModal' is the ID for the main transaction modal
    const invoiceModalEl = document.getElementById("invoiceModal"); // Assuming this modal exists for invoices
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
    const finalizeCheckoutBtn = document.getElementById("finalizeCheckoutBtn");
    const closeModalBtn = document.getElementById("closeModalBtn");
    const purchaseListTableBody = document.querySelector("#purchaseTable tbody"); // Corrected selector for the main purchase list table

    // Inventory specific elements (from the second DOMContentLoaded block)
    const toggleButtons = document.querySelectorAll('.toggle-button');
    const servicesSection = document.getElementById('services-section');
    const productsSection = document.getElementById('products-section');
    const productModalEl = document.getElementById('productModal'); // Assuming these modals exist
    const serviceModalEl = document.getElementById('serviceModal'); // Assuming these modals exist
    const productForm = document.getElementById('productForm');
    const serviceForm = document.getElementById('serviceForm');
    const productSaveBtn = document.getElementById('productSaveBtn');
    const serviceSaveBtn = document.getElementById('serviceSaveBtn');
    const productsTableBody = document.querySelector('#products-section tbody');
    const servicesTableBody = document.querySelector('#services-section tbody');
    const addItemButton = document.getElementById('addItemButton'); // This seems to be the "Add New" button for inventory items

    // Custom Alert/Confirm Modals
    const customAlertModalEl = document.getElementById('customAlertModal');
    const customAlertModalBody = document.getElementById('customAlertModalBody');
    const customConfirmModalEl = document.getElementById('customConfirmModal');
    const customConfirmModalBody = document.getElementById('customConfirmModalBody');
    const confirmActionBtn = document.getElementById('confirmActionBtn');

    // 🔹 BOOTSTRAP MODAL INSTANCES
    const mainTransactionModal = mainTransactionModalEl ? new bootstrap.Modal(mainTransactionModalEl) : null;
    const invoiceModal = invoiceModalEl ? new bootstrap.Modal(invoiceModalEl) : null;
    const productModal = productModalEl ? new bootstrap.Modal(productModalEl) : null;
    const serviceModal = serviceModalEl ? new bootstrap.Modal(serviceModalEl) : null;
    const customAlertModal = customAlertModalEl ? new bootstrap.Modal(customAlertModalEl) : null;
    const customConfirmModal = customConfirmModalEl ? new bootstrap.Modal(customConfirmModalEl) : null;


    // 🔹 STATE
    let products = [], services = [], cart = [], purchases = [];
    let currentOrderDate = "", currentCustomerName = "", editingTransactionId = null;
    let editingProductId = null;
    let editingServiceId = null;

    // 🔹 INITIALIZATION
    fetchCategoriesFromDB();
    fetchTransactionsFromDB();
    renderCart(); // Call this to ensure cart UI is up-to-date on load
    renderItems(); // Call this to ensure product/service grid is up-to-date on load
    updatePaymentSummary(); // Call this to ensure payment summary is up-to-date on load

    // Initialize inventory sections and load data
    loadServices();
    loadProducts();
    initializeToggleButtons();
    initializeSidebarLinks(); // Ensure sidebar active state is set

    // 🔸 CUSTOM MODAL UI FUNCTIONS (replacing alert/confirm)
    function showAlertModal(message) {
        if (customAlertModal && customAlertModalBody) {
            customAlertModalBody.textContent = message;
            customAlertModal.show();
        } else {
            // Fallback if modals are not found (e.g., during development without full HTML)
            alert(message);
        }
    }

    function showConfirmModal(message, callback) {
        if (customConfirmModal && customConfirmModalBody && confirmActionBtn) {
            customConfirmModalBody.textContent = message;
            // Remove previous listeners to prevent multiple calls
            confirmActionBtn.onclick = null;
            confirmActionBtn.onclick = () => {
                callback();
                customConfirmModal.hide();
            };
            customConfirmModal.show();
        } else {
            // Fallback if modals are not found
            if (confirm(message)) {
                callback();
            }
        }
    }

    // 🔸 FETCHING
    function fetchCategoriesFromDB() {
        Promise.all([
            // Using placeholder URLs since actual API endpoints are not provided
            fetch('/api/products').then(res => res.json()).catch(() => []),
            fetch('/api/services').then(res => res.json()).catch(() => [])
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
            .then(res => {
                if (!res.ok) throw new Error("Failed to fetch transactions");
                return res.json();
            })
            .then(data => {
                purchases = data;
                updatePurchaseList();
            })
            .catch(err => console.error('Failed to fetch transactions:', err));
    }

    // 🔸 UI HELPERS
    function populateCategories() {
        if (!categorySelect) return; // Guard against missing element
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
        return String(Date.now()).slice(-4); // Basic ID generation
    }

    function initializeSidebarLinks() {
        const sidebarLinks = document.querySelectorAll('aside .sidebar a');
        sidebarLinks.forEach(link => {
            link.classList.toggle('active', link.querySelector('h5').textContent.trim() === 'Transaction');
        });
    }

    function initializeToggleButtons() {
        toggleButtons.forEach(button => {
            button.addEventListener('click', function () {
                toggleButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                const section = this.getAttribute('data-section');
                servicesSection.classList.remove('active');
                productsSection.classList.remove('active');
                document.getElementById(section + '-section').classList.add('active');
            });
        });
    }

    // 🔸 RENDERING
    function renderItems() {
        if (!productGrid) return; // Guard against missing element
        productGrid.innerHTML = "";
        const selectedCategory = categorySelect ? categorySelect.value : "All";
        const searchTerm = productSearch ? productSearch.value.toLowerCase() : "";

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
                    <img src="${item.image || 'https://placehold.co/80x80/EEE/31343C'}" alt="${item.name}" />
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
        if (!cartItemsContainer) return; // Guard against missing element
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

        if (grandTotalElement) grandTotalElement.textContent = `₱${total.toFixed(2)}`;
        calculateChange();
    }

    function calculateChange() {
        const total = parseFloat(grandTotalElement ? grandTotalElement.textContent.slice(1) : 0) || 0;
        const payment = parseFloat(paymentInput ? paymentInput.value : 0) || 0;
        const change = payment - total;
        if (changeOutput) changeOutput.textContent = `₱${change.toFixed(2)}`;
    }

    // 🔸 CART ACTIONS
    function addToCart(productId) {
        const existingItem = cart.find(item => item.product?.id === productId);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            const product = products.find(p => p.id === productId);
            if (product) cart.push({ product, quantity: 1 });
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
            if (service) cart.push({ service, quantity: 1 });
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
        if (!cart.length) return showAlertModal("Your cart is empty!");
        if (!currentOrderDate) return showAlertModal("Please select an order date!");
        if (!currentCustomerName) return showAlertModal("Please enter the customer name!");

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
            mainTransactionModal?.hide();
            invoiceModal?.show();
        })
        .catch(err => showAlertModal(err.message));
    }

    function editPurchase(transactionId) {
        const purchase = purchases.find(p => p.transaction_id === transactionId);
        if (!purchase) return;

        editingTransactionId = transactionId;

        cart = purchase.items.map(item => {
            const found = item.category === "Product"
                ? products.find(p => p.name === item.name)
                : services.find(s => s.name === item.name);

            // Ensure 'found' is not undefined before returning
            if (found) {
                return item.category === "Product"
                    ? { product: found, quantity: 1 } // Assuming quantity is 1 for simplicity, adjust if needed
                    : { service: found, quantity: 1 };
            }
            return null; // Return null for items not found
        }).filter(Boolean); // Filter out nulls

        currentOrderDate = purchase.order_date;
        currentCustomerName = purchase.customer_name;
        if (orderDateInput) orderDateInput.value = currentOrderDate;
        if (customerNameInput) customerNameInput.value = currentCustomerName;

        renderCart();
        updatePaymentSummary();
        mainTransactionModal?.show();
    }

    function deletePurchase(transactionId) {
        showConfirmModal("Are you sure you want to delete this purchase?", () => {
            fetch(`/api/transaction/${transactionId}`, { method: 'DELETE' })
                .then(res => {
                    if (!res.ok) throw new Error("Failed to delete transaction");
                    return res.json();
                })
                .then(() => {
                    purchases = purchases.filter(p => p.transaction_id !== transactionId);
                    updatePurchaseList();
                })
                .catch(err => showAlertModal(err.message));
        });
    }

    function updatePurchaseList() {
        if (!purchaseListTableBody) return; // Guard against missing element
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

        if (orderDateInput) orderDateInput.value = "";
        if (customerNameInput) customerNameInput.value = "";
        if (paymentInput) paymentInput.value = "";
        if (changeOutput) changeOutput.textContent = "₱0.00";
        if (categorySelect) categorySelect.value = "All";

        renderCart();
        renderItems();
        updatePaymentSummary();
    }

    // 🔹 EVENT LISTENERS (Transaction-related)
    if (productSearch) productSearch.addEventListener("input", renderItems);
    if (categorySelect) categorySelect.addEventListener("change", renderItems);
    if (orderDateInput) orderDateInput.addEventListener("change", e => currentOrderDate = e.target.value);
    if (customerNameInput) customerNameInput.addEventListener("input", e => currentCustomerName = e.target.value);
    if (paymentInput) paymentInput.addEventListener("input", calculateChange);
    if (finalizeCheckoutBtn) finalizeCheckoutBtn.addEventListener("click", checkout);

    if (addTransactionButton) {
        addTransactionButton.addEventListener("click", () => {
            resetModal();
            mainTransactionModal?.show();
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener("click", () => {
            mainTransactionModal?.hide();
        });
    }

    // 🔹 EVENT LISTENERS (Inventory-related)
    if (addItemButton) {
        addItemButton.addEventListener('click', () => {
            const activeSection = document.querySelector('.toggle-button.active')?.getAttribute('data-section');
            if (activeSection === 'products') {
                clearProductForm();
                editingProductId = null;
                productModal?.show();
            } else if (activeSection === 'services') {
                clearServiceForm();
                editingServiceId = null;
                serviceModal?.show();
            }
        });
    }

    // Product form handlers
    if (document.getElementById('productFileButton')) {
        document.getElementById('productFileButton').addEventListener('click', function () {
            document.getElementById('productFileInput')?.click();
        });
    }

    if (document.getElementById('productFileInput')) {
        document.getElementById('productFileInput').addEventListener('change', function () {
            const file = this.files[0];
            const productPreviewImage = document.getElementById('productPreviewImage');
            const productRemoveImage = document.getElementById('productRemoveImage');
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    if (productPreviewImage) productPreviewImage.src = e.target.result;
                    if (productRemoveImage) productRemoveImage.style.display = 'inline-block';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (document.getElementById('productRemoveImage')) {
        document.getElementById('productRemoveImage').addEventListener('click', function () {
            const productFileInput = document.getElementById('productFileInput');
            const productPreviewImage = document.getElementById('productPreviewImage');
            if (productFileInput) productFileInput.value = '';
            if (productPreviewImage) productPreviewImage.src = "https://placehold.co/100x100/EEE/31343C";
            this.style.display = 'none';
        });
    }

    // Service form handlers
    if (document.getElementById('serviceFileButton')) {
        document.getElementById('serviceFileButton').addEventListener('click', function () {
            document.getElementById('serviceFileInput')?.click();
        });
    }

    if (document.getElementById('serviceFileInput')) {
        document.getElementById('serviceFileInput').addEventListener('change', function () {
            const file = this.files[0];
            const servicePreviewImage = document.getElementById('servicePreviewImage');
            const serviceRemoveImage = document.getElementById('serviceRemoveImage');
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    if (servicePreviewImage) servicePreviewImage.src = e.target.result;
                    if (serviceRemoveImage) serviceRemoveImage.style.display = 'inline-block';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (document.getElementById('serviceRemoveImage')) {
        document.getElementById('serviceRemoveImage').addEventListener('click', function () {
            const serviceFileInput = document.getElementById('serviceFileInput');
            const servicePreviewImage = document.getElementById('servicePreviewImage');
            if (serviceFileInput) serviceFileInput.value = '';
            if (servicePreviewImage) servicePreviewImage.src = "https://placehold.co/100x100/EEE/31343C";
            this.style.display = 'none';
        });
    }

    function clearProductForm() {
        if (productForm) productForm.reset();
        const productPreviewImage = document.getElementById('productPreviewImage');
        const productRemoveImage = document.getElementById('productRemoveImage');
        const productFileInput = document.getElementById('productFileInput');
        if (productPreviewImage) productPreviewImage.src = "https://placehold.co/100x100/EEE/31343C";
        if (productRemoveImage) productRemoveImage.style.display = 'none';
        if (productFileInput) productFileInput.value = '';
    }

    function clearServiceForm() {
        if (serviceForm) serviceForm.reset();
        const servicePreviewImage = document.getElementById('servicePreviewImage');
        const serviceRemoveImage = document.getElementById('serviceRemoveImage');
        const serviceFileInput = document.getElementById('serviceFileInput');
        if (servicePreviewImage) servicePreviewImage.src = "https://placehold.co/100x100/EEE/31343C";
        if (serviceRemoveImage) serviceRemoveImage.style.display = 'none';
        if (serviceFileInput) serviceFileInput.value = '';
    }

    function loadProducts() {
        fetch('/api/products')
            .then(response => {
                if (!response.ok) throw new Error("Failed to fetch products");
                return response.json();
            })
            .then(productsData => {
                products = productsData; // Update global products array
                if (!productsTableBody) return;
                productsTableBody.innerHTML = '';
                productsData.forEach(product => {
                    const tr = document.createElement('tr');
                    const imageUrl = product.image_path && product.image_path !== 'null' ? `/static/assets/images/uploads/${product.image_path}` : "https://placehold.co/80x80/EEE/31343C";
                    tr.innerHTML = `
                        <td>
                            <div class="menu-item">
                                <img src="${imageUrl}" alt="${product.name}">
                            </div>
                        </td>
                        <td>
                            <div class="menu-item">
                                <div class="item-details">
                                    <h3 class="item-name">${product.name}</h3>
                                </div>
                            </div>
                        </td>
                        <td>${product.category || ''}</td>
                        <td>$${product.price}</td>
                        <td>${product.quantity}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="edit" data-id="${product.id}" data-type="product"><span class="material-symbols-outlined" style="font-size: 16px;">edit</span></button>
                                <button class="delete" data-id="${product.id}" data-type="product"><span class="material-symbols-outlined" style="font-size: 16px;">delete</span></button>
                            </div>
                        </td>
                    `;
                    productsTableBody.appendChild(tr);
                });
                document.querySelectorAll('#products-section .edit').forEach(button => {
                    button.addEventListener('click', onEditProduct);
                });
                document.querySelectorAll('#products-section .delete').forEach(button => {
                    button.addEventListener('click', onDeleteProduct);
                });
            })
            .catch(err => console.error('Error loading products:', err));
    }

    function loadServices() {
        fetch('/api/services')
            .then(response => {
                if (!response.ok) throw new Error("Failed to fetch services");
                return response.json();
            })
            .then(servicesData => {
                services = servicesData; // Update global services array
                if (!servicesTableBody) return;
                servicesTableBody.innerHTML = '';
                servicesData.forEach(service => {
                    const tr = document.createElement('tr');
                    const imageUrl = service.image_path && service.image_path !== 'null' ? `/static/assets/images/uploads/${service.image_path}` : "https://placehold.co/80x80/EEE/31343C";
                    tr.innerHTML = `
                        <td>
                            <div class="menu-item">
                                <img src="${imageUrl}" alt="${service.name}">
                            </div>
                        </td>
                        <td>
                            <div class="menu-item">
                                <div class="item-details">
                                    <h3 class="item-name">${service.name}</h3>
                                </div>
                            </div>
                        </td>
                        <td>${service.category}</td>
                        <td>$${service.price}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="edit" data-id="${service.id}" data-type="service"><span class="material-symbols-outlined" style="font-size: 16px;">edit</span></button>
                                <button class="delete" data-id="${service.id}" data-type="service"><span class="material-symbols-outlined" style="font-size: 16px;">delete</span></button>
                            </div>
                        </td>
                    `;
                    servicesTableBody.appendChild(tr);
                });
                document.querySelectorAll('#services-section .edit').forEach(button => {
                    button.addEventListener('click', onEditService);
                });
                document.querySelectorAll('#services-section .delete').forEach(button => {
                    button.addEventListener('click', onDeleteService);
                });
            })
            .catch(err => console.error('Error loading services:', err));
    }

    function onEditProduct(event) {
        const id = event.currentTarget.getAttribute('data-id');
        fetch(`/api/products/${id}`)
            .then(response => {
                if (!response.ok) throw new Error("Failed to fetch product for edit");
                return response.json();
            })
            .then(product => {
                editingProductId = product.id;
                if (document.getElementById('productName')) document.getElementById('productName').value = product.name;
                if (document.getElementById('productCategory')) document.getElementById('productCategory').value = product.category || 'Select category';
                if (document.getElementById('productSalePrice')) document.getElementById('productSalePrice').value = product.price;
                if (document.getElementById('productQuantity')) document.getElementById('productQuantity').value = product.quantity;
                if (productModal) productModal.show();
            })
            .catch(err => showAlertModal(`Error editing product: ${err.message}`));
    }

    function onEditService(event) {
        const id = event.currentTarget.getAttribute('data-id');
        fetch(`/api/services/${id}`)
            .then(response => {
                if (!response.ok) throw new Error("Failed to fetch service for edit");
                return response.json();
            })
            .then(service => {
                editingServiceId = service.id;
                if (document.getElementById('serviceName')) document.getElementById('serviceName').value = service.name;
                if (document.getElementById('serviceCategory')) document.getElementById('serviceCategory').value = service.category || 'Select category';
                if (document.getElementById('serviceSalePrice')) document.getElementById('serviceSalePrice').value = service.price;
                if (serviceModal) serviceModal.show();
            })
            .catch(err => showAlertModal(`Error editing service: ${err.message}`));
    }

    function onDeleteProduct(event) {
        const id = event.currentTarget.getAttribute('data-id');
        showConfirmModal('Are you sure you want to delete this product?', () => {
            fetch(`/api/products/${id}`, { method: 'DELETE' })
                .then(response => {
                    if (!response.ok) throw new Error("Failed to delete product");
                    return response.json();
                })
                .then(data => {
                    if (data.error) showAlertModal(data.error);
                    else loadProducts();
                })
                .catch(err => showAlertModal(`Error deleting product: ${err.message}`));
        });
    }

    function onDeleteService(event) {
        const id = event.currentTarget.getAttribute('data-id');
        showConfirmModal('Are you sure you want to delete this service?', () => {
            fetch(`/api/services/${id}`, { method: 'DELETE' })
                .then(response => {
                    if (!response.ok) throw new Error("Failed to delete service");
                    return response.json();
                })
                .then(data => {
                    if (data.error) showAlertModal(data.error);
                    else loadServices();
                })
                .catch(err => showAlertModal(`Error deleting service: ${err.message}`));
        });
    }

    if (productSaveBtn) {
        productSaveBtn.addEventListener('click', () => {
            const name = document.getElementById('productName')?.value.trim();
            const category = document.getElementById('productCategory')?.value;
            const price = parseFloat(document.getElementById('productSalePrice')?.value);
            const quantity = parseInt(document.getElementById('productQuantity')?.value);

            if (!name || category === 'Select category' || isNaN(price) || isNaN(quantity)) {
                showAlertModal('Please fill in all required fields correctly.');
                return;
            }

            const productFileInput = document.getElementById('productFileInput');
            const formData = new FormData();
            formData.append('name', name);
            formData.append('category', category);
            formData.append('price', price);
            formData.append('quantity', quantity);
            if (productFileInput && productFileInput.files.length > 0) {
                formData.append('image', productFileInput.files[0]);
            }

            const method = editingProductId ? 'PUT' : 'POST';
            const url = editingProductId ? `/api/products/${editingProductId}` : '/api/products';

            fetch(url, {
                method: method,
                body: formData
            })
            .then(response => {
                if (!response.ok) throw new Error(`Failed to save product: ${response.statusText}`);
                return response.json();
            })
            .then(data => {
                if (data.error) showAlertModal(data.error);
                else {
                    loadProducts();
                    editingProductId = null;
                    productModal?.hide();
                }
            })
            .catch(err => showAlertModal(`Error saving product: ${err.message}`));
        });
    }

    if (serviceSaveBtn) {
        serviceSaveBtn.addEventListener('click', () => {
            const name = document.getElementById('serviceName')?.value.trim();
            const category = document.getElementById('serviceCategory')?.value;
            const price = parseFloat(document.getElementById('serviceSalePrice')?.value);

            if (!name || category === 'Select category' || isNaN(price)) {
                showAlertModal('Please fill in all required fields correctly.');
                return;
            }

            const serviceFileInput = document.getElementById('serviceFileInput');
            const formData = new FormData();
            formData.append('name', name);
            formData.append('category', category);
            formData.append('price', price);
            if (serviceFileInput && serviceFileInput.files.length > 0) {
                formData.append('image', serviceFileInput.files[0]);
            }

            const method = editingServiceId ? 'PUT' : 'POST';
            const url = editingServiceId ? `/api/services/${editingServiceId}` : '/api/services';

            fetch(url, {
                method: method,
                body: formData
            })
            .then(response => {
                if (!response.ok) throw new Error(`Failed to save service: ${response.statusText}`);
                return response.json();
            })
            .then(data => {
                if (data.error) showAlertModal(data.error);
                else {
                    loadServices();
                    editingServiceId = null;
                    serviceModal?.hide();
                }
            })
            .catch(err => showAlertModal(`Error saving service: ${err.message}`));
        });
    }

    // Fetch and populate categories for products and services for inventory modals
    function fetchProductCategoriesForModal() {
        fetch('/api/product-categories')
            .then(response => {
                if (!response.ok) throw new Error("Failed to fetch product categories");
                return response.json();
            })
            .then(categories => {
                const productCategorySelect = document.getElementById('productCategory');
                if (productCategorySelect) {
                    productCategorySelect.innerHTML = '<option selected>Select category</option>';
                    categories.forEach(category => {
                        const option = document.createElement('option');
                        option.value = category;
                        option.textContent = category;
                        productCategorySelect.appendChild(option);
                    });
                }
            })
            .catch(err => console.error('Error fetching product categories:', err));
    }

    function fetchServiceCategoriesForModal() {
        fetch('/api/service-categories')
            .then(response => {
                if (!response.ok) throw new Error("Failed to fetch service categories");
                return response.json();
            })
            .then(categories => {
                const serviceCategorySelect = document.getElementById('serviceCategory');
                if (serviceCategorySelect) {
                    serviceCategorySelect.innerHTML = '<option selected>Select category</option>';
                    categories.forEach(category => {
                        const option = document.createElement('option');
                        option.value = category;
                        option.textContent = category;
                        serviceCategorySelect.appendChild(option);
                    });
                }
            })
            .catch(err => console.error('Error fetching service categories:', err));
    }

    // Initial calls for inventory categories
    fetchProductCategoriesForModal();
    fetchServiceCategoriesForModal();

});