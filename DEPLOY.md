# How to Deploy This Application for Free

This Next.js application is configured for a static-only build (`output: 'export'`), which means it can be deployed for free on a variety of modern hosting platforms.

The core idea is simple:
1.  **Build the project**: This creates a static version of your site in a folder named `out`.
2.  **Deploy the `out` folder**: Upload the contents of this folder to a hosting provider.

Below are step-by-step instructions for two popular free options.

---

## Option 1: Deploying with Vercel (Recommended)

Vercel is made by the creators of Next.js and provides the best integration and performance with zero configuration.

### Steps:

1.  **Sign up for Vercel**: Go to [vercel.com](https://vercel.com) and sign up for a free "Hobby" account using your GitHub, GitLab, or Bitbucket account.

2.  **Push Your Code to a Git Repository**: If you haven't already, push your project code to a repository on GitHub, GitLab, or Bitbucket.

3.  **Create a New Vercel Project**:
    *   From your Vercel dashboard, click "**Add New...**" > "**Project**".
    *   Select the Git repository where you pushed your code.
    *   Vercel will automatically detect that it's a Next.js project. **You do not need to change any build settings.** The default configuration is correct.

4.  **Deploy**: Click the "**Deploy**" button.

That's it! Vercel will build your project and deploy it to a public URL. Every time you push new changes to your Git repository, Vercel will automatically redeploy the application for you.

---

## Option 2: Deploying with Firebase Hosting

Since you are using Firebase Studio, Firebase Hosting is another excellent and well-integrated option.

### Prerequisites:

You need to have the Firebase CLI (Command Line Interface) installed. If you don't have it, open a terminal and run:
```bash
npm install -g firebase-tools
```

### Steps:

1.  **Login to Firebase**: In your terminal, run the following command and follow the prompts to log in to your Google account:
    ```bash
    firebase login
    ```

2.  **Initialize Firebase in Your Project**:
    *   In your project's root directory, run:
        ```bash
        firebase init
        ```
    *   Use the arrow keys to select "**Hosting: Configure files for Firebase Hosting and (optionally) set up GitHub Action deploys**" and press `Space` to select, then `Enter` to confirm.
    *   Select "**Use an existing project**" and choose the Firebase project associated with this app.
    *   When asked for your public directory, type `out`.
    *   When asked to configure as a single-page app, answer `y` (Yes).
    *   When asked to set up automatic builds and deploys with GitHub, you can answer `n` (No) for now to keep it simple.

3.  **Build Your Application**: Before deploying, you need to create the static `out` folder. Run:
    ```bash
    npm run build
    ```

4.  **Deploy to Firebase**: After the build is complete, run the following command to deploy the contents of the `out` folder:
    ```bash
    firebase deploy --only hosting
    ```

After the command finishes, it will provide you with your public Hosting URL where you can view your live application. Each time you want to update your site, you will need to run `npm run build` and then `firebase deploy --only hosting` again.
