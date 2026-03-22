import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import { Octokit } from "octokit";
import axios from "axios";
import fs from "fs";
import path from "path";

dotenv.config();

const router = express.Router();

// Stripe Donation Session
router.post("/create-donation-session", async (req, res) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return res.status(500).json({ 
      error: "Stripe Secret Key is missing. Please add STRIPE_SECRET_KEY to your environment variables in the Settings menu." 
    });
  }

  const stripeInstance = new Stripe(stripeKey);

  try {
    const session = await stripeInstance.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Donation to Educational Charity",
              description: "100% of this $5 donation goes directly to a random educational charity for students. Open Code does not take any cut.",
            },
            unit_amount: 500, // $5.00
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.origin}/?donation=success`,
      cancel_url: `${req.headers.origin}/?donation=cancelled`,
    });

    res.json({ id: session.id, url: session.url });
  } catch (error: any) {
    console.error("Stripe Session Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// GitHub OAuth
router.get("/auth/github", (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.status(500).send("GITHUB_CLIENT_ID is not configured.");
  }
  const redirectUri = `${req.headers.origin}/api/auth/github/callback`;
  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=repo,user:email`;
  res.redirect(url);
});

router.get("/auth/github/callback", async (req, res) => {
  const { code } = req.query;
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!code || !clientId || !clientSecret) {
    return res.status(400).send("Missing code or credentials.");
  }

  try {
    const response = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: clientId,
        client_secret: clientSecret,
        code,
      },
      {
        headers: { Accept: "application/json" },
      }
    );

    const { access_token } = response.data;
    if (!access_token) {
      throw new Error("Failed to get access token.");
    }

    // Send token to parent window and close popup
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GITHUB_AUTH_SUCCESS', token: '${access_token}' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error("GitHub Auth Error:", error);
    res.status(500).send("GitHub Authentication failed.");
  }
});

// Publish to GitHub
router.post("/publish", async (req, res) => {
  const { token, repoName, description } = req.body;
  if (!token || !repoName) {
    return res.status(400).json({ error: "Token and repoName are required." });
  }

  const octokit = new Octokit({ auth: token });

  try {
    // 1. Get user info
    const { data: user } = await octokit.rest.users.getAuthenticated();

    // 2. Create repository
    const { data: repo } = await octokit.rest.repos.createForAuthenticatedUser({
      name: repoName,
      description: description || "Published from Open-Code",
      auto_init: false,
    });

    // 3. Read files to push
    const filesToPush: { path: string; content: string }[] = [];
    const projectRoot = process.cwd();

    const walk = (dir: string) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const relativePath = path.relative(projectRoot, fullPath);

        // Skip ignored files/dirs
        if (
          file === "node_modules" ||
          file === ".git" ||
          file === "dist" ||
          file === ".env" ||
          file === ".DS_Store"
        ) {
          continue;
        }

        if (fs.statSync(fullPath).isDirectory()) {
          walk(fullPath);
        } else {
          const content = fs.readFileSync(fullPath, "utf-8");
          filesToPush.push({ path: relativePath, content });
        }
      }
    };

    walk(projectRoot);

    // 4. Create blobs and tree
    const blobs = await Promise.all(
      filesToPush.map(async (file) => {
        const { data: blob } = await octokit.rest.git.createBlob({
          owner: user.login,
          repo: repo.name,
          content: file.content,
          encoding: "utf-8",
        });
        return { path: file.path, sha: blob.sha, mode: "100644" as const, type: "blob" as const };
      })
    );

    const { data: tree } = await octokit.rest.git.createTree({
      owner: user.login,
      repo: repo.name,
      tree: blobs,
    });

    // 5. Create commit
    const { data: commit } = await octokit.rest.git.createCommit({
      owner: user.login,
      repo: repo.name,
      message: "Initial commit from Open-Code",
      tree: tree.sha,
    });

    // 6. Update reference
    await octokit.rest.git.createRef({
      owner: user.login,
      repo: repo.name,
      ref: "refs/heads/main",
      sha: commit.sha,
    });

    res.json({ success: true, url: repo.html_url });
  } catch (error: any) {
    console.error("Publish Error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
