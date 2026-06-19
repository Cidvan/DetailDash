---
title: Add a sales report with charts showing revenue trends over time
---
# Add a sales report with charts showing revenue trends over time

  ## What & Why
  The dashboard shows today's and this month's totals, but there's no way to see trends, top services, or date-range reports. A Reports/Analytics page would help management make decisions about pricing, staffing, and promotions.

  ## Done looks like
  - New /reports page added to sidebar (between Job Orders and Inventory)
  - Line chart: daily revenue for the last 30 days (Chart.js with real transaction data)
  - Bar chart: top 5 services/products by revenue this month
  - Summary table: revenue by category (Exterior Wash, Detailing, etc.)
  - Date range picker to filter the charts

  ## Relevant files
  - `backend/app.py` — add /reports page route + /api/reports?start=&end= endpoint
  - `backend/templates/` — new reports.html extending base.html
  - `backend/static/js/` — new reports.js with Chart.js integration