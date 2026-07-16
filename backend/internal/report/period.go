package report

import (
	"errors"
	"strings"
	"time"
)

const dateLayout = "2006-01-02"

var (
	ErrInvalidDate          = errors.New("invalid report date")
	ErrInvalidDateRange     = errors.New("report date range must not be reversed")
	ErrDateRangeTooLong     = errors.New("report date range exceeds 366 days")
	ErrFutureDate           = errors.New("report date range cannot include a future date")
	ErrInvalidPaymentMethod = errors.New("invalid report payment method")
	ErrInvalidCashier       = errors.New("invalid report cashier")
)

func WIBLocation() *time.Location {
	location, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		return time.FixedZone("WIB", 7*60*60)
	}
	return location
}

func NormalizeFilter(input FilterInput, now time.Time) (Query, error) {
	location := WIBLocation()
	start, err := time.ParseInLocation(dateLayout, strings.TrimSpace(input.DateFrom), location)
	if err != nil {
		return Query{}, ErrInvalidDate
	}
	dateTo, err := time.ParseInLocation(dateLayout, strings.TrimSpace(input.DateTo), location)
	if err != nil {
		return Query{}, ErrInvalidDate
	}
	if dateTo.Before(start) {
		return Query{}, ErrInvalidDateRange
	}

	today := now.In(location)
	today = time.Date(today.Year(), today.Month(), today.Day(), 0, 0, 0, 0, location)
	if dateTo.After(today) {
		return Query{}, ErrFutureDate
	}

	end := dateTo.AddDate(0, 0, 1)
	days := int(end.Sub(start).Hours() / 24)
	if days > 366 {
		return Query{}, ErrDateRangeTooLong
	}

	payment := strings.ToLower(strings.TrimSpace(input.PaymentMethod))
	if payment != "" && payment != "cash" && payment != "qris" {
		return Query{}, ErrInvalidPaymentMethod
	}
	cashier := strings.TrimSpace(input.CashierUserID)
	if input.CashierProvided && (cashier == "" || len(cashier) > 255) {
		return Query{}, ErrInvalidCashier
	}

	previousStart := start.AddDate(0, 0, -days)
	return Query{
		Current: Period{
			DateFrom: start.Format(dateLayout), DateTo: dateTo.Format(dateLayout), Days: days,
			Start: start, End: end,
		},
		Previous: Period{
			DateFrom: previousStart.Format(dateLayout), DateTo: start.AddDate(0, 0, -1).Format(dateLayout), Days: days,
			Start: previousStart, End: start,
		},
		PaymentMethod: payment,
		CashierUserID: cashier,
	}, nil
}
