package transaction

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Transaction struct {
	ID            uuid.UUID       `json:"id"`
	Number        string          `json:"number"`
	CashierUserID string          `json:"cashierUserId"`
	CashierName   *string         `json:"cashierName"`
	Items         json.RawMessage `json:"items"`
	Subtotal      int             `json:"subtotal"`
	Tax           int             `json:"tax"`
	Total         int             `json:"total"`
	PaymentMethod string          `json:"paymentMethod"`
	CashReceived  int             `json:"cashReceived"`
	ChangeDue     int             `json:"changeDue"`
	Status        string          `json:"status"`
	CreatedAt     time.Time       `json:"createdAt"`
}
type ListFilter struct {
	Query         string
	PaymentMethod string
	DateFrom      *time.Time
	DateTo        *time.Time
	Limit         int
	Sort          string
	Direction     string
	Cursor        string
	CursorValue   any
	CursorID      uuid.UUID
}

type Page struct {
	Items       []Transaction `json:"items"`
	NextCursor  string        `json:"nextCursor,omitempty"`
	HasNextPage bool          `json:"hasNextPage"`
}
