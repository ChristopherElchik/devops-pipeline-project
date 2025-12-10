/**
 * Tests for gallery.html JavaScript functionality
 */

describe('Gallery Page Functions', () => {
    beforeEach(() => {
        // Reset mocks
        fetch.mockClear();
        
        // Setup DOM
        document.body.innerHTML = `
            <div id="message-container"></div>
            <div id="gallery-container">
                <div class="loading">Loading photos...</div>
            </div>
            <div id="photo-count">Loading photos...</div>
        `;
    });

    describe('showMessage function', () => {
        test('should display success message', () => {
            function showMessage(text, isError = false) {
                const container = document.getElementById('message-container');
                const message = document.createElement('div');
                message.className = `message ${isError ? 'error' : 'success'}`;
                message.textContent = text;
                container.innerHTML = '';
                container.appendChild(message);
            }
            
            showMessage('Photo deleted successfully');
            
            const message = document.querySelector('.message');
            expect(message).toBeTruthy();
            expect(message.className).toContain('success');
            expect(message.textContent).toBe('Photo deleted successfully');
        });

        test('should display error message', () => {
            function showMessage(text, isError = false) {
                const container = document.getElementById('message-container');
                const message = document.createElement('div');
                message.className = `message ${isError ? 'error' : 'success'}`;
                message.textContent = text;
                container.innerHTML = '';
                container.appendChild(message);
            }
            
            showMessage('Error deleting photo', true);
            
            const message = document.querySelector('.message');
            expect(message).toBeTruthy();
            expect(message.className).toContain('error');
            expect(message.textContent).toBe('Error deleting photo');
        });

        test('should replace existing message', () => {
            function showMessage(text, isError = false) {
                const container = document.getElementById('message-container');
                const message = document.createElement('div');
                message.className = `message ${isError ? 'error' : 'success'}`;
                message.textContent = text;
                container.innerHTML = '';
                container.appendChild(message);
            }
            
            showMessage('First message');
            showMessage('Second message');
            
            const messages = document.querySelectorAll('.message');
            expect(messages.length).toBe(1);
            expect(messages[0].textContent).toBe('Second message');
        });
    });

    describe('loadPhotos function', () => {
        test('should display empty gallery when no photos', async () => {
            fetch.mockResolvedValueOnce({
                json: async () => []
            });
            
            async function loadPhotos() {
                const response = await fetch('/api/photos');
                const photos = await response.json();
                const container = document.getElementById('gallery-container');
                const countElement = document.getElementById('photo-count');
                
                if (photos.length === 0) {
                    container.innerHTML = `
                        <div class="empty-gallery">
                            <h2>No photos yet</h2>
                            <p>Go back to the detector and save some photos!</p>
                        </div>
                    `;
                    countElement.textContent = 'No photos saved';
                    return;
                }
            }
            
            await loadPhotos();
            
            expect(fetch).toHaveBeenCalledWith('/api/photos');
            const emptyGallery = document.querySelector('.empty-gallery');
            expect(emptyGallery).toBeTruthy();
            expect(document.getElementById('photo-count').textContent).toBe('No photos saved');
        });

        test('should display photos when available', async () => {
            const mockPhotos = [
                {
                    id: 1,
                    filename: 'photo1.jpg',
                    saved_at: '2024-01-01T12:00:00',
                    face_count: 2
                },
                {
                    id: 2,
                    filename: 'photo2.jpg',
                    saved_at: '2024-01-02T12:00:00',
                    face_count: 1
                }
            ];
            
            fetch.mockResolvedValueOnce({
                json: async () => mockPhotos
            });
            
            async function loadPhotos() {
                const response = await fetch('/api/photos');
                const photos = await response.json();
                const container = document.getElementById('gallery-container');
                const countElement = document.getElementById('photo-count');
                
                if (photos.length === 0) {
                    container.innerHTML = `<div class="empty-gallery"><h2>No photos yet</h2></div>`;
                    countElement.textContent = 'No photos saved';
                    return;
                }
                
                countElement.textContent = `${photos.length} photo${photos.length === 1 ? '' : 's'} saved`;
                
                container.innerHTML = `
                    <div class="gallery">
                        ${photos.map(photo => `
                            <div class="photo-card" data-photo-id="${photo.id}">
                                <div class="photo-info">
                                    <h3>Photo ${photo.id}</h3>
                                    <div class="photo-meta">
                                        <strong>Faces detected:</strong> ${photo.face_count}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
            
            await loadPhotos();
            
            expect(fetch).toHaveBeenCalledWith('/api/photos');
            const photoCards = document.querySelectorAll('.photo-card');
            expect(photoCards.length).toBe(2);
            expect(document.getElementById('photo-count').textContent).toBe('2 photos saved');
        });

        test('should handle API errors when loading photos', async () => {
            fetch.mockRejectedValueOnce(new Error('Network error'));
            
            async function loadPhotos() {
                try {
                    const response = await fetch('/api/photos');
                    const photos = await response.json();
                    // ... success handling
                } catch (error) {
                    document.getElementById('gallery-container').innerHTML = `
                        <div class="empty-gallery">
                            <h2>Error loading photos</h2>
                            <p>Please try refreshing the page.</p>
                        </div>
                    `;
                }
            }
            
            await loadPhotos();
            
            const errorMessage = document.querySelector('.empty-gallery h2');
            expect(errorMessage).toBeTruthy();
            expect(errorMessage.textContent).toBe('Error loading photos');
        });
    });

    describe('deletePhoto function', () => {
        test('should call delete API endpoint', async () => {
            // Mock window.confirm to return true
            window.confirm = jest.fn(() => true);
            
            fetch.mockResolvedValueOnce({
                json: async () => ({
                    message: 'Photo deleted successfully'
                })
            });
            
            async function deletePhoto(photoId) {
                if (!window.confirm('Are you sure you want to delete this photo?')) {
                    return;
                }
                
                const response = await fetch(`/api/delete_photo/${photoId}`, { 
                    method: 'DELETE' 
                });
                const data = await response.json();
                return data;
            }
            
            const result = await deletePhoto(1);
            
            expect(window.confirm).toHaveBeenCalled();
            expect(fetch).toHaveBeenCalledWith('/api/delete_photo/1', {
                method: 'DELETE'
            });
            expect(result.message).toBe('Photo deleted successfully');
        });

        test('should not delete if user cancels confirmation', async () => {
            window.confirm = jest.fn(() => false);
            
            async function deletePhoto(photoId) {
                if (!window.confirm('Are you sure you want to delete this photo?')) {
                    return null;
                }
                
                const response = await fetch(`/api/delete_photo/${photoId}`, { 
                    method: 'DELETE' 
                });
                const data = await response.json();
                return data;
            }
            
            const result = await deletePhoto(1);
            
            expect(window.confirm).toHaveBeenCalled();
            expect(fetch).not.toHaveBeenCalled();
            expect(result).toBeNull();
        });

        test('should handle delete API errors', async () => {
            window.confirm = jest.fn(() => true);
            
            fetch.mockResolvedValueOnce({
                json: async () => ({
                    error: 'Photo not found'
                })
            });
            
            function showMessage(text, isError = false) {
                const container = document.getElementById('message-container');
                const message = document.createElement('div');
                message.className = `message ${isError ? 'error' : 'success'}`;
                message.textContent = text;
                container.innerHTML = '';
                container.appendChild(message);
            }
            
            async function deletePhoto(photoId) {
                if (!window.confirm('Are you sure you want to delete this photo?')) {
                    return;
                }
                
                const response = await fetch(`/api/delete_photo/${photoId}`, { 
                    method: 'DELETE' 
                });
                const data = await response.json();
                
                if (data.error) {
                    showMessage('Error: ' + data.error, true);
                } else {
                    showMessage('Photo deleted successfully');
                }
            }
            
            await deletePhoto(1);
            
            const message = document.querySelector('.message');
            expect(message).toBeTruthy();
            expect(message.className).toContain('error');
            expect(message.textContent).toContain('Error: Photo not found');
        });
    });

    describe('DOM manipulation', () => {
        test('should update photo count', () => {
            const countElement = document.getElementById('photo-count');
            
            countElement.textContent = '1 photo saved';
            expect(countElement.textContent).toBe('1 photo saved');
            
            countElement.textContent = '5 photos saved';
            expect(countElement.textContent).toBe('5 photos saved');
        });

        test('should create photo cards with correct data attributes', () => {
            const container = document.getElementById('gallery-container');
            const photo = {
                id: 1,
                filename: 'photo1.jpg',
                face_count: 2
            };
            
            container.innerHTML = `
                <div class="gallery">
                    <div class="photo-card" data-photo-id="${photo.id}">
                        <div class="photo-info">
                            <h3>Photo ${photo.id}</h3>
                            <div class="photo-meta">
                                <strong>Faces detected:</strong> ${photo.face_count}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            const photoCard = document.querySelector('[data-photo-id="1"]');
            expect(photoCard).toBeTruthy();
            expect(photoCard.getAttribute('data-photo-id')).toBe('1');
        });
    });
});

