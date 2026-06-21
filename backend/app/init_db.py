import os
import asyncio
import urllib.parse
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text


async def main():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not set, skipping database initialization script.")
        return

    # Parse the URL to get database name
    parsed = urllib.parse.urlparse(db_url)
    db_name = parsed.path.lstrip("/")
    if not db_name:
        print("No database name found in DATABASE_URL, skipping.")
        return

    # Direct to standard system database (defaultdb for CockroachDB)
    system_db = "/defaultdb"

    # Reconstruct the connection URL pointing to the system database
    base_url = db_url.replace(parsed.path, system_db)

    print(
        f"Connecting to base database {base_url} to ensure database '{db_name}' exists..."
    )
    try:
        # Use AUTOCOMMIT isolation level to run DDL outside of a transaction block
        engine = create_async_engine(base_url, isolation_level="AUTOCOMMIT")
        async with engine.connect() as conn:
            await conn.execute(text(f'CREATE DATABASE IF NOT EXISTS "{db_name}"'))
        print(f"Database '{db_name}' created or already exists.")
        await engine.dispose()
    except Exception as e:
        print(
            f"Database creation check skipped or failed (this is normal if database already exists or credentials limit DDL): {e}"
        )


if __name__ == "__main__":
    asyncio.run(main())
