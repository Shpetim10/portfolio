"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Content } from "@/components/ui/Content";
import { todo } from "@/content/todo";

/*
 * The contact form, posted to the static form service (Formspree).
 *
 * Without JS it is a plain HTML form: the browser checks required / type=email,
 * POSTs to the service and lands on its confirmation page. A mailto link under
 * it is the fallback that needs nothing at all.
 * With JS: validation runs on submit (then live, per field, once a field has
 * been flagged), errors sit under their fields (aria-describedby, aria-invalid)
 * and the first invalid field takes focus; the message goes by fetch with
 * Accept: application/json, and success / failure are shown in place.
 *
 * Spam: `_gotcha` is Formspree's honeypot — off-screen, out of the tab order,
 * never autofilled. Filled in, the form claims success and sends nothing.
 */

type Field = "name" | "email" | "message";
type Errors = Partial<Record<Field, string>>;
type Status = "idle" | "sending" | "sent" | "error";

const FIELDS: Field[] = ["name", "email", "message"];
const HONEYPOT = "_gotcha";
const LIMIT = { name: 120, email: 254, message: 5000 } as const;
// Pragmatic: something@something.tld, no spaces. The service validates again.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function check(form: HTMLFormElement, field: Field): string | undefined {
  const value = (form.elements.namedItem(field) as HTMLInputElement | HTMLTextAreaElement).value.trim();
  switch (field) {
    case "name":
      return value ? undefined : "Enter your name.";
    case "email":
      if (!value) return "Enter your email address, so there's somewhere to reply.";
      return EMAIL.test(value) ? undefined : "Enter an email address like name@domain.com.";
    case "message":
      return value ? undefined : "Write a message.";
  }
}

type FormspreeError = { message?: string; field?: string };

/** Formspree answers failures with { errors: [{ message, field? }] } or { error }. */
async function readFailure(response: Response): Promise<{ message: string; fields: Errors }> {
  const fields: Errors = {};
  let message = "The message didn't go through.";
  try {
    const body = (await response.json()) as { errors?: FormspreeError[]; error?: string };
    const errors = body.errors ?? (body.error ? [{ message: body.error }] : []);
    for (const error of errors) {
      if (error.field && FIELDS.includes(error.field as Field) && error.message) {
        fields[error.field as Field] = `${error.message}.`.replace(/\.\.$/, ".");
      } else if (error.message) {
        message = error.message;
      }
    }
  } catch {
    // Not JSON: keep the generic message.
  }
  return { message, fields };
}

type ContactFormProps = {
  endpoint: string | null;
  /** For the mailto fallback; null while the owner's address is still TODO. */
  email: string | null;
  formId: string;
};

export function ContactForm({ endpoint, email, formId }: ContactFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [failure, setFailure] = useState("");
  const [summary, setSummary] = useState("");

  // JS takes over validation; without it the browser's own checks apply.
  useEffect(() => {
    if (formRef.current) formRef.current.noValidate = true;
  }, []);

  useEffect(() => {
    if (status === "sent") doneRef.current?.focus();
  }, [status]);

  const id = (field: Field, part = "") => `${formId}-${field}${part}`;
  const disabled = !endpoint;

  const validate = (form: HTMLFormElement) => {
    const next: Errors = {};
    for (const field of FIELDS) {
      const error = check(form, field);
      if (error) next[field] = error;
    }
    return next;
  };

  // Once a field has been flagged it re-checks as the visitor types.
  const onInput = (event: FormEvent<HTMLFormElement>) => {
    const field = (event.target as HTMLInputElement).name as Field;
    if (!(field in errors)) return;
    // Read the form now: React has cleared currentTarget by the time an updater runs.
    const error = check(event.currentTarget, field);
    setErrors((current) => {
      const next = { ...current };
      if (error) next[field] = error;
      else delete next[field];
      return next;
    });
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!endpoint || status === "sending") return;

    const found = validate(form);
    setErrors(found);
    const invalid = FIELDS.filter((field) => found[field]);
    if (invalid.length > 0) {
      setSummary(
        invalid.length === 1 ? "One field needs attention." : `${invalid.length} fields need attention.`,
      );
      (form.elements.namedItem(invalid[0]) as HTMLElement).focus();
      return;
    }
    setSummary("");

    const data = new FormData(form);
    // A bot filled the honeypot: look sent, send nothing.
    if (String(data.get(HONEYPOT) ?? "") !== "") {
      form.reset();
      setStatus("sent");
      return;
    }

    setStatus("sending");
    setFailure("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      });
      if (response.ok) {
        form.reset();
        setStatus("sent");
        return;
      }
      const { message, fields } = await readFailure(response);
      setErrors(fields);
      setFailure(message);
      setStatus("error");
      const first = FIELDS.find((field) => fields[field]);
      if (first) (form.elements.namedItem(first) as HTMLElement).focus();
    } catch {
      setFailure("The message couldn't be sent — check the connection.");
      setStatus("error");
    }
  };

  const again = () => {
    setStatus("idle");
    setErrors({});
    // The form is back in the DOM on the next frame.
    requestAnimationFrame(() => (formRef.current?.elements.namedItem("name") as HTMLElement | null)?.focus());
  };

  const fallback = email ? (
    <a className="link" href={`mailto:${email}`}>
      {email}
    </a>
  ) : (
    <Content value={todo("email@domain")} />
  );

  return (
    <section className="contact__form-block" aria-labelledby={`${formId}-title`} data-contact="form">
      <h3 id={`${formId}-title`} className="contact__label">
        Send a message
      </h3>

      {status === "sent" ? (
        <div ref={doneRef} className="contact__done" tabIndex={-1} data-contact="sent">
          <p className="contact__state" data-tone="ok">
            Message sent ✓
          </p>
          <p className="contact__note">Thank you — it&rsquo;s on its way.</p>
          <Button variant="secondary" onClick={again}>
            Write another
          </Button>
        </div>
      ) : (
        <form
          ref={formRef}
          id={formId}
          className="contact__form"
          action={endpoint ?? undefined}
          method="POST"
          aria-describedby={`${formId}-status`}
          onSubmit={onSubmit}
          onInput={onInput}
        >
          {FIELDS.map((field) => (
            <FieldRow key={field} field={field} id={id} error={errors[field]} />
          ))}

          {/* Honeypot: hidden from people and assistive tech; bots fill every field. */}
          <div className="contact__trap" aria-hidden="true">
            <label htmlFor={`${formId}-trap`}>Leave this empty</label>
            <input id={`${formId}-trap`} type="text" name={HONEYPOT} tabIndex={-1} autoComplete="off" />
          </div>

          <div className="contact__submit">
            <Button
              type="submit"
              disabled={disabled}
              aria-disabled={status === "sending" || undefined}
              data-contact="submit"
            >
              {status === "sending" ? "Sending…" : "Send message"}
            </Button>
            {disabled && <Content value={todo("Form endpoint: set FORM_ENDPOINT at build")} />}
          </div>

          <div id={`${formId}-status`} className="contact__status" role="status" aria-live="polite">
            {status === "sending" && <p className="contact__state">Sending…</p>}
            {status === "error" && (
              <>
                <p className="contact__state" data-tone="error">
                  Not sent ✕
                </p>
                <p className="contact__note" data-contact="failure">
                  {failure} Try again, or email {fallback}.
                </p>
              </>
            )}
            {status !== "error" && summary && (
              <p className="contact__state" data-tone="error">
                {summary}
              </p>
            )}
          </div>
        </form>
      )}

      <p className="contact__fallback" data-contact="fallback">
        Prefer your own mail app? Write to {fallback}.
      </p>
    </section>
  );
}

const LABELS: Record<Field, string> = { name: "Name", email: "Email", message: "Message" };

function FieldRow({
  field,
  id,
  error,
}: {
  field: Field;
  id: (field: Field, part?: string) => string;
  error?: string;
}) {
  const shared = {
    id: id(field),
    name: field,
    required: true,
    maxLength: LIMIT[field],
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? id(field, "-error") : undefined,
    className: "contact__input",
  };
  return (
    <div className="contact__field" data-invalid={error ? "" : undefined}>
      <label htmlFor={id(field)} className="contact__field-label">
        {LABELS[field]}
      </label>
      {field === "message" ? (
        <textarea {...shared} rows={6} />
      ) : (
        <input
          {...shared}
          type={field === "email" ? "email" : "text"}
          autoComplete={field === "email" ? "email" : "name"}
          spellCheck={false}
        />
      )}
      {error && (
        <p id={id(field, "-error")} className="contact__error" data-contact="error">
          <span aria-hidden="true">✕ </span>
          {error}
        </p>
      )}
    </div>
  );
}
