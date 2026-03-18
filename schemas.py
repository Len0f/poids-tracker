# schemas.py - Validation et sérialisation des données avec Pydantic
#
# Pydantic est intégré à FastAPI et sert à deux choses :
# 1. Valider les données entrantes (ex: weight doit être un nombre entre 20 et 300)
# 2. Définir la forme des données sortantes (ce qu'on renvoie au client)

from pydantic import BaseModel
from datetime import date
from typing import Optional


class EntryIn(BaseModel):
    """
    Schéma pour les données ENTRANTES (POST /api/entries).
    FastAPI valide automatiquement le body JSON selon ce schéma.
    Si la validation échoue, FastAPI renvoie une erreur 422 automatiquement.
    """

    # La date du pesage au format YYYY-MM-DD
    date: date

    # Le poids en kg (float = nombre décimal)
    weight: float

    # Optional[str] = peut être None (pas obligatoire)
    note: Optional[str] = None


class EntryOut(BaseModel):
    """
    Schéma pour les données SORTANTES (ce qu'on renvoie au client).
    On inclut l'id généré par la DB et on expose tous les champs.
    """

    id: int
    date: date
    weight: float
    note: Optional[str] = None

    # model_config permet à Pydantic de lire les attributs SQLAlchemy
    # (sans ça, Pydantic ne saurait pas lire les objets ORM)
    model_config = {"from_attributes": True}