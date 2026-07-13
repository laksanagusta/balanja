package transaction

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	listcursor "balanja/backend/internal/platform/cursor"
	"balanja/backend/internal/platform/database"
)

var (
	ErrInvalidCursor = errors.New("invalid transaction cursor")
	ErrInvalidFilter = errors.New("invalid transaction filter")
)

var transactionSorts = map[string]struct{}{
	"createdAt":     {},
	"number":        {},
	"paymentMethod": {},
	"total":         {},
}

type Runner interface {
	Run(context.Context, database.Identity, func(database.Tx) error) error
}

type Repository interface {
	List(context.Context, database.Tx, string, ListFilter) ([]Transaction, error)
}

type Service struct {
	runner     Runner
	repository Repository
}

func NewService(r Runner, repo Repository) *Service { return &Service{runner: r, repository: repo} }

func normalizeListFilter(filter ListFilter) (ListFilter, error) {
	filter.Query = strings.TrimSpace(filter.Query)
	filter.PaymentMethod = strings.ToLower(strings.TrimSpace(filter.PaymentMethod))
	if filter.DateFrom != nil && filter.DateTo != nil && filter.DateFrom.After(*filter.DateTo) {
		return ListFilter{}, ErrInvalidFilter
	}
	if filter.Limit == 0 {
		filter.Limit = 20
	}
	if filter.Limit < 1 || filter.Limit > 100 {
		return ListFilter{}, ErrInvalidFilter
	}
	if filter.Sort == "" {
		filter.Sort = "createdAt"
	}
	if filter.Direction == "" {
		filter.Direction = "desc"
	}
	if _, ok := transactionSorts[filter.Sort]; !ok || (filter.Direction != "asc" && filter.Direction != "desc") {
		return ListFilter{}, ErrInvalidFilter
	}
	return filter, nil
}

func transactionFingerprint(filter ListFilter) string {
	dateFrom, dateTo := "", ""
	if filter.DateFrom != nil {
		dateFrom = filter.DateFrom.UTC().Format(time.RFC3339Nano)
	}
	if filter.DateTo != nil {
		dateTo = filter.DateTo.UTC().Format(time.RFC3339Nano)
	}
	return listcursor.Fingerprint(
		"transactions",
		"q="+filter.Query,
		"paymentMethod="+filter.PaymentMethod,
		"dateFrom="+dateFrom,
		"dateTo="+dateTo,
		fmt.Sprintf("limit=%d", filter.Limit),
		"sort="+filter.Sort,
		"dir="+filter.Direction,
	)
}

func decodeTransactionCursor(filter *ListFilter, fingerprint string) error {
	if filter.Cursor == "" {
		return nil
	}
	payload, err := listcursor.Decode(filter.Cursor)
	if err != nil || listcursor.Compatible(payload, filter.Sort, filter.Direction, fingerprint) != nil {
		return ErrInvalidCursor
	}
	var value any
	switch filter.Sort {
	case "createdAt":
		var typed time.Time
		err = json.Unmarshal(payload.Value, &typed)
		value = typed
	case "number", "paymentMethod":
		var typed string
		err = json.Unmarshal(payload.Value, &typed)
		value = typed
	case "total":
		var typed int
		err = json.Unmarshal(payload.Value, &typed)
		value = typed
	}
	if err != nil {
		return ErrInvalidCursor
	}
	filter.CursorValue = value
	filter.CursorID = payload.ID
	return nil
}

func transactionCursorValue(transaction Transaction, sort string) any {
	switch sort {
	case "number":
		return transaction.Number
	case "paymentMethod":
		return transaction.PaymentMethod
	case "total":
		return transaction.Total
	default:
		return transaction.CreatedAt
	}
}

func (s *Service) List(ctx context.Context, identity database.Identity, filter ListFilter) (page Page, err error) {
	filter, err = normalizeListFilter(filter)
	if err != nil {
		return Page{}, err
	}
	fingerprint := transactionFingerprint(filter)
	if err = decodeTransactionCursor(&filter, fingerprint); err != nil {
		return Page{}, err
	}
	requestedLimit := filter.Limit
	filter.Limit++
	var rows []Transaction
	err = s.runner.Run(ctx, identity, func(tx database.Tx) error {
		var listErr error
		rows, listErr = s.repository.List(ctx, tx, identity.OrgID, filter)
		return listErr
	})
	if err != nil {
		return Page{}, err
	}
	if rows == nil {
		rows = []Transaction{}
	}
	if len(rows) > requestedLimit {
		page.HasNextPage = true
		rows = rows[:requestedLimit]
	}
	page.Items = rows
	if page.HasNextPage {
		last := rows[len(rows)-1]
		value, marshalErr := json.Marshal(transactionCursorValue(last, filter.Sort))
		if marshalErr != nil {
			return Page{}, marshalErr
		}
		page.NextCursor, err = listcursor.Encode(listcursor.Payload{
			Version: listcursor.CurrentVersion, Sort: filter.Sort, Direction: filter.Direction,
			Fingerprint: fingerprint, Value: value, ID: last.ID,
		})
	}
	return page, err
}

func parseLimit(raw string) (int, error) {
	if raw == "" {
		return 0, nil
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return 0, ErrInvalidFilter
	}
	return value, nil
}
