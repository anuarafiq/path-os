// Whitelists for the navigateTo agent tool — the model can only ever return one of
// these values, so a bad tool call can't send the user to a route that doesn't exist.
export const CANDIDATE_ROUTES = [
  "/dashboard",
  "/explore",
  "/jobs",
  "/portfolio",
  "/certificates",
  "/applications",
  "/profile/edit",
  "/settings",
  "/pay",
] as const;

export const EMPLOYER_ROUTES = [
  "/employer/dashboard",
  "/employer/jobs",
  "/employer/jobs/new",
  "/employer/pipeline",
  "/employer/search",
  "/employer/re-engage",
  "/employer/profile",
  "/employer/settings",
] as const;
