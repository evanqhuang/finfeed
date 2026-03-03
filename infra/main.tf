# Auto-discover the Cloudflare account ID from the API token
data "cloudflare_accounts" "main" {}

locals {
  account_id = data.cloudflare_accounts.main.result[0].id
  zone_id    = data.cloudflare_zones.site.result[0].id
}

# Look up the existing Cloudflare zone for the domain
data "cloudflare_zones" "site" {
  account = {
    id = local.account_id
  }
  name = var.domain
}

# Create CNAME record for fish subdomain pointing to GitHub Pages
resource "cloudflare_dns_record" "finfeed" {
  zone_id = local.zone_id
  name    = "finfeed"
  type    = "CNAME"
  content = "${var.github_username}.github.io"
  ttl     = 1
  proxied = true
  comment = "FinFeed fish tank stream"
}
