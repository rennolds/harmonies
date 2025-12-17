<script>
  import { onMount } from "svelte";
  import { supabase } from "$lib/supabaseClient";
  import { goto } from "$app/navigation";

  onMount(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const tokenHash = urlParams.get("token_hash");
    const type = urlParams.get("type") || "email";
    const next = urlParams.get("next") || "/";

    // 1. Handle Magic Link (token_hash) - non-PKCE flow
    if (tokenHash) {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type,
      });

      if (error) {
        console.error("Verify OTP error:", error.message);

        // Check if session exists despite the error (token may have been consumed already)
        const { data: { user: existingUser } } = await supabase.auth.getUser();
        if (existingUser) {
          goto(next);
          return;
        }

        goto("/auth/auth-code-error");
      } else {
        goto(next);
      }
      return;
    }

    // 2. Handle PKCE code flow
    const code = urlParams.get("code");
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("PKCE exchange error:", error.message);

        // Check if session exists anyway
        const { data: { user: existingUser } } = await supabase.auth.getUser();
        if (existingUser) {
          goto(next);
          return;
        }

        goto("/auth/auth-code-error");
        return;
      }

      if (data?.session) {
        goto(next, { replaceState: true });
        return;
      }
    }

    // 3. Check if there's already a session
    const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Session error:", sessionError.message);
      goto("/auth/auth-code-error");
      return;
    }

    if (initialSession) {
      goto(next, { replaceState: true });
      return;
    }

    // 4. No session yet: fall back to waiting for auth state change
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      goto(next, { replaceState: true });
    } else {
      // Listen for the auth event
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_IN" && session) {
          supabase.auth.getUser().then(({ data }) => {
            if (data.user) {
              subscription.unsubscribe();
              goto(next, { replaceState: true });
            }
          });
        }
      });

      // Fallback if nothing happens after a timeout
      setTimeout(() => {
        subscription.unsubscribe();
        supabase.auth.getUser().then(({ data }) => {
          if (data.user) {
            goto("/");
          } else {
            const hashErrorDesc = hashParams.get("error_description");
            const queryErrorDesc = urlParams.get("error_description");

            if (queryErrorDesc || hashErrorDesc) {
              console.error("Auth error from URL:", queryErrorDesc || hashErrorDesc);
            }

            goto("/auth/auth-code-error");
          }
        });
      }, 4000);
    }
  });
</script>

<div class="callback-loading">
  <div class="spinner"></div>
  <p>Verifying authentication...</p>
</div>

<style>
  .callback-loading {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background-color: #121212;
    color: #fff;
    font-family: sans-serif;
    gap: 20px;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(186, 129, 194, 0.3);
    border-top-color: #ba81c2;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  p {
    color: rgba(255, 255, 255, 0.7);
    font-size: 16px;
  }
</style>


