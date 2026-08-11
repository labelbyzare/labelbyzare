/* ==========================================================================
   LABEL BY ZARE — CUSTOMER ACCOUNTS
   Handles sign up (with email verification code), login, logout, profile
   edits, password/email changes, avatar upload, and account deletion.
   Depends on supabase-client.js being loaded first.
   Requires the tables/policies created by customer-accounts-setup.sql.
   ========================================================================== */

const CustomerAuth = {

  async getSession(){
    const { data } = await supabaseClient.auth.getSession();
    return data.session;
  },

  async getUser(){
    const { data } = await supabaseClient.auth.getUser();
    return data.user || null;
  },

  async getProfile(){
    const user = await this.getUser();
    if(!user) return null;
    const { data, error } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    if(error){ console.error("getProfile error:", error.message); return null; }
    return data;
  },

  // Step 1 of sign up: creates the account and triggers Supabase to email
  // a 6-digit verification code (see customer-accounts-setup.sql notes).
  async signUp(fullName, email, password){
    const { data, error } = await supabaseClient.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } }
    });
    return { data, error };
  },

  // Step 2 of sign up: the customer enters the 6-digit code from their inbox.
  async verifySignUpCode(email, code){
    const { data, error } = await supabaseClient.auth.verifyOtp({
      email, token: code, type: "signup"
    });
    if(error) return { data, error };

    // Create the matching profile row now that the account is verified.
    const user = data.user;
    if(user){
      await supabaseClient.from("profiles").upsert({
        id: user.id,
        full_name: user.user_metadata?.full_name || "",
      });
    }
    return { data, error: null };
  },

  async resendSignUpCode(email){
    const { data, error } = await supabaseClient.auth.resend({ type: "signup", email });
    return { data, error };
  },

  async login(email, password){
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    return { data, error };
  },

  async logout(){
    await supabaseClient.auth.signOut();
  },

  // Step 1 of password reset: emails the customer a 6-digit code (same
  // mechanism as sign-up verification — see notes at the top of this file
  // and in customer-accounts-setup.sql about the "Reset Password" email
  // template needing to include {{ .Token }}).
  async sendPasswordResetCode(email){
    const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email);
    return { data, error };
  },

  // Step 2 of password reset: the customer enters the 6-digit code from
  // their inbox. On success this briefly signs them into a recovery
  // session, which updatePassword() below then uses to set the new password.
  async verifyPasswordResetCode(email, code){
    const { data, error } = await supabaseClient.auth.verifyOtp({
      email, token: code, type: "recovery"
    });
    return { data, error };
  },

  async updatePassword(newPassword){
    const { data, error } = await supabaseClient.auth.updateUser({ password: newPassword });
    return { data, error };
  },

  // Supabase sends a confirmation link to the NEW address before the
  // change takes effect, to prevent someone locking another person out.
  async updateEmail(newEmail){
    const { data, error } = await supabaseClient.auth.updateUser({ email: newEmail });
    return { data, error };
  },

  async updateName(fullName){
    const user = await this.getUser();
    if(!user) return { error: { message: "Not logged in" } };
    await supabaseClient.auth.updateUser({ data: { full_name: fullName } });
    const { error } = await supabaseClient
      .from("profiles")
      .upsert({ id: user.id, full_name: fullName, updated_at: new Date().toISOString() });
    return { error };
  },

  async uploadAvatar(file){
    const user = await this.getUser();
    if(!user) return { error: { message: "Not logged in" } };

    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabaseClient.storage
      .from("avatars")
      .upload(path, file, { upsert: true });
    if(uploadError) return { error: uploadError };

    const { data: pub } = supabaseClient.storage.from("avatars").getPublicUrl(path);
    const avatarUrl = pub.publicUrl + "?t=" + Date.now(); // cache-bust

    const { error } = await supabaseClient
      .from("profiles")
      .upsert({ id: user.id, avatar_url: avatarUrl, updated_at: new Date().toISOString() });

    return { error, avatarUrl };
  },

  // Deletes everything this site controls for the customer (profile,
  // addresses, saved cart/wishlist) and signs them out. Supabase's anon
  // (public) key can never delete the underlying login itself — that
  // requires a privileged server-side call — so this is a full data wipe
  // + sign-out rather than a literal account deletion. See note in
  // customer-accounts-setup.sql if you want true account deletion added
  // later via a Supabase Edge Function.
  async deleteMyData(){
    const user = await this.getUser();
    if(!user) return { error: { message: "Not logged in" } };

    await supabaseClient.from("cart_items").delete().eq("user_id", user.id);
    await supabaseClient.from("wishlist_items").delete().eq("user_id", user.id);
    await supabaseClient.from("addresses").delete().eq("user_id", user.id);
    await supabaseClient.from("profiles").delete().eq("id", user.id);

    localStorage.removeItem("lz_cart");
    localStorage.removeItem("lz_wishlist");

    await this.logout();
    return { error: null };
  },

  // ---- Addresses ----
  async listAddresses(){
    const user = await this.getUser();
    if(!user) return [];
    const { data, error } = await supabaseClient
      .from("addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    if(error){ console.error(error.message); return []; }
    return data;
  },

  async saveAddress(addr){
    const user = await this.getUser();
    if(!user) return { error: { message: "Not logged in" } };

    if(addr.is_default){
      await supabaseClient.from("addresses").update({ is_default: false }).eq("user_id", user.id);
    }

    if(addr.id){
      const { error } = await supabaseClient.from("addresses").update(addr).eq("id", addr.id).eq("user_id", user.id);
      return { error };
    } else {
      const { error } = await supabaseClient.from("addresses").insert({ ...addr, user_id: user.id });
      return { error };
    }
  },

  async deleteAddress(id){
    const user = await this.getUser();
    if(!user) return { error: { message: "Not logged in" } };
    const { error } = await supabaseClient.from("addresses").delete().eq("id", id).eq("user_id", user.id);
    return { error };
  },

  // ---- Orders ----
  async listOrders(){
    const user = await this.getUser();
    if(!user) return [];
    const { data, error } = await supabaseClient
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if(error){ console.error(error.message); return []; }
    return data;
  }
};

// ----------------------------------------------------------------------
// Header account icon: on every page (starting with the home page), once
// a customer is logged in this swaps the generic account icon for their
// actual profile photo (or their initial, if they haven't uploaded one
// yet) — same avatar they see on the account dashboard. Runs on every
// page that includes this script.
// ----------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  const accountLinks = document.querySelectorAll('.js-account-link, [aria-label="Account"]');
  if(accountLinks.length === 0) return;

  accountLinks.forEach(el => el.setAttribute("href", "account.html"));

  try{
    const user = await CustomerAuth.getUser();
    if(!user) return;

    const profile = await CustomerAuth.getProfile();
    const name = profile?.full_name || user.email || "?";
    const initial = name.trim().charAt(0).toUpperCase();

    accountLinks.forEach(el => {
      el.classList.add("has-account");
      // Replace the default account SVG with the real avatar photo (or
      // an initials circle as a fallback), keeping the same nav slot size.
      const icon = el.querySelector("svg");
      if(icon) icon.style.display = "none";

      let avatar = el.querySelector(".nav-avatar-photo");
      if(!avatar){
        avatar = document.createElement("span");
        avatar.className = "nav-avatar-photo";
        el.appendChild(avatar);
      }
      avatar.innerHTML = profile?.avatar_url
        ? `<img src="${profile.avatar_url}" alt="${name}">`
        : initial;
    });
  }catch(e){ /* not fatal — icon just stays generic */ }
});
