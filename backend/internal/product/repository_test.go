package product

import "testing"

func TestResolveProductOrder(t *testing.T) {
	t.Parallel()

	tests := []struct {
		sort      string
		direction string
		column    string
		operator  string
	}{
		{sort: "createdAt", direction: "desc", column: "p.created_at", operator: "<"},
		{sort: "name", direction: "asc", column: "p.name", operator: ">"},
		{sort: "category", direction: "asc", column: "p.category", operator: ">"},
		{sort: "price", direction: "desc", column: "p.price", operator: "<"},
		{sort: "stock", direction: "asc", column: "p.stock", operator: ">"},
	}
	for _, tt := range tests {
		t.Run(tt.sort+tt.direction, func(t *testing.T) {
			order, err := resolveProductOrder(tt.sort, tt.direction)
			if err != nil {
				t.Fatal(err)
			}
			if order.Column != tt.column || order.Operator != tt.operator || order.Direction != tt.direction {
				t.Fatalf("order = %#v", order)
			}
		})
	}
}
