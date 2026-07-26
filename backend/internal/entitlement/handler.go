package entitlement

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"

	"balanja/backend/internal/auth"
	"balanja/backend/internal/platform/apperror"
	"balanja/backend/internal/platform/database"
	"balanja/backend/internal/platform/respond"
	"github.com/gofiber/fiber/v3"
)

type Handler struct{ service *Service }

type EventInput struct {
	Name string `json:"name"`
}

func NewHandler(service *Service) *Handler { return &Handler{service: service} }

func (h *Handler) Register(group fiber.Router) {
	group.Get("/entitlement", h.get)
	group.Post("/entitlement/events", h.recordEvent)
}

func requestIdentity(c fiber.Ctx) (database.Identity, error) {
	identity, ok := auth.FromContext(c)
	if !ok {
		return database.Identity{}, apperror.New(http.StatusUnauthorized, "AUTH_REQUIRED", "authentication is required")
	}
	return database.Identity{OrgID: identity.OrgID, UserID: identity.UserID}, nil
}

func (h *Handler) get(c fiber.Ctx) error {
	identity, err := requestIdentity(c)
	if err != nil {
		return respond.Error(c, err)
	}
	summary, err := h.service.Get(c.Context(), identity)
	if err != nil {
		return respond.Error(c, err)
	}
	return c.JSON(fiber.Map{"data": summary})
}

func (h *Handler) recordEvent(c fiber.Ctx) error {
	identity, err := requestIdentity(c)
	if err != nil {
		return respond.Error(c, err)
	}
	var input EventInput
	decoder := json.NewDecoder(bytes.NewReader(c.Body()))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&input); err != nil {
		return respond.Error(c, apperror.New(http.StatusBadRequest, "INVALID_JSON", "request body is invalid"))
	}
	if err := h.service.RecordEvent(c.Context(), identity, input.Name); err != nil {
		if errors.Is(err, ErrInvalidEvent) {
			return respond.Error(c, apperror.New(http.StatusUnprocessableEntity, "INVALID_ENTITLEMENT_EVENT", "entitlement event is invalid"))
		}
		return respond.Error(c, err)
	}
	return c.Status(http.StatusCreated).JSON(fiber.Map{"data": fiber.Map{"name": input.Name}})
}
