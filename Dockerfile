# Use Python 3.11 slim image as base
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies required for OpenCV (headless)
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file first (for better caching)
COPY detector/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY detector/ ./detector/

# Create necessary directories
RUN mkdir -p saved_photos instance && \
    chmod 755 saved_photos instance

# Set environment variables
ENV FLASK_APP=detector/app.py
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1

# Expose port 3000
EXPOSE 3000

# Run the application
CMD ["python", "detector/app.py"]

