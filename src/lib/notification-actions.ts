"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import nodemailer from "nodemailer";

// Send announcement emails using Google Workspace SMTP or Resend
export async function sendAnnouncementNotifications(announcementId: string) {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!smtpUser && !resendApiKey) {
    console.warn(
      "⚠️ [Notifications] Neither SMTP (SMTP_USER/SMTP_PASS) nor RESEND_API_KEY is configured. Skipping email dispatch."
    );
    return;
  }

  const fromEmail =
    process.env.SMTP_FROM ||
    process.env.RESEND_FROM_EMAIL ||
    `TechEve Academy <${smtpUser || "pushpendra@techeve.in"}>`;

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://portal.techeve.in").replace(/\/+$/, "");
  const supabase = createAdminClient();

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
  if (students) students.forEach((s: any) => s.email && recipientEmails.add(s.email.toLowerCase().trim()));
  if (subscribers) subscribers.forEach((s: any) => s.email && recipientEmails.add(s.email.toLowerCase().trim()));

  const list = Array.from(recipientEmails);
  if (list.length === 0) {
    console.log("ℹ️ [Notifications] No active recipients to notify.");
    return;
  }

  console.log(`✉️ [Notifications] Sending emails to ${list.length} recipients for "${announcement.title}"...`);

  // Construct email HTML
  const eventDateStr = announcement.event_date
    ? new Date(announcement.event_date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const typeLabel =
    announcement.type === "workshop"
      ? "Workshop / Masterclass"
      : announcement.type === "opportunity"
      ? "Hiring / Hackathon Opportunity"
      : "Announcement & Event";

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #0f172a; color: #f8fafc; border: 1px solid #1e293b; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #14b8a6; background-color: rgba(20, 184, 166, 0.15); padding: 4px 12px; border-radius: 9999px;">
          ${typeLabel}
        </span>
        <h1 style="color: #ffffff; font-size: 22px; font-weight: 800; margin: 16px 0 8px 0; line-height: 1.3;">
          ${announcement.title}
        </h1>
      </div>

      ${
        announcement.cover_image_url
          ? `
        <div style="margin-bottom: 20px; border-radius: 12px; overflow: hidden; border: 1px solid #334155;">
          <img src="${announcement.cover_image_url}" alt="Event Cover" style="width: 100%; max-height: 240px; object-fit: cover; display: block;" />
        </div>
      `
          : ""
      }

      <div style="background-color: #1e293b; border-radius: 12px; padding: 18px; margin-bottom: 20px; border: 1px solid #334155;">
        ${
          eventDateStr
            ? `
          <p style="margin: 0 0 10px 0; font-size: 14px; color: #cbd5e1;">
            📅 <strong style="color: #ffffff;">Date & Time:</strong> ${eventDateStr}
          </p>
        `
            : ""
        }
        ${
          announcement.location
            ? `
          <p style="margin: 0 0 10px 0; font-size: 14px; color: #cbd5e1;">
            📍 <strong style="color: #ffffff;">Location:</strong> ${announcement.location}
          </p>
        `
            : ""
        }
        ${
          announcement.capacity
            ? `
          <p style="margin: 0; font-size: 14px; color: #cbd5e1;">
            👥 <strong style="color: #ffffff;">Seats:</strong> Limited to ${announcement.capacity} participants
          </p>
        `
            : ""
        }
      </div>

      <div style="font-size: 14px; line-height: 1.6; color: #cbd5e1; margin-bottom: 24px; white-space: pre-line;">
        ${announcement.body || ""}
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${announcement.link || `${siteUrl}/dashboard/announcements`}" style="display: inline-block; background-color: #0d9488; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 14px rgba(13, 148, 136, 0.4);">
          ${announcement.link ? "View Event / Register Now" : "Open Student Portal"}
        </a>
      </div>

      <hr style="border: 0; border-top: 1px solid #1e293b; margin: 32px 0 20px 0;" />
      <p style="font-size: 11px; color: #64748b; text-align: center; margin: 0; line-height: 1.5;">
        TechEve Academy &bull; Empowering the Next Generation of Tech Leaders<br />
        Sent via ${smtpUser || "academy updates"} to enrolled students & academy members.
      </p>
    </div>
  `;

  try {
    if (smtpUser && smtpPass) {
      // 1. Send via Google Workspace / Gmail SMTP
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: Number(process.env.SMTP_PORT || 465),
        secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : true,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      for (const email of list) {
        try {
          await transporter.sendMail({
            from: fromEmail,
            to: email,
            subject: `TechEve Update: ${announcement.title}`,
            html: htmlBody,
          });
        } catch (mailErr) {
          console.error(`❌ [SMTP] Failed to send email to ${email}:`, mailErr);
        }
      }
    } else if (resendApiKey) {
      // 2. Fallback to Resend API
      for (const email of list) {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: email,
            subject: `TechEve Update: ${announcement.title}`,
            html: htmlBody,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ [Resend] Failed to send email to ${email}:`, errorText);
        }
      }
    }

    // Update notified_at stamp in DB so it doesn't resend
    await supabase
      .from("announcements")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", announcementId);

    console.log(`✅ [Notifications] Successfully sent notifications to ${list.length} recipients.`);
  } catch (err) {
    console.error("❌ [Notifications] Error sending notifications: ", err);
  }
}
