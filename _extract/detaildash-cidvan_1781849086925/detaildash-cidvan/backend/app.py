from flask import Flask, render_template, redirect, url_for, flash, jsonify, request
from db import db, User, Product, Service, init_db, seed_db, TransactionItem, Transaction
from werkzeug.utils import secure_filename
import os
from datetime import datetime

app = Flask(__name__)
app.secret_key = 'your_secret_key'

# Config
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
INSTANCE_DIR = os.path.join(BASE_DIR, '..', 'instance')
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'static', 'assets', 'images', 'uploads')
os.makedirs(INSTANCE_DIR, exist_ok=True)
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(INSTANCE_DIR, "database.db")}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

init_db(app)
with app.app_context():
    seed_db(app)

# ---------------------- Page Routes ----------------------

@app.route('/')
@app.route('/login', methods=['GET'])
def login_get():
    return render_template('login.html')

@app.route('/register', methods=['GET'])
def register_get():
    return redirect(url_for('login_get'))

@app.route('/index')
def index():
    return render_template('index.html')

@app.route('/account')
def account():
    return render_template('account.html')

@app.route('/transaction')
def transaction():
    return render_template('transaction.html')

@app.route('/inventory')
def inventory():
    return render_template('inventory.html')

# ---------------------- Auth Routes ----------------------

@app.route('/register', methods=['POST'])
def register():
    first = request.form['first_name']
    middle = request.form.get('middle_name', '')
    last = request.form['last_name']
    email = request.form['email']
    password = request.form['password']
    full_name = f"{first} {middle} {last}".strip()

    if User.query.filter_by(email=email).first():
        flash('Email already registered.', 'error')
        return render_template('login.html')

    new_user = User(username=full_name, email=email, password=password)
    db.session.add(new_user)
    db.session.commit()

    flash('Registration successful.', 'success')
    return redirect(url_for('login_get'))

@app.route('/login', methods=['POST'])
def login():
    email = request.form['email']
    password = request.form['password']

    user = User.query.filter_by(email=email, password=password).first()
    if user:
        return redirect(url_for('index'))
    flash('Invalid email or password.', 'error')
    return render_template('login.html')

# ---------------------- Transaction API ----------------------

@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    transactions = Transaction.query.all()
    return jsonify([{
        'transaction_id': t.transaction_id,
        'customer_name': t.customer_name,
        'order_date': t.order_date.isoformat(),
        'total_amount': t.total_amount,
        'items': [{
            'name': i.item_name,
            'price': i.price,
            'category': i.item_type
        } for i in t.items]
    } for t in transactions])

@app.route('/api/transaction', methods=['POST'])
def save_transaction():
    data = request.get_json()
    transaction_id = data.get('transaction_id')
    customer_name = data.get('customer_name')
    order_date = data.get('order_date')
    total_amount = data.get('total_amount')
    items = data.get('items', [])

    transaction = Transaction.query.filter_by(transaction_id=transaction_id).first()
    if not transaction:
        transaction = Transaction(transaction_id=transaction_id)
        db.session.add(transaction)

    transaction.customer_name = customer_name
    transaction.order_date = datetime.strptime(order_date, "%Y-%m-%d").date()
    transaction.total_amount = total_amount

    # Delete existing items explicitly
    for item in transaction.items[:]:
        db.session.delete(item)

    for i in items:
        item = TransactionItem(
            item_name=i['name'],
            price=i['price'],
            item_type=i['category'],
            transaction=transaction
        )
        db.session.add(item)

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

    return jsonify({"message": "Transaction saved successfully"}), 200

@app.route('/api/transaction/<transaction_id>', methods=['DELETE'])
def delete_transaction(transaction_id):
    transaction = Transaction.query.filter_by(transaction_id=transaction_id).first()
    if not transaction:
        return jsonify({"error": "Transaction not found"}), 404

    db.session.delete(transaction)
    db.session.commit()

    return jsonify({"message": "Transaction deleted successfully"}), 200

# ---------------------- Products API ----------------------

@app.route('/api/products', methods=['GET'])
def get_products():
    return jsonify([{
        'id': p.id,
        'name': p.name,
        'category': p.category,
        'price': p.price,
        'quantity': p.quantity,
        'image_path': p.image_path
    } for p in Product.query.all()])

@app.route('/api/products', methods=['POST'])
def add_product():
    image_filename = handle_image_upload()
    name = request.form.get('name')
    category = request.form.get('category')
    price = request.form.get('price', type=float)
    quantity = request.form.get('quantity', type=int)

    if not name or price is None or quantity is None:
        return jsonify({'error': 'Missing required fields'}), 400

    new_product = Product(name=name, category=category, price=price, quantity=quantity, image_path=image_filename)
    db.session.add(new_product)
    db.session.commit()
    return jsonify({'message': 'Product added', 'id': new_product.id}), 201

@app.route('/api/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    product = Product.query.get_or_404(product_id)
    return jsonify({
        'id': product.id,
        'name': product.name,
        'price': product.price,
        'quantity': product.quantity
    })

@app.route('/api/products/<int:product_id>', methods=['PUT'])
def update_product(product_id):
    product = Product.query.get_or_404(product_id)
    image_filename = handle_image_upload()
    if image_filename:
        product.image_path = image_filename

    product.name = request.form.get('name', product.name)
    product.category = request.form.get('category', product.category)
    product.price = request.form.get('price', type=float, default=product.price)
    product.quantity = request.form.get('quantity', type=int, default=product.quantity)
    db.session.commit()
    return jsonify({'message': 'Product updated'})

@app.route('/api/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    product = Product.query.get_or_404(product_id)
    db.session.delete(product)
    db.session.commit()
    return jsonify({'message': 'Product deleted'})

# ---------------------- Services API ----------------------

@app.route('/api/services', methods=['GET'])
def get_services():
    return jsonify([{
        'id': s.id,
        'name': s.name,
        'category': s.category,
        'price': s.price,
        'image_path': s.image_path
    } for s in Service.query.all()])

@app.route('/api/services', methods=['POST'])
def add_service():
    image_filename = handle_image_upload()
    name = request.form.get('name')
    category = request.form.get('category')
    price = request.form.get('price', type=float)

    if not name or price is None:
        return jsonify({'error': 'Name and price are required'}), 400

    new_service = Service(name=name, category=category, price=price, image_path=image_filename)
    db.session.add(new_service)
    db.session.commit()
    return jsonify({'message': 'Service added', 'id': new_service.id}), 201

@app.route('/api/services/<int:service_id>', methods=['GET'])
def get_service(service_id):
    service = Service.query.get_or_404(service_id)
    return jsonify({
        'id': service.id,
        'name': service.name,
        'category': service.category,
        'price': service.price
    })

@app.route('/api/services/<int:service_id>', methods=['PUT'])
def update_service(service_id):
    service = Service.query.get_or_404(service_id)
    image_filename = handle_image_upload()
    if image_filename:
        service.image_path = image_filename

    service.name = request.form.get('name', service.name)
    service.category = request.form.get('category', service.category)
    service.price = request.form.get('price', type=float, default=service.price)
    db.session.commit()
    return jsonify({'message': 'Service updated'})

@app.route('/api/services/<int:service_id>', methods=['DELETE'])
def delete_service(service_id):
    service = Service.query.get_or_404(service_id)
    db.session.delete(service)
    db.session.commit()
    return jsonify({'message': 'Service deleted'})

# ---------------------- Utilities & Categories ----------------------

@app.route('/api/product-categories', methods=['GET'])
def get_product_categories():
    return jsonify(["Cleaning Supplies", "Car Care", "Accessories"])

@app.route('/api/service-categories', methods=['GET'])
def get_service_categories():
    return jsonify(["Maintenance", "Exterior Wash", "Interior Cleaning", "Detailing", "Waxing"])

@app.route('/api/items', methods=['GET'])
def get_items():
    products = [{
        'id': p.id,
        'name': p.name,
        'price': p.price,
        'image': url_for('static', filename=f'assets/images/uploads/{p.image_path}') if p.image_path else '',
        'category': 'Product'
    } for p in Product.query.all()]

    services = [{
        'id': s.id,
        'name': s.name,
        'price': s.price,
        'image': url_for('static', filename=f'assets/images/uploads/{s.image_path}') if s.image_path else '',
        'category': 'Service'
    } for s in Service.query.all()]

    return jsonify(products + services)

# ---------------------- Helper Function ----------------------

def handle_image_upload():
    if 'image' not in request.files:
        return None
    image = request.files['image']
    if image and image.filename != '':
        filename = secure_filename(image.filename)
        image.save(os.path.join(UPLOAD_FOLDER, filename))
        return filename
    return None

# ---------------------- Run App ----------------------

if __name__ == '__main__':
    app.run(debug=True)
