package cursor

import (
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"

	"github.com/google/uuid"
)

const CurrentVersion = 1

var ErrInvalid = errors.New("invalid cursor")

type Payload struct {
	Version     int             `json:"v"`
	Sort        string          `json:"s"`
	Direction   string          `json:"d"`
	Fingerprint string          `json:"f"`
	Value       json.RawMessage `json:"x"`
	ID          uuid.UUID       `json:"id"`
}

func Fingerprint(parts ...string) string {
	sum := sha256.Sum256([]byte(strings.Join(parts, "\x00")))
	return hex.EncodeToString(sum[:])
}

func Encode(payload Payload) (string, error) {
	if payload.Version != CurrentVersion ||
		payload.Sort == "" ||
		(payload.Direction != "asc" && payload.Direction != "desc") ||
		payload.Fingerprint == "" ||
		len(payload.Value) == 0 ||
		payload.ID == uuid.Nil {
		return "", ErrInvalid
	}
	value, err := json.Marshal(payload)
	if err != nil {
		return "", ErrInvalid
	}
	return base64.RawURLEncoding.EncodeToString(value), nil
}

func Decode(raw string) (Payload, error) {
	var payload Payload
	value, err := base64.RawURLEncoding.DecodeString(raw)
	if err != nil || json.Unmarshal(value, &payload) != nil {
		return Payload{}, ErrInvalid
	}
	if _, err = Encode(payload); err != nil {
		return Payload{}, ErrInvalid
	}
	return payload, nil
}

func Compatible(payload Payload, sort, direction, fingerprint string) error {
	if payload.Sort != sort || payload.Direction != direction || payload.Fingerprint != fingerprint {
		return ErrInvalid
	}
	return nil
}
