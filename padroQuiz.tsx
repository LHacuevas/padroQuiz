import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { Upload, XCircle, CheckCircle, Trash2, Home, User, FileText, CheckSquare, Settings, Send } from 'lucide-react'; // Icons

// --- Firebase Configuration and Initialization ---
// Global variables provided by the Canvas environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let firebaseApp;
let db;
let auth;

// --- Messages for localization (simulating CSV) ---
const messages = {
  app_title: "Gestión del Padrón Municipal",
  app_subtitle: "Guía interactiva para tu empadronamiento",
  loading_app: "Cargando la aplicación del Padrón...",
  loading_fallback_message: "Si tarda, recargue la página.",
  summary_title: "Resumen para Empadronamiento",
  summary_address_label: "Dirección:",
  summary_address_save_button: "Guardar",
  summary_address_cancel_button: "Cancelar",
  summary_people_label: "Personas a empadronar (extraídas de documentos de identidad validados):",
  summary_no_people_extracted: "No se han extraído personas de los documentos validados aún.",
  summary_disclaimer: "Esta información es un resumen. Deberá presentar la documentación original en el Ayuntamiento para formalizar el trámite.",
  question_text: "Pregunta", // Generic label, typically replaced by currentContent.question
  docs_required_title: "Documentación Requeria",
  file_status_valid: "Validado",
  file_status_invalid: "Inválido",
  file_status_pending: "Pendiente",
  file_status_uploading: "Subiendo...", // Not directly used but good for completeness
  file_validation_button: "Validar",
  file_validation_loading_button: "Validando...",
  file_remove_button: "Eliminar archivo",
  file_validation_reason: "Causa:",
  file_extracted_data: "Extraído:",
  file_read_error: "Error al leer el archivo.",
  ai_response_error: "No se pudo obtener una respuesta de la IA (estructura inesperada).",
  ai_connection_error: "Error de conexión o procesamiento con la IA:",
  continue_button: "Continuar",
  back_button: "Atrás",
  final_docs_review_title: "Documentación General Recopilada",
  final_docs_no_docs_requested: "No se han solicitado documentos en los pasos previos.",
  final_docs_continue_button: "Pasar a la pantalla final de resumen",
  alert_all_required_docs_needed: "Por favor, suba y valide todos los documentos obligatorios.",
  user_id_label: "ID de Usuario:",
  confirm_no_validation_title: "Confirmación de Continuar sin Validación",
  confirm_no_validation_message: "Estás seguro que quieres continuar sin toda la documentación requerida, esto puede dar lugar al rechazo del alta por falta de documentación.",
  confirm_no_validation_yes_button: "Sí, continuar",
  confirm_no_validation_no_button: "No, volver",
  continue_without_validation_button: "Continuar sin validar",
  final_document_review_instructions: "Este es el resumen de la documentación que ha sido solicitada y validada para su trámite de empadronamiento. Por favor, adjunte y valide los documentos requeridos. Asegúrese de que todos los documentos obligatorios estén validados. Una vez que todo esté listo, podrá pasar a la pantalla final de resumen.",
  send_all_button: "Enviar todo",
  send_success_message: "Datos enviados correctamente. Su trámite ha sido registrado.",
  send_error_message: "Error al enviar los datos. Por favor, inténtelo de nuevo.",
  sending_data: "Enviando datos...",
  breadcrumb_home: "Inicio"
};

// --- Flow Data for Questions and Document Requirements ---
const flowData = {
  "flow": [
    {
      "id": "q1_action_type",
      "question": "¿Qué trámite desea realizar?",
      "type": "single_choice",
      "options": [
        {"text": "Darse de alta por primera vez en el padrón (Alta por nacimiento o por omisión)", "next_question_id": "q2_alta_type"},
        {"text": "Cambiar mi domicilio y empadronarme en este municipio (Alta por cambio de residencia)", "next_question_id": "q2_alta_type"},
        {"text": "Cambiar mi domicilio dentro del mismo municipio (Modificación de datos)", "next_question_id": "domicile_change_info"},
        {"text": "Renovar mi inscripción padronal (extranjeros no comunitarios sin autorización de residencia de larga duración)", "next_question_id": "foreign_renewal_info"}
      ]
    },
    {
      "id": "domicile_change_info",
      "type": "info_block",
      "text": "Para cambiar su domicilio dentro del mismo municipio, necesitará la documentación que acredite su identidad y el nuevo domicilio.",
      "documents": [
          {"name": "Documento de identidad del solicitante", "description": "DNI, NIE, Pasaporte en vigor. (Ambas caras del DNI/NIE si aplica)", "multiple_files": true, "id_extractable": true},
          {"name": "Documento que acredite el uso de la vivienda", "description": "Título de propiedad (escritura, nota simple), Contrato de arrendamiento en vigor y último recibo de alquiler, o autorización de persona ya empadronada con título válido y su DNI/NIE.", "multiple_files": true}
      ],
      "end_flow": true
    },
    {
      "id": "foreign_renewal_info",
      "type": "info_block",
      "text": "Para la renovación de la inscripción padronal de extranjeros no comunitarios sin autorización de residencia de larga duración, debe presentar la solicitud correspondiente en el Ayuntamiento. Se comprobará que sigue residiendo en el municipio.",
      "documents": [
        {"name": "Solicitud de renovación (Anexo IV o V)", "description": "Modelo de solicitud oficial (Anexo IV para persona física, Anexo V para representante).", "multiple_files": false},
        {"name": "Pasaporte o Tarjeta de Identidad de Extranjero (TIE)", "description": "Documento de identidad válido y en vigor.", "multiple_files": true, "id_extractable": true}
      ],
      "end_flow": true
    },
    {
      "id": "q2_alta_type",
      "question": "¿Es un alta por nacimiento (primera inscripción de un recién nacido) o por otra causa?",
      "type": "single_choice",
      "options": [
        {"text": "Es un recién nacido (alta por nacimiento)", "next_question_id": "q_newborn_parental_situation"},
        {"text": "Es por otra causa (cambio de residencia, omisión, etc.)", "next_question_id": "q3_nationality"}
      ]
    },
    {
      "id": "q_newborn_parental_situation",
      "question": "¿El recién nacido se empadronará con ambos progenitores, con uno solo de ellos, o bajo tutela/acogimiento?",
      "type": "single_choice",
      "options": [
        {"text": "Con ambos progenitores", "next_question_id": "docs_newborn_with_both_parents"},
        {"text": "Con uno solo de los progenitores", "next_question_id": "q_newborn_one_parent_custody_newborn"},
        {"text": "Bajo tutela o acogimiento", "next_question_id": "docs_minor_tutored_newborn"}
      ]
    },
    {
      "id": "docs_newborn_with_both_parents",
      "type": "info_block",
      "text": "Para empadronar al recién nacido con ambos progenitores, necesitará:",
      "documents": [
        {"name": "Libro de Familia o Certificado de Nacimiento del menor", "description": "Documento que acredite el nacimiento y filiación.", "multiple_files": false},
        {"name": "Documento de identidad del progenitor 1", "description": "DNI/NIE/Pasaporte en vigor del progenitor 1. (Ambas caras del DNI/NIE si aplica)", "multiple_files": false, "id_extractable": true},
        {"name": "Documento de identidad del progenitor 2", "description": "DNI/NIE/Pasaporte en vigor del progenitor 2. (Ambas caras del DNI/NIE si aplica)", "multiple_files": false, "id_extractable": true}
      ],
      "next_question_id": "final_document_review"
    },
    {
        "id": "q_newborn_one_parent_custody_newborn",
        "question": "¿Tiene una resolución judicial que atribuya la guarda y custodia en exclusiva al progenitor que solicita el empadronamiento del recién nacido, o no existe resolución judicial sobre la guarda y custodia?",
        "type": "single_choice",
        "options": [
            {"text": "Sí, tengo resolución judicial de guarda y custodia exclusiva", "next_question_id": "docs_newborn_one_parent_exclusive_custody"},
            {"text": "No, no existe resolución judicial sobre la guarda y custodia (separación de hecho, etc.)", "next_question_id": "docs_newborn_one_parent_no_resolution"}
        ]
    },
    {
        "id": "docs_newborn_one_parent_exclusive_custody",
        "type": "info_block",
        "text": "Para empadronar al recién nacido con un solo progenitor con guarda y custodia exclusiva, necesitará:",
        "documents": [
            {"name": "Libro de Familia o certificado de nacimiento del menor", "description": "Original y copia.", "multiple_files": false},
            {"name": "Documento de identidad del progenitor solicitante", "description": "DNI/NIE/Pasaporte en vigor del progenitor que solicita el empadronamiento. (Ambas caras del DNI/NIE si aplica)", "multiple_files": true, "id_extractable": true},
            {"name": "Resolución judicial de guarda y custodia exclusiva", "description": "Documento judicial que atribuye la guarda y custodia en exclusiva.", "multiple_files": false},
            {"name": "Declaración responsable (Anexo II)", "description": "Según el modelo que figura en Anexo II.", "multiple_files": false}
        ],
        "next_question_id": "final_document_review"
    },
    {
        "id": "docs_newborn_one_parent_no_resolution",
        "type": "info_block",
        "text": "Para empadronar al recién nacido con un solo progenitor cuando no hay resolución judicial de guarda y custodia, necesitará:",
        "documents": [
            {"name": "Libro de Familia o certificado de nacimiento del menor", "description": "Original y copia.", "multiple_files": false},
            {"name": "Documento de identidad del progenitor solicitante", "description": "DNI/NIE/Pasaporte en vigor del progenitor que solicita el empadronamiento. (Ambas caras del DNI/NIE si aplica)", "multiple_files": true, "id_extractable": true},
            {"name": "Declaración responsable (Anexo I)", "description": "Según el modelo que figura en Anexo I.", "multiple_files": false},
            {"name": "Documentación acreditativa de procedimiento judicial (si aplica)", "description": "Si se ha interpuesto procedimiento judicial para obtener autorización.", "multiple_files": false}
        ],
        "next_question_id": "final_document_review"
    },
    {
      "id": "docs_minor_tutored_newborn",
      "type": "info_block",
      "text": "Para empadronar al recién nacido bajo tutela o acogimiento, necesitará:",
      "documents": [
        {"name": "Libro de Familia o Certificado de Nacimiento del menor", "description": "Original y copia.", "multiple_files": false},
        {"name": "Documento de identidad del representante legal", "description": "DNI/NIE/Pasaporte en vigor del representante legal. (Ambas caras del DNI/NIE si aplica)", "multiple_files": true, "id_extractable": true},
        {"name": "Resolución judicial o administrativa de tutela/acogimiento", "description": "Documento que acredite la representación legal.", "multiple_files": false}
      ],
      "next_question_id": "final_document_review"
    },
    {
      "id": "q3_nationality",
      "question": "¿Cuál es su nacionalidad?",
      "type": "single_choice",
      "options": [
        {"text": "Española", "next_question_id": "q4_spanish_domicile_proof"},
        {"text": "Ciudadano de la Unión Europea, Islandia, Liechtenstein, Noruega o Suiza", "next_question_id": "q4_eu_domicile_proof"},
        {"text": "Extranjero no comunitario con autorización de residencia de larga duración", "next_question_id": "q4_non_eu_long_domicile_proof"},
        {"text": "Extranjero no comunitario sin autorización de residencia de larga duración", "next_question_id": "q4_non_eu_short_domicile_proof"}
      ]
    },
    {
      "id": "q4_spanish_domicile_proof",
      "question": "¿Cómo acredita el domicilio donde se quiere empadronar?",
      "type": "single_choice",
      "options": [
        {"text": "Soy el propietario de la vivienda", "next_question_id": "docs_spanish_owner"},
        {"text": "Tengo un contrato de alquiler en vigor", "next_question_id": "docs_spanish_tenant"},
        {"text": "Ya hay personas empadronadas y me van a autorizar", "next_question_id": "docs_with_consent"},
        {"text": "Es un establecimiento colectivo (residencia, convento, etc.)", "next_question_id": "docs_collective_establishment"},
        {"text": "Es una infravivienda o carezco de domicilio fijo y soy conocido por Servicios Sociales", "next_question_id": "docs_infravivienda_social_services"},
        {"text": "Soy recluso y solicito empadronamiento en el centro penitenciario", "next_question_id": "docs_recluso"},
        {"text": "Soy víctima de violencia de género y me empadronaré en un domicilio protegido", "next_question_id": "docs_violence_victim"}
      ]
    },
    {
      "id": "q4_eu_domicile_proof",
      "question": "¿Cómo acredita el domicilio donde se quiere empadronar?",
      "type": "single_choice",
      "options": [
        {"text": "Soy el propietario de la vivienda", "next_question_id": "docs_eu_owner"},
        {"text": "Tengo un contrato de alquiler en vigor", "next_question_id": "docs_eu_tenant"},
        {"text": "Ya hay personas empadronadas y me van a autorizar", "next_question_id": "docs_with_consent_eu"},
        {"text": "Es un establecimiento colectivo (residencia, convento, etc.)", "next_question_id": "docs_collective_establishment"},
        {"text": "Es una infravivienda o carezco de domicilio fijo y soy conocido por Servicios Sociales", "next_question_id": "docs_infravivienda_social_services"},
        {"text": "Soy recluso y solicito empadronamiento en el centro penitenciario", "next_question_id": "docs_recluso"},
        {"text": "Soy víctima de violencia de género y me empadronaré en un domicilio protegido", "next_question_id": "docs_violence_victim"}
      ]
    },
    {
      "id": "q4_non_eu_long_domicile_proof",
      "question": "¿Cómo acredita el domicilio donde se quiere empadronar?",
      "type": "single_choice",
      "options": [
        {"text": "Soy el propietario de la vivienda", "next_question_id": "docs_non_eu_long_owner"},
        {"text": "Tengo un contrato de alquiler en vigor", "next_question_id": "docs_non_eu_long_tenant"},
        {"text": "Ya hay personas empadronadas y me van a autorizar", "next_question_id": "docs_with_consent_non_eu_long"},
        {"text": "Es un establecimiento colectivo (residencia, convento, etc.)", "next_question_id": "docs_collective_establishment"},
        {"text": "Es una infravivienda o carezco de domicilio fijo y soy conocido por Servicios Sociales", "next_question_id": "docs_infravivienda_social_services"},
        {"text": "Soy recluso y solicito empadronamiento en el centro penitenciario", "next_question_id": "docs_recluso"},
        {"text": "Soy víctima de violencia de género y me empadronaré en un domicilio protegido", "next_question_id": "docs_violence_victim"}
      ]
    },
    {
      "id": "q4_non_eu_short_domicile_proof",
      "question": "¿Cómo acredita el domicilio donde se quiere empadronar?",
      "type": "single_choice",
      "options": [
        {"text": "Soy el propietario de la vivienda", "next_question_id": "docs_non_eu_short_owner"},
        {"text": "Tengo un contrato de alquiler en vigor", "next_question_id": "docs_non_eu_short_tenant"},
        {"text": "Ya hay personas empadronadas y me van a autorizar", "next_question_id": "docs_with_consent_non_eu_short"},
        {"text": "Es un establecimiento colectivo (residencia, convento, etc.)", "next_question_id": "docs_collective_establishment"},
        {"text": "Es una infravivienda o carezco de domicilio fijo y soy conocido por Servicios Sociales", "next_question_id": "docs_infravivienda_social_services"},
        {"text": "Soy recluso y solicito empadronamiento en el centro penitenciario", "next_question_id": "docs_recluso"},
        {"text": "Soy víctima de violencia de género y me empadronaré en un domicilio protegido", "next_question_id": "docs_violence_victim"}
      ]
    },
    {
      "id": "docs_spanish_owner",
      "type": "info_block",
      "text": "Para empadronarse como español propietario, necesitará:",
      "documents": [
        {"name": "Documento de identidad del solicitante", "description": "DNI, NIE, Pasaporte en vigor del solicitante. (Ambas caras del DNI/NIE)", "multiple_files": true, "id_extractable": true},
        {"name": "Título de propiedad de la vivienda", "description": "Escritura de compraventa, nota simple del registro de la propiedad, etc.", "multiple_files": false}
      ],
      "next_question_id": "q_add_more_people"
    },
    {
      "id": "docs_spanish_tenant",
      "type": "info_block",
      "text": "Para empadronarse como español inquilino, necesitará:",
      "documents": [
        {"name": "Documento de identidad del solicitante", "description": "DNI, NIE, Pasaporte en vigor del solicitante. (Ambas caras del DNI/NIE)", "multiple_files": true, "id_extractable": true},
        {"name": "Contrato de alquiler en vigor", "description": "Contrato de arrendamiento de la vivienda.", "multiple_files": false},
        {"name": "Última factura de suministro (para acreditación adicional del domicilio)", "description": "Última factura de agua, luz o gas a nombre del titular del contrato.", "multiple_files": false}
      ],
      "next_question_id": "q_add_more_people"
    },
    {
      "id": "docs_with_consent",
      "type": "info_block",
      "text": "Para empadronarse con autorización del titular de la vivienda, necesitará:",
      "documents": [
        {"name": "Documento de identidad del solicitante", "description": "DNI, NIE, Pasaporte en vigor del solicitante. (Ambas caras del DNI/NIE)", "multiple_files": true, "id_extractable": true},
        {"name": "Autorización expresa de un mayor de edad ya empadronado", "description": "Documento firmado por el autorizante que reside en el domicilio, autorizando su empadronamiento.", "multiple_files": false},
        {"name": "Documento de identidad del autorizante", "description": "DNI, NIE, Pasaporte en vigor del autorizante.", "multiple_files": true, "id_extractable": true},
        {"name": "Documento que acredite el uso de la vivienda por el autorizante", "description": "Título de propiedad (escritura, nota simple), Contrato de arrendamiento en vigor del autorizante y último recibo de alquiler, etc.", "multiple_files": false}
      ],
      "next_question_id": "q_add_more_people"
    },
    {
      "id": "docs_collective_establishment",
      "type": "info_block",
      "text": "Para empadronarse en un establecimiento colectivo, necesitará:",
      "documents": [
        {"name": "Documento de identidad del solicitante", "description": "DNI, NIE, Pasaporte en vigor del solicitante. (Ambas caras del DNI/NIE si aplica)", "multiple_files": true, "id_extractable": true},
        {"name": "Autorización del director del establecimiento", "description": "Documento firmado por la persona que ostente la dirección del establecimiento.", "multiple_files": false}
      ],
      "next_question_id": "q_add_more_people"
    },
    {
      "id": "docs_infravivienda_social_services",
      "type": "info_block",
      "text": "Para empadronarse en infravivienda o sin domicilio fijo, necesitará:",
      "documents": [
        {"name": "Documento de identidad del solicitante", "description": "DNI, NIE, Pasaporte en vigor del solicitante. (Ambas caras del DNI/NIE si aplica)", "multiple_files": true, "id_extractable": true},
        {"name": "Informe de Servicios Sociales", "description": "Informe de los Servicios Sociales que acredite la habitualidad de la residencia en el municipio y la dirección a figurar (sede del Servicio, albergue, punto geográfico, etc.).", "multiple_files": false}
      ],
      "next_question_id": "q_add_more_people"
    },
    {
      "id": "docs_recluso",
      "type": "info_block",
      "text": "Para empadronarse como recluso en el centro penitenciario, necesitará:",
      "documents": [
        {"name": "Documento de identidad del solicitante", "description": "DNI, NIE, Pasaporte en vigor del solicitante o documento de identidad expedido por la Secretaría de Estado de Instituciones Penitenciarias.", "multiple_files": true, "id_extractable": true},
        {"name": "Informe del centro penitenciario", "description": "Documento del centro acreditando el internamiento.", "multiple_files": false}
      ],
      "next_question_id": "q_add_more_people"
    },
    {
      "id": "docs_violence_victim",
      "type": "info_block",
      "text": "Para empadronarse como víctima de violencia de género en domicilio protegido, necesitará:",
      "documents": [
        {"name": "Documento de identidad del solicitante", "description": "DNI, NIE, Pasaporte en vigor del solicitante. (Ambas caras del DNI/NIE si aplica)", "multiple_files": true, "id_extractable": true},
        {"name": "Informe de Servicios Sociales o institución social", "description": "Informe que acredite la situación y la dirección donde se empadrona por seguridad.", "multiple_files": false}
      ],
      "next_question_id": "q_add_more_people"
    },
    {
      "id": "docs_eu_owner",
      "type": "info_block",
      "text": "Para empadronarse como ciudadano de la UE/EEE/Suiza propietario, necesitará:",
      "documents": [
        {"name": "Documento de identidad", "description": "Pasaporte o documento de identidad en vigor del país de origen Y Certificado de Registro de Ciudadano de la Unión con NIE (si aplica).", "multiple_files": true, "id_extractable": true},
        {"name": "Título de propiedad de la vivienda", "description": "Escritura de compraventa, nota simple del registro de la propiedad, etc.", "multiple_files": false}
      ],
      "next_question_id": "q_add_more_people"
    },
    {
      "id": "docs_eu_tenant",
      "type": "info_block",
      "text": "Para empadronarse como ciudadano de la UE/EEE/Suiza inquilino, necesitará:",
      "documents": [
        {"name": "Documento de identidad", "description": "Pasaporte o documento de identidad en vigor del país de origen Y Certificado de Registro de Ciudadano de la Unión con NIE (si aplica).", "multiple_files": true, "id_extractable": true},
        {"name": "Contrato de alquiler en vigor", "description": "Contrato de arrendamiento de la vivienda.", "multiple_files": false},
        {"name": "Última factura de suministro (para acreditación adicional del domicilio)", "description": "Última factura de agua, luz o gas a nombre del titular del contrato.", "multiple_files": false}
      ],
      "next_question_id": "q_add_more_people"
    },
    {
      "id": "docs_with_consent_eu",
      "type": "info_block",
      "text": "Para empadronarse con autorización del titular de la vivienda (ciudadano UE/EEE/Suiza), necesitará:",
      "documents": [
        {"name": "Documento de identidad del solicitante", "description": "Pasaporte o documento de identidad en vigor del país de origen Y Certificado de Registro de Ciudadano de la Unión con NIE (si aplica).", "multiple_files": true, "id_extractable": true},
        {"name": "Autorización expresa de un mayor de edad ya empadronado", "description": "Documento firmado por el autorizante que reside en el domicilio, autorizando su empadronamiento.", "multiple_files": false},
        {"name": "Documento de identidad del autorizante", "description": "DNI, NIE, Pasaporte en vigor del autorizante.", "multiple_files": true, "id_extractable": true},
        {"name": "Documento que acredite el uso de la vivienda por el autorizante", "description": "Título de propiedad (escritura, nota simple), Contrato de arrendamiento en vigor del autorizante y último recibo de alquiler, etc.", "multiple_files": false}
      ],
      "next_question_id": "q_add_more_people"
    },
    {
      "id": "docs_non_eu_long_owner",
      "type": "info_block",
      "text": "Para empadronarse como extranjero no comunitario con residencia de larga duración y propietario, necesitará:",
      "documents": [
        {"name": "Tarjeta de Identidad de Extranjero (TIE) en vigor", "description": "TIE con autorización de residencia de larga duración. (Ambas caras)", "multiple_files": true, "id_extractable": true},
        {"name": "Título de propiedad de la vivienda", "description": "Escritura de compraventa, nota simple del registro de la propiedad, etc.", "multiple_files": false}
      ],
      "next_question_id": "q_add_more_people"
    },
    {
      "id": "docs_non_eu_long_tenant",
      "type": "info_block",
      "text": "Para empadronarse como extranjero no comunitario con residencia de larga duración y inquilino, necesitará:",
      "documents": [
        {"name": "Tarjeta de Identidad de Extranjero (TIE) en vigor", "description": "TIE con autorización de residencia de larga duración. (Ambas caras)", "multiple_files": true, "id_extractable": true},
        {"name": "Contrato de alquiler en vigor", "description": "Contrato de arrendamiento de la vivienda.", "multiple_files": false},
        {"name": "Última factura de suministro (para acreditación adicional del domicilio)", "description": "Última factura de agua, luz o gas a nombre del titular del contrato.", "multiple_files": false}
      ],
      "next_question_id": "q_add_more_people"
    },
    {
      "id": "docs_with_consent_non_eu_long",
      "type": "info_block",
      "text": "Para empadronarse con autorización del titular de la vivienda (extranjero no comunitario con residencia de larga duración), necesitará:",
      "documents": [
        {"name": "Pasaporte o documento de identidad del solicitante en vigor", "description": "Pasaporte o documento de identidad del país de origen en vigor. Si aplica, también Resguardo de presentación de solicitud de protección internacional o Documentos acreditativos de la condición de solicitante de protección internacional.", "multiple_files": true, "id_extractable": true},
        {"name": "Autorización expresa de un mayor de edad ya empadronado", "description": "Documento firmado por el autorizante que reside en el domicilio, autorizando su empadronamiento.", "multiple_files": false},
        {"name": "Documento de identidad del autorizante", "description": "DNI, NIE, Pasaporte en vigor del autorizante.", "multiple_files": true, "id_extractable": true},
        {"name": "Documento que acredite el uso de la vivienda por el autorizante", "description": "Título de propiedad (escritura, nota simple), Contrato de arrendamiento en vigor del autorizante y último recibo de alquiler, etc.", "multiple_files": false}
      ],
      "next_question_id": "q_add_more_people"
    },
    {
      "id": "docs_non_eu_short_owner",
      "type": "info_block",
      "text": "Para empadronarse como extranjero no comunitario sin residencia de larga duración y propietario, necesitará:",
      "documents": [
        {"name": "Pasaporte o documento de identidad de su país en vigor", "description": "Pasaporte o documento de identidad del país de origen en vigor. Si aplica, también Resguardo de presentación de solicitud de protección internacional o Documentos acreditativos de la condición de solicitante de protección internacional.", "multiple_files": true, "id_extractable": true},
        {"name": "Título de propiedad de la vivienda", "description": "Escritura de compraventa, nota simple del registro de la propiedad, etc.", "multiple_files": false}
      ],
      "next_question_id": "q_add_more_people"
    },
    {
      "id": "docs_non_eu_short_tenant",
      "type": "info_block",
      "text": "Para empadronarse como extranjero no comunitario sin residencia de larga duración y inquilino, necesitará:",
      "documents": [
        {"name": "Pasaporte o documento de identidad de su país en vigor", "description": "Pasaporte o documento de identidad del país de origen en vigor. Si aplica, también Resguardo de presentación de solicitud de protección internacional o Documentos acreditativos de la condición de solicitante de protección internacional.", "multiple_files": true, "id_extractable": true},
        {"name": "Contrato de alquiler en vigor", "description": "Contrato de arrendamiento de la vivienda.", "multiple_files": false},
        {"name": "Última factura de suministro (para acreditación adicional del domicilio)", "description": "Última factura de agua, luz o gas a nombre del titular del contrato.", "multiple_files": false}
      ],
      "next_question_id": "q_add_more_people"
    },
    {
      "id": "docs_with_consent_non_eu_short",
      "type": "info_block",
      "text": "Para empadronarse con autorización del titular de la vivienda (extranjero no comunitario sin residencia de larga duración), necesitará:",
      "documents": [
        {"name": "Pasaporte o documento de identidad del solicitante en vigor", "description": "Pasaporte o documento de identidad del país de origen en vigor. Si aplica, también Resguardo de presentación de solicitud de protección internacional o Documentos acreditativos de la condición de solicitante de protección internacional.", "multiple_files": true, "id_extractable": true},
        {"name": "Autorización expresa de un mayor de edad ya empadronado", "description": "Documento firmado por el autorizante que reside en el domicilio, autorizando su empadronamiento.", "multiple_files": false},
        {"name": "Documento de identidad del autorizante", "description": "DNI, NIE, Pasaporte en vigor del autorizante.", "multiple_files": true, "id_extractable": true},
        {"name": "Documento que acredite el uso de la vivienda por el autorizante", "description": "Título de propiedad (escritura, nota simple), Contrato de arrendamiento en vigor del autorizante y último recibo de alquiler, etc.", "multiple_files": false}
      ],
      "next_question_id": "q_add_more_people"
    },
    {
        "id": "q_add_more_people",
        "question": "¿Desea añadir a más personas (cónyuge, hijos, etc.) que se empadronarán en el mismo domicilio?",
        "type": "single_choice",
        "options": [
            {"text": "Sí, quiero añadir más personas", "next_question_id": "q_type_of_additional_person"},
            {"text": "No, sólo me empadrono yo", "next_question_id": "final_document_review"}
        ]
    },
    {
        "id": "q_type_of_additional_person",
        "question": "¿Qué tipo de persona adicional desea empadronar?",
        "type": "single_choice",
        "options": [
            {"text": "Un adulto", "next_question_id": "docs_additional_adult"},
            {"text": "Un menor (no recién nacido)", "next_question_id": "q_minor_living_arrangement_additional"}
        ]
    },
    {
      "id": "docs_additional_adult",
      "type": "info_block",
      "text": "Para añadir a un adulto, necesitará:",
      "documents": [
        {"name": "Documento de identidad de la persona adicional", "description": "DNI, NIE, Pasaporte en vigor de la persona adicional. (Ambas caras del DNI/NIE si aplica)", "multiple_files": true, "id_extractable": true}
      ],
      "next_question_id": "q_add_more_people"
    },
    {
        "id": "q_minor_living_arrangement_additional",
        "question": "¿El menor adicional se empadronará con ambos progenitores/tutores, con uno solo de ellos, o en un domicilio distinto al de sus progenitores/tutores?",
        "type": "single_choice",
        "options": [
            {"text": "Con ambos progenitores/tutores", "next_question_id": "docs_minor_with_both_parents_additional"},
            {"text": "Con uno solo de los progenitores/tutores", "next_question_id": "q_minor_one_parent_custody_additional"},
            {"text": "En un domicilio distinto al de los progenitores/tutores", "next_question_id": "docs_minor_other_address_additional"}
        ]
    },
    {
        "id": "docs_minor_with_both_parents_additional",
        "type": "info_block",
        "text": "Para empadronar al menor adicional con ambos progenitores/tutores, necesitará:",
        "documents": [
            {"name": "Libro de Familia o certificado de nacimiento del menor adicional", "description": "Original y copia.", "multiple_files": false},
            {"name": "Documento de identidad del progenitor 1 (para el menor adicional)", "description": "DNI/NIE/Pasaporte en vigor del progenitor 1. (Ambas caras del DNI/NIE si aplica)", "multiple_files": false, "id_extractable": true},
            {"name": "Documento de identidad del progenitor 2 (para el menor adicional)", "description": "DNI/NIE/Pasaporte en vigor del progenitor 2. (Ambas caras del DNI/NIE si aplica)", "multiple_files": false, "id_extractable": true}
        ],
        "next_question_id": "q_add_more_people"
    },
    {
        "id": "q_minor_one_parent_custody_additional",
        "question": "¿Tiene una resolución judicial que atribuya la guarda y custodia en exclusiva al progenitor que solicita el empadronamiento del menor adicional, o no existe resolución judicial sobre la guarda y custodia?",
        "type": "single_choice",
        "options": [
            {"text": "Sí, tengo resolución judicial de guarda y custodia exclusiva", "next_question_id": "docs_minor_one_parent_exclusive_custody_additional"},
            {"text": "No, no existe resolución judicial sobre la guarda y custodia (separación de hecho, etc.)", "next_question_id": "docs_minor_one_parent_no_resolution_additional"}
        ]
    },
    {
        "id": "docs_minor_one_parent_exclusive_custody_additional",
        "type": "info_block",
        "text": "Para empadronar al menor adicional con un solo progenitor con guarda y custodia exclusiva, necesitará:",
        "documents": [
            {"name": "Libro de Familia o certificado de nacimiento del menor adicional", "description": "Original y copia.", "multiple_files": false},
            {"name": "Documento de identidad del progenitor solicitante (para el menor adicional)", "description": "DNI/NIE/Pasaporte en vigor del progenitor que solicita el empadronamiento. (Ambas caras del DNI/NIE si aplica)", "multiple_files": true, "id_extractable": true},
            {"name": "Resolución judicial de guarda y custodia exclusiva", "description": "Documento judicial que atribuye la guarda y custodia en exclusiva.", "multiple_files": false},
            {"name": "Declaración responsable (Anexo II)", "description": "Según el modelo que figura en Anexo II.", "multiple_files": false}
        ],
        "next_question_id": "q_add_more_people"
    },
    {
        "id": "docs_minor_one_parent_no_resolution_additional",
        "type": "info_block",
        "text": "Para empadronar al menor adicional con un solo progenitor cuando no hay resolución judicial de guarda y custodia, necesitará:",
        "documents": [
            {"name": "Libro de Familia o certificado de nacimiento del menor adicional", "description": "Original y copia.", "multiple_files": false},
            {"name": "Documento de identidad del progenitor solicitante (para el menor adicional)", "description": "DNI/NIE/Pasaporte en vigor del progenitor que solicita el empadronamiento. (Ambas caras del DNI/NIE si aplica)", "multiple_files": true, "id_extractable": true},
            {"name": "Declaración responsable (Anexo I)", "description": "Según el modelo que figura en Anexo I.", "multiple_files": false},
            {"name": "Documentación acreditativa de procedimiento judicial (si aplica)", "description": "Si se ha interpuesto procedimiento judicial para obtener autorización.", "multiple_files": false}
        ],
        "next_question_id": "q_add_more_people"
    },
    {
        "id": "q_minor_other_address_additional",
        "question": "¿Tiene autorización escrita de ambos progenitores o resolución judicial para que el menor adicional resida en otro domicilio?",
        "type": "single_choice",
        "options": [
            {"text": "Sí, tengo autorización de ambos o resolución judicial", "next_question_id": "docs_minor_other_address_consent_additional"},
            {"text": "No, sólo autorización de uno y/o declaración responsable (o no tengo ninguno)", "next_question_id": "docs_minor_other_address_one_parent_or_none_additional"}
        ]
    },
    {
        "id": "docs_minor_other_address_consent_additional",
        "type": "info_block",
        "text": "Para empadronar al menor adicional en un domicilio distinto con autorización de ambos progenitores o resolución judicial, necesitará:",
        "documents": [
            {"name": "Libro de Familia o certificado de nacimiento del menor adicional", "description": "Original y copia.", "multiple_files": false},
            {"name": "Documento de identidad del progenitor 1 (para el menor adicional)", "description": "DNI/NIE/Pasaporte en vigor del progenitor 1. (Ambas caras del DNI/NIE si aplica)", "multiple_files": false, "id_extractable": true},
            {"name": "Documento de identidad del progenitor 2 (para el menor adicional)", "description": "DNI/NIE/Pasaporte en vigor del progenitor 2. (Ambas caras del DNI/NIE si aplica)", "multiple_files": false, "id_extractable": true},
            {"name": "Autorización por escrito de ambos progenitores o resolución judicial", "description": "Autorización expresa para que el menor resida en ese domicilio. En casos de guarda y custodia compartida sin pronunciamiento de empadronamiento, se exige mutuo acuerdo o nueva resolución judicial.", "multiple_files": false}
        ],
        "next_question_id": "q_add_more_people"
    },
    {
        "id": "docs_minor_other_address_one_parent_or_none_additional",
        "type": "info_block",
        "text": "Para empadronar al menor adicional en un domicilio distinto con autorización de un solo progenitor y/o declaración responsable, necesitará:",
        "documents": [
            {"name": "Libro de Familia o certificado de nacimiento del menor adicional", "description": "Original y copia.", "multiple_files": false},
            {"name": "Documento de identidad del progenitor autorizante (para el menor adicional)", "description": "DNI/NIE/Pasaporte en vigor del progenitor que autoriza. (Ambas caras del DNI/NIE si aplica)", "multiple_files": true, "id_extractable": true},
            {"name": "Declaración responsable (Anexo I o II)", "description": "Según si existe o no resolución judicial de guarda y custodia, y las circunstancias de imposibilidad de consentimiento del otro progenitor.", "multiple_files": false}
        ],
        "next_question_id": "q_add_more_people"
    },
    {
      "id": "final_document_review",
      "type": "info_block",
      "text": messages.final_document_review_instructions,
      "documents": [], // Docs are dynamically collected for this view
      "end_flow": false
    },
    {
      "id": "summary_screen",
      "type": "info_block",
      "text": ""
    }
  ]
};

// --- AI Document Validation Function ---
async function validateDocumentWithAI(base64Image, documentType) {
  const prompt = `Usted es una IA de verificación de documentos para una oficina de padrón municipal española. Analice esta imagen. ¿Es un documento '${documentType}' válido y legible? Si es un documento de identidad (DNI, NIE, Pasaporte, TIE, Pasaporte extranjero), extraiga el nombre completo y el número de identificación. Si no, indique la razón claramente en español. Responda en formato JSON: { "isValid": boolean, "reason": "string", "extractedData": { "name": "string", "id_number": "string" } }.`;

  const chatHistory = [{
    role: "user",
    parts: [
      { text: prompt },
      { inlineData: { mimeType: "image/png", data: base64Image } }
    ]
  }];

  const payload = {
    contents: chatHistory,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          isValid: { type: "BOOLEAN" },
          reason: { type: "STRING" },
          extractedData: {
            type: "OBJECT",
            properties: {
              name: { type: "STRING" },
              id_number: { type: "STRING" }
            }
          }
        }
      }
    }
  };

  const apiKey = "";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (result.candidates && result.candidates.length > 0 &&
        result.candidates[0].content && result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0) {
      const jsonText = result.candidates[0].content.parts[0].text;
      const parsedJson = JSON.parse(jsonText);
      return parsedJson;
    } else {
      return { isValid: false, reason: messages.ai_response_error, extractedData: {} };
    }
  } catch (error) {
    console.error("Error al llamar a la API de Gemini:", error);
    return { isValid: false, reason: `${messages.ai_connection_error} ${error.message}`, extractedData: {} };
  }
}

// --- Main App Component ---
function App() {
  const [currentQuestionId, setCurrentQuestionId] = useState("q1_action_type");
  const [questionsAnswered, setQuestionsAnswered] = useState([]); // To track history for 'Atrás'
  const [currentStepDocs, setCurrentStepDocs] = useState([]); // Documents for the current step (not cumulative)
  const [uploadedFiles, setUploadedFiles] = useState({}); // Stores ALL uploaded files by doc.name: [{file, base64, status, message, extractedData}]
  const [loadingValidation, setLoadingValidation] = useState(false);
  const [peopleToRegister, setPeopleToRegister] = useState([]); // People extracted from validated ID documents
  const [registrationAddress, setRegistrationAddress] = useState("Dirección de empadronamiento");
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [userId, setUserId] = useState(null);
  const [showAddressEdit, setShowAddressEdit] = useState(false);
  const [tempAddress, setTempAddress] = useState("");
  const fileInputRefs = useRef({}); // Refs for file inputs
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [nextIdAfterConfirmation, setNextIdAfterConfirmation] = useState(null);
  const [sendingData, setSendingData] = useState(false);
  const [apiResponseMessage, setApiResponseMessage] = useState("");
  // New state for breadcrumbs
  const [flowPath, setFlowPath] = useState([{ id: "start", text: messages.breadcrumb_home }]);


  // --- Firebase Integration ---
  useEffect(() => {
    try {
      firebaseApp = initializeApp(firebaseConfig);
      db = getFirestore(firebaseApp);
      auth = getAuth(firebaseApp);

      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          setUserId(user.uid);
          // Load user data from Firestore
          const userDocRef = doc(db, `artifacts/${appId}/users/${user.uid}/padron_data/user_progress`);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const savedData = docSnap.data();
            setCurrentQuestionId(savedData.currentQuestionId || "q1_action_type");
            setQuestionsAnswered(savedData.questionsAnswered || []);
            setUploadedFiles(savedData.uploadedFiles || {}); // Load data as is
            setPeopleToRegister(savedData.peopleToRegister || []);
            setRegistrationAddress(savedData.registrationAddress || "Dirección de empadronamiento");
            setFlowPath(savedData.flowPath || [{ id: "start", text: messages.breadcrumb_home }]); // Load flowPath
          }
          setIsAuthReady(true);
        } else {
          // Sign in anonymously if no token is provided or user is not logged in
          if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
          } else {
            const anonUser = await signInAnonymously(auth);
            setUserId(anonUser.user.uid);
            setIsAuthReady(true);
          }
        }
      });
      return () => unsubscribe(); // Cleanup listener
    } catch (error) {
      console.error("Error initializing Firebase or authenticating:", error);
      setIsAuthReady(true); // Proceed even if Firebase init fails, but without persistence
    }
  }, []);

  // Save data to Firestore whenever relevant state changes
  useEffect(() => {
    const saveData = async () => {
      if (isAuthReady && userId) {
        try {
          const filesToSave = {};
          for (const docName in uploadedFiles) {
            filesToSave[docName] = uploadedFiles[docName].map(fileEntry => {
              const { file, ...rest } = fileEntry; // Destructure to omit 'file' object
              return rest;
            });
          }

          const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/padron_data/user_progress`);
          await setDoc(userDocRef, {
            currentQuestionId,
            questionsAnswered,
            uploadedFiles: filesToSave, // Use the cleaned object without File objects
            peopleToRegister,
            registrationAddress,
            flowPath // Save flowPath
          }, { merge: true });
          console.log("Data saved to Firestore.");
        } catch (e) {
          console.error("Error saving document: ", e);
        }
      }
    };
    if (isAuthReady) { // Only save after auth is ready
      saveData();
    }
  }, [currentQuestionId, questionsAnswered, uploadedFiles, peopleToRegister, registrationAddress, flowPath, isAuthReady, userId]);


  // --- Flow Navigation Logic ---
  const currentQuestion = flowData.flow.find(q => q.id === currentQuestionId);

  useEffect(() => {
    if (currentQuestion && currentQuestion.type === "info_block") {
      setCurrentStepDocs(currentQuestion.documents || []);

      setUploadedFiles(prev => {
        const newUploadedFiles = { ...prev };
        (currentQuestion.documents || []).forEach(doc => {
          if (!newUploadedFiles[doc.name]) {
            newUploadedFiles[doc.name] = [];
          }
        });
        return newUploadedFiles;
      });
    } else {
      setCurrentStepDocs([]); // Clear docs if not an info block
    }
  }, [currentQuestionId, currentQuestion]);

  const handleAnswer = (nextId) => {
    setQuestionsAnswered(prev => [...prev, currentQuestionId]);

    // Update flowPath for breadcrumbs
    const nextQuestionObj = flowData.flow.find(q => q.id === nextId);
    if (nextQuestionObj) {
        const stepText = nextQuestionObj.question || nextQuestionObj.text || nextQuestionObj.id;
        setFlowPath(prev => [...prev, { id: nextQuestionObj.id, text: stepText }]);
    }
    setCurrentQuestionId(nextId);
  };

  const goBack = () => {
    if (questionsAnswered.length > 0) {
      const prevId = questionsAnswered[questionsAnswered.length - 1];
      setQuestionsAnswered(prev => prev.slice(0, -1));
      setCurrentQuestionId(prevId);
      setFlowPath(prev => prev.slice(0, -1)); // Also remove last step from flowPath
    }
  };

  // --- Document Upload and Validation Logic ---
  const handleFileChange = (e, docName) => {
    const files = Array.from(e.target.files);
    setUploadedFiles(prev => {
      const newFiles = { ...prev };
      // If single file expected, clear existing and add new. If multiple, append.
      const docRequirement = currentStepDocs.find(d => d.name === docName) || orderedAllRequiredDocuments.find(d => d.name === docName);

      if (!newFiles[docName] || !docRequirement?.multiple_files) {
         newFiles[docName] = files.map(file => ({
            file, // Keep the File object in state for FileReader operations
            name: file.name,
            base64: null, // Will be populated after reading
            validation_status: 'pending',
            validation_message: '',
            extracted_data: {}
          }));
      } else {
          newFiles[docName] = [...newFiles[docName], ...files.map(file => ({
            file,
            name: file.name,
            base64: null,
            validation_status: 'pending',
            validation_message: '',
            extracted_data: {}
          }))];
      }
      return newFiles;
    });
  };

  const handleValidateDocument = async (docName, fileIndex) => {
    setLoadingValidation(true);
    const fileToValidate = uploadedFiles[docName][fileIndex];

    if (!fileToValidate || !fileToValidate.file) {
      setLoadingValidation(false);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target.result.split(',')[1]; // Get base64 string without prefix
      const validationResult = await validateDocumentWithAI(base64Data, docName);

      setUploadedFiles(prev => {
        const newFiles = { ...prev };
        if (newFiles[docName] && newFiles[docName][fileIndex]) {
          newFiles[docName][fileIndex].validation_status = validationResult.isValid ? 'valid' : 'invalid';
          newFiles[docName][fileIndex].validation_message = validationResult.reason;
          newFiles[docName][fileIndex].extracted_data = validationResult.extractedData || {};
          newFiles[docName][fileIndex].base64 = base64Data; // Store base64 for persistence

          // If it's an identity document and valid, add/update peopleToRegister
          const docRequirement = (currentQuestion.documents || []).find(d => d.name === docName) || flowData.flow.flatMap(f => f.documents || []).find(d => f.id === questionsAnswered[questionsAnswered.length-1] && d.name === docName); // Find the original doc requirement to check id_extractable
          if (validationResult.isValid && docRequirement && docRequirement.id_extractable) {
            const existingPersonIndex = peopleToRegister.findIndex(p => p.id_number === validationResult.extractedData.id_number);
            if (validationResult.extractedData.name && validationResult.extractedData.id_number) {
              if (existingPersonIndex > -1) {
                // Update existing person
                const updatedPeople = [...peopleToRegister];
                updatedPeople[existingPersonIndex] = { ...updatedPeople[existingPersonIndex], ...validationResult.extractedData };
                setPeopleToRegister(updatedPeople);
              } else {
                // Add new person
                setPeopleToRegister(prevPeople => [...prevPeople, validationResult.extractedData]);
              }
            }
          }
        }
        return newFiles;
      });
      setLoadingValidation(false);
    };
    reader.onerror = (error) => {
      console.error("Error reading file:", error);
      setUploadedFiles(prev => {
        const newFiles = { ...prev };
        if (newFiles[docName] && newFiles[docName][fileIndex]) {
          newFiles[docName][fileIndex].validation_status = 'invalid';
          newFiles[docName][fileIndex].validation_message = messages.file_read_error;
        }
        return newFiles;
      });
      setLoadingValidation(false);
    };
    reader.readAsDataURL(fileToValidate.file);
  };

  const handleRemoveFile = (docName, fileIndex) => {
    setUploadedFiles(prev => {
      const newFiles = { ...prev };
      if (newFiles[docName]) {
        const removedFile = newFiles[docName][fileIndex];
        newFiles[docName] = newFiles[docName].filter((_, i) => i !== fileIndex);

        // Remove person if their ID document was removed and they were the only source
        if (removedFile.extracted_data && removedFile.extracted_data.id_number) {
          const isIdSourceUnique = Object.values(newFiles).every(filesArray =>
            filesArray.every(f => f && f.extracted_data && f.extracted_data.id_number !== removedFile.extracted_data.id_number)
          );
          if (isIdSourceUnique) {
            setPeopleToRegister(prevPeople =>
              prevPeople.filter(p => p.id_number !== removedFile.extracted_data.id_number)
            );
          }
        }
      }
      return newFiles;
    });
  };

  const isCurrentStepRequiredDocumentsValidated = () => {
    if (!currentQuestion || !currentQuestion.documents) return true; // If no documents or not an info_block, consider it valid to proceed

    for (const docRequirement of currentQuestion.documents) {
        const uploaded = uploadedFiles[docRequirement.name];
        if (!uploaded || uploaded.length === 0) return false;
        if (uploaded.some(f => f.validation_status !== 'valid')) return false;
    }
    return true;
  };

  const handleContinueWithValidation = () => {
    if (isCurrentStepRequiredDocumentsValidated()) {
      handleAnswer(currentContent.next_question_id);
    } else {
      // You might want a custom modal here instead of alert for better UX
      alert(messages.alert_all_required_docs_needed);
    }
  };

  const handleContinueWithoutValidationClick = () => {
    setNextIdAfterConfirmation(currentContent.next_question_id);
    setShowConfirmationModal(true);
  };

  const handleConfirmContinue = () => {
    setShowConfirmationModal(false);
    if (nextIdAfterConfirmation) {
      handleAnswer(nextIdAfterConfirmation);
      setNextIdAfterConfirmation(null); // Clear the ID
    }
  };

  const handleCancelContinue = () => {
    setShowConfirmationModal(false);
    setNextIdAfterConfirmation(null); // Clear the ID
  };

  const proceedToSummary = () => {
    // This function is now only called from the 'final_document_review' block
    setCurrentQuestionId("summary_screen");
    // Add the summary screen to the flowPath
    const summaryScreen = flowData.flow.find(q => q.id === "summary_screen");
    if (summaryScreen) {
        setFlowPath(prev => [...prev, { id: summaryScreen.id, text: messages.summary_title }]);
    }
  };

  const handleRemovePerson = (idNumber) => {
    setPeopleToRegister(prev => prev.filter(p => p.id_number !== idNumber));
  };

  const handleAddressEditToggle = () => {
    if (!showAddressEdit) {
      setTempAddress(registrationAddress);
    }
    setShowAddressEdit(!showAddressEdit);
  };

  const handleAddressSave = () => {
    setRegistrationAddress(tempAddress);
    setShowAddressEdit(false);
  };

  const currentContent = currentQuestion;

  const handleSendAll = async () => {
    setSendingData(true);
    setApiResponseMessage("");

    // Prepare data for API call
    const dataToSend = {
      userId: userId,
      registrationAddress: registrationAddress,
      people: peopleToRegister,
      documents: Object.keys(uploadedFiles).reduce((acc, docName) => {
        acc[docName] = uploadedFiles[docName].map(fileEntry => ({
          name: fileEntry.name,
          validation_status: fileEntry.validation_status,
          extracted_data: fileEntry.extracted_data,
          base64: fileEntry.base64 // Include base64 data for submission
        }));
        return acc;
      }, {}),
      flowPath: flowPath // Include the complete flow path
    };

    console.log("Simulating API send with data:", dataToSend);

    // Simulate an API call
    try {
      // Replace with actual fetch to your backend API endpoint
      // const response = await fetch('/api/submit-padron', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(dataToSend),
      // });

      // Simulate a delay and a random success/failure for demonstration
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      const success = Math.random() > 0.3; // 70% chance of success

      if (success) {
        setApiResponseMessage(messages.send_success_message);
      } else {
        setApiResponseMessage(messages.send_error_message);
      }
    } catch (error) {
      console.error("API Error:", error);
      setApiResponseMessage(messages.send_error_message);
    } finally {
      setSendingData(false);
    }
  };


  if (!currentContent) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="text-center text-gray-700">
          <p className="text-lg">{messages.loading_app}</p>
          <p className="text-sm">{messages.loading_fallback_message}</p>
        </div>
      </div>
    );
  }

  // Determine which documents to show in the final_document_review screen
  // This will collect all documents that were *ever* required based on the path taken.
  const allRequiredDocuments = {};
  questionsAnswered.forEach(qId => {
    const q = flowData.flow.find(f => f.id === qId);
    if (q && q.type === "info_block" && q.documents) {
      q.documents.forEach(docReq => {
        allRequiredDocuments[docReq.name] = docReq;
      });
    }
  });
  // Also add documents from the current step if it's an info_block
  if (currentContent.type === "info_block" && currentContent.documents) {
    currentContent.documents.forEach(docReq => {
      allRequiredDocuments[docReq.name] = docReq;
    });
  }
  const orderedAllRequiredDocuments = Object.values(allRequiredDocuments); // Convert to array for rendering

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-200 p-6 flex flex-col items-center font-sans">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-2xl mt-8">
        <h1 className="text-3xl font-extrabold text-indigo-800 mb-6 text-center">{messages.app_title}</h1>
        <p className="text-center text-gray-600 mb-8">{messages.app_subtitle}</p>

        {/* Breadcrumbs */}
        <div className="mb-6 text-sm text-gray-600">
            {flowPath.map((step, index) => (
                <React.Fragment key={step.id}>
                    {index > 0 && (
                        <>
                            <span className="mx-1 text-gray-400">&gt;</span>
                            <br/> {/* Line break after '>' */}
                            <span className="inline-block pl-4"> {/* Indentation */}
                                {step.text}
                            </span>
                        </>
                    )}
                    {index === 0 && (
                        <span className={`${index === flowPath.length - 1 ? 'font-semibold text-indigo-700' : 'text-gray-500'}`}>
                            {step.text}
                        </span>
                    )}
                </React.Fragment>
            ))}
        </div>

        {currentQuestionId === "summary_screen" ? (
          // --- Summary Screen ---
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-indigo-700 mb-4 flex items-center">
              <CheckSquare className="mr-2 text-green-600" /> {messages.summary_title}
            </h2>
            <div className="bg-blue-50 p-4 rounded-lg shadow-inner">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-gray-700 font-semibold mb-1 flex items-center"><Home className="mr-2" size={18}/>{messages.summary_address_label}</label>
                {showAddressEdit ? (
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={tempAddress}
                      onChange={(e) => setTempAddress(e.target.value)}
                      className="flex-grow p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <button
                      onClick={handleAddressSave}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md"
                    >
                      {messages.summary_address_save_button}
                    </button>
                    <button
                      onClick={handleAddressEditToggle}
                      className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors shadow-md"
                    >
                      {messages.summary_address_cancel_button}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <p className="text-gray-800 font-medium">{registrationAddress}</p>
                    <button
                      onClick={handleAddressEditToggle}
                      className="p-1 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors"
                    >
                      <Settings size={18} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg shadow-inner">
              <h3 className="text-lg font-semibold text-indigo-700 mb-3 flex items-center">
                <User className="mr-2" size={18}/>{messages.summary_people_label}
              </h3>
              {peopleToRegister.length > 0 ? (
                <ul className="space-y-2">
                  {peopleToRegister.map((person, index) => (
                    <li key={index} className="flex justify-between items-center bg-white p-3 rounded-md shadow-sm border border-gray-200">
                      <span className="text-gray-800">
                        <strong>{person.name || "Nombre no extraído"}</strong> (ID: {person.id_number || "No. no extraído"})
                      </span>
                      <button
                        onClick={() => handleRemovePerson(person.id_number)}
                        className="p-1 rounded-full text-red-600 hover:bg-red-100 transition-colors"
                        title={messages.file_remove_button}
                      >
                        <Trash2 size={20} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-600 italic">{messages.summary_no_people_extracted}</p>
              )}
            </div>

            <p className="text-sm text-gray-700 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              {messages.summary_disclaimer}
            </p>

            {apiResponseMessage && (
                <div className={`mt-4 p-3 rounded-lg text-center ${apiResponseMessage.includes("Error") ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    {apiResponseMessage}
                </div>
            )}

            <div className="flex justify-between mt-8">
              {/* Back button on summary screen */}
              {questionsAnswered.length > 0 && (
                <button
                  onClick={goBack}
                  className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg shadow-md hover:bg-gray-400 transition-colors font-semibold"
                >
                  {messages.back_button}
                </button>
              )}
              <button
                onClick={handleSendAll}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-colors font-semibold flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
                disabled={sendingData}
              >
                {sendingData ? (
                  <>
                    <span className="animate-spin mr-2">⚙️</span> {messages.sending_data}
                  </>
                ) : (
                  <>
                    <Send className="mr-2" size={20} /> {messages.send_all_button}
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          // --- Question/Document Upload Screen ---
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg shadow-inner">
              {currentQuestionId !== "final_document_review" ? (
                <p className="text-lg font-medium text-indigo-700 mb-4">{currentContent.question || currentContent.text}</p>
              ) : (
                <p className="text-lg font-medium text-indigo-700 mb-4">{messages.final_document_review_instructions}</p>
              )}
            </div>

            {currentContent.type === "single_choice" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentContent.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswer(option.next_question_id)}
                    className="p-4 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-all duration-200 ease-in-out transform hover:scale-105 text-lg font-semibold"
                  >
                    {option.text}
                  </button>
                ))}
              </div>
            )}

            {(currentContent.type === "info_block" && currentContent.id !== "final_document_review") && currentStepDocs.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-indigo-700 mt-6 mb-4 flex items-center">
                  <FileText className="mr-2" /> {messages.docs_required_title}
                </h3>
                {currentStepDocs.map((docReq, docIndex) => (
                  <div key={docIndex} className="bg-white p-5 rounded-lg shadow-md border border-blue-100">
                    <p className="text-lg font-semibold text-gray-800">{docReq.name}</p>
                    <p className="text-gray-600 text-sm mb-3">{docReq.description}</p>

                    {/* Show file input ONLY if no files are uploaded OR if multiple files are allowed */}
                    {(!uploadedFiles[docReq.name] || uploadedFiles[docReq.name].length === 0 || docReq.multiple_files) && (
                      <input
                        type="file"
                        multiple={docReq.multiple_files}
                        onChange={(e) => handleFileChange(e, docReq.name)}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-indigo-700 hover:file:bg-blue-100 cursor-pointer"
                        ref={el => fileInputRefs.current[`${docReq.name}-${docIndex}`] = el}
                      />
                    )}

                    {uploadedFiles[docReq.name] && uploadedFiles[docReq.name].map((fileEntry, fileIndex) => (
                      <div key={fileIndex} className="mt-3 p-3 border border-gray-200 rounded-md flex items-center justify-between bg-gray-50">
                        <span className="flex items-center text-gray-700 text-sm">
                          {fileEntry.validation_status === 'valid' && <CheckCircle size={18} className="text-green-500 mr-2" />}
                          {fileEntry.validation_status === 'invalid' && <XCircle size={18} className="text-red-500 mr-2" />}
                          {fileEntry.validation_status === 'pending' && <Upload size={18} className="text-yellow-500 animate-pulse mr-2" />}
                          {fileEntry.name}
                        </span>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleValidateDocument(docReq.name, fileIndex)}
                            className="px-3 py-1 bg-indigo-500 text-white rounded-md text-xs hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            disabled={loadingValidation || fileEntry.validation_status === 'valid'}
                          >
                            {loadingValidation ? messages.file_validation_loading_button : messages.file_validation_button}
                          </button>
                          <button
                            onClick={() => handleRemoveFile(docReq.name, fileIndex)}
                            className="p-1 text-red-500 hover:bg-red-100 rounded-full transition-colors"
                            title={messages.file_remove_button}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        {fileEntry.validation_message && (
                          <p className={`text-xs mt-1 ${fileEntry.validation_status === 'invalid' ? 'text-red-600' : 'text-gray-500'}`}>
                            {messages.file_validation_reason} {fileEntry.validation_message}
                          </p>
                        )}
                        {fileEntry.extracted_data && fileEntry.extracted_data.name && (
                          <p className="text-xs mt-1 text-blue-600">
                            {messages.file_extracted_data} {fileEntry.extracted_data.name} (ID: {fileEntry.extracted_data.id_number})
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
                <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 mt-6">
                  <button
                    onClick={handleContinueWithValidation}
                    className="flex-1 p-4 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition-colors duration-200 ease-in-out transform hover:scale-105 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!isCurrentStepRequiredDocumentsValidated()}
                  >
                    {messages.continue_button}
                  </button>
                  <button
                    onClick={handleContinueWithoutValidationClick}
                    className="flex-1 p-4 bg-orange-500 text-white rounded-lg shadow-md hover:bg-orange-600 transition-colors duration-200 ease-in-out transform hover:scale-105 text-lg font-semibold"
                  >
                    {messages.continue_without_validation_button}
                  </button>
                </div>
              </div>
            )}

            {currentQuestionId === "final_document_review" && (
                <div className="space-y-4">
                    {/* The main instructional text is already shown in the common div above */}
                    <h3 className="text-xl font-bold text-indigo-700 mt-6 mb-4 flex items-center">
                        <FileText className="mr-2" /> {messages.final_docs_review_title}
                    </h3>
                    {orderedAllRequiredDocuments.length > 0 ? (
                        orderedAllRequiredDocuments.map((docReq, docIndex) => (
                        <div key={docIndex} className="bg-white p-5 rounded-lg shadow-md border border-blue-100">
                            <p className="text-lg font-semibold text-gray-800">{docReq.name}</p>
                            <p className="text-gray-600 text-sm mb-3">{docReq.description}</p>
                            
                            {/* In final review, only show the uploaded files, no input for new files */}
                            {uploadedFiles[docReq.name] && uploadedFiles[docReq.name].map((fileEntry, fileIndex) => (
                            <div key={fileIndex} className="mt-3 p-3 border border-gray-200 rounded-md flex items-center justify-between bg-gray-50">
                                <span className="flex items-center text-gray-700 text-sm">
                                {fileEntry.validation_status === 'valid' && <CheckCircle size={18} className="text-green-500 mr-2" />}
                                {fileEntry.validation_status === 'invalid' && <XCircle size={18} className="text-red-500 mr-2" />}
                                {fileEntry.validation_status === 'pending' && <Upload size={18} className="text-yellow-500 animate-pulse mr-2" />}
                                {fileEntry.name}
                                </span>
                                <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => handleValidateDocument(docReq.name, fileIndex)}
                                    className="px-3 py-1 bg-indigo-500 text-white rounded-md text-xs hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    disabled={loadingValidation || fileEntry.validation_status === 'valid'}
                                >
                                    {loadingValidation ? messages.file_validation_loading_button : messages.file_validation_button}
                                </button>
                                <button
                                    onClick={() => handleRemoveFile(docReq.name, fileIndex)}
                                    className="p-1 text-red-500 hover:bg-red-100 rounded-full transition-colors"
                                    title={messages.file_remove_button}
                                >
                                    <Trash2 size={16} />
                                </button>
                                </div>
                                {fileEntry.validation_message && (
                                <p className={`text-xs mt-1 ${fileEntry.validation_status === 'invalid' ? 'text-red-600' : 'text-gray-500'}`}>
                                    {messages.file_validation_reason} {fileEntry.validation_message}
                                </p>
                                )}
                                {fileEntry.extracted_data && fileEntry.extracted_data.name && (
                                <p className="text-xs mt-1 text-blue-600">
                                    {messages.file_extracted_data} {fileEntry.extracted_data.name} (ID: {fileEntry.extracted_data.id_number})
                                </p>
                                )}
                            </div>
                            ))}
                            {/* If no files uploaded, show message indicating no file provided */}
                            {(!uploadedFiles[docReq.name] || uploadedFiles[docReq.name].length === 0) && (
                                <p className="text-gray-500 text-sm italic mt-2">No se ha proporcionado ningún archivo para este documento.</p>
                            )}
                        </div>
                        ))
                    ) : (
                        <p className="text-gray-600 italic">{messages.final_docs_no_docs_requested}</p>
                    )}
                    <button
                        onClick={proceedToSummary}
                        className="w-full p-4 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition-colors duration-200 ease-in-out transform hover:scale-105 text-lg font-semibold"
                    >
                        {messages.final_docs_continue_button}
                    </button>
                </div>
            )}

            <div className="flex justify-between mt-8">
              {questionsAnswered.length > 0 && (
                <button
                  onClick={goBack}
                  className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg shadow-md hover:bg-gray-400 transition-colors font-semibold"
                >
                  {messages.back_button}
                </button>
              )}
            </div>
          </div>
        )}

        {showConfirmationModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
              <h3 className="text-xl font-bold text-red-700 mb-4">{messages.confirm_no_validation_title}</h3>
              <p className="text-gray-700 mb-6">{messages.confirm_no_validation_message}</p>
              <div className="flex justify-around space-x-4">
                <button
                  onClick={handleConfirmContinue}
                  className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-md"
                >
                  {messages.confirm_no_validation_yes_button}
                </button>
                <button
                  onClick={handleCancelContinue}
                  className="px-5 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors shadow-md"
                >
                  {messages.confirm_no_validation_no_button}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-4">{messages.user_id_label} {userId || messages.loading_app}</p>
    </div>
  );
}

export default App;
