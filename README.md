**Apex Racing — 403 IP Restriction Bypass Lab 🛡️**

 The Challenge

The Admin Panel (/admin) is protected by an Access Control List (ACL) that restricts access to the internal network (127.0.0.1) only. As an external attacker, you are blocked with a 403 Forbidden error, even before authentication (login).

This lab demonstrates how trusting the X-Forwarded-For header can lead to a critical firewall bypass.
---
**Setup**
``

npm install

node server.js


Access: http://localhost:3000
---
** Exploit Walkthrough**

Phase 1: Confirmation (The 403 Block)

Open your browser and navigate directly to the Admin Panel: http://localhost:3000/admin.

Result: You will immediately see the 403 FORBIDDEN page, confirming the firewall is active.

Phase 2: The Bypass (Header Spoofing)

We need to convince the server that our external request originated from the internal management network (127.0.0.1).

Use a Proxy Tool (e.g., Burp Suite Repeater) or a Header Editor (e.g., ModHeader).

Intercept or modify the GET request to /admin.

Add the following HTTP Header:

X-Forwarded-For: 127.0.0.1


Send the Request.

Phase 3: The Result (Access Granted)

Response: The server will now respond with a 302 Found redirecting you to /admin/login.

Browser: If you used a browser extension, the page will instantly change from the 403 screen to the Race Control Secure Login page.
---

**Disclaimer**
This application contains intentional security vulnerabilities.
Do NOT run this application on a public server or production environment.
Use only for educational purposes and authorized testing.
Created for the Bug Bounty Series.

