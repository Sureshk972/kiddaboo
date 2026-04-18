import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import InviteFamiliesSheet from "./InviteFamiliesSheet";

describe("InviteFamiliesSheet", () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  test("returns null when closed", () => {
    const { container } = render(
      <InviteFamiliesSheet isOpen={false} onClose={() => {}} playgroupId="abc" />
    );
    expect(container).toBeEmptyDOMElement();
  });

  test("renders the playgroup URL as a shareable link", () => {
    render(
      <InviteFamiliesSheet
        isOpen={true}
        onClose={() => {}}
        playgroupId="abc-123"
        playgroupName="Westside Toddlers"
      />
    );
    const input = screen.getByDisplayValue(/\/playgroup\/abc-123$/);
    expect(input).toBeInTheDocument();
  });

  test("copy button writes the URL to the clipboard", async () => {
    render(
      <InviteFamiliesSheet isOpen={true} onClose={() => {}} playgroupId="abc-123" />
    );
    fireEvent.click(screen.getByText(/Copy link/i));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringMatching(/\/playgroup\/abc-123$/)
    );
  });
});
