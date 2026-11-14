/**
 * Device timezone → country, for clients without IP geolocation (static builds).
 * Covers the countries we have VAT data for; ambiguous zones are omitted.
 */
const ZONES: Record<string, string> = {
  "Europe/Vienna": "AT", "Europe/Brussels": "BE", "Europe/Sofia": "BG", "Europe/Zagreb": "HR", "Asia/Nicosia": "CY", "Asia/Famagusta": "CY",
  "Europe/Prague": "CZ", "Europe/Copenhagen": "DK", "Europe/Tallinn": "EE", "Europe/Helsinki": "FI", "Europe/Paris": "FR",
  "Europe/Berlin": "DE", "Europe/Busingen": "DE", "Europe/Athens": "GR", "Europe/Budapest": "HU", "Europe/Dublin": "IE", "Europe/Rome": "IT",
  "Europe/Riga": "LV", "Europe/Vilnius": "LT", "Europe/Luxembourg": "LU", "Europe/Malta": "MT", "Europe/Amsterdam": "NL",
  "Europe/Warsaw": "PL", "Europe/Lisbon": "PT", "Atlantic/Madeira": "PT", "Atlantic/Azores": "PT", "Europe/Bucharest": "RO",
  "Europe/Bratislava": "SK", "Europe/Ljubljana": "SI", "Europe/Madrid": "ES", "Atlantic/Canary": "ES", "Europe/Stockholm": "SE",
  "Europe/London": "GB", "Europe/Zurich": "CH", "Europe/Oslo": "NO", "Atlantic/Reykjavik": "IS",
  "Australia/Sydney": "AU", "Australia/Melbourne": "AU", "Australia/Brisbane": "AU", "Australia/Perth": "AU", "Australia/Adelaide": "AU",
  "Australia/Hobart": "AU", "Australia/Darwin": "AU", "Pacific/Auckland": "NZ", "Asia/Tokyo": "JP",
  "America/Toronto": "CA", "America/Vancouver": "CA", "America/Montreal": "CA", "America/Edmonton": "CA", "America/Winnipeg": "CA",
  "America/Halifax": "CA", "America/St_Johns": "CA", "America/Regina": "CA",
  "America/New_York": "US", "America/Chicago": "US", "America/Denver": "US", "America/Los_Angeles": "US", "America/Phoenix": "US",
  "America/Anchorage": "US", "Pacific/Honolulu": "US", "America/Detroit": "US", "America/Boise": "US",
  "America/Indiana/Indianapolis": "US", "America/Kentucky/Louisville": "US",
};

export function countryFromTimezone(tz = Intl.DateTimeFormat().resolvedOptions().timeZone): string | null {
  return ZONES[tz] ?? null;
}
