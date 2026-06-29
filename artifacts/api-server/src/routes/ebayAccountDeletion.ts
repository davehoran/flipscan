import { createHash } from "node:crypto";
import { Router, type IRouter } from "express";

const router: IRouter = Router();

/**
 * GET /api/ebay/account-deletion
 *
 * eBay Marketplace Account Deletion — challenge-response endpoint.
 *
 * When a developer registers a notification URL in the eBay Developer Portal
 * (Alerts & Notifications), eBay calls this endpoint with a `challenge_code`
 * query parameter to verify ownership of the URL.  The server must respond
 * with a JSON body containing a SHA-256 hash of:
 *   challenge_code + EBAY_VERIFICATION_TOKEN + EBAY_NOTIFICATION_ENDPOINT_URL
 * (concatenated in that order, no separator).
 *
 * Required secrets:
 *   EBAY_VERIFICATION_TOKEN       — random string entered in the portal
 *   EBAY_NOTIFICATION_ENDPOINT_URL — the exact public URL of this endpoint
 *                                    (e.g. https://flip-scan.replit.app/api/ebay/account-deletion)
 *
 * Reference: https://developer.ebay.com/develop/guides-v2/marketplace-user-account-deletion
 */
router.get("/ebay/account-deletion", (req, res) => {
  const challengeCode = req.query["challenge_code"];
  if (!challengeCode || typeof challengeCode !== "string") {
    res.status(400).json({ error: "Missing challenge_code query parameter" });
    return;
  }

  const verificationToken = process.env.EBAY_VERIFICATION_TOKEN;
  const endpointUrl = process.env.EBAY_NOTIFICATION_ENDPOINT_URL;

  if (!verificationToken || !endpointUrl) {
    req.log.error(
      "EBAY_VERIFICATION_TOKEN or EBAY_NOTIFICATION_ENDPOINT_URL is not set",
    );
    res.status(500).json({ error: "Notification endpoint not configured" });
    return;
  }

  const hash = createHash("sha256")
    .update(challengeCode + verificationToken + endpointUrl)
    .digest("hex");

  res.status(200).json({ challengeResponse: hash });
});

/**
 * POST /api/ebay/account-deletion
 *
 * eBay Marketplace Account Deletion — deletion notification handler.
 *
 * eBay sends this POST when an eBay user requests deletion of their account.
 * The payload contains the eBay userId and username of the deleted account.
 *
 * Scan Flip compliance note:
 *   Scan Flip uses eBay's Browse API with CLIENT CREDENTIALS only (no user-level
 *   eBay OAuth).  The saved_items table is keyed by Clerk user ID, not eBay user
 *   ID.  There is therefore no eBay-user-keyed data to purge.  We log the event
 *   for audit purposes and respond 200 immediately as required.
 *
 *   If eBay user OAuth is ever added (requiring users to connect their eBay
 *   accounts), this handler must be updated to look up the eBay userId → Clerk
 *   userId mapping and delete the corresponding rows from saved_items.
 */
router.post("/ebay/account-deletion", (req, res) => {
  const notification = req.body?.notification;
  const ebayUserId = notification?.data?.userId ?? "(unknown)";
  const ebayUsername = notification?.data?.username ?? "(unknown)";

  req.log.info(
    { ebayUserId, ebayUsername },
    "Received MARKETPLACE_ACCOUNT_DELETION notification",
  );

  res.status(200).end();
});

export default router;
