# How to Use This Application from a USB Drive

This guide will walk you through the process of building the application, copying it to a USB drive, and running it in a fully offline environment.

## Step 1: Building the Application

First, you need to generate the static, offline-ready version of the application.

1.  **Open a terminal** in the project's root directory.
2.  **Run the build command:**
    ```bash
    npm run build
    ```
3.  This will create a new folder named `out` in your project directory. This folder contains all the necessary HTML, CSS, and JavaScript files to run the application.

## Step 2: Copying to a USB Drive

1.  **Plug in your USB drive.**
2.  **Copy the entire `out` folder** from your project directory to your USB drive. You can rename the `out` folder to something more descriptive, like `KisanKhata`, if you wish.

## Step 3: Running the Application

1.  **Navigate to the `out` folder** (or the folder you renamed it to) on your USB drive.
2.  **Open the `index.html` file** in your preferred web browser (e.g., Chrome, Firefox).
3.  The application will start, and you will be prompted to **load a data file**.

## Step 4: Managing Your Data

This application operates on a file-based data system, which is ideal for portable use.

*   **Loading Data:** When you start the application, click the "Load Data File" button and select your `.json` data file from your USB drive.
*   **Saving Data:** To save your work, click the "Save Data" button on the dashboard. This will download a new `.json` file with all your latest changes. **Be sure to save this file to your USB drive**, replacing your old data file if you wish.
*   **First-Time Use:** If you are using the application for the first time, you can start by setting up your master data (suppliers, customers, etc.). When you are ready, click "Save Data" to create your first data file.
