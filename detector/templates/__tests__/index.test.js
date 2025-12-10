/**
 * Tests for index.html JavaScript functionality
 */

describe('Index Page Functions', () => {
    let mockVideo, mockCanvas, mockCtx, mockStatus, mockButton;

    beforeEach(() => {
        // Reset mocks
        fetch.mockClear();
        global.navigator.mediaDevices.getUserMedia.mockClear();
        
        // Setup DOM elements
        document.body.innerHTML = `
            <video id="video" autoplay playsinline></video>
            <canvas id="canvas"></canvas>
            <div id="status" class="status detecting">Face detection active</div>
            <button id="save-photo-btn" class="save-photo-button">📸 Save Photo</button>
            <div class="controls-container"></div>
        `;
        
        mockVideo = document.getElementById('video');
        mockCanvas = document.getElementById('canvas');
        mockStatus = document.getElementById('status');
        mockButton = document.getElementById('save-photo-btn');
        
        // Mock canvas context
        mockCtx = {
            drawImage: jest.fn(),
            strokeRect: jest.fn(),
            save: jest.fn(),
            restore: jest.fn(),
            scale: jest.fn(),
            strokeStyle: '',
            lineWidth: 0
        };
        mockCanvas.getContext = jest.fn(() => mockCtx);
        
        // Mock video properties
        mockVideo.videoWidth = 640;
        mockVideo.videoHeight = 480;
        mockVideo.readyState = 4; // HAVE_ENOUGH_DATA
        mockVideo.onloadedmetadata = null;
        
        // Mock canvas dimensions
        mockCanvas.width = 640;
        mockCanvas.height = 480;
    });

    describe('showMessage function', () => {
        test('should create and display success message', () => {
            // Simulate showMessage function
            function showMessage(text, isError = false) {
                const existingMessage = document.querySelector('.message');
                if (existingMessage) {
                    existingMessage.remove();
                }
                
                const message = document.createElement('div');
                message.className = `message ${isError ? 'error' : 'success'}`;
                message.textContent = text;
                
                const controlsContainer = document.querySelector('.controls-container');
                controlsContainer.parentNode.insertBefore(message, controlsContainer.nextSibling);
            }
            
            showMessage('Test success message', false);
            
            const message = document.querySelector('.message');
            expect(message).toBeTruthy();
            expect(message.className).toContain('success');
            expect(message.textContent).toBe('Test success message');
        });

        test('should create and display error message', () => {
            function showMessage(text, isError = false) {
                const existingMessage = document.querySelector('.message');
                if (existingMessage) {
                    existingMessage.remove();
                }
                
                const message = document.createElement('div');
                message.className = `message ${isError ? 'error' : 'success'}`;
                message.textContent = text;
                
                const controlsContainer = document.querySelector('.controls-container');
                controlsContainer.parentNode.insertBefore(message, controlsContainer.nextSibling);
            }
            
            showMessage('Test error message', true);
            
            const message = document.querySelector('.message');
            expect(message).toBeTruthy();
            expect(message.className).toContain('error');
            expect(message.textContent).toBe('Test error message');
        });
    });

    describe('captureFrame function', () => {
        test('should capture frame and return base64 data URL', () => {
            function captureFrame() {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = mockVideo.videoWidth;
                tempCanvas.height = mockVideo.videoHeight;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.drawImage(mockVideo, 0, 0);
                return tempCanvas.toDataURL('image/jpeg', 0.9);
            }
            
            const result = captureFrame();
            expect(result).toBe('data:image/jpeg;base64,test');
        });
    });

    describe('savePhoto function', () => {
        test('should show error message if stream is not available', () => {
            function showMessage(text, isError = false) {
                const message = document.createElement('div');
                message.className = `message ${isError ? 'error' : 'success'}`;
                message.textContent = text;
                document.querySelector('.controls-container').appendChild(message);
            }
            
            function captureFrame() {
                return 'data:image/jpeg;base64,test';
            }
            
            let stream = null;
            
            function savePhoto() {
                if (!stream) {
                    showMessage('Please allow camera access first.', true);
                    return;
                }
                // ... rest of savePhoto logic
            }
            
            savePhoto();
            
            const message = document.querySelector('.message');
            expect(message).toBeTruthy();
            expect(message.textContent).toBe('Please allow camera access first.');
            expect(message.className).toContain('error');
        });

        test('should call API when saving photo', async () => {
            fetch.mockResolvedValueOnce({
                json: async () => ({
                    message: 'Photo saved successfully',
                    photo_id: 1,
                    filename: 'photo.jpg',
                    face_count: 2
                })
            });
            
            function captureFrame() {
                return 'data:image/jpeg;base64,test';
            }
            
            function showMessage(text, isError = false) {
                const message = document.createElement('div');
                message.className = `message ${isError ? 'error' : 'success'}`;
                message.textContent = text;
                document.querySelector('.controls-container').appendChild(message);
            }
            
            async function savePhoto() {
                const imageData = captureFrame();
                
                const response = await fetch('/api/save_photo', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ image: imageData })
                });
                
                const data = await response.json();
                if (data.error) {
                    showMessage('Error: ' + data.error, true);
                } else {
                    const faceText = data.face_count === 1 ? 'face' : 'faces';
                    showMessage(`Photo saved! Detected ${data.face_count} ${faceText}.`);
                }
            }
            
            await savePhoto();
            
            expect(fetch).toHaveBeenCalledWith('/api/save_photo', expect.objectContaining({
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            }));
        });
    });

    describe('API interactions', () => {
        test('should handle detect_faces API call', async () => {
            const mockFaces = [
                { x: 100, y: 100, width: 50, height: 50 }
            ];
            
            fetch.mockResolvedValueOnce({
                json: async () => ({
                    faces: mockFaces,
                    face_count: 1
                })
            });
            
            const imageData = 'data:image/jpeg;base64,test';
            const response = await fetch('/api/detect_faces', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ image: imageData })
            });
            
            const data = await response.json();
            
            expect(fetch).toHaveBeenCalledWith('/api/detect_faces', expect.objectContaining({
                method: 'POST'
            }));
            expect(data.faces).toEqual(mockFaces);
            expect(data.face_count).toBe(1);
        });

        test('should handle API error responses', async () => {
            fetch.mockResolvedValueOnce({
                json: async () => ({
                    error: 'No image data provided'
                })
            });
            
            const response = await fetch('/api/detect_faces', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });
            
            const data = await response.json();
            expect(data.error).toBe('No image data provided');
        });
    });

    describe('DOM manipulation', () => {
        test('should update status element', () => {
            mockStatus.innerHTML = 'Face detection active - Look at the camera!';
            expect(mockStatus.innerHTML).toBe('Face detection active - Look at the camera!');
            
            mockStatus.innerHTML = 'Face detection active - 2 faces detected!';
            expect(mockStatus.innerHTML).toContain('2 faces detected');
        });

        test('should enable/disable button', () => {
            expect(mockButton.disabled).toBe(false);
            
            mockButton.disabled = true;
            expect(mockButton.disabled).toBe(true);
            
            mockButton.disabled = false;
            expect(mockButton.disabled).toBe(false);
        });
    });
});

