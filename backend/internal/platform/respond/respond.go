package respond

import (
	"errors"
	"log/slog"
	"net/http"

	"balanja/backend/internal/platform/apperror"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/requestid"
)

func Error(c fiber.Ctx, err error) error {
	requestID := requestid.FromContext(c)
	public := &apperror.Error{}
	if !errors.As(err, &public) {
		slog.Error("request failed",
			"request_id", requestID,
			"method", c.Method(),
			"path", c.Path(),
			"error", err,
		)
		public = apperror.New(http.StatusInternalServerError, "INTERNAL_ERROR", "internal server error")
	} else if public.Status >= http.StatusInternalServerError {
		slog.Error("request failed",
			"request_id", requestID,
			"method", c.Method(),
			"path", c.Path(),
			"code", public.Code,
			"error", err,
		)
	}
	return c.Status(public.Status).JSON(fiber.Map{
		"error": fiber.Map{
			"code":      public.Code,
			"message":   public.Message,
			"requestId": requestID,
		},
	})
}
