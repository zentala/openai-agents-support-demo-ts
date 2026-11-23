/** Deterministic customer phrases that hand an active consultant conversation back to the assistant. */
export function wantsAssistant(text: string): boolean {
  return /\b(?:back to the assistant|don't want to talk to this consultant|do not want to talk to this consultant)\b/i.test(text)
    || /\b(?:wróć|powrót) do asystenta\b|nie chcę rozmawiać z (?:tym )?konsultant\w*/i.test(text)
    || /\b(?:zurück zum Assistenten|ich möchte nicht mit diesem Mitarbeiter sprechen)\b/i.test(text);
}
