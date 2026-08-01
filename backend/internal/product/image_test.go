package product

import (
	"bytes"
	"image"
	"image/color"
	"image/jpeg"
	"testing"
)

var (
	orientationRed    = color.RGBA{R: 255, G: 40, B: 40, A: 255}
	orientationGreen  = color.RGBA{R: 40, G: 255, B: 40, A: 255}
	orientationBlue   = color.RGBA{R: 40, G: 40, B: 255, A: 255}
	orientationYellow = color.RGBA{R: 255, G: 255, B: 40, A: 255}
)

func TestValidateProductImageAppliesExifOrientation(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name        string
		orientation uint16
		topLeft     color.RGBA
		topRight    color.RGBA
		bottomLeft  color.RGBA
		bottomRight color.RGBA
	}{
		{name: "normal", orientation: 1, topLeft: orientationRed, topRight: orientationGreen, bottomLeft: orientationBlue, bottomRight: orientationYellow},
		{name: "mirror horizontal", orientation: 2, topLeft: orientationGreen, topRight: orientationRed, bottomLeft: orientationYellow, bottomRight: orientationBlue},
		{name: "rotate 180", orientation: 3, topLeft: orientationYellow, topRight: orientationBlue, bottomLeft: orientationGreen, bottomRight: orientationRed},
		{name: "mirror vertical", orientation: 4, topLeft: orientationBlue, topRight: orientationYellow, bottomLeft: orientationRed, bottomRight: orientationGreen},
		{name: "transpose", orientation: 5, topLeft: orientationRed, topRight: orientationBlue, bottomLeft: orientationGreen, bottomRight: orientationYellow},
		{name: "rotate 90 cw", orientation: 6, topLeft: orientationBlue, topRight: orientationRed, bottomLeft: orientationYellow, bottomRight: orientationGreen},
		{name: "transverse", orientation: 7, topLeft: orientationYellow, topRight: orientationGreen, bottomLeft: orientationBlue, bottomRight: orientationRed},
		{name: "rotate 270 cw", orientation: 8, topLeft: orientationGreen, topRight: orientationYellow, bottomLeft: orientationRed, bottomRight: orientationBlue},
	}

	for _, test := range tests {
		test := test
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()

			validated, err := validateProductImage(ImageUpload{
				Filename: "portrait.jpg",
				Data:     jpegWithExifOrientation(t, test.orientation),
			})
			if err != nil {
				t.Fatal(err)
			}
			decoded, format, err := image.Decode(bytes.NewReader(validated.Data))
			if err != nil || format != "jpeg" {
				t.Fatalf("compressed image format = %q, error = %v", format, err)
			}
			assertPixelClose(t, decoded, 1, 1, test.topLeft)
			assertPixelClose(t, decoded, 5, 1, test.topRight)
			assertPixelClose(t, decoded, 1, 5, test.bottomLeft)
			assertPixelClose(t, decoded, 5, 5, test.bottomRight)
		})
	}
}

func TestValidateProductImageKeepsImageWithoutExifOrientation(t *testing.T) {
	t.Parallel()

	validated, err := validateProductImage(ImageUpload{
		Filename: "plain.jpg",
		Data:     jpegQuadrantImage(t, 0),
	})
	if err != nil {
		t.Fatal(err)
	}
	decoded, _, err := image.Decode(bytes.NewReader(validated.Data))
	if err != nil {
		t.Fatal(err)
	}
	assertPixelClose(t, decoded, 1, 1, orientationRed)
	assertPixelClose(t, decoded, 5, 1, orientationGreen)
	assertPixelClose(t, decoded, 1, 5, orientationBlue)
	assertPixelClose(t, decoded, 5, 5, orientationYellow)
}

func jpegWithExifOrientation(t *testing.T, orientation uint16) []byte {
	t.Helper()
	encoded := jpegQuadrantImage(t, orientation)
	if orientation < 2 || orientation > 8 {
		return encoded
	}
	tiffData := []byte{
		0x49, 0x49, 0x2A, 0x00, // "II" little-endian TIFF header
		0x08, 0x00, 0x00, 0x00, // offset to IFD0
		0x01, 0x00, // one IFD entry
		0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, // tag 0x0112, type SHORT, count 1
		byte(orientation), 0x00, 0x00, 0x00, // value
		0x00, 0x00, 0x00, 0x00, // next IFD offset
	}
	app1 := make([]byte, 0, 2+6+len(tiffData))
	app1 = append(app1, 0xFF, 0xE1)
	segmentLength := 2 + 6 + len(tiffData)
	app1 = append(app1, byte(segmentLength>>8), byte(segmentLength))
	app1 = append(app1, "Exif\x00\x00"...)
	app1 = append(app1, tiffData...)

	result := make([]byte, 0, len(encoded)+len(app1))
	result = append(result, encoded[:2]...)
	result = append(result, app1...)
	result = append(result, encoded[2:]...)
	return result
}

func jpegQuadrantImage(t *testing.T, _ uint16) []byte {
	t.Helper()
	source := image.NewRGBA(image.Rect(0, 0, 8, 8))
	for y := 0; y < 8; y++ {
		for x := 0; x < 8; x++ {
			var pixel color.RGBA
			switch {
			case x < 4 && y < 4:
				pixel = orientationRed
			case x >= 4 && y < 4:
				pixel = orientationGreen
			case x < 4 && y >= 4:
				pixel = orientationBlue
			default:
				pixel = orientationYellow
			}
			source.SetRGBA(x, y, pixel)
		}
	}
	var encoded bytes.Buffer
	if err := jpeg.Encode(&encoded, source, &jpeg.Options{Quality: 100}); err != nil {
		t.Fatal(err)
	}
	return encoded.Bytes()
}

func assertPixelClose(t *testing.T, img image.Image, x, y int, want color.RGBA) {
	t.Helper()
	r, g, b, _ := img.At(x, y).RGBA()
	got := []int{int(r >> 8), int(g >> 8), int(b >> 8)}
	wantChannels := []int{int(want.R), int(want.G), int(want.B)}
	for channel := range got {
		if diff := got[channel] - wantChannels[channel]; diff > 60 || diff < -60 {
			t.Fatalf("pixel (%d,%d) channel %d = %d, want %d (±60)", x, y, channel, got[channel], wantChannels[channel])
		}
	}
}
