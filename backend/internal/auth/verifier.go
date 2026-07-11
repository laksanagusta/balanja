package auth

import (
	"context"
	"fmt"
	"strings"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/golang-jwt/jwt/v5"
)

type ClerkVerifier struct {
	issuer   string
	audience string
	keys     keyfunc.Keyfunc
}

type clerkClaims struct {
	OrgID string `json:"org_id"`
	jwt.RegisteredClaims
}

func NewClerkVerifier(ctx context.Context, issuer, audience string) (*ClerkVerifier, error) {
	issuer = strings.TrimRight(strings.TrimSpace(issuer), "/")
	if issuer == "" || strings.TrimSpace(audience) == "" {
		return nil, fmt.Errorf("Clerk issuer and audience are required")
	}
	keys, err := keyfunc.NewDefaultCtx(ctx, []string{issuer + "/.well-known/jwks.json"})
	if err != nil {
		return nil, fmt.Errorf("load Clerk JWKS: %w", err)
	}
	return &ClerkVerifier{issuer: issuer, audience: strings.TrimSpace(audience), keys: keys}, nil
}

func (v *ClerkVerifier) Verify(ctx context.Context, raw string) (Identity, error) {
	claims := &clerkClaims{}
	token, err := jwt.ParseWithClaims(raw, claims, v.keys.KeyfuncCtx(ctx),
		jwt.WithValidMethods([]string{jwt.SigningMethodRS256.Alg()}),
		jwt.WithIssuer(v.issuer),
		jwt.WithAudience(v.audience),
		jwt.WithExpirationRequired(),
	)
	if err != nil || !token.Valid {
		return Identity{}, fmt.Errorf("verify Clerk token")
	}
	if claims.Subject == "" {
		return Identity{}, fmt.Errorf("Clerk token subject is required")
	}
	return Identity{UserID: claims.Subject, OrgID: claims.OrgID}, nil
}
