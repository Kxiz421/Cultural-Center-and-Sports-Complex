const PH_COUNTRY_CODE = "63";
const PH_MOBILE_SUBSCRIBER_LENGTH = 10;

export function toE164Ph(input) {
  const digits = String(input ?? "").replace(/\D/g, "");
  if (!digits) return null;

  let national = null;
  if (digits.length === 11 && digits.startsWith("0")) {
    national = digits.slice(1);
  } else if (digits.length === 12 && digits.startsWith(PH_COUNTRY_CODE)) {
    national = digits.slice(2);
  } else if (digits.length === PH_MOBILE_SUBSCRIBER_LENGTH) {
    national = digits;
  }

  if (!national || national.length !== PH_MOBILE_SUBSCRIBER_LENGTH) return null;
  if (!national.startsWith("9")) return null;

  return `+${PH_COUNTRY_CODE}${national}`;
}

export function phLookupForms(input) {
  const forms = new Set();
  const digits = String(input ?? "").replace(/\D/g, "");
  if (digits) forms.add(digits);

  const e164 = toE164Ph(input);
  if (e164) {
    const national = e164.slice(3);
    forms.add(`0${national}`);
    forms.add(e164);
    forms.add(`${PH_COUNTRY_CODE}${national}`);
  }

  return [...forms];
}

export function phMasked(input) {
  const e164 = toE164Ph(input);
  if (!e164) return "";
  const local = `0${e164.slice(3)}`;
  return `${local.slice(0, 2)}•••${local.slice(-4)}`;
}
