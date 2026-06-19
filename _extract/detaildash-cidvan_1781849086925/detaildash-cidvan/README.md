**DetailDash Web Application**

**📖 Overview**

This is a **Point-of-Sale (POS) web application** designed for car wash services. The app allows users to:

- **Register** and log in to create accounts.
- Manage **inventory** of car wash products and services.
- Handle **transactions** for car wash services.
- **Track sales history**.

Built with **Flask** for the backend and **HTML/CSS/JavaScript** for the frontend.

**🚀 Features**

- **User Authentication**: Users can sign up, log in, and securely manage their accounts.
- **Inventory Management**: Add, edit, and remove car wash products.
- **Transaction Management**: Process and record car wash transactions.
- **Admin Dashboard**: View transaction stats and inventory info.
- **Responsive Design**: Works on both desktop and mobile devices.

**🛠️ Tech Stack**

- **Frontend**:
  - HTML5
  - CSS
  - Bootstrap
  - JavaScript (for frontend functionality)

- **Backend**:
  - Python 3.x
  - Flask
  - SQLAlchemy (for database interaction)

- **Database**:
  - SQLite (for development) or MySQL/PostgreSQL (production)

🧑‍💻 Getting Started

1. Clone the Repository

```bash
git clone https://github.com/J0v1t/DetailDash.git
cd DetailDash
```

2. Set Up a Virtual Environment

For **backend** (Flask):

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

3. Install Dependencies

```bash
pip install -r requirements.txt
```

4. Set Up the Database

Run the Flask app to create the database:

```bash
python app.py
```

This will automatically create the `database.db` file.

5. Run the Application

Run the backend server:

```bash
python app.py
```

Open your browser and go to [http://localhost:5000](http://localhost:5000) to see the app in action!

---

🧩 Project Structure

```
detaildash-pos/
├── frontend/
│   ├── assets/
│   │  ├── images/
│   │  ├── media/
│   ├── index.html
│   ├── inventory.html
│   ├── login.html
│   ├── js/
│   │   ├── modules/
│   │   │   ├── footer.js
│   │   │   ├── form.js
│   │   │   ├── navbar.js
│   │   │   ├── sidebar.js
│   │   ├── login.js
│   │   ├── main.js
│   │   ├── utils.js
│   ├── css/
│   │   ├── components/
│   │   │   ├── footer/
│   │   │   │   ├── footer.css
│   │   │   ├── navbar/
│   │   │   │   ├── navbar.css
│   │   │   ├── sidebar/
│   │   │   │   ├── sidebar.css
│   │   ├── login.css
│   │   ├── style.css
├── backend/
│   ├── venv/
│   ├── app.py
│   ├── models.py
│   ├── config.py
│   ├── requirements.txt
└── database.db
```

---

⚙️ API Endpoints

- **POST** `/register`: Create a new user account
- **POST** `/login`: Log in with username and password
- **POST** `/products`: Add a new product
- **GET** `/products`: View all products
- **PUT** `/products/<id>`: Update a product
- **DELETE** `/products/<id>`: Delete a product
- **POST** `/transactions`: Record a new transaction
- **GET** `/transactions`: View transaction history

---

📢 Contributions

If you’d like to contribute:
1. Fork this repo
2. Create a new branch (`git checkout -b feature-name`)
3. Commit your changes (`git commit -m 'Added feature'`)
4. Push to your branch (`git push origin feature-name`)
5. Create a pull request

---
