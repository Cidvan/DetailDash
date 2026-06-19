---
title: Keep a log of every stock change so staff can audit inventory history
---
# Keep a log of every stock change so staff can audit inventory history

  ## What & Why
  Stock adjustments from sales, voids, and manual edits currently leave no paper trail. An audit log lets managers investigate discrepancies and confirm stock movements match actual transactions.

  ## Done looks like
  - A new `InventoryLog` model records each stock change: product, delta, reason (sale / void / manual), timestamp, and the related transaction ID if applicable
  - `_deduct_product_stock` and `_restore_product_stock` write log entries
  - An API endpoint and UI page lets staff view the log per product

  ## Relevant files
  - `backend/db.py` — add `InventoryLog` model
  - `backend/routes/api.py` — `_deduct_product_stock()`, `_restore_product_stock()`, new log endpoint