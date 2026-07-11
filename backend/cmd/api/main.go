package main

import (
	"context"
	"errors"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"balanja/backend/internal/config"
	"balanja/backend/internal/platform/database"
	"balanja/backend/internal/platform/httpserver"
)

func main() {
	if err := run(); err != nil {
		slog.Error("api stopped", "error", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load(os.Getenv)
	if err != nil {
		return err
	}

	pool, err := database.NewPool(context.Background(), cfg.DatabaseURL, cfg.DBMaxConns)
	if err != nil {
		return err
	}
	defer pool.Close()

	app := httpserver.New(httpserver.Dependencies{Ready: pool.Ping})
	listenErrors := make(chan error, 1)
	go func() {
		listenErrors <- app.Listen(":" + cfg.Port)
	}()

	signalContext, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	select {
	case err := <-listenErrors:
		return err
	case <-signalContext.Done():
		if err := app.ShutdownWithTimeout(cfg.ShutdownTimeout); err != nil {
			return err
		}
		if err := <-listenErrors; err != nil && !errors.Is(err, context.Canceled) {
			return err
		}
		return nil
	}
}
