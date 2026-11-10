const PH_COUNTRY_CODE = "63";
const PH_NATIONAL_MOBILE_RE = /^(9\d{9}|89[5-8]\d{7})$/;

const DITO_PREFIXES = new Set([
  "0895", "0896", "0897", "0898", "0991", "0992", "0993", "0994",
]);

const GLOBE_PREFIXES = new Set([
  "0904", "0905", "0906", "0915", "0916", "0917", "0926", "0927",
  "0935", "0936", "0937", "0945", "0952", "0953", "0954", "0955",
  "0956", "0957", "0958", "0959", "0965", "0966", "0967", "0971",
  "0972", "0975", "0976", "0977", "0978", "0979", "0995", "0996",
  "0997",
]);

const SUN_PREFIXES = new Set([
  "0922", "0923", "0924", "0925", "0931", "0932", "0933", "0934",
  "0940", "0941", "0942", "0943", "0944", "0962", "0973", "0974",
]);

const SMART_PREFIXES = new Set([
  "0900", "0907", "0908", "0909", "0910", "0911", "0912", "0913",
  "0914", "0918", "0919", "0920", "0921", "0928", "0929", "0930",
  "0938", "0939", "0946", "0947", "0948", "0949", "0950", "0951",
  "0960", "0961", "0963", "0964", "0968", "0969", "0970", "0980",
  "0981", "0982", "0983", "0984", "0985", "0986", "0987", "0988",
  "0989", "0998", "0999",
]);

const ACCEPTED_REGISTRATION_NETWORKS = new Set(["globe", "gomo", "dito"]);

function nationalDigits(input) {
  const digits = String(input ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith(PH_COUNTRY_CODE) && digits.length > 10) {
    return digits.slice(PH_COUNTRY_CODE.length);
  }
  if (digits.startsWith("0")) return digits.slice(1);
  return digits;
}

export function toE164Ph(input) {
  const digits = String(input ?? "").replace(/\D/g, "");
  if (!digits) return null;

  let national = null;
  if (digits.length === 11 && digits.startsWith("0")) {
    national = digits.slice(1);
  } else if (digits.length === 12 && digits.startsWith(PH_COUNTRY_CODE)) {
    national = digits.slice(2);
  } else if (digits.length === 10) {
    national = digits;
  }

  if (!national || !PH_NATIONAL_MOBILE_RE.test(national)) return null;
  return `+${PH_COUNTRY_CODE}${national}`;
}

export function detectPhMobileNetwork(input) {
  const national = nationalDigits(input);
  if (national.length < 3) return null;

  const prefix = `0${national.slice(0, 3)}`;

  if (DITO_PREFIXES.has(prefix)) return { key: "dito", label: "DITO" };
  if (GLOBE_PREFIXES.has(prefix)) {
    if (prefix === "0976") return { key: "gomo", label: "GOMO" };
    return { key: "globe", label: "Globe/TM" };
  }
  if (SUN_PREFIXES.has(prefix)) return { key: "sun", label: "Sun (Smart)" };
  if (SMART_PREFIXES.has(prefix)) return { key: "smart", label: "Smart/TNT" };
  return { key: "unknown", label: "Unknown network" };
}

export function registrationNetworkProblem(input) {
  const network = detectPhMobileNetwork(input);
  if (!network) return null;
  if (ACCEPTED_REGISTRATION_NETWORKS.has(network.key)) return null;
  if (network.key === "unknown") {
    return "Enter a valid mobile number. Only Globe, TM, DITO, or GOMO numbers are accepted.";
  }
  return `${network.label} numbers aren't accepted. Please enter a Globe, TM, DITO, or GOMO number.`;
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
  return `${local.slice(0, 3)}***${local.slice(-5)}`;
}
