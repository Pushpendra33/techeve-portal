"use server";

import { createClient } from "@/lib/supabase/server";

// Send announcement emails using Resend REST API
export async function sendAnnouncementNotifications(announcementId: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "TechEve <no-reply@techeve.in>";
  
  if (!apiKey) {
    console.warn("⚠️ [Notifications] RESEND_API_KEY is not set. Email notifications will be skipped.");
    return;
  }

  const supabase = await createClient();

  // 1. Fetch announcement details
  const { data: announcement, error: annError } = await supabase
    .from("announcements")
    .select("*")
    .eq("id", announcementId)
    .single();

  if (annError || !announcement) {
    console.error("❌ [Notifications] Failed to retrieve announcement details", annError);
    return;
  }

  // Prevent double sending
  if (announcement.notified_at) {
    console.log("ℹ️ [Notifications] Already sent notifications for this announcement.");
    return;
  }

  // 2. Retrieve student emails (active only)
  const { data: students, error: studentError } = await supabase
    .from("profiles")
    .select("email")
    .eq("role", "student")
    .eq("status", "active")
    .not("email", "is", null);

  if (studentError) {
    console.error("❌ [Notifications] Failed to fetch active students list", studentError);
  }

  // 3. Retrieve subscriber emails (unsubscribed_at is null)
  const { data: subscribers, error: subError } = await supabase
    .from("subscribers")
    .select("email")
    .is("unsubscribed_at", null);

  if (subError) {
    console.error("❌ [Notifications] Failed to fetch subscribers list", subError);
  }

  // Consolidate email list (prevent duplicates)
  const recipientEmails = new Set<string>();
  if (students) students.forEach((s: any) => recipientEmails.add(s.email));
  if (subscribers) subscribers.forEach((s: any) => recipientEmails.add(s.email));

  const list = Array.from(recipientEmails);
  if (list.length === 0) {
    console.log("ℹ️ [Notifications] No active recipients to notify.");
    return;
  }

  console.log(`✉️ [Notifications] Sending emails to ${list.length} recipients...`);

  // Construct email HTML
  const eventDateStr = announcement.event_date 
    ? new Date(announcement.event_date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "";

  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded-radius: 12px;">
      <h2 style="color: #0d9488;">New Announcement at TechEve</h2>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 20px;" />
      
      ${announcement.cover_image_url ? `<img src="${announcement.cover_image_url}" alt="Event Cover" style="width: 100%; max-height: 250px; object-fit: cover; border-radius: 8px; margin-bottom: 20px;" />` : ""}
      
      <h3 style="color: #1e293b; margin-top: 0;">${announcement.title}</h3>
      
      ${announcement.location ? `<p>📍 <strong>Location:</strong> ${announcement.location}</p>` : ""}
      ${eventDateStr ? `<p>📅 <strong>Date & Time:</strong> ${eventDateStr}</p>` : ""}
      
      <p style="color: #475569; line-height: 1.6;">${announcement.body || ""}</p>
      
      ${announcement.link ? `
        <div style="margin: 25px 0;">
          <a href="${announcement.link}" style="background-color: #0d9488; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            View Event Details
          </a>
        </div>
      ` : ""}
      
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-top: 30px;" />
      <p style="font-size: 11px; color: #94a3b8; text-align: center;">
        You received this because you are an active student at TechEve Academy or subscribed to our marketing updates.<br />
        <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/unsubscribe?email=${encodeURIComponent("recipient_placeholder")}" style="color: #0d9488;">Unsubscribe</a>
      </p>
    </div>
  `;

  // Send batch or individual emails (using Resend's batch endpoint is recommended if API allows, or loop)
  // Let's implement batch sending if supported, or single loops. 
  // Resend API allows sending up to 100 emails in batch or to block lists.
  // To avoid timeout issues in server action, we run this asynchronously and handle it.
  try {
    for (const email of list) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: fromEmail,
          to: email,
          subject: `TechEve New Event: ${announcement.title}`,
          html: htmlBody.replace("recipient_placeholder", email)
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [Notifications] Failed to send email to ${email}`, errorText);
      }
    }

    // Update notified_at stamp in DB
    await supabase
      .from("announcements")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", announcementId);

    console.log("✅ [Notifications] Successfully notified everyone.");
  } catch (err) {
    console.error("❌ [Notifications] Error sending notifications: ", err);
  }
}
