package entitlement

import (
	"errors"
	"testing"
)

func TestNormalizeAdminInput(t *testing.T) {
	input, err := NormalizeAdminInput(AdminInput{
		OrgID: " org_123 ", Status: StatusPaidActive,
		Actor: " dika ", Note: " invoice INV-12 ",
	})
	if err != nil {
		t.Fatal(err)
	}
	if input.OrgID != "org_123" || input.Actor != "dika" || input.Note != "invoice INV-12" {
		t.Fatalf("input=%#v", input)
	}
}

func TestNormalizeAdminInputRejectsTrialReset(t *testing.T) {
	_, err := NormalizeAdminInput(AdminInput{OrgID: "org", Status: StatusTrial, Actor: "admin"})
	if !errors.Is(err, ErrInvalidAdminTransition) {
		t.Fatalf("err=%v", err)
	}
}
