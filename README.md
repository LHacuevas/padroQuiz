# Padrón Municipal Interactive Guide

## Proceso de generacion

GEMINI. Le subo el PDF del BOP y le digo algo de este tipo.
            Dado este pdf donde se explica todo el procedimiento del padron. 
        Quiero que te centres solo en la casuistica exhaustiva de los procedimientos de alta. 
        Has de cubrir todos los casos mencionados, no te dejes ninguno. Has de generar un json que pueda leer una web interactiva que tambien quiero que hagas.

        Quiero hacer una web interactiva dirigida a la persona que se quiere empadronar.
        Hay que guiarla para que vaya contestando a todas las preguntas de una en una para acabar sabiendo si se puede empadronar o cambiar de domicilio (depende de lo que quiera) y al final del proceso siendo positivo sacar una lista en la que la persona podra adjuntar la documentacion un documento o varios para cada uno de los documentos necesarios. Esos documentos se enviaran a una IA para analizarlos y saber si son lo que dicen y si corresponden a las personas correctas.
        La parte los documentos, para cada punto pueden ser varios documentos (dos caras de un NIF y cosas asi, esta la opcion no obligatorio). Has de sacar el resultado de la validacion individual y siempre se puede eliminar un fichero de los adjuntos y poner otro y volver a validar.
        Cuando se analiza un documento y te dice que no es correcto que te salga la causa por la que dice que no lo es en la linea inferior. 
        Una vez tengamos todo validado, saltaremos a otra pantalla donde diga que en tal direccion (modificable) se quieren empadronar estas personas que sera la que hemos sacado de los documentos y se puedan quitar personas ya que todas ha de ser para la misma direccion.

Voy interactuando hasta que hay algo que me gusta

GITHUB. Creo una carpeta y un repositorio subo el fichero .tsx que me he descargado.

JULES. Le digo que coja ese tsx y lo separe en los json con datos y el codigo, asi como que me diga como poder arrancarlo en mi maquina. 

      La idea es que generara varios ficheros que hara una rama que mergeare y al bajarmela tendre algo decente.
      Cuando le he dicho que me lo haga multiidioma me ha creado los ficheros pero me ha dicho que no está para traducir.

FIREBASE. Cuando he ido a poner las claves del Firebase, parece que tienen tambien un studio ligado al GitHub y si que me esta haciendo las traducciones y parece que tambien modifica en el GitHub. Desde compilacion creo la FireBase Database

          Sigue estos pasos, que solucionarán el problema en el 95% de los casos:

          Ve a la Consola de Firebase.

          Selecciona tu proyecto.

          En el menú de la izquierda, en la sección "Compilación" (Build), haz clic en Firestore Database.

          Si nunca lo has activado, verás una pantalla de bienvenida. Haz clic en el botón "Crear base de datos".

          Te preguntará si quieres empezar en modo de producción o en modo de prueba.

          Para empezar a desarrollar, elige el "modo de prueba". Esto establece reglas de seguridad que permiten leer y escribir durante 30 días, lo cual es ideal para no tener problemas de permisos al principio. ¡Recuerda cambiar estas reglas antes de ir a producción!
          Haz clic en "Siguiente".
          Te pedirá que elijas una ubicación para tus datos (ej. eur3 (europe-west)).

          ¡Importante! No podrás cambiar esta ubicación más tarde. Elige la que esté más cerca de tus usuarios.
          Haz clic en "Habilitar".

Me sigue sin ir, en la consola tengo que habilitar la anonimous

          Sigue estos sencillos pasos en la consola de Firebase:

          Ve a la Consola de Firebase y selecciona tu proyecto.

          En el menú de la izquierda, en la sección "Compilación" (Build), haz clic en Authentication.

          Dentro de Authentication, ve a la pestaña "Sign-in method" (Método de inicio de sesión).

          Verás una lista de posibles proveedores (Email/Contraseña, Google, etc.). Busca en la lista "Anónimo" (Anonymous) y haz clic en el icono del lápiz para editarlo.

          Habilita el interruptor y haz clic en "Guardar".



google AI studio Entro para generar y coger para coger la clave API de Gemini.


Estoy trabajandolo en el portatil.

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
    *   Place the `padroQuiz.tsx` file into the `src/` directory of your new Vite project (e.g., `my-padron-app/src/padroQuiz.tsx`). You might want to rename it to `App.tsx` and update imports accordingly if it's the main app component. For simplicity, let's assume you replace `src/App.tsx` with `padroQuiz.tsx` (renaming `padroQuiz.tsx` to `App.tsx`).
    *   Copy the entire `src/components/`, `src/data/`, `src/interfaces.ts`, `src/locales/`, and `src/firebaseConfig.ts` from this refactored structure into your new project's `src/` directory. The structure should look like:
        ```
        my-padron-app/
        ├── .env.example  (This file should be in the root)
        ├── .gitignore    (Ensure .env is listed here)
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

4.  **Configure Environment Variables:**
    This project uses environment variables for Firebase configuration and the Google Gemini API Key. Vite uses `VITE_` prefixed environment variables.
    *   **Create a `.env` file:** In the root directory of your project (e.g., `my-padron-app/`), create a file named `.env`.
    *   **Copy from `.env.example`:** Copy the contents of `.env.example` (located in the root of this project structure) into your new `.env` file.
    *   **Fill in your credentials:** Replace the placeholder values in your `.env` file with your actual Firebase project configuration details and your Google Gemini API key.
        ```env
        VITE_FIREBASE_API_KEY="YOUR_FIREBASE_API_KEY"
        VITE_FIREBASE_AUTH_DOMAIN="YOUR_FIREBASE_AUTH_DOMAIN"
        VITE_FIREBASE_PROJECT_ID="YOUR_FIREBASE_PROJECT_ID"
        VITE_FIREBASE_STORAGE_BUCKET="YOUR_FIREBASE_STORAGE_BUCKET"
        VITE_FIREBASE_MESSAGING_SENDER_ID="YOUR_FIREBASE_MESSAGING_SENDER_ID"
        VITE_FIREBASE_APP_ID="YOUR_FIREBASE_APP_ID"

        VITE_GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
        VITE_APP_ID="default-app-id" # Or your specific app ID if not using Firebase's
        ```
    *   **Important:** The `.env` file contains sensitive credentials and should NOT be committed to version control. The `.gitignore` file in this project is already configured to ignore `.env`.
    *   The `src/firebaseConfig.ts` file is set up to read these `VITE_` prefixed environment variables. It also contains fallbacks for global variables like `__firebase_config` or `__app_id` if they are injected by an external environment (e.g., Canvas LMS), but the `.env` variables will take precedence for local development.
    *   The `validateDocumentWithAI` function in `App.tsx` (formerly `padroQuiz.tsx`) will use `VITE_GEMINI_API_KEY` from your `.env` file.

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
*   **`src/firebaseConfig.ts`:** Firebase initialization and configuration (reads from `.env`).
*   **`src/interfaces.ts`:** TypeScript interfaces for props and data structures.
*   **`.env.example`:** Example environment variables file.
*   **`.env`:** (You create this locally) Stores your actual environment variables. Ignored by Git.

```
