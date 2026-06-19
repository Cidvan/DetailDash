from flask import Flask, render_template, redirect, url_for, flash, jsonify, request
from db import db, User, Product, Service, init_db, seed_db
import os

app = Flask(__name__)

# Ensure instance folder exists
instance_path = os.path.join(os.path.abspath(os.path.dirname(__file__)), '..', 'instance')
os.makedirs(instance_path, exist_ok=True)

basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, '..', 'instance', 'database.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.secret_key = 'your_secret_key'  # Needed for flash messages

init_db(app)

with app.app_context():
    seed_db(app)
    
# URL
@app.route('/', methods=['GET'])
def root():
    return render_template('login.html')

# GET LOGIN ROUTE
@app.route('/login', methods=['GET'])
def login_get():
    return render_template('login.html')

# GET REGISTER ROUTE (redirect to login since both forms are on same page)
@app.route('/register', methods=['GET'])
def register_get():
    return redirect(url_for('login_get'))

# POST REGISTER ROUTE
@app.route('/register', methods=['POST'])
def register():
    first = request.form['first_name']
    middle = request.form.get('middle_name', '')
    last = request.form['last_name']
    email = request.form['email']
    password = request.form['password']

    full_name = f"{first} {middle} {last}".strip()

    # Check if user already exists
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        flash('Email already registered. Please use a different email.', 'register_error')
        return render_template('login.html', form='register')

    new_user = User(username=full_name, email=email, password=password)
    db.session.add(new_user)
    db.session.commit()

    flash('Registration successful. Please log in.', 'register_success')
    return render_template('login.html', form='register')

# POST LOGIN ROUTE
@app.route('/login', methods=['POST'])
def login():
    email = request.form['email']
    password = request.form['password']

    user = User.query.filter_by(email=email, password=password).first()

    if user:
        return redirect(url_for('index'))
    else:
        flash('Invalid email or password.', 'login_error')
        return render_template('login.html', form='login')
    
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

# API endpoint to get all products
@app.route('/api/products', methods=['GET'])
def get_products():
    products = Product.query.all()
    products_list = []
    for product in products:
        products_list.append({
            'id': product.id,
            'name': product.name,
            'category': product.category,
            'price': product.price,
            'quantity': product.quantity,
            'image_path': product.image_path
        })
    return jsonify(products_list)

# API endpoint to add a new product
@app.route('/api/products', methods=['POST'])
def add_product():
    if 'image' in request.files:
        image = request.files['image']
        image_filename = None
        if image.filename != '':
            import os
            from werkzeug.utils import secure_filename
            upload_folder = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'static', 'assets', 'images', 'uploads')
            os.makedirs(upload_folder, exist_ok=True)
            image_filename = secure_filename(image.filename)
            image.save(os.path.join(upload_folder, image_filename))
    else:
        image_filename = None

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

# API endpoint to get a product by id
@app.route('/api/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    product = Product.query.get(product_id)
    if not product:
        return jsonify({'error': 'Product not found'}), 404
    return jsonify({
        'id': product.id,
        'name': product.name,
        'price': product.price,
        'quantity': product.quantity
    })

# API endpoint to update a product by id
@app.route('/api/products/<int:product_id>', methods=['PUT'])
def update_product(product_id):
    product = Product.query.get(product_id)
    if not product:
        return jsonify({'error': 'Product not found'}), 404

    if 'image' in request.files:
        image = request.files['image']
        if image.filename != '':
            import os
            from werkzeug.utils import secure_filename
            upload_folder = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'static', 'assets', 'images', 'uploads')
            os.makedirs(upload_folder, exist_ok=True)
            image_filename = secure_filename(image.filename)
            image.save(os.path.join(upload_folder, image_filename))
            product.image_path = image_filename

    product.name = request.form.get('name', product.name)
    product.category = request.form.get('category', product.category)
    product.price = request.form.get('price', type=float, default=product.price)
    product.quantity = request.form.get('quantity', type=int, default=product.quantity)

    db.session.commit()
    return jsonify({'message': 'Product updated'})

# API endpoint to delete a product by id
@app.route('/api/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    product = Product.query.get(product_id)
    if not product:
        return jsonify({'error': 'Product not found'}), 404

    db.session.delete(product)
    db.session.commit()
    return jsonify({'message': 'Product deleted'})

# API endpoint to get all services
@app.route('/api/services', methods=['GET'])
def get_services():
    services = Service.query.all()
    services_list = []
    for service in services:
        services_list.append({
            'id': service.id,
            'name': service.name,
            'category': service.category,
            'price': service.price,
            'image_path': service.image_path
        })
    return jsonify(services_list)

# API endpoint to add a new service
@app.route('/api/services', methods=['POST'])
def add_service():
    if 'image' in request.files:
        image = request.files['image']
        image_filename = None
        if image.filename != '':
            import os
            from werkzeug.utils import secure_filename
            upload_folder = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'static', 'assets', 'images', 'uploads')
            os.makedirs(upload_folder, exist_ok=True)
            image_filename = secure_filename(image.filename)
            image.save(os.path.join(upload_folder, image_filename))
    else:
        image_filename = None

    name = request.form.get('name')
    category = request.form.get('category')
    price = request.form.get('price', type=float)

    if not name or price is None:
        return jsonify({'error': 'Name and price are required'}), 400

    new_service = Service(name=name, category=category, price=price, image_path=image_filename)
    db.session.add(new_service)
    db.session.commit()
    return jsonify({'message': 'Service added', 'id': new_service.id}), 201

# API endpoint to get a service by id
@app.route('/api/services/<int:service_id>', methods=['GET'])
def get_service(service_id):
    service = Service.query.get(service_id)
    if not service:
        return jsonify({'error': 'Service not found'}), 404
    return jsonify({
        'id': service.id,
        'name': service.name,
        'category': service.category,
        'price': service.price
    })

# API endpoint to update a service by id
@app.route('/api/services/<int:service_id>', methods=['PUT'])
def update_service(service_id):
    service = Service.query.get(service_id)
    if not service:
        return jsonify({'error': 'Service not found'}), 404

    if 'image' in request.files:
        image = request.files['image']
        if image.filename != '':
            import os
            from werkzeug.utils import secure_filename
            upload_folder = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'static', 'assets', 'images', 'uploads')
            os.makedirs(upload_folder, exist_ok=True)
            image_filename = secure_filename(image.filename)
            image.save(os.path.join(upload_folder, image_filename))
            service.image_path = image_filename

    service.name = request.form.get('name', service.name)
    service.category = request.form.get('category', service.category)
    service.price = request.form.get('price', type=float, default=service.price)
    db.session.commit()
    return jsonify({'message': 'Service updated'})

# API endpoint to delete a service by id
@app.route('/api/services/<int:service_id>', methods=['DELETE'])
def delete_service(service_id):
    service = Service.query.get(service_id)
    if not service:
        return jsonify({'error': 'Service not found'}), 404
    db.session.delete(service)
    db.session.commit()
    return jsonify({'message': 'Service deleted'})

# API endpoint to get product categories
@app.route('/api/product-categories', methods=['GET'])
def get_product_categories():
    categories = ["Cleaning Supplies", "Car Care", "Accessories"]
    return jsonify(categories)

# API endpoint to get service categories
@app.route('/api/service-categories', methods=['GET'])
def get_service_categories():
    categories = ["Maintenance", "Exterior Wash", "Interior Cleaning", "Detailing", "Waxing"]
    return jsonify(categories)

if __name__ == '__main__':
    app.run(debug=True)
