import os
from datetime import date, datetime, timedelta

from flask import Blueprint, current_app, jsonify, request, url_for
from werkzeug.utils import secure_filename

from db import (
    db, Customer, InventoryLog, JobOrder, JobOrderItem,
    Product, Service, Transaction, TransactionItem, Vehicle,
)
from routes import api_login_required

api_bp = Blueprint("api", __name__, url_prefix="/api")

ALLOWED_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp", "jfif"}


# ─── Shared helpers ───────────────────────────────────────────────

def _allowed_image(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS


def _handle_image_upload():
    image = request.files.get("image")
    if not image or image.filename == "":
        return None
    if not _allowed_image(image.filename):
        return None
    filename = secure_filename(image.filename)
    image.save(os.path.join(current_app.config["UPLOAD_FOLDER"], filename))
    return filename


def _image_url(image_path):
    if not image_path:
        return ""
    return url_for("static", filename=f"assets/images/uploads/{image_path}")


def _parse_date(value):
    if not value:
        return datetime.utcnow().date()
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return datetime.utcnow().date()


# ─── Dashboard ────────────────────────────────────────────────────

@api_bp.route("/dashboard-stats", methods=["GET"])
@api_login_required
def dashboard_stats():
    today = date.today()
    first_day = today.replace(day=1)
    daily_txns = Transaction.query.filter(Transaction.order_date == today).all()
    monthly_txns = Transaction.query.filter(Transaction.order_date >= first_day).all()
    return jsonify({
        "daily_sales": sum(t.total_amount for t in daily_txns),
        "monthly_revenue": sum(t.total_amount for t in monthly_txns),
        "low_stock": Product.query.filter(Product.quantity <= 5).count(),
        "pending_jobs": JobOrder.query.filter(JobOrder.status == "Pending").count(),
        "total_customers": Customer.query.count(),
    })


@api_bp.route("/dashboard-revenue", methods=["GET"])
@api_login_required
def dashboard_revenue():
    today = date.today()
    labels, values = [], []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        total = db.session.query(db.func.sum(Transaction.total_amount)).filter(
            Transaction.order_date == d
        ).scalar() or 0
        labels.append(d.strftime("%b %d"))
        values.append(round(float(total), 2))
    return jsonify({"labels": labels, "values": values})


# ─── Reports ──────────────────────────────────────────────────────

@api_bp.route("/reports", methods=["GET"])
@api_login_required
def reports_api():
    raw_start = request.args.get("start")
    raw_end = request.args.get("end")

    try:
        start_date = datetime.strptime(raw_start, "%Y-%m-%d").date() if raw_start else (date.today() - timedelta(days=29))
        end_date = datetime.strptime(raw_end, "%Y-%m-%d").date() if raw_end else date.today()
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400

    if start_date > end_date:
        start_date, end_date = end_date, start_date

    txns = Transaction.query.filter(
        Transaction.order_date >= start_date,
        Transaction.order_date <= end_date,
    ).all()

    total_revenue = sum(t.total_amount for t in txns)
    transaction_count = len(txns)

    daily_map = {}
    delta = (end_date - start_date).days
    for i in range(delta + 1):
        daily_map[start_date + timedelta(days=i)] = 0.0
    for t in txns:
        if t.order_date in daily_map:
            daily_map[t.order_date] += float(t.total_amount)
    daily = [
        {"date": d.strftime("%b %d"), "revenue": round(rev, 2)}
        for d, rev in sorted(daily_map.items())
    ]

    item_revenue = {}
    for t in txns:
        for item in t.items:
            item_revenue[item.item_name] = item_revenue.get(item.item_name, 0.0) + float(item.price)
    top_items = sorted(item_revenue.items(), key=lambda x: x[1], reverse=True)[:5]
    top_items = [{"name": name, "revenue": round(rev, 2)} for name, rev in top_items]

    cat_map = {}
    for t in txns:
        for item in t.items:
            cat = item.item_type or "Other"
            if cat not in cat_map:
                cat_map[cat] = {"revenue": 0.0, "count": 0}
            cat_map[cat]["revenue"] += float(item.price)
            cat_map[cat]["count"] += 1
    by_category = sorted(
        [{"category": cat, "revenue": round(v["revenue"], 2), "count": v["count"]} for cat, v in cat_map.items()],
        key=lambda x: x["revenue"], reverse=True,
    )

    return jsonify({
        "total_revenue": round(total_revenue, 2),
        "transaction_count": transaction_count,
        "daily": daily,
        "top_items": top_items,
        "by_category": by_category,
    })


# ─── Transactions ─────────────────────────────────────────────────

def _restore_product_stock(items, transaction_id=None, reason="void"):
    """Add back sold quantity to stock and write an audit log entry."""
    for item in items:
        if item.item_type == "Product":
            product = (
                db.session.get(Product, item.product_id)
                if item.product_id
                else Product.query.filter_by(name=item.item_name).first()
            )
            if product:
                product.quantity += item.quantity
                db.session.add(InventoryLog(
                    product_id=product.id,
                    delta=item.quantity,
                    reason=reason,
                    transaction_id=transaction_id,
                ))


def _deduct_product_stock(items, transaction_id=None, reason="sale"):
    """Subtract sold quantity from stock and write an audit log entry."""
    for item in items:
        if item.item_type == "Product":
            product = (
                db.session.get(Product, item.product_id)
                if item.product_id
                else Product.query.filter_by(name=item.item_name).first()
            )
            if product:
                product.quantity -= item.quantity
                db.session.add(InventoryLog(
                    product_id=product.id,
                    delta=-item.quantity,
                    reason=reason,
                    transaction_id=transaction_id,
                ))

def _transaction_dict(t):
    return {
        "transaction_id": t.transaction_id,
        "customer_name": t.customer_name,
        "customer_id": t.customer_id,
        "vehicle_id": t.vehicle_id,
        "vehicle_display": (
            f"{t.vehicle.year or ''} {t.vehicle.make} {t.vehicle.model} ({t.vehicle.plate})".strip()
            if t.vehicle else ""
        ),
        "order_date": t.order_date.isoformat() if t.order_date else "",
        "total_amount": t.total_amount,
        "items": [
            {
                "name": i.item_name,
                "price": i.price,
                "category": i.item_type,
                "quantity": i.quantity,
                "product_id": i.product_id,
            }
            for i in t.items
        ],
    }


@api_bp.route("/transactions", methods=["GET"])
@api_login_required
def get_transactions():
    txns = Transaction.query.order_by(Transaction.order_date.desc()).all()
    return jsonify([_transaction_dict(t) for t in txns])


@api_bp.route("/transaction", methods=["POST"])
@api_login_required
def save_transaction():
    data = request.get_json(silent=True) or {}
    transaction_id = data.get("transaction_id") or str(int(datetime.utcnow().timestamp()))
    customer_name = data.get("customer_name") or "Walk-in Customer"
    items = data.get("items", [])

    customer_id = data.get("customer_id") or None
    vehicle_id = data.get("vehicle_id") or None

    if customer_id:
        c = db.session.get(Customer, customer_id)
        if not c:
            customer_id = None
        else:
            customer_name = c.name

    if vehicle_id:
        v = db.session.get(Vehicle, vehicle_id)
        if not v:
            vehicle_id = None

    try:
        total_amount = float(data.get("total_amount", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid total amount"}), 400

    tx = Transaction.query.filter_by(transaction_id=transaction_id).first()
    if not tx:
        tx = Transaction(transaction_id=transaction_id)
        db.session.add(tx)

    tx.customer_name = customer_name
    tx.customer_id = customer_id
    tx.vehicle_id = vehicle_id
    tx.order_date = _parse_date(data.get("order_date"))
    tx.total_amount = total_amount

    _restore_product_stock(tx.items[:], transaction_id=transaction_id, reason="edit_restore")

    for item in tx.items[:]:
        db.session.delete(item)

    new_items = []
    for item_data in items:
        item_type = item_data.get("category", "Item")

        # Resolve product_id via frontend hint ("p-{id}" or explicit product_id),
        # then fall back to a server-side name lookup for product items.
        # Storing the ID now means future edits/deletes use a stable FK,
        # not a mutable product name.
        pid = None
        raw_id = item_data.get("id", "")
        if isinstance(raw_id, str) and raw_id.startswith("p-"):
            try:
                pid = int(raw_id[2:])
            except ValueError:
                pid = None
        if pid is None and item_data.get("product_id"):
            try:
                pid = int(item_data["product_id"])
            except (ValueError, TypeError):
                pid = None
        if pid is None and item_type == "Product":
            matched = Product.query.filter_by(name=item_data.get("name", "")).first()
            if matched:
                pid = matched.id

        qty = 1
        try:
            qty = max(1, int(item_data.get("quantity", 1)))
        except (ValueError, TypeError):
            qty = 1

        ti = TransactionItem(
            item_name=item_data.get("name", "Unnamed item"),
            price=float(item_data.get("price", 0)),
            item_type=item_type,
            quantity=qty,
            product_id=pid,
            transaction=tx,
        )
        db.session.add(ti)
        new_items.append(ti)

    _deduct_product_stock(new_items, transaction_id=transaction_id, reason="sale")

    try:
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": str(exc)}), 500

    return jsonify({"message": "Transaction saved successfully"}), 200


@api_bp.route("/transaction/<transaction_id>", methods=["DELETE"])
@api_login_required
def delete_transaction(transaction_id):
    tx = Transaction.query.filter_by(transaction_id=transaction_id).first()
    if not tx:
        return jsonify({"error": "Transaction not found"}), 404
    _restore_product_stock(tx.items[:], transaction_id=transaction_id, reason="void")
    db.session.delete(tx)
    db.session.commit()
    return jsonify({"message": "Transaction deleted successfully"}), 200


# ─── Inventory Log ────────────────────────────────────────────────

@api_bp.route("/inventory-log", methods=["GET"])
@api_login_required
def get_inventory_log():
    product_id = request.args.get("product_id", type=int)
    q = InventoryLog.query
    if product_id:
        q = q.filter_by(product_id=product_id)
    entries = q.order_by(InventoryLog.timestamp.desc()).limit(500).all()
    reason_labels = {
        "sale": "Sale",
        "void": "Void",
        "edit_restore": "Edit (undo)",
        "manual": "Manual",
    }
    return jsonify([
        {
            "id": e.id,
            "product_id": e.product_id,
            "product_name": e.product.name if e.product else "",
            "delta": e.delta,
            "reason": e.reason,
            "reason_label": reason_labels.get(e.reason, e.reason),
            "transaction_id": e.transaction_id or "",
            "notes": e.notes or "",
            "timestamp": e.timestamp.strftime("%b %d, %Y %I:%M %p"),
        }
        for e in entries
    ])


@api_bp.route("/customers/<int:customer_id>/history", methods=["GET"])
@api_login_required
def get_customer_history(customer_id):
    c = db.session.get(Customer, customer_id)
    if not c:
        return jsonify({"error": "Customer not found"}), 404
    txns = Transaction.query.filter_by(customer_id=customer_id).order_by(Transaction.order_date.desc()).all()
    jos = JobOrder.query.filter_by(customer_id=customer_id).order_by(JobOrder.created_at.desc()).all()
    return jsonify({
        "transactions": [_transaction_dict(t) for t in txns],
        "job_orders": [_job_order_dict(jo) for jo in jos],
    })


@api_bp.route("/vehicles/<int:vehicle_id>/history", methods=["GET"])
@api_login_required
def get_vehicle_history(vehicle_id):
    v = db.session.get(Vehicle, vehicle_id)
    if not v:
        return jsonify({"error": "Vehicle not found"}), 404
    txns = Transaction.query.filter_by(vehicle_id=vehicle_id).order_by(Transaction.order_date.desc()).all()
    jos = JobOrder.query.filter_by(vehicle_id=vehicle_id).order_by(JobOrder.created_at.desc()).all()
    return jsonify({
        "transactions": [_transaction_dict(t) for t in txns],
        "job_orders": [_job_order_dict(jo) for jo in jos],
    })


# ─── Items (combined services + products for POS) ─────────────────

@api_bp.route("/items", methods=["GET"])
@api_login_required
def get_items():
    services = [
        {"id": f"s-{s.id}", "name": s.name, "category": s.category, "price": s.price, "type": "Service"}
        for s in Service.query.order_by(Service.name.asc()).all()
    ]
    products = [
        {"id": f"p-{p.id}", "name": p.name, "category": p.category, "price": p.price, "type": "Product", "quantity": p.quantity}
        for p in Product.query.order_by(Product.name.asc()).all()
    ]
    return jsonify(services + products)


# ─── Products ─────────────────────────────────────────────────────

@api_bp.route("/products", methods=["GET"])
@api_login_required
def get_products():
    return jsonify([
        {"id": p.id, "name": p.name, "category": p.category,
         "price": p.price, "quantity": p.quantity, "image_path": p.image_path}
        for p in Product.query.order_by(Product.name.asc()).all()
    ])


@api_bp.route("/products", methods=["POST"])
@api_login_required
def add_product():
    image_filename = _handle_image_upload()
    name = request.form.get("name")
    category = request.form.get("category")
    price = request.form.get("price", type=float)
    quantity = request.form.get("quantity", type=int)

    if not name or price is None or quantity is None:
        return jsonify({"error": "Missing required fields"}), 400

    p = Product(name=name, category=category or "Uncategorized",
                price=price, quantity=quantity, image_path=image_filename)
    db.session.add(p)
    db.session.commit()
    return jsonify({"message": "Product added", "id": p.id}), 201


@api_bp.route("/products/<int:product_id>", methods=["GET"])
@api_login_required
def get_product(product_id):
    p = db.session.get(Product, product_id)
    if not p:
        return jsonify({"error": "Product not found"}), 404
    return jsonify({"id": p.id, "name": p.name, "category": p.category,
                    "price": p.price, "quantity": p.quantity})


@api_bp.route("/products/<int:product_id>", methods=["PUT"])
@api_login_required
def update_product(product_id):
    p = db.session.get(Product, product_id)
    if not p:
        return jsonify({"error": "Product not found"}), 404
    img = _handle_image_upload()
    if img:
        p.image_path = img
    p.name = request.form.get("name", p.name)
    p.category = request.form.get("category", p.category)
    p.price = request.form.get("price", type=float, default=p.price)
    old_qty = p.quantity
    new_qty = request.form.get("quantity", type=int, default=p.quantity)
    p.quantity = new_qty
    if new_qty != old_qty:
        db.session.add(InventoryLog(
            product_id=p.id,
            delta=new_qty - old_qty,
            reason="manual",
        ))
    db.session.commit()
    return jsonify({"message": "Product updated"})


@api_bp.route("/products/<int:product_id>/adjust-stock", methods=["POST"])
@api_login_required
def adjust_product_stock(product_id):
    p = db.session.get(Product, product_id)
    if not p:
        return jsonify({"error": "Product not found"}), 404
    data = request.get_json(silent=True) or {}
    try:
        delta = int(data.get("delta", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid delta value"}), 400
    if delta == 0:
        return jsonify({"error": "Delta cannot be zero"}), 400
    notes = str(data.get("notes", "")).strip() or None
    p.quantity += delta
    db.session.add(InventoryLog(
        product_id=p.id,
        delta=delta,
        reason="manual",
        notes=notes,
    ))
    db.session.commit()
    return jsonify({"message": "Stock adjusted", "quantity": p.quantity})


@api_bp.route("/products/<int:product_id>", methods=["DELETE"])
@api_login_required
def delete_product(product_id):
    p = db.session.get(Product, product_id)
    if not p:
        return jsonify({"error": "Product not found"}), 404
    db.session.delete(p)
    db.session.commit()
    return jsonify({"message": "Product deleted"})


# ─── Services ─────────────────────────────────────────────────────

@api_bp.route("/services", methods=["GET"])
@api_login_required
def get_services():
    return jsonify([
        {"id": s.id, "name": s.name, "category": s.category,
         "price": s.price, "image_path": s.image_path}
        for s in Service.query.order_by(Service.name.asc()).all()
    ])


@api_bp.route("/services", methods=["POST"])
@api_login_required
def add_service():
    image_filename = _handle_image_upload()
    name = request.form.get("name")
    category = request.form.get("category")
    price = request.form.get("price", type=float)

    if not name or price is None:
        return jsonify({"error": "Name and price are required"}), 400

    s = Service(name=name, category=category or "Uncategorized",
                price=price, image_path=image_filename)
    db.session.add(s)
    db.session.commit()
    return jsonify({"message": "Service added", "id": s.id}), 201


@api_bp.route("/services/<int:service_id>", methods=["GET"])
@api_login_required
def get_service(service_id):
    s = db.session.get(Service, service_id)
    if not s:
        return jsonify({"error": "Service not found"}), 404
    return jsonify({"id": s.id, "name": s.name, "category": s.category, "price": s.price})


@api_bp.route("/services/<int:service_id>", methods=["PUT"])
@api_login_required
def update_service(service_id):
    s = db.session.get(Service, service_id)
    if not s:
        return jsonify({"error": "Service not found"}), 404
    img = _handle_image_upload()
    if img:
        s.image_path = img
    s.name = request.form.get("name", s.name)
    s.category = request.form.get("category", s.category)
    s.price = request.form.get("price", type=float, default=s.price)
    db.session.commit()
    return jsonify({"message": "Service updated"})


@api_bp.route("/services/<int:service_id>", methods=["DELETE"])
@api_login_required
def delete_service(service_id):
    s = db.session.get(Service, service_id)
    if not s:
        return jsonify({"error": "Service not found"}), 404
    db.session.delete(s)
    db.session.commit()
    return jsonify({"message": "Service deleted"})


# ─── Categories ───────────────────────────────────────────────────

@api_bp.route("/product-categories", methods=["GET"])
@api_login_required
def get_product_categories():
    return jsonify(["Cleaning Supplies", "Car Care", "Accessories"])


@api_bp.route("/service-categories", methods=["GET"])
@api_login_required
def get_service_categories():
    return jsonify(["Maintenance", "Exterior Wash", "Interior Cleaning", "Detailing", "Waxing"])


# ─── Customers ────────────────────────────────────────────────────

@api_bp.route("/customers", methods=["GET"])
@api_login_required
def get_customers():
    return jsonify([
        {
            "id": c.id,
            "name": c.name,
            "phone": c.phone or "",
            "email": c.email or "",
            "notes": c.notes or "",
            "vehicle_count": len(c.vehicles),
            "created_at": c.created_at.isoformat() if c.created_at else "",
        }
        for c in Customer.query.order_by(Customer.name.asc()).all()
    ])


@api_bp.route("/customers", methods=["POST"])
@api_login_required
def add_customer():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Name is required"}), 400

    c = Customer(
        name=name,
        phone=data.get("phone", "").strip(),
        email=data.get("email", "").strip(),
        notes=data.get("notes", "").strip(),
    )
    db.session.add(c)
    db.session.commit()
    return jsonify({"message": "Customer added", "id": c.id}), 201


@api_bp.route("/customers/<int:customer_id>", methods=["GET"])
@api_login_required
def get_customer(customer_id):
    c = db.session.get(Customer, customer_id)
    if not c:
        return jsonify({"error": "Customer not found"}), 404
    return jsonify({"id": c.id, "name": c.name, "phone": c.phone or "",
                    "email": c.email or "", "notes": c.notes or ""})


@api_bp.route("/customers/<int:customer_id>", methods=["PUT"])
@api_login_required
def update_customer(customer_id):
    c = db.session.get(Customer, customer_id)
    if not c:
        return jsonify({"error": "Customer not found"}), 404
    data = request.get_json(silent=True) or {}
    c.name = (data.get("name") or c.name).strip()
    c.phone = (data.get("phone") or "").strip()
    c.email = (data.get("email") or "").strip()
    c.notes = (data.get("notes") or "").strip()
    db.session.commit()
    return jsonify({"message": "Customer updated"})


@api_bp.route("/customers/<int:customer_id>", methods=["DELETE"])
@api_login_required
def delete_customer(customer_id):
    c = db.session.get(Customer, customer_id)
    if not c:
        return jsonify({"error": "Customer not found"}), 404
    db.session.delete(c)
    db.session.commit()
    return jsonify({"message": "Customer deleted"})


# ─── Vehicles ─────────────────────────────────────────────────────

@api_bp.route("/vehicles", methods=["GET"])
@api_login_required
def get_vehicles():
    return jsonify([
        {
            "id": v.id,
            "plate": v.plate,
            "make": v.make,
            "model": v.model,
            "year": v.year,
            "color": v.color or "",
            "customer_id": v.customer_id,
            "customer_name": v.customer.name if v.customer else "",
        }
        for v in Vehicle.query.order_by(Vehicle.plate.asc()).all()
    ])


@api_bp.route("/vehicles", methods=["POST"])
@api_login_required
def add_vehicle():
    data = request.get_json(silent=True) or {}
    plate = (data.get("plate") or "").strip()
    make = (data.get("make") or "").strip()
    model = (data.get("model") or "").strip()
    customer_id = data.get("customer_id")

    if not plate or not make or not model or not customer_id:
        return jsonify({"error": "Plate, make, model, and customer are required"}), 400

    customer = db.session.get(Customer, customer_id)
    if not customer:
        return jsonify({"error": "Customer not found"}), 404

    v = Vehicle(
        plate=plate, make=make, model=model,
        year=data.get("year"),
        color=(data.get("color") or "").strip(),
        customer_id=customer_id,
    )
    db.session.add(v)
    db.session.commit()
    return jsonify({"message": "Vehicle added", "id": v.id}), 201


@api_bp.route("/vehicles/<int:vehicle_id>", methods=["GET"])
@api_login_required
def get_vehicle(vehicle_id):
    v = db.session.get(Vehicle, vehicle_id)
    if not v:
        return jsonify({"error": "Vehicle not found"}), 404
    return jsonify({"id": v.id, "plate": v.plate, "make": v.make, "model": v.model,
                    "year": v.year, "color": v.color or "", "customer_id": v.customer_id})


@api_bp.route("/vehicles/<int:vehicle_id>", methods=["PUT"])
@api_login_required
def update_vehicle(vehicle_id):
    v = db.session.get(Vehicle, vehicle_id)
    if not v:
        return jsonify({"error": "Vehicle not found"}), 404
    data = request.get_json(silent=True) or {}
    v.plate = (data.get("plate") or v.plate).strip()
    v.make = (data.get("make") or v.make).strip()
    v.model = (data.get("model") or v.model).strip()
    v.year = data.get("year", v.year)
    v.color = (data.get("color") or "").strip()
    if data.get("customer_id"):
        v.customer_id = data["customer_id"]
    db.session.commit()
    return jsonify({"message": "Vehicle updated"})


@api_bp.route("/vehicles/<int:vehicle_id>", methods=["DELETE"])
@api_login_required
def delete_vehicle(vehicle_id):
    v = db.session.get(Vehicle, vehicle_id)
    if not v:
        return jsonify({"error": "Vehicle not found"}), 404
    db.session.delete(v)
    db.session.commit()
    return jsonify({"message": "Vehicle deleted"})


# ─── Job Orders ───────────────────────────────────────────────────

def _job_order_dict(jo):
    return {
        "id": jo.id,
        "order_number": jo.order_number,
        "status": jo.status,
        "notes": jo.notes or "",
        "assigned_to": jo.assigned_to or "",
        "customer_id": jo.customer_id,
        "customer_name": jo.customer.name if jo.customer else "",
        "vehicle_id": jo.vehicle_id,
        "vehicle_plate": jo.vehicle.plate if jo.vehicle else "",
        "vehicle_display": (
            f"{jo.vehicle.year or ''} {jo.vehicle.make} {jo.vehicle.model} ({jo.vehicle.plate})".strip()
            if jo.vehicle else ""
        ),
        "created_at": jo.created_at.isoformat() if jo.created_at else "",
        "completed_at": jo.completed_at.isoformat() if jo.completed_at else "",
        "items": [
            {"id": i.id, "item_name": i.item_name, "item_type": i.item_type,
             "price": i.price, "quantity": i.quantity}
            for i in jo.items
        ],
        "total": sum(i.price * i.quantity for i in jo.items),
    }


@api_bp.route("/job-orders", methods=["GET"])
@api_login_required
def get_job_orders():
    jos = JobOrder.query.order_by(JobOrder.created_at.desc()).all()
    return jsonify([_job_order_dict(jo) for jo in jos])


@api_bp.route("/job-orders", methods=["POST"])
@api_login_required
def add_job_order():
    data = request.get_json(silent=True) or {}
    customer_id = data.get("customer_id")
    if not customer_id:
        return jsonify({"error": "Customer is required"}), 400

    customer = db.session.get(Customer, customer_id)
    if not customer:
        return jsonify({"error": "Customer not found"}), 404

    order_number = f"JO-{int(datetime.utcnow().timestamp())}"
    jo = JobOrder(
        order_number=order_number,
        status=data.get("status", "Pending"),
        notes=data.get("notes", ""),
        assigned_to=data.get("assigned_to", ""),
        customer_id=customer_id,
        vehicle_id=data.get("vehicle_id") or None,
    )
    db.session.add(jo)

    for item_data in data.get("items", []):
        db.session.add(JobOrderItem(
            job_order=jo,
            item_name=item_data.get("item_name", ""),
            item_type=item_data.get("item_type", "Service"),
            price=float(item_data.get("price", 0)),
            quantity=int(item_data.get("quantity", 1)),
        ))

    db.session.commit()
    return jsonify({"message": "Job order created", "id": jo.id, "order_number": jo.order_number}), 201


@api_bp.route("/job-orders/<int:jo_id>", methods=["GET"])
@api_login_required
def get_job_order(jo_id):
    jo = db.session.get(JobOrder, jo_id)
    if not jo:
        return jsonify({"error": "Job order not found"}), 404
    return jsonify(_job_order_dict(jo))


@api_bp.route("/job-orders/<int:jo_id>", methods=["PUT"])
@api_login_required
def update_job_order(jo_id):
    jo = db.session.get(JobOrder, jo_id)
    if not jo:
        return jsonify({"error": "Job order not found"}), 404
    data = request.get_json(silent=True) or {}
    jo.status = data.get("status", jo.status)
    jo.notes = data.get("notes", jo.notes)
    jo.assigned_to = data.get("assigned_to", jo.assigned_to)
    if data.get("vehicle_id") is not None:
        jo.vehicle_id = data["vehicle_id"] or None
    if jo.status == "Completed" and not jo.completed_at:
        jo.completed_at = datetime.utcnow()
    elif jo.status != "Completed":
        jo.completed_at = None

    if "items" in data:
        for item in jo.items[:]:
            db.session.delete(item)
        for item_data in data["items"]:
            db.session.add(JobOrderItem(
                job_order=jo,
                item_name=item_data.get("item_name", ""),
                item_type=item_data.get("item_type", "Service"),
                price=float(item_data.get("price", 0)),
                quantity=int(item_data.get("quantity", 1)),
            ))

    db.session.commit()
    return jsonify({"message": "Job order updated"})


@api_bp.route("/job-orders/<int:jo_id>", methods=["DELETE"])
@api_login_required
def delete_job_order(jo_id):
    jo = db.session.get(JobOrder, jo_id)
    if not jo:
        return jsonify({"error": "Job order not found"}), 404
    db.session.delete(jo)
    db.session.commit()
    return jsonify({"message": "Job order deleted"})
