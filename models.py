# models.py - Tables de la base de données
# On ajoute la table User en plus de Entry

from sqlalchemy import Column, Integer, Float, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    """
    Table des utilisateurs.
    Chaque utilisateur a son propre historique de poids.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    # Pseudo affiché dans l'app
    username = Column(String(50), unique=True, nullable=False, index=True)

    # Email pour se connecter (unique = pas deux comptes avec le même email)
    email = Column(String(255), unique=True, nullable=False, index=True)

    # Mot de passe hashé (JAMAIS en clair !)
    hashed_password = Column(String(255), nullable=False)

    # Relation : un User a plusieurs Entry
    # "back_populates" crée le lien dans les deux sens
    entries = relationship("Entry", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.username}>"


class Entry(Base):
    """
    Table des entrées de poids.
    Chaque entrée appartient à un utilisateur (user_id).
    """
    __tablename__ = "entries"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, index=True)
    weight = Column(Float, nullable=False)
    note = Column(String(255), nullable=True)

    # Clé étrangère : chaque entrée appartient à un utilisateur
    # ForeignKey("users.id") → référence la colonne id de la table users
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Relation inverse : accès à l'objet User depuis une Entry
    user = relationship("User", back_populates="entries")

    def __repr__(self):
        return f"<Entry user={self.user_id} date={self.date} weight={self.weight}>"
