# [NO LONGER NEEDED - ALL SETUP IS NOW HANDLED WITH ANSIBLE AUTOMATICALLY. SEE README.md]
# Docker Setup for Detector App

This application is containerized using Docker for easy deployment and consistent environments.

## Prerequisites

- Docker installed on your system
- Docker Compose (optional, but recommended)

## Quick Start

### Using Docker Compose (Recommended)

1. Build and run the container:
   ```bash
   docker-compose up --build
   ```

2. Access the application at `http://localhost:3000`

3. To stop the container:
   ```bash
   docker-compose down
   ```

### Using Docker directly

1. Build the Docker image:
   ```bash
   docker build -t detector-app .
   ```

2. Run the container:
   ```bash
   docker run -d \
     -p 3000:3000 \
     -v $(pwd)/instance:/app/instance \
     -v $(pwd)/saved_photos:/app/saved_photos \
     --name detector-app \
     detector-app
   ```

3. Access the application at `http://localhost:3000`

4. To stop and remove the container:
   ```bash
   docker stop detector-app
   docker rm detector-app
   ```

## Environment Variables

You can customize the application using environment variables:

- `SECRET_KEY`: Flask secret key (default: `your-secret-key-change-this`)
- `DATABASE_PATH`: Path to SQLite database (default: `instance/gooberdetector.db`)
- `UPLOAD_FOLDER`: Path to saved photos directory (default: `saved_photos`)
- `FLASK_ENV`: Flask environment (default: `production`)

Example with custom environment variables:
```bash
docker run -d \
  -p 3000:3000 \
  -e SECRET_KEY=your-secret-key-here \
  -e FLASK_ENV=development \
  detector-app
```

## Volumes

The Docker setup uses volumes to persist data:

- `./instance` → `/app/instance` - SQLite database files
- `./saved_photos` → `/app/saved_photos` - Saved photos

This ensures your data persists even if the container is removed.

## Troubleshooting

### Container won't start
- Check if port 3000 is already in use: `lsof -i :3000` (Linux/Mac) or `netstat -ano | findstr :3000` (Windows)
- View container logs: `docker logs detector-app`

### Database not persisting
- Ensure the `instance` directory exists and has proper permissions
- Check volume mounts are correct: `docker inspect detector-app`

### Photos not saving
- Ensure the `saved_photos` directory exists and has proper permissions
- Check volume mounts are correct

## Development

For development with hot-reload, you can mount the source code:

```bash
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/detector:/app/detector \
  -v $(pwd)/instance:/app/instance \
  -v $(pwd)/saved_photos:/app/saved_photos \
  -e FLASK_ENV=development \
  detector-app
```

Note: This won't work with the current Dockerfile as it doesn't have Flask's debug mode enabled. For development, consider using a separate Dockerfile or running locally.

