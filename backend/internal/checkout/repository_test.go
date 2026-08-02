package checkout

import (
	"testing"

	"github.com/google/uuid"
)

func TestProductsCoverItemsAllowsMultipleVariantsOfOneProduct(t *testing.T) {
	productID := uuid.New()
	variantA := uuid.New()
	variantB := uuid.New()
	products := map[uuid.UUID]lockedProduct{productID: {ID: productID}}

	items := []ItemInput{
		{ProductID: productID, VariantID: &variantA, Quantity: 1},
		{ProductID: productID, VariantID: &variantB, Quantity: 1},
	}

	if !productsCoverItems(products, items) {
		t.Fatal("productsCoverItems rejected multiple variant lines for one product")
	}
}

func TestProductsCoverItemsRejectsMissingProduct(t *testing.T) {
	productID := uuid.New()
	missingID := uuid.New()
	products := map[uuid.UUID]lockedProduct{productID: {ID: productID}}

	if productsCoverItems(products, []ItemInput{{ProductID: missingID, Quantity: 1}}) {
		t.Fatal("productsCoverItems accepted a missing product")
	}
}
