package report

import (
	"balanja/backend/internal/auth"
	"balanja/backend/internal/platform/apperror"
	"balanja/backend/internal/platform/database"
	"balanja/backend/internal/platform/respond"
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/gofiber/fiber/v3"
)

type HandlerService interface {
	Prepare(FilterInput, time.Time) (Query, error)
	Report(context.Context, database.Identity, FilterInput, time.Time) (Report, error)
	ExportDaily(context.Context, database.Identity, FilterInput, time.Time, io.Writer) error
	ExportTransactions(context.Context, database.Identity, FilterInput, time.Time, io.Writer) error
}

type Handler struct {
	service HandlerService
	now     func() time.Time
}

func NewHandler(service HandlerService) *Handler { return &Handler{service: service, now: time.Now} }

func (h *Handler) Register(group fiber.Router) {
	group.Get("/reports/sales", h.sales)
	group.Get("/reports/sales/export", h.export)
}

func (h *Handler) sales(c fiber.Ctx) error {
	identity, ok := auth.FromContext(c)
	if !ok {
		return respond.Error(c, apperror.New(http.StatusUnauthorized, "AUTH_REQUIRED", "authentication is required"))
	}
	input := filterInput(c)
	now := h.now()
	if _, err := h.service.Prepare(input, now); isFilterError(err) {
		return invalidFilter(c)
	} else if err != nil {
		return respond.Error(c, err)
	}
	value, err := h.service.Report(c.Context(), database.Identity{OrgID: identity.OrgID, UserID: identity.UserID}, input, now)
	if isFilterError(err) {
		return invalidFilter(c)
	}
	if err != nil {
		return respond.Error(c, err)
	}
	return c.JSON(fiber.Map{"data": value})
}

func (h *Handler) export(c fiber.Ctx) error {
	identity, ok := auth.FromContext(c)
	if !ok {
		return respond.Error(c, apperror.New(http.StatusUnauthorized, "AUTH_REQUIRED", "authentication is required"))
	}
	kind := c.Query("kind", "daily")
	if kind != "daily" && kind != "transactions" {
		return invalidFilter(c)
	}
	input := filterInput(c)
	now := h.now()
	query, err := h.service.Prepare(input, now)
	if isFilterError(err) {
		return invalidFilter(c)
	}
	if err != nil {
		return respond.Error(c, err)
	}

	label := "harian"
	if kind == "transactions" {
		label = "transaksi"
	}
	filename := fmt.Sprintf("laporan-penjualan-%s-%s_%s.csv", label, query.Current.DateFrom, query.Current.DateTo)
	c.Set(fiber.HeaderContentType, "text/csv; charset=utf-8")
	c.Set(fiber.HeaderContentDisposition, fmt.Sprintf("attachment; filename=\"%s\"", filename))
	requestContext := c.Context()
	dbIdentity := database.Identity{OrgID: identity.OrgID, UserID: identity.UserID}
	return c.SendStreamWriter(func(writer *bufio.Writer) {
		ctx, cancel := context.WithTimeout(requestContext, 30*time.Second)
		defer cancel()
		var exportErr error
		if kind == "daily" {
			exportErr = h.service.ExportDaily(ctx, dbIdentity, input, now, writer)
		} else {
			exportErr = h.service.ExportTransactions(ctx, dbIdentity, input, now, writer)
		}
		if flushErr := writer.Flush(); exportErr == nil {
			exportErr = flushErr
		}
		if exportErr != nil {
			slog.Error("stream sales report export", "kind", kind, "error", exportErr)
		}
	})
}

func filterInput(c fiber.Ctx) FilterInput {
	queries := c.Queries()
	_, cashierProvided := queries["cashierUserId"]
	return FilterInput{
		DateFrom:        c.Query("dateFrom"),
		DateTo:          c.Query("dateTo"),
		PaymentMethod:   c.Query("paymentMethod"),
		CashierUserID:   c.Query("cashierUserId"),
		CashierProvided: cashierProvided,
	}
}

func isFilterError(err error) bool {
	return errors.Is(err, ErrInvalidDate) || errors.Is(err, ErrInvalidDateRange) ||
		errors.Is(err, ErrDateRangeTooLong) || errors.Is(err, ErrFutureDate) ||
		errors.Is(err, ErrInvalidPaymentMethod) || errors.Is(err, ErrInvalidCashier)
}

func invalidFilter(c fiber.Ctx) error {
	return respond.Error(c, apperror.New(http.StatusUnprocessableEntity, "INVALID_REPORT_FILTER", "report filters are invalid"))
}
