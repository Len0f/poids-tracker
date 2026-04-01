# Poids Tracker

Application web de suivi de poids personnel, développée en fullstack avec un frontend en JavaScript natif et une API REST en Python. Projet personnel conçu pour répondre à un besoin concret, utilisé comme support d'apprentissage de Python et FastAPI.

## Technologies

**Frontend**
- HTML / CSS / JavaScript natif

**Backend**
- Python
- FastAPI
- SQLAlchemy 2
- PostgreSQL (via psycopg2)
- Authentification JWT (python-jose, bcrypt, passlib)
- python-dotenv

## Fonctionnalites

- Inscription et connexion avec authentification JWT sécurisée
- Saisie et historique des entrées de poids
- Visualisation de la progression
- API REST documentée automatiquement via FastAPI

## Structure du projet

- `main.py` — Point d'entrée de l'application FastAPI
- `auth.py` — Gestion de l'authentification JWT
- `models.py` — Modèles SQLAlchemy
- `schemas.py` — Schémas Pydantic
- `database.py` — Configuration de la connexion à la base de données
- `static/` — Fichiers frontend (HTML, CSS, JS)

## Auteur

**Caroline Viot** — Développeuse web fullstack JS  
[GitHub](https://github.com/Len0f)
