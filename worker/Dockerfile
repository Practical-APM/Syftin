FROM golang:1.22-bookworm AS builder

WORKDIR /app
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /syftin-worker ./cmd/worker

FROM mcr.microsoft.com/playwright:v1.49.0-jammy

WORKDIR /app
COPY --from=builder /syftin-worker /usr/local/bin/syftin-worker

# Install Ollama in runtime image is optional — typically run Ollama on host network
ENV SYFTIN_ENV=production
ENV FETCH_MODE=auto
ENV POLL_INTERVAL=10s

CMD ["syftin-worker"]
