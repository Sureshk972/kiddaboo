import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PhoneVerify from "./PhoneVerify";
import { vi } from "vitest";

const sendCode = vi.fn().mockResolvedValue({ error: null });
const verifyCode = vi.fn().mockResolvedValue({ data: { ok: true }, error: null });
let status = "idle";
let error = null;
vi.mock("../../hooks/usePhoneVerification", () => ({
  usePhoneVerification: () => ({ status, error, sendCode, verifyCode, reset: vi.fn() }),
}));

test("full flow: enter phone, send code, enter code, verified", async () => {
  status = "idle";
  error = null;
  render(<MemoryRouter><PhoneVerify /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: "+15551234567" } });
  fireEvent.click(screen.getByRole("button", { name: /send code/i }));
  await waitFor(() => expect(sendCode).toHaveBeenCalledWith("+15551234567"));
});

test("send_error keeps the user on the phone form with helpful copy", () => {
  status = "send_error";
  error = "sms_failed";
  render(<MemoryRouter><PhoneVerify /></MemoryRouter>);
  expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
  expect(screen.queryByLabelText(/6-digit code/i)).not.toBeInTheDocument();
  expect(screen.getByText(/couldn't text that number/i)).toBeInTheDocument();
});

test("send_error shows rate-limit copy when relevant", () => {
  status = "send_error";
  error = "rate_limited";
  render(<MemoryRouter><PhoneVerify /></MemoryRouter>);
  expect(screen.getByText(/too many code requests/i)).toBeInTheDocument();
});

test("phone_in_use error shows sign-in CTA on code form", () => {
  status = "verify_error";
  error = "phone_in_use";
  render(<MemoryRouter><PhoneVerify /></MemoryRouter>);
  expect(screen.getByText(/already linked to another account/i)).toBeInTheDocument();
  const link = screen.getByRole("link", { name: /sign in instead/i });
  expect(link).toHaveAttribute("href", "/login");
});
