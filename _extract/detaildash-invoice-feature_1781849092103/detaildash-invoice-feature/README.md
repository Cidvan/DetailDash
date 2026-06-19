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
  - ![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
  - ![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
  - ![Bootstrap](https://img.shields.io/badge/Bootstrap-7952B3?style=for-the-badge&logo=bootstrap&logoColor=white)
  - ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

- **Backend**:
  - ![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
  - ![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white)
  - ![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-000000?style=for-the-badge&logo=sqlalchemy&logoColor=white)

- **Database**:
  - ![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)

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
# Activate the virtual environment:
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

3. Install Dependencies

```bash
pip install -r requirements.txt
```

4. Set Up the Database

Make sure your virtual environment is activated, then run the Flask app to create the database:

```bash
python app.py
```

This will automatically create the `database.db` file.

5. Run the Application

With the virtual environment activated, run the backend server:

```bash
python app.py
```

Open your browser and go to [http://localhost:5000](http://localhost:5000) to see the app in action!

---

🧩 Project Structure (High-Level)

```
detaildash-pos/
├── frontend/
├── backend/
│   ├── app.py
│   ├── models.py
│   ├── templates/
│   │   ├── login.html
│   │   ├── index.html
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
