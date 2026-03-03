-include .env
export CLOUDFLARE_API_TOKEN

INFRA_DIR := infra

.PHONY: tf-init tf-plan tf-apply tf-destroy tf-fmt help

tf-init: ## Initialize Terraform
	terraform -chdir=$(INFRA_DIR) init

tf-plan: ## Preview infrastructure changes
	terraform -chdir=$(INFRA_DIR) plan

tf-apply: ## Apply infrastructure changes
	terraform -chdir=$(INFRA_DIR) apply

tf-destroy: ## Destroy infrastructure
	terraform -chdir=$(INFRA_DIR) destroy

tf-fmt: ## Format Terraform files
	terraform fmt $(INFRA_DIR)

help: ## Show this help
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

.DEFAULT_GOAL := help
