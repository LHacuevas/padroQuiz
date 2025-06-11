# Padrón Municipal Interactive Guide

This application is an interactive guide to help users understand the documentation and steps required for municipal registration (empadronamiento) in Spain. It uses React and Firebase.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

*   Node.js (v16 or later recommended)
*   npm (comes with Node.js) or yarn

### Setting up the Project

1.  **Create a new React project (using Vite):**
    If you don't have an existing React project, you can create one using Vite for a fast development experience:
    ```bash
    npm create vite@latest my-padron-app -- --template react-ts
    cd my-padron-app
    ```
    (Replace `my-padron-app` with your desired project name).

2.  **Copy Application Files:**
    *   Place the `padroQuiz.tsx` file into the `src/` directory of your new Vite project (e.g., `my-padron-app/src/padroQuiz.tsx`). You might want to rename it to `App.tsx` and update imports accordingly if it's the main app component, or import it into the existing `src/App.tsx`. For simplicity, let's assume you replace `src/App.tsx` with `padroQuiz.tsx` (renaming `padroQuiz.tsx` to `App.tsx`).
    *   Copy the entire `src/components/`, `src/data/`, `src/interfaces.ts`, `src/locales/`, and `src/firebaseConfig.ts` from this refactored structure into your new project's `src/` directory. The structure should look like:
        ```
        my-padron-app/
        ├── src/
        │   ├── components/
        │   │   ├── Breadcrumbs.tsx
        │   │   ├── ConfirmationModal.tsx
        │   │   ├── DocumentUpload.tsx
        │   │   ├── FinalDocumentReviewScreen.tsx
        │   │   ├── QuestionnaireScreen.tsx
        │   │   └── SummaryScreen.tsx
        │   ├── data/
        │   │   └── flowData.es.json
        │   ├── locales/
        │   │   └── es.json
        │   ├── firebaseConfig.ts
        │   ├── interfaces.ts
        │   ├── App.tsx  (this is the renamed padroQuiz.tsx)
        │   ├── main.tsx (Vite's entry point, ensure it renders your App)
        │   └── ... (other Vite default files like index.css, assets)
        ├── public/
        ├── index.html
        ├── package.json
        └── ... (other project files)
        ```
    *   **Important**: Ensure your main entry point (typically `src/main.tsx` in Vite) renders your main application component. If you renamed `padroQuiz.tsx` to `App.tsx`, `src/main.tsx` should look like this:
        ```typescript
        // src/main.tsx
        import React from 'react'
        import ReactDOM from 'react-dom/client'
        import App from './App.tsx' // Assuming padroQuiz.tsx was renamed to App.tsx
        import './index.css' // Or your main CSS file

        ReactDOM.createRoot(document.getElementById('root')!).render(
          <React.StrictMode>
            <App />
          </React.StrictMode>,
        )
        ```

3.  **Install Dependencies:**
    Navigate to your project's root directory (`my-padron-app`) and install the necessary dependencies:
    ```bash
    npm install
    # Install specific packages used by the application
    npm install firebase lucide-react
    ```
    If you are using yarn:
    ```bash
    yarn
    yarn add firebase lucide-react
    ```

4.  **Configure Firebase:**
    *   Open `src/firebaseConfig.ts`.
    *   You will see placeholder values for the Firebase configuration (`apiKey`, `authDomain`, etc.). Replace these with your actual Firebase project's configuration. You can get these details from the Firebase console when you set up a new web app in your Firebase project.
    *   The `__app_id`, `__firebase_config`, and `__initial_auth_token` variables are intended to be injected by an external environment (like a Canvas LMS). For local development, `firebaseConfig.ts` uses placeholders if these are not found. Ensure your Firebase project is properly set up and the configuration in `firebaseConfig.ts` is correct for local development if these global variables are not defined.
    *   **Gemini API Key for Document Validation**: The `validateDocumentWithAI` function in `App.tsx` (formerly `padroQuiz.tsx`) uses a variable `apiKey` for the Google Gemini API, which is currently an empty string. You will need to obtain an API key for Gemini and place it there or manage it through environment variables for the document validation feature to work.

5.  **Set up Tailwind CSS (Optional but Recommended):**
    The component JSX uses Tailwind CSS classes (e.g., `min-h-screen`, `bg-gradient-to-br`). If you created a new Vite project, you'll need to set up Tailwind CSS:
    ```bash
    npm install -D tailwindcss postcss autoprefixer
    npx tailwindcss init -p
    ```
    Then, configure your `tailwind.config.js`:
    ```javascript
    /** @type {import('tailwindcss').Config} */
    export default {
      content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}", // Configure paths to your template files
      ],
      theme: {
        extend: {},
      },
      plugins: [],
    }
    ```
    And add Tailwind directives to your main CSS file (e.g., `src/index.css`):
    ```css
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
    ```

### Running the Application

Once the setup is complete, you can run the development server:

```bash
npm run dev
```
Or if using yarn:
```bash
yarn dev
```
This will start the development server, and you can view the application in your browser at the URL provided (usually `http://localhost:5173` for Vite).

## Code Structure

*   **`padroQuiz.tsx` (or `App.tsx`):** Main application component, state management, and logic.
*   **`src/components/`:** Contains all the reusable UI components.
*   **`src/data/`:** Contains data files like `flowData.es.json`.
*   **`src/locales/`:** Contains localization files (e.g., `es.json`).
*   **`src/firebaseConfig.ts`:** Firebase initialization and configuration.
*   **`src/interfaces.ts`:** TypeScript interfaces for props and data structures.

```
