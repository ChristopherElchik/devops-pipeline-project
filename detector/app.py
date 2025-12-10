"""Main Flask application for face detection."""
import os
import base64
from datetime import datetime

import cv2
import numpy as np
from flask import Flask, render_template, jsonify, send_from_directory, request

from config import Config
from models import db, SavedPhoto

# Load the Haar cascade for face detection
face_cascade = cv2.CascadeClassifier(  # pylint: disable=no-member
    cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
)


def create_app(test_config=None):
    """Create and configure the Flask application."""
    # CSRF protection disabled: This is an internal API service.
    # For production, consider adding Flask-WTF CSRF protection if serving public-facing forms.
    app = Flask(__name__)  # pylint: disable=redefined-outer-name  # NOSONAR
    app.config.from_object(Config)

    if test_config:
        app.config.update(test_config)

    # Initialize database
    db.init_app(app)

    # Create photos directory if it doesn't exist
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    register_routes(app)

    return app

def detect_faces_in_image(image_data):
    """Detect faces in an image and return face coordinates."""
    try:
        # Decode base64 image
        image_bytes = base64.b64decode(image_data.split(',')[1])
        nparr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)  # pylint: disable=no-member

        if frame is None:
            return []

        # Convert to grayscale for face detection
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)  # pylint: disable=no-member

        # Detect faces
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)

        # Convert to list of dictionaries
        face_list = []
        for (x, y, w, h) in faces:
            face_list.append({
                'x': int(x),
                'y': int(y),
                'width': int(w),
                'height': int(h)
            })

        return face_list
    except (ValueError, AttributeError, TypeError) as e:  # pylint: disable=broad-exception-caught
        print(f"Error detecting faces: {e}")
        return []

def register_routes(app):  # pylint: disable=redefined-outer-name,too-many-locals  # NOSONAR
    """Register all application routes."""
    @app.route('/')
    def index():
        """Render the main page."""
        return render_template('index.html')

    @app.route('/api/detect_faces', methods=['POST'])
    def detect_faces():
        """Detect faces in an image sent from frontend."""
        try:
            data = request.get_json()
            if not data or 'image' not in data:
                return jsonify({'error': 'No image data provided'}), 400

            image_data = data['image']
            faces = detect_faces_in_image(image_data)

            return jsonify({
                'faces': faces,
                'face_count': len(faces)
            })
        except (ValueError, AttributeError, TypeError) as e:  # pylint: disable=broad-exception-caught
            print(f"Error in detect_faces: {e}")
            return jsonify({'error': f'Failed to detect faces: {str(e)}'}), 500

    @app.route('/api/save_photo', methods=['POST'])
    def save_photo():
        """Save a photo sent from frontend."""
        try:
            data = request.get_json()
            if not data or 'image' not in data:
                return jsonify({'error': 'No image data provided'}), 400

            image_data = data['image']

            # Decode base64 image
            image_bytes = base64.b64decode(image_data.split(',')[1])
            nparr = np.frombuffer(image_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)  # pylint: disable=no-member

            if frame is None:
                return jsonify({'error': 'Failed to decode image'}), 400

            # Detect faces for metadata
            faces = detect_faces_in_image(image_data)
            face_count = len(faces)

            # Draw rectangles on the image before saving
            for face in faces:
                x, y, w, h = face['x'], face['y'], face['width'], face['height']
                cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)  # pylint: disable=no-member

            # Generate unique filename
            timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S_%f')
            filename = f'photo_{timestamp}.jpg'
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)

            # Save the image
            cv2.imwrite(filepath, frame)  # pylint: disable=no-member

            # Save to database
            photo = SavedPhoto(
                filename=filename,
                original_filename=filename,
                face_count=face_count
            )
            db.session.add(photo)
            db.session.commit()

            return jsonify({
                'message': 'Photo saved successfully',
                'photo_id': photo.id,
                'filename': filename,
                'face_count': face_count
            })
        except (ValueError, AttributeError, TypeError, IOError) as e:  # pylint: disable=broad-exception-caught
            print(f"Error saving photo: {e}")
            return jsonify({'error': f'Failed to save photo: {str(e)}'}), 500

    @app.route('/gallery')
    def gallery():
        """Display gallery of saved photos"""
        return render_template('gallery.html')

    @app.route('/api/photos')
    def get_photos():
        """Get all saved photos."""
        photos = SavedPhoto.query.order_by(SavedPhoto.saved_at.desc()).all()

        photo_data = []
        for photo in photos:
            photo_data.append({
                'id': photo.id,
                'filename': photo.filename,
                'saved_at': photo.saved_at.isoformat(),
                'face_count': photo.face_count
            })

        return jsonify(photo_data)

    @app.route('/photos/<filename>')
    def serve_photo(filename):
        """Serve saved photos."""
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

    @app.route('/api/delete_photo/<int:photo_id>', methods=['DELETE'])
    def delete_photo(photo_id):
        """Delete a saved photo."""
        try:
            photo = SavedPhoto.query.get_or_404(photo_id)
            filename = photo.filename

            # Delete file from filesystem
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            if os.path.exists(filepath):
                os.remove(filepath)

            # Delete from database
            db.session.delete(photo)
            db.session.commit()

            return jsonify({'message': 'Photo deleted successfully'})
        except (ValueError, IOError, AttributeError) as e:  # pylint: disable=broad-exception-caught
            print(f"Error deleting photo: {e}")
            return jsonify({'error': f'Failed to delete photo: {str(e)}'}), 500

    @app.route('/init_db')
    def init_db():
        """Initialize database tables."""
        try:
            with app.app_context():
                db.create_all()
            return jsonify({'message': 'Database initialized successfully'})
        except (ValueError, AttributeError) as e:  # pylint: disable=broad-exception-caught
            return jsonify({'error': f'Failed to initialize database: {str(e)}'}), 500


if __name__ == '__main__':
    app = create_app()  # pylint: disable=redefined-outer-name
    # app.this_is_a_fake_method()
    with app.app_context():
        db.create_all()
    app.run(debug=True, host='0.0.0.0', port=3000)
