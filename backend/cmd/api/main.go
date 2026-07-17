package main

import (
	"context"
	"errors"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"balanja/backend/internal/auth"
	"balanja/backend/internal/checkout"
	"balanja/backend/internal/config"
	"balanja/backend/internal/dashboard"
	"balanja/backend/internal/platform/database"
	"balanja/backend/internal/platform/httpserver"
	"balanja/backend/internal/platform/objectstore"
	"balanja/backend/internal/product"
	"balanja/backend/internal/report"
	"balanja/backend/internal/settings"
	"balanja/backend/internal/stock"
	"balanja/backend/internal/transaction"
	"github.com/gofiber/fiber/v3"
)

func main() {
	if err := run(); err != nil {
		slog.Error("api stopped", "error", err)
		os.Exit(1)
	}
}

func run() error {
	if err := config.LoadEnvFile(".env"); err != nil {
		return err
	}

	cfg, err := config.Load(os.Getenv)
	if err != nil {
		return err
	}

	pool, err := database.NewPool(context.Background(), cfg.DatabaseURL, cfg.DBMaxConns)
	if err != nil {
		return err
	}
	defer pool.Close()

	verifierContext, cancelVerifier := context.WithCancel(context.Background())
	defer cancelVerifier()
	verifier, err := auth.NewClerkVerifier(verifierContext, cfg.ClerkIssuerURL, cfg.ClerkAudience)
	if err != nil {
		return err
	}

	runner := database.Runner{DB: pool}
	var imageStore objectstore.Store
	if cfg.R2.Enabled {
		imageStore, err = objectstore.NewR2(context.Background(), objectstore.Config{
			Endpoint: cfg.R2.Endpoint, AccessKeyID: cfg.R2.AccessKeyID, SecretAccessKey: cfg.R2.SecretAccessKey,
			Bucket: cfg.R2.Bucket, PublicBaseURL: cfg.R2.PublicBaseURL,
		})
		if err != nil {
			return err
		}
	}
	productHandler := product.NewHandler(product.NewService(runner, product.PostgresRepository{}, product.WithImageStore(imageStore), product.WithLogger(slog.Default())))
	settingsHandler := settings.NewHandler(settings.NewService(runner, settings.PostgresRepository{}))
	transactionHandler := transaction.NewHandler(transaction.NewService(runner, transaction.PostgresRepository{}))
	dashboardHandler := dashboard.NewHandler(dashboard.NewService(runner, dashboard.PostgresRepository{}))
	checkoutHandler := checkout.NewHandler(checkout.NewService(runner, checkout.PostgresRepository{}))
	stockHandler := stock.NewHandler(stock.NewService(runner, stock.PostgresRepository{}))
	reportHandler := report.NewHandler(report.NewService(runner, report.PostgresRepository{}))
	app := httpserver.New(httpserver.Dependencies{
		Ready:          pool.Ping,
		Auth:           auth.Middleware(verifier),
		AllowedOrigins: cfg.AllowedOrigins,
		Routes: func(router fiber.Router) {
			productHandler.Register(router)
			settingsHandler.Register(router)
			transactionHandler.Register(router)
			dashboardHandler.Register(router)
			checkoutHandler.Register(router)
			stockHandler.Register(router)
			reportHandler.Register(router)
		},
	})
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
