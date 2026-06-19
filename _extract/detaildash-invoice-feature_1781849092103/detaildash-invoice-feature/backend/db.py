from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# USER TABLE
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(150), nullable=False)

# SERVICES TABLE
class Service(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    price = db.Column(db.Float, nullable=False)
    image_path = db.Column(db.String(255), nullable=True)

# PRODUCT TABLE
class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    price = db.Column(db.Float, nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    image_path = db.Column(db.String(255), nullable=True)

def init_db(app):
    db.init_app(app)
    with app.app_context():
        db.create_all()

def seed_db(app):
    with app.app_context():
        db.create_all()

        # SEED USER TABLE
        if not User.query.first():
            admin1 = User(username="John Doe", email='admin1@email.com', password='admin123')
            admin2 = User(username="Jane Doe", email='admin2@email.com', password='admin456')
            db.session.add(admin1)
            db.session.add(admin2)
            print("Sample users created.")

        # SEED SERVICE TABLE
        if not Service.query.first():
            service1 = Service(name='Basic Wash', category='Exterior Wash', price=10)
            service2 = Service(name='Deluxe Wash', category='Exterior Wash', price=20)
            service3 = Service(name='Basic Interior Cleaning', category='Interior Cleaning', price=35)
            db.session.add(service1)
            db.session.add(service2)
            db.session.add(service3)
            print("Sample services created.")

        # SEED PRODUCT TABLE
        if not Product.query.first():
            product1 = Product(name='Car Shampoo', category='Cleaning Supplies', price=150.0, quantity=20)
            product2 = Product(name='Tire Cleaner', category='Cleaning Supplies', price=120.0, quantity=15)
            db.session.add(product1)
            db.session.add(product2)
            print("Sample products created.")

        db.session.commit()
        print("Database initialized and seeded.")
