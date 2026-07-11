package checkout

import (
	"github.com/google/uuid"
	"time"
)

type ItemInput struct {
	ProductID uuid.UUID `json:"productId"`
	Quantity  int       `json:"quantity"`
}
type PaymentInput struct {
	Method       string `json:"method"`
	CashReceived int    `json:"cashReceived"`
}
type Input struct {
	Items   []ItemInput  `json:"items"`
	Payment PaymentInput `json:"payment"`
}
type Item struct {
	ProductID uuid.UUID `json:"productId"`
	Name      string    `json:"name"`
	Barcode   string    `json:"barcode"`
	Price     int       `json:"price"`
	Quantity  int       `json:"qty"`
}
type Transaction struct {
	ID            uuid.UUID `json:"id"`
	Number        string    `json:"number"`
	CashierUserID string    `json:"cashierUserId"`
	CashierName   *string   `json:"cashierName"`
	Items         []Item    `json:"items"`
	Subtotal      int       `json:"subtotal"`
	Tax           int       `json:"tax"`
	Total         int       `json:"total"`
	PaymentMethod string    `json:"paymentMethod"`
	CashReceived  int       `json:"cashReceived"`
	ChangeDue     int       `json:"changeDue"`
	Status        string    `json:"status"`
	CreatedAt     time.Time `json:"createdAt"`
}
type Result struct {
	Transaction Transaction    `json:"transaction"`
	Products    []ProductStock `json:"products"`
	Replay      bool           `json:"-"`
}
type ProductStock struct {
	ID        uuid.UUID `json:"id"`
	Stock     int       `json:"stock"`
	UpdatedAt time.Time `json:"updatedAt"`
}
