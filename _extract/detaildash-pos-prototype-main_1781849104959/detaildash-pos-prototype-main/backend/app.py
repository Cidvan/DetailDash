import os
from datetime import datetime

from flask import Flask, flash, jsonify, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename

from db import db, Product, Service, Transaction, TransactionItem, User, init_db, seed_db


BASE_DIR = os.path.abspath(os.path.dirname(__file__))
PROJECT_DIR = os.path.abspath(os.path.join(BASE_DIR, ".."))
INSTANCE_DIR = os.path.join(PROJECT_DIR, "instance")
UPLOAD_FOLDER = os.path.join(BASE_DIR, "static", "assets", "images", "uploads")
ALLOWED_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp", "jfif"}

os.makedirs(INSTANCE_DIR, exist_ok=True)
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "detaildash-dev-secret-key")
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{os.path.join(INSTANCE_DIR, 'database.db')}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

init_db(app)
with app.app_context():
    seed_db()


def get_current_user():
    user_id = session.get("user_id")
    if not user_id:
        return None
    return db.session.get(User, user_id)


def parse_order_date(value):
    if not value:
        return datetime.utcnow().date()
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return datetime.utcnow().date()


@app.context_processor
def inject_current_user():
    return {"current_user": get_current_user()}


# ---------------------- Page Routes ----------------------

@app.route("/")
@app.route("/login", methods=["GET"])
def login_get():
    return render_template("login.html")


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login_get"))


@app.route("/register", methods=["GET"])
def register_get():
    return redirect(url_for("login_get"))


@app.route("/index")
def index():
    return render_template("index.html")


@app.route("/account")
def account():
    user = get_current_user()
    if not user:
        flash("Please log in to access your account.", "error")
        return redirect(url_for("login_get"))
    return render_template("account.html", user=user)


@app.route("/transaction")
def transaction():
    return render_template("transaction.html")


@app.route("/inventory")
def inventory():
    return render_template("inventory.html")


# ---------------------- Auth Routes ----------------------

@app.route("/register", methods=["POST"])
def register():
    first = request.form["first_name"].strip()
    middle = request.form.get("middle_name", "").strip()
    last = request.form["last_name"].strip()
    email = request.form["email"].strip().lower()
    password = request.form["password"]
    full_name = " ".join(part for part in [first, middle, last] if part)

    if User.query.filter_by(email=email).first():
        flash("Email already registered.", "error")
        return render_template("login.html")

    new_user = User(
        username=full_name,
        email=email,
        password_hash=generate_password_hash(password),
    )
    db.session.add(new_user)
    db.session.commit()

    flash("Registration successful. You can now log in.", "success")
    return redirect(url_for("login_get"))


@app.route("/login", methods=["POST"])
def login():
    email = request.form["email"].strip().lower()
    password = request.form["password"]
    user = User.query.filter_by(email=email).first()

    if user and check_password_hash(user.password_hash, password):
        session["user_id"] = user.id
        return redirect(url_for("index"))

    flash("Invalid email or password.", "error")
    return render_template("login.html")


# ---------------------- Transaction API ----------------------

@app.route("/api/transactions", methods=["GET"])
def get_transactions():
    transactions = Transaction.query.order_by(Transaction.order_date.desc()).all()
    return jsonify([
        {
            "transaction_id": transaction.transaction_id,
            "customer_name": transaction.customer_name,
            "order_date": transaction.order_date.isoformat(),
            "total_amount": transaction.total_amount,
            "items": [
                {
                    "name": item.item_name,
                    "price": item.price,
                    "category": item.item_type,
                }
                for item in transaction.items
            ],
        }
        for transaction in transactions
    ])


@app.route("/api/transaction", methods=["POST"])
def save_transaction():
    data = request.get_json(silent=True) or {}
    transaction_id = data.get("transaction_id") or str(int(datetime.utcnow().timestamp()))
    customer_name = data.get("customer_name") or "Walk-in Customer"
    items = data.get("items", [])

    try:
        total_amount = float(data.get("total_amount", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid total amount"}), 400

    transaction_record = Transaction.query.filter_by(transaction_id=transaction_id).first()
    if not transaction_record:
        transaction_record = Transaction(transaction_id=transaction_id)
        db.session.add(transaction_record)

    transaction_record.customer_name = customer_name
    transaction_record.order_date = parse_order_date(data.get("order_date"))
    transaction_record.total_amount = total_amount

    for item in transaction_record.items[:]:
        db.session.delete(item)

    for item_data in items:
        db.session.add(TransactionItem(
            item_name=item_data.get("name", "Unnamed item"),
            price=float(item_data.get("price", 0)),
            item_type=item_data.get("category", "Item"),
            transaction=transaction_record,
        ))

    try:
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": str(exc)}), 500

    return jsonify({"message": "Transaction saved successfully"}), 200


@app.route("/api/transaction/<transaction_id>", methods=["DELETE"])
def delete_transaction(transaction_id):
    transaction_record = Transaction.query.filter_by(transaction_id=transaction_id).first()
    if not transaction_record:
        return jsonify({"error": "Transaction not found"}), 404

    db.session.delete(transaction_record)
    db.session.commit()
    return jsonify({"message": "Transaction deleted successfully"}), 200


# ---------------------- Products API ----------------------

@app.route("/api/products", methods=["GET"])
def get_products():
    return jsonify([
        {
            "id": product.id,
            "name": product.name,
            "category": product.category,
            "price": product.price,
            "quantity": product.quantity,
            "image_path": product.image_path,
        }
        for product in Product.query.order_by(Product.name.asc()).all()
    ])


@app.route("/api/products", methods=["POST"])
def add_product():
    image_filename = handle_image_upload()
    name = request.form.get("name")
    category = request.form.get("category")
    price = request.form.get("price", type=float)
    quantity = request.form.get("quantity", type=int)

    if not name or price is None or quantity is None:
        return jsonify({"error": "Missing required fields"}), 400

    product = Product(
        name=name,
        category=category or "Uncategorized",
        price=price,
        quantity=quantity,
        image_path=image_filename,
    )
    db.session.add(product)
    db.session.commit()
    return jsonify({"message": "Product added", "id": product.id}), 201


@app.route("/api/products/<int:product_id>", methods=["GET"])
def get_product(product_id):
    product = db.session.get(Product, product_id)
    if not product:
        return jsonify({"error": "Product not found"}), 404
    return jsonify({
        "id": product.id,
        "name": product.name,
        "price": product.price,
        "quantity": product.quantity,
    })


@app.route("/api/products/<int:product_id>", methods=["PUT"])
def update_product(product_id):
    product = db.session.get(Product, product_id)
    if not product:
        return jsonify({"error": "Product not found"}), 404

    image_filename = handle_image_upload()
    if image_filename:
        product.image_path = image_filename

    product.name = request.form.get("name", product.name)
    product.category = request.form.get("category", product.category)
    product.price = request.form.get("price", type=float, default=product.price)
    product.quantity = request.form.get("quantity", type=int, default=product.quantity)
    db.session.commit()
    return jsonify({"message": "Product updated"})


@app.route("/api/products/<int:product_id>", methods=["DELETE"])
def delete_product(product_id):
    product = db.session.get(Product, product_id)
    if not product:
        return jsonify({"error": "Product not found"}), 404
    db.session.delete(product)
    db.session.commit()
    return jsonify({"message": "Product deleted"})


# ---------------------- Services API ----------------------

@app.route("/api/services", methods=["GET"])
def get_services():
    return jsonify([
        {
            "id": service.id,
            "name": service.name,
            "category": service.category,
            "price": service.price,
            "image_path": service.image_path,
        }
        for service in Service.query.order_by(Service.name.asc()).all()
    ])


@app.route("/api/services", methods=["POST"])
def add_service():
    image_filename = handle_image_upload()
    name = request.form.get("name")
    category = request.form.get("category")
    price = request.form.get("price", type=float)

    if not name or price is None:
        return jsonify({"error": "Name and price are required"}), 400

    service = Service(
        name=name,
        category=category or "Uncategorized",
        price=price,
        image_path=image_filename,
    )
    db.session.add(service)
    db.session.commit()
    return jsonify({"message": "Service added", "id": service.id}), 201


@app.route("/api/services/<int:service_id>", methods=["GET"])
def get_service(service_id):
    service = db.session.get(Service, service_id)
    if not service:
        return jsonify({"error": "Service not found"}), 404
    return jsonify({
        "id": service.id,
        "name": service.name,
        "category": service.category,
        "price": service.price,
    })


@app.route("/api/services/<int:service_id>", methods=["PUT"])
def update_service(service_id):
    service = db.session.get(Service, service_id)
    if not service:
        return jsonify({"error": "Service not found"}), 404

    image_filename = handle_image_upload()
    if image_filename:
        service.image_path = image_filename

    service.name = request.form.get("name", service.name)
    service.category = request.form.get("category", service.category)
    service.price = request.form.get("price", type=float, default=service.price)
    db.session.commit()
    return jsonify({"message": "Service updated"})


@app.route("/api/services/<int:service_id>", methods=["DELETE"])
def delete_service(service_id):
    service = db.session.get(Service, service_id)
    if not service:
        return jsonify({"error": "Service not found"}), 404
    db.session.delete(service)
    db.session.commit()
    return jsonify({"message": "Service deleted"})


# ---------------------- Utilities & Categories ----------------------

@app.route("/api/product-categories", methods=["GET"])
def get_product_categories():
    return jsonify(["Cleaning Supplies", "Car Care", "Accessories"])


@app.route("/api/service-categories", methods=["GET"])
def get_service_categories():
    return jsonify(["Maintenance", "Exterior Wash", "Interior Cleaning", "Detailing", "Waxing"])


@app.route("/api/items", methods=["GET"])
def get_items():
    products = [
        {
            "id": product.id,
            "name": product.name,
            "price": product.price,
            "image": image_url(product.image_path),
            "category": "Product",
        }
        for product in Product.query.all()
    ]
    services = [
        {
            "id": service.id,
            "name": service.name,
            "price": service.price,
            "image": image_url(service.image_path),
            "category": "Service",
        }
        for service in Service.query.all()
    ]
    return jsonify(products + services)


def image_url(image_path):
    if not image_path:
        return ""
    return url_for("static", filename=f"assets/images/uploads/{image_path}")


def allowed_image_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS


def handle_image_upload():
    image = request.files.get("image")
    if not image or image.filename == "":
        return None

    if not allowed_image_file(image.filename):
        return None

    filename = secure_filename(image.filename)
    image.save(os.path.join(app.config["UPLOAD_FOLDER"], filename))
    return filename


if __name__ == "__main__":
    app.run(debug=os.environ.get("FLASK_DEBUG") == "1")
