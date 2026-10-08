import { todo } from "./todo";
import type { Metric, Profile } from "./types";

// TODO(content): every field below is a placeholder awaiting the owner's real data.
export const profile: Profile = {
  name: todo("Your name"),
  role: todo("Role, e.g. Software Engineer"),
  positioning: todo("One-line positioning, max 12 words"),
  manifesto: todo("Manifesto, 60–90 words"),
  location: todo("City, Country"),
  timezone: "UTC", // TODO(content): IANA timezone for the live clock
  availability: { open: false, note: todo("Availability note") },
  email: todo("email@domain"),
  socials: [],
  resumeUrl: "/resume.pdf", // TODO(content): add the static PDF to /public
  portrait: {
    src: "/assets/portrait.jpg", // TODO(content): asset not yet supplied
    alt: todo("Portrait alt text"),
    width: 0, // TODO(content)
    height: 0, // TODO(content)
    kind: "image",
  },
};

// TODO(content): add only metrics with a verifiable `source`. Empty until supplied.
// 4–5 of them, most important first: the first is the lead metric (T05).
export const metrics: Metric[] = [];
