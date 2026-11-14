/**
 * Deterministic address-policy replies for Confirm, which runs without a model.
 * Customer text is localized here; instructions to the model stay in the tool result.
 */
import { pick } from "@/lib/escalation/notices";
import type { OrderRule } from "./address-schema";

const REASONS: Record<string, { pl: string; de: string }> = {
  COUNTRY_UNSUPPORTED: {
    pl: "Zamówienie nie ma obsługiwanego kraju dostawy.",
    de: "Für diese Bestellung ist kein unterstütztes Lieferland hinterlegt.",
  },
  COUNTRY_CHANGE_NOT_ALLOWED: {
    pl: "Nie można zmienić kraju dostawy zamówienia.",
    de: "Das Lieferland dieser Bestellung kann nicht geändert werden.",
  },
  POSTAL_CODE_COUNTRY_MISMATCH: {
    pl: "Kod pocztowy nie pasuje do kraju dostawy zamówienia.",
    de: "Die Postleitzahl passt nicht zum Lieferland dieser Bestellung.",
  },
  INVALID_ADDRESS: {
    pl: "Zapisana propozycja adresu jest nieprawidłowa.",
    de: "Der gespeicherte Adressvorschlag ist ungültig.",
  },
  ORDER_DELIVERED: {
    pl: "Zamówienie zostało już dostarczone, więc nie można zmienić jego adresu dostawy.",
    de: "Die Bestellung wurde bereits zugestellt; die Lieferadresse kann nicht mehr geändert werden.",
  },
  ORDER_NOT_FOUND: {
    pl: "Nie znaleziono tego zamówienia na Twoim koncie.",
    de: "Diese Bestellung wurde in deinem Konto nicht gefunden.",
  },
};

/** An actual offer to the customer, never an imperative telling a model what to write. */
export function addressPolicyRefusal(language: string | undefined, rule: Extract<OrderRule, { ok: false }>): string {
  const reason = REASONS[rule.code];
  return pick(language, {
    pl: `Nie mogłem zmienić adresu: ${reason?.pl ?? "Nie można zastosować tej propozycji adresu."} Czy chcesz, żebym przekazał sprawę konsultantowi?`,
    en: `I could not change the address: ${rule.message} Would you like me to pass this to a consultant?`,
    de: `Die Adresse konnte nicht geändert werden: ${reason?.de ?? "Dieser Adressvorschlag kann nicht übernommen werden."} Soll ich das an einen Kundenberater weitergeben?`,
  });
}
