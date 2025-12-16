# Publishing Docker Image

This guide is for maintainers to publish the Docker image to Docker Hub.

## One-Time Setup

### 1. Create Docker Hub Account
- Go to https://hub.docker.com
- Create account (free for public images)

### 2. Create Repository
- Click "Create Repository"
- Name: `camp-snackbar-pos`
- Visibility: Public
- Description: "Touch-first POS system for summer camps and concession stands"

### 3. Login to Docker Hub
```bash
docker login
# Enter your Docker Hub username and password
```

## Publishing a New Version

### Using Makefile (Recommended)

```bash
# Build and push latest version
make DOCKER_USERNAME=yourname release

# Build and push specific version
make DOCKER_USERNAME=yourname VERSION=v1.0.0 release

# Test locally first
make DOCKER_USERNAME=yourname build
make test
# Access at http://localhost:8080
# Clean up: make clean
```

### Manual Build and Push

```bash
# Build image
docker build -t yourname/camp-snackbar-pos:latest .

# Test locally
docker run -d -p 8080:80 \
  -e SECRET_KEY=test-key \
  yourname/camp-snackbar-pos:latest

# Push to Docker Hub
docker push yourname/camp-snackbar-pos:latest

# Tag and push version
docker tag yourname/camp-snackbar-pos:latest yourname/camp-snackbar-pos:v1.0.0
docker push yourname/camp-snackbar-pos:v1.0.0
```

## Update Configuration Files

After creating your Docker Hub repository, update these files with your username:

### 1. `.env.example`
```env
DOCKER_IMAGE=yourname/camp-snackbar-pos:latest
```

### 2. `docker-compose.yml`
```yaml
image: ${DOCKER_IMAGE:-yourname/camp-snackbar-pos:latest}
```

### 3. `DOCKER_README.md`
Update all references to `yourname/camp-snackbar-pos`

### 4. `docs/deployment/SIMPLE_INSTALL.md`
Update Docker image references

### 5. `README.md`
Update GitHub repository URLs

## Release Checklist

Before publishing a new version:

- [ ] Run security tests: `cd backend && python3 test_security.py`
- [ ] Test locally with Docker: `make build && make test`
- [ ] Update version in CHANGELOG.md
- [ ] Commit all changes
- [ ] Tag release: `git tag v1.0.0 && git push --tags`
- [ ] Build and push Docker image: `make DOCKER_USERNAME=yourname VERSION=v1.0.0 release`
- [ ] Also push 'latest' tag: `make DOCKER_USERNAME=yourname release`
- [ ] Create GitHub release with changelog
- [ ] Test installation from fresh Ubuntu system

## Automated CI/CD (Optional)

For automated builds, you can set up GitHub Actions:

Create `.github/workflows/docker-publish.yml`:

```yaml
name: Docker Image

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          push: true
          tags: |
            yourname/camp-snackbar-pos:latest
            yourname/camp-snackbar-pos:${{ github.ref_name }}
```

Add secrets in GitHub repo settings:
- `DOCKER_USERNAME`: Your Docker Hub username
- `DOCKER_PASSWORD`: Your Docker Hub password or access token

## Support Users

After publishing, users can install with:

```bash
git clone https://github.com/yourname/camp-snackbar-pos.git
cd camp-snackbar-pos
./install.sh
```

The `install.sh` script will automatically pull your published image from Docker Hub.
