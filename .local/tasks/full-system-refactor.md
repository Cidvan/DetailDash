# DetailDash Full System Modernization

## What & Why
Refactor DetailDash into a production-ready automotive service management platform. Preserve all existing functionality (auth, transactions, inventory, invoice, dashboard) while adding Customer Management, Vehicle Management, and Job Orders modules. Replace the patchwork CSS with a unified modern design system.

## Done looks like
- Login page looks modern and professional
- Dashboard shows stat cards (daily sales, monthly revenue, low stock count, pending jobs), a revenue chart, and recent transactions table
- Sidebar navigation includes all modules: Dashboard, Transactions, Customers, Vehicles, Job Orders, Inventory, Account
- Customer list page: create, edit, delete customers with name/phone/email/notes
- Vehicle list page: create, edit, delete vehicles with plate number, make, model, year, linked to a customer
- Job Orders page: create job orders linked to a customer + vehicle, assign services, set status (Pending / In Progress / Completed), view history
- Transactions page: same functionality as before — purchase list, new transaction modal, dynamic invoice modal with print, view/edit/delete rows
- Inventory page: same CRUD for products and services with image upload
- Account page: shows logged-in user info
- All pages are mobile-responsive
- No broken routes, no 500 errors, no JS console errors
- Dead files removed: `anader.html`, `frontend/` prototype folder, `backend/static/js/utils.js` (empty), duplicate CSS

## Out of scope
- OAuth or social login (keep email/password only)
- Role-based access control (single-user for now)
- PDF export for invoices (print-only stays)
- Real-time notifications
- Multi-branch / multi-location support

## Steps

1. **Database schema expansion** — Add `Customer` model (id, name, phone, email, notes), `Vehicle` model (id, plate, make, model, year, customer_id FK), `JobOrder` model (id, order_number, status, notes, customer_id FK, vehicle_id FK, assigned_to, created_at, completed_at). Add `JobOrderItem` to link services/products to a job order. Keep all existing models unchanged.

2. **Backend routes** — Add page routes `/customers`, `/vehicles`, `/job-orders` and full CRUD API routes `/api/customers`, `/api/customers/<id>`, `/api/vehicles`, `/api/vehicles/<id>`, `/api/job-orders`, `/api/job-orders/<id>`. Update `/api/items` to stay compatible. Update dashboard route to pass stat data (daily sales total, monthly total, low-stock count, pending job count) via template context.

3. **Design system** — Create a single `theme.css` with CSS custom properties for colors (primary blue #2563eb, sidebar dark #0f172a, surface white, danger red, success green, warning amber), typography (Inter font), spacing scale, border-radius, box-shadow, and utility classes for cards, badges, stat blocks, and action buttons. Replace the scattered component CSS files with a unified layout system.

4. **Base layout template** — Create `base.html` Jinja2 template with the shared sidebar nav (all 7 links), top navbar with user name + logout, main content slot, Bootstrap 5 CSS/JS. All other templates extend base.html to eliminate repeated navbar/sidebar markup.

5. **Modernize existing pages** — Rewrite `login.html`, `index.html` (dashboard), `transaction.html`, `inventory.html`, `account.html` to extend `base.html` and use the new design system. Dashboard gets stat cards + chart + recent transactions table. Transaction page keeps the existing modal + invoice modal (already dynamic). Inventory page keeps existing CRUD modals.

6. **New module pages** — Create `customers.html`, `vehicles.html`, `job-orders.html` extending `base.html`. Each has a page-level list table with Add/Edit/Delete actions, and a modal form. Vehicles modal has a customer dropdown. Job Orders modal has customer + vehicle dropdowns and a service/product line-item selector mirroring the transaction modal.

7. **JavaScript for new modules** — Create `customers.js`, `vehicles.js`, `job-orders.js` following the same pattern as `inventory.js` (fetch list on load, modal form, CRUD via fetch API). Update `main.js` dashboard to fetch and display stat card numbers and populate recent transactions table.

8. **Cleanup** — Delete `backend/templates/anader.html`, `frontend/` directory, `backend/static/js/utils.js` (empty), and all now-redundant per-page CSS files replaced by `theme.css`. Keep `invoice.css` (print styles must remain separate). Fix any broken static file references.

## Relevant files
- `backend/app.py`
- `backend/db.py`
- `backend/templates/index.html`
- `backend/templates/login.html`
- `backend/templates/transaction.html`
- `backend/templates/inventory.html`
- `backend/templates/account.html`
- `backend/static/js/main.js`
- `backend/static/js/transaction.js`
- `backend/static/js/inventory.js`
- `backend/static/css/style.css`
- `backend/static/css/invoice.css`
- `backend/static/css/dashboard.css`
- `backend/static/css/transaction.css`
- `backend/static/css/inventory.css`
- `backend/static/css/login.css`
