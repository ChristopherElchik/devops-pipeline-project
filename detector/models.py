"""Database models for the detector application."""
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class SavedPhoto(db.Model):  # pylint: disable=too-few-public-methods
    """Model for saved photos with face detection."""
    __tablename__ = 'saved_photos'

    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), unique=True, nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    saved_at = db.Column(db.DateTime, default=datetime.utcnow)
    face_count = db.Column(db.Integer, default=0)

    def __repr__(self):
        return f'<SavedPhoto {self.filename}>'

