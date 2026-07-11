package checkout

import (
	"balanja/backend/internal/auth"
	"balanja/backend/internal/platform/apperror"
	"balanja/backend/internal/platform/database"
	"balanja/backend/internal/platform/respond"
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/limiter"
)

type Handler struct{ service *Service }

func NewHandler(s *Service) *Handler { return &Handler{service: s} }
func (h *Handler) Register(g fiber.Router) {
	g.Post("/checkouts", limiter.New(limiter.Config{Max: 30, Expiration: time.Minute}), h.checkout)
}
func (h *Handler) checkout(c fiber.Ctx) error {
	id, ok := auth.FromContext(c)
	if !ok {
		return respond.Error(c, apperror.New(401, "AUTH_REQUIRED", "authentication is required"))
	}
	var input Input
	decoder := json.NewDecoder(bytes.NewReader(c.Body()))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&input); err != nil {
		return respond.Error(c, apperror.New(400, "INVALID_JSON", "request body is invalid"))
	}
	result, err := h.service.Checkout(c.Context(), database.Identity{OrgID: id.OrgID, UserID: id.UserID}, c.Get("Idempotency-Key"), input)
	if err != nil {
		return checkoutError(c, err)
	}
	status := http.StatusCreated
	if result.Replay {
		status = http.StatusOK
	}
	return c.Status(status).JSON(fiber.Map{"data": result})
}
func checkoutError(c fiber.Ctx, err error) error {
	mappings := []struct {
		target        error
		status        int
		code, message string
	}{{ErrInvalidCheckout, 422, "INVALID_CHECKOUT", "checkout request is invalid"}, {ErrIdempotencyKeyReused, 409, "IDEMPOTENCY_KEY_REUSED", "idempotency key was used for another request"}, {ErrProductNotFound, 404, "PRODUCT_NOT_FOUND", "a product was not found"}, {ErrProductInactive, 409, "PRODUCT_INACTIVE", "a product is unavailable"}, {ErrInsufficientStock, 409, "INSUFFICIENT_STOCK", "product stock is insufficient"}, {ErrInsufficientCash, 422, "INSUFFICIENT_CASH", "cash received is less than total"}}
	for _, m := range mappings {
		if errors.Is(err, m.target) {
			return respond.Error(c, apperror.New(m.status, m.code, m.message))
		}
	}
	return respond.Error(c, err)
}
