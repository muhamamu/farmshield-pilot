# FarmShield policies and consent

Policy routes: `/privacy-policy`, `/terms-of-service`, `/refund-policy`, `/cookie-policy`.
All are available without signing in, including during password recovery. Footer links
and Cookie settings appear on every route. Signup requires acceptance of the terms
and acknowledgement of the privacy notice; this is separate from optional storage.

The current source contains no checkout, subscriptions, analytics or advertising
scripts. The refund policy describes that current scope rather than inventing paid
plans or a refund deadline. If payments or tracking are added, update these notices
and implement the corresponding consent and payment processes before enabling them.

Set `VITE_SUPPORT_EMAIL` to a public business support address in the deployment
environment and redeploy to publish a direct contact link. No personal account email
is used by default. The current fallback explains that a public address has not been
provided and directs users to their service operator. Confirm the operator identity,
contact arrangements, actual provider retention and international transfer safeguards
before relying on these notices as complete operational disclosures.

Essential authentication storage is independent of consent. The consent record is
versioned and expires after 180 days. Optional consent controls only remembered map
centre and zoom; it defaults off. Rejection removes that map key, preserving Supabase
sessions, cloud farms and legacy device farm records. Malformed, expired or inaccessible
consent never authorises optional storage. Cookie choices apply per browser.

Reference sources checked 14 November 2026:

- Nigeria Data Protection Act 2023, published by NDPC:
  https://ndpc.gov.ng/wp-content/uploads/2024/03/Nigeria_Data_Protection_Act_2023.pdf
- NDPC implementation guidance:
  https://ndpc.gov.ng/wp-content/uploads/2025/07/NDP-ACT-GAID-2025-MARCH-20TH.pdf
- FCCPC consumer rights and responsibilities:
  https://fccpc.gov.ng/consumers/consumer-rights-responsibilities/rights-responsibilities/

Validation: consent unit tests cover expiry, invalid records, withdrawal, storage
failure and preservation of account/legacy data. React rendering tests cover all
four policy pages, links and initial consent controls. These are not a browser audit
or a determination of legal compliance.
