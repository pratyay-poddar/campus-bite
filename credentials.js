/* ============================================================
   credentials.js  —  CampusBite Staff Credentials & Schedule
   
   ⚠️  This is a frontend demo credential file.
       In a production app, authentication should be handled
       server-side with hashed passwords and secure sessions.
   ============================================================ */

const STAFF_CREDENTIALS = [
  {
    username: "staff1",
    password: "canteen@123",
    name: "Ramesh Kumar",
    role: "Head Counter Staff",
    avatar: "👨‍🍳"
  },
  {
    username: "waiter1", // Alias for backward compatibility
    password: "canteen@123",
    name: "Ramesh Kumar",
    role: "Head Counter Staff",
    avatar: "👨‍🍳"
  },
  {
    username: "staff2",
    password: "serve@456",
    name: "Priya Sharma",
    role: "Counter Assistant",
    avatar: "👩‍🍳"
  },
  {
    username: "waiter2", // Alias for backward compatibility
    password: "serve@456",
    name: "Priya Sharma",
    role: "Counter Assistant",
    avatar: "👩‍🍳"
  },
  {
    username: "admin",
    password: "admin@2026",
    name: "Manager",
    role: "Canteen Admin",
    avatar: "🧑‍💼"
  }
];

// Alias for backwards compatibility
const WAITER_CREDENTIALS = STAFF_CREDENTIALS;

/* Default canteen schedule
   ─────────────────────────────────────────────────────────────
   openingTime  : When the canteen opens — students can start
                  pre-ordering from this time.
   breakTime    : When the break STARTS — ordering automatically
                  closes at this time (break start = order cutoff).

   alwaysOpen   : Set TRUE to let students order at any time.
                  Useful for testing or special events.
                  Set FALSE for normal time-gated operation.
   ───────────────────────────────────────────────────────────── */
const DEFAULT_SCHEDULE = {
  openingTime: "00:00",   // ← students can order from this time
  breakTime: "05:00",   // ← ordering closes when break starts
  alwaysOpen: false      // ← set true to bypass the time gate
};
