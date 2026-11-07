// Package config reads the server's settings from environment variables, so the same build
// runs locally, on staging and in production.
package config

import (
	"fmt"
	"log/slog"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config holds everything the server needs to start.
type Config struct {
	// Addr is where the server listens, such as ":8080".
	Addr string
	// Env names the environment: "local", "staging" or "production".
	Env string
	// Version is the build's version, reported by the health check.
	Version string
	// LogLevel is the lowest level of log line written.
	LogLevel slog.Level
	// ShutdownTimeout is how long open requests get to finish when the server stops.
	ShutdownTimeout time.Duration
}

// Load reads the configuration. getenv is os.Getenv outside of tests.
func Load(getenv func(string) string) (Config, error) {
	c := Config{
		Addr:            ":" + or(getenv("PORT"), "8080"),
		Env:             or(getenv("APP_ENV"), "local"),
		Version:         or(getenv("APP_VERSION"), "dev"),
		LogLevel:        slog.LevelInfo,
		ShutdownTimeout: 10 * time.Second,
	}
	switch c.Env {
	case "local", "staging", "production":
	default:
		return c, fmt.Errorf("APP_ENV must be local, staging or production, not %q", c.Env)
	}
	if v := getenv("LOG_LEVEL"); v != "" {
		if err := c.LogLevel.UnmarshalText([]byte(strings.ToUpper(v))); err != nil {
			return c, fmt.Errorf("LOG_LEVEL: %w", err)
		}
	}
	if v := getenv("SHUTDOWN_TIMEOUT"); v != "" {
		d, err := time.ParseDuration(v)
		if err != nil || d <= 0 {
			return c, fmt.Errorf("SHUTDOWN_TIMEOUT must be a duration such as 10s, not %q", v)
		}
		c.ShutdownTimeout = d
	}
	if p := strings.TrimPrefix(c.Addr, ":"); p != "" {
		if n, err := strconv.Atoi(p); err != nil || n < 1 || n > 65535 {
			return c, fmt.Errorf("PORT must be a number from 1 to 65535, not %q", p)
		}
	}
	return c, nil
}

// FromEnv loads the configuration from the process environment.
func FromEnv() (Config, error) { return Load(os.Getenv) }

func or(v, fallback string) string {
	if v == "" {
		return fallback
	}
	return v
}
