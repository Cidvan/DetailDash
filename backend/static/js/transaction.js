document.addEventListener('DOMContentLoaded', () => {
    const modal              = document.getElementById("myModal");
    const invoiceModalEl     = document.getElementById("invoiceModal");
    const addTransactionButton = document.getElementById("addTransactionButton");
    const productSearch      = document.getElementById("productSearch");
    const categorySelect     = document.getElementById("categorySelect");
    const orderDateInput     = document.getElementById("orderDate");
    const customerNameInput  = document.getElementById("customername");
    const customerSuggestions = document.getElementById("customerSuggestions");
    const customerIdHidden   = document.getElementById("customerIdHidden");
    const vehicleSelect      = document.getElementById("vehicleSelect");
    const productGrid        = document.getElementById("productGrid");
    const cartItemsContainer = document.getElementById("cartItems");
    const grandTotalElement  = document.getElementById("grandTotal");
    const paymentInput       = document.getElementById("payment");
    const changeOutput       = document.getElementById("change");
    const finalizeCheckoutBtn = document.getElementById("finalizeCheckoutBtn");
    const purchaseTableBody  = document.getElementById("purchaseTableBody");

    let products = [], services = [], cart = [], purchases = [];
    let allCustomers = [], allVehicles = [];
    let currentOrderDate = "", currentCustomerName = "", editingTransactionId = null;
    let selectedCustomerId = null, selectedVehicleId = null;

    fetchItemsFromDB();
    fetchTransactionsFromDB();
    fetchCustomers();

    function fetchCustomers() {
        fetch('/api/customers')
            .then(r => r.json())
            .then(data => { allCustomers = data; })
            .catch(() => {});
    }

    function fetchVehiclesForCustomer(customerId) {
        fetch('/api/vehicles')
            .then(r => r.json())
            .then(data => {
                allVehicles = data.filter(v => v.customer_id === customerId);
                populateVehicleSelect();
            })
            .catch(() => { allVehicles = []; populateVehicleSelect(); });
    }

    function populateVehicleSelect(selectedId) {
        vehicleSelect.innerHTML = '<option value="">— Select vehicle —</option>';
        allVehicles.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.id;
            opt.textContent = `${v.year || ''} ${v.make} ${v.model} (${v.plate})`.trim();
            if (selectedId && v.id === selectedId) opt.selected = true;
            vehicleSelect.appendChild(opt);
        });
        vehicleSelect.disabled = allVehicles.length === 0;
    }

    function showSuggestions(term) {
        if (!term) { customerSuggestions.style.display = 'none'; return; }
        const matches = allCustomers.filter(c => c.name.toLowerCase().includes(term.toLowerCase()));
        if (!matches.length) { customerSuggestions.style.display = 'none'; return; }
        customerSuggestions.innerHTML = '';
        matches.slice(0, 8).forEach(c => {
            const item = document.createElement('div');
            item.style.cssText = 'padding:8px 12px;cursor:pointer;font-size:.85rem;border-bottom:1px solid var(--border);';
            item.textContent = c.name + (c.phone ? ` · ${c.phone}` : '');
            item.addEventListener('mousedown', () => {
                selectCustomer(c);
            });
            customerSuggestions.appendChild(item);
        });
        customerSuggestions.style.display = 'block';
    }

    function selectCustomer(c) {
        selectedCustomerId = c.id;
        currentCustomerName = c.name;
        customerNameInput.value = c.name;
        customerIdHidden.value = c.id;
        customerSuggestions.style.display = 'none';
        selectedVehicleId = null;
        fetchVehiclesForCustomer(c.id);
    }

    function clearCustomerSelection() {
        selectedCustomerId = null;
        customerIdHidden.value = '';
        selectedVehicleId = null;
        allVehicles = [];
        populateVehicleSelect();
    }

    if (customerNameInput) {
        customerNameInput.addEventListener('input', e => {
            currentCustomerName = e.target.value;
            if (!e.target.value.trim()) {
                clearCustomerSelection();
            } else {
                if (selectedCustomerId && customerNameInput.value !== allCustomers.find(c => c.id === selectedCustomerId)?.name) {
                    clearCustomerSelection();
                }
                showSuggestions(e.target.value.trim());
            }
        });
        customerNameInput.addEventListener('blur', () => {
            setTimeout(() => { customerSuggestions.style.display = 'none'; }, 150);
        });
    }

    if (vehicleSelect) {
        vehicleSelect.addEventListener('change', () => {
            selectedVehicleId = vehicleSelect.value ? parseInt(vehicleSelect.value) : null;
        });
    }

    function fetchItemsFromDB() {
        Promise.all([
            fetch('/api/products').then(r => r.json()),
            fetch('/api/services').then(r => r.json())
        ])
        .then(([pd, sd]) => {
            products = pd; services = sd;
            populateCategories();
            renderItems();
        })
        .catch(err => console.error('Failed to fetch items:', err));
    }

    function fetchTransactionsFromDB() {
        fetch('/api/transactions')
            .then(r => r.json())
            .then(data => { purchases = data; updatePurchaseList(); })
            .catch(err => console.error('Failed to fetch transactions:', err));
    }

    function populateCategories() {
        if (!categorySelect) return;
        const existing = categorySelect.value;
        categorySelect.innerHTML = "";
        const cats = ["All", ...new Set([
            ...products.map(p => p.category),
            ...services.map(s => s.category)
        ])];
        cats.forEach(c => {
            const o = document.createElement("option");
            o.value = c; o.textContent = c;
            categorySelect.appendChild(o);
        });
        if (existing) categorySelect.value = existing;
    }

    function generateTransactionId() {
        return String(Date.now()).slice(-6);
    }

    function renderItems() {
        if (!productGrid) return;
        productGrid.innerHTML = "";
        const cat  = categorySelect ? categorySelect.value : "All";
        const term = productSearch  ? productSearch.value.toLowerCase() : "";
        const items = [
            ...products.map(p => ({ ...p, itemType: "product" })),
            ...services.map(s => ({ ...s, itemType: "service" }))
        ];
        items
            .filter(i => i.name.toLowerCase().includes(term) && (cat === "All" || i.category === cat))
            .forEach(item => {
                const isProduct = item.itemType === "product";
                const outOfStock = isProduct && (item.quantity <= 0);
                const card = document.createElement("div");
                card.className = "dd-product-card" + (outOfStock ? " out-of-stock" : "");
                const imgSrc = item.image_path
                    ? `/static/assets/images/uploads/${item.image_path}`
                    : 'https://placehold.co/80x80/EEE/31343C';
                const stockBadge = isProduct
                    ? (outOfStock
                        ? `<span class="dd-stock-badge dd-stock-empty">Out of Stock</span>`
                        : `<span class="dd-stock-badge dd-stock-available">In Stock: ${item.quantity}</span>`)
                    : '';
                card.innerHTML = `
                    <img src="${imgSrc}" alt="${item.name}"/>
                    <h4>${item.name}</h4>
                    <p>₱${parseFloat(item.price).toFixed(2)}</p>
                    ${stockBadge}
                    <button ${outOfStock ? 'disabled' : ''}>Add to Cart</button>
                `;
                productGrid.appendChild(card);
                if (!outOfStock) {
                    card.querySelector("button").addEventListener("click", () => {
                        item.itemType === "product" ? addToCart(item.id) : addServiceToCart(item.id);
                    });
                }
            });
    }

    function renderCart() {
        if (!cartItemsContainer) return;
        cartItemsContainer.innerHTML = "";
        cart.forEach(ci => {
            const entity = ci.product || ci.service;
            const div = document.createElement("div");
            div.className = "list-group-item d-flex justify-content-between align-items-center";
            div.style.cssText = "font-size:.85rem;padding:8px 12px;";
            div.innerHTML = `
                <div>${entity.name} <span class="badge bg-secondary rounded-pill">×${ci.quantity}</span></div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-weight:600;color:var(--primary);">₱${(entity.price * ci.quantity).toFixed(2)}</span>
                    <button class="dd-btn-icon delete rm-btn" style="width:24px;height:24px;font-size:.75rem;">×</button>
                </div>
            `;
            div.querySelector(".rm-btn").addEventListener("click", () => {
                ci.product ? removeFromCart(entity.id) : removeServiceFromCart(entity.id);
            });
            cartItemsContainer.appendChild(div);
        });
    }

    function updatePaymentSummary() {
        const total = cart.reduce((s, ci) => s + (ci.product ? ci.product.price : ci.service.price) * ci.quantity, 0);
        if (grandTotalElement) grandTotalElement.textContent = `₱${total.toFixed(2)}`;
        calculateChange();
    }

    function calculateChange() {
        const total   = parseFloat(grandTotalElement?.textContent?.slice(1) || 0) || 0;
        const payment = parseFloat(paymentInput?.value || 0) || 0;
        if (changeOutput) changeOutput.textContent = `₱${(payment - total).toFixed(2)}`;
    }

    function addToCart(id) {
        const ex = cart.find(i => i.product?.id === id);
        if (ex) ex.quantity++;
        else { const p = products.find(p => p.id === id); if (p) cart.push({ product: p, quantity: 1 }); }
        renderCart(); updatePaymentSummary();
    }

    function addServiceToCart(id) {
        const ex = cart.find(i => i.service?.id === id);
        if (ex) ex.quantity++;
        else { const s = services.find(s => s.id === id); if (s) cart.push({ service: s, quantity: 1 }); }
        renderCart(); updatePaymentSummary();
    }

    function removeFromCart(id) {
        cart = cart.filter(i => !(i.product?.id === id));
        renderCart(); updatePaymentSummary();
    }

    function removeServiceFromCart(id) {
        cart = cart.filter(i => !(i.service?.id === id));
        renderCart(); updatePaymentSummary();
    }

    function checkout() {
        if (!cart.length) return alert("Your cart is empty!");
        if (!currentOrderDate) return alert("Please select an order date!");
        if (!currentCustomerName.trim()) return alert("Please enter the customer name!");

        const totalAmount     = cart.reduce((s, ci) => s + (ci.product ? ci.product.price : ci.service.price) * ci.quantity, 0);
        const transactionId   = editingTransactionId || generateTransactionId();

        const items = cart.map(ci => {
            const entity = ci.product || ci.service;
            return { name: entity.name, price: entity.price, quantity: ci.quantity, category: ci.product ? "Product" : "Service" };
        });

        const txData = {
            transaction_id: transactionId,
            customer_name: currentCustomerName,
            customer_id: selectedCustomerId || null,
            vehicle_id: selectedVehicleId || null,
            order_date: currentOrderDate,
            total_amount: totalAmount,
            items
        };

        fetch('/api/transaction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(txData)
        })
        .then(r => { if (!r.ok) throw new Error("Failed to save transaction"); return r.json(); })
        .then(() => {
            const savedTx = { ...txData };
            resetModal();
            fetchTransactionsFromDB();
            bootstrap.Modal.getInstance(modal)?.hide();
            populateInvoice(savedTx);
            new bootstrap.Modal(invoiceModalEl).show();
        })
        .catch(err => alert(err.message));
    }

    function populateInvoice(data) {
        const fmtDate = d => {
            if (!d) return '';
            const [y, m, day] = d.split('-');
            return `${m}/${day}/${y}`;
        };
        const el = id => document.getElementById(id);
        if (el('invoiceDate'))          el('invoiceDate').textContent          = fmtDate(data.order_date);
        if (el('invoiceTransactionId')) el('invoiceTransactionId').textContent = data.transaction_id;
        if (el('invoiceCustomer'))      el('invoiceCustomer').textContent      = data.customer_name;

        const tbody = el('invoiceItemsBody');
        if (tbody) {
            tbody.innerHTML = '';
            (data.items || []).forEach(item => {
                const qty = item.quantity || 1;
                const amount = (parseFloat(item.price) * qty).toFixed(2);
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.name}</td>
                    <td>${item.category}</td>
                    <td>₱${parseFloat(item.price).toFixed(2)}</td>
                    <td class="qty">${item.category === 'Service' ? '-' : qty}</td>
                    <td class="text-end">₱${amount}</td>
                `;
                tbody.appendChild(tr);
            });
        }

        const totalEl = el('invoiceGrandTotal');
        if (totalEl) totalEl.textContent = `₱${parseFloat(data.total_amount).toFixed(2)}`;
    }

    function editPurchase(transactionId) {
        const purchase = purchases.find(p => p.transaction_id === transactionId);
        if (!purchase) return;
        editingTransactionId = transactionId;
        cart = purchase.items.map(item => {
            const found = item.category === "Product"
                ? products.find(p => p.name === item.name)
                : services.find(s => s.name === item.name);
            if (!found) return null;
            return item.category === "Product" ? { product: found, quantity: item.quantity || 1 } : { service: found, quantity: item.quantity || 1 };
        }).filter(Boolean);
        currentOrderDate    = purchase.order_date;
        currentCustomerName = purchase.customer_name;
        selectedCustomerId  = purchase.customer_id || null;
        selectedVehicleId   = purchase.vehicle_id || null;
        if (orderDateInput)    orderDateInput.value    = currentOrderDate;
        if (customerNameInput) customerNameInput.value = currentCustomerName;
        if (customerIdHidden)  customerIdHidden.value  = selectedCustomerId || '';

        allVehicles = [];
        populateVehicleSelect();

        if (selectedCustomerId) {
            fetch('/api/vehicles')
                .then(r => r.json())
                .then(data => {
                    allVehicles = data.filter(v => v.customer_id === selectedCustomerId);
                    populateVehicleSelect(selectedVehicleId);
                });
        }

        renderCart(); updatePaymentSummary();
        new bootstrap.Modal(modal).show();
    }

    function viewInvoice(transactionId) {
        const purchase = purchases.find(p => p.transaction_id === transactionId);
        if (!purchase) return;
        populateInvoice(purchase);
        new bootstrap.Modal(invoiceModalEl).show();
    }

    function deletePurchase(transactionId) {
        if (!confirm("Delete this transaction?")) return;
        fetch(`/api/transaction/${transactionId}`, { method: 'DELETE' })
            .then(r => r.json())
            .then(() => {
                purchases = purchases.filter(p => p.transaction_id !== transactionId);
                updatePurchaseList();
            })
            .catch(err => alert(err.message));
    }

    function updatePurchaseList() {
        if (!purchaseTableBody) return;
        purchaseTableBody.innerHTML = "";

        if (!purchases.length) {
            purchaseTableBody.innerHTML = `<tr><td colspan="5" class="dd-table-empty">
                <i class="fas fa-receipt"></i> No transactions yet.</td></tr>`;
            return;
        }

        purchases.forEach(purchase => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span style="font-family:monospace;font-weight:600;">#${purchase.transaction_id}</span></td>
                <td style="color:var(--text-muted);">${purchase.order_date}</td>
                <td style="font-weight:500;">${purchase.customer_name}</td>
                <td style="text-align:right;font-weight:600;color:var(--primary);">₱${parseFloat(purchase.total_amount).toFixed(2)}</td>
                <td style="text-align:center;">
                    <div class="dd-actions" style="justify-content:center;">
                        <button class="dd-btn-icon view view-btn" title="View Invoice"><i class="fas fa-receipt"></i></button>
                        <button class="dd-btn-icon edit edit-btn" title="Edit"><i class="fas fa-pencil"></i></button>
                        <button class="dd-btn-icon delete del-btn" title="Delete"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            `;
            tr.querySelector('.view-btn').addEventListener('click', () => viewInvoice(purchase.transaction_id));
            tr.querySelector('.edit-btn').addEventListener('click', () => editPurchase(purchase.transaction_id));
            tr.querySelector('.del-btn').addEventListener('click',  () => deletePurchase(purchase.transaction_id));
            purchaseTableBody.appendChild(tr);
        });
    }

    function resetModal() {
        cart = []; editingTransactionId = null;
        currentOrderDate = ""; currentCustomerName = "";
        selectedCustomerId = null; selectedVehicleId = null;
        allVehicles = [];
        if (orderDateInput)    orderDateInput.value    = "";
        if (customerNameInput) customerNameInput.value = "";
        if (customerIdHidden)  customerIdHidden.value  = "";
        if (paymentInput)      paymentInput.value      = "";
        if (changeOutput)      changeOutput.textContent = "₱0.00";
        if (categorySelect)    categorySelect.value     = "All";
        if (customerSuggestions) customerSuggestions.style.display = 'none';
        populateVehicleSelect();
        renderCart(); renderItems(); updatePaymentSummary();
    }

    if (productSearch)     productSearch.addEventListener("input", renderItems);
    if (categorySelect)    categorySelect.addEventListener("change", renderItems);
    if (orderDateInput)    orderDateInput.addEventListener("change", e => currentOrderDate = e.target.value);
    if (paymentInput)      paymentInput.addEventListener("input", calculateChange);
    if (finalizeCheckoutBtn) finalizeCheckoutBtn.addEventListener("click", checkout);
    if (addTransactionButton) addTransactionButton.addEventListener("click", () => {
        resetModal();
        fetchCustomers();
        new bootstrap.Modal(modal).show();
    });

    window.printInvoice = () => window.print();
});
