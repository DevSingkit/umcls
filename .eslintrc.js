module.exports = {
  root: true,
  extends: ["next/core-web-vitals"],
  overrides: [
    {
      // This is the load-bearing rule for PH0-001's acceptance criteria:
      // "supabaseAdmin import from a client component is a lint error."
      // The service-role client bypasses RLS entirely (see SECURITY.md,
      // DATABASE.md's defense-in-depth notes) — importing it anywhere a
      // client component could pull it into the browser bundle is a real
      // security bug, not a style nit. This rule is what turns that bug
      // class into a lint error instead of something a human has to
      // remember to check in every PR.
      files: ["app/**/*.tsx", "components/**/*.tsx", "features/**/*.tsx"],
      excludedFiles: ["**/actions/**", "**/*.server.ts", "**/route.ts"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            paths: [
              {
                name: "@/lib/supabase/admin",
                message:
                  "supabaseAdmin (service-role client) bypasses RLS and must never be imported into client-reachable code. Use the user-scoped client from @/lib/supabase/client (browser) or @/lib/supabase/server (Server Component/Action) instead. If this file genuinely needs service-role access, it belongs in a Server Action or Route Handler, not a component.",
              },
            ],
          },
        ],
      },
    },
  ],
};
