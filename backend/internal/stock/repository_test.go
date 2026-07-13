package stock

import "testing"

func TestResolveStockOrder(t *testing.T) {
	t.Parallel()

	tests := []struct {
		sort, direction, column, operator string
	}{
		{sort: "createdAt", direction: "desc", column: "sm.created_at", operator: "<"},
		{sort: "productName", direction: "asc", column: "coalesce(p.name, '')", operator: ">"},
		{sort: "type", direction: "asc", column: "sm.type", operator: ">"},
		{sort: "quantityDelta", direction: "desc", column: "sm.quantity_delta", operator: "<"},
		{sort: "stockAfter", direction: "asc", column: "sm.stock_after", operator: ">"},
	}
	for _, tt := range tests {
		t.Run(tt.sort+"/"+tt.direction, func(t *testing.T) {
			order, err := resolveStockOrder(tt.sort, tt.direction)
			if err != nil {
				t.Fatal(err)
			}
			if order.Column != tt.column || order.Operator != tt.operator || order.Direction != tt.direction {
				t.Fatalf("order = %#v", order)
			}
		})
	}

	if _, err := resolveStockOrder("reason", "asc"); err == nil {
		t.Fatal("resolveStockOrder() error = nil, want validation error")
	}
}
