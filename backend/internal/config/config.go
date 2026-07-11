package config

import (
	"fmt"
	"strconv"
	"strings"
	"time"
)

const (
	defaultPort            = "8080"
	defaultDBMaxConns      = int32(10)
	defaultShutdownTimeout = 10 * time.Second
)

type Config struct {
	Port            string
	DatabaseURL     string
	ClerkIssuerURL  string
	ClerkAudience   string
	AllowedOrigins  []string
	DBMaxConns      int32
	ShutdownTimeout time.Duration
}

func Load(getenv func(string) string) (Config, error) {
	config := Config{
		Port:            valueOrDefault(getenv("PORT"), defaultPort),
		DatabaseURL:     strings.TrimSpace(getenv("DATABASE_URL")),
		ClerkIssuerURL:  strings.TrimSpace(getenv("CLERK_ISSUER_URL")),
		ClerkAudience:   strings.TrimSpace(getenv("CLERK_AUDIENCE")),
		AllowedOrigins:  splitCSV(getenv("ALLOWED_ORIGINS")),
		DBMaxConns:      defaultDBMaxConns,
		ShutdownTimeout: defaultShutdownTimeout,
	}

	for key, value := range map[string]string{
		"DATABASE_URL":     config.DatabaseURL,
		"CLERK_ISSUER_URL": config.ClerkIssuerURL,
		"CLERK_AUDIENCE":   config.ClerkAudience,
	} {
		if value == "" {
			return Config{}, fmt.Errorf("%s is required", key)
		}
	}

	if raw := strings.TrimSpace(getenv("DB_MAX_CONNS")); raw != "" {
		parsed, err := strconv.ParseInt(raw, 10, 32)
		if err != nil || parsed < 1 {
			return Config{}, fmt.Errorf("DB_MAX_CONNS must be a positive integer")
		}
		config.DBMaxConns = int32(parsed)
	}

	if raw := strings.TrimSpace(getenv("SHUTDOWN_TIMEOUT")); raw != "" {
		parsed, err := time.ParseDuration(raw)
		if err != nil || parsed <= 0 {
			return Config{}, fmt.Errorf("SHUTDOWN_TIMEOUT must be a positive duration")
		}
		config.ShutdownTimeout = parsed
	}

	return config, nil
}

func valueOrDefault(value, fallback string) string {
	if trimmed := strings.TrimSpace(value); trimmed != "" {
		return trimmed
	}
	return fallback
}

func splitCSV(value string) []string {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	parts := strings.Split(value, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}
