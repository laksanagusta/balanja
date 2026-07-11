package respond

import (
	"errors"
	"net/http"

	"balanja/backend/internal/platform/apperror"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/requestid"
)

func Error(c fiber.Ctx, err error) error {
	public := &apperror.Error{}
	if !errors.As(err, &public) {
		public = apperror.New(http.StatusInternalServerError, "INTERNAL_ERROR", "internal server error")
	}
	return c.Status(public.Status).JSON(fiber.Map{
		"error": fiber.Map{
			"code":      public.Code,
			"message":   public.Message,
			"requestId": requestid.FromContext(c),
		},
	})
}
