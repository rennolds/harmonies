<script>
  import { supabase } from "$lib/supabaseClient";
  import { authUser } from "$lib/stores/statsStore.js";

  export let isOpen = false;
  export let onClose = () => {};

  let comment = "";
  let email = "";
  let submitted = false;
  let submitting = false;

  function handleKeydown(e) {
    if (e.key === "Escape") handleClose();
  }

  function handleClose() {
    onClose();
    setTimeout(() => {
      comment = "";
      email = "";
      submitted = false;
    }, 300);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    submitting = true;

    const { error } = await supabase.from("feedback").insert({
      session_id: $authUser?.id ?? null,
      comment: comment.trim(),
      email: email.trim() || null,
      source: "harmonies",
    });

    if (error) console.error("Failed to submit feedback:", error.message, error);

    submitting = false;
    submitted = true;
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <div
    class="overlay"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div class="modal">
      <div class="modal-header">
        <h2>Feedback</h2>
        <button class="close-button" on:click={handleClose} aria-label="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M6 6L18 18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>

      <div class="modal-body">
        {#if submitted}
          <div class="success">
            <p class="success-text">Thanks for the feedback!</p>
            <button class="submit-btn" on:click={handleClose}>Close</button>
          </div>
        {:else}
          <form on:submit={handleSubmit}>
            <p class="helper-text">
              Have a suggestion, spotted a bug, or want to tell us something? We read every message!
            </p>

            <div class="field">
              <label for="feedback-comment" class="field-label">Your feedback</label>
              <textarea
                id="feedback-comment"
                bind:value={comment}
                placeholder="Tell us what you think..."
                rows="4"
              ></textarea>
            </div>

            <div class="field">
              <label for="feedback-email" class="field-label">
                Email <span class="optional">(optional)</span>
              </label>
              <input
                id="feedback-email"
                type="email"
                bind:value={email}
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              class="submit-btn"
              class:disabled={submitting || !comment.trim()}
              disabled={submitting || !comment.trim()}
            >
              {submitting ? "Sending…" : "Send Feedback"}
            </button>
          </form>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 10002;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    box-sizing: border-box;
    pointer-events: none;
  }

  .modal {
    pointer-events: all;
    width: 100%;
    max-width: 400px;
    background: linear-gradient(145deg, #2a1e2d, #1a141d);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .modal-header h2 {
    margin: 0;
    font-size: 18px;
    color: rgba(255, 255, 255, 0.7);
    font-weight: 600;
  }

  .close-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background-color 0.2s;
  }

  .close-button:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  .modal-body {
    padding: 20px;
  }

  .helper-text {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.6);
    line-height: 1.5;
    margin: 0 0 16px 0;
  }

  .field {
    margin-bottom: 14px;
  }

  .field-label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .optional {
    text-transform: none;
    font-weight: 400;
    color: rgba(255, 255, 255, 0.35);
    letter-spacing: 0;
  }

  textarea,
  input[type="email"] {
    width: 100%;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    color: white;
    font-size: 14px;
    font-family: inherit;
    padding: 10px 14px;
    box-sizing: border-box;
    outline: none;
    transition: border-color 0.2s;
  }

  textarea {
    resize: none;
  }

  textarea:focus,
  input[type="email"]:focus {
    border-color: #ba81c2;
  }

  textarea::placeholder,
  input[type="email"]::placeholder {
    color: rgba(255, 255, 255, 0.25);
  }

  .submit-btn {
    width: 100%;
    margin-top: 4px;
    padding: 12px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    border: none;
    background: #ba81c2;
    color: white;
    transition: opacity 0.2s;
  }

  .submit-btn:hover:not(.disabled) {
    opacity: 0.85;
  }

  .submit-btn.disabled {
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.3);
    cursor: not-allowed;
  }

  .success {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    padding: 20px 0;
    text-align: center;
  }

  .success-text {
    font-size: 17px;
    font-weight: 600;
    color: white;
    margin: 0;
  }

  .success .submit-btn {
    width: auto;
    padding: 10px 28px;
  }
</style>
