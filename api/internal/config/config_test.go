package config

import (
	"log/slog"
	"testing"
	"time"
)

func env(values map[string]string) func(string) string {
	return func(k string) string { return values[k] }
}

func TestDefaults(t *testing.T) {
	c, err := Load(env(nil))
	if err != nil {
		t.Fatal(err)
	}
	if c.Addr != ":8080" || c.Env != "local" || c.Version != "dev" ||
		c.LogLevel != slog.LevelInfo || c.ShutdownTimeout != 10*time.Second ||
		c.DatabasePath != "huevalue.db" || c.DataDir != "../data" {
		t.Errorf("defaults %+v", c)
	}
}

func TestFromEnvironment(t *testing.T) {
	c, err := Load(env(map[string]string{
		"PORT": "9000", "APP_ENV": "staging", "APP_VERSION": "v1.2.0",
		"LOG_LEVEL": "debug", "SHUTDOWN_TIMEOUT": "3s",
		"DATABASE_PATH": "/data/huevalue.db", "DATA_DIR": "/app/data",
	}))
	if err != nil {
		t.Fatal(err)
	}
	if c.Addr != ":9000" || c.Env != "staging" || c.Version != "v1.2.0" ||
		c.LogLevel != slog.LevelDebug || c.ShutdownTimeout != 3*time.Second ||
		c.DatabasePath != "/data/huevalue.db" || c.DataDir != "/app/data" {
		t.Errorf("config %+v", c)
	}
}

func TestRejectsBadValues(t *testing.T) {
	for _, bad := range []map[string]string{
		{"APP_ENV": "prod"},
		{"PORT": "eighty"},
		{"PORT": "70000"},
		{"LOG_LEVEL": "loud"},
		{"SHUTDOWN_TIMEOUT": "soon"},
		{"SHUTDOWN_TIMEOUT": "-1s"},
	} {
		if _, err := Load(env(bad)); err == nil {
			t.Errorf("%v: no error", bad)
		}
	}
}
