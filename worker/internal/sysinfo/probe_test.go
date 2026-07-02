package sysinfo

import "testing"

func TestRecommendTier(t *testing.T) {
	if got := recommendTier(16, true, true); got != "titan" {
		t.Fatalf("expected titan, got %s", got)
	}
	if got := recommendTier(16, true, false); got != "ranger" {
		t.Fatalf("expected ranger, got %s", got)
	}
	if got := recommendTier(8, false, false); got != "scout" {
		t.Fatalf("expected scout, got %s", got)
	}
}

func TestRecommendFetchMode(t *testing.T) {
	if got := recommendFetchMode("ranger", true); got != "auto" {
		t.Fatalf("expected auto, got %s", got)
	}
	if got := recommendFetchMode("scout", true); got != "http" {
		t.Fatalf("expected http, got %s", got)
	}
}

func TestProbePopulatesFields(t *testing.T) {
	caps := Probe()
	if caps.OS == "" || caps.Arch == "" {
		t.Fatal("expected os and arch")
	}
	if caps.NodeType != "edge_fetcher" {
		t.Fatalf("expected edge_fetcher, got %s", caps.NodeType)
	}
	if caps.RecommendedTier == "" || caps.FetchMode == "" {
		t.Fatal("expected tier and fetch mode")
	}
}
