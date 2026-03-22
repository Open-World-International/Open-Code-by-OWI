# Open-Code by OWI

Open-Code is a powerful, AI-driven code editor and execution environment.

## G-Coder AI Engine

The core of Open-Code is **G-Coder**, a self-aware AI engine that can write, execute, and modify code without restrictions.

### How to "Install" G-Coder on Your Website (Vercel/GitHub)

If you have deployed this project to Vercel or another hosting provider, you must configure the AI engine to make it work:

1.  **Get a Gemini API Key:** Go to [Google AI Studio](https://aistudio.google.com/) and create a free API key.
2.  **Add Environment Variable:**
    -   In your **Vercel Dashboard**, go to **Settings > Environment Variables**.
    -   Add a new variable:
        -   **Key:** `GEMINI_API_KEY`
        -   **Value:** `[Your API Key]`
3.  **Redeploy:** Trigger a new deployment on Vercel.

Once the environment variable is set, G-Coder will be fully active and ready to assist you.

## Features

- **Monaco Editor:** Industry-standard code editing experience.
- **Multi-Language Support:** Python, JavaScript, C++, and more.
- **AI Chat:** Interact with G-Coder to generate or debug code.
- **GitHub Integration:** Publish your projects directly to GitHub.
- **Stripe Integration:** Support the project through donations.

## Development

```bash
npm install
npm run dev
```
