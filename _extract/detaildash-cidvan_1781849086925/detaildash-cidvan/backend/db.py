from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

# 🔹 USER TABLE
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(150), nullable=False)

# 🔹 SERVICE TABLE
class Service(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    price = db.Column(db.Float, nullable=False)
    image_path = db.Column(db.String(255), nullable=True)

# 🔹 PRODUCT TABLE
class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    price = db.Column(db.Float, nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    image_path = db.Column(db.String(255), nullable=True)

# 🔹 TRANSACTION TABLE
class Transaction(db.Model):
    __tablename__ = 'transactions'
    id = db.Column(db.Integer, primary_key=True)
    transaction_id = db.Column(db.String(50), unique=True, nullable=False)
    customer_name = db.Column(db.String(100), nullable=False)
    order_date = db.Column(db.Date, default=datetime.utcnow)
    total_amount = db.Column(db.Float, nullable=False)

    items = db.relationship(
        'TransactionItem',
        backref='transaction',
        cascade="all, delete-orphan",
        lazy=True
    )

# 🔹 TRANSACTION ITEM TABLE
class TransactionItem(db.Model):
    __tablename__ = 'transaction_items'
    id = db.Column(db.Integer, primary_key=True)
    transaction_id = db.Column(db.Integer, db.ForeignKey('transactions.id'), nullable=False)
    item_name = db.Column(db.String(100), nullable=False)
    price = db.Column(db.Float, nullable=False)
    item_type = db.Column(db.String(20), nullable=False)  # 'Product' or 'Service'

# 🔸 INITIALIZE DB
def init_db(app):
    db.init_app(app)
    with app.app_context():
        db.create_all()

# 🔸 SEED DATABASE
def seed_db(app):
    with app.app_context():
        db.create_all()

        # Seed Users
        if not User.query.first():
            users = [
                User(username="John Doe", email="admin1@email.com", password="admin123"),
                User(username="Jane Doe", email="admin2@email.com", password="admin456"),
            ]
            db.session.add_all(users)
            print("Sample users created.")

        # Seed Services
        if not Service.query.first():
            services = [
                Service(name="Basic Wash", category="Exterior Wash", price=10.0),
                Service(name="Deluxe Wash", category="Exterior Wash", price=20.0),
                Service(name="Basic Interior Cleaning", category="Interior Cleaning", price=35.0),
            ]
            db.session.add_all(services)
            print("Sample services created.")

        # Seed Products
        if not Product.query.first():
            products = [
                Product(name="Car Shampoo", category="Cleaning Supplies", price=150.0, quantity=20),
                Product(name="Tire Cleaner", category="Cleaning Supplies", price=120.0, quantity=15),
            ]
            db.session.add_all(products)
            print("Sample products created.")

        db.session.commit()
        print("Database initialized and seeded.")
