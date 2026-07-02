package extract

import (
	"encoding/json"
	"regexp"
)

var (
	emailPattern = regexp.MustCompile(`[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}`)
	phonePattern = regexp.MustCompile(`\+?[0-9]{10,13}`)
)

func redactPII(text string) string {
	text = emailPattern.ReplaceAllString(text, "[REDACTED_IDENTITY_MARKER]")
	text = phonePattern.ReplaceAllString(text, "[REDACTED_IDENTITY_MARKER]")
	return text
}

func redactPIIBytes(data json.RawMessage) json.RawMessage {
	return json.RawMessage(redactPII(string(data)))
}
