<script>
  import "../../../routes/styles.css";
</script>

<div class="error-container">
  <div class="error-card">
    <div class="error-icon">⚠️</div>
    <h1>Authentication Error</h1>
    <p>Something went wrong while signing you in. This could happen if:</p>
    <ul>
      <li>The login link has expired</li>
      <li>The link was already used</li>
      <li>There was a network issue</li>
    </ul>
    <div class="actions">
      <a href="/login" class="btn primary">Try Again</a>
      <a href="/" class="btn secondary">Go Home</a>
    </div>
  </div>
</div>

<style>
  .error-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 20px;
    background-color: #121212;
  }

  .error-card {
    background: linear-gradient(145deg, #2a1e2d, #1a141d);
    border-radius: 16px;
    padding: 40px 30px;
    max-width: 400px;
    text-align: center;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  .error-icon {
    font-size: 48px;
    margin-bottom: 20px;
  }

  h1 {
    color: #fff;
    font-size: 24px;
    margin: 0 0 15px 0;
  }

  p {
    color: rgba(255, 255, 255, 0.7);
    font-size: 14px;
    margin: 0 0 15px 0;
    line-height: 1.5;
  }

  ul {
    text-align: left;
    color: rgba(255, 255, 255, 0.6);
    font-size: 13px;
    margin: 0 0 25px 0;
    padding-left: 20px;
  }

  li {
    margin-bottom: 8px;
  }

  .actions {
    display: flex;
    gap: 12px;
    justify-content: center;
  }

  .btn {
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.2s ease;
  }

  .btn.primary {
    background: #ba81c2;
    color: #fff;
  }

  .btn.primary:hover {
    background: #a870b0;
    transform: translateY(-1px);
  }

  .btn.secondary {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  .btn.secondary:hover {
    background: rgba(255, 255, 255, 0.15);
  }
</style>


