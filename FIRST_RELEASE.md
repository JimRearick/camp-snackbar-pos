# Creating Your First Release

Follow these steps to publish your Docker image to GitHub Container Registry.

## Step 1: Add GitHub Actions Workflow (One-Time Setup)

Since your Personal Access Token doesn't have `workflow` scope, add the workflow via GitHub web interface:

1. Go to https://github.com/JimRearick/camp-snackbar-pos
2. Click "Add file" → "Create new file"
3. Name it: `.github/workflows/publish-image.yml`
4. Paste this content:

```yaml
name: Publish Docker Image

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:  # Allow manual trigger from Actions tab

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

      - name: Extract metadata (tags, labels)
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

      - name: Image published
        run: |
          echo "✅ Docker image published successfully!"
          echo "📦 Image: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}"
          echo "🏷️  Tags: ${{ steps.meta.outputs.tags }}"
```

5. Click "Commit changes"

## Step 2: Create and Push Your First Tag

Back in your local repository:

```bash
# Make sure everything is pushed
git pull

# Create a version tag
git tag v1.0.0

# Push the tag to trigger the workflow
git push origin v1.0.0
```

## Step 3: Watch the Build

1. Go to https://github.com/JimRearick/camp-snackbar-pos/actions
2. You'll see "Publish Docker Image" running
3. Wait for it to complete (usually 2-5 minutes)
4. ✅ When done, your image is published!

## Step 4: Make Package Public

By default, packages are private. Make it public:

1. Go to https://github.com/JimRearick?tab=packages
2. Click "camp-snackbar-pos"
3. Click "Package settings" (bottom right)
4. Scroll to "Danger Zone"
5. Click "Change visibility" → "Public"
6. Type the package name to confirm
7. Click "I understand, change package visibility"

## Step 5: Test Installation

On a fresh Ubuntu system (or VM):

```bash
git clone https://github.com/JimRearick/camp-snackbar-pos.git
cd camp-snackbar-pos
chmod +x install.sh
./install.sh
```

This will:
- Pull your published image from `ghcr.io/jimrearick/camp-snackbar-pos:latest`
- Create the database
- Start the application

Access at `http://localhost` or `http://YOUR_SERVER_IP`

## Future Releases

For future releases, just create and push a tag:

```bash
# Update version
git tag v1.0.1
git push origin v1.0.1

# GitHub Actions automatically builds and publishes!
```

Version tags will create these images:
- `v1.0.1` → `ghcr.io/jimrearick/camp-snackbar-pos:v1.0.1`
- Also updates: `ghcr.io/jimrearick/camp-snackbar-pos:v1.0`
- Also updates: `ghcr.io/jimrearick/camp-snackbar-pos:v1`
- Also updates: `ghcr.io/jimrearick/camp-snackbar-pos:latest`

## Troubleshooting

### Workflow didn't run
- Check https://github.com/JimRearick/camp-snackbar-pos/actions
- Make sure you pushed the tag: `git push origin v1.0.0`

### Build failed
- Click on the failed workflow to see logs
- Common issues: Dockerfile syntax error, missing files

### Can't pull image
- Make sure package is public (Step 4)
- Verify image exists: https://github.com/JimRearick?tab=packages

### Permission denied
- The workflow uses `GITHUB_TOKEN` automatically
- No manual login needed!

## Manual Publishing (Alternative)

If you prefer manual control:

```bash
# Login to GHCR
make login
# Username: JimRearick
# Password: [your GitHub PAT with write:packages scope]

# Build and push
make release

# Or with specific version
make VERSION=v1.0.0 release
```

## Summary

Once the workflow is added:
1. Tag a release: `git tag v1.0.0 && git push origin v1.0.0`
2. GitHub Actions builds automatically
3. Image published to GHCR
4. Users install with `./install.sh`

That's it! Fully automated. 🎉
