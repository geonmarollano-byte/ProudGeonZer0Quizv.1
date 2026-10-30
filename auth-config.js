"use strict";

/* ============================================================
   ADMIN LOGIN VERIFIER — UPGRADE 2
   ============================================================

   The administrator username and password are NOT stored in this file, and
   they are not stored anywhere else in this repository. What is stored is a
   one-way PBKDF2-SHA256 verifier derived from the pair:

       verifier = PBKDF2-SHA256(salt, iterations, username + "\0" + password)

   The browser recomputes that verifier from what the user types and compares
   the two values. The comparison is one-way: the credential pair cannot be
   read back out of the verifier.

   IMPORTANT — read before relying on this:
   GitHub Pages serves static files only, so this check runs entirely in the
   browser. It stops casual/accidental access, but it is NOT server-grade
   security: anyone who can read this file can also modify it, bypass it, or
   brute-force the verifier offline. Do not gate anything sensitive, personal
   or destructive behind it. When a real backend exists, replace this file's
   contents with an endpoint call (see README → "Admin authentication").

   Changing the credentials:
   1. Open the browser console on any page of the site.
   2. Run:
        const enc = new TextEncoder();
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const key = await crypto.subtle.importKey(
          "raw", enc.encode(username + "\u0000" + password),
          "PBKDF2", false, ["deriveBits"]);
        const bits = await crypto.subtle.deriveBits(
          { name: "PBKDF2", salt, iterations: 210000, hash: "SHA-256" },
          key, 256);
        const b64 = (b) => btoa(String.fromCharCode(...new Uint8Array(b)));
        console.log({ salt: b64(salt), verifier: b64(bits) });
   3. Paste the printed salt and verifier below.
   ============================================================ */

window.PG_ADMIN_AUTH = {
  algorithm: "PBKDF2-SHA256",
  iterations: 210000,
  salt: "UYyC3+UhQHkcv8gyyjl92w==",
  verifier: "jJGjecycOyYvjRo+a3VvwFygUIKrjnrBPV0rA++AC9M=",
};
