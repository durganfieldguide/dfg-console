-- Migration 008: Add AI analysis result column to analysis_runs
-- This stores the full DualLensReport from dfg-analyst for persistence

ALTER TABLE analysis_runs ADD COLUMN ai_analysis_json TEXT;
