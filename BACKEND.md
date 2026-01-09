# Admin user listing backend (Firebase Functions)

This repo only contains the frontend. The “Users” tab in the admin panel needs a backend endpoint to return registered users. Firebase client SDK cannot list users — you must run this on a trusted server with the Firebase Admin SDK.

## What the endpoint should do
1) Accept `Authorization: Bearer <Firebase ID token>` from the logged-in client.
2) Verify the token with Firebase Admin SDK.
3) Check the caller is an admin (custom claim or allowlisted email).
4) Return JSON like: `{"users":[{ "uid": "...", "email": "...", "lastLogin": "..." }]}`.

## Firebase Functions (Node) example
Create a small Firebase Functions project and add this to `functions/src/index.ts`:

```ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

async function verifyAdmin(req: functions.https.Request) {
  const authHeader = req.headers.authorization || "";
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) throw new functions.https.HttpsError("unauthenticated", "Missing token");

  const decoded = await admin.auth().verifyIdToken(match[1]);
  if (decoded.admin) return decoded; // custom claim
  if (decoded.email && ADMIN_EMAILS.includes(decoded.email.toLowerCase())) return decoded;
  throw new functions.https.HttpsError("permission-denied", "Not an admin");
}

export const listUsers = functions.https.onRequest(async (req, res) => {
  try {
    await verifyAdmin(req);
    const users: Array<{ uid: string; email?: string; lastLogin?: string }> = [];
    let nextPageToken: string | undefined;
    do {
      const page = await admin.auth().listUsers(1000, nextPageToken);
      users.push(
        ...page.users.map((u) => ({
          uid: u.uid,
          email: u.email || "",
          lastLogin: u.metadata.lastSignInTime || "",
        })),
      );
      nextPageToken = page.pageToken;
    } while (nextPageToken);

    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "authorization, content-type");
    if (req.method === "OPTIONS") return res.status(204).send("");
    return res.json({ users });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(401).json({ error: "unauthorized", message });
  }
});
```

Deploy it with:
```
firebase deploy --only functions
```

Then set the frontend env var to the deployed URL:
```
VITE_ADMIN_USERS_ENDPOINT=https://<region>-<project>.cloudfunctions.net/listUsers
```

And restart the dev server so Vite picks up the env var. Use `ADMIN_EMAILS` (functions config or env) or a custom `admin` claim to control who can hit this endpoint.
