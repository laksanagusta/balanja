package product

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"balanja/backend/internal/platform/database"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type PostgresRepository struct{}

type listOrder struct {
	Column    string
	Operator  string
	Direction string
}

func resolveProductOrder(sort, direction string) (listOrder, error) {
	operator := ">"
	if direction == "desc" {
		operator = "<"
	} else if direction != "asc" {
		return listOrder{}, ErrInvalidProduct
	}
	var column string
	switch sort {
	case "name":
		column = "p.name"
	case "category":
		column = "lower(c.name)"
	case "price":
		column = "p.price"
	case "stock":
		column = "p.stock"
	case "createdAt":
		column = "p.created_at"
	default:
		return listOrder{}, ErrInvalidProduct
	}
	return listOrder{Column: column, Operator: operator, Direction: direction}, nil
}

func scanProduct(row pgx.Row) (Product, error) {
	var p Product
	var attrsConfig []byte
	err := row.Scan(&p.ID, &p.Name, &p.Barcode, &p.CategoryID, &p.Category, &p.Price, &p.Stock, &p.UnitID, &p.Unit, &p.Image, &p.ImageKey, &p.Active, &attrsConfig, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return p, err
	}
	p.AttributesConfig, err = decodeAttributeConfigs(attrsConfig)
	return p, err
}

func scanUpdateResult(row pgx.Row) (UpdateResult, error) {
	var result UpdateResult
	p := &result.Product
	var attrsConfig []byte
	err := row.Scan(&p.ID, &p.Name, &p.Barcode, &p.CategoryID, &p.Category, &p.Price, &p.Stock, &p.UnitID, &p.Unit, &p.Image, &p.ImageKey, &p.Active, &attrsConfig, &p.CreatedAt, &p.UpdatedAt, &result.PreviousImageKey)
	if err != nil {
		return result, err
	}
	p.AttributesConfig, err = decodeAttributeConfigs(attrsConfig)
	return result, err
}

const productColumns = `p.id,p.name,p.barcode,p.category_id,c.name,p.price,p.stock,p.unit_id,u.name,p.image,p.image_key,p.active,p.attributes_config,p.created_at,p.updated_at`
const productInsertedColumns = `inserted.id,inserted.name,inserted.barcode,inserted.category_id,c.name,inserted.price,inserted.stock,inserted.unit_id,u.name,inserted.image,inserted.image_key,inserted.active,inserted.attributes_config,inserted.created_at,inserted.updated_at`
const productUpdateColumns = `updated.id,updated.name,updated.barcode,updated.category_id,c.name,updated.price,updated.stock,updated.unit_id,u.name,updated.image,updated.image_key,updated.active,updated.attributes_config,updated.created_at,updated.updated_at`

func (PostgresRepository) List(ctx context.Context, tx database.Tx, orgID string, filter ListFilter) ([]Product, error) {
	order, err := resolveProductOrder(filter.Sort, filter.Direction)
	if err != nil {
		return nil, err
	}
	query := fmt.Sprintf(`
		select %s
		from products p
		join categories c on c.org_id=p.org_id and c.id=p.category_id
		join units u on u.org_id=p.org_id and u.id=p.unit_id
		where p.org_id=$1
			and ($2='' or p.name ilike '%%' || $2 || '%%' or p.barcode ilike '%%' || $2 || '%%' or c.name ilike '%%' || $2 || '%%')
			and ($3::uuid is null or p.category_id=$3::uuid)
			and ($4::boolean is null or p.active=$4)
			and (not $5::boolean or (%s,p.id) %s ($6,$7::uuid))
		order by %s %s,p.id %s
		limit $8`, productColumns, order.Column, order.Operator, order.Column, order.Direction, order.Direction)
	var active any
	if filter.Active != nil {
		active = *filter.Active
	}
	hasCursor := filter.CursorID != uuid.Nil
	var categoryID any
	if filter.CategoryID != uuid.Nil {
		categoryID = filter.CategoryID
	}
	rows, err := tx.Query(ctx, query, orgID, filter.Query, categoryID, active, hasCursor, filter.CursorValue, filter.CursorID, filter.Limit)
	if err != nil {
		return nil, fmt.Errorf("list products: %w", err)
	}
	defer rows.Close()
	products, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (Product, error) { return scanProduct(row) })
	if err != nil {
		return nil, fmt.Errorf("scan products: %w", err)
	}
	return products, nil
}
func (PostgresRepository) Create(ctx context.Context, tx database.Tx, orgID string, in CreateInput) (Product, error) {
	attrsConfig, err := encodeAttributeConfigs(in.AttributesConfig)
	if err != nil {
		return Product{}, err
	}
	p, err := scanProduct(tx.QueryRow(ctx, `
		with inserted as (
			insert into products (org_id,name,barcode,category_id,price,stock,unit_id,image,image_key,attributes_config)
			values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
			returning id,name,barcode,category_id,price,stock,unit_id,image,image_key,active,attributes_config,created_at,updated_at
		)
		select `+productInsertedColumns+`
		from inserted
		join categories c on c.org_id=$1 and c.id=inserted.category_id
		join units u on u.org_id=$1 and u.id=inserted.unit_id
	`, orgID, in.Name, in.Barcode, in.CategoryID, in.Price, in.Stock, in.UnitID, in.Image, in.ImageKey, attrsConfig))
	if err != nil {
		var postgresError *pgconn.PgError
		if errors.As(err, &postgresError) && postgresError.Code == "23505" {
			return Product{}, ErrBarcodeConflict
		}
		return Product{}, fmt.Errorf("create product: %w", err)
	}
	return p, nil
}
func (PostgresRepository) Get(ctx context.Context, tx database.Tx, orgID string, id uuid.UUID) (Product, error) {
	p, err := scanProduct(tx.QueryRow(ctx, `
		select `+productColumns+`
		from products p
		join categories c on c.org_id=p.org_id and c.id=p.category_id
		join units u on u.org_id=p.org_id and u.id=p.unit_id
		where p.org_id=$1 and p.id=$2
	`, orgID, id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Product{}, ErrNotFound
		}
		return Product{}, fmt.Errorf("get product: %w", err)
	}
	return p, nil
}
func (PostgresRepository) CategoryIsActive(ctx context.Context, tx database.Tx, orgID string, id uuid.UUID) (bool, error) {
	var active bool
	err := tx.QueryRow(ctx, `select active from categories where org_id=$1 and id=$2`, orgID, id).Scan(&active)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("check category reference: %w", err)
	}
	return active, nil
}
func (PostgresRepository) UnitIsActive(ctx context.Context, tx database.Tx, orgID string, id uuid.UUID) (bool, error) {
	var active bool
	err := tx.QueryRow(ctx, `select active from units where org_id=$1 and id=$2`, orgID, id).Scan(&active)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("check unit reference: %w", err)
	}
	return active, nil
}
func (PostgresRepository) Update(ctx context.Context, tx database.Tx, orgID string, id uuid.UUID, in UpdateInput) (UpdateResult, error) {
	attrsConfig, err := encodeAttributeConfigs(in.AttributesConfig)
	if err != nil {
		return UpdateResult{}, err
	}
	result, err := scanUpdateResult(tx.QueryRow(ctx, `
		with previous as (
			select image_key from products where org_id=$1 and id=$2 for update
		), updated as (
			update products p set
				name=$3,barcode=$4,category_id=$5,price=$6,unit_id=$7,
				image=case when $10 then p.image else $8 end,
				image_key=case when $10 then p.image_key when p.image=$8 and $9='' then p.image_key else $9 end,
				active=$11,
				attributes_config=$12
			from previous
			where p.org_id=$1 and p.id=$2
			returning p.id,p.name,p.barcode,p.category_id,p.price,p.stock,p.unit_id,p.image,p.image_key,p.active,p.attributes_config,p.created_at,p.updated_at
		)
		select `+productUpdateColumns+`,previous.image_key
		from updated
		join categories c on c.org_id=$1 and c.id=updated.category_id
		join units u on u.org_id=$1 and u.id=updated.unit_id
		cross join previous`, orgID, id, in.Name, in.Barcode, in.CategoryID, in.Price, in.UnitID, in.Image, in.ImageKey, in.PreserveImage, in.Active, attrsConfig))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return UpdateResult{}, ErrNotFound
		}
		return UpdateResult{}, fmt.Errorf("update product: %w", err)
	}
	return result, nil
}
func (PostgresRepository) Deactivate(ctx context.Context, tx database.Tx, orgID string, id uuid.UUID) (Product, error) {
	p, err := scanProduct(tx.QueryRow(ctx, `
		with updated as (
			update products set active=false where org_id=$1 and id=$2
			returning id,name,barcode,category_id,price,stock,unit_id,image,image_key,active,attributes_config,created_at,updated_at
		)
		select `+productUpdateColumns+`
		from updated
		join categories c on c.org_id=$1 and c.id=updated.category_id
		join units u on u.org_id=$1 and u.id=updated.unit_id
	`, orgID, id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Product{}, ErrNotFound
		}
		return Product{}, fmt.Errorf("deactivate product: %w", err)
	}
	return p, nil
}

func decodeAttributeConfigs(raw []byte) ([]AttributeConfig, error) {
	if len(raw) == 0 {
		return nil, nil
	}
	var configs []AttributeConfig
	if err := json.Unmarshal(raw, &configs); err != nil {
		return nil, fmt.Errorf("decode attribute configs: %w", err)
	}
	return configs, nil
}

func encodeAttributeConfigs(configs []AttributeConfig) ([]byte, error) {
	if len(configs) == 0 {
		return []byte("[]"), nil
	}
	raw, err := json.Marshal(configs)
	if err != nil {
		return nil, fmt.Errorf("encode attribute configs: %w", err)
	}
	return raw, nil
}

func scanVariant(row pgx.Row) (Variant, error) {
	var v Variant
	var attrs []byte
	err := row.Scan(&v.ID, &v.ProductID, &attrs, &v.Price, &v.Stock, &v.Barcode, &v.Image, &v.ImageKey, &v.Active, &v.CreatedAt, &v.UpdatedAt)
	if err != nil {
		return v, err
	}
	if len(attrs) > 0 && string(attrs) != "{}" {
		v.Attributes = map[string]string{}
		if err := json.Unmarshal(attrs, &v.Attributes); err != nil {
			return v, fmt.Errorf("decode variant attributes: %w", err)
		}
	}
	return v, nil
}

func encodeVariantAttributes(attrs map[string]string) []byte {
	if len(attrs) == 0 {
		return []byte("{}")
	}
	raw, _ := json.Marshal(attrs)
	return raw
}

func (PostgresRepository) ListVariants(ctx context.Context, tx database.Tx, orgID string, productID uuid.UUID) ([]Variant, error) {
	rows, err := tx.Query(ctx, `
		select id,product_id,attributes,price,stock,barcode,image,image_key,active,created_at,updated_at
		from product_variants
		where org_id=$1 and product_id=$2
		order by created_at,id
	`, orgID, productID)
	if err != nil {
		return nil, fmt.Errorf("list variants: %w", err)
	}
	defer rows.Close()
	variants, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (Variant, error) { return scanVariant(row) })
	if err != nil {
		return nil, fmt.Errorf("scan variants: %w", err)
	}
	return variants, nil
}

func (PostgresRepository) GetVariant(ctx context.Context, tx database.Tx, orgID string, productID, variantID uuid.UUID) (Variant, error) {
	v, err := scanVariant(tx.QueryRow(ctx, `
		select id,product_id,attributes,price,stock,barcode,image,image_key,active,created_at,updated_at
		from product_variants
		where org_id=$1 and product_id=$2 and id=$3
	`, orgID, productID, variantID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Variant{}, ErrVariantNotFound
		}
		return Variant{}, fmt.Errorf("get variant: %w", err)
	}
	return v, nil
}

func (PostgresRepository) CreateVariant(ctx context.Context, tx database.Tx, orgID string, productID uuid.UUID, in VariantInput) (Variant, error) {
	v, err := scanVariant(tx.QueryRow(ctx, `
		insert into product_variants (org_id,product_id,attributes,price,stock,barcode,image,image_key,active)
		values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		returning id,product_id,attributes,price,stock,barcode,image,image_key,active,created_at,updated_at
	`, orgID, productID, encodeVariantAttributes(in.Attributes), in.Price, in.Stock, in.Barcode, in.Image, in.ImageKey, in.Active))
	if err != nil {
		var postgresError *pgconn.PgError
		if errors.As(err, &postgresError) && postgresError.Code == "23505" {
			return Variant{}, ErrVariantBarcodeConflict
		}
		return Variant{}, fmt.Errorf("create variant: %w", err)
	}
	return v, nil
}

func (PostgresRepository) UpdateVariant(ctx context.Context, tx database.Tx, orgID string, productID, variantID uuid.UUID, in VariantInput) (Variant, error) {
	v, err := scanVariant(tx.QueryRow(ctx, `
		update product_variants set
			attributes=$3,price=$4,stock=$5,barcode=$6,image=$7,image_key=$8,active=$9
		where org_id=$1 and product_id=$2 and id=$10
		returning id,product_id,attributes,price,stock,barcode,image,image_key,active,created_at,updated_at
	`, orgID, productID, encodeVariantAttributes(in.Attributes), in.Price, in.Stock, in.Barcode, in.Image, in.ImageKey, in.Active, variantID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Variant{}, ErrVariantNotFound
		}
		var postgresError *pgconn.PgError
		if errors.As(err, &postgresError) && postgresError.Code == "23505" {
			return Variant{}, ErrVariantBarcodeConflict
		}
		return Variant{}, fmt.Errorf("update variant: %w", err)
	}
	return v, nil
}

func (PostgresRepository) DeleteVariant(ctx context.Context, tx database.Tx, orgID string, productID, variantID uuid.UUID) error {
	tag, err := tx.Exec(ctx, `delete from product_variants where org_id=$1 and product_id=$2 and id=$3`, orgID, productID, variantID)
	if err != nil {
		return fmt.Errorf("delete variant: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrVariantNotFound
	}
	return nil
}

func (PostgresRepository) CountActiveVariants(ctx context.Context, tx database.Tx, orgID string, productID uuid.UUID) (int, error) {
	var count int
	err := tx.QueryRow(ctx, `select count(*) from product_variants where org_id=$1 and product_id=$2 and active=true`, orgID, productID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count active variants: %w", err)
	}
	return count, nil
}

func (PostgresRepository) VariantSoldHistory(ctx context.Context, tx database.Tx, orgID string, variantID uuid.UUID) (bool, error) {
	var exists bool
	err := tx.QueryRow(ctx, `select exists(select 1 from stock_movements where org_id=$1 and product_variant_id=$2)`, orgID, variantID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check variant sold history: %w", err)
	}
	return exists, nil
}
