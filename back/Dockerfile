# Multi-stage build for Go Lambda function
# Stage 1: Build stage - Use minimal builder
FROM golang:1.24-alpine AS builder

# Install only essential packages for building
RUN apk add --no-cache ca-certificates

# Set working directory
WORKDIR /app

# Copy go mod files first for better caching
COPY go.mod go.sum ./

# Download dependencies with module proxy for faster builds
RUN go mod download

# Copy source code
COPY . .

# Build the application with maximum optimization
# CGO_ENABLED=0 for static binary
# GOOS=linux for Linux target
# -ldflags="-w -s" to strip debug info and reduce size
# -trimpath to remove file system paths from binary
RUN CGO_ENABLED=0 GOOS=linux go build \
    -a -installsuffix cgo \
    -ldflags="-w -s -extldflags '-static'" \
    -trimpath \
    -o main ./cmd/lambda/

# Stage 2: Use minimal Lambda runtime
FROM public.ecr.aws/lambda/provided:al2-x86_64

# Copy the binary as 'bootstrap' (required by Lambda custom runtime)
COPY --from=builder /app/main ${LAMBDA_RUNTIME_DIR}/bootstrap

# Copy only essential CA certificates
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/