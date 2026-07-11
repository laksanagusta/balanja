package auth

import (
	"context"
	"net/http"
	"strings"

	"balanja/backend/internal/platform/apperror"
	"balanja/backend/internal/platform/respond"
	"github.com/gofiber/fiber/v3"
)

type Verifier interface {
	Verify(context.Context, string) (Identity, error)
}

func Middleware(verifier Verifier) fiber.Handler {
	return func(c fiber.Ctx) error {
		header := strings.TrimSpace(c.Get(fiber.HeaderAuthorization))
		if header == "" {
			return respond.Error(c, apperror.New(http.StatusUnauthorized, "AUTH_REQUIRED", "authentication is required"))
		}
		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") || strings.TrimSpace(parts[1]) == "" {
			return respond.Error(c, apperror.New(http.StatusUnauthorized, "AUTH_INVALID", "authentication token is invalid"))
		}

		identity, err := verifier.Verify(c.Context(), strings.TrimSpace(parts[1]))
		if err != nil || identity.UserID == "" {
			return respond.Error(c, apperror.New(http.StatusUnauthorized, "AUTH_INVALID", "authentication token is invalid"))
		}
		if identity.OrgID == "" {
			return respond.Error(c, apperror.New(http.StatusForbidden, "ORGANIZATION_REQUIRED", "an active organization is required"))
		}
		fiber.StoreInContext(c, identityContextKey{}, identity)
		return c.Next()
	}
}
