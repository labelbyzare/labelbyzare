/* LABEL BY ZARE — coarse visitor country for first-party analytics.
   Netlify supplies country data in the request context. Raw IP addresses
   are intentionally neither returned to the browser nor stored. */
export default async function visitorGeo(_request, context) {
  const country = context?.geo?.country || {};
  return new Response(JSON.stringify({
    countryCode: country.code || "",
    countryName: country.name || "Unknown"
  }), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "x-content-type-options": "nosniff"
    }
  });
}
