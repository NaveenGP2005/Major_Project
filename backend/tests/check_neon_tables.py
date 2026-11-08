import psycopg2

conn = psycopg2.connect(
    host="ep-odd-recipe-bb5i3f2r-pooler.c-15.us-east-1.aws.neon.tech",
    hostaddr="34.194.137.112",
    user="neondb_owner",
    password="npg_eQdH2IfngJ1b",
    database="neondb",
    sslmode="require"
)
cur = conn.cursor()
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
tables = [r[0] for r in cur.fetchall()]
print("Tables successfully created in Neon PostgreSQL:")
for t in sorted(tables):
    print(f"  * {t}")
cur.close()
conn.close()

