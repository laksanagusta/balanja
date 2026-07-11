FROM golang:1.25.0-alpine3.22 AS build
WORKDIR /src/backend
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api

FROM alpine:3.22
RUN apk add --no-cache ca-certificates && adduser -D -H -u 10001 balanja
COPY --from=build /out/api /usr/local/bin/api
USER balanja
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/api"]
