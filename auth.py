# auth.py - Gestion de l'authentification
#
# Ce fichier gère :
# 1. Le hashage des mots de passe (on ne stocke JAMAIS un mdp en clair)
# 2. La création et vérification des tokens JWT (pour les sessions)
# 3. La fonction qui récupère l'utilisateur connecté depuis le cookie

import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, Cookie
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from passlib.context import CryptContext

import models
from database import get_db

# Clé secrète pour signer les tokens JWT
# En production, mets une vraie clé aléatoire dans le .env !
SECRET_KEY = os.getenv("SECRET_KEY", "changez-moi-en-production-cle-tres-secrete")
ALGORITHM = "HS256"
# Durée de validité du token : 30 jours (session persistante)
ACCESS_TOKEN_EXPIRE_DAYS = 30

# CryptContext configure passlib pour utiliser bcrypt
# bcrypt est l'algorithme de hashage recommandé pour les mots de passe
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Transforme un mot de passe en clair en hash bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vérifie qu'un mot de passe correspond au hash stocké en DB."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: int) -> str:
    """
    Crée un token JWT signé contenant l'id de l'utilisateur.
    
    Le token est signé avec SECRET_KEY → impossible à falsifier sans la clé.
    Il contient une date d'expiration (exp).
    """
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": str(user_id),  # "sub" = subject (identifiant)
        "exp": expire
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    access_token: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db)
) -> models.User:
    """
    Dépendance FastAPI : récupère l'utilisateur connecté depuis le cookie.
    
    FastAPI lit automatiquement le cookie "access_token" de la requête.
    Si le token est invalide ou absent → erreur 401.
    """
    if not access_token:
        raise HTTPException(status_code=401, detail="Non connecté")

    try:
        # Décode et vérifie le token JWT
        payload = jwt.decode(access_token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Token invalide")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable")

    return user


def get_optional_user(
    access_token: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db)
) -> Optional[models.User]:
    """
    Comme get_current_user mais retourne None au lieu de lever une erreur.
    Utile pour les routes qui fonctionnent connecté ET déconnecté.
    """
    try:
        return get_current_user(access_token, db)
    except HTTPException:
        return None
