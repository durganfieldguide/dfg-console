import type { NormalizedSourceAdapter } from './types';

/**
 * Source adapter registry.
 * 
 * Allows runScout to remain ignorant of which sources exist.
 * Adapters self-register on import, enabling modular source addition.
 * 
 * Design decision: We intentionally allow overwrites during iterative 
 * development to avoid "double registration" crashes when modules reload.
 * In production, each adapter should only register once at worker startup.
 */
class SourceRegistry {
  private adapters = new Map<string, NormalizedSourceAdapter>();

  /**
   * Register a source adapter.
   * Overwrites existing registration silently (hot-reload friendly).
   */
  register(adapter: NormalizedSourceAdapter): void {
    const source = typeof adapter?.source === 'string' ? adapter.source.trim() : '';
    if (!source) {
      throw new Error('Cannot register adapter without a valid non-empty source string');
    }

    const isOverwrite = this.adapters.has(source);
    this.adapters.set(source, adapter);

    if (isOverwrite) {
      console.log(`[Registry] Re-registered adapter: ${source} (dev hot-reload)`);
    } else {
      console.log(`[Registry] Registered adapter: ${source}`);
    }
  }

  /**
   * Get adapter by source name.
   * Throws if adapter not registered.
   */
  get(source: string): NormalizedSourceAdapter {
    const key = String(source || '').trim();
    const adapter = this.adapters.get(key);
    if (!adapter) {
      throw new Error(
        `No adapter registered for source '${key}'. Available: ${this.list().join(', ')}`
      );
    }
    return adapter;
  }

  /**
   * Check if adapter exists for source.
   */
  has(source: string): boolean {
    const key = String(source || '').trim();
    return this.adapters.has(key);
  }

  /**
   * List all registered source names.
   */
  list(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Get all registered adapters.
   */
  getAll(): NormalizedSourceAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Get count of registered adapters.
   */
  count(): number {
    return this.adapters.size;
  }

  /**
   * Clear all registrations (testing only).
   */
  clear(): void {
    this.adapters.clear();
  }
}

export const registry = new SourceRegistry();