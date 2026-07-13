package transaction

import (
	"strings"
	"testing"
)

func TestListTransactionsQueryCastsNullableCursorUUID(t *testing.T) {
	t.Parallel()

	if !strings.Contains(listTransactionsQuery, "$3::uuid") {
		t.Fatalf("listTransactionsQuery = %q, want explicit uuid cast for nullable cursor", listTransactionsQuery)
	}
}
