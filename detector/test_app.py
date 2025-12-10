"""Unit tests for the detector application."""
import base64
import tempfile

import cv2
import numpy as np
import pytest

from app import create_app, db
from models import SavedPhoto


@pytest.fixture
def client():  # pylint: disable=redefined-outer-name
    """Create a test client with a temporary database."""
    test_app = create_app({
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
        'TESTING': True,
        'UPLOAD_FOLDER': tempfile.mkdtemp()
    })
    # Use in-memory SQLite database for testing

    with test_app.app_context():
        db.create_all()
        yield test_app.test_client()
        db.drop_all()


@pytest.fixture
def sample_image_base64():  # pylint: disable=redefined-outer-name
    """Create a simple test image as base64."""
    # Create a simple 100x100 colored image
    img = np.zeros((100, 100, 3), dtype=np.uint8)
    img.fill(128)  # Gray color

    # Encode to JPEG
    _, buffer = cv2.imencode('.jpg', img)  # pylint: disable=no-member
    img_base64 = base64.b64encode(buffer).decode('utf-8')
    return f'data:image/jpeg;base64,{img_base64}'


def test_index_route(client):  # pylint: disable=redefined-outer-name
    """Test the index route returns 200."""
    response = client.get('/')
    assert response.status_code == 200


def test_gallery_route(client):  # pylint: disable=redefined-outer-name
    """Test the gallery route returns 200."""
    response = client.get('/gallery')
    assert response.status_code == 200


def test_init_db_route(client):  # pylint: disable=redefined-outer-name
    """Test the init_db route initializes database."""
    response = client.get('/init_db')
    assert response.status_code == 200
    assert b'successfully' in response.data.lower()


def test_detect_faces_no_image(client):  # pylint: disable=redefined-outer-name
    """Test detect_faces endpoint with no image data."""
    response = client.post('/api/detect_faces', json={})
    assert response.status_code == 400
    assert 'error' in response.get_json()


def test_detect_faces_valid_image(client, sample_image_base64):  # pylint: disable=redefined-outer-name
    """Test detect_faces endpoint with valid image."""
    response = client.post('/api/detect_faces', json={'image': sample_image_base64})
    assert response.status_code == 200
    data = response.get_json()
    assert 'faces' in data
    assert 'face_count' in data
    assert isinstance(data['face_count'], int)
    assert isinstance(data['faces'], list)


def test_save_photo_no_image(client):  # pylint: disable=redefined-outer-name
    """Test save_photo endpoint with no image data."""
    response = client.post('/api/save_photo', json={})
    assert response.status_code == 400
    assert 'error' in response.get_json()


def test_save_photo_valid_image(client, sample_image_base64):  # pylint: disable=redefined-outer-name
    """Test save_photo endpoint with valid image."""
    response = client.post('/api/save_photo', json={'image': sample_image_base64})
    assert response.status_code == 200
    data = response.get_json()
    assert 'message' in data
    assert 'photo_id' in data
    assert 'filename' in data
    assert 'face_count' in data


def test_get_photos_empty(client):  # pylint: disable=redefined-outer-name
    """Test get_photos endpoint with no photos."""
    response = client.get('/api/photos')
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)
    assert len(data) == 0


def test_get_photos_with_photo(client, sample_image_base64):  # pylint: disable=redefined-outer-name
    """Test get_photos endpoint after saving a photo."""
    # Save a photo first
    client.post('/api/save_photo', json={'image': sample_image_base64})

    # Get photos
    response = client.get('/api/photos')
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert 'id' in data[0]
    assert 'filename' in data[0]
    assert 'saved_at' in data[0]
    assert 'face_count' in data[0]


def test_delete_photo_existent(client, sample_image_base64):  # pylint: disable=redefined-outer-name
    """Test delete_photo endpoint with existing photo."""
    # Save a photo first
    save_response = client.post('/api/save_photo', json={'image': sample_image_base64})
    photo_id = save_response.get_json()['photo_id']

    # Delete the photo
    response = client.delete(f'/api/delete_photo/{photo_id}')
    assert response.status_code == 200
    assert 'message' in response.get_json()

    # Verify photo is deleted
    photos_response = client.get('/api/photos')
    assert len(photos_response.get_json()) == 0


def test_serve_photo_nonexistent(client):  # pylint: disable=redefined-outer-name
    """Test serve_photo endpoint with non-existent file."""
    response = client.get('/photos/nonexistent.jpg')
    assert response.status_code == 404

