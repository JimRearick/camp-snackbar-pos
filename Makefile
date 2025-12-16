# Camp Snackbar POS - Makefile
# For maintainers: Build and publish Docker images

# Configuration
DOCKER_USERNAME ?= yourname
IMAGE_NAME = camp-snackbar-pos
VERSION ?= latest
FULL_IMAGE = $(DOCKER_USERNAME)/$(IMAGE_NAME):$(VERSION)

.PHONY: help build push release test clean

help:
	@echo "Camp Snackbar POS - Docker Image Management"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  build       Build Docker image locally"
	@echo "  push        Push image to Docker Hub (requires login)"
	@echo "  release     Build and push image"
	@echo "  test        Test the built image locally"
	@echo "  clean       Remove local images and containers"
	@echo ""
	@echo "Environment Variables:"
	@echo "  DOCKER_USERNAME  Your Docker Hub username (default: yourname)"
	@echo "  VERSION          Image version tag (default: latest)"
	@echo ""
	@echo "Examples:"
	@echo "  make build"
	@echo "  make DOCKER_USERNAME=myuser VERSION=v1.0.0 release"

build:
	@echo "Building Docker image: $(FULL_IMAGE)"
	docker build -t $(FULL_IMAGE) .
	@echo "✓ Build complete: $(FULL_IMAGE)"

push:
	@echo "Pushing to Docker Hub: $(FULL_IMAGE)"
	docker push $(FULL_IMAGE)
	@echo "✓ Push complete: $(FULL_IMAGE)"

release: build push
	@echo "✓ Released: $(FULL_IMAGE)"

test:
	@echo "Testing image: $(FULL_IMAGE)"
	@echo "Starting test container..."
	docker run -d --name camp-snackbar-test \
		-p 8080:80 \
		-e SECRET_KEY=test-secret-key \
		$(FULL_IMAGE)
	@echo ""
	@echo "Test container running at: http://localhost:8080"
	@echo ""
	@echo "To stop test container:"
	@echo "  docker stop camp-snackbar-test"
	@echo "  docker rm camp-snackbar-test"

clean:
	@echo "Cleaning up..."
	-docker stop camp-snackbar-test 2>/dev/null || true
	-docker rm camp-snackbar-test 2>/dev/null || true
	-docker rmi $(FULL_IMAGE) 2>/dev/null || true
	@echo "✓ Cleanup complete"

login:
	@echo "Logging in to Docker Hub..."
	docker login
	@echo "✓ Login complete"
