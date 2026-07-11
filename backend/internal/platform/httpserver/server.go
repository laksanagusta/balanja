package httpserver

import (
	"context"
	"net/http"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/recover"
	"github.com/gofiber/fiber/v3/middleware/requestid"
)

type Dependencies struct {
	Ready func(context.Context) error
	Auth  fiber.Handler
}

func New(dependencies Dependencies) *fiber.App {
	app := fiber.New(fiber.Config{
		AppName: "Balanja API",
	})
	app.Use(recover.New())
	app.Use(requestid.New())

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
	}

	return app
}
