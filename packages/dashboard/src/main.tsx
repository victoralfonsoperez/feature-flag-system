import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
import App from './App';
import './index.css';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const env = (import.meta as any).env ?? {};
const domain = env.VITE_AUTH0_DOMAIN || '';
const clientId = env.VITE_AUTH0_CLIENT_ID || '';
const audience = env.VITE_AUTH0_AUDIENCE || '';
const callbackUrl = env.VITE_AUTH0_CALLBACK_URL || window.location.origin;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: callbackUrl,
        audience,
      }}
    >
      <App />
    </Auth0Provider>
  </StrictMode>
);
