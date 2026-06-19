document.addEventListener('DOMContentLoaded', function () {
    const toggleButtons     = document.querySelectorAll('.dd-tab');
    const servicesSection   = document.getElementById('services-section');
    const productsSection   = document.getElementById('products-section');
    const servicesTableBody = document.getElementById('servicesTableBody');
    const productsTableBody = document.getElementById('productsTableBody');

    const productModal     = new bootstrap.Modal(document.getElementById('productModal'));
    const serviceModal     = new bootstrap.Modal(document.getElementById('serviceModal'));
    const stockLogModal    = new bootstrap.Modal(document.getElementById('stockLogModal'));
    const adjustStockModal = new bootstrap.Modal(document.getElementById('adjustStockModal'));

    let editingProductId = null;
    let editingServiceId = null;

    // ── Toggle tabs ───────────────────────────────────────────────
    toggleButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            toggleButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const section = this.getAttribute('data-section');
            servicesSection.classList.remove('active');
            productsSection.classList.remove('active');
            document.getElementById(section + '-section').classList.add('active');
        });
    });

    // ── Category selects ──────────────────────────────────────────
    fetch('/api/product-categories')
        .then(r => r.json())
        .then(cats => {
            const sel = document.getElementById('productCategory');
            sel.innerHTML = '<option selected>Select category</option>';
            cats.forEach(c => {
                const o = document.createElement('option'); o.value = c; o.textContent = c;
                sel.appendChild(o);
            });
        });

    fetch('/api/service-categories')
        .then(r => r.json())
        .then(cats => {
            const sel = document.getElementById('serviceCategory');
            sel.innerHTML = '<option selected>Select category</option>';
            cats.forEach(c => {
                const o = document.createElement('option'); o.value = c; o.textContent = c;
                sel.appendChild(o);
            });
        });

    // ── Add Item Button ───────────────────────────────────────────
    document.getElementById('addItemButton').addEventListener('click', () => {
        const active = document.querySelector('.dd-tab.active')?.getAttribute('data-section');
        if (active === 'products') {
            clearProductForm(); editingProductId = null; productModal.show();
        } else {
            clearServiceForm(); editingServiceId = null; serviceModal.show();
        }
    });

    // ── Load tables ───────────────────────────────────────────────
    function loadProducts() {
        fetch('/api/products')
            .then(r => r.json())
            .then(products => {
                productsTableBody.innerHTML = '';
                if (!products.length) {
                    productsTableBody.innerHTML = '<tr><td colspan="6" class="dd-table-empty"><i class="fas fa-box"></i> No products yet.</td></tr>';
                    return;
                }
                products.forEach(p => {
                    const img = p.image_path && p.image_path !== 'null'
                        ? `/static/assets/images/uploads/${p.image_path}`
                        : 'https://placehold.co/60x60/EEE/31343C';
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><img src="${img}" class="dd-table-img" alt="${p.name}"/></td>
                        <td style="font-weight:600;">${p.name}</td>
                        <td><span class="dd-badge dd-badge-gray">${p.category || ''}</span></td>
                        <td style="text-align:right;font-weight:600;">₱${parseFloat(p.price).toFixed(2)}</td>
                        <td style="text-align:center;">
                            ${p.quantity <= 5
                                ? `<span class="dd-badge dd-badge-red">${p.quantity}</span>`
                                : `<span class="dd-badge dd-badge-green">${p.quantity}</span>`}
                        </td>
                        <td style="text-align:center;">
                            <div class="dd-actions" style="justify-content:center;">
                                <button class="dd-btn-icon edit" data-id="${p.id}" title="Edit"><i class="fas fa-pencil"></i></button>
                                <button class="dd-btn-icon adjust" data-id="${p.id}" data-name="${p.name}" data-qty="${p.quantity}" title="Adjust Stock"><i class="fas fa-sliders"></i></button>
                                <button class="dd-btn-icon history" data-id="${p.id}" data-name="${p.name}" title="Stock History"><i class="fas fa-clock-rotate-left"></i></button>
                                <button class="dd-btn-icon delete" data-id="${p.id}" title="Delete"><i class="fas fa-trash"></i></button>
                            </div>
                        </td>
                    `;
                    tr.querySelector('.edit').addEventListener('click', () => onEditProduct(p.id));
                    tr.querySelector('.adjust').addEventListener('click', () => onAdjustStock(p.id, p.name, p.quantity));
                    tr.querySelector('.history').addEventListener('click', () => onViewStockLog(p.id, p.name));
                    tr.querySelector('.delete').addEventListener('click', () => onDeleteProduct(p.id));
                    productsTableBody.appendChild(tr);
                });
            });
    }

    function loadServices() {
        fetch('/api/services')
            .then(r => r.json())
            .then(services => {
                servicesTableBody.innerHTML = '';
                if (!services.length) {
                    servicesTableBody.innerHTML = '<tr><td colspan="5" class="dd-table-empty"><i class="fas fa-wrench"></i> No services yet.</td></tr>';
                    return;
                }
                services.forEach(s => {
                    const img = s.image_path && s.image_path !== 'null'
                        ? `/static/assets/images/uploads/${s.image_path}`
                        : 'https://placehold.co/60x60/EEE/31343C';
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><img src="${img}" class="dd-table-img" alt="${s.name}"/></td>
                        <td style="font-weight:600;">${s.name}</td>
                        <td><span class="dd-badge dd-badge-blue">${s.category}</span></td>
                        <td style="text-align:right;font-weight:600;">₱${parseFloat(s.price).toFixed(2)}</td>
                        <td style="text-align:center;">
                            <div class="dd-actions" style="justify-content:center;">
                                <button class="dd-btn-icon edit" data-id="${s.id}" title="Edit"><i class="fas fa-pencil"></i></button>
                                <button class="dd-btn-icon delete" data-id="${s.id}" title="Delete"><i class="fas fa-trash"></i></button>
                            </div>
                        </td>
                    `;
                    tr.querySelector('.edit').addEventListener('click', () => onEditService(s.id));
                    tr.querySelector('.delete').addEventListener('click', () => onDeleteService(s.id));
                    servicesTableBody.appendChild(tr);
                });
            });
    }

    // ── Edit handlers ─────────────────────────────────────────────
    function onEditProduct(id) {
        fetch(`/api/products/${id}`)
            .then(r => r.json())
            .then(p => {
                editingProductId = p.id;
                document.getElementById('productName').value      = p.name;
                document.getElementById('productCategory').value  = p.category || 'Select category';
                document.getElementById('productSalePrice').value = p.price;
                document.getElementById('productQuantity').value  = p.quantity;
                document.getElementById('productModalLabel').textContent = 'Edit Product';
                productModal.show();
            });
    }

    function onEditService(id) {
        fetch(`/api/services/${id}`)
            .then(r => r.json())
            .then(s => {
                editingServiceId = s.id;
                document.getElementById('serviceName').value      = s.name;
                document.getElementById('serviceCategory').value  = s.category || 'Select category';
                document.getElementById('serviceSalePrice').value = s.price;
                document.getElementById('serviceModalLabel').textContent = 'Edit Service';
                serviceModal.show();
            });
    }

    let adjustingProductId = null;
    let adjustingCurrentQty = 0;

    function onAdjustStock(productId, productName, currentQty) {
        adjustingProductId = productId;
        adjustingCurrentQty = currentQty;
        document.getElementById('adjustStockProductName').textContent = productName;
        document.getElementById('adjustStockCurrent').textContent = currentQty;
        document.getElementById('adjustStockDelta').value = '';
        document.getElementById('adjustStockNotes').value = '';
        document.getElementById('adjustStockPreview').textContent = '';
        document.getElementById('adjustStockError').style.display = 'none';
        adjustStockModal.show();
    }

    document.getElementById('adjustStockDelta').addEventListener('input', function () {
        const delta = parseInt(this.value);
        const preview = document.getElementById('adjustStockPreview');
        if (isNaN(delta) || delta === 0) {
            preview.textContent = '';
            return;
        }
        const newQty = adjustingCurrentQty + delta;
        const sign = delta > 0 ? '+' : '';
        const color = delta > 0 ? 'var(--success)' : 'var(--danger)';
        preview.innerHTML = `New stock will be <strong style="color:${color};">${newQty}</strong> (${sign}${delta})`;
    });

    document.getElementById('adjustStockSaveBtn').addEventListener('click', () => {
        const delta = parseInt(document.getElementById('adjustStockDelta').value);
        const notes = document.getElementById('adjustStockNotes').value.trim();
        const errEl = document.getElementById('adjustStockError');

        errEl.style.display = 'none';

        if (isNaN(delta) || delta === 0) {
            errEl.textContent = 'Please enter a non-zero adjustment value.';
            errEl.style.display = 'block';
            return;
        }

        const btn = document.getElementById('adjustStockSaveBtn');
        btn.disabled = true;
        btn.textContent = 'Saving…';

        fetch(`/api/products/${adjustingProductId}/adjust-stock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ delta, notes }),
        })
            .then(r => r.json())
            .then(d => {
                btn.disabled = false;
                btn.textContent = 'Apply Adjustment';
                if (d.error) {
                    errEl.textContent = d.error;
                    errEl.style.display = 'block';
                    return;
                }
                adjustStockModal.hide();
                loadProducts();
            })
            .catch(() => {
                btn.disabled = false;
                btn.textContent = 'Apply Adjustment';
                errEl.textContent = 'Request failed. Please try again.';
                errEl.style.display = 'block';
            });
    });

    function onViewStockLog(productId, productName) {
        document.getElementById('stockLogProductName').textContent = productName;
        document.getElementById('stockLogLoading').style.display = 'block';
        document.getElementById('stockLogContent').style.display = 'none';
        stockLogModal.show();

        fetch(`/api/inventory-log?product_id=${productId}`)
            .then(r => r.json())
            .then(entries => {
                const tbody = document.getElementById('stockLogTableBody');
                document.getElementById('stockLogLoading').style.display = 'none';
                document.getElementById('stockLogContent').style.display = 'block';

                if (!entries.length) {
                    tbody.innerHTML = '<tr><td colspan="4" class="dd-table-empty"><i class="fas fa-clock-rotate-left"></i> No stock changes recorded yet.</td></tr>';
                    return;
                }

                tbody.innerHTML = '';
                entries.forEach(e => {
                    const isPositive = e.delta > 0;
                    const sign = isPositive ? '+' : '';
                    const deltaColor = isPositive ? 'var(--success)' : 'var(--danger)';
                    const reasonBadge = {
                        sale:         '<span class="dd-badge dd-badge-red">Sale</span>',
                        void:         '<span class="dd-badge dd-badge-green">Void</span>',
                        edit_restore: '<span class="dd-badge dd-badge-gray">Edit (undo)</span>',
                        manual:       '<span class="dd-badge dd-badge-blue">Manual</span>',
                    }[e.reason] || `<span class="dd-badge dd-badge-gray">${e.reason_label}</span>`;

                    const txCell = e.transaction_id
                        ? `<span style="font-family:monospace;font-size:.85rem;">${e.transaction_id}</span>`
                        : '<span style="color:var(--text-muted);">—</span>';

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td style="color:var(--text-muted);font-size:.875rem;">${e.timestamp}</td>
                        <td style="text-align:center;font-weight:700;color:${deltaColor};">${sign}${e.delta}</td>
                        <td>${reasonBadge}</td>
                        <td>${txCell}</td>
                    `;
                    tbody.appendChild(tr);
                });
            })
            .catch(() => {
                document.getElementById('stockLogLoading').style.display = 'none';
                document.getElementById('stockLogContent').style.display = 'block';
                document.getElementById('stockLogTableBody').innerHTML =
                    '<tr><td colspan="4" class="dd-table-empty">Failed to load stock history.</td></tr>';
            });
    }

    function onDeleteProduct(id) {
        if (!confirm('Delete this product?')) return;
        fetch(`/api/products/${id}`, { method: 'DELETE' })
            .then(r => r.json())
            .then(d => { if (d.error) alert(d.error); else loadProducts(); });
    }

    function onDeleteService(id) {
        if (!confirm('Delete this service?')) return;
        fetch(`/api/services/${id}`, { method: 'DELETE' })
            .then(r => r.json())
            .then(d => { if (d.error) alert(d.error); else loadServices(); });
    }

    // ── Save handlers ─────────────────────────────────────────────
    document.getElementById('productSaveBtn').addEventListener('click', () => {
        const name     = document.getElementById('productName').value.trim();
        const category = document.getElementById('productCategory').value;
        const price    = parseFloat(document.getElementById('productSalePrice').value);
        const quantity = parseInt(document.getElementById('productQuantity').value);

        if (!name || isNaN(price) || isNaN(quantity)) {
            alert('Please fill in all required fields.');
            return;
        }

        const formData = new FormData();
        formData.append('name', name);
        formData.append('category', category);
        formData.append('price', price);
        formData.append('quantity', quantity);
        const fileInput = document.getElementById('productFileInput');
        if (fileInput.files.length > 0) formData.append('image', fileInput.files[0]);

        const url    = editingProductId ? `/api/products/${editingProductId}` : '/api/products';
        const method = editingProductId ? 'PUT' : 'POST';

        fetch(url, { method, body: formData })
            .then(r => r.json())
            .then(d => {
                if (d.error) { alert(d.error); return; }
                editingProductId = null;
                productModal.hide();
                loadProducts();
                document.getElementById('productModalLabel').textContent = 'Product Details';
            });
    });

    document.getElementById('serviceSaveBtn').addEventListener('click', () => {
        const name     = document.getElementById('serviceName').value.trim();
        const category = document.getElementById('serviceCategory').value;
        const price    = parseFloat(document.getElementById('serviceSalePrice').value);

        if (!name || isNaN(price)) {
            alert('Please fill in all required fields.');
            return;
        }

        const formData = new FormData();
        formData.append('name', name);
        formData.append('category', category);
        formData.append('price', price);
        const fileInput = document.getElementById('serviceFileInput');
        if (fileInput.files.length > 0) formData.append('image', fileInput.files[0]);

        const url    = editingServiceId ? `/api/services/${editingServiceId}` : '/api/services';
        const method = editingServiceId ? 'PUT' : 'POST';

        fetch(url, { method, body: formData })
            .then(r => r.json())
            .then(d => {
                if (d.error) { alert(d.error); return; }
                editingServiceId = null;
                serviceModal.hide();
                loadServices();
                document.getElementById('serviceModalLabel').textContent = 'Service Details';
            });
    });

    // ── Image preview ─────────────────────────────────────────────
    document.getElementById('productFileButton').addEventListener('click', () =>
        document.getElementById('productFileInput').click());
    document.getElementById('productFileInput').addEventListener('change', function () {
        const file = this.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            document.getElementById('productPreviewImage').src = e.target.result;
            document.getElementById('productRemoveImage').style.display = 'inline-flex';
        };
        reader.readAsDataURL(file);
    });
    document.getElementById('productRemoveImage').addEventListener('click', function () {
        document.getElementById('productFileInput').value = '';
        document.getElementById('productPreviewImage').src = 'https://placehold.co/80x80/EEE/31343C';
        this.style.display = 'none';
    });

    document.getElementById('serviceFileButton').addEventListener('click', () =>
        document.getElementById('serviceFileInput').click());
    document.getElementById('serviceFileInput').addEventListener('change', function () {
        const file = this.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            document.getElementById('servicePreviewImage').src = e.target.result;
            document.getElementById('serviceRemoveImage').style.display = 'inline-flex';
        };
        reader.readAsDataURL(file);
    });
    document.getElementById('serviceRemoveImage').addEventListener('click', function () {
        document.getElementById('serviceFileInput').value = '';
        document.getElementById('servicePreviewImage').src = 'https://placehold.co/80x80/EEE/31343C';
        this.style.display = 'none';
    });

    // ── Helpers ───────────────────────────────────────────────────
    function clearProductForm() {
        document.getElementById('productForm').reset();
        document.getElementById('productPreviewImage').src = 'https://placehold.co/80x80/EEE/31343C';
        document.getElementById('productRemoveImage').style.display = 'none';
        document.getElementById('productModalLabel').textContent = 'Product Details';
    }

    function clearServiceForm() {
        document.getElementById('serviceForm').reset();
        document.getElementById('servicePreviewImage').src = 'https://placehold.co/80x80/EEE/31343C';
        document.getElementById('serviceRemoveImage').style.display = 'none';
        document.getElementById('serviceModalLabel').textContent = 'Service Details';
    }

    // ── Initial load ──────────────────────────────────────────────
    loadServices();
    loadProducts();
});
