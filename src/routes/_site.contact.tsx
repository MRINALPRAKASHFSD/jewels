import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { Container, luxButton, Reveal } from "@/components/site/primitives";
import { PageHeader } from "@/components/site/PageShell";
import { WhatsAppButton } from "@/components/site/WhatsAppButton";
import { submitEnquiry } from "@/lib/enquiry.functions";

export const Route = createFileRoute("/_site/contact")({
  validateSearch: z.object({
    product: z.string().optional(),
  }),
  head: () => ({
    meta: [
      { title: "Contact — Élan Fine Jewellery" },
      { name: "description", content: "Book a private appointment or send an enquiry to the Élan atelier." },
      { property: "og:title", content: "Contact — Élan Fine Jewellery" },
      { property: "og:description", content: "Book a private appointment or send an enquiry to the Élan atelier." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const search = Route.useSearch();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  // Honeypot field for anti-bot protection
  const [hp, setHp] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!email.trim() && !phone.trim()) {
      setError("Please provide either an email address or a phone number.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitEnquiry({
        data: {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          message: message.trim(),
          source: search.product ? "product_page" : "contact_form",
          hp,
        },
      });

      if (res.ok) {
        setSuccess(res.message);
        setName("");
        setEmail("");
        setPhone("");
        setMessage("");
        setHp("");
      } else {
        setError(res.error);
      }
    } catch (err: unknown) {
      console.error("[contact] Submission error:", err);
      setError("We could not process your enquiry right now. Please try again or reach out on WhatsApp.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageHeader
      eyebrow="Contact"
      title="Enquiries"
      intro="Book a private appointment, ask about a bespoke commission, or enquire about any piece from the collection."
    >
      <Container className="py-16 lg:py-24">
        <div className="grid gap-16 lg:grid-cols-12 lg:gap-20">
          {/* Form column */}
          <Reveal className="lg:col-span-7">
            {success ? (
              <div className="border border-champagne/30 bg-espresso/30 p-8 sm:p-10">
                <p className="eyebrow text-champagne mb-3">Enquiry Received</p>
                <h3 className="font-display text-2xl sm:text-3xl text-foreground mb-4">Thank you</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{success}</p>
                <button
                  type="button"
                  onClick={() => setSuccess(null)}
                  className="mt-8 link-underline text-xs tracking-wider uppercase text-foreground"
                >
                  Send another enquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                {error && (
                  <div
                    role="alert"
                    className="border border-destructive/40 bg-destructive/10 p-4 text-xs tracking-wide text-destructive leading-relaxed"
                  >
                    {error}
                  </div>
                )}

                {/* Honeypot field - invisible to human visitors */}
                <div style={{ display: "none" }} aria-hidden="true">
                  <label htmlFor="website-hp">Website</label>
                  <input
                    id="website-hp"
                    type="text"
                    name="hp"
                    value={hp}
                    onChange={(e) => setHp(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                <div>
                  <label htmlFor="enquiry-name" className="block eyebrow text-xs mb-2 text-muted-foreground">
                    Your Name <span className="text-foreground">*</span>
                  </label>
                  <input
                    id="enquiry-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Radhika Sharma"
                    maxLength={120}
                    disabled={isSubmitting}
                    className="w-full bg-secondary/40 border border-border px-4 py-3 text-sm text-foreground focus:outline-none focus:border-foreground transition-colors"
                  />
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="enquiry-email" className="block eyebrow text-xs mb-2 text-muted-foreground">
                      Email Address
                    </label>
                    <input
                      id="enquiry-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="radhika@example.com"
                      maxLength={255}
                      disabled={isSubmitting}
                      className="w-full bg-secondary/40 border border-border px-4 py-3 text-sm text-foreground focus:outline-none focus:border-foreground transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="enquiry-phone" className="block eyebrow text-xs mb-2 text-muted-foreground">
                      Phone Number
                    </label>
                    <input
                      id="enquiry-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      maxLength={30}
                      disabled={isSubmitting}
                      className="w-full bg-secondary/40 border border-border px-4 py-3 text-sm text-foreground focus:outline-none focus:border-foreground transition-colors"
                    />
                  </div>
                </div>

                <p className="text-[0.75rem] text-muted-foreground/80 -mt-2">
                  Please provide either an email or phone number so our atelier can respond.
                </p>

                <div>
                  <label htmlFor="enquiry-message" className="block eyebrow text-xs mb-2 text-muted-foreground">
                    Message
                  </label>
                  <textarea
                    id="enquiry-message"
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us about the piece you are considering or your appointment preferences…"
                    maxLength={2000}
                    disabled={isSubmitting}
                    className="w-full bg-secondary/40 border border-border px-4 py-3 text-sm text-foreground focus:outline-none focus:border-foreground transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={luxButton({ variant: "primary", className: "w-full sm:w-auto" })}
                >
                  {isSubmitting ? "Submitting…" : "Send Enquiry"}
                </button>
              </form>
            )}
          </Reveal>

          {/* Direct channels / atelier context */}
          <Reveal delay={0.15} className="lg:col-span-5 lg:pl-6 space-y-10">
            <div className="border-t border-border pt-8 lg:border-t-0 lg:pt-0">
              <p className="eyebrow text-muted-foreground mb-3">Direct Atelier Access</p>
              <h3 className="font-display text-2xl sm:text-3xl text-foreground mb-4">Prefer WhatsApp?</h3>
              <p className="text-sm leading-relaxed text-muted-foreground mb-6">
                Our advisors reply directly to WhatsApp enquiries for rapid sizing advice, stone availability, and private consultation requests.
              </p>
              <WhatsAppButton variant="secondary" />
            </div>

            <div className="border-t border-border pt-8 space-y-4 text-xs text-muted-foreground leading-relaxed">
              <p className="eyebrow text-foreground">Private Consultations</p>
              <p>Appointments are held by prior arrangement at the atelier. Bespoke commissions typically require 4–6 weeks from design approval.</p>
              <p className="text-foreground/70">Response time: Usually within 2 business hours.</p>
            </div>
          </Reveal>
        </div>
      </Container>
    </PageHeader>
  );
}
