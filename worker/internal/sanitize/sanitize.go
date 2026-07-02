package sanitize

import (
	"fmt"
	"regexp"
	"strings"
)

var blockedPatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?i)\b(child\s*porn|csam|underage\s*(sex|porn|nude))\b`),
	regexp.MustCompile(`(?i)\b(hitman|assassination\s*for\s*hire|buy\s*(cocaine|heroin|meth|fentanyl))\b`),
	regexp.MustCompile(`(?i)\b(credit\s*card\s*dump|stolen\s*credentials|credential\s*stuffing)\b`),
	regexp.MustCompile(`(?i)\b(porn(ography)?|xxx|hentai|onlyfans\s*leak|nude\s*(pics|photos|videos))\b`),
	regexp.MustCompile(`(?i)\b(escort\s*service|adult\s*webcam|sex\s*chat)\b`),
	regexp.MustCompile(`(?i)\b(revenge\s*porn|doxx(ing)?|swatting)\b`),
}

func JobFields(name, targetURL, domain string) error {
	combined := strings.ToLower(name + " " + targetURL + " " + domain)
	for _, p := range blockedPatterns {
		if p.MatchString(combined) {
			return fmt.Errorf("job contains blocked illegal or NSFW terms")
		}
	}
	if strings.HasPrefix(strings.ToLower(strings.TrimSpace(targetURL)), "javascript:") {
		return fmt.Errorf("invalid URL scheme")
	}
	return nil
}
