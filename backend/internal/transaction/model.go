package transaction

import (
	"encoding/json"
	"github.com/google/uuid"
	"time"
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
type Cursor struct {
	CreatedAt time.Time `json:"createdAt"`
	ID        uuid.UUID `json:"id"`
}
type Page struct {
	Items      []Transaction `json:"items"`
	NextCursor string        `json:"nextCursor,omitempty"`
}
