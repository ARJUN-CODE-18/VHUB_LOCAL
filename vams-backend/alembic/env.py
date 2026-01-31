import sys
import os

# Add the project root to Python path
# This assumes 'env.py' is inside 'vams-backend/alembic/'
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from logging.config import fileConfig
from sqlalchemy import engine_from_config
from sqlalchemy import pool

# Now your project packages can be imported
from app.db.base import Base

from alembic import context

config = context.config
if config.config_file_name is not None:
	fileConfig(config.config_file_name)
target_metadata = Base.metadata
