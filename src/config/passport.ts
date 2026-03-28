import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import { prisma } from "../lib/prisma";

// Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: `${process.env.API_URL}/auth/google/callback`,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0].value;
        const avatar = profile.photos?.[0].value;
        const fullName = profile.displayName;

        if (!email) return done(new Error("No email found in Google profile"));

        // Check if user already exists
        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
          // Create new user — email is already verified via Google
          user = await prisma.user.create({
            data: {
              email,
              fullName,
              avatar,
              isVerified: true,
              provider: "google",
              providerId: profile.id,
            },
          });
        } else if (user.provider !== "google") {
          // User exists but signed up with email/password
          return done(
            new Error(
              "This email is already registered. Please log in with your password.",
            ),
          );
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    },
  ),
);

// GitHub Strategy
passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      callbackURL: `${process.env.API_URL}/auth/github/callback`,
      scope: ["user:email"],
    },
    async (
      _accessToken: string,
      _refreshToken: string,
      profile: any,
      done: any,
    ) => {
      try {
        const email = profile.emails?.[0].value;
        const avatar = profile.photos?.[0].value;
        const fullName = profile.displayName || profile.username;

        if (!email)
          return done(
            new Error(
              "No email found in GitHub profile. Make sure your GitHub email is public.",
            ),
          );

        // Check if user already exists
        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
          // Create new user — email is already verified via GitHub
          user = await prisma.user.create({
            data: {
              email,
              fullName,
              avatar,
              isVerified: true,
              provider: "github",
              providerId: profile.id,
            },
          });
        } else if (user.provider !== "github") {
          // User exists but signed up with email/password
          return done(
            new Error(
              "This email is already registered. Please log in with your password.",
            ),
          );
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    },
  ),
);

export default passport;
