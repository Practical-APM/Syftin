package fetch

import (
	"sync"
	"time"
)

// DomainRateLimit enforces a minimum delay between fetches per domain.
type DomainRateLimit struct {
	mu    sync.Mutex
	last  map[string]time.Time
	delay time.Duration
}

func NewDomainRateLimit(delay time.Duration) *DomainRateLimit {
	if delay <= 0 {
		delay = 5 * time.Second
	}
	return &DomainRateLimit{
		last:  make(map[string]time.Time),
		delay: delay,
	}
}

func (r *DomainRateLimit) Wait(domain string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if prev, ok := r.last[domain]; ok {
		wait := r.delay - time.Since(prev)
		if wait > 0 {
			time.Sleep(wait)
		}
	}
	r.last[domain] = time.Now()
}
