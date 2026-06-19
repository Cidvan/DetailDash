from datetime import datetime

from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)


class Service(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    price = db.Column(db.Float, nullable=False)
    image_path = db.Column(db.String(255), nullable=True)


class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    price = db.Column(db.Float, nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    image_path = db.Column(db.String(255), nullable=True)


class Transaction(db.Model):
    __tablename__ = "transactions"

    id = db.Column(db.Integer, primary_key=True)
    transaction_id = db.Column(db.String(50), unique=True, nullable=False)
    customer_name = db.Column(db.String(100), nullable=False)
    order_date = db.Column(db.Date, default=datetime.utcnow)
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
    transaction_id = db.Column(db.Integer, db.ForeignKey("transactions.id"), nullable=False)
    item_name = db.Column(db.String(100), nullable=False)
    price = db.Column(db.Float, nullable=False)
    item_type = db.Column(db.String(20), nullable=False)


def init_db(app):
    db.init_app(app)
    with app.app_context():
        db.create_all()


def seed_db():
    if not Service.query.first():
        db.session.add_all([
            Service(name="Basic Wash", category="Exterior Wash", price=120.0),
            Service(name="Deluxe Wash", category="Exterior Wash", price=250.0),
            Service(name="Interior Cleaning", category="Interior Cleaning", price=350.0),
            Service(name="Wax and Shine", category="Waxing", price=500.0),
        ])

    if not Product.query.first():
        db.session.add_all([
            Product(name="Car Shampoo", category="Cleaning Supplies", price=150.0, quantity=20),
            Product(name="Tire Cleaner", category="Cleaning Supplies", price=120.0, quantity=15),
            Product(name="Microfiber Towel", category="Accessories", price=80.0, quantity=30),
        ])

    db.session.commit()
