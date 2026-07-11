package auth

import "github.com/gofiber/fiber/v3"

type Identity struct {
	UserID string
	OrgID  string
}

type identityContextKey struct{}

func FromContext(c fiber.Ctx) (Identity, bool) {
	return fiber.ValueFromContext[Identity](c, identityContextKey{})
}
