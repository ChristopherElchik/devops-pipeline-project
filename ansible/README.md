# Ansible Deployment for Detector App

This directory contains Ansible playbooks for deploying the detector-app with nginx reverse proxy and Docker Compose orchestration.

## Structure

- `inventory.ini` - Ansible inventory file defining the production host
- `playbook.yml` - Main playbook for initial deployment
- `playbooks/create_lookaside.yml` - Playbook to create a lookaside instance for a PR
- `playbooks/delete_lookaside.yml` - Playbook to delete a lookaside instance
- `roles/deploy/` - Main deployment role with tasks and templates

## Prerequisites

1. **Ansible installed on your local machine** (version 2.9+)
   - **Windows users**: Install Ansible via WSL (Windows Subsystem for Linux) - recommended
     ```bash
     # In WSL terminal
     sudo apt update
     sudo apt install ansible
     ```
   - Or use Ansible via pip in WSL:
     ```bash
     pip3 install ansible
     ```
   - **Note**: Run playbooks from your local machine (WSL/PowerShell), NOT from a Docker container
2. SSH access to the remote host (csc519-129-host.csc.ncsu.edu)
3. SSH key configured for passwordless access (or update ansible.cfg)
4. **Docker and Docker Compose v2 installed on remote host** (see Requirements section below)

## Usage

**Important**: Run all Ansible commands from your **local machine** (PowerShell or WSL terminal), not from a Docker container. Ansible connects to the remote host over SSH.

All commands should be run from the `ansible/` directory.

### Windows Users

If you're using Windows, you have two options:

1. **WSL (Recommended)**: 
   - Open WSL terminal
   - Navigate to your project: `cd /mnt/c/Users/chris/dev/school/CSC519/project/detector-app/ansible`
   - **Important**: When running from WSL on Windows mounts, you must specify the inventory file explicitly:
     ```bash
     ansible-playbook -i inventory.ini playbook.yml
     ```
   - Or set the ANSIBLE_CONFIG environment variable:
     ```bash
     export ANSIBLE_CONFIG=$(pwd)/ansible.cfg
     ansible-playbook playbook.yml
     ```

2. **PowerShell with Ansible installed**:
   - Ensure Ansible is installed for Windows (may have limitations)
   - Run commands from PowerShell in the `ansible/` directory
   - You can use the inventory file explicitly: `ansible-playbook -i inventory.ini playbook.yml`

### Initial Deployment

Deploy the production instance and set up nginx:

```bash
cd ansible
ansible-playbook -i inventory.ini playbook.yml
```

**Note**: If running from WSL on a Windows mount (`/mnt/c/`), you must use `-i inventory.ini` because Ansible ignores `ansible.cfg` in world-writable directories.

This will:
- Install required system packages (Docker, nginx, etc.)
- Copy application code to the server
- Create and start the production Docker container
- Configure nginx as a reverse proxy on port 80
- Route root path (`/`) to the production instance

### Create a Lookaside Instance

Create a lookaside instance for a specific PR number:

```bash
ansible-playbook -i inventory.ini playbooks/create_lookaside.yml -e pr_number=123
```

This will:
- Create a new Docker container for PR #123
- Assign it a port (3001 + PR number, so PR 123 gets port 3124)
- Update nginx to route `/pr-123/` to the lookaside instance
- Start the container

**Note**: All playbooks run without sudo. Everything is containerized.

### Update a Lookaside Instance

To update an existing lookaside instance with new code (rebuilds the container but preserves data):

```bash
ansible-playbook -i inventory.ini playbooks/create_lookaside.yml -e pr_number=123 -e update=true
```

This will:
- Sync the latest application code to the server
- Rebuild the Docker container for PR #123 with the new code
- Preserve the existing database and saved photos
- Update nginx configuration if needed
- Restart the container

**Note**: Use `update=true` to rebuild an existing instance. Use `update_nginx=true` if you only want to update the nginx configuration without rebuilding the container.

### Delete a Lookaside Instance

Remove a lookaside instance:

```bash
ansible-playbook -i inventory.ini playbooks/delete_lookaside.yml -e pr_number=123
```

This will:
- Stop and remove the Docker container
- Remove the instance directory
- Update nginx configuration to remove the route

### List All Instances

List all deployed instances (production and lookaside):

```bash
ansible-playbook -i inventory.ini playbooks/list_instances.yml
```

### Update Application Code

To update the application code on the server:

```bash
ansible-playbook -i inventory.ini playbook.yml
```

This will sync the code and rebuild all containers.

## Architecture

- **Production Instance**: 
  - Container: `production-detector-app`
  - Port: 3000
  - Route: `/` (root)

- **Lookaside Instances**:
  - Container: `lookaside-pr{number}-detector-app`
  - Port: 3001 + PR number
  - Route: `/pr-{number}/`

- **Nginx**: 
  - Listens on port 80
  - Routes traffic to appropriate containers
  - Handles path rewriting for lookaside instances

## Directory Structure on Server

```
/home/cwelchik/detector-app/
├── detector/          # Application code
├── Dockerfile
├── instances/
│   ├── production/   # Production instance
│   │   ├── docker-compose.yml
│   │   ├── instance/ # Database
│   │   └── saved_photos/
│   └── lookaside-pr{number}/  # Lookaside instances
│       ├── docker-compose.yml
│       ├── instance/
│       └── saved_photos/
└── nginx/            # Nginx configs (if needed)
```

## Variables

Key variables can be overridden:

- `production_port`: Port for production instance (default: 3000)
- `lookaside_base_port`: Base port for lookaside instances (default: 3001)
- `app_dir`: Application directory on server (default: /home/cwelchik/detector-app)

Example:

```bash
ansible-playbook -i inventory.ini playbook.yml -e production_port=3000 -e lookaside_base_port=3100
```

## Requirements

**All playbooks run without sudo access.** The deployment is fully containerized:

- Docker must already be installed on the remote server
- Docker Compose v2 plugin must be installed (use `docker compose`, not `docker-compose`)
- Your user must be able to run `docker` and `docker compose` commands (usually means you're in the `docker` group)
- All operations run in Docker containers (including nginx)
- No system package installation or system-wide configuration is performed

## Troubleshooting

### Docker Not Available

If you get errors about Docker not being available, ensure:
- Docker is installed on the remote server
- Your user is in the `docker` group (run `groups` to check)
- You can run `docker --version` and `docker compose version` on the remote server

### Container Issues

If containers fail to start:
- Check Docker logs: `docker logs <container-name>`
- Verify ports are available: `netstat -tuln | grep <port>`
- Ensure Docker has enough resources (memory, disk space)

### Nginx Not Routing Correctly

If nginx isn't routing to instances:
- Check nginx container is running: `docker ps | grep nginx`
- Verify nginx config: `docker exec detector-app-nginx nginx -t`
- Restart nginx container: `docker restart detector-app-nginx`

