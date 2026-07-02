package fetch

import (
	"strings"
	"testing"
)

func TestExtractTextContent(t *testing.T) {
	html := `<!DOCTYPE html>
<html>
<head><title>Test Page</title><style>.x{color:red}</style></head>
<body>
<script>alert("ignore")</script>
<h1>Product List</h1>
<ul>
  <li>Amul Milk — ₹56</li>
  <li>Bread — ₹40</li>
</ul>
</body>
</html>`

	text := ExtractTextContent(html)

	if strings.Contains(text, "alert") {
		t.Fatalf("script content leaked into text: %q", text)
	}
	if strings.Contains(text, "color:red") {
		t.Fatalf("style content leaked into text: %q", text)
	}
	if !strings.Contains(text, "Amul Milk") {
		t.Fatalf("expected product text, got: %q", text)
	}
	if !strings.Contains(text, "Bread") {
		t.Fatalf("expected bread text, got: %q", text)
	}
}
