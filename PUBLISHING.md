# Publishing Docker Image to GitHub Container Registry (GHCR)

This guide is for maintainers to publish the Docker image to GitHub Container Registry.

## Why GHCR?

- ✅ **Free** - No Docker Hub subscription needed
- ✅ **Integrated** - Already using GitHub
- ✅ **No extra accounts** - Uses your GitHub credentials
- ✅ **Unlimited public images** - No rate limits
- ✅ **Better CI/CD** - Native GitHub Actions integration

## One-Time Setup

### 1. Create Personal Access Token (PAT)

1. Go to https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a name: `GHCR Publishing`
4. Select scopes:
   - ✅ `write:packages` (includes read:packages)
   - ✅ `delete:packages` (optional, for cleanup)
5. Click "Generate token"
6. **COPY THE TOKEN** - you won't see it again!

### 2. Login to GHCR

```bash
# Login to GitHub Container Registry
make login

# Or manually:
docker login ghcr.io
# Username: YOUR_GITHUB_USERNAME
# Password: YOUR_PERSONAL_ACCESS_TOKEN
```

### 3. Update Configuration Files

Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username in:
- `docker-compose.yml`
- `.env.example`
- `install.sh`
- `Makefile`
- `DOCKER_README.md`
- `docs/deployment/SIMPLE_INSTALL.md`

## Publishing a New Version

### Using Makefile (Recommended)

```bash
# Build and push latest version
make GITHUB_USERNAME=youruser release

# Build and push specific version
make GITHUB_USERNAME=youruser VERSION=v1.0.0 release

# Test locally first
make GITHUB_USERNAME=youruser build
make test
# Access at http://localhost:8080
# Clean up: make clean
```

### Manual Build and Push

```bash
# Build image
docker build -t ghcr.io/youruser/camp-snackbar-pos:latest .

# Test locally
docker run -d -p 8080:80 \
  -e SECRET_KEY=test-key \
  ghcr.io/youruser/camp-snackbar-pos:latest

# Push to GHCR
docker push ghcr.io/youruser/camp-snackbar-pos:latest

# Tag and push version
docker tag ghcr.io/youruser/camp-snackbar-pos:latest \
  ghcr.io/youruser/camp-snackbar-pos:v1.0.0
docker push ghcr.io/youruser/camp-snackbar-pos:v1.0.0
```

## Make Package Public

By default, GHCR packages are private. To make it public:

1. Go to https://github.com/YOUR_USERNAME?tab=packages
2. Click on `camp-snackbar-pos`
3. Click "Package settings" (bottom right)
4. Scroll to "Danger Zone"
5. Click "Change visibility" → "Public"
6. Confirm

## Automated Publishing with GitHub Actions

Create `.github/workflows/publish-image.yml`:

```yaml
name: Publish Docker Image

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:  # Manual trigger

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=semver,pattern={{major}}
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
```

With this workflow:
- Create a tag: `git tag v1.0.0 && git push --tags`
- GitHub Actions automatically builds and publishes the image
- No need to run `make release` manually!

## Release Checklist

Before publishing a new version:

- [ ] Run security tests: `cd backend && python3 test_security.py`
- [ ] Test locally with Docker: `make build && make test`
- [ ] Update CHANGELOG.md with version changes
- [ ] Commit all changes: `git add . && git commit -m "Release v1.0.0"`
- [ ] Tag release: `git tag v1.0.0`
- [ ] Push tag: `git push --tags`
- [ ] If using GitHub Actions, image builds automatically
- [ ] If manual: `make GITHUB_USERNAME=youruser VERSION=v1.0.0 release`
- [ ] Also push 'latest': `make GITHUB_USERNAME=youruser release`
- [ ] Make package public (first time only)
- [ ] Create GitHub release with changelog
- [ ] Test installation from fresh Ubuntu system

## Test Installation

After publishing, test that users can install:

```bash
# On a fresh Ubuntu system
git clone https://github.com/youruser/camp-snackbar-pos.git
cd camp-snackbar-pos
./install.sh
```

The script will automatically pull your published image from GHCR.

## Verify Image on GHCR

1. Go to https://github.com/YOUR_USERNAME?tab=packages
2. You should see `camp-snackbar-pos`
3. Click on it to see all versions
4. Verify tags: `latest`, `v1.0.0`, etc.

## Troubleshooting

### Permission Denied
```bash
# Make sure you're logged in
docker login ghcr.io

# Check your PAT has write:packages scope
```

### Image is Private
- Follow "Make Package Public" steps above

### Can't Pull Image
```bash
# Test pull manually
docker pull ghcr.io/youruser/camp-snackbar-pos:latest

# If error, check:
# 1. Package is public
# 2. Image name matches exactly
```

### GitHub Actions Fails
```bash
# Check workflow file syntax
# Verify GITHUB_TOKEN permissions in workflow

# View logs at:
# https://github.com/youruser/camp-snackbar-pos/actions
```

## Benefits of GHCR vs Docker Hub

| Feature | GHCR | Docker Hub (Free) |
|---------|------|------------------|
| Cost | Free | Free (with limits) |
| Public images | Unlimited | 1 repository |
| Pull rate limit | None | 100 pulls/6 hours |
| CI/CD integration | Native | Requires secrets |
| Authentication | GitHub PAT | Separate account |
| Package linking | Links to repo | Separate listing |

## Support Users

After publishing, users install with:

```bash
git clone https://github.com/youruser/camp-snackbar-pos.git
cd camp-snackbar-pos
./install.sh
```

The image URL will be: `ghcr.io/youruser/camp-snackbar-pos:latest`
