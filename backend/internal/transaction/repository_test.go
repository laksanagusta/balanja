package transaction

import (
	"encoding/json"
	"testing"

	"github.com/google/uuid"
)

func TestResolveTransactionOrder(t *testing.T) {
	t.Parallel()

	tests := []struct {
		sort      string
		direction string
		column    string
		operator  string
	}{
		{sort: "createdAt", direction: "desc", column: "t.created_at", operator: "<"},
		{sort: "number", direction: "asc", column: "t.number", operator: ">"},
		{sort: "paymentMethod", direction: "asc", column: "t.payment_method", operator: ">"},
		{sort: "total", direction: "desc", column: "t.total", operator: "<"},
	}
	for _, tt := range tests {
		t.Run(tt.sort+tt.direction, func(t *testing.T) {
			order, err := resolveTransactionOrder(tt.sort, tt.direction)
			if err != nil {
				t.Fatal(err)
			}
			if order.Column != tt.column || order.Operator != tt.operator || order.Direction != tt.direction {
				t.Fatalf("order = %#v", order)
			}
		})
	}
}

func TestTransactionImageProductIDsOnlyReturnsItemsMissingImages(t *testing.T) {
	missingImageID := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	storedImageID := uuid.MustParse("22222222-2222-2222-2222-222222222222")
	transactions := []Transaction{
		{
			Items: json.RawMessage(`[
				{"productId":"11111111-1111-1111-1111-111111111111","name":"Parfum"},
				{"productId":"22222222-2222-2222-2222-222222222222","name":"Snack","image":"/snapshot.jpg"},
				{"productId":"11111111-1111-1111-1111-111111111111","name":"Parfum"}
			]`),
		},
	}

	got := transactionImageProductIDs(transactions)

	if len(got) != 1 || got[0] != missingImageID {
		t.Fatalf("transactionImageProductIDs() = %v, want [%s]", got, missingImageID)
	}
	if got[0] == storedImageID {
		t.Fatal("transactionImageProductIDs() included an item that already has a stored image")
	}
}

func TestEnrichTransactionItemImagesFillsMissingAndPreservesSnapshot(t *testing.T) {
	missingImageID := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	transactions := []Transaction{
		{
			Items: json.RawMessage(`[
				{"productId":"11111111-1111-1111-1111-111111111111","name":"Parfum"},
				{"productId":"22222222-2222-2222-2222-222222222222","name":"Snack","image":"/snapshot.jpg"}
			]`),
		},
	}

	err := enrichTransactionItemImages(transactions, map[uuid.UUID]string{
		missingImageID: "/api/v1/product-images/parfum.jpg",
	})
	if err != nil {
		t.Fatalf("enrichTransactionItemImages() error = %v", err)
	}

	var items []map[string]any
	if err := json.Unmarshal(transactions[0].Items, &items); err != nil {
		t.Fatalf("unmarshal enriched items: %v", err)
	}
	if got := items[0]["image"]; got != "/api/v1/product-images/parfum.jpg" {
		t.Fatalf("missing item image = %v, want product image proxy", got)
	}
	if got := items[1]["image"]; got != "/snapshot.jpg" {
		t.Fatalf("stored item image = %v, want original snapshot", got)
	}
}
