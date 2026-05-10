const r = await fetch("https://iam.cloud.ibm.com/identity/token", {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "urn:ibm:params:oauth:grant-type:apikey",
    apikey: process.env.WATSONX_API_KEY
  })
});
console.log("IAM:", r.status, r.ok ? "ok" : "FAIL");
if (!r.ok) { console.log(await r.text()); process.exit(1); }
const tok = (await r.json()).access_token;

const url = process.env.WATSONX_URL.replace(/\/$/, "") + "/ml/v1/text/generation?version=2024-05-31";
const w = await fetch(url, {
  method: "POST",
  headers: { authorization: "Bearer " + tok, "content-type": "application/json" },
  body: JSON.stringify({
    model_id:   process.env.WATSONX_MODEL_ID,
    input:      "ping",
    project_id: process.env.WATSONX_PROJECT_ID,
    parameters: { decoding_method: "greedy", max_new_tokens: 5 }
  })
});
console.log("WATSONX HTTP", w.status);
console.log("BODY:", await w.text());
