# detector-app
CSC519 Project

### Team Members:

- Christopher Elchik (cwelchik)
- Jake McDavitt (jfmcdavi)

### Project Proposal
Wiki Link: https://github.ncsu.edu/cwelchik/detector-app/wiki/Project-Proposal

### App Info

Goober Detector is an AI-enhanced SaaS app that connects to a user's facecam and detects goobers. If a goober is found, a green square will be drawn around the goober's face in the video feed. Camera images can be conveniently saved and deleted at the user's will. OpenCV is used for facial recognition. This app requires the browser to access the facecam.

To bypass facecam permissions (for chrome users), please do the following:

1. Go to this link: chrome://flags/#unsafely-treat-insecure-origin-as-secure
2. Enter `http://csc519-129-host.csc.ncsu.edu:3000/,http://csc519-129-host.csc.ncsu.edu` into the text area
3. Choose enabled from the drop-down and then click the button to relaunch chrome

The app's production server will be deployed here: http://csc519-129-host.csc.ncsu.edu

### Testing

_Note that AI was used to assist in creating the unit tests._

#### Backend Tests

To run all backend tests, navigate to `/detector` and run the following command:

```bash
pytest
```

Backend tests are located in `detector/test_app.py` and test all Flask routes, API endpoints, and face detection functionality.

#### Frontend Tests

To run all frontend tests, in the root directory, run the following:

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

Frontend tests are located in `detector/templates/__tests__/` and use Jest to test frontend components and user interactions.

---

## Application Architecture

### Application Structure

The application is a Flask-based web application with the following key components:

- **`detector/app.py`**: Main Flask application file containing route handlers, face detection logic, and API endpoints
- **`detector/models.py`**: SQLAlchemy database models (SavedPhoto model)
- **`detector/config.py`**: Application configuration including database paths, secret keys, and upload settings
- **`detector/templates/`**: HTML templates (index.html, gallery.html) and frontend JavaScript
- **`detector/requirements.txt`**: Python dependencies including Flask, OpenCV, SQLAlchemy, and testing libraries

### Docker

The application is containerized using Docker for consistent deployment across environments.

- **`Dockerfile`**: Defines the container image based on Python 3.11-slim, installs system dependencies for OpenCV, and sets up the application environment
- **`docker-compose.yml`**: Orchestrates the application container and nginx reverse proxy (this was created for the usage of lookasides/preview apps in the DevOps pipeline)

To build and run locally:
```bash
docker-compose up --build
```

The application runs on port 3000 inside the container.

### Ansible Deployment

Ansible playbooks automate deployment to the production server. See `ansible/README.md` for detailed documentation.

**Key Files:**
- **`ansible/playbook.yml`**: Main playbook for initial production deployment
- **`ansible/playbooks/create_lookaside.yml`**: Creates preview instances for pull requests
- **`ansible/playbooks/delete_lookaside.yml`**: Cleans up preview instances when PRs are closed
- **`ansible/inventory.ini`**: Defines the production host (csc519-129-host.csc.ncsu.edu)
- **`ansible/roles/deploy/`**: Contains deployment tasks, templates for docker-compose files, and nginx configuration

**Usage:**
```bash
# initialize production server + nginx
cd ansible
ansible-playbook -i inventory.ini playbook.yml

# Everything below gets done automatically through GitHub Actions
# create lookaside
ansible-playbook -i inventory.ini playbooks/create_lookaside.yml -e pr_number=[PR number]
ansible-playbook -i inventory.ini playbook.yml # updates nginx so it is aware of the new lookaside container, so it can route requests to it

# update lookaside
ansible-playbook -i inventory.ini playbooks/create_lookaside.yml -e pr_number=[PR number] -e update=true

# delete lookaside
ansible-playbook -i inventory.ini playbooks/delete_lookaside.yml -e pr_number=[PR number]
ansible-playbook -i inventory.ini playbook.yml # updates nginx so it no longer keeps track of the nonexistent container
```

Ansible handles:
- Docker container orchestration
- Nginx reverse proxy configuration
- Lookaside instance management for PR previews
- Port allocation and routing

### Nginx

Nginx serves as a reverse proxy, routing requests to the appropriate application instances:

- **Production instance**: Served at the root URL
- **Lookaside instances**: Served at `/pr-{number}/` for each pull request preview
- **Configuration**: Managed by Ansible templates in `ansible/roles/deploy/templates/nginx-main.conf.j2`

Nginx runs in a Docker container and automatically reloads configuration when lookaside instances are created or deleted.

### SonarQube

SonarQube provides code quality analysis and static code analysis.

- **Instance**: Running at http://10.76.2.96:3000
- **Project Key**: `Detector`
- **Configuration**: `sonar-project.properties` defines project settings and source paths
- **Integration**: Automatically runs on pull requests via GitHub Actions workflow

The quality gate checks for code smells, bugs, vulnerabilities, and security hotspots.

### GitHub Workflows

CI/CD pipeline is defined in `.github/workflows/pipeline.yml` and runs automatically on pull requests to `release-*` branches.

**Pipeline Stages:**

1. **`run-tests`**: Runs backend (pytest) and frontend (Jest) tests
2. **`run-linter`**: Runs pylint on Python code with a minimum score requirement of 70%
3. **`dependency-check`**: Scans dependencies for vulnerabilities using:
   - `pip-audit` for Python packages
   - `npm audit` for Node.js packages
4. **`sonarqube`**: Performs static code analysis and quality gate checks
5. **`deploy-lookaside`**: Creates a preview deployment for the PR (if all checks pass)
6. **`delete-lookaside`**: Cleans up preview instances when PRs are closed
   - Updates main to reflect current release (if PR is accepted)
   - Automatically deploys updates to production server (if PR is accepted)

**Workflow Features:**
- All stages must pass before deployment
- Lookaside instances are automatically created for each PR. Each has its own dynamically created Docker container, so the amount of lookasides is only limited by the VCL machine's performance.
- PR comments are posted with deployment URLs and SonarQube results
- Automatic cleanup when PRs are merged or closed

**Self-Hosted Runner:**
The workflow uses a self-hosted GitHub Actions runner, which requires:
- Python 3.12
- Node.js (latest)
- Docker and Docker Compose
- SSH access to the production server

---

## Deployment

### Production Deployment

Production deployment is handled automatically through the GitHub workflow when a release branch PR is merged to `main`. The workflow:

1. Runs all tests and quality checks
2. Deploys to production via Ansible
3. Updates nginx configuration
4. Makes the application available at http://csc519-129-host.csc.ncsu.edu

### Manual Deployment

For manual deployment, see `ansible/README.md` for detailed instructions on running Ansible playbooks.

### Preview Deployments

Each pull request automatically gets a preview deployment (lookaside instance) accessible at:
```
http://csc519-129-host.csc.ncsu.edu/pr-{PR_NUMBER}/
```

These instances are automatically cleaned up when the PR is closed.
