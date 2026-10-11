import { createOAuthAppAuth } from "@octokit/auth-app";

export default async function handler(req, res) {
  const { client_id } = req.query;
  const redirect_uri = `https://github.com/login/oauth/authorize?client_id=${process.env.OAUTH_CLIENT_ID}&scope=repo,user`;
  res.redirect(redirect_uri);
}