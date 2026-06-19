---
title: Add login protection so only signed-in staff can access the app
---
# Add login protection so only signed-in staff can access the app

  ## What & Why
  Currently every page (Dashboard, Customers, Inventory, etc.) is publicly accessible without logging in — anyone with the URL can view and modify business data. All protected routes need a login_required guard that redirects to /login.

  ## Done looks like
  - A `login_required` decorator or helper is added to app.py
  - All page routes (/index, /transaction, /inventory, /customers, /vehicles, /job-orders, /account) redirect to /login if no session exists
  - API routes return 401 JSON when unauthenticated
  - After login, user is redirected to the page they originally tried to reach

  ## Relevant files
  - `backend/app.py` — all page and API route handlers
  - `backend/templates/base.html` — no change needed (sidebar already shows logout)