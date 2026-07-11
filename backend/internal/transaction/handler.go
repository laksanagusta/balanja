package transaction

import (
	"balanja/backend/internal/auth"
	"balanja/backend/internal/platform/apperror"
	"balanja/backend/internal/platform/database"
	"balanja/backend/internal/platform/respond"
	"errors"
	"github.com/gofiber/fiber/v3"
	"strconv"
)

type Handler struct{ service *Service }

func NewHandler(s *Service) *Handler       { return &Handler{service: s} }
func (h *Handler) Register(g fiber.Router) { g.Get("/transactions", h.list) }
func (h *Handler) list(c fiber.Ctx) error {
	identity, ok := auth.FromContext(c)
	if !ok {
		return respond.Error(c, apperror.New(401, "AUTH_REQUIRED", "authentication is required"))
	}
	limit, _ := strconv.Atoi(c.Query("limit"))
	page, err := h.service.List(c.Context(), database.Identity{OrgID: identity.OrgID, UserID: identity.UserID}, c.Query("cursor"), limit)
	if errors.Is(err, ErrInvalidCursor) {
		return respond.Error(c, apperror.New(400, "INVALID_CURSOR", "transaction cursor is invalid"))
	}
	if err != nil {
		return respond.Error(c, err)
	}
	return c.JSON(fiber.Map{"data": page.Items, "meta": fiber.Map{"nextCursor": page.NextCursor}})
}
