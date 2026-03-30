# main.py - Routes FastAPI avec authentification

# main.py - Routes FastAPI avec authentification
from dotenv import load_dotenv  # ← ajoute
load_dotenv()                   # ← ajoute

from fastapi import FastAPI, Depends, HTTPException, Response, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy.orm import Session
from datetime import date
from typing import Optional
from pydantic import BaseModel

import models
import schemas
from database import engine, get_db
from auth import (
    hash_password, verify_password,
    create_access_token, get_current_user
)

# Crée toutes les tables au démarrage
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Pèse-moi", docs_url="/docs")
app.mount("/static", StaticFiles(directory="static"), name="static")


# ─── SCHÉMAS AUTH ────────────────────────────────────────────────────────────

class RegisterIn(BaseModel):
    username: str
    email: str
    password: str

class LoginIn(BaseModel):
    email: str
    password: str


# ─── PAGES HTML ──────────────────────────────────────────────────────────────

@app.get("/")
def read_root(request: Request):
    """Redirige vers /login si pas connecté, sinon sert l'app."""
    token = request.cookies.get("access_token")
    if not token:
        return RedirectResponse(url="/login")
    return FileResponse("static/index.html")

@app.get("/login")
def login_page():
    return FileResponse("static/login.html")


# ─── ROUTES AUTH ─────────────────────────────────────────────────────────────

@app.post("/api/auth/register")
def register(data: RegisterIn, response: Response, db: Session = Depends(get_db)):
    """
    Inscription d'un nouvel utilisateur.
    Vérifie que l'email et le pseudo ne sont pas déjà pris.
    """
    # Vérifie si l'email existe déjà
    if db.query(models.User).filter(models.User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email déjà utilisé")

    # Vérifie si le pseudo existe déjà
    if db.query(models.User).filter(models.User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Pseudo déjà pris")

    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Mot de passe trop court (6 caractères min)")

    # Crée l'utilisateur avec le mot de passe hashé
    user = models.User(
        username=data.username,
        email=data.email,
        hashed_password=hash_password(data.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Connecte directement après l'inscription
    token = create_access_token(user.id)

    # Stocke le token dans un cookie HTTP-only (inaccessible au JS → plus sécurisé)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,       # Inaccessible via JS
        max_age=30 * 24 * 3600,  # 30 jours en secondes
        samesite="lax"       # Protection CSRF basique
    )

    return {"message": "Compte créé !", "username": user.username}


@app.post("/api/auth/login")
def login(data: LoginIn, response: Response, db: Session = Depends(get_db)):
    """
    Connexion avec email + mot de passe.
    Retourne un cookie de session si les credentials sont corrects.
    """
    user = db.query(models.User).filter(models.User.email == data.email).first()

    # On vérifie l'utilisateur ET le mot de passe en une fois
    # (même message d'erreur pour ne pas révéler si l'email existe)
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    token = create_access_token(user.id)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=30 * 24 * 3600,
        samesite="lax"
    )

    return {"message": "Connecté !", "username": user.username}


@app.post("/api/auth/logout")
def logout(response: Response):
    """Déconnexion : supprime le cookie."""
    response.delete_cookie("access_token")
    return {"message": "Déconnecté"}


@app.get("/api/auth/me")
def me(current_user: models.User = Depends(get_current_user)):
    """Retourne les infos de l'utilisateur connecté."""
    return {"id": current_user.id, "username": current_user.username, "email": current_user.email}


# ─── ROUTES API (protégées) ───────────────────────────────────────────────────

@app.get("/api/entries", response_model=list[schemas.EntryOut])
def get_entries(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Récupère les entrées de L'UTILISATEUR CONNECTÉ uniquement."""
    return (
        db.query(models.Entry)
        .filter(models.Entry.user_id == current_user.id)
        .order_by(models.Entry.date.desc())
        .all()
    )


@app.post("/api/entries", response_model=schemas.EntryOut, status_code=201)
def create_or_update_entry(
    entry: schemas.EntryIn,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Crée ou met à jour une entrée pour l'utilisateur connecté."""
    existing = (
        db.query(models.Entry)
        .filter(
            models.Entry.user_id == current_user.id,
            models.Entry.date == entry.date
        )
        .first()
    )

    if existing:
        existing.weight = entry.weight
        existing.note = entry.note
        db.commit()
        db.refresh(existing)
        return existing
    else:
        new_entry = models.Entry(
            date=entry.date,
            weight=entry.weight,
            note=entry.note,
            user_id=current_user.id  # ← Lié à l'utilisateur connecté
        )
        db.add(new_entry)
        db.commit()
        db.refresh(new_entry)
        return new_entry


@app.delete("/api/entries/{entry_date}", status_code=204)
def delete_entry(
    entry_date: date,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Supprime une entrée — vérifie qu'elle appartient bien à l'utilisateur."""
    entry = (
        db.query(models.Entry)
        .filter(
            models.Entry.user_id == current_user.id,
            models.Entry.date == entry_date
        )
        .first()
    )

    if not entry:
        raise HTTPException(status_code=404, detail="Entrée introuvable")

    db.delete(entry)
    db.commit()
