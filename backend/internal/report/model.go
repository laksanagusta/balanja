package report

import "time"

type FilterInput struct {
	DateFrom        string
	DateTo          string
	PaymentMethod   string
	CashierUserID   string
	CashierProvided bool
}

type Period struct {
	DateFrom string    `json:"dateFrom"`
	DateTo   string    `json:"dateTo"`
	Days     int       `json:"days"`
	Start    time.Time `json:"-"`
	End      time.Time `json:"-"`
}

type Query struct {
	Current       Period
	Previous      Period
	PaymentMethod string
	CashierUserID string
}

type Metrics struct {
	NetSales              int64   `json:"netSales"`
	Tax                   int64   `json:"tax"`
	TotalReceived         int64   `json:"totalReceived"`
	CompletedTransactions int64   `json:"completedTransactions"`
	ItemsSold             int64   `json:"itemsSold"`
	AverageTransaction    float64 `json:"averageTransaction"`
}

type Comparison struct {
	Absolute  float64  `json:"absolute"`
	Percent   *float64 `json:"percent"`
	Direction string   `json:"direction"`
}

type VoidMetrics struct {
	Count         int64 `json:"count"`
	OriginalValue int64 `json:"originalValue"`
}

type TrendPoint struct {
	Bucket        string `json:"bucket"`
	Label         string `json:"label"`
	TotalReceived int64  `json:"totalReceived"`
}

type ProductBreakdown struct {
	ProductID string `json:"productId"`
	Label     string `json:"label"`
	Quantity  int64  `json:"quantity"`
	NetSales  int64  `json:"netSales"`
}

type PaymentBreakdown struct {
	PaymentMethod    string `json:"paymentMethod"`
	TransactionCount int64  `json:"transactionCount"`
	TotalReceived    int64  `json:"totalReceived"`
}

type CashierBreakdown struct {
	CashierUserID         string `json:"cashierUserId"`
	CashierName           string `json:"cashierName"`
	Label                 string `json:"label"`
	CompletedTransactions int64  `json:"completedTransactions"`
	ItemsSold             int64  `json:"itemsSold"`
	NetSales              int64  `json:"netSales"`
	Tax                   int64  `json:"tax"`
	TotalReceived         int64  `json:"totalReceived"`
}

type CashierOption struct {
	CashierUserID string `json:"cashierUserId"`
	Label         string `json:"label"`
}

type ReportData struct {
	CurrentMetrics, PreviousMetrics Metrics
	Voids                           VoidMetrics
	CurrentTrend, PreviousTrend     []TrendPoint
	TopProducts                     []ProductBreakdown
	PaymentMethods                  []PaymentBreakdown
	Cashiers                        []CashierBreakdown
	CashierOptions                  []CashierOption
}

type Report struct {
	Period           Period                `json:"period"`
	ComparisonPeriod Period                `json:"comparisonPeriod"`
	Metrics          Metrics               `json:"metrics"`
	PreviousMetrics  Metrics               `json:"previousMetrics"`
	Comparisons      map[string]Comparison `json:"comparisons"`
	Voids            VoidMetrics           `json:"voids"`
	Trend            []TrendPoint          `json:"trend"`
	ComparisonTrend  []TrendPoint          `json:"comparisonTrend"`
	TopProducts      []ProductBreakdown    `json:"topProducts"`
	PaymentMethods   []PaymentBreakdown    `json:"paymentMethods"`
	Cashiers         []CashierBreakdown    `json:"cashiers"`
	CashierOptions   []CashierOption       `json:"cashierOptions"`
	GeneratedAt      time.Time             `json:"generatedAt"`
}

type DailyRow struct {
	Date                  string
	CompletedTransactions int64
	ItemsSold             int64
	NetSales              int64
	Tax                   int64
	TotalReceived         int64
	VoidCount             int64
	VoidOriginalValue     int64
}

type TransactionRow struct {
	Number        string
	CreatedAt     time.Time
	CashierLabel  string
	CashierUserID string
	PaymentMethod string
	ItemCount     int64
	Subtotal      int64
	Tax           int64
	Total         int64
	Status        string
}
