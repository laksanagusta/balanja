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
	R2              R2Config
}

type R2Config struct {
	Enabled         bool
	Endpoint        string
	AccessKeyID     string
	SecretAccessKey string
	Bucket          string
	PublicBaseURL   string
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
		R2: R2Config{
			Endpoint:        strings.TrimSpace(getenv("R2_ENDPOINT")),
			AccessKeyID:     strings.TrimSpace(getenv("R2_ACCESS_KEY_ID")),
			SecretAccessKey: strings.TrimSpace(getenv("R2_SECRET_ACCESS_KEY")),
			Bucket:          strings.TrimSpace(getenv("R2_BUCKET")),
			PublicBaseURL:   strings.TrimRight(strings.TrimSpace(getenv("R2_PUBLIC_BASE_URL")), "/"),
		},
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

	if raw := strings.TrimSpace(getenv("R2_ENABLED")); raw != "" {
		parsed, err := strconv.ParseBool(raw)
		if err != nil {
			return Config{}, fmt.Errorf("R2_ENABLED must be a boolean")
		}
		config.R2.Enabled = parsed
	}
	if config.R2.Enabled {
		required := []struct {
			key   string
			value string
		}{
			{key: "R2_ENDPOINT", value: config.R2.Endpoint},
			{key: "R2_ACCESS_KEY_ID", value: config.R2.AccessKeyID},
			{key: "R2_SECRET_ACCESS_KEY", value: config.R2.SecretAccessKey},
			{key: "R2_BUCKET", value: config.R2.Bucket},
			{key: "R2_PUBLIC_BASE_URL", value: config.R2.PublicBaseURL},
		}
		for _, item := range required {
			if item.value == "" {
				return Config{}, fmt.Errorf("%s is required when R2_ENABLED is true", item.key)
			}
		}
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
