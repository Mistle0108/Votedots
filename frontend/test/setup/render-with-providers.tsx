import type { ReactElement, ReactNode } from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nProvider } from "@/shared/i18n";

interface RenderWithProvidersOptions {
  route?: string;
  locale?: "ko" | "en";
  wrapper?: (children: ReactNode) => ReactNode;
}

export function renderWithProviders(
  ui: ReactElement,
  options: RenderWithProvidersOptions = {},
) {
  const { route = "/", locale = "en", wrapper } = options;

  window.localStorage.setItem("votedots-locale", locale);

  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={[route]}>
        {wrapper ? wrapper(ui) : ui}
      </MemoryRouter>
    </I18nProvider>,
  );
}
