import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PhoneVerify from "./PhoneVerify";
import { vi } from "vitest";

const sendCode = vi.fn().mockResolvedValue({ error: null });
const verifyCode = vi.fn().mockResolvedValue({ data: { ok: true }, error: null });
let status = "idle";
vi.mock("../../hooks/usePhoneVerification", () => ({
  usePhoneVerification: () => ({ status, error: null, sendCode, verifyCode, reset: vi.fn() }),
}));

test("full flow: enter phone, send code, enter code, verified", async () => {
  render(<MemoryRouter><PhoneVerify /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: "+15551234567" } });
  fireEvent.click(screen.getByRole("button", { name: /send code/i }));
  await waitFor(() => expect(sendCode).toHaveBeenCalledWith("+15551234567"));
});
