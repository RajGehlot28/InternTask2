# Build stage - Go backend
FROM golang:1.21-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ .
RUN go build -o server .

# Frontend build stage
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Final stage
FROM alpine:3.18
RUN apk --no-cache add ca-certificates
WORKDIR /app

# Copy backend binary
COPY --from=backend-builder /app/backend/server .

# Copy frontend dist (serve as static files through a reverse proxy or separate step)
COPY --from=frontend-builder /app/frontend/dist ./static

EXPOSE 8080
ENV PORT=8080

CMD ["./server"]
