-- Persist kids onboarding completion per user so logout/session resets do not replay it.
ALTER TABLE "User" ADD COLUMN "kidsOnboardingCompleted" BOOLEAN NOT NULL DEFAULT false;
