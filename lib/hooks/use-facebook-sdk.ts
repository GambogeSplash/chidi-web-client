/**
 * Facebook SDK loader hook for WhatsApp Embedded Signup.
 * 
 * Dynamically loads the Facebook JS SDK and provides methods for
 * launching the Embedded Signup flow.
 */

import { useState, useCallback, useRef } from 'react';

declare global {
  interface Window {
    FB: {
      init: (params: {
        appId: string;
        cookie?: boolean;
        xfbml?: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: FacebookLoginResponse) => void,
        options: FacebookLoginOptions
      ) => void;
    };
    fbAsyncInit: () => void;
  }
}

interface FacebookLoginOptions {
  config_id: string;
  response_type: string;
  override_default_response_type: boolean;
  extras: {
    setup: Record<string, unknown>;
    featureType: string;
    sessionInfoVersion: string;
  };
}

interface FacebookLoginResponse {
  status: 'connected' | 'not_authorized' | 'unknown';
  authResponse?: {
    accessToken: string;
    expiresIn: number;
    signedRequest: string;
    userID: string;
    code?: string;
  };
}

export interface EmbeddedSignupResult {
  waba_id: string;
  phone_number_id: string;
  code?: string;
}

interface UseFacebookSDKOptions {
  appId: string;
  configId: string;
}

export function useFacebookSDK() {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initPromiseRef = useRef<Promise<void> | null>(null);

  const loadSDK = useCallback(async (appId: string): Promise<void> => {
    if (initPromiseRef.current) {
      return initPromiseRef.current;
    }

    if (typeof window !== 'undefined' && window.FB) {
      setIsReady(true);
      return Promise.resolve();
    }

    initPromiseRef.current = new Promise<void>((resolve, reject) => {
      setIsLoading(true);
      setError(null);

      window.fbAsyncInit = function () {
        window.FB.init({
          appId: appId,
          cookie: true,
          xfbml: true,
          version: 'v18.0',
        });
        setIsReady(true);
        setIsLoading(false);
        resolve();
      };

      if (document.getElementById('facebook-jssdk')) {
        if (window.FB) {
          window.FB.init({
            appId: appId,
            cookie: true,
            xfbml: true,
            version: 'v18.0',
          });
          setIsReady(true);
          setIsLoading(false);
          resolve();
        }
        return;
      }

      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';

      script.onerror = () => {
        const errorMsg = 'Failed to load Facebook SDK';
        setError(errorMsg);
        setIsLoading(false);
        reject(new Error(errorMsg));
      };

      const firstScript = document.getElementsByTagName('script')[0];
      firstScript.parentNode?.insertBefore(script, firstScript);

      setTimeout(() => {
        if (!window.FB) {
          const errorMsg = 'Facebook SDK load timeout';
          setError(errorMsg);
          setIsLoading(false);
          reject(new Error(errorMsg));
        }
      }, 10000);
    });

    return initPromiseRef.current;
  }, []);

  const launchEmbeddedSignup = useCallback(
    async (options: UseFacebookSDKOptions): Promise<EmbeddedSignupResult> => {
      const { appId, configId } = options;

      await loadSDK(appId);

      if (!window.FB) {
        throw new Error('Facebook SDK not initialized');
      }

      return new Promise((resolve, reject) => {
        const sessionInfoListener = (event: MessageEvent) => {
          if (event.origin !== 'https://www.facebook.com' && event.origin !== 'https://web.facebook.com') {
            return;
          }

          try {
            const data = JSON.parse(event.data);
            if (data.type === 'WA_EMBEDDED_SIGNUP') {
              if (data.event === 'FINISH') {
                const { phone_number_id, waba_id } = data.data;
                window.removeEventListener('message', sessionInfoListener);
                resolve({
                  waba_id,
                  phone_number_id,
                });
              } else if (data.event === 'CANCEL') {
                window.removeEventListener('message', sessionInfoListener);
                reject(new Error('User cancelled the signup flow'));
              } else if (data.event === 'ERROR') {
                window.removeEventListener('message', sessionInfoListener);
                reject(new Error(data.data?.error_message || 'Embedded signup error'));
              }
            }
          } catch {
            // Ignore non-JSON messages
          }
        };

        window.addEventListener('message', sessionInfoListener);

        window.FB.login(
          (response: FacebookLoginResponse) => {
            if (response.status !== 'connected') {
              window.removeEventListener('message', sessionInfoListener);
              reject(new Error('Facebook login failed or was cancelled'));
              return;
            }

            // The actual WABA data comes via postMessage, but we also get the auth code here
            // If we got here without the postMessage data, it means something went wrong
            // The postMessage listener will resolve/reject the promise
          },
          {
            config_id: configId,
            response_type: 'code',
            override_default_response_type: true,
            extras: {
              setup: {},
              featureType: '',
              sessionInfoVersion: '2',
            },
          }
        );

        // Timeout for the entire flow
        setTimeout(() => {
          window.removeEventListener('message', sessionInfoListener);
          reject(new Error('Embedded signup timed out'));
        }, 300000); // 5 minute timeout
      });
    },
    [loadSDK]
  );

  return {
    isLoading,
    isReady,
    error,
    loadSDK,
    launchEmbeddedSignup,
  };
}
