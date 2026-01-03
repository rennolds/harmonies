<script>
  import Navbar from "../Navbar.svelte";
  import { supabase } from "$lib/supabaseClient";
  import { isAuthenticated, authUser, userProfile, signOut } from "$lib/stores/statsStore.js";
  import "../styles.css";

  export let data; // Server data with session

  // Dummy function for navbar compatibility
  function toggleHelpOverlay() {}

  async function handleLogOut() {
    await supabase.auth.signOut();
    // Clear stores after signOut completes
    authUser.set(null);
    userProfile.set(null);
    // Redirect to home
    window.location.href = "/";
  }

  // Get first letter of username for avatar
  $: avatarLetter = ($userProfile?.username || data?.user?.email || $authUser?.email || "U").charAt(0).toUpperCase();
  $: displayName = $userProfile?.username || data?.user?.email?.split('@')[0] || $authUser?.email?.split('@')[0] || "User";
  $: displayEmail = data?.user?.email || $authUser?.email || "";
</script>

<Navbar {toggleHelpOverlay} playlist="" isArchiveMode={false} />

<main class="profile-page">
  <div class="profile-container">
    <!-- Profile Header with Avatar -->
    <div class="profile-header">
      <div class="profile-avatar">
        {avatarLetter}
      </div>
      <h1>{displayName}</h1>
      <p class="email">{displayEmail}</p>
    </div>

    <!-- Logout Button -->
    <button class="logout-btn" on:click={handleLogOut}>
      Log Out
    </button>
  </div>
</main>

<style>
  .profile-page {
    min-height: 100vh;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 100px;
    padding-bottom: 28px;
  }

  .profile-container {
    width: 100%;
    max-width: 400px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .profile-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 32px;
  }

  .profile-avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: linear-gradient(135deg, #ba81c2, #9b59b6);
    color: #fff;
    font-size: 36px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    text-transform: uppercase;
    box-shadow: 0 4px 20px rgba(186, 129, 194, 0.4);
    margin-bottom: 16px;
  }

  h1 {
    color: #fff;
    font-size: 24px;
    font-weight: 700;
    margin: 0 0 4px 0;
    text-align: center;
  }

  .email {
    color: rgba(255, 255, 255, 0.5);
    font-size: 14px;
    margin: 0;
  }

  .logout-btn {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    color: #fff;
    font-size: 14px;
    font-weight: 500;
    padding: 12px 32px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .logout-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.3);
  }

  @media (max-width: 480px) {
    .profile-page {
      padding-top: 80px;
    }

    .profile-container {
      padding: 16px;
    }

    .profile-avatar {
      width: 64px;
      height: 64px;
      font-size: 28px;
    }

    h1 {
      font-size: 20px;
    }
  }
</style>
