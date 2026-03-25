import sys
import os

# Add the project root to Python path
# This assumes 'env.py' is inside 'vams-backend/alembic/'
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from logging.config import fileConfig
from sqlalchemy import create_engine
from sqlalchemy import engine_from_config
from sqlalchemy import pool

# Now your project packages can be imported
from app.db.base import Base
from app.core.config import settings
import app.db.models  # noqa: F401  # Ensure model metadata is loaded

from alembic import context

config = context.config
if config.config_file_name is not None:
	fileConfig(config.config_file_name)

config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
	"""Run migrations in 'offline' mode."""
	url = config.get_main_option("sqlalchemy.url")
	context.configure(
		url=url,
		target_metadata=target_metadata,
		literal_binds=True,
		dialect_opts={"paramstyle": "named"},
		compare_type=True,
	)

	with context.begin_transaction():
		context.run_migrations()


def run_migrations_online() -> None:
	"""Run migrations in 'online' mode."""
	url = config.get_main_option("sqlalchemy.url")
	if not url:
		raise RuntimeError("sqlalchemy.url is not configured for Alembic")

	connectable = create_engine(
		url,
		poolclass=pool.NullPool,
	)

	with connectable.connect() as connection:
		context.configure(
			connection=connection,
			target_metadata=target_metadata,
			compare_type=True,
		)

		with context.begin_transaction():
			context.run_migrations()


if context.is_offline_mode():
	run_migrations_offline()
else:
	run_migrations_online()
