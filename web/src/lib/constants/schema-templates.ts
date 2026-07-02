export const DOMAIN_SCHEMA_TEMPLATES: Record<string, Record<string, unknown>> = {
  "naukri.com": {
    title: "Senior Frontend Engineer",
    company: "Example Corp",
    skills: ["React", "TypeScript"],
    posted_date: "2026-06-30",
  },
  "blinkit.com": {
    product_name: "Amul Taaza Milk 1L",
    price_inr: 56,
    mrp_inr: 62,
    in_stock: true,
  },
  "flipkart.com": {
    product_name: "Example Product",
    price_inr: 999,
    rating: 4.2,
    in_stock: true,
  },
  "amazon.in": {
    product_name: "Example Product",
    price_inr: 1299,
    rating: 4.5,
    in_stock: true,
  },
  "myntra.com": {
    product_name: "Cotton T-Shirt",
    brand: "Example Brand",
    price_inr: 799,
    discount_percent: 20,
  },
  "mca.gov.in": {
    company_name: "Example Pvt Ltd",
    cin: "U12345MH2020PTC123456",
    filing_date: "2026-06-20",
    filing_type: "Annual Return",
  },
  "zomato.com": {
    restaurant_name: "Example Restaurant",
    cuisine: "North Indian",
    rating: 4.1,
    delivery_time_mins: 35,
  },
  "swiggy.com": {
    restaurant_name: "Example Restaurant",
    cuisine: "South Indian",
    rating: 4.3,
    delivery_time_mins: 30,
  },
  "indiamart.com": {
    product_name: "Industrial Widget",
    supplier: "Example Supplier",
    price_inr: 5000,
    location: "Mumbai",
  },
  "zeptonow.com": {
    product_name: "Organic Tomatoes 500g",
    price_inr: 45,
    mrp_inr: 50,
    in_stock: true,
  },
};

export function schemaForDomain(domain: string): Record<string, unknown> {
  const normalized = domain.replace(/^www\./, "").toLowerCase();
  return (
    DOMAIN_SCHEMA_TEMPLATES[normalized] ?? {
      title: "Example record",
      description: "Brief description",
      value: "Sample value",
    }
  );
}

export function formatSchemaTemplate(schema: Record<string, unknown>): string {
  return JSON.stringify(schema, null, 2);
}
