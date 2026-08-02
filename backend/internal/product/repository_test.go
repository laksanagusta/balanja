package product

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

func TestProductImageKeyStaysPrivate(t *testing.T) {
	t.Parallel()

	encoded, err := json.Marshal(Product{Image: "https://img.example/p.jpg", ImageKey: "products/org/p.jpg"})
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(encoded), "products/org/p.jpg") {
		t.Fatalf("private image key leaked: %s", encoded)
	}
}

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
		{sort: "category", direction: "asc", column: "lower(c.name)", operator: ">"},
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

func TestCreateProductProjectsJoinedMasterDataAfterInsert(t *testing.T) {
	t.Parallel()

	categoryID := uuid.New()
	unitID := uuid.New()
	tx := &captureCreateTx{row: createProductRow{categoryID: categoryID, unitID: unitID}}
	created, err := (PostgresRepository{}).Create(context.Background(), tx, "org-1", CreateInput{
		Name: "Teh", Barcode: "899", CategoryID: categoryID, Price: 12000, Stock: 4, UnitID: unitID,
	})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(tx.query, "with inserted as") {
		t.Fatal("create query must insert through a CTE before joining category and unit names")
	}
	if strings.Contains(tx.query, "returning p.") || !strings.Contains(tx.query, "join categories c") || !strings.Contains(tx.query, "join units u") {
		t.Fatal("INSERT RETURNING cannot use list aliases p, c, or u")
	}
	if created.Category != "Minuman" || created.Unit != "botol" || created.CategoryID != categoryID || created.UnitID != unitID {
		t.Fatalf("created product projection = %#v", created)
	}
}

type captureCreateTx struct {
	query string
	row   pgx.Row
}

func (tx *captureCreateTx) QueryRow(_ context.Context, query string, _ ...any) pgx.Row {
	tx.query = query
	return tx.row
}
func (*captureCreateTx) Exec(context.Context, string, ...any) (pgconn.CommandTag, error) {
	return pgconn.CommandTag{}, nil
}
func (*captureCreateTx) Query(context.Context, string, ...any) (pgx.Rows, error) { return nil, nil }
func (*captureCreateTx) Commit(context.Context) error                            { return nil }
func (*captureCreateTx) Rollback(context.Context) error                          { return nil }

type createProductRow struct {
	categoryID uuid.UUID
	unitID     uuid.UUID
}

func (row createProductRow) Scan(dest ...any) error {
	now := time.Date(2026, time.July, 18, 3, 0, 0, 0, time.UTC)
	*dest[0].(*uuid.UUID) = uuid.New()
	*dest[1].(*string) = "Teh"
	*dest[2].(*string) = "899"
	*dest[3].(*uuid.UUID) = row.categoryID
	*dest[4].(*string) = "Minuman"
	*dest[5].(*int) = 12000
	*dest[6].(*int) = 4
	*dest[7].(*uuid.UUID) = row.unitID
	*dest[8].(*string) = "botol"
	*dest[9].(*string) = ""
	*dest[10].(*string) = ""
	*dest[11].(*bool) = true
	*dest[12].(*[]byte) = []byte("[]")
	*dest[13].(*time.Time) = now
	*dest[14].(*time.Time) = now
	return nil
}
