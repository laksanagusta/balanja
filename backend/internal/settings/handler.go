package settings

import (
	"balanja/backend/internal/auth"
	"balanja/backend/internal/platform/apperror"
	"balanja/backend/internal/platform/database"
	"balanja/backend/internal/platform/respond"
	"bytes"
	"encoding/json"
	"errors"
	"github.com/gofiber/fiber/v3"
)

type Handler struct{ service *Service }

func NewHandler(s *Service) *Handler       { return &Handler{service: s} }
func (h *Handler) Register(g fiber.Router) { g.Get("/settings", h.get); g.Put("/settings", h.update) }
func settingsIdentity(c fiber.Ctx) (database.Identity, error) {
	id, ok := auth.FromContext(c)
	if !ok {
		return database.Identity{}, apperror.New(401, "AUTH_REQUIRED", "authentication is required")
	}
	return database.Identity{OrgID: id.OrgID, UserID: id.UserID}, nil
}
func (h *Handler) get(c fiber.Ctx) error {
	id, err := settingsIdentity(c)
	if err != nil {
		return respond.Error(c, err)
	}
	value, err := h.service.Get(c.Context(), id)
	if err != nil {
		return respond.Error(c, err)
	}
	return c.JSON(fiber.Map{"data": value})
}
func (h *Handler) update(c fiber.Ctx) error {
	id, err := settingsIdentity(c)
	if err != nil {
		return respond.Error(c, err)
	}
	var input UpdateInput
	decoder := json.NewDecoder(bytes.NewReader(c.Body()))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&input); err != nil {
		return respond.Error(c, apperror.New(400, "INVALID_JSON", "request body is invalid"))
	}
	value, err := h.service.Update(c.Context(), id, input)
	if errors.Is(err, ErrInvalidSettings) {
		return respond.Error(c, apperror.New(422, "INVALID_SETTINGS", "settings are invalid"))
	}
	if err != nil {
		return respond.Error(c, err)
	}
	return c.JSON(fiber.Map{"data": value})
}
