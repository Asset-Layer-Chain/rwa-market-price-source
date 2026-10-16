// const CMC_URL =
//   "https://pro-api.coinmarketcap.com/v3/cryptocurrency/quotes/latest";

// export async function fetchCmcPrices(ids) {
//   if (!ids?.length) {
//     return [];
//   }

//   const params = new URLSearchParams({
//     id: ids.join(","),
//     convert: "USD",
//   });

//   const response = await fetch(`${CMC_URL}?${params}`, {
//     headers: {
//       Accept: "application/json",
//       "X-CMC_PRO_API_KEY": process.env.CMC_API_KEY,
//     },
//     signal: AbortSignal.timeout(10000),
//   });

//   if (!response.ok) {
//     throw new Error(`CMC_API_ERROR status=${response.status}`);
//   }

//   const body = await response.json();

//   if (!body.data) {
//     throw new Error("CMC_INVALID_RESPONSE");
//   }

//   return body;
// }
