import { MsalProvider } from "@azure/msal-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { RouterProvider } from "react-router";
import { msalInstance } from "./auth/instance";
import { ColorModeApplier } from "./components/ColorMode";
import { router } from "./router";

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5000,
    },
  },
});

/**
 * Main react entry point for the app.
 */
export default function App() {
  return (
    <StrictMode>
      <ColorModeApplier>
        <QueryClientProvider client={queryClient}>
          <MsalProvider instance={msalInstance}>
            {/* Uncomment this to require login for the whole app */}
            {/* <MsalAuthenticationTemplate
              interactionType={InteractionType.Redirect}
              authenticationRequest={loginRequest}
            > */}
            <RouterProvider router={router} />
            {/* </MsalAuthenticationTemplate> */}
          </MsalProvider>
        </QueryClientProvider>
      </ColorModeApplier>
    </StrictMode>
  );
}
