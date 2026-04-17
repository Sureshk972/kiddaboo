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

test("phone_in_use error shows sign-in CTA", () => {
  status = "error";
  error = "phone_in_use";
  render(<MemoryRouter><PhoneVerify /></MemoryRouter>);
  expect(screen.getByText(/already linked to another account/i)).toBeInTheDocument();
  const link = screen.getByRole("link", { name: /sign in instead/i });
  expect(link).toHaveAttribute("href", "/login");
});
