/**
 * Placeholder convention. Every value the owner has not supplied yet is a
 * string starting with "TODO" (or the number 0 for numeric fields, with a
 * `// TODO` comment). UI renders these as clearly marked placeholders —
 * nothing about the owner is ever invented.
 */
export const TODO_PREFIX = "TODO";

export const todo = (what: string) => `${TODO_PREFIX}: ${what}`;

export const isTodo = (value: unknown): boolean => typeof value === "string" && value.startsWith(TODO_PREFIX);
