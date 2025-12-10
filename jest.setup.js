// Mock fetch globally
global.fetch = jest.fn();

// Mock navigator.mediaDevices
global.navigator.mediaDevices = {
    getUserMedia: jest.fn(() => Promise.resolve({
        getTracks: () => [{ stop: jest.fn() }]
    }))
};

// Mock HTMLCanvasElement methods
HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/jpeg;base64,test');
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    drawImage: jest.fn(),
    strokeRect: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    scale: jest.fn(),
    strokeStyle: '',
    lineWidth: 0
}));

