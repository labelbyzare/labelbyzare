/* ==========================================================================
   LABEL BY ZARE — CONTACT PAGE
   Saves every submission to Supabase (visible in admin.html → Messages)
   and emails it to you via Formspree, same pattern as checkout.js.
   ========================================================================== */

const CONTACT_FORMSPREE_ENDPOINT = "https://formspree.io/f/maewqpdq";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contact-form");
  if(!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if(!form.checkValidity()){
      form.reportValidity();
      return;
    }

    const btn = document.getElementById("contact-submit-btn");
    const msg = document.getElementById("contact-form-message");
    msg.textContent = "";
    msg.className = "";

    const name = document.getElementById("c-name").value.trim();
    const email = document.getElementById("c-email").value.trim();
    const phone = document.getElementById("c-phone").value.trim();
    const subject = document.getElementById("c-subject").value.trim();
    const message = document.getElementById("c-message").value.trim();

    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Sending…";

    // 1. Save to Supabase — this is what shows up in admin.html → Messages.
    const { error: dbError } = await supabaseClient.from("messages").insert({
      name: name,
      email: email,
      phone: phone || null,
      subject: subject,
      message: message,
      status: "new"
    });

    if(dbError){
      console.error("Message failed to save to Supabase:", dbError.message);
      msg.textContent = "Something went wrong sending your message — please try again in a moment.";
      msg.className = "error";
      btn.disabled = false;
      btn.textContent = originalText;
      return;
    }

    // 2. Also email it to you via Formspree, so nothing gets missed even
    // if you haven't checked the admin page yet.
    try {
      const fd = new FormData();
      fd.append("_subject", `New Contact Message — ${subject || "Website"}`);
      fd.append("Name", name);
      fd.append("email", email);
      fd.append("Phone", phone || "—");
      fd.append("Subject", subject);
      fd.append("Message", message);
      const res = await fetch(CONTACT_FORMSPREE_ENDPOINT, {
        method: "POST",
        body: fd,
        headers: { "Accept": "application/json" }
      });
      if(!res.ok) throw new Error("Formspree request failed");
    } catch(err){
      // The message is already safely saved in Supabase above, so we
      // don't block the customer — just log it for you to notice later.
      console.warn("Message email failed to send (message was still saved):", err);
    }

    form.style.display = "none";
    document.getElementById("contact-success").style.display = "block";
    if(window.gsap){
      gsap.fromTo("#contact-success", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .6, ease: "power2.out" });
    }
    if(window.LZ && LZ.showToast) LZ.showToast("Your message has been sent");
  });
});
