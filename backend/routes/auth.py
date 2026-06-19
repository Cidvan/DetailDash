from flask import Blueprint, flash, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

from db import db, User

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/")
@auth_bp.route("/login", methods=["GET"])
def login_get():
    next_url = request.args.get("next", "")
    return render_template("login.html", next_url=next_url)


@auth_bp.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("auth.login_get"))


@auth_bp.route("/register", methods=["GET"])
def register_get():
    return redirect(url_for("auth.login_get"))


@auth_bp.route("/register", methods=["POST"])
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
    return redirect(url_for("auth.login_get"))


@auth_bp.route("/login", methods=["POST"])
def login():
    email = request.form["email"].strip().lower()
    password = request.form["password"]
    next_url = request.form.get("next", "").strip()
    user = User.query.filter_by(email=email).first()

    if user and check_password_hash(user.password_hash, password):
        session["user_id"] = user.id
        if next_url and next_url.startswith("/") and not next_url.startswith("//"):
            return redirect(next_url)
        return redirect(url_for("pages.index"))

    flash("Invalid email or password.", "error")
    next_url_safe = next_url if (next_url.startswith("/") and not next_url.startswith("//")) else ""
    return render_template("login.html", next_url=next_url_safe)
