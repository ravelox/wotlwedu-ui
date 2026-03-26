const baseUrl = (process.env.WOTLWEDU_VALIDATE_BASE_URL || "").replace(/\/+$/, "");
const token = process.env.WOTLWEDU_VALIDATE_TOKEN || "";
const organizationId = process.env.WOTLWEDU_VALIDATE_ORGANIZATION_ID || "";
const userId = process.env.WOTLWEDU_VALIDATE_USER_ID || "";

if (!baseUrl || !token) {
  console.error("Missing WOTLWEDU_VALIDATE_BASE_URL or WOTLWEDU_VALIDATE_TOKEN");
  process.exit(1);
}

const headers = {
  Accept: "application/json",
  Authorization: `Bearer ${token}`,
};

async function assertOk(label, path) {
  const response = await fetch(`${baseUrl}${path}`, { headers });
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!response.ok) {
    throw new Error(`${label} failed (${response.status}): ${body?.message || response.statusText}`);
  }
  console.log(`PASS ${label} -> ${response.status}`);
}

async function main() {
  await assertOk("GET /support/auth/overview", "/support/auth/overview?days=3");
  await assertOk("GET /support/auth/audit", "/support/auth/audit?page=1&items=20");

  if (organizationId) {
    await assertOk(
      "GET /organization/:organizationId/authaudit",
      `/organization/${encodeURIComponent(organizationId)}/authaudit?page=1&items=20`
    );
  }

  if (userId) {
    await assertOk(
      "GET /user/:userId/signin-method",
      `/user/${encodeURIComponent(userId)}/signin-method`
    );
    await assertOk(
      "GET /user/:userId/authaudit",
      `/user/${encodeURIComponent(userId)}/authaudit?page=1&items=20`
    );
  }

  console.log("Support console validation completed.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
