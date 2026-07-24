package unit

import (
	"os"
	"strings"
	"testing"
)

func TestArchivedConflictHandlerCodeExists(t *testing.T) {
	content, err := os.ReadFile("handler.go")
	if err != nil {
		t.Fatal(err)
	}
	source := string(content)
	for _, fragment := range []string{
		"UNIT_ARCHIVED_NAME_CONFLICT",
		"INVALID_UNIT_ID",
		"includeArchived",
		`map[string]any{"id": archived.ID.String()}`,
	} {
		if !strings.Contains(source, fragment) {
			t.Fatalf("handler.go missing %q", fragment)
		}
	}
}
