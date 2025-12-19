#!/usr/bin/env bash
set -e

# Get latest v* tag (sorted by version)
LATEST_TAG=$(git tag -l "v*" --sort=-v:refname | head -n 1)

echo "🔍 Checking git status..."
git status

echo
if [[ -n "$LATEST_TAG" ]]; then
  echo "📌 Latest version tag: $LATEST_TAG"

  # Strip leading v and split version
  VERSION=${LATEST_TAG#v}
  IFS='.' read -r MAJOR MINOR PATCH <<< "$VERSION"

  # Default to patch bump
  if [[ -n "$PATCH" ]]; then
    SUGGESTED_TAG="v$MAJOR.$MINOR.$((PATCH + 1))"
    echo "➡️  Suggested next version: $SUGGESTED_TAG"

    read -p "Use suggested version? [Y/n]: " USE_SUGGESTED
    USE_SUGGESTED=${USE_SUGGESTED:-Y}

    if [[ "$USE_SUGGESTED" =~ ^[Yy]$ ]]; then
      TAG="$SUGGESTED_TAG"
    fi
  fi
else
  echo "📌 No existing version tags found"
fi

# If not using suggested, ask manually
if [[ -z "$TAG" ]]; then
  echo
  read -p "Version tag (optional, e.g. v1.2.3 — press Enter to skip): " TAG
fi

echo
read -p "Commit message: " COMMIT_MSG
if [[ -z "$COMMIT_MSG" ]]; then
  echo "❌ Commit message cannot be empty"
  exit 1
fi

echo
echo "📦 Staging changes..."
git add .

echo "📝 Creating commit..."
git commit -m "$COMMIT_MSG"

# Only create and push tag if provided
if [[ -n "$TAG" ]]; then
  if [[ ! "$TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "❌ Tag must match vX.Y.Z (example: v1.2.3)"
    exit 1
  fi

  echo "🏷️  Creating tag $TAG..."
  git tag "$TAG"

  echo "🚀 Pushing commit and tag..."
  git push
  git push origin "$TAG"

  echo "✅ Done! Pushed commit and tag $TAG"
else
  echo "🚀 Pushing commit (no tag)..."
  git push
  echo "✅ Done! Commit pushed without tag"
fi
