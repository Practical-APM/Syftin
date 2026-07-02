package retry

import (
	"strings"
	"time"
)

func Do(attempts int, baseDelay time.Duration, fn func() error) error {
	if attempts < 1 {
		attempts = 1
	}
	var err error
	for i := 0; i < attempts; i++ {
		err = fn()
		if err == nil {
			return nil
		}
		if i == attempts-1 || !IsTransient(err) {
			return err
		}
		time.Sleep(baseDelay * time.Duration(i+1))
	}
	return err
}

func IsTransient(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	transient := []string{
		"timeout",
		"connection reset",
		"connection refused",
		"temporary failure",
		"ollama unreachable",
		"http 429",
		"http 502",
		"http 503",
		"http 504",
		"eof",
	}
	for _, needle := range transient {
		if strings.Contains(msg, needle) {
			return true
		}
	}
	return false
}
