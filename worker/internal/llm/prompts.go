package llm

import "strings"

func domainHint(domain string) string {
	switch strings.TrimPrefix(strings.ToLower(domain), "www.") {
	case "naukri.com":
		return "Focus on job listing rows: title, company, skills, posted_date."
	case "blinkit.com", "zeptonow.com":
		return "Focus on grocery product cards: product_name, price_inr, mrp_inr, in_stock."
	case "flipkart.com", "amazon.in", "myntra.com":
		return "Focus on product listing cards with name, price, rating, and stock status."
	case "mca.gov.in":
		return "Focus on company registry rows: company_name, cin, filing_date, filing_type."
	case "zomato.com", "swiggy.com":
		return "Focus on restaurant listings: name, cuisine, rating, delivery time."
	case "indiamart.com":
		return "Focus on supplier product listings with name, supplier, price, location."
	default:
		return "Extract every distinct record visible on the page that matches the schema."
	}
}
