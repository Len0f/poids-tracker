# database.py - Configuration de la connexion à PostgreSQL
# SQLAlchemy est la librairie Python standard pour parler aux bases de données

import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# L'URL de connexion à PostgreSQL est stockée dans une variable d'environnement
# Format : postgresql://utilisateur:motdepasse@hote:port/nom_base
# On ne met JAMAIS les credentials directement dans le code !
DATABASE_URL = "sqlite:///./poids.db"

# Petite correction pour Render/Railway qui utilisent "postgres://" (ancienne syntaxe)
# SQLAlchemy exige "postgresql://"
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# create_engine crée le "moteur" de connexion à la DB
# pool_pre_ping=True vérifie la connexion avant chaque requête (utile en prod)
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# SessionLocal est la fabrique de sessions DB
# Une "session" = une transaction avec la base de données
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base est la classe dont hériteront tous nos modèles SQLAlchemy
Base = declarative_base()


def get_db():
    """
    Générateur qui fournit une session DB à chaque requête FastAPI.
    
    FastAPI appelle cette fonction via Depends(get_db).
    Le bloc finally garantit que la session est toujours fermée,
    même si une erreur se produit.
    """
    db = SessionLocal()
    try:
        yield db  # "yield" au lieu de "return" : c'est un générateur Python
    finally:
        db.close()
