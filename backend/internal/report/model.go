package report

import "time"

type FilterInput struct {
	DateFrom        string
	DateTo          string
	PaymentMethod   string
	CashierUserID   string
	CashierProvided bool
}

type Period struct {
	DateFrom string    `json:"dateFrom"`
	DateTo   string    `json:"dateTo"`
	Days     int       `json:"days"`
	Start    time.Time `json:"-"`
	End      time.Time `json:"-"`
}

type Query struct {
	Current       Period
	Previous      Period
	PaymentMethod string
	CashierUserID string
}
