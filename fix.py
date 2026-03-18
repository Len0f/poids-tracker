import sqlite3
from database import SessionLocal, engine
from sqlalchemy import text

# 1. Sauvegarde les anciennes entrées
conn = sqlite3.connect('poids.db')
cursor = conn.cursor()
cursor.execute("SELECT date, weight, note FROM entries")
old_entries = cursor.fetchall()
conn.close()
print(f"Sauvegardé {len(old_entries)} entrées")

# 2. Ajoute la colonne user_id si elle n'existe pas
with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE entries ADD COLUMN user_id INTEGER"))
        conn.commit()
        print("Colonne user_id ajoutée")
    except:
        print("Colonne user_id déjà présente")

# 3. Met à jour toutes les entrées avec user_id = 1
with engine.connect() as conn:
    conn.execute(text("UPDATE entries SET user_id = 1 WHERE user_id IS NULL"))
    conn.commit()
    print("Entrées liées à l'utilisateur 1 !")