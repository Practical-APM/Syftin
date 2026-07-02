package fetch

import (
	"regexp"
	"strings"
)

var (
	scriptTagRe   = regexp.MustCompile(`(?is)<script[^>]*>.*?</script>`)
	styleTagRe    = regexp.MustCompile(`(?is)<style[^>]*>.*?</style>`)
	noscriptTagRe = regexp.MustCompile(`(?is)<noscript[^>]*>.*?</noscript>`)
	svgTagRe      = regexp.MustCompile(`(?is)<svg[^>]*>.*?</svg>`)
	commentRe     = regexp.MustCompile(`(?s)<!--.*?-->`)
	tagRe         = regexp.MustCompile(`<[^>]+>`)
	spaceRe       = regexp.MustCompile(`\s+`)
)

// ExtractTextContent strips markup and returns readable page text for LLM input.
func ExtractTextContent(html string) string {
	text := html
	text = commentRe.ReplaceAllString(text, " ")
	text = scriptTagRe.ReplaceAllString(text, " ")
	text = styleTagRe.ReplaceAllString(text, " ")
	text = noscriptTagRe.ReplaceAllString(text, " ")
	text = svgTagRe.ReplaceAllString(text, " ")

	// Preserve line breaks for block-level tags before stripping tags.
	blockTags := []string{"</p>", "</div>", "</li>", "</tr>", "<br>", "<br/>", "<br />"}
	for _, tag := range blockTags {
		text = strings.ReplaceAll(text, tag, "\n")
	}

	text = tagRe.ReplaceAllString(text, " ")
	text = decodeBasicEntities(text)
	text = spaceRe.ReplaceAllString(text, " ")
	text = strings.TrimSpace(text)

	return truncateText(text, 16000)
}

func decodeBasicEntities(s string) string {
	replacer := strings.NewReplacer(
		"&nbsp;", " ",
		"&amp;", "&",
		"&lt;", "<",
		"&gt;", ">",
		"&quot;", `"`,
		"&#39;", "'",
		"&apos;", "'",
	)
	return replacer.Replace(s)
}

func truncateText(text string, max int) string {
	if len(text) <= max {
		return text
	}
	// Prefer cutting at a word boundary near the limit.
	cut := text[:max]
	if idx := strings.LastIndex(cut, " "); idx > max/2 {
		cut = cut[:idx]
	}
	return cut + "…"
}
