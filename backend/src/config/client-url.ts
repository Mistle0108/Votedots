const isProduction = process.env.NODE_ENV === "production";
const configuredClientUrls = String(process.env.CLIENT_URLS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const configuredClientUrl = process.env.CLIENT_URL?.trim();

const allowedClientUrls = configuredClientUrls.length
  ? configuredClientUrls
  : configuredClientUrl
    ? [configuredClientUrl]
    : [];

if (isProduction && allowedClientUrls.length === 0) {
  throw new Error("CLIENT_URL or CLIENT_URLS is required in production.");
}

export const clientUrls = allowedClientUrls.length
  ? allowedClientUrls
  : ["http://localhost:5173"];
