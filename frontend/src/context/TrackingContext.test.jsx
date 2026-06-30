import { render, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, test, expect, vi, beforeEach } from "vitest";
import { TrackingProvider } from "./TrackingContext";
import * as tracking from "../lib/tracking";

vi.mock("../lib/tracking", () => ({
  initTracking: vi.fn(() => () => {}),
  pushEvent: vi.fn(),
  getSessionId: vi.fn(() => "sess-1"),
}));

vi.mock("./AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u1" },
    profile: { account_type: "parent", analytics_opt_out: false },
  }),
}));

beforeEach(() => {
  tracking.pushEvent.mockClear();
});

describe("TrackingProvider", () => {
  test("emits a pageview on initial mount", () => {
    render(
      <MemoryRouter initialEntries={["/welcome"]}>
        <TrackingProvider>
          <div>w</div>
        </TrackingProvider>
      </MemoryRouter>
    );
    expect(tracking.pushEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "pageview",
        event_name: "/welcome",
        user_id: "u1",
        user_role: "parent",
        session_id: "sess-1",
      })
    );
  });

  test("captures clicks on data-track elements", () => {
    const { getByText } = render(
      <MemoryRouter initialEntries={["/x"]}>
        <TrackingProvider>
          <button data-track="parent_book_confirm">Confirm</button>
        </TrackingProvider>
      </MemoryRouter>
    );
    tracking.pushEvent.mockClear();
    fireEvent.click(getByText("Confirm"));
    expect(tracking.pushEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "click",
        event_name: "parent_book_confirm",
        user_id: "u1",
      })
    );
  });

  test("ignores clicks on elements without data-track", () => {
    const { getByText } = render(
      <MemoryRouter initialEntries={["/x"]}>
        <TrackingProvider>
          <button>Plain</button>
        </TrackingProvider>
      </MemoryRouter>
    );
    tracking.pushEvent.mockClear();
    fireEvent.click(getByText("Plain"));
    const clickCalls = tracking.pushEvent.mock.calls.filter(
      ([e]) => e.event_type === "click"
    );
    expect(clickCalls).toHaveLength(0);
  });

  test("emits nothing when profile.analytics_opt_out is true", async () => {
    vi.resetModules();
    vi.doMock("./AuthContext", () => ({
      useAuth: () => ({
        user: { id: "u1" },
        profile: { account_type: "parent", analytics_opt_out: true },
      }),
    }));
    const { TrackingProvider: OptedOutProvider } = await import("./TrackingContext");
    tracking.pushEvent.mockClear();
    const { getByText } = render(
      <MemoryRouter initialEntries={["/x"]}>
        <OptedOutProvider>
          <button data-track="parent_book_confirm">Confirm</button>
        </OptedOutProvider>
      </MemoryRouter>
    );
    fireEvent.click(getByText("Confirm"));
    expect(tracking.pushEvent).not.toHaveBeenCalled();
    vi.doUnmock("./AuthContext");
  });
});
