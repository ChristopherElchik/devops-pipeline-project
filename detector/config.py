"""Application configuration settings."""
import os


class Config:  # pylint: disable=too-few-public-methods
    """Database and app configuration."""

    # SQLite Database Configuration
    # SQLite database file will be created in the instance directory
    _base_dir = os.path.dirname(os.path.dirname(__file__))
    _default_db_path = os.path.join(_base_dir, 'instance', 'gooberdetector.db')
    DATABASE_PATH = os.environ.get('DATABASE_PATH', _default_db_path)
    # Ensure absolute path
    if not os.path.isabs(DATABASE_PATH):
        DATABASE_PATH = os.path.abspath(DATABASE_PATH)

    # SQLAlchemy Configuration
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{DATABASE_PATH}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # App Configuration
    SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-this')

    # Photo Storage Configuration
    # Use environment variable or default to saved_photos in project root
    _default_upload_folder = os.path.join(_base_dir, 'saved_photos')
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', _default_upload_folder)
    # Ensure absolute path
    if not os.path.isabs(UPLOAD_FOLDER):
        UPLOAD_FOLDER = os.path.abspath(UPLOAD_FOLDER)
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
