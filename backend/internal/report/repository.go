package report

import (
	"balanja/backend/internal/platform/database"
	"context"
	"fmt"
	"time"
)

type PostgresRepository struct{}

func (PostgresRepository) Load(ctx context.Context, tx database.Tx, orgID string, query Query) (ReportData, error) {
	currentMetrics, voids, err := loadSummary(ctx, tx, orgID, query.Current, query.PaymentMethod, query.CashierUserID)
	if err != nil {
		return ReportData{}, err
	}
	previousMetrics, _, err := loadSummary(ctx, tx, orgID, query.Previous, query.PaymentMethod, query.CashierUserID)
	if err != nil {
		return ReportData{}, err
	}
	currentTrend, err := loadTrend(ctx, tx, orgID, query.Current, query.PaymentMethod, query.CashierUserID)
	if err != nil {
		return ReportData{}, err
	}
	previousTrend, err := loadTrend(ctx, tx, orgID, query.Previous, query.PaymentMethod, query.CashierUserID)
	if err != nil {
		return ReportData{}, err
	}
	products, err := loadProducts(ctx, tx, orgID, query.Current, query.PaymentMethod, query.CashierUserID)
	if err != nil {
		return ReportData{}, err
	}
	payments, err := loadPayments(ctx, tx, orgID, query.Current, query.PaymentMethod, query.CashierUserID)
	if err != nil {
		return ReportData{}, err
	}
	cashiers, err := loadCashiers(ctx, tx, orgID, query.Current, query.PaymentMethod, query.CashierUserID)
	if err != nil {
		return ReportData{}, err
	}
	cashierOptions, err := loadCashierOptions(ctx, tx, orgID, query.Current)
	if err != nil {
		return ReportData{}, err
	}
	return ReportData{
		CurrentMetrics:  currentMetrics,
		PreviousMetrics: previousMetrics,
		Voids:           voids,
		CurrentTrend:    currentTrend,
		PreviousTrend:   previousTrend,
		TopProducts:     products,
		PaymentMethods:  payments,
		Cashiers:        cashiers,
		CashierOptions:  cashierOptions,
	}, nil
}

func loadProducts(ctx context.Context, tx database.Tx, orgID string, period Period, paymentMethod, cashierUserID string) ([]ProductBreakdown, error) {
	const query = `
		select item->>'productId',
			coalesce((array_agg(item->>'name' order by t.created_at desc, t.id desc))[1], item->>'productId'),
			sum((item->>'qty')::bigint),
			sum((item->>'price')::bigint * (item->>'qty')::bigint)
		from transactions t
		cross join lateral jsonb_array_elements(t.items) item
		where t.org_id=$1 and t.status='completed'
			and t.created_at >= $2 and t.created_at < $3
			and ($4='' or t.payment_method=$4)
			and ($5='' or t.cashier_user_id=$5)
		group by item->>'productId'
		order by 4 desc, 3 desc, 1
		limit 10`
	rows, err := tx.Query(ctx, query, orgID, period.Start, period.End, paymentMethod, cashierUserID)
	if err != nil {
		return nil, fmt.Errorf("load report products: %w", err)
	}
	defer rows.Close()
	values := []ProductBreakdown{}
	for rows.Next() {
		var value ProductBreakdown
		if err := rows.Scan(&value.ProductID, &value.Label, &value.Quantity, &value.NetSales); err != nil {
			return nil, fmt.Errorf("scan report product: %w", err)
		}
		values = append(values, value)
	}
	return values, rows.Err()
}

func loadPayments(ctx context.Context, tx database.Tx, orgID string, period Period, paymentMethod, cashierUserID string) ([]PaymentBreakdown, error) {
	const query = `
		select t.payment_method, count(*), coalesce(sum(t.total),0)
		from transactions t
		where t.org_id=$1 and t.status='completed'
			and t.created_at >= $2 and t.created_at < $3
			and ($4='' or t.payment_method=$4)
			and ($5='' or t.cashier_user_id=$5)
		group by t.payment_method
		order by 3 desc, 1`
	rows, err := tx.Query(ctx, query, orgID, period.Start, period.End, paymentMethod, cashierUserID)
	if err != nil {
		return nil, fmt.Errorf("load report payments: %w", err)
	}
	defer rows.Close()
	values := []PaymentBreakdown{}
	for rows.Next() {
		var value PaymentBreakdown
		if err := rows.Scan(&value.PaymentMethod, &value.TransactionCount, &value.TotalReceived); err != nil {
			return nil, fmt.Errorf("scan report payment: %w", err)
		}
		values = append(values, value)
	}
	return values, rows.Err()
}

func loadCashiers(ctx context.Context, tx database.Tx, orgID string, period Period, paymentMethod, cashierUserID string) ([]CashierBreakdown, error) {
	const query = `
		select t.cashier_user_id,
			coalesce((array_agg(nullif(btrim(t.cashier_name),'') order by t.created_at desc, t.id desc)
				filter (where nullif(btrim(t.cashier_name),'') is not null))[1], ''),
			count(*), coalesce(sum(i.item_count),0), coalesce(sum(t.subtotal),0),
			coalesce(sum(t.tax),0), coalesce(sum(t.total),0)
		from transactions t
		left join lateral (
			select coalesce(sum((item->>'qty')::bigint),0) item_count
			from jsonb_array_elements(t.items) item
		) i on true
		where t.org_id=$1 and t.status='completed'
			and t.created_at >= $2 and t.created_at < $3
			and ($4='' or t.payment_method=$4)
			and ($5='' or t.cashier_user_id=$5)
		group by t.cashier_user_id
		order by 7 desc, 1`
	rows, err := tx.Query(ctx, query, orgID, period.Start, period.End, paymentMethod, cashierUserID)
	if err != nil {
		return nil, fmt.Errorf("load report cashiers: %w", err)
	}
	defer rows.Close()
	values := []CashierBreakdown{}
	for rows.Next() {
		var value CashierBreakdown
		if err := rows.Scan(&value.CashierUserID, &value.CashierName, &value.CompletedTransactions, &value.ItemsSold, &value.NetSales, &value.Tax, &value.TotalReceived); err != nil {
			return nil, fmt.Errorf("scan report cashier: %w", err)
		}
		value.Label = cashierLabel(value.CashierName, value.CashierUserID)
		values = append(values, value)
	}
	return values, rows.Err()
}

func loadCashierOptions(ctx context.Context, tx database.Tx, orgID string, period Period) ([]CashierOption, error) {
	const query = `
		select t.cashier_user_id,
			coalesce((array_agg(nullif(btrim(t.cashier_name),'') order by t.created_at desc, t.id desc)
				filter (where nullif(btrim(t.cashier_name),'') is not null))[1], '')
		from transactions t
		where t.org_id=$1 and t.created_at >= $2 and t.created_at < $3
		group by t.cashier_user_id
		order by 1`
	rows, err := tx.Query(ctx, query, orgID, period.Start, period.End)
	if err != nil {
		return nil, fmt.Errorf("load report cashier options: %w", err)
	}
	defer rows.Close()
	values := []CashierOption{}
	for rows.Next() {
		var value CashierOption
		var name string
		if err := rows.Scan(&value.CashierUserID, &name); err != nil {
			return nil, fmt.Errorf("scan report cashier option: %w", err)
		}
		value.Label = cashierLabel(name, value.CashierUserID)
		values = append(values, value)
	}
	return values, rows.Err()
}

func cashierLabel(name, userID string) string {
	if name != "" {
		return name
	}
	runes := []rune(userID)
	if len(runes) > 8 {
		runes = runes[:8]
	}
	return "Pengguna " + string(runes)
}

func loadSummary(ctx context.Context, tx database.Tx, orgID string, period Period, paymentMethod, cashierUserID string) (Metrics, VoidMetrics, error) {
	const query = `
		select
			coalesce(sum(t.subtotal) filter (where t.status='completed'),0),
			coalesce(sum(t.tax) filter (where t.status='completed'),0),
			coalesce(sum(t.total) filter (where t.status='completed'),0),
			count(*) filter (where t.status='completed'),
			coalesce(sum(i.item_count) filter (where t.status='completed'),0),
			count(*) filter (where t.status='voided'),
			coalesce(sum(t.total) filter (where t.status='voided'),0)
		from transactions t
		left join lateral (
			select coalesce(sum((item->>'qty')::bigint),0) item_count
			from jsonb_array_elements(t.items) item
		) i on true
		where t.org_id=$1 and t.created_at >= $2 and t.created_at < $3
			and ($4='' or t.payment_method=$4)
			and ($5='' or t.cashier_user_id=$5)`
	var metrics Metrics
	var voids VoidMetrics
	err := tx.QueryRow(ctx, query, orgID, period.Start, period.End, paymentMethod, cashierUserID).Scan(
		&metrics.NetSales,
		&metrics.Tax,
		&metrics.TotalReceived,
		&metrics.CompletedTransactions,
		&metrics.ItemsSold,
		&voids.Count,
		&voids.OriginalValue,
	)
	if err != nil {
		return Metrics{}, VoidMetrics{}, fmt.Errorf("load report summary: %w", err)
	}
	if metrics.CompletedTransactions > 0 {
		metrics.AverageTransaction = float64(metrics.TotalReceived) / float64(metrics.CompletedTransactions)
	}
	return metrics, voids, nil
}

func loadTrend(ctx context.Context, tx database.Tx, orgID string, period Period, paymentMethod, cashierUserID string) ([]TrendPoint, error) {
	query := dailyTrendSQL
	if period.Days == 1 {
		query = hourlyTrendSQL
	}
	rows, err := tx.Query(ctx, query, orgID, period.Start, period.End, paymentMethod, cashierUserID)
	if err != nil {
		return nil, fmt.Errorf("load report trend: %w", err)
	}
	defer rows.Close()

	location := WIBLocation()
	points := make([]TrendPoint, 0, period.Days)
	for rows.Next() {
		var bucket time.Time
		var total int64
		if err := rows.Scan(&bucket, &total); err != nil {
			return nil, fmt.Errorf("scan report trend: %w", err)
		}
		local := bucket.In(location)
		point := TrendPoint{Bucket: local.Format(dateLayout), Label: local.Format("2 Jan"), TotalReceived: total}
		if period.Days == 1 {
			point.Bucket = local.Format("2006-01-02T15:00:00-07:00")
			point.Label = local.Format("15.04")
		}
		points = append(points, point)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate report trend: %w", err)
	}
	return points, nil
}

const hourlyTrendSQL = `
	with buckets as (
		select generate_series($2::timestamptz, $3::timestamptz - interval '1 hour', interval '1 hour') bucket_start
	), totals as (
		select date_trunc('hour', t.created_at at time zone 'Asia/Jakarta') local_bucket,
			coalesce(sum(t.total),0) total_received
		from transactions t
		where t.org_id=$1 and t.status='completed'
			and t.created_at >= $2 and t.created_at < $3
			and ($4='' or t.payment_method=$4)
			and ($5='' or t.cashier_user_id=$5)
		group by 1
	)
	select b.bucket_start, coalesce(t.total_received,0)
	from buckets b
	left join totals t on t.local_bucket = date_trunc('hour', b.bucket_start at time zone 'Asia/Jakarta')
	order by b.bucket_start`

const dailyTrendSQL = `
	with buckets as (
		select generate_series($2::timestamptz, $3::timestamptz - interval '1 day', interval '1 day') bucket_start
	), totals as (
		select date_trunc('day', t.created_at at time zone 'Asia/Jakarta') local_bucket,
			coalesce(sum(t.total),0) total_received
		from transactions t
		where t.org_id=$1 and t.status='completed'
			and t.created_at >= $2 and t.created_at < $3
			and ($4='' or t.payment_method=$4)
			and ($5='' or t.cashier_user_id=$5)
		group by 1
	)
	select b.bucket_start, coalesce(t.total_received,0)
	from buckets b
	left join totals t on t.local_bucket = date_trunc('day', b.bucket_start at time zone 'Asia/Jakarta')
	order by b.bucket_start`
