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
	return ReportData{
		CurrentMetrics:  currentMetrics,
		PreviousMetrics: previousMetrics,
		Voids:           voids,
		CurrentTrend:    currentTrend,
		PreviousTrend:   previousTrend,
		TopProducts:     []ProductBreakdown{},
		PaymentMethods:  []PaymentBreakdown{},
		Cashiers:        []CashierBreakdown{},
		CashierOptions:  []CashierOption{},
	}, nil
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
