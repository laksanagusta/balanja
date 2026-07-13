package transaction

import "testing"

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
