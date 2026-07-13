package transaction

import (
	"balanja/backend/internal/auth"
	"balanja/backend/internal/platform/apperror"
	"balanja/backend/internal/platform/database"
	"balanja/backend/internal/platform/respond"
	"errors"
	"github.com/gofiber/fiber/v3"
	"time"
)

type Handler struct{ service *Service }

func NewHandler(s *Service) *Handler       { return &Handler{service: s} }
func (h *Handler) Register(g fiber.Router) { g.Get("/transactions", h.list) }
func (h *Handler) list(c fiber.Ctx) error {
	identity, ok := auth.FromContext(c)
	if !ok {
		return respond.Error(c, apperror.New(401, "AUTH_REQUIRED", "authentication is required"))
	}
	limit, err := parseLimit(c.Query("limit"))
	if err != nil {
		return respond.Error(c, apperror.New(422, "INVALID_TRANSACTION_FILTER", "transaction filter is invalid"))
	}
	dateFrom, err := parseDate(c.Query("dateFrom"))
	if err != nil {
		return respond.Error(c, apperror.New(422, "INVALID_TRANSACTION_FILTER", "transaction filter is invalid"))
	}
	dateTo, err := parseDate(c.Query("dateTo"))
	if err != nil {
		return respond.Error(c, apperror.New(422, "INVALID_TRANSACTION_FILTER", "transaction filter is invalid"))
	}
	page, err := h.service.List(c.Context(), database.Identity{OrgID: identity.OrgID, UserID: identity.UserID}, ListFilter{
		Query: c.Query("q"), PaymentMethod: c.Query("paymentMethod"), DateFrom: dateFrom, DateTo: dateTo,
		Limit: limit, Sort: c.Query("sort"), Direction: c.Query("dir"), Cursor: c.Query("cursor"),
	})
	if errors.Is(err, ErrInvalidCursor) {
		return respond.Error(c, apperror.New(400, "INVALID_CURSOR", "transaction cursor is invalid"))
	}
	if errors.Is(err, ErrInvalidFilter) {
		return respond.Error(c, apperror.New(422, "INVALID_TRANSACTION_FILTER", "transaction filter is invalid"))
	}
	if err != nil {
		return respond.Error(c, err)
	}
	return c.JSON(fiber.Map{"data": page.Items, "meta": fiber.Map{"nextCursor": page.NextCursor, "hasNextPage": page.HasNextPage}})
}

func parseDate(raw string) (*time.Time, error) {
	if raw == "" {
		return nil, nil
	}
	value, err := time.Parse(time.RFC3339, raw)
	if err != nil {
		return nil, ErrInvalidFilter
	}
	return &value, nil
}
