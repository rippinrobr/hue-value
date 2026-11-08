# The API's image. Build from the repo root, so data/ is in reach:
#   docker build -f api/Dockerfile -t hue-value-api .
FROM golang:1.24-alpine AS build
WORKDIR /src/api
COPY api/go.mod api/go.sum ./
RUN go mod download
COPY api/ ./
ARG VERSION=dev
# SQLite is pure Go here, so the binary needs no C library.
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server

FROM litestream/litestream:0.3.13 AS litestream

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata
COPY --from=litestream /usr/local/bin/litestream /usr/local/bin/litestream
COPY --from=build /out/server /app/server
COPY data/ /app/data/
COPY api/litestream.yml /etc/litestream.yml
COPY api/start.sh /app/start.sh
ARG VERSION=dev
ENV APP_VERSION=$VERSION \
    DATA_DIR=/app/data \
    DATABASE_PATH=/data/huevalue.db \
    PORT=8080
EXPOSE 8080
ENTRYPOINT ["/app/start.sh"]
