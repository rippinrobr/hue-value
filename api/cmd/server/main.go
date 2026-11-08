// Command server runs the Hue & Value API.
//
//	server        serve the API
//	server seed   load the catalog from the seed files in DATA_DIR into the database
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/rippinrobr/hue-value/api/internal/catalog"
	"github.com/rippinrobr/hue-value/api/internal/config"
	"github.com/rippinrobr/hue-value/api/internal/server"
	"github.com/rippinrobr/hue-value/api/internal/store"
)

func main() {
	if err := run(os.Args[1:]); err != nil {
		slog.Error("stopped", "error", err)
		os.Exit(1)
	}
}

func run(args []string) error {
	cfg, err := config.FromEnv()
	if err != nil {
		return err
	}
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: cfg.LogLevel}))
	slog.SetDefault(log)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	db, err := store.Open(ctx, cfg.DatabasePath)
	if err != nil {
		return err
	}
	defer db.Close()

	switch {
	case len(args) == 0:
		return serve(ctx, cfg, log, db)
	case len(args) == 1 && args[0] == "seed":
		return seed(ctx, cfg, log, db)
	default:
		return fmt.Errorf("unknown command %q: use no command to serve, or `seed`", args)
	}
}

func seed(ctx context.Context, cfg config.Config, log *slog.Logger, db *store.Store) error {
	cat, err := catalog.Load(cfg.DataDir)
	if err != nil {
		return fmt.Errorf("read %s: %w", cfg.DataDir, err)
	}
	if err := db.SeedCatalog(ctx, cat); err != nil {
		return err
	}
	log.Info("seeded the catalog", "brands", len(cat.Brands), "lines", len(cat.Lines),
		"items", len(cat.Items), "pigments", len(cat.Pigments))
	return nil
}

func serve(ctx context.Context, cfg config.Config, log *slog.Logger, db *store.Store) error {
	cat, err := db.LoadCatalog(ctx)
	if err != nil {
		return err
	}
	srv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           server.New(cfg, log, cat),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	failed := make(chan error, 1)
	go func() {
		log.Info("listening", "addr", cfg.Addr, "env", cfg.Env, "version", cfg.Version,
			"items", len(cat.Items))
		if err := srv.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
			failed <- err
		}
	}()

	select {
	case err := <-failed:
		return err
	case <-ctx.Done():
	}
	// Fly.io sends SIGTERM before replacing a machine, so open requests get to finish.
	log.Info("shutting down")
	shutdown, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer cancel()
	return srv.Shutdown(shutdown)
}
