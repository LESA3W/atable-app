"use client";

import { useEffect } from "react";
import { SocialLogin } from "@capgo/capacitor-social-login";

// OAuth popup landing page (web only). @capgo/capacitor-social-login opens Google sign-in in a popup
// that redirects back HERE with the token in the URL fragment. Touching the plugin (any method call)
// loads its web module, whose constructor detects it's a popup + reads the fragment, posts the token
// back to the opener window, and closes this popup. So this page just has to instantiate the plugin
// and show a brief "connecting" state — the opener's login() promise resolves on the message.
export default function GoogleOAuthCallback() {
  useEffect(() => {
    void SocialLogin.initialize({}).catch(() => {});
  }, []);
  return (
    <main className="grid min-h-[100dvh] place-items-center p-6 text-center text-lg font-bold text-stone-600">
      Connexion en cours…
    </main>
  );
}
