
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL
from dotenv import load_dotenv
import os
from pathlib import Path

# Load the backend .env file
load_dotenv(Path(__file__).resolve().parent / ".env")

# Read database credentials
db_url = URL.create(
    drivername="postgresql+psycopg",
    username=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    host=os.getenv("DB_HOST", "localhost"),
    port=int(os.getenv("DB_PORT", "5432")),
    database=os.getenv("DB_NAME"),
)

try:
    engine = create_engine(db_url, pool_pre_ping=True)

    with engine.connect() as connection:
        result = connection.execute(
            text("SELECT current_database(), current_user")
        )
        database, user = result.fetchone()

        print("PostgreSQL connection successful!")
        print("Database:", database)
        print("Connected user:", user)

    engine.dispose()

except Exception as error:
    print("PostgreSQL connection failed.")
    print(type(error).__name__ + ":", error)
