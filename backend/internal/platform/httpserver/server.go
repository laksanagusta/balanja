package httpserver

import (
	"context"
	"net/http"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/recover"
	"github.com/gofiber/fiber/v3/middleware/requestid"
)

type Dependencies struct {
	Ready          func(context.Context) error
	Auth           fiber.Handler
	Routes         func(fiber.Router)
	AllowedOrigins []string
}

func New(dependencies Dependencies) *fiber.App {
	app := fiber.New(fiber.Config{
		AppName: "Balanja API",
	})
	app.Use(recover.New())
	app.Use(requestid.New())
	if len(dependencies.AllowedOrigins) > 0 {
		app.Use(cors.New(cors.Config{
			AllowOrigins: dependencies.AllowedOrigins,
			AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodOptions},
			AllowHeaders: []string{fiber.HeaderAuthorization, fiber.HeaderContentType, "Idempotency-Key"},
		}))
	}

	app.Get("/healthz", func(c fiber.Ctx) error {
		return c.Status(http.StatusOK).JSON(fiber.Map{"data": fiber.Map{"status": "ok"}})
	})
	app.Get("/readyz", func(c fiber.Ctx) error {
		if dependencies.Ready != nil {
			if err := dependencies.Ready(c.Context()); err != nil {
				return c.Status(http.StatusServiceUnavailable).JSON(fiber.Map{
					"error": fiber.Map{"code": "NOT_READY", "message": "service is not ready"},
				})
			}
		}
		return c.Status(http.StatusOK).JSON(fiber.Map{"data": fiber.Map{"status": "ready"}})
	})

	if dependencies.Auth != nil {
		api := app.Group("/api/v1", dependencies.Auth)
		api.Get("/identity", func(c fiber.Ctx) error {
			return c.Status(http.StatusOK).JSON(fiber.Map{"data": fiber.Map{"authenticated": true}})
		})
		if dependencies.Routes != nil {
			dependencies.Routes(api)
		}
	}

	return app
}
