import os
from dotenv import load_dotenv
import psycopg2

load_dotenv()
db_url = os.getenv("DATABASE_URL")
print("Connecting to Neon PostgreSQL...")

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    cur.execute("SELECT version();")
    ver = cur.fetchone()[0]
    print("SUCCESS: Connected to Neon DB!")
    print("PostgreSQL Version:", ver)

    # Enable pgvector extension
    cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
    conn.commit()
    print("SUCCESS: pgvector extension enabled!")

    cur.close()
    conn.close()
    print("Neon DB check completed successfully!")
except Exception as e:
    print("Connection error:", e)

