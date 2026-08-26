// Exposes which commit is actually deployed, so an external check can tell
// a real git-based deploy apart from a direct dashboard/CLI upload.
// VERCEL_GIT_COMMIT_SHA is set automatically by Vercel ONLY for
// git-triggered deployments -- a direct deploy leaves it empty. That gap
// is exactly what let a real content update (2026-08-21's "the Chef"
// rebrand, Rush Hour, Midnight Rush) go live without ever being committed,
// and get silently erased days later by the next ordinary git push. See
// deploy-drift-check.js in the chef-app repo, which polls this on a
// schedule. Safe to be public: a commit hash and a boolean, nothing
// sensitive.
module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    ok: true,
    service: 'pizzeria-panic',
    gitSha: process.env.VERCEL_GIT_COMMIT_SHA || null,
    deployedAt: process.env.VERCEL_DEPLOYMENT_ID || null,
  });
};
