QR code generator website
=========================

A static website for making QR codes for UPI payments, WhatsApp, Wi‑Fi, links and phone numbers. Everything runs in the visitor's browser: no server code, no database, no cookies, no tracking.

Files:

* `index.html`: the generator page
* `app.js`: form logic, drawing, PNG/SVG download, share
* `qrcodegen.js`: the QR encoder, compiled from `../typescript-javascript/qrcodegen.ts` (MIT License, Project Nayuki)
* `legal.html`: privacy policy, terms of use, open-source credits


Before launch
-------------

1. Search and replace across `index.html` and `legal.html`:
   * `YourBrand` → your brand name
   * `yourdomain.in` → your domain (canonical links and the grievance email)
   * `https://yourdomain.in/products` → the page where customers order printed QR standees and stickers (the "Order printed standees & stickers" button)
   * `[Your legal name or business name]`, `[Registered address]`, `[Name]` (Grievance Officer) and `[Your city]` in `legal.html`
2. Set up the `grievance@yourdomain.in` mailbox (or change the address) and make sure someone reads it.
3. Have a lawyer review `legal.html`. It is a starting point, not legal advice.
4. Check that no one else holds your brand name as a trademark: <https://tmrsearch.ipindia.gov.in/>


Deploy (free, HTTPS, custom domain)
-----------------------------------

Cloudflare Pages (has data centres in India): create a project from this GitHub repo, leave the build command empty, set the **build output directory** to `web`, then add your domain under *Custom domains*.

Any static host works too (Netlify, Vercel, GitHub Pages via Actions). Just upload the four files.

To preview locally: `cd web && python3 -m http.server`, then open http://localhost:8000


Using it with your e-commerce store
-----------------------------------

Simplest and safest: host this folder on a subdomain such as `qr.yourdomain.in` and add a "Free QR Maker" link to your store's menu. The "Order printed" button sends customers back to your store.

Keep the tool on its own page, separate from your store's tracking scripts. Marketing pixels such as Meta Pixel can automatically read phone and email fields on the page they run on, which would break the promise that nothing typed here is sent anywhere.

If your store's privacy policy already covers the subdomain, add this line to it: "QR codes are created in your browser; what you type into the QR maker is never sent to us."


If you change the site
----------------------

* Adding analytics, ads, sign-up, or anything that sends data to a server means `legal.html` must be updated first. The privacy policy currently says nothing is collected.
* Anything loaded from another domain (fonts, ad scripts) has to be allowed in the `Content-Security-Policy` meta tag at the top of each page.
* To rebuild `qrcodegen.js` after updating the library, run from the repo root:
  `tsc --strict --lib DOM,DOM.Iterable,ES6 --target ES6 --outDir web typescript-javascript/qrcodegen.ts`
