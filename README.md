# Guía Interactiva para el Empadronamiento Municipal (Padrón Digital)

Esta aplicación es una herramienta web interactiva y multilingüe diseñada para simplificar el proceso de empadronamiento municipal en España. Guía a los usuarios a través de un cuestionario para identificar su escenario específico de registro, determina la documentación necesaria y utiliza IA para ayudar a validar los documentos subidos y extraer información relevante.

El objetivo principal es hacer que el proceso del padrón sea más accesible y comprensible para todos, reduciendo errores y agilizando la recopilación de la información requerida antes de que los usuarios interactúen con los servicios municipales.

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

## Características

Esta aplicación ofrece una variedad de características para asistir a los usuarios en el proceso de empadronamiento municipal:

*   **Cuestionario Guiado:** Un cuestionario interactivo paso a paso para determinar los requisitos específicos de empadronamiento del usuario según su situación (ej., nuevo registro, cambio de domicilio, miembros de la familia).
*   **Lista de Documentos Dinámica:** Genera automáticamente una lista personalizada de los documentos requeridos basándose en las respuestas del cuestionario.
*   **Interfaz Multilingüe:** Soporta múltiples idiomas (incluyendo español, catalán, árabe, francés, italiano y chino) para una mayor accesibilidad. Los usuarios pueden cambiar de idioma en cualquier momento.
*   **Carga Segura de Documentos:** Permite a los usuarios subir los documentos necesarios directamente a través de la aplicación.
*   **Validación de Documentos con IA:**
    *   Utiliza IA (Google Gemini) para analizar los documentos subidos.
    *   Verifica si el documento parece ser del tipo correcto y es legible.
    *   Extrae información clave (ej., nombre completo, número de identificación, detalles de la dirección) de los documentos.
*   **Revisión de Datos Extraídos:** Los usuarios pueden ver los datos que la IA ha extraído de sus documentos, asegurando la transparencia.
*   **Resumen del Procedimiento Asistido por IA:** Proporciona un resumen generado por IA que sugiere la dirección de empadronamiento final y la lista de personas a empadronar, basándose en toda la información proporcionada.
*   **Autocompletado de Datos:** La información extraída de documentos de identidad válidos puede rellenar automáticamente la lista de personas para el empadronamiento.
*   **Gestión de Detalles por el Usuario:** Permite a los usuarios revisar y gestionar la lista de personas a empadronar y la dirección de registro.
*   **Integración con Firebase:**
    *   Utiliza Firebase Anonymous Authentication para la gestión de sesiones de usuario.
    *   Guarda de forma segura el progreso del usuario (respuestas del cuestionario, archivos subidos, datos extraídos) en Firestore, permitiendo a los usuarios pausar y reanudar potencialmente.
*   **Reinicio de la Aplicación:** Opción para borrar todos los datos y comenzar el proceso del cuestionario desde el principio.
*   **Interfaz de Usuario Intuitiva:** Diseñada con principios modernos de UI, incluyendo migas de pan (breadcrumbs) para una fácil navegación y modales para interacciones enfocadas.
*   **Diseño Adaptable (Responsive):** Se adapta a diferentes tamaños de pantalla para su uso en ordenadores de escritorio, tabletas y dispositivos móviles.

## Stack Tecnológico

Este proyecto está construido con un stack de desarrollo web moderno:

*   **Frontend:**
    *   [React](https://reactjs.org/) (v18+): Una biblioteca de JavaScript para construir interfaces de usuario.
    *   [Vite](https://vitejs.dev/): Una herramienta de compilación rápida y servidor de desarrollo para proyectos web modernos.
    *   [TypeScript](https://www.typescriptlang.org/): Un superconjunto tipado de JavaScript que compila a JavaScript plano.
*   **Estilos:**
    *   [Tailwind CSS](https://tailwindcss.com/): Un framework CSS "utility-first" para el desarrollo rápido de UI.
    *   [Lucide React](https://lucide.dev/): Una biblioteca de iconos SVG simples, atractivos y consistentes.
*   **Backend y Servicios:**
    *   [Firebase](https://firebase.google.com/):
        *   **Firebase Authentication:** Para la autenticación anónima de usuarios.
        *   **Firestore:** Una base de datos de documentos NoSQL para almacenar el progreso del usuario y los datos de la aplicación.
        *   [Google Gemini AI](https://ai.google.dev/):
            *   Utilizado para la validación de documentos asistida por IA (análisis de imágenes/texto, extracción de entidades).
            *   Utilizado para generar resúmenes de procedimientos impulsados por IA.
            *   Utilizado para la traducción de texto sobre la marcha.
*   **Gestión de Estado:**
    *   React Context API: Para gestionar el estado global como la preferencia de idioma y la autenticación del usuario.
*   **Internacionalización (i18n):**
    *   Solución personalizada usando archivos JSON para almacenar traducciones (`src/locales/`) y React Context para el cambio de idioma.

## Cómo Empezar

Sigue estas instrucciones para configurar y ejecutar el proyecto en tu máquina local para desarrollo y pruebas.

### Prerrequisitos

Antes de comenzar, asegúrate de tener instalado lo siguiente:

*   [Node.js](https://nodejs.org/) (v16 o posterior recomendado)
*   [npm](https://www.npmjs.com/get-npm) (viene con Node.js) o [yarn](https://classic.yarnpkg.com/en/docs/install)

### Instalación

1.  **Clona el repositorio:**
    ```bash
    git clone <url-del-repositorio>
    cd <directorio-del-repositorio>
    ```
    (Reemplaza `<url-del-repositorio>` con la URL real del repositorio y `<directorio-del-repositorio>` con el nombre de la carpeta creada al clonar).

2.  **Instala las dependencias:**
    Usando npm:
    ```bash
    npm install
    ```
    O usando yarn:
    ```bash
    yarn install
    ```

3.  **Configura las Variables de Entorno:**
    Este proyecto requiere claves API para Firebase y Google Gemini.
    *   En el directorio raíz del proyecto, encontrarás un archivo llamado `.env.example`.
    *   Crea una copia de este archivo y llámala `.env`:
        ```bash
        cp .env.example .env
        ```
    *   Abre el archivo `.env` y reemplaza los valores de ejemplo con los detalles de configuración de tu proyecto de Firebase y tu clave API de Google Gemini. (Consulta la sección "Variables de Entorno" más abajo para detalles sobre cada variable).
    *   **Importante:** El archivo `.env` contiene credenciales sensibles y **no** debe ser subido al control de versiones. El archivo `.gitignore` ya está configurado para ignorar `.env`.
    *   Para la **configuración de Firebase**:
        *   Ve a la [Consola de Firebase](https://console.firebase.google.com/).
        *   Crea un nuevo proyecto o selecciona uno existente.
        *   Registra una nueva aplicación web para obtener tus detalles de configuración de Firebase.
        *   Habilita la **Autenticación Anónima** en la pestaña "Authentication" > "Sign-in method".
        *   Configura **Firestore Database**. Cuando se te solicite, inicia en **modo de prueba** para el desarrollo inicial (esto permite lecturas/escrituras durante 30 días). Recuerda configurar las reglas de seguridad para producción. Elige una ubicación de Firestore apropiada para tus usuarios.
        *   Para la **Clave API de Google Gemini**:
            *   Ve a [Google AI Studio](https://aistudio.google.com/) o a la Google Cloud Console para obtener tu clave API para los modelos Gemini.

4.  **Ejecuta el Servidor de Desarrollo:**
    Usando npm:
    ```bash
    npm run dev
    ```
    O usando yarn:
    ```bash
    yarn dev
    ```
    Esto iniciará el servidor de desarrollo (generalmente en `http://localhost:5173` o un puerto similar). Abre esta URL en tu navegador web para ver la aplicación.

## Variables de Entorno

La aplicación requiere que ciertas variables de entorno estén configuradas para acceder a los servicios de Firebase y la API de Google Gemini AI. Estas variables deben colocarse en un archivo `.env` en la raíz del proyecto.

Crea un archivo `.env` copiando `.env.example`:
```bash
cp .env.example .env
```

Luego, actualiza las siguientes variables en tu archivo `.env`:

*   **`VITE_FIREBASE_API_KEY`**: La clave API de tu proyecto de Firebase.
*   **`VITE_FIREBASE_AUTH_DOMAIN`**: El dominio de autenticación de tu proyecto de Firebase (ej., `tu-proyecto-id.firebaseapp.com`).
*   **`VITE_FIREBASE_PROJECT_ID`**: El ID único de tu proyecto de Firebase.
*   **`VITE_FIREBASE_STORAGE_BUCKET`**: El bucket de Cloud Storage de tu proyecto de Firebase (ej., `tu-proyecto-id.appspot.com`).
*   **`VITE_FIREBASE_MESSAGING_SENDER_ID`**: El ID de remitente de mensajería de tu proyecto de Firebase.
*   **`VITE_FIREBASE_APP_ID`**: El ID de aplicación de tu proyecto de Firebase.

    *Obtén estas credenciales de Firebase desde la Consola de Firebase navegando a la Configuración de tu proyecto > General > Tus apps > Configuración de la app web.*

*   **`VITE_GEMINI_API_KEY`**: Tu clave API para Google Gemini. Es necesaria para las funciones de validación de documentos asistida por IA, extracción de datos, resúmenes de procedimientos y traducción de texto.

    *Obtén esta clave API desde [Google AI Studio](https://aistudio.google.com/) o la Google Cloud Console habilitando la API Generative Language.*

*   **`VITE_APP_ID`**: Un identificador general de la aplicación usado internamente. Puedes dejarlo como `default-app-id` o establecer un valor personalizado si es necesario para tu configuración específica.

**Importante:**
*   Todas las variables de entorno que necesiten ser expuestas al código del lado del cliente en Vite **deben** tener el prefijo `VITE_`.
*   El archivo `.env` contiene información sensible y **nunca** debe ser subido a tu sistema de control de versiones (ej., Git). El archivo `.gitignore` proporcionado ya debería incluir `.env`.

## Uso de la Aplicación

Una vez que la aplicación está en funcionamiento, los usuarios generalmente pueden seguir estos pasos:

1.  **Selección de Idioma (Opcional):**
    *   Si la aplicación se inicia en un idioma que el usuario no prefiere, normalmente puede encontrar un selector de idioma para elegir el deseado entre las opciones disponibles.

2.  **Iniciar el Cuestionario:**
    *   Los usuarios comienzan respondiendo las preguntas presentadas, que los guían a través de diferentes escenarios de empadronamiento municipal.

3.  **Identificación y Carga de Documentos:**
    *   La aplicación identificará los documentos específicos requeridos.
    *   Los usuarios suben los archivos correspondientes y ven el estado de cada uno (ej., pendiente de validación, validado, error).

4.  **Validación de Documentos y Extracción de Datos:**
    *   Los usuarios pueden activar la validación por IA para los documentos subidos.
    *   La IA intenta validar el tipo de documento y extraer información relevante, que los usuarios podrían visualizar.

5.  **Revisar Información:**
    *   Una pantalla de resumen muestra la información recopilada, incluyendo las personas a empadronar y la dirección propuesta. También podría estar disponible un resumen del procedimiento generado por IA.

6.  **Gestionar Detalles:**
    *   Los usuarios pueden revisar y editar detalles como la dirección de empadronamiento o la lista de personas a empadronar.

7.  **Pasos Finales (Conceptuales):**
    *   La aplicación ayuda a los usuarios a prepararse para el empadronamiento municipal real. El resultado final es para que el usuario lo lleve a la oficina municipal o lo use en un portal de envío en línea.

8.  **Reiniciar (Si es Necesario):**
    *   Los usuarios pueden usar la funcionalidad "Reiniciar" para borrar su progreso y comenzar de nuevo.
