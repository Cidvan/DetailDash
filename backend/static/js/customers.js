document.addEventListener('DOMContentLoaded', () => {
    const tbody         = document.getElementById('customersTableBody');
    const searchInput   = document.getElementById('customerSearch');
    const addBtn        = document.getElementById('addCustomerBtn');
    const saveBtn       = document.getElementById('customerSaveBtn');
    const modalEl       = document.getElementById('customerModal');
    const modal         = new bootstrap.Modal(modalEl);
    const historyModalEl = document.getElementById('customerHistoryModal');
    const historyModal  = new bootstrap.Modal(historyModalEl);

    let customers = [];
    let editingId = null;

    function load() {
        fetch('/api/customers')
            .then(r => r.json())
            .then(data => { customers = data; render(); })
            .catch(() => showError('Failed to load customers.'));
    }

    function render(filter = '') {
        const term = filter.toLowerCase();
        const list = customers.filter(c =>
            c.name.toLowerCase().includes(term) ||
            (c.phone || '').toLowerCase().includes(term) ||
            (c.email || '').toLowerCase().includes(term)
        );

        tbody.innerHTML = '';
        if (!list.length) {
            tbody.innerHTML = `<tr><td colspan="5" class="dd-table-empty">
                <i class="fas fa-users"></i> No customers found.</td></tr>`;
            return;
        }

        list.forEach(c => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight:600;">${escHtml(c.name)}</td>
                <td style="color:var(--text-muted);">${escHtml(c.phone) || '<em style="color:#cbd5e1;">—</em>'}</td>
                <td style="color:var(--text-muted);">${escHtml(c.email) || '<em style="color:#cbd5e1;">—</em>'}</td>
                <td style="text-align:center;">
                    <span class="dd-badge dd-badge-blue">${c.vehicle_count}</span>
                </td>
                <td style="text-align:center;">
                    <div class="dd-actions" style="justify-content:center;">
                        <button class="dd-btn-icon view" title="View History" data-id="${c.id}">
                            <i class="fas fa-clock-rotate-left"></i>
                        </button>
                        <button class="dd-btn-icon edit" title="Edit" data-id="${c.id}">
                            <i class="fas fa-pencil"></i>
                        </button>
                        <button class="dd-btn-icon delete" title="Delete" data-id="${c.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tr.querySelector('.view').addEventListener('click', () => openHistory(c.id, c.name));
            tr.querySelector('.edit').addEventListener('click', () => openEdit(c.id));
            tr.querySelector('.delete').addEventListener('click', () => deleteCustomer(c.id, c.name));
            tbody.appendChild(tr);
        });
    }

    function openAdd() {
        editingId = null;
        document.getElementById('customerModalTitle').textContent = 'Add Customer';
        clearForm();
        modal.show();
    }

    function openEdit(id) {
        fetch(`/api/customers/${id}`)
            .then(r => r.json())
            .then(c => {
                editingId = id;
                document.getElementById('customerModalTitle').textContent = 'Edit Customer';
                document.getElementById('customerName').value  = c.name;
                document.getElementById('customerPhone').value = c.phone;
                document.getElementById('customerEmail').value = c.email;
                document.getElementById('customerNotes').value = c.notes;
                modal.show();
            });
    }

    function openHistory(id, name) {
        document.getElementById('historyCustomerName').textContent = name;
        document.getElementById('historyTxnBody').innerHTML = `<tr><td colspan="4" class="dd-table-empty"><i class="fas fa-spinner fa-spin"></i> Loading…</td></tr>`;
        document.getElementById('historyJoBody').innerHTML  = `<tr><td colspan="5" class="dd-table-empty"><i class="fas fa-spinner fa-spin"></i> Loading…</td></tr>`;
        historyModal.show();

        fetch(`/api/customers/${id}/history`)
            .then(r => r.json())
            .then(data => {
                renderHistoryTxns(data.transactions || []);
                renderHistoryJOs(data.job_orders || []);
            })
            .catch(() => {
                document.getElementById('historyTxnBody').innerHTML = `<tr><td colspan="4" class="dd-table-empty" style="color:var(--danger);">Failed to load.</td></tr>`;
                document.getElementById('historyJoBody').innerHTML  = `<tr><td colspan="5" class="dd-table-empty" style="color:var(--danger);">Failed to load.</td></tr>`;
            });
    }

    function renderHistoryTxns(txns) {
        const tbody = document.getElementById('historyTxnBody');
        if (!txns.length) {
            tbody.innerHTML = `<tr><td colspan="4" class="dd-table-empty"><i class="fas fa-receipt"></i> No transactions.</td></tr>`;
            return;
        }
        tbody.innerHTML = txns.map(t => `
            <tr>
                <td style="font-family:monospace;font-weight:600;">#${escHtml(t.transaction_id)}</td>
                <td style="color:var(--text-muted);">${escHtml(t.order_date)}</td>
                <td style="color:var(--text-muted);">${escHtml(t.vehicle_display) || '<em style="color:#cbd5e1;">—</em>'}</td>
                <td style="text-align:right;font-weight:600;color:var(--primary);">₱${parseFloat(t.total_amount).toFixed(2)}</td>
            </tr>
        `).join('');
    }

    function renderHistoryJOs(jos) {
        const tbody = document.getElementById('historyJoBody');
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
                    <td style="color:var(--text-muted);">${escHtml(jo.vehicle_display) || '<em style="color:#cbd5e1;">—</em>'}</td>
                    <td><span class="dd-badge ${badgeClass}">${escHtml(jo.status)}</span></td>
                    <td style="text-align:right;font-weight:600;color:var(--primary);">₱${parseFloat(jo.total || 0).toFixed(2)}</td>
                </tr>
            `;
        }).join('');
    }

    function save() {
        const name  = document.getElementById('customerName').value.trim();
        const phone = document.getElementById('customerPhone').value.trim();
        const email = document.getElementById('customerEmail').value.trim();
        const notes = document.getElementById('customerNotes').value.trim();

        if (!name) { alert('Customer name is required.'); return; }

        const payload = { name, phone, email, notes };
        const url    = editingId ? `/api/customers/${editingId}` : '/api/customers';
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

    function deleteCustomer(id, name) {
        if (!confirm(`Delete customer "${name}"? This will also remove their vehicles and job orders.`)) return;
        fetch(`/api/customers/${id}`, { method: 'DELETE' })
            .then(r => r.json())
            .then(() => load())
            .catch(err => alert(err.message));
    }

    function clearForm() {
        ['customerName', 'customerPhone', 'customerEmail', 'customerNotes'].forEach(id => {
            document.getElementById(id).value = '';
        });
    }

    function showError(msg) {
        tbody.innerHTML = `<tr><td colspan="5" class="dd-table-empty" style="color:var(--danger);">
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
