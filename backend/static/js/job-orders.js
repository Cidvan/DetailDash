document.addEventListener('DOMContentLoaded', () => {
    const tbody        = document.getElementById('jobOrdersTableBody');
    const searchInput  = document.getElementById('jobSearch');
    const statusFilter = document.getElementById('jobStatusFilter');
    const addBtn       = document.getElementById('addJobBtn');
    const saveBtn      = document.getElementById('jobSaveBtn');
    const modalEl      = document.getElementById('jobModal');
    const modal        = new bootstrap.Modal(modalEl);
    const customerSel  = document.getElementById('jobCustomerId');
    const vehicleSel   = document.getElementById('jobVehicleId');
    const addItemBtn   = document.getElementById('addJobItemBtn');
    const jobItemsList = document.getElementById('jobItemsList');
    const jobTotalEl   = document.getElementById('jobTotal');

    let jobOrders  = [];
    let customers  = [];
    let allVehicles = [];
    let catalog    = [];   // combined services + products from /api/items
    let jobItems   = [];
    let editingId  = null;

    const STATUS_CLASSES = {
        'Pending':     'dd-badge-amber',
        'In Progress': 'dd-badge-blue',
        'Completed':   'dd-badge-green',
        'Cancelled':   'dd-badge-gray',
    };

    function load() {
        Promise.all([
            fetch('/api/job-orders').then(r => r.json()),
            fetch('/api/customers').then(r => r.json()),
            fetch('/api/vehicles').then(r => r.json()),
            fetch('/api/items').then(r => r.json()),
        ])
        .then(([jo, c, v, items]) => {
            jobOrders   = jo;
            customers   = c;
            allVehicles = v;
            catalog     = items;
            populateCustomerSelect('');
            render();
        })
        .catch(() => showError('Failed to load job orders.'));
    }

    function populateCustomerSelect(selectedId) {
        customerSel.innerHTML = '<option value="">Select customer…</option>';
        customers.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.name;
            if (String(c.id) === String(selectedId)) opt.selected = true;
            customerSel.appendChild(opt);
        });
    }

    function populateVehicleSelect(customerId, selectedId) {
        vehicleSel.innerHTML = '<option value="">(No vehicle / walk-in)</option>';
        vehicleSel.disabled = !customerId;
        if (!customerId) return;
        const myVehicles = allVehicles.filter(v => String(v.customer_id) === String(customerId));
        myVehicles.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.id;
            opt.textContent = `${v.year || ''} ${v.make} ${v.model} — ${v.plate}`.trim();
            if (String(v.id) === String(selectedId)) opt.selected = true;
            vehicleSel.appendChild(opt);
        });
    }

    customerSel.addEventListener('change', () => {
        populateVehicleSelect(customerSel.value, '');
    });

    function render() {
        const term   = searchInput.value.toLowerCase();
        const status = statusFilter.value;

        const list = jobOrders.filter(jo => {
            const matchSearch = !term ||
                jo.order_number.toLowerCase().includes(term) ||
                jo.customer_name.toLowerCase().includes(term) ||
                (jo.vehicle_plate || '').toLowerCase().includes(term);
            const matchStatus = !status || jo.status === status;
            return matchSearch && matchStatus;
        });

        tbody.innerHTML = '';
        if (!list.length) {
            tbody.innerHTML = `<tr><td colspan="8" class="dd-table-empty">
                <i class="fas fa-clipboard-list"></i> No job orders found.</td></tr>`;
            return;
        }

        list.forEach(jo => {
            const badgeClass = STATUS_CLASSES[jo.status] || 'dd-badge-gray';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span style="font-family:monospace;font-weight:600;font-size:.8rem;">${escHtml(jo.order_number)}</span></td>
                <td style="font-weight:500;">${escHtml(jo.customer_name)}</td>
                <td style="color:var(--text-muted);">${escHtml(jo.vehicle_display) || '<em style="color:#cbd5e1;">—</em>'}</td>
                <td style="color:var(--text-muted);">${escHtml(jo.assigned_to) || '<em style="color:#cbd5e1;">—</em>'}</td>
                <td><span class="dd-badge ${badgeClass}">${jo.status}</span></td>
                <td style="text-align:right;font-weight:600;color:var(--primary);">₱${parseFloat(jo.total || 0).toFixed(2)}</td>
                <td style="color:var(--text-muted);font-size:.8rem;">${formatDate(jo.created_at)}</td>
                <td style="text-align:center;">
                    <div class="dd-actions" style="justify-content:center;">
                        <button class="dd-btn-icon edit" title="Edit" data-id="${jo.id}">
                            <i class="fas fa-pencil"></i>
                        </button>
                        <button class="dd-btn-icon delete" title="Delete" data-id="${jo.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tr.querySelector('.edit').addEventListener('click', () => openEdit(jo.id));
            tr.querySelector('.delete').addEventListener('click', () => deleteJob(jo.id, jo.order_number));
            tbody.appendChild(tr);
        });
    }

    function openAdd() {
        editingId = null;
        document.getElementById('jobModalTitle').textContent = 'New Job Order';
        clearForm();
        modal.show();
    }

    function openEdit(id) {
        fetch(`/api/job-orders/${id}`)
            .then(r => r.json())
            .then(jo => {
                editingId = id;
                document.getElementById('jobModalTitle').textContent = `Edit ${jo.order_number}`;
                populateCustomerSelect(jo.customer_id);
                populateVehicleSelect(jo.customer_id, jo.vehicle_id);
                document.getElementById('jobStatus').value     = jo.status;
                document.getElementById('jobAssignedTo').value = jo.assigned_to || '';
                document.getElementById('jobNotes').value      = jo.notes || '';
                jobItems = (jo.items || []).map(i => ({ ...i }));
                renderJobItems();
                modal.show();
            });
    }

    function save() {
        const customer_id  = customerSel.value;
        const vehicle_id   = vehicleSel.value || null;
        const status       = document.getElementById('jobStatus').value;
        const assigned_to  = document.getElementById('jobAssignedTo').value.trim();
        const notes        = document.getElementById('jobNotes').value.trim();

        if (!customer_id) { alert('Please select a customer.'); return; }

        const payload = {
            customer_id: parseInt(customer_id),
            vehicle_id: vehicle_id ? parseInt(vehicle_id) : null,
            status, assigned_to, notes,
            items: jobItems.map(i => ({
                item_name: i.item_name,
                item_type: i.item_type,
                price: parseFloat(i.price),
                quantity: parseInt(i.quantity),
            })),
        };

        const url    = editingId ? `/api/job-orders/${editingId}` : '/api/job-orders';
        const method = editingId ? 'PUT' : 'POST';

        fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
        .then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error); }); return r.json(); })
        .then(() => { modal.hide(); load(); })
        .catch(err => alert(err.message));
    }

    function deleteJob(id, orderNum) {
        if (!confirm(`Delete job order "${orderNum}"?`)) return;
        fetch(`/api/job-orders/${id}`, { method: 'DELETE' })
            .then(r => r.json())
            .then(() => load())
            .catch(err => alert(err.message));
    }

    // ── Catalog picker ────────────────────────────────────────────────

    let catalogPickerOpen = false;

    function buildCatalogPicker() {
        const existing = document.getElementById('joCatalogPicker');
        if (existing) { existing.remove(); }

        const picker = document.createElement('div');
        picker.id = 'joCatalogPicker';
        picker.style.cssText = `
            border:1px solid var(--border);border-radius:8px;background:#fff;
            max-height:220px;overflow-y:auto;margin-bottom:8px;
        `;

        const header = document.createElement('div');
        header.style.cssText = 'padding:8px 12px;border-bottom:1px solid var(--border);display:flex;gap:8px;align-items:center;';
        const searchBox = document.createElement('input');
        searchBox.type = 'text';
        searchBox.placeholder = 'Search services & products…';
        searchBox.className = 'dd-form-control';
        searchBox.style.cssText = 'flex:1;font-size:.8rem;padding:5px 10px;';
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.innerHTML = '<i class="fas fa-xmark"></i>';
        closeBtn.className = 'dd-btn-icon';
        closeBtn.title = 'Close';
        header.appendChild(searchBox);
        header.appendChild(closeBtn);
        picker.appendChild(header);

        const list = document.createElement('div');
        list.style.cssText = 'padding:4px 0;';

        function renderCatalogList(term) {
            list.innerHTML = '';
            const filtered = catalog.filter(item =>
                !term || item.name.toLowerCase().includes(term.toLowerCase()) ||
                item.category.toLowerCase().includes(term.toLowerCase())
            );
            if (!filtered.length) {
                list.innerHTML = '<div style="padding:12px;text-align:center;color:var(--text-muted);font-size:.8rem;">No items found</div>';
                return;
            }
            filtered.forEach(item => {
                const row = document.createElement('div');
                row.style.cssText = `
                    display:flex;align-items:center;justify-content:space-between;
                    padding:7px 12px;cursor:pointer;transition:background .1s;font-size:.82rem;
                `;
                row.innerHTML = `
                    <div>
                        <span style="font-weight:500;">${escHtml(item.name)}</span>
                        <span style="margin-left:6px;" class="dd-badge ${item.type === 'Service' ? 'dd-badge-blue' : 'dd-badge-green'}">${item.type}</span>
                    </div>
                    <span style="font-weight:600;color:var(--primary);">₱${parseFloat(item.price).toFixed(2)}</span>
                `;
                row.addEventListener('mouseenter', () => row.style.background = 'var(--surface)');
                row.addEventListener('mouseleave', () => row.style.background = '');
                row.addEventListener('click', () => {
                    jobItems.push({ item_name: item.name, item_type: item.type, price: item.price, quantity: 1 });
                    renderJobItems();
                    picker.remove();
                    catalogPickerOpen = false;
                });
                list.appendChild(row);
            });
        }

        renderCatalogList('');
        searchBox.addEventListener('input', () => renderCatalogList(searchBox.value));
        closeBtn.addEventListener('click', () => { picker.remove(); catalogPickerOpen = false; });

        picker.appendChild(list);
        return picker;
    }

    addItemBtn.addEventListener('click', () => {
        if (catalogPickerOpen) {
            const existing = document.getElementById('joCatalogPicker');
            if (existing) { existing.remove(); }
            catalogPickerOpen = false;
            return;
        }
        catalogPickerOpen = true;
        const picker = buildCatalogPicker();
        jobItemsList.parentNode.insertBefore(picker, jobItemsList);
        picker.querySelector('input').focus();
    });

    // ── Item list renderer ────────────────────────────────────────────

    function renderJobItems() {
        jobItemsList.innerHTML = '';
        if (!jobItems.length) {
            jobItemsList.innerHTML = '<p style="font-size:.8rem;color:var(--text-muted);font-style:italic;margin:0;">No items yet. Click "Add from Catalog" or enter manually below.</p>';
            updateTotal();
            return;
        }

        jobItems.forEach((item, idx) => {
            const row = document.createElement('div');
            row.style.cssText = 'display:grid;grid-template-columns:1fr 90px 90px 70px 32px;gap:8px;margin-bottom:8px;align-items:center;';
            row.innerHTML = `
                <input class="dd-form-control" placeholder="Service / item name" value="${escHtml(item.item_name)}" style="font-size:.8rem;padding:6px 10px;"/>
                <select class="dd-form-control" style="font-size:.8rem;padding:6px 8px;">
                    <option value="Service" ${item.item_type === 'Service' ? 'selected' : ''}>Service</option>
                    <option value="Product" ${item.item_type === 'Product' ? 'selected' : ''}>Product</option>
                </select>
                <input type="number" class="dd-form-control" placeholder="Price" value="${item.price}" min="0" step="0.01" style="font-size:.8rem;padding:6px 10px;"/>
                <input type="number" class="dd-form-control" placeholder="Qty" value="${item.quantity}" min="1" style="font-size:.8rem;padding:6px 10px;"/>
                <button class="dd-btn-icon delete" title="Remove"><i class="fas fa-xmark"></i></button>
            `;
            const [nameIn, typeIn, priceIn, qtyIn] = row.querySelectorAll('input, select');
            nameIn.addEventListener('input',  e => { jobItems[idx].item_name = e.target.value; });
            typeIn.addEventListener('change', e => { jobItems[idx].item_type  = e.target.value; });
            priceIn.addEventListener('input', e => { jobItems[idx].price = e.target.value; updateTotal(); });
            qtyIn.addEventListener('input',   e => { jobItems[idx].quantity = e.target.value; updateTotal(); });
            row.querySelector('.delete').addEventListener('click', () => {
                jobItems.splice(idx, 1);
                renderJobItems();
            });
            jobItemsList.appendChild(row);
        });

        updateTotal();
    }

    function updateTotal() {
        const total = jobItems.reduce((s, i) => s + (parseFloat(i.price) || 0) * (parseInt(i.quantity) || 1), 0);
        jobTotalEl.textContent = `₱${total.toFixed(2)}`;
    }

    function clearForm() {
        populateCustomerSelect('');
        populateVehicleSelect('', '');
        document.getElementById('jobStatus').value     = 'Pending';
        document.getElementById('jobAssignedTo').value = '';
        document.getElementById('jobNotes').value      = '';
        jobItems = [];
        renderJobItems();
        const existing = document.getElementById('joCatalogPicker');
        if (existing) { existing.remove(); }
        catalogPickerOpen = false;
    }

    function formatDate(iso) {
        if (!iso) return '—';
        const d = new Date(iso);
        return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function showError(msg) {
        tbody.innerHTML = `<tr><td colspan="8" class="dd-table-empty" style="color:var(--danger);">
            <i class="fas fa-circle-exclamation"></i> ${msg}</td></tr>`;
    }

    function escHtml(str) {
        const d = document.createElement('div');
        d.textContent = str || '';
        return d.innerHTML;
    }

    addBtn.addEventListener('click', openAdd);
    saveBtn.addEventListener('click', save);
    searchInput.addEventListener('input', render);
    statusFilter.addEventListener('change', render);

    load();
});
