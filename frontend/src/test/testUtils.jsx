import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import { OnboardingProvider } from "../context/OnboardingContext";

export function renderWithProviders(ui, { route = "/", ...options } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <OnboardingProvider>{ui}</OnboardingProvider>
      </AuthProvider>
    </MemoryRouter>,
    options
  );
}

// Render with just router (for components that mock their own auth)
export function renderWithRouter(ui, { route = "/", ...options } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>,
    options
  );
}
