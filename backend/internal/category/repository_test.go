package category

import (
	"os"
	"slices"
	"strings"
	"testing"
)

func TestDefaultCategoriesAreStableAndAlphabetical(t *testing.T) {
	t.Parallel()

	want := []string{"Minuman", "Perawatan", "Rumah Tangga", "Sembako", "Snack"}
	if !slices.Equal(defaultCategoryNames, want) {
		t.Fatalf("defaultCategoryNames = %#v", defaultCategoryNames)
	}
}

func TestRepositorySourceContainsInitializationAndListClauses(t *testing.T) {
	t.Parallel()

	content, err := os.ReadFile("repository.go")
	if err != nil {
		t.Fatal(err)
	}
	source := strings.ToLower(string(content))
	for _, fragment := range []string{
		"insert into categories (org_id,name) select $1,name from unnest($2::text[]) name where not exists (select 1 from categories where org_id=$1) on conflict do nothing",
		"where org_id=$1 and ($2 or active) order by lower(name),id",
		"select id, active from categories where org_id=$1 and lower(name)=lower($2)",
		"set active=$3",
	} {
		if !strings.Contains(source, fragment) {
			t.Fatalf("repository.go missing %q", fragment)
		}
	}
}
