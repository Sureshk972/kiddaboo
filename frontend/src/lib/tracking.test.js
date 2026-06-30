import { describe, test, expect, beforeEach, vi } from "vitest";
import { supabase } from "./supabase";
import {
  getSessionId,
  pushEvent,
  drainBuffer,
  resetForTest,
  flush,
  initTracking,
} from "./tracking";

vi.mock("./supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

describe("tracking.js", () => {
  beforeEach(() => {
    resetForTest();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  // Sub-task 1: sessionId + buffer

  test("getSessionId is stable within a session and is a UUID-ish string", () => {
    const a = getSessionId();
    const b = getSessionId();
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f-]{36}$/i);
  });

  test("pushEvent adds to the buffer and drainBuffer empties it", () => {
    pushEvent({ event_type: "pageview", event_name: "/x", path: "/x" });
    pushEvent({ event_type: "click", event_name: "foo", path: "/x" });
    const drained = drainBuffer();
    expect(drained).toHaveLength(2);
    expect(drainBuffer()).toHaveLength(0);
  });

  // Sub-task 2: flush

  test("flush sends buffered events to supabase and clears the buffer", async () => {
    pushEvent({ event_type: "pageview", event_name: "/a", path: "/a" });
    pushEvent({ event_type: "click", event_name: "b", path: "/a" });
    await flush();
    expect(supabase.from).toHaveBeenCalledWith("events");
    const insertMock = supabase.from.mock.results[0].value.insert;
    expect(insertMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ event_type: "pageview", event_name: "/a" }),
        expect.objectContaining({ event_type: "click", event_name: "b" }),
      ])
    );
    expect(drainBuffer()).toHaveLength(0);
  });

  test("flush is a no-op when buffer is empty", async () => {
    await flush();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  // Sub-task 3: initTracking

  test("initTracking flushes every 5 seconds", async () => {
    vi.useFakeTimers();
    const teardown = initTracking();
    pushEvent({ event_type: "pageview", event_name: "/x", path: "/x" });
    await vi.advanceTimersByTimeAsync(5000);
    expect(supabase.from).toHaveBeenCalledWith("events");
    teardown();
    vi.useRealTimers();
  });

  test("initTracking flushes when buffer hits 50 entries", async () => {
    const teardown = initTracking();
    for (let i = 0; i < 50; i++) {
      pushEvent({ event_type: "click", event_name: `b${i}`, path: "/x" });
    }
    // Let microtasks run so the async flush resolves.
    await Promise.resolve();
    await Promise.resolve();
    expect(supabase.from).toHaveBeenCalled();
    teardown();
  });
});
