import { renderHook, act, waitFor } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("../lib/supabase", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

import { usePhoneVerification } from "./usePhoneVerification";
import { supabase } from "../lib/supabase";

test("sendCode invokes the send-otp function with the phone", async () => {
  supabase.functions.invoke.mockResolvedValue({ data: { ok: true }, error: null });
  const { result } = renderHook(() => usePhoneVerification());
  await act(async () => {
    await result.current.sendCode("+15551234567");
  });
  expect(supabase.functions.invoke).toHaveBeenCalledWith("send-otp", { body: { phone: "+15551234567" } });
  await waitFor(() => expect(result.current.status).toBe("code_sent"));
});

test("sendCode surfaces sms_failed from ok:false body and transitions to send_error", async () => {
  supabase.functions.invoke.mockResolvedValue({ data: { ok: false, error: "sms_failed" }, error: null });
  const { result } = renderHook(() => usePhoneVerification());
  await act(async () => {
    await result.current.sendCode("+15551234567");
  });
  expect(result.current.error).toBe("sms_failed");
  expect(result.current.status).toBe("send_error");
});

test("verifyCode invokes verify-otp and transitions to verified on ok", async () => {
  supabase.functions.invoke.mockResolvedValue({ data: { ok: true, verified_at: "now" }, error: null });
  const { result } = renderHook(() => usePhoneVerification());
  await act(async () => {
    await result.current.verifyCode("+15551234567", "123456");
  });
  expect(supabase.functions.invoke).toHaveBeenCalledWith("verify-otp", { body: { phone: "+15551234567", code: "123456" } });
  await waitFor(() => expect(result.current.status).toBe("verified"));
});

test("verifyCode surfaces mismatch error as verify_error", async () => {
  supabase.functions.invoke.mockResolvedValue({ data: null, error: { message: "code_mismatch" } });
  const { result } = renderHook(() => usePhoneVerification());
  await act(async () => {
    await result.current.verifyCode("+15551234567", "000000");
  });
  expect(result.current.error).toBe("code_mismatch");
  expect(result.current.status).toBe("verify_error");
});

test("verifyCode surfaces phone_in_use from ok:false body", async () => {
  supabase.functions.invoke.mockResolvedValue({ data: { ok: false, error: "phone_in_use" }, error: null });
  const { result } = renderHook(() => usePhoneVerification());
  await act(async () => {
    await result.current.verifyCode("+15551234567", "123456");
  });
  expect(result.current.error).toBe("phone_in_use");
  expect(result.current.status).toBe("verify_error");
});
