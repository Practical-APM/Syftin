.PHONY: test build-node release-node

test:
	go test ./...

build-node:
	CGO_ENABLED=0 go build -ldflags "-s -w" -o bin/syftin-node ./cmd/node

# Build all contributor release targets into ../web/public/releases/
release-node:
	@mkdir -p ../web/public/releases bin
	@for target in darwin-arm64 darwin-amd64 linux-arm64 linux-amd64; do \
		os=$${target%-*}; arch=$${target#*-}; \
		echo "Building syftin-node-$$target..."; \
		GOOS=$$os GOARCH=$$arch CGO_ENABLED=0 go build -ldflags "-s -w" \
			-o ../web/public/releases/syftin-node-$$target ./cmd/node; \
	done
	@chmod +x ../web/public/releases/syftin-node-*
	@echo "Done — binaries in web/public/releases/"
