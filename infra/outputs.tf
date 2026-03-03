output "finfeed_url" {
  description = "The FinFeed URL"
  value       = "https://finfeed.${var.domain}"
}

output "zone_id" {
  description = "The Cloudflare zone ID"
  value       = local.zone_id
}
