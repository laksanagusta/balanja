package entitlement

const (
	StatusTrial         = "trial"
	StatusPaidActive    = "paid_active"
	StatusPaidSuspended = "paid_suspended"
	TrialLimit          = int64(50)
)

type Record struct {
	OrgID            string
	Status           string
	TransactionLimit *int64
	TransactionsUsed int64
	SupportReference string
}

type Summary struct {
	Status                string `json:"status"`
	TransactionsUsed      int64  `json:"transactionsUsed"`
	TransactionLimit      *int64 `json:"transactionLimit"`
	Remaining             int64  `json:"remaining"`
	CanCheckout           bool   `json:"canCheckout"`
	UnlimitedTransactions bool   `json:"unlimitedTransactions"`
	SupportReference      string `json:"supportReference"`
}

func Summarize(record Record) Summary {
	unlimited := record.Status == StatusPaidActive
	remaining := int64(0)
	if record.TransactionLimit != nil && *record.TransactionLimit > record.TransactionsUsed {
		remaining = *record.TransactionLimit - record.TransactionsUsed
	}
	return Summary{
		Status:                record.Status,
		TransactionsUsed:      record.TransactionsUsed,
		TransactionLimit:      record.TransactionLimit,
		Remaining:             remaining,
		CanCheckout:           unlimited || (record.Status == StatusTrial && remaining > 0),
		UnlimitedTransactions: unlimited,
		SupportReference:      record.SupportReference,
	}
}
