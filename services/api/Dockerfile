FROM golang:1.26-alpine AS builder

WORKDIR /src
RUN apk add --no-cache ca-certificates git
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/akeluwa-api ./cmd/api

FROM alpine:3.22
RUN apk add --no-cache ca-certificates tzdata && addgroup -S app && adduser -S -G app app
WORKDIR /app
COPY --from=builder /out/akeluwa-api /app/akeluwa-api
USER app
EXPOSE 8080
ENTRYPOINT ["/app/akeluwa-api"]
