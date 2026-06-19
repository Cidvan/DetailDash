from datetime import datetime

from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)


class Customer(db.Model):
    __tablename__ = "customers"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False, index=True)
    phone = db.Column(db.String(30), nullable=True)
    email = db.Column(db.String(120), nullable=True, index=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    vehicles = db.relationship("Vehicle", backref="customer", cascade="all, delete-orphan", lazy=True)
    job_orders = db.relationship("JobOrder", backref="customer", cascade="all, delete-orphan", lazy=True)
    transactions = db.relationship("Transaction", backref="customer", lazy=True, foreign_keys="Transaction.customer_id")


class Vehicle(db.Model):
    __tablename__ = "vehicles"

    id = db.Column(db.Integer, primary_key=True)
    plate = db.Column(db.String(30), nullable=False, index=True)
    make = db.Column(db.String(100), nullable=False)
    model = db.Column(db.String(100), nullable=False)
    year = db.Column(db.Integer, nullable=True)
    color = db.Column(db.String(50), nullable=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("customers.id"), nullable=False, index=True)

    job_orders = db.relationship("JobOrder", backref="vehicle", cascade="all, delete-orphan", lazy=True)
    transactions = db.relationship("Transaction", backref="vehicle", lazy=True, foreign_keys="Transaction.vehicle_id")


class JobOrder(db.Model):
    __tablename__ = "job_orders"

    id = db.Column(db.Integer, primary_key=True)
    order_number = db.Column(db.String(50), unique=True, nullable=False)
    status = db.Column(db.String(30), nullable=False, default="Pending", index=True)
    notes = db.Column(db.Text, nullable=True)
    assigned_to = db.Column(db.String(100), nullable=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("customers.id"), nullable=False, index=True)
    vehicle_id = db.Column(db.Integer, db.ForeignKey("vehicles.id"), nullable=True, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    completed_at = db.Column(db.DateTime, nullable=True)

    items = db.relationship("JobOrderItem", backref="job_order", cascade="all, delete-orphan", lazy=True)


class JobOrderItem(db.Model):
    __tablename__ = "job_order_items"

    id = db.Column(db.Integer, primary_key=True)
    job_order_id = db.Column(db.Integer, db.ForeignKey("job_orders.id"), nullable=False, index=True)
    item_name = db.Column(db.String(150), nullable=False)
    item_type = db.Column(db.String(20), nullable=False)
    price = db.Column(db.Float, nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=1)


class Service(db.Model):
    __tablename__ = "services"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False, index=True)
    category = db.Column(db.String(50), nullable=False)
    price = db.Column(db.Float, nullable=False)
    image_path = db.Column(db.String(255), nullable=True)


class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False, index=True)
    category = db.Column(db.String(50), nullable=False)
    price = db.Column(db.Float, nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    image_path = db.Column(db.String(255), nullable=True)


class Transaction(db.Model):
    __tablename__ = "transactions"

    id = db.Column(db.Integer, primary_key=True)
    transaction_id = db.Column(db.String(50), unique=True, nullable=False)
    customer_name = db.Column(db.String(100), nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey("customers.id"), nullable=True)
    vehicle_id = db.Column(db.Integer, db.ForeignKey("vehicles.id"), nullable=True)
    order_date = db.Column(db.Date, default=datetime.utcnow, index=True)
    total_amount = db.Column(db.Float, nullable=False)

    items = db.relationship(
        "TransactionItem",
        backref="transaction",
        cascade="all, delete-orphan",
        lazy=True,
    )


class TransactionItem(db.Model):
    __tablename__ = "transaction_items"

    id = db.Column(db.Integer, primary_key=True)
    transaction_id = db.Column(db.Integer, db.ForeignKey("transactions.id"), nullable=False, index=True)
    item_name = db.Column(db.String(100), nullable=False)
    price = db.Column(db.Float, nullable=False)
    item_type = db.Column(db.String(20), nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=True, index=True)


class InventoryLog(db.Model):
    __tablename__ = "inventory_log"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False, index=True)
    delta = db.Column(db.Integer, nullable=False)
    reason = db.Column(db.String(30), nullable=False)
    transaction_id = db.Column(db.String(50), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    product = db.relationship("Product", backref=db.backref("stock_log", lazy=True))


def _migrate_transactions(db):
    from sqlalchemy import text, inspect
    inspector = inspect(db.engine)

    existing_tx = [col["name"] for col in inspector.get_columns("transactions")]
    with db.engine.connect() as conn:
        if "customer_id" not in existing_tx:
            conn.execute(text("ALTER TABLE transactions ADD COLUMN customer_id INTEGER REFERENCES customers(id)"))
            conn.commit()
        if "vehicle_id" not in existing_tx:
            conn.execute(text("ALTER TABLE transactions ADD COLUMN vehicle_id INTEGER REFERENCES vehicles(id)"))
            conn.commit()

    existing_ti = [col["name"] for col in inspector.get_columns("transaction_items")]
    with db.engine.connect() as conn:
        if "quantity" not in existing_ti:
            conn.execute(text("ALTER TABLE transaction_items ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1"))
            conn.commit()
        if "product_id" not in existing_ti:
            conn.execute(text("ALTER TABLE transaction_items ADD COLUMN product_id INTEGER REFERENCES products(id)"))
            conn.commit()


def init_db(app):
    db.init_app(app)
    with app.app_context():
        db.create_all()
        _migrate_transactions(db)


def seed_db():
    if not Service.query.first():
        db.session.add_all([
            Service(name="Basic Wash", category="Exterior Wash", price=120.0),
            Service(name="Premium Wash", category="Exterior Wash", price=250.0),
            Service(name="Interior Cleaning", category="Interior Cleaning", price=350.0),
            Service(name="Exterior Detailing", category="Detailing", price=800.0),
            Service(name="Interior Detailing", category="Detailing", price=900.0),
            Service(name="Engine Wash", category="Maintenance", price=450.0),
            Service(name="Wax and Shine", category="Waxing", price=500.0),
            Service(name="Ceramic Coating", category="Detailing", price=5000.0),
        ])

    if not Product.query.first():
        db.session.add_all([
            Product(name="Car Shampoo", category="Cleaning Supplies", price=150.0, quantity=20),
            Product(name="Tire Cleaner", category="Cleaning Supplies", price=120.0, quantity=15),
            Product(name="Microfiber Towel", category="Accessories", price=80.0, quantity=30),
            Product(name="Tire Black", category="Car Care", price=95.0, quantity=25),
            Product(name="Dashboard Polish", category="Car Care", price=110.0, quantity=18),
        ])

    db.session.commit()
