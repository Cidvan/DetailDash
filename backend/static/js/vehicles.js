document.addEventListener('DOMContentLoaded', () => {
    const tbody       = document.getElementById('vehiclesTableBody');
    const searchInput = document.getElementById('vehicleSearch');
    const addBtn      = document.getElementById('addVehicleBtn');
    const saveBtn     = document.getElementById('vehicleSaveBtn');
    const modalEl     = document.getElementById('vehicleModal');
    const modal       = new bootstrap.Modal(modalEl);
    const historyModalEl = document.getElementById('vehicleHistoryModal');
    const historyModal   = new bootstrap.Modal(historyModalEl);
    const customerSel = document.getElementById('vehicleCustomerId');

    let vehicles  = [];
    let customers = [];
    let editingId = null;

    function load() {
        Promise.all([
            fetch('/api/vehicles').then(r => r.json()),
            fetch('/api/customers').then(r => r.json()),
        ])
        .then(([v, c]) => {
            vehicles  = v;
            customers = c;
            populateCustomerSelect(customerSel, '');
            render();
        })
        .catch(() => showError('Failed to load vehicles.'));
    }

    function populateCustomerSelect(sel, selectedId) {
        sel.innerHTML = '<option value="">Select customer…</option>';
        customers.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.name;
            if (String(c.id) === String(selectedId)) opt.selected = true;
            sel.appendChild(opt);
        });
    }

    function render(filter = '') {
        const term = filter.toLowerCase();
        const list = vehicles.filter(v =>
            v.plate.toLowerCase().includes(term) ||
            v.make.toLowerCase().includes(term) ||
            v.model.toLowerCase().includes(term) ||
            (v.customer_name || '').toLowerCase().includes(term)
        );

        tbody.innerHTML = '';
        if (!list.length) {
            tbody.innerHTML = `<tr><td colspan="6" class="dd-table-empty">
                <i class="fas fa-car"></i> No vehicles found.</td></tr>`;
            return;
        }

        list.forEach(v => {
            const label = `${v.year || ''} ${v.make} ${v.model} (${v.plate})`.trim();
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span style="font-family:monospace;font-weight:700;background:var(--surface-2);padding:3px 8px;border-radius:4px;border:1px solid var(--border);">${escHtml(v.plate)}</span></td>
                <td style="font-weight:600;">${escHtml(v.make)} ${escHtml(v.model)}</td>
                <td style="color:var(--text-muted);">${v.year || '<em style="color:#cbd5e1;">—</em>'}</td>
                <td style="color:var(--text-muted);">${escHtml(v.color) || '<em style="color:#cbd5e1;">—</em>'}</td>
                <td>
                    <a href="/customers" style="color:var(--primary);font-weight:500;">
                        <i class="fas fa-user fa-xs me-1"></i>${escHtml(v.customer_name)}
                    </a>
                </td>
                <td style="text-align:center;">
                    <div class="dd-actions" style="justify-content:center;">
                        <button class="dd-btn-icon view" title="Service History" data-id="${v.id}">
                            <i class="fas fa-clock-rotate-left"></i>
                        </button>
                        <button class="dd-btn-icon edit" title="Edit" data-id="${v.id}">
                            <i class="fas fa-pencil"></i>
                        </button>
                        <button class="dd-btn-icon delete" title="Delete" data-id="${v.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tr.querySelector('.view').addEventListener('click', () => openHistory(v.id, label));
            tr.querySelector('.edit').addEventListener('click', () => openEdit(v.id));
            tr.querySelector('.delete').addEventListener('click', () => deleteVehicle(v.id, v.plate));
            tbody.appendChild(tr);
        });
    }

    function openAdd() {
        editingId = null;
        document.getElementById('vehicleModalTitle').textContent = 'Add Vehicle';
        clearForm();
        populateCustomerSelect(customerSel, '');
        modal.show();
    }

    function openEdit(id) {
        fetch(`/api/vehicles/${id}`)
            .then(r => r.json())
            .then(v => {
                editingId = id;
                document.getElementById('vehicleModalTitle').textContent = 'Edit Vehicle';
                populateCustomerSelect(customerSel, v.customer_id);
                document.getElementById('vehiclePlate').value = v.plate;
                document.getElementById('vehicleYear').value  = v.year || '';
                document.getElementById('vehicleMake').value  = v.make;
                document.getElementById('vehicleModel').value = v.model;
                document.getElementById('vehicleColor').value = v.color || '';
                modal.show();
            });
    }

    function openHistory(id, label) {
        document.getElementById('historyVehicleLabel').textContent = label;
        document.getElementById('vHistoryTxnBody').innerHTML = `<tr><td colspan="4" class="dd-table-empty"><i class="fas fa-spinner fa-spin"></i> Loading…</td></tr>`;
        document.getElementById('vHistoryJoBody').innerHTML  = `<tr><td colspan="5" class="dd-table-empty"><i class="fas fa-spinner fa-spin"></i> Loading…</td></tr>`;
        historyModal.show();

        fetch(`/api/vehicles/${id}/history`)
            .then(r => r.json())
            .then(data => {
                renderHistoryTxns(data.transactions || []);
                renderHistoryJOs(data.job_orders || []);
            })
            .catch(() => {
                document.getElementById('vHistoryTxnBody').innerHTML = `<tr><td colspan="4" class="dd-table-empty" style="color:var(--danger);">Failed to load.</td></tr>`;
                document.getElementById('vHistoryJoBody').innerHTML  = `<tr><td colspan="5" class="dd-table-empty" style="color:var(--danger);">Failed to load.</td></tr>`;
            });
    }

    function renderHistoryTxns(txns) {
        const tbody = document.getElementById('vHistoryTxnBody');
        if (!txns.length) {
            tbody.innerHTML = `<tr><td colspan="4" class="dd-table-empty"><i class="fas fa-receipt"></i> No transactions.</td></tr>`;
            return;
        }
        tbody.innerHTML = txns.map(t => `
            <tr>
                <td style="font-family:monospace;font-weight:600;">#${escHtml(t.transaction_id)}</td>
                <td style="color:var(--text-muted);">${escHtml(t.order_date)}</td>
                <td style="font-weight:500;">${escHtml(t.customer_name)}</td>
                <td style="text-align:right;font-weight:600;color:var(--primary);">₱${parseFloat(t.total_amount).toFixed(2)}</td>
            </tr>
        `).join('');
    }

    function renderHistoryJOs(jos) {
        const tbody = document.getElementById('vHistoryJoBody');
        if (!jos.length) {
            tbody.innerHTML = `<tr><td colspan="5" class="dd-table-empty"><i class="fas fa-clipboard-list"></i> No job orders.</td></tr>`;
            return;
        }
        tbody.innerHTML = jos.map(jo => {
            const badgeClass = jo.status === 'Completed' ? 'dd-badge-green' : 'dd-badge-yellow';
            return `
                <tr>
                    <td style="font-family:monospace;font-weight:600;">${escHtml(jo.order_number)}</td>
                    <td style="color:var(--text-muted);">${escHtml((jo.created_at || '').slice(0, 10))}</td>
                    <td style="color:var(--text-muted);">${escHtml(jo.assigned_to) || '<em style="color:#cbd5e1;">—</em>'}</td>
                    <td><span class="dd-badge ${badgeClass}">${escHtml(jo.status)}</span></td>
                    <td style="text-align:right;font-weight:600;color:var(--primary);">₱${parseFloat(jo.total || 0).toFixed(2)}</td>
                </tr>
            `;
        }).join('');
    }

    function save() {
        const customer_id = document.getElementById('vehicleCustomerId').value;
        const plate       = document.getElementById('vehiclePlate').value.trim().toUpperCase();
        const year        = parseInt(document.getElementById('vehicleYear').value) || null;
        const make        = document.getElementById('vehicleMake').value.trim();
        const model       = document.getElementById('vehicleModel').value.trim();
        const color       = document.getElementById('vehicleColor').value.trim();

        if (!customer_id) { alert('Please select a customer.'); return; }
        if (!plate || !make || !model) { alert('Plate, make, and model are required.'); return; }

        const payload = { customer_id: parseInt(customer_id), plate, year, make, model, color };
        const url     = editingId ? `/api/vehicles/${editingId}` : '/api/vehicles';
        const method  = editingId ? 'PUT' : 'POST';

        fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
        .then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error); }); return r.json(); })
        .then(() => { modal.hide(); load(); })
        .catch(err => alert(err.message));
    }

    function deleteVehicle(id, plate) {
        if (!confirm(`Delete vehicle "${plate}"? This will also remove its job orders.`)) return;
        fetch(`/api/vehicles/${id}`, { method: 'DELETE' })
            .then(r => r.json())
            .then(() => load())
            .catch(err => alert(err.message));
    }

    function clearForm() {
        ['vehiclePlate', 'vehicleYear', 'vehicleMake', 'vehicleModel', 'vehicleColor'].forEach(id => {
            document.getElementById(id).value = '';
        });
    }

    function showError(msg) {
        tbody.innerHTML = `<tr><td colspan="6" class="dd-table-empty" style="color:var(--danger);">
            <i class="fas fa-circle-exclamation"></i> ${msg}</td></tr>`;
    }

    function escHtml(str) {
        const d = document.createElement('div');
        d.textContent = str || '';
        return d.innerHTML;
    }

    addBtn.addEventListener('click', openAdd);
    saveBtn.addEventListener('click', save);
    searchInput.addEventListener('input', e => render(e.target.value));

    load();
});
