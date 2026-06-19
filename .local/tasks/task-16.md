---
title: Let staff manually adjust product stock counts to fix discrepancies
---
# Let staff manually adjust product stock counts to fix discrepancies

  ## What & Why
  Automated stock deductions from sales are now in place, but real-world inventory can drift due to damaged goods, theft, or supplier errors. Staff need a way to correct counts directly from the inventory UI.

  ## Done looks like
  - The product edit form (or a dedicated stock adjustment modal) accepts a direct quantity override or a +/- delta with an optional reason note
  - The adjustment is saved and reflected immediately in stock counts

  ## Relevant files
  - `backend/routes/api.py` — `update_product()` endpoint
  - Frontend product management UI