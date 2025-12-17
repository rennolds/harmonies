<script>
  import { onMount } from "svelte";
  import { supabase } from "$lib/supabaseClient";
  import Navbar from "../Navbar.svelte";
  import { browser } from "$app/environment";
  import "../styles.css";

  let mode = "create";
  let email = "";
  let username = "";
  let loading = false;
  let sent = false;
  let errorMsg = "";
  let showForm = false;

  // Checkbox state for account creation
  let termsAgreed = false;
  let marketingOptIn = false;

  // Real-time username validation feedback
  let usernameHint = "";
  let usernameValid = true;

  function handleUsernameInput(e) {
    const val = e.target.value;
    // Auto-convert to lowercase as user types
    if (val !== val.toLowerCase()) {
      username = val.toLowerCase();
    }

    // Real-time validation feedback
    if (!val) {
      usernameHint = "";
      usernameValid = true;
    } else if (val.length < 3) {
      usernameHint = `${3 - val.length} more character${3 - val.length > 1 ? "s" : ""} needed`;
      usernameValid = false;
    } else if (!/^[a-z0-9_]+$/.test(val)) {
      usernameHint = "Only lowercase letters, numbers, and underscores";
      usernameValid = false;
    } else if (val.length > 24) {
      usernameHint = "Maximum 24 characters";
      usernameValid = false;
    } else {
      usernameHint = "✓ Looks good!";
      usernameValid = true;
    }
  }

  export let data;

  const ALLOWED = [
    "https://harmonies.io",
    "https://auth.harmonies.pages.dev",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
  ];
  let returnTo = "";
  let nextPath = "/";
  let redirectTo = "";

  function originOf(input) {
    try {
      return new URL(input).origin;
    } catch {
      return "";
    }
  }

  onMount(() => {
    // If user is already logged in, redirect to home
    if (data.session) {
      window.location.href = "/";
      return;
    }

    const url = new URL(window.location.href);
    const rRaw = url.searchParams.get("r");
    const n = url.searchParams.get("next");

    // normalize ALLOWED to origins (no paths)
    const allowed = ALLOWED.map(originOf);
    const candidate = rRaw ? originOf(rRaw) : window.location.origin;

    if (candidate && allowed.includes(candidate)) {
      returnTo = candidate;
      redirectTo = `${returnTo}/auth/callback`;
      showForm = true;
    } else {
      // Default to current origin for local dev
      returnTo = window.location.origin;
      redirectTo = `${returnTo}/auth/callback`;
      showForm = true;
    }

    if (n && n.startsWith("/")) nextPath = n;
  });

  function validateUsername(uname) {
    if (!uname || uname.length < 3) {
      return "Username must be at least 3 characters";
    }
    if (uname.length > 24) {
      return "Username must be 24 characters or less";
    }
    if (!/^[a-z0-9_]+$/.test(uname)) {
      return "Username can only contain lowercase letters, numbers, and underscores";
    }
    return null;
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!showForm) return;

    errorMsg = "";
    sent = false;

    if (!email || !email.includes("@")) {
      errorMsg = "Enter a valid email.";
      return;
    }

    loading = true;
    try {
      if (mode === "create") {
        // Validate terms agreement first
        if (!termsAgreed) {
          errorMsg =
            "You must confirm you are at least 13 years old and agree to the Terms of Service and Privacy Policy.";
          loading = false;
          return;
        }

        // Validate username format
        const uname = username.trim().toLowerCase();
        const validationError = validateUsername(uname);
        if (validationError) {
          errorMsg = validationError;
          loading = false;
          return;
        }

        // Check if username is already taken
        const { data: existingUsername, error: usernameCheckErr } =
          await supabase
            .from("profiles")
            .select("id")
            .eq("username", uname)
            .maybeSingle();

        if (usernameCheckErr) {
          console.error("Username check error:", usernameCheckErr);
          // Don't block signup if the check fails, just log it
        } else if (existingUsername) {
          errorMsg = "That username is taken. Try another.";
          loading = false;
          return;
        }

        // Check if email is already registered
        const { data: emailExists, error: emailCheckErr } = await supabase.rpc(
          "email_exists",
          { check_email: email.trim() }
        );

        if (emailCheckErr) {
          console.error("Email check error:", emailCheckErr);
          // Don't block signup if the check fails, just log it
        } else if (emailExists) {
          errorMsg =
            "An account with this email already exists. Please log in instead.";
          loading = false;
          return;
        }

        // Send signup magic link with user metadata
        const now = new Date().toISOString();
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: redirectTo,
            data: {
              username: uname,
              terms_privacy_ack_at: now,
              age_confirmed_at: now,
              marketing_status: marketingOptIn ? "subscribed" : "unsubscribed",
            },
          },
        });
        if (error) throw error;
      } else {
        // LOGIN: send login-only magic link
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: redirectTo,
            shouldCreateUser: false,
          },
        });
        if (error) {
          const msg = String(error.message).toLowerCase();
          if (
            msg.includes("user not found") ||
            msg.includes("signups not allowed")
          ) {
            errorMsg = "No account for that email. Create one instead.";
            return;
          }
          throw error;
        }
      }

      sent = true;
    } catch (err) {
      console.error(err);
      errorMsg = err?.message || "Something went wrong.";
    } finally {
      loading = false;
    }
  }

  // Dummy function for navbar compatibility
  function toggleHelpOverlay() {}
</script>

<Navbar {toggleHelpOverlay} playlist="" isArchiveMode={false} />

<main>
  <div class="login-outer">
    <div class="login-container">
      <!-- Logo Header -->
      <div class="logo-header">
        <img src="/fwlogo.webp" alt="Flatwhite Games" class="logo-image" />
      </div>

      <!-- Mode toggle -->
      <div class="mode-toggle">
        <button
          class="toggle-btn {mode === 'login' ? 'active' : ''}"
          on:click={() => {
            mode = "login";
            errorMsg = "";
            sent = false;
          }}
          aria-pressed={mode === "login"}
        >
          Log In
        </button>
        <button
          class="toggle-btn {mode === 'create' ? 'active' : ''}"
          on:click={() => {
            mode = "create";
            errorMsg = "";
            sent = false;
          }}
          aria-pressed={mode === "create"}
        >
          Create Account
        </button>
      </div>

      <!-- Tagline -->
      <p class="tagline">Join the community and "play" your music, everyday</p>

      <!-- Notifications -->
      {#if sent}
        <div class="notification success">
          <span class="notification-icon">✓</span>
          <div class="notification-content">
            <p class="notification-title">Check your email!</p>
            <p class="notification-text">
              We sent you a {mode === "create" ? "sign-up" : "login"} link. Click
              it to continue.
            </p>
          </div>
          <button class="notification-dismiss" on:click={() => (sent = false)}
            >×</button
          >
        </div>
      {/if}

      {#if errorMsg}
        <div class="notification error">
          <span class="notification-icon">!</span>
          <div class="notification-content">
            <p class="notification-text">{errorMsg}</p>
          </div>
          <button class="notification-dismiss" on:click={() => (errorMsg = "")}
            >×</button
          >
        </div>
      {/if}

      {#if showForm}
        <form class="login-form" on:submit={onSubmit}>
          <!-- Email field -->
          <div class="input-group">
            <label class="input-label" for="email">Email</label>
            <input
              id="email"
              class="login-input"
              type="email"
              bind:value={email}
              placeholder="Enter your email"
              required
            />
          </div>

          <!-- Username field (create mode only) -->
          {#if mode === "create"}
            <div class="input-group">
              <label class="input-label" for="username">Username</label>
              <input
                id="username"
                class="login-input {usernameHint && !usernameValid
                  ? 'input-invalid'
                  : ''} {usernameHint && usernameValid && username
                  ? 'input-valid'
                  : ''}"
                type="text"
                bind:value={username}
                on:input={handleUsernameInput}
                maxlength="24"
                placeholder="Choose a username"
                autocorrect="off"
                autocapitalize="off"
                spellcheck="false"
              />
              <small
                class="input-hint {usernameHint && !usernameValid
                  ? 'hint-error'
                  : ''} {usernameHint && usernameValid && username
                  ? 'hint-success'
                  : ''}"
              >
                {usernameHint || "lowercase, numbers, underscore only"}
              </small>
            </div>

            <!-- Terms and Age Confirmation -->
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  bind:checked={termsAgreed}
                  class="checkbox-input"
                />
                <span class="checkbox-text">
                  I am at least 13 years old and I agree to the
                  <a href="/privacy" target="_blank" class="terms-link"
                    >terms of service & privacy policy</a
                  >
                </span>
              </label>
            </div>

            <!-- Marketing Emails (Optional) -->
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  bind:checked={marketingOptIn}
                  class="checkbox-input"
                />
                <span class="checkbox-text">
                  Send me updates about new stuff and games (optional, no
                  worries, do you)
                </span>
              </label>
            </div>
          {/if}

          <button class="login-btn" type="submit" disabled={loading}>
            {loading
              ? "Sending…"
              : mode === "create"
                ? "Send Sign-Up Link"
                : "Send Login Link"}
          </button>

          <p class="branding-text">
            Your Flatwhite Games account will work across Spotle, Harmonies,
            Crosstune and all the new fun things coming soon™
          </p>
        </form>
      {:else}
        <div class="error-message">
          <p>{errorMsg || "Loading..."}</p>
        </div>
      {/if}
    </div>
  </div>
</main>

<style>
  main {
    min-height: 100vh;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 10px;
    padding-bottom: 28px;
  }

  .login-outer {
    width: 100%;
    max-width: 395px;
    padding: 14px;
  }

  .login-container {
    width: 100%;
    background: transparent;
    border: none;
    border-radius: 0;
    padding: 0;
  }

  /* Logo Header */
  .logo-header {
    text-align: center;
    margin-bottom: 0;
  }

  .logo-image {
    width: 100%;
    max-width: 360px;
    height: auto;
  }

  /* Mode Toggle - pill style */
  .mode-toggle {
    display: flex;
    background: #2a2a2a;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 8px;
    overflow: hidden;
    margin-top: -75px;
    margin-bottom: 16px;
  }

  .toggle-btn {
    flex: 1;
    background: #2a2a2a;
    border: none;
    color: #fff;
    font-size: 15px;
    font-weight: 500;
    padding: 9px 18px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .toggle-btn.active {
    background: #ba81c2;
    color: #000;
    font-weight: 600;
  }

  .toggle-btn:hover:not(.active) {
    background: #303030;
  }

  /* Tagline */
  .tagline {
    text-align: center;
    color: rgba(255, 255, 255, 0.5);
    font-size: 14px;
    margin: 0 0 24px 0;
  }

  /* Notifications */
  .notification {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 16px;
    border-radius: 10px;
    margin-bottom: 20px;
  }

  .notification.success {
    background: linear-gradient(
      135deg,
      rgba(34, 197, 94, 0.15),
      rgba(34, 197, 94, 0.08)
    );
    border: 1px solid rgba(34, 197, 94, 0.4);
  }

  .notification.error {
    background: linear-gradient(
      135deg,
      rgba(239, 68, 68, 0.15),
      rgba(239, 68, 68, 0.08)
    );
    border: 1px solid rgba(239, 68, 68, 0.4);
  }

  .notification-icon {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 700;
  }

  .notification.success .notification-icon {
    background: #22c55e;
    color: #000;
  }

  .notification.error .notification-icon {
    background: #ef4444;
    color: #fff;
  }

  .notification-content {
    flex: 1;
  }

  .notification-title {
    color: #fff;
    font-size: 15px;
    font-weight: 600;
    margin: 0 0 4px 0;
    text-align: left;
  }

  .notification-text {
    color: #d0d0d0;
    font-size: 13px;
    margin: 0;
    text-align: left;
  }

  .notification.error .notification-text {
    color: #fca5a5;
  }

  .notification-dismiss {
    flex-shrink: 0;
    background: none;
    border: none;
    color: #888;
    font-size: 20px;
    cursor: pointer;
  }

  /* Form */
  .login-form {
    width: 100%;
  }

  .input-group {
    margin-bottom: 16px;
  }

  .input-label {
    display: block;
    color: #fff;
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 8px;
    text-align: left;
  }

  .login-input {
    width: 100%;
    background: #2a2a2a;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 8px;
    padding: 10px 14px;
    color: #fff;
    font-size: 16px;
    transition: all 0.2s ease;
    box-sizing: border-box;
  }

  .login-input:focus {
    outline: none;
    border-color: #ba81c2;
    background: #2f2f2f;
  }

  .login-input::placeholder {
    color: rgba(255, 255, 255, 0.35);
  }

  .login-input.input-invalid {
    border-color: rgba(239, 68, 68, 0.6);
  }

  .login-input.input-valid {
    border-color: rgba(34, 197, 94, 0.6);
  }

  .input-hint {
    display: block;
    margin-top: 8px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.5);
    text-align: left;
  }

  .input-hint.hint-error {
    color: #f87171;
  }

  .input-hint.hint-success {
    color: #4ade80;
  }

  /* Checkboxes */
  .checkbox-group {
    margin-bottom: 16px;
  }

  .checkbox-label {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    cursor: pointer;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.8);
    line-height: 1.4;
  }

  .checkbox-input {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    margin-top: 2px;
    accent-color: #ba81c2;
    cursor: pointer;
    border-radius: 4px;
  }

  .checkbox-text {
    flex: 1;
    text-align: left;
  }

  .terms-link {
    color: #ba81c2;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .terms-link:hover {
    color: #d4a5db;
  }

  /* Submit Button */
  .login-btn {
    display: block;
    width: 70%;
    max-width: 280px;
    margin: 22px auto 0;
    background: #ba81c2;
    border: none;
    border-radius: 25px;
    color: #000;
    font-size: 15px;
    font-weight: 700;
    padding: 11px 22px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .login-btn:hover:not(:disabled) {
    background: #c994d0;
    transform: translateY(-1px);
  }

  .login-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Branding Text */
  .branding-text {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.5);
    margin-top: 24px;
    text-align: center;
    line-height: 1.5;
  }

  .error-message {
    text-align: center;
    color: rgba(255, 255, 255, 0.6);
    padding: 20px;
  }

  /* Mobile adjustments */
  @media (max-width: 480px) {
    main {
      padding-top: 56px;
    }

    .login-outer {
      padding: 12px;
    }

    .mode-toggle {
      margin-top: -28px;
    }

    .toggle-btn {
      font-size: 14px;
      padding: 10px 16px;
    }
  }

  /* Login page only: remove the reserved top ad bar + pull navbar to top */
  :global(.top-ad-container) {
    display: none !important;
  }

  :global(.navbar-wrapper) {
    top: 0 !important;
  }
</style>
