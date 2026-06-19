from datetime import date

from flask import Blueprint, render_template, session

from db import db, JobOrder, Product, Transaction, User
from routes import login_required

pages_bp = Blueprint("pages", __name__)


@pages_bp.route("/index")
@login_required
def index():
    today = date.today()
    first_day = today.replace(day=1)

    daily_txns = Transaction.query.filter(Transaction.order_date == today).all()
    monthly_txns = Transaction.query.filter(Transaction.order_date >= first_day).all()

    daily_sales = sum(t.total_amount for t in daily_txns)
    monthly_revenue = sum(t.total_amount for t in monthly_txns)
    low_stock = Product.query.filter(Product.quantity <= 5).count()
    pending_jobs = JobOrder.query.filter(JobOrder.status == "Pending").count()

    recent = Transaction.query.order_by(Transaction.id.desc()).limit(5).all()
    recent_transactions = [
        {
            "transaction_id": t.transaction_id,
            "customer_name": t.customer_name,
            "order_date": t.order_date.isoformat() if t.order_date else "",
            "total_amount": t.total_amount,
        }
        for t in recent
    ]

    return render_template(
        "index.html",
        daily_sales=daily_sales,
        monthly_revenue=monthly_revenue,
        low_stock=low_stock,
        pending_jobs=pending_jobs,
        recent_transactions=recent_transactions,
    )


@pages_bp.route("/account")
@login_required
def account():
    uid = session.get("user_id")
    user = db.session.get(User, uid)
    return render_template("account.html", user=user)


@pages_bp.route("/transaction")
@login_required
def transaction():
    return render_template("transaction.html")


@pages_bp.route("/inventory")
@login_required
def inventory():
    return render_template("inventory.html")


@pages_bp.route("/customers")
@login_required
def customers():
    return render_template("customers.html")


@pages_bp.route("/vehicles")
@login_required
def vehicles():
    return render_template("vehicles.html")


@pages_bp.route("/job-orders")
@login_required
def job_orders():
    return render_template("job_orders.html")


@pages_bp.route("/reports")
@login_required
def reports():
    return render_template("reports.html")
