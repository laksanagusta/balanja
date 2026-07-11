package dashboard

import (
	"balanja/backend/internal/auth"
	"balanja/backend/internal/platform/apperror"
	"balanja/backend/internal/platform/database"
	"balanja/backend/internal/platform/respond"
	"errors"
	"github.com/gofiber/fiber/v3"
	"strconv"
	"time"
)

type Handler struct {
	service *Service
	now     func() time.Time
}

func NewHandler(s *Service) *Handler       { return &Handler{service: s, now: time.Now} }
func (h *Handler) Register(g fiber.Router) { g.Get("/dashboard/summary", h.summary) }
func (h *Handler) summary(c fiber.Ctx) error {
	id, ok := auth.FromContext(c)
	if !ok {
		return respond.Error(c, apperror.New(401, "AUTH_REQUIRED", "authentication is required"))
	}
	days, err := strconv.Atoi(c.Query("days", "7"))
	if err != nil {
		return respond.Error(c, apperror.New(400, "INVALID_PERIOD", "dashboard period is invalid"))
	}
	value, err := h.service.Summary(c.Context(), database.Identity{OrgID: id.OrgID, UserID: id.UserID}, days, h.now())
	if errors.Is(err, ErrInvalidPeriod) {
		return respond.Error(c, apperror.New(400, "INVALID_PERIOD", "dashboard period must be 7 or 30 days"))
	}
	if err != nil {
		return respond.Error(c, err)
	}
	return c.JSON(fiber.Map{"data": value})
}
