/**
 * SourceDeck — English -> Spanish translation dictionary.
 *
 * Lookup is performed by exact match against the trimmed text content of a
 * text node or attribute value (see sd-i18n.js). Surrounding whitespace in
 * the source DOM is preserved automatically.
 *
 * Style: professional, neutral Latin American Spanish.
 *
 * What stays in English (do NOT translate):
 *   - brand names: SourceDeck, ARCG Systems, ARCG, Ariel's River Contracting Group LLC
 *   - product names: SourceDeck Solo / Team / Enterprise / Core / Growth / White-Glove
 *   - acronyms used as proper nouns: GovCon, SAM.gov, NAICS, RFP, RFI, RFQ,
 *     PWS, SOW, FAR, DFARS, CUI, CMMC, SOC 2, FedRAMP, HIPAA, HITRUST,
 *     SDVOSB, 8(a), WOSB, HUBZone, ICP, BYOK, CMO, BD, CRM, ATS, KPI,
 *     ROI, MRR, ARR, OAuth, API, ICS, CSV
 *   - common business terms left intact: ACH, wire, check
 *   - integration vendor names: Airtable, Instantly, Postmark, Stripe,
 *     Google, Microsoft, Cloudflare, Zapier, Slack, GitHub, etc.
 *
 * Order is not significant — the lookup is a flat hash.
 */
(function () {
  'use strict';
  window.SD_I18N = window.SD_I18N || {};
  window.SD_I18N.es = {

    // ============================================================
    // GLOBAL NAV (every page)
    // ============================================================
    'Product': 'Producto',
    'Solutions': 'Soluciones',
    'Trust': 'Confianza',
    'Learn': 'Aprende',
    'Resources': 'Recursos',
    'Compare': 'Comparar',
    'Agents': 'Agentes',
    'Integrations': 'Integraciones',
    'Pricing': 'Precios',
    'Sample SourceDeck': 'SourceDeck de muestra',
    'Demo walkthrough': 'Recorrido de demostración',
    'Federal posture': 'Postura federal',
    'Methodology': 'Metodología',
    'Data sources': 'Fuentes de datos',
    'Security': 'Seguridad',
    'GovCon': 'GovCon',
    'B2B Sales': 'Ventas B2B',
    'Healthcare': 'Salud',
    'Staffing': 'Staffing',
    'Property': 'Inmuebles',
    'Property Management': 'Administración de propiedades',
    'Request access →': 'Solicitar acceso →',
    'Request access': 'Solicitar acceso',
    'Open menu': 'Abrir menú',

    // ============================================================
    // FOOTER (every page)
    // ============================================================
    'Action': 'Acción',
    'Sample': 'Muestra',
    'Demo': 'Demo',
    'Federal': 'Federal',
    // Footer is rendered as text fragments around an <a> link to ARCG Systems.
    // Translating each fragment in place keeps the link intact while producing
    // natural Spanish: "Producto de ARCG Systems · © 2026".
    'SourceDeck is an': 'Producto de',
    'product · © 2026': '· © 2026',
    'product': 'producto',
    '© 2026 Ariel\'s River Contracting Group LLC': '© 2026 Ariel\'s River Contracting Group LLC',

    // ============================================================
    // META / SEO (titles + descriptions)
    // ============================================================
    'SourceDeck — AI workflow engine for leads, content, and capture':
      'SourceDeck — Motor de flujo de trabajo con IA para leads, contenido y captura',
    'Turn leads, pursuits, and requests into workflows for GovCon, sales, healthcare, staffing, and property teams.':
      'Convierte leads, oportunidades y solicitudes en flujos de trabajo para equipos de GovCon, ventas, salud, staffing e inmuebles.',
    'SourceDeck — Simple pricing for lean teams':
      'SourceDeck — Precios simples para equipos ágiles',
    'Recurring GovCon Capture OS from $149 / mo. Optional one-time implementation services from $1,497. No PO-based payment.':
      'GovCon Capture OS recurrente desde $149/mes. Servicios opcionales de implementación única desde $1,497. No aceptamos pagos basados en órdenes de compra.',
    'SourceDeck — Request access':
      'SourceDeck — Solicitar acceso',
    'SourceDeck is access-controlled. No public demo, no self-serve sign-up, and no public download.':
      'SourceDeck es de acceso controlado. No hay demo público, registro autoservicio ni descarga pública.',
    'SourceDeck — Access by request': 'SourceDeck — Acceso bajo solicitud',
    'SourceDeck is available by request. There is no public demo or self-serve sign-up. Contact sales to learn more or request access.':
      'SourceDeck está disponible bajo solicitud. No hay demo público ni registro autoservicio. Contacta ventas para conocer más o solicitar acceso.',
    'SourceDeck — Pricing for GovCon teams': 'SourceDeck — Precios para equipos GovCon',
    'SourceDeck pricing: recurring GovCon Capture OS plus optional one-time implementation services. Solo Capture $149/mo, GovCon Operator $499/mo, Operator Plus $997/mo, Enterprise custom.':
      'Precios de SourceDeck: GovCon Capture OS recurrente más servicios opcionales de implementación única. Solo Capture $149/mes, GovCon Operator $499/mes, Operator Plus $997/mes, Enterprise personalizado.',
    'SourceDeck — Onboarding': 'SourceDeck — Onboarding',
    'SourceDeck · Set up your workspace': 'SourceDeck · Configura tu espacio de trabajo',
    'SourceDeck — Request access': 'SourceDeck — Solicitar acceso',
    'Step 03 — API keys & integrations': 'Paso 03 — Claves API e integraciones',
    'Welcome to your new SourceDeck workspace. Five short steps to get your operator workspace running — every key stays local.':
      'Bienvenido a tu nuevo espacio de trabajo de SourceDeck. Cinco pasos cortos para poner en marcha tu espacio de operador — cada clave permanece local.',

    // SEO meta for additional priority pages
    'SourceDeck · Command Center': 'SourceDeck · Centro de comando',
    'Operational command center — every overdue follow-up, blocked approval, failed automation, unsigned proposal, unpaid invoice, stale deal, and delivery exception in one place.':
      'Centro de comando operativo — cada seguimiento vencido, aprobación bloqueada, automatización fallida, propuesta sin firmar, factura sin pagar, deal sin avance y excepción de entrega en un solo lugar.',
    'SourceDeck — Agents and workflow capabilities': 'SourceDeck — Agentes y capacidades de flujo de trabajo',
    'SourceDeck agents: Discover, Create, Respond, and Track. Platform capabilities across GovCon, B2B sales, healthcare, staffing, and property management.':
      'Agentes de SourceDeck: Descubrir, Crear, Responder y Dar seguimiento. Capacidades de plataforma para GovCon, ventas B2B, salud, staffing y administración de propiedades.',
    'SourceDeck — Integrations and data sources': 'SourceDeck — Integraciones y fuentes de datos',
    'SourceDeck integrations: SAM.gov live, FPDS award history, manual solicitation import, and planned tool connections.':
      'Integraciones de SourceDeck: SAM.gov en vivo, historial de adjudicaciones de FPDS, importación manual de solicitudes y conexiones planificadas con herramientas.',
    'SourceDeck · Settings': 'SourceDeck · Configuración',
    'SourceDeck — Security & Trust': 'SourceDeck — Seguridad y confianza',
    'SourceDeck is designed around blank workspaces, user-controlled data, and safer media workflow management for teams.':
      'SourceDeck está diseñado en torno a espacios de trabajo en blanco, datos controlados por el usuario y una gestión de flujo de trabajo más segura para equipos de medios.',
    'SourceDeck for Enterprise — Media workflow management for teams': 'SourceDeck para Enterprise — Gestión de flujos de medios para equipos',
    'SourceDeck gives PR, communications, and media teams a structured workspace to manage queries, expert responses, pitches, and coverage workflows.':
      'SourceDeck da a equipos de PR, comunicaciones y medios un espacio de trabajo estructurado para gestionar consultas, respuestas de expertos, pitches y flujos de cobertura.',
    'SourceDeck — Federal posture and data handling': 'SourceDeck — Postura federal y manejo de datos',
    'What SourceDeck claims, what it does not claim, and how it handles government data, CUI, and solicitation communication rules.':
      'Lo que SourceDeck afirma, lo que no afirma y cómo maneja los datos del gobierno, CUI y reglas de comunicación de solicitudes.',
    'SourceDeck · Security & Compliance': 'SourceDeck · Seguridad y cumplimiento',
    'SourceDeck compliance status — posture statements, planned attestations, DPA, retention, and deletion paths. We do not claim certifications we do not hold.':
      'Estado de cumplimiento de SourceDeck — declaraciones de postura, atestiguaciones planeadas, DPA, retención y rutas de eliminación. No reclamamos certificaciones que no tenemos.',
    'SourceDeck — GovCon capture methodology': 'SourceDeck — Metodología de captura GovCon',
    'How SourceDeck works: intake, bid/no-bid score, compliance matrix, proposal draft, human review, and audit trail. Six stages, six artifacts.':
      'Cómo funciona SourceDeck: ingreso, puntuación de bid/no-bid, matriz de cumplimiento, borrador de propuesta, revisión humana y trazabilidad. Seis etapas, seis artefactos.',
    'SourceDeck — Data sources and citations': 'SourceDeck — Fuentes de datos y citas',
    'SourceDeck pulls from SAM.gov and USASpending/FPDS. Every output cites the source document. No CUI accepted.':
      'SourceDeck obtiene datos de SAM.gov y USASpending/FPDS. Cada salida cita el documento de origen. No se acepta CUI.',
    'Tell us your team type and what you need. We\'ll route the right SourceDeck workflow.':
      'Cuéntanos tu tipo de equipo y lo que necesitas. Enrutaremos el flujo de trabajo correcto de SourceDeck.',
    'SourceDeck | Received': 'SourceDeck | Recibido',

    // Hero H1s for priority pages
    'Every action-needed item. One screen.': 'Cada elemento que requiere acción. Una sola pantalla.',
    'Four agent groups. Every workflow.': 'Cuatro grupos de agentes. Todos los flujos de trabajo.',
    'Data sources and tools.': 'Fuentes de datos y herramientas.',
    'Readiness radar.': 'Radar de preparación.',
    'Honest about what we have. Honest about what we don\'t.':
      'Honestos sobre lo que tenemos. Honestos sobre lo que no.',
    'Media opportunity management for teams.': 'Gestión de oportunidades de medios para equipos.',
    'Careful by design.': 'Cuidadoso por diseño.',
    'The artifacts procurement needs.': 'Los artefactos que necesita procurement.',
    'Six stages. Six artifacts.': 'Seis etapas. Seis artefactos.',
    'Public data. Cited outputs.': 'Datos públicos. Salidas con citas.',
    'Analyze one GovCon opportunity.': 'Analiza una oportunidad de GovCon.',
    'Got it — we\'ll be in touch.': 'Recibido — nos pondremos en contacto.',

    // Hero ledes / first paragraphs
    'Overdue follow-ups, blocked approvals, failed automations, unsigned proposals, unpaid invoices, stale deals, delivery exceptions — aggregated, prioritized, owned.':
      'Seguimientos vencidos, aprobaciones bloqueadas, automatizaciones fallidas, propuestas sin firmar, facturas sin pagar, deals sin avance, excepciones de entrega — agregados, priorizados, con responsable.',
    'SourceDeck runs four agent groups across all five verticals. Each group produces concrete artifacts your team can review, approve, and act on.':
      'SourceDeck ejecuta cuatro grupos de agentes en las cinco verticales. Cada grupo produce artefactos concretos que tu equipo puede revisar, aprobar y accionar.',
    'SourceDeck ingests from public GovCon data sources and connects to common capture tools. Statuses below reflect current availability.':
      'SourceDeck ingiere desde fuentes públicas de datos de GovCon y se conecta a herramientas comunes de captura. Los estados a continuación reflejan la disponibilidad actual.',
    'The shortest spoke is the next thing to fix. Every module reports its own completion, rolled up into an overall workspace readiness score.':
      'El radio más corto es lo siguiente a arreglar. Cada módulo reporta su propio avance, consolidado en una puntuación de preparación del espacio de trabajo.',
    'SourceDeck is in active development. This page is the single source of truth for what\'s shipped, what\'s partial, and what\'s planned. We don\'t claim certifications we don\'t hold.':
      'SourceDeck está en desarrollo activo. Esta página es la fuente única de la verdad sobre lo entregado, lo parcial y lo planificado. No reclamamos certificaciones que no tenemos.',
    'SourceDeck gives PR agencies, communications teams, newsrooms, public-affairs groups, and expert networks a structured workspace to manage queries, expert responses, pitches, and coverage — without the inbox tornado.':
      'SourceDeck da a agencias de PR, equipos de comunicaciones, salas de redacción, grupos de asuntos públicos y redes de expertos un espacio de trabajo estructurado para gestionar consultas, respuestas de expertos, pitches y cobertura — sin el caos del inbox.',
    'SourceDeck is built for GovCon teams that operate carefully. This page states what we claim, what we do not claim, and how the platform handles government data.':
      'SourceDeck está hecho para equipos de GovCon que operan con cuidado. Esta página declara lo que afirmamos, lo que no afirmamos y cómo la plataforma maneja los datos del gobierno.',
    'SourceDeck pulls from public government data sources. Every output cites the source document. Do not submit CUI or classified data.':
      'SourceDeck obtiene datos de fuentes públicas del gobierno. Cada salida cita el documento de origen. No envíes datos CUI ni clasificados.',
    'Every ARCG Systems customer can ask for, and receive, the security and compliance artifacts their legal team requires — in the format they expect.':
      'Cada cliente de ARCG Systems puede solicitar y recibir los artefactos de seguridad y cumplimiento que su equipo legal requiere — en el formato que esperan.',
    'Practical reference for real solicitations.': 'Referencia práctica para solicitudes reales.',
    'SourceDeck is not an opportunity database. It is a capture workflow that takes an opportunity you already found and produces the artifacts your team needs to decide and bid.':
      'SourceDeck no es una base de datos de oportunidades. Es un flujo de trabajo de captura que toma una oportunidad que ya encontraste y produce los artefactos que tu equipo necesita para decidir y licitar.',
    'Send the opportunity, your company context, and current tools. We\'ll route it through the right SourceDeck workflow.':
      'Envía la oportunidad, el contexto de tu empresa y tus herramientas actuales. Lo enrutaremos por el flujo de trabajo correcto de SourceDeck.',
    'Your request is in the right inbox. You\'ll get a direct reply within one business day.':
      'Tu solicitud llegó al inbox correcto. Recibirás respuesta directa dentro de un día hábil.',
    'Clients see status. Vendors see their work orders. Subs see their dispatch queue. Internal stakeholders see their cut of the operation. Never more.':
      'Los clientes ven el estado. Los proveedores ven sus órdenes de trabajo. Los subs ven su cola de despacho. Los stakeholders internos ven su parte de la operación. Nunca más.',
    'Every lead, reply, click, checkout, and bounce fires into your endpoint of choice. Signed, queued, retried — operator-grade.':
      'Cada lead, respuesta, clic, checkout y bounce se dispara hacia el endpoint que elijas. Firmado, en cola, con reintentos — calidad de operador.',
    'Every ship that matters to operators. Minor patches not listed.':
      'Cada lanzamiento que importa a los operadores. Los parches menores no se listan.',

    // Footer column labels (Spanish-friendly)
    'Subs see their dispatch queue.': 'Los subs ven su cola de despacho.',

    // ============================================================
    // /security/ — security posture page
    // ============================================================
    'What is shipped today': 'Lo que se entrega hoy',
    'Partial / configuration-pending': 'Parcial / configuración pendiente',
    'Not claimed (and not certified)': 'No reclamado (y no certificado)',
    'Data deletion & contact': 'Eliminación de datos y contacto',
    'Roadmap (no commitment dates)': 'Roadmap (sin fechas comprometidas)',
    'Blank workspace by default': 'Espacio de trabajo en blanco por defecto',
    'User-controlled workspace data': 'Datos del espacio de trabajo controlados por el usuario',
    'Authentication-aware access': 'Acceso con conciencia de autenticación',
    'No cross-user data leakage': 'Sin filtraciones de datos entre usuarios',
    'PWA delivery with safe caching': 'Entrega PWA con cacheo seguro',
    'IBM watsonx integration': 'Integración con IBM watsonx',
    'Enterprise SSO / full RBAC': 'SSO de Enterprise / RBAC completo',
    'Audit / governance metadata': 'Metadatos de auditoría / gobernanza',
    'Compliance certifications': 'Certificaciones de cumplimiento',
    'Encryption-specific guarantees': 'Garantías específicas de cifrado',
    'Delete or export your data': 'Eliminar o exportar tus datos',
    'Responsible disclosure': 'Divulgación responsable',
    'shipped': 'entregado',
    'configuration pending': 'configuración pendiente',
    'scaffolded': 'andamiado',
    'structural': 'estructural',
    'not held': 'no obtenido',
    'not claimed': 'no reclamado',
    'First-time users see an empty workspace. No personal information, no seeded contacts, no demo records auto-load. Demo data loads only after an explicit user action.':
      'Los usuarios primerizos ven un espacio de trabajo vacío. Sin información personal, sin contactos precargados, sin registros de demostración automáticos. Los datos de demostración se cargan solo después de una acción explícita del usuario.',
    'Your sources, queries, pitches, and notes stay in your workspace. The static client never carries one operator\'s personal data into another tenant\'s bundle.':
      'Tus fuentes, consultas, pitches y notas permanecen en tu espacio de trabajo. El cliente estático nunca lleva los datos personales de un operador al paquete de otro tenant.',
    'Logged-out users see no saved data. Logged-in users see only data scoped to their authenticated identity. If ownership cannot be verified, the workspace fails closed and shows blank.':
      'Los usuarios sin sesión no ven datos guardados. Los usuarios con sesión solo ven datos asociados a su identidad autenticada. Si la propiedad no se puede verificar, el espacio de trabajo falla cerrado y se muestra en blanco.',
    'Storage keys are scoped per (tenant, user). The codebase does not reuse a single global key that could cause one user\'s data to surface in another user\'s session.':
      'Las claves de almacenamiento están segmentadas por (tenant, usuario). El código no reutiliza una única clave global que pudiera hacer que los datos de un usuario aparezcan en la sesión de otro.',
    'Service worker caches the public marketing shell only. Authenticated paths (/api/, /app/, /auth/callback/, /settings/, /checkout/) are explicitly never cached.':
      'El service worker solo cachea la cáscara pública de marketing. Las rutas autenticadas (/api/, /app/, /auth/callback/, /settings/, /checkout/) nunca se cachean de forma explícita.',
    'watsonx.ai integration is under configuration review. Code-side adapters and tests are in place; live runtime association is not yet verified. We will represent watsonx as production-ready only after runtime association and live smoke testing succeed.':
      'La integración con watsonx.ai está en revisión de configuración. Los adaptadores de código y las pruebas están listos; la asociación en runtime aún no se verifica. Representaremos a watsonx como listo para producción solo después de que la asociación en runtime y las pruebas de humo en vivo tengan éxito.',
    'OIDC middleware foundation is built. A live SSO/IAM identity provider is not yet wired. Roles (owner / admin / analyst / viewer) are enforced server-side at the route layer.':
      'La base del middleware OIDC está construida. Aún no se ha cableado un proveedor de identidad SSO/IAM en vivo. Los roles (owner / admin / analyst / viewer) se aplican del lado del servidor en la capa de rutas.',
    'Every state-changing AI call emits a structured event with model id, prompt version, and token usage. Document content and raw prompts are never persisted. Export to a SIEM is documented; live forwarding is not yet wired.':
      'Cada llamada de IA que cambia el estado emite un evento estructurado con id del modelo, versión del prompt y uso de tokens. El contenido de documentos y los prompts crudos nunca se persisten. La exportación a un SIEM está documentada; el reenvío en vivo aún no está cableado.',
    'SourceDeck is not SOC 2, HIPAA, FedRAMP, ISO 27001, CMMC, or HITRUST certified. We are happy to participate in customer security reviews and to track concrete commitments toward formal certification when a paying enterprise contract requires it.':
      'SourceDeck no cuenta con certificación SOC 2, HIPAA, FedRAMP, ISO 27001, CMMC ni HITRUST. Con gusto participamos en revisiones de seguridad de clientes y damos seguimiento a compromisos concretos hacia una certificación formal cuando un contrato de enterprise pagado lo requiera.',
    'We do not currently claim "end-to-end encrypted" or "zero data retention" because those terms have specific technical meanings we have not implemented. Data in transit uses TLS via the hosting provider. Data at rest is stored by the configured backend (default: local browser storage; optional cloud backends available where configured).':
      'Actualmente no reclamamos "cifrado de extremo a extremo" ni "retención cero de datos" porque esos términos tienen significados técnicos específicos que no hemos implementado. Los datos en tránsito usan TLS a través del proveedor de hosting. Los datos en reposo se almacenan en el backend configurado (por defecto: almacenamiento local del navegador; backends en la nube opcionales disponibles donde se configuren).',
    'Email contact sales with the email address tied to your workspace. We will respond within one business day.':
      'Escribe a contact sales desde el correo asociado a tu espacio de trabajo. Responderemos dentro de un día hábil.',
    'If you find a security issue, email contact sales with subject "security disclosure." We respond within one business day for acknowledgement and within five business days for triage. Please don\'t open public GitHub issues for security reports.':
      'Si encuentras un problema de seguridad, escribe a contact sales con el asunto "security disclosure." Respondemos dentro de un día hábil para acuse y dentro de cinco días hábiles para triage. Por favor no abras issues públicos en GitHub para reportes de seguridad.',
    'We add to this list when something becomes a real customer commitment, not before.':
      'Agregamos a esta lista cuando algo se vuelve un compromiso real con un cliente, no antes.',
    'OIDC IdP wiring (Okta / IBM IAM / Auth0 — customer-driven)':
      'Cableado de IdP OIDC (Okta / IBM IAM / Auth0 — impulsado por el cliente)',
    'Postgres-backed tenant policy + Redis usage metering in production':
      'Política de tenants respaldada en Postgres + medición de uso con Redis en producción',
    'Audit forwarding to customer SIEM (LogDNA / Splunk / OpenSearch)':
      'Reenvío de auditoría al SIEM del cliente (LogDNA / Splunk / OpenSearch)',
    'SOC 2 Type II — opened only when a paying enterprise contract requires it':
      'SOC 2 Type II — abierto solo cuando un contrato de enterprise pagado lo requiera',

    // ============================================================
    // /enterprise/ — media workflow page
    // ============================================================
    'Media opportunity management for teams.': 'Gestión de oportunidades de medios para equipos.',
    'Media opportunity management for': 'Gestión de oportunidades de medios para',
    'The problem': 'El problema',
    'The solution': 'La solución',
    'Trust & control': 'Confianza y control',
    'Status & honesty notes': 'Estado y notas de honestidad',
    'Talk to us': 'Hablemos',
    'PR agencies': 'Agencias de PR',
    'Communications teams': 'Equipos de comunicaciones',
    'Newsrooms': 'Salas de redacción',
    'Public-affairs teams': 'Equipos de asuntos públicos',
    'Expert networks': 'Redes de expertos',
    'Queries arrive in inboxes. Expert vetting happens in DMs. Pitch tracking lives in spreadsheets. Approvals get lost. Coverage isn\'t closed-looped against the original pitch. Senior comms reviewers have no single place to see what\'s open, who\'s on it, and what shipped.':
      'Las consultas llegan a los inboxes. La validación de expertos pasa por DMs. El seguimiento de pitches vive en hojas de cálculo. Las aprobaciones se pierden. La cobertura no cierra el ciclo contra el pitch original. Los revisores senior de comunicación no tienen un solo lugar para ver qué está abierto, quién lo lleva y qué se publicó.',
    'One structured workspace for the whole media pipeline. Everyone on the team sees the same queue, the same source roster, the same pitch status, the same coverage outcomes — scoped to your tenant only.':
      'Un espacio de trabajo estructurado para todo el pipeline de medios. Todo el equipo ve la misma cola, la misma lista de fuentes, el mismo estado de pitches y los mismos resultados de cobertura — limitado a tu tenant únicamente.',
    'Track every client\'s queries, expert responses, pitches, and coverage in one workspace. Internal handoffs without inbox forwarding.':
      'Da seguimiento a las consultas, respuestas de expertos, pitches y cobertura de cada cliente en un único espacio de trabajo. Traspasos internos sin reenvíos de inbox.',
    'Inbound media requests + spokesperson assignments + on-the-record approval flow without a separate tracking tool.':
      'Solicitudes de medios entrantes + asignaciones de vocería + flujo de aprobación en el registro, sin una herramienta de seguimiento aparte.',
    'Source rosters, response tracking, and assignment status in one place. Reporters and editors see the same surface.':
      'Listas de fuentes, seguimiento de respuestas y estado de asignaciones en un solo lugar. Reporteros y editores ven la misma superficie.',
    'Stakeholder briefs, query routing, approval gates, and coverage review across a multi-stakeholder org.':
      'Briefings de stakeholders, enrutamiento de consultas, gates de aprobación y revisión de cobertura para una organización con múltiples stakeholders.',
    'Match incoming queries to the right experts. Track responses through to publication. Surface what\'s working.':
      'Asocia las consultas entrantes con los expertos adecuados. Da seguimiento a las respuestas hasta la publicación. Resalta lo que funciona.',
    'Review — assign to the right expert or spokesperson.': 'Revisar — asignar al experto o vocero adecuado.',
    'Respond — draft, approve, send. One closed loop.': 'Responder — redactar, aprobar, enviar. Un ciclo cerrado.',
    'Track — pitch → publication, with owner + due date.': 'Seguir — pitch → publicación, con responsable y fecha de entrega.',
    'Report — see what landed, where, and what produced it.': 'Reportar — ve qué se publicó, dónde y qué lo produjo.',
    'Blank workspace by default. No sample data auto-loads. Demo workspace is opt-in.':
      'Espacio de trabajo en blanco por defecto. No se cargan datos de muestra automáticamente. El espacio de demostración es opt-in.',
    'User-controlled workspace data. Your sources, queries, and pitches stay in your workspace.':
      'Datos del espacio de trabajo controlados por el usuario. Tus fuentes, consultas y pitches permanecen en tu espacio de trabajo.',
    'Authentication-aware access. Logged-out users see no saved data. Logged-in users see only their own.':
      'Acceso con conciencia de autenticación. Los usuarios sin sesión no ven datos guardados. Los usuarios con sesión solo ven los suyos.',
    'Data separation. Scoped storage keys. Tenant-aware queries. Fail-closed on ambiguity.':
      'Separación de datos. Claves de almacenamiento segmentadas. Consultas con conciencia de tenant. Falla cerrada ante ambigüedad.',
    'Admin-ready language. Procurement & legal can read what we ship.':
      'Lenguaje listo para administración. Procurement y legal pueden leer lo que entregamos.',
    'SourceDeck is in active development. We don\'t claim certifications we don\'t hold:':
      'SourceDeck está en desarrollo activo. No reclamamos certificaciones que no tenemos:',
    'SOC 2, HIPAA, FedRAMP, CMMC, ISO 27001 — not certified. Tracked on the security page.':
      'SOC 2, HIPAA, FedRAMP, CMMC, ISO 27001 — no certificado. Documentado en la página de seguridad.',
    'Enterprise SSO & full RBAC — on the roadmap, not shipped.':
      'SSO Enterprise y RBAC completo — en el roadmap, no entregado.',
    'IBM watsonx integration — configuration review. Will be represented as production-ready only after live runtime association & smoke testing are verified.':
      'Integración con IBM watsonx — en revisión de configuración. Se representará como lista para producción solo después de verificar la asociación en runtime en vivo y las pruebas de humo.',
    'AI features — available where a workspace has explicitly configured them.':
      'Funciones de IA — disponibles donde un espacio de trabajo las haya configurado explícitamente.',
    'Enterprise inquiries: contact sales': 'Consultas Enterprise: contactar ventas',

    // ============================================================
    // /federal/ — federal posture page
    // ============================================================
    'What we claim': 'Lo que afirmamos',
    'What we do not claim': 'Lo que no afirmamos',
    'AI-assisted capture workflow for GovCon teams': 'Flujo de trabajo de captura asistido por IA para equipos GovCon',
    'Bid/no-bid scoring with written rationale': 'Puntuación de bid/no-bid con justificación escrita',
    'Compliance matrix from Section L/M extraction': 'Matriz de cumplimiento a partir de la extracción de las Secciones L/M',
    'Proposal draft sections requiring human review': 'Secciones de borrador de propuesta que requieren revisión humana',
    'FAR-aware stakeholder research guidance': 'Guía de investigación de stakeholders consciente de FAR',
    'SOC 2, FedRAMP, CMMC, ISO, HIPAA, or HITRUST certification': 'Certificación SOC 2, FedRAMP, CMMC, ISO, HIPAA o HITRUST',
    'Guaranteed win rates or scoring outcomes': 'Tasas de éxito garantizadas o resultados de puntuación',
    'CUI-authorized storage (do not submit CUI data)': 'Almacenamiento autorizado para CUI (no envíes datos CUI)',
    'Set-aside certification eligibility determination': 'Determinación de elegibilidad para certificación set-aside',
    'Recommendation to contact a CO during restricted communication windows':
      'Recomendación de contactar a un CO durante ventanas de comunicación restringida',
    'SourceDeck processes publicly available SAM.gov solicitation data and user-supplied past-performance records. Do not submit CUI, classified information, or proprietary agency data. Your private credentials (API keys, DUNS, CAGE) are not logged by default.':
      'SourceDeck procesa datos de solicitudes públicamente disponibles en SAM.gov y registros de desempeño pasado proporcionados por el usuario. No envíes datos CUI, información clasificada ni datos propietarios de la agencia. Tus credenciales privadas (claves API, DUNS, CAGE) no se registran por defecto.',
    'AI outputs are generated by third-party models. Review all drafts before use. Citations reference the source solicitation; verify against the live document before submission.':
      'Las salidas de IA se generan con modelos de terceros. Revisa todos los borradores antes de su uso. Las citas hacen referencia a la solicitud de origen; verifícalas contra el documento vigente antes del envío.',
    'SourceDeck does not recommend direct contact with contracting officers during restricted communication windows. Stakeholder research identifies contacts for reference; always follow the solicitation\'s communication instructions and FAR Part 15 restrictions. Q&A submissions are the buyer\'s responsibility.':
      'SourceDeck no recomienda contacto directo con contracting officers durante ventanas de comunicación restringida. La investigación de stakeholders identifica contactos como referencia; siempre sigue las instrucciones de comunicación de la solicitud y las restricciones de FAR Parte 15. Los envíos de Q&A son responsabilidad del comprador.',
    'See also: Data sources · Methodology · Security & trust':
      'Ver también: Fuentes de datos · Metodología · Seguridad y confianza',
    'See also:': 'Ver también:',

    // ============================================================
    // /request-access/ — form
    // ============================================================
    'Required fields marked *. We respond within one business day.':
      'Campos requeridos marcados con *. Respondemos dentro de un día hábil.',
    'We respond within one business day. AI outputs require human review. No false certification claims. See our security & trust page.':
      'Respondemos dentro de un día hábil. Las salidas de IA requieren revisión humana. Sin reclamos falsos de certificación. Consulta nuestra página de seguridad y confianza.',
    'security & trust page': 'página de seguridad y confianza',
    'Prefer to read first? Open the sample SourceDeck →': '¿Prefieres leer primero? Abre el SourceDeck de muestra →',
    'Open the sample SourceDeck →': 'Abrir el SourceDeck de muestra →',
    'Comparing tools? SourceDeck vs GovWin, GovTribe, BGOV →':
      '¿Comparando herramientas? SourceDeck vs GovWin, GovTribe, BGOV →',
    'What happens next': 'Qué pasa después',
    'An operator reads the form within one business day.': 'Un operador lee el formulario dentro de un día hábil.',
    'If you sent an opportunity, we run a SourceDeck on it — or send a clear "not a fit" in writing.':
      'Si enviaste una oportunidad, le pasamos un SourceDeck — o te enviamos un "no es un fit" claro por escrito.',
    'We schedule a 20–30 minute working session to walk the deck together.':
      'Programamos una sesión de trabajo de 20 a 30 minutos para recorrer el deck juntos.',
    'If it\'s a fit, we provision a workspace and start with one real pursuit.':
      'Si hay fit, provisionamos un espacio de trabajo y empezamos con una captura real.',
    'Name *': 'Nombre *',
    'Work email *': 'Correo de trabajo *',
    'Company *': 'Empresa *',
    'GovCon revenue band': 'Banda de ingresos GovCon',
    'Primary goal *': 'Objetivo principal *',
    'Current tools used': 'Herramientas que usan actualmente',
    'Spreadsheets': 'Hojas de cálculo',
    'Message': 'Mensaje',
    'Opportunity URL or description (optional)': 'URL o descripción de la oportunidad (opcional)',
    'Select...': 'Selecciona...',
    'Select primary goal...': 'Selecciona el objetivo principal...',
    'Solo (1 user)': 'Solo (1 usuario)',
    'Small (2–10)': 'Pequeño (2–10)',
    'Mid (11–50)': 'Mediano (11–50)',
    'Large (51–250)': 'Grande (51–250)',
    'Enterprise (250+)': 'Enterprise (250+)',
    'Pre-revenue / pursuing first awards': 'Sin ingresos / persiguiendo las primeras adjudicaciones',
    'Under $1M annual GovCon revenue': 'Menos de $1M de ingresos anuales en GovCon',
    'Prefer not to say': 'Prefiero no decirlo',
    'Qualify bid/no-bid': 'Calificar bid/no-bid',
    'Build compliance matrix': 'Construir matriz de cumplimiento',
    'Draft proposal sections': 'Redactar secciones de propuesta',
    'Improve capture workflow': 'Mejorar el flujo de captura',
    'Discover opportunities': 'Descubrir oportunidades',
    'Map stakeholders': 'Mapear stakeholders',
    'Track pipeline': 'Dar seguimiento al pipeline',

    // ============================================================
    // /agents/ — capability cards
    // ============================================================
    'Helps qualify inbound and outbound targets before committing team time. Supports lead scoring, denial/risk prediction, and bounce guard on outreach lists.':
      'Ayuda a calificar prospectos de entrada y salida antes de comprometer tiempo del equipo. Apoya la puntuación de leads, la predicción de denegación/riesgo y la protección contra rebotes en listas de outreach.',
    'Capabilities: lead scoring · risk prediction · bounce guard':
      'Capacidades: puntuación de leads · predicción de riesgo · protección contra rebotes',
    'Supports generating proposals, RFP response sections, compliance matrices, content variants, pitch decks, job descriptions, and meeting summaries. All AI output requires human review.':
      'Apoya la generación de propuestas, secciones de respuesta a RFP, matrices de cumplimiento, variantes de contenido, pitch decks, descripciones de puestos y resúmenes de reuniones. Todas las salidas de IA requieren revisión humana.',
    'Capabilities: proposal drafting · RFP response · content variants · meeting summaries':
      'Capacidades: redacción de propuestas · respuesta a RFP · variantes de contenido · resúmenes de reuniones',
    'Helps draft outreach sequences, classify and reply to inbound messages, and maintain follow-up cadences at volume. Supports workflow packs for common intake patterns.':
      'Ayuda a redactar secuencias de outreach, clasificar y responder mensajes entrantes y mantener cadencias de seguimiento a gran escala. Apoya paquetes de flujo para patrones comunes de ingreso.',
    'Capabilities: reply classification · outreach sequences · workflow packs':
      'Capacidades: clasificación de respuestas · secuencias de outreach · paquetes de flujo',
    'Assigns actions, deadlines, and owners across every active pursuit. Tracks amendments, renewal dates, and follow-up tasks. GovCon adds FAR-aware contact posture.':
      'Asigna acciones, fechas límite y responsables en cada captura activa. Da seguimiento a enmiendas, fechas de renovación y tareas de seguimiento. GovCon añade postura de contacto consciente de FAR.',
    'Capabilities: pipeline tracking · task assignment · deadline management':
      'Capacidades: seguimiento de pipeline · asignación de tareas · gestión de fechas límite',

    // ============================================================
    // /integrations/ — page
    // ============================================================
    'Internal CPARS / PPQ records': 'Registros CPARS / PPQ internos',
    'Customer-driven integrations are scoped per team. Contact us to discuss your stack. See /data-sources/ for public data source details.':
      'Las integraciones impulsadas por el cliente se definen por equipo. Contáctanos para conversar sobre tu stack. Consulta /data-sources/ para detalles de fuentes de datos públicas.',
    'Customer-driven integrations are scoped per team.': 'Las integraciones impulsadas por el cliente se definen por equipo.',
    'Contact us': 'Contáctanos',
    'to discuss your stack. See': 'para conversar sobre tu stack. Consulta',
    'for public data source details.': 'para detalles de fuentes de datos públicas.',

    // ============================================================
    // /command/ — operational command center
    // ============================================================
    'Operational Inbox': 'Inbox operativo',
    '15 items need an owner decision — sorted by severity':
      '15 elementos requieren una decisión de responsable — ordenados por severidad',
    'Assign all owned': 'Asignar todos los míos',
    'All · 15': 'Todos · 15',
    'Revenue Path · 30d': 'Ruta de ingresos · 30d',
    'Lead → Outreach → Reply → Meeting → Proposal → Invoice → Paid':
      'Lead → Outreach → Respuesta → Reunión → Propuesta → Factura → Pagado',
    'Playbooks in flight': 'Playbooks en curso',
    'Executable SOPs · owner-assigned · completion evidence required':
      'SOPs ejecutables · asignados a un responsable · evidencia de cumplimiento requerida',
    'Implementation readiness': 'Preparación de implementación',
    '7 / 9 gates passed': '7 / 9 gates aprobados',
    'Connector health': 'Salud de conectores',
    '8 live · 1 degraded · 1 failed': '8 en vivo · 1 degradado · 1 fallido',
    'Retry all failed': 'Reintentar todos los fallidos',

    // Demo inbox rows (left in English by default; translated where the
    // operator-grade flavor still reads naturally in Spanish)
    'Proposal signature missing —': 'Falta firma de propuesta —',
    'Instantly sender warmup dropped —': 'Calentamiento del remitente de Instantly cayó —',
    'Subcontractor insurance expired —': 'Seguro de subcontratista expirado —',
    'MSA countersign —': 'Contrafirma de MSA —',
    'Invoice overdue —': 'Factura vencida —',
    'Bid / no-bid decision —': 'Decisión bid / no-bid —',
    'Delivery SLA breach —': 'Incumplimiento de SLA de entrega —',
    'Stale deal —': 'Deal sin avance —',
    'Airtable → HubSpot sync —': 'Sincronización Airtable → HubSpot —',
    'Prior-auth request missing attachments —': 'Solicitud de pre-autorización sin adjuntos —',
    'W-9 + COI pack requested —': 'Paquete W-9 + COI solicitado —',
    'Invoice draft not sent —': 'Borrador de factura sin enviar —',
    'Portal approval pending —': 'Aprobación en portal pendiente —',
    'Reply requires human review —': 'La respuesta requiere revisión humana —',
    'Proposal ready to send —': 'Propuesta lista para enviar —',
    'Deal · Pro tier · $4,188/yr · 11 days since sent':
      'Deal · Pro tier · $4,188/año · 11 días desde el envío',
    'Automation · Bounce Guard paused Pricing Diagnosis funnel':
      'Automatización · Bounce Guard pausó el funnel Pricing Diagnosis',
    'Job · Cleaning Route 14 · cannot dispatch next Tuesday':
      'Trabajo · Ruta de limpieza 14 · no se puede despachar el próximo martes',
    'Document · Operator tier · sent 4 days ago':
      'Documento · Operator tier · enviado hace 4 días',
    'Invoice · $2,450 · net-30 expired 3d ago':
      'Factura · $2,450 · net-30 expirado hace 3 días',
    'Deal · GovCon · pWIN 0.41 · pursuit closes in 6d':
      'Deal · GovCon · pWIN 0.41 · la captura cierra en 6 días',
    'Job · Move-in clean · response > 24h on work order #4421':
      'Trabajo · Limpieza de mudanza · respuesta > 24h en la orden de trabajo #4421',
    'Deal · no activity 18 days · proposal not yet sent':
      'Deal · sin actividad por 18 días · propuesta aún no enviada',
    'Automation · 4 deal records queued · credential likely expired':
      'Automatización · 4 registros de deal en cola · es probable que la credencial haya expirado',
    'Task · MedPilot vertical · surgical date at risk':
      'Tarea · vertical MedPilot · fecha de cirugía en riesgo',
    'Document · new vendor onboarding · 48h since ask':
      'Documento · onboarding de nuevo proveedor · 48h desde la solicitud',
    'Invoice · $7,988 · created 5d ago':
      'Factura · $7,988 · creada hace 5 días',
    'Document · Job #J-2031 · $1,850 scope delta':
      'Documento · Trabajo #J-2031 · delta de alcance $1,850',
    'Lead · Reply Classifier tag: REFERRAL · 2h idle':
      'Lead · etiqueta del Reply Classifier: REFERRAL · 2h inactivo',
    'Document · all win themes inserted · 1 click to DocuSign':
      'Documento · todos los win themes insertados · 1 clic a DocuSign',
    '"Who handles procurement?"': '"¿Quién maneja procurement?"',
    'configured sender': 'remitente configurado',
    'Client G — federal services · INV-0219 draft':
      'Cliente G — servicios federales · borrador INV-0219',
    'Playbook · 8 steps · owner JC · SLA 5 business days':
      'Playbook · 8 pasos · responsable JC · SLA 5 días hábiles',
    'Stripe customer created + portal link sent': 'Cliente de Stripe creado + enlace al portal enviado',
    'Workspace provisioned + keys intake email sent':
      'Espacio de trabajo provisionado + correo de ingreso de claves enviado',
    'Playbook · 6 steps · owner DL · SLA 24h response':
      'Playbook · 6 pasos · responsable DL · SLA 24h de respuesta',
    'Subcontractor matched + COI verified': 'Subcontratista asignado + COI verificado',
    'On-site check-in photo submitted': 'Foto de check-in en sitio enviada',
    'Playbook · 5 steps · owner JC · converts at 62% in our data':
      'Playbook · 5 pasos · responsable JC · convierte al 62% en nuestros datos',
    'Discovery call notes + pain map': 'Notas de discovery call + mapa de dolores',
    'Proposal drafted by Proposal Agent': 'Propuesta redactada por el Proposal Agent',
    'Connections, mappings, tests passed — 2 gates still open.':
      'Conexiones, mapeos y pruebas aprobadas — 2 gates aún abiertos.',
    '4.2% (over 3% threshold)': '4.2% (por encima del umbral de 3%)',
    'Workspace ready': 'Espacio de trabajo listo',
    'Email · outbound': 'Correo · saliente',
    'Last sync': 'Última sincronización',
    'bounce rate': 'tasa de rebote',

    // ============================================================
    // /thanks/ page
    // ============================================================
    'An operator (not an SDR) reads your message.': 'Un operador (no un SDR) lee tu mensaje.',
    'You\'ll get a reply with the next concrete step — quote, scoping call, or invoice — depending on what you asked for.':
      'Recibirás una respuesta con el siguiente paso concreto — cotización, llamada de scoping o factura — según lo que hayas pedido.',
    'Reply to that email if anything changes on your side; the thread stays continuous.':
      'Responde a ese correo si algo cambia de tu lado; el hilo queda continuo.',
    'While you wait': 'Mientras esperas',

    // ============================================================
    // /compare/ page
    // ============================================================
    'SourceDeck vs the alternatives.': 'SourceDeck frente a las alternativas.',
    'SAM.gov only': 'Solo SAM.gov',
    'AI proposal draft sections': 'Secciones de borrador de propuesta con IA',
    'Stakeholder map & follow-up workflow': 'Mapa de stakeholders y flujo de seguimiento',
    'Comparison based on public feature documentation. Not a paid endorsement or disparagement of any vendor. Verify with each vendor before purchasing.':
      'Comparación basada en documentación pública de funcionalidades. No es un endoso pagado ni un menosprecio de ningún proveedor. Verifica con cada proveedor antes de comprar.',
    'See SourceDeck in action': 'Ver SourceDeck en acción',
    'How SourceDeck compares to GovWin IQ, GovTribe, BGOV, HigherGov, and Sweetspot for GovCon capture workflow.':
      'Cómo se compara SourceDeck con GovWin IQ, GovTribe, BGOV, HigherGov y Sweetspot para flujos de captura GovCon.',

    // ============================================================
    // SETTINGS hub spoke
    // ============================================================
    'Click a spoke or a legend row to jump into that module\'s setup.':
      'Haz clic en un radio o en una fila de la leyenda para ir a la configuración de ese módulo.',

    // ============================================================
    // Inline-element split fragments (text nodes split around
    // <strong>/<code>/<a>). Each text-node fragment lives separately
    // in the DOM, so we translate each fragment individually while
    // letting the inline element handle its own translation.
    // ============================================================
    // /security/ — text nodes around <code> and <a>
    'Service worker caches the public marketing shell only. Authenticated paths (':
      'El service worker solo cachea la cáscara pública de marketing. Las rutas autenticadas (',
    ') are explicitly never cached.': ') nunca se cachean de forma explícita.',
    'OIDC middleware foundation is built. A live SSO/IAM identity provider is not yet wired. Roles (':
      'La base del middleware OIDC está construida. Aún no se ha cableado un proveedor de identidad SSO/IAM en vivo. Los roles (',
    ') are enforced server-side at the route layer.':
      ') se aplican del lado del servidor en la capa de rutas.',
    'SOC 2, HIPAA, FedRAMP, ISO 27001, CMMC, or HITRUST certified. We are happy to participate in customer security reviews and to track concrete commitments toward formal certification when a paying enterprise contract requires it.':
      'cuenta con certificación SOC 2, HIPAA, FedRAMP, ISO 27001, CMMC ni HITRUST. Con gusto participamos en revisiones de seguridad de clientes y damos seguimiento a compromisos concretos hacia una certificación formal cuando un contrato de enterprise pagado lo requiera.',
    'with the email address tied to your workspace. We will respond within one business day.':
      'desde el correo asociado a tu espacio de trabajo. Responderemos dentro de un día hábil.',
    'If you find a security issue, email': 'Si encuentras un problema de seguridad, escribe a',
    'with subject "security disclosure." We respond within one business day for acknowledgement and within five business days for triage. Please don\'t open public GitHub issues for security reports.':
      'con el asunto "security disclosure." Respondemos dentro de un día hábil para acuse y dentro de cinco días hábiles para triage. Por favor no abras issues públicos en GitHub para reportes de seguridad.',
    'Live IBM watsonx runtime association & smoke test':
      'Asociación en runtime en vivo de IBM watsonx y prueba de humo',

    // /enterprise/ — text nodes after <strong> in list items
    '— pull queries from inbound channels into one queue.':
      '— extrae consultas desde canales entrantes a una sola cola.',
    '— assign to the right expert or spokesperson.':
      '— asigna al experto o vocero adecuado.',
    '— pitch → publication, with owner + due date.':
      '— pitch → publicación, con responsable y fecha de entrega.',
    '— see what landed, where, and what produced it.':
      '— ve qué se publicó, dónde y qué lo produjo.',
    'No sample data auto-loads. Demo workspace is opt-in.':
      'No se cargan datos de muestra automáticamente. El espacio de demostración es opt-in.',
    'Your sources, queries, and pitches stay in your workspace.':
      'Tus fuentes, consultas y pitches permanecen en tu espacio de trabajo.',
    'Logged-out users see no saved data. Logged-in users see only their own.':
      'Los usuarios sin sesión no ven datos guardados. Los usuarios con sesión solo ven los suyos.',
    'Scoped storage keys. Tenant-aware queries. Fail-closed on ambiguity.':
      'Claves de almacenamiento segmentadas. Consultas con conciencia de tenant. Falla cerrada ante ambigüedad.',
    'Procurement & legal can read what we ship.':
      'Procurement y legal pueden leer lo que entregamos.',
    'Tracked on the security page.': 'Documentado en la página de seguridad.',
    'Enterprise SSO & full RBAC —': 'SSO Enterprise y RBAC completo —',
    'on the roadmap, not shipped.': 'en el roadmap, no entregado.',
    'Will be represented as production-ready only after live runtime association & smoke testing are verified.':
      'Se representará como listo para producción solo después de verificar la asociación en runtime en vivo y las pruebas de humo.',
    'Read the security page': 'Leer la página de seguridad',
    'IBM watsonx integration —': 'Integración con IBM watsonx —',
    'configuration review.': 'en revisión de configuración.',
    'AI features —': 'Funciones de IA —',
    'available where a workspace has explicitly configured them.':
      'disponibles donde un espacio de trabajo las haya configurado explícitamente.',
    'not certified.': 'no certificado.',

    // /request-access/ — text node before security link
    'We respond within one business day. AI outputs require human review. No false certification claims. See our':
      'Respondemos dentro de un día hábil. Las salidas de IA requieren revisión humana. Sin reclamos falsos de certificación. Consulta nuestra',
    'page.': 'página.',
    'security & trust': 'seguridad y confianza',

    // Common <strong> bold lead-in labels used on enterprise list items
    'Find': 'Encontrar',
    'Review': 'Revisar',
    'Respond': 'Responder',
    'Track': 'Seguir',
    'Report': 'Reportar',
    'Blank workspace by default.': 'Espacio de trabajo en blanco por defecto.',
    'User-controlled workspace data.': 'Datos del espacio de trabajo controlados por el usuario.',
    'Authentication-aware access.': 'Acceso con conciencia de autenticación.',
    'Data separation.': 'Separación de datos.',
    'Admin-ready language.': 'Lenguaje listo para administración.',

    // ============================================================
    // HOMEPAGE — HERO
    // ============================================================
    'AI workflow engine': 'Motor de flujo de trabajo con IA',
    'Turn leads, pursuits, and requests into working workflows.':
      'Convierte leads, oportunidades y solicitudes en flujos de trabajo operativos.',
    'SourceDeck helps teams qualify opportunities, generate content, automate follow-up, and track work from intake to closeout.':
      'SourceDeck ayuda a los equipos a calificar oportunidades, generar contenido, automatizar el seguimiento y dar seguimiento al trabajo desde la entrada hasta el cierre.',
    'View GovCon sample': 'Ver muestra GovCon',
    'Lead intelligence': 'Inteligencia de leads',
    'Content creation': 'Creación de contenido',
    'Email automation': 'Automatización de correo',
    'Proposal drafts': 'Borradores de propuestas',
    'Pipeline tracking': 'Seguimiento del pipeline',
    'GovCon capture': 'Captura de GovCon',

    // ============================================================
    // HOMEPAGE — VERTICAL TABS
    // ============================================================
    'Choose your workflow': 'Elige tu flujo de trabajo',
    'Built for your team type.': 'Hecho para tu tipo de equipo.',
    'SourceDeck runs the same core workflow engine across five verticals. Pick yours to see the outputs.':
      'SourceDeck ejecuta el mismo motor central de flujo de trabajo en cinco verticales. Elige la tuya para ver los resultados.',
    '🏛️ GovCon': '🏛️ GovCon',
    '📈 B2B Sales': '📈 Ventas B2B',
    '🏥 Healthcare': '🏥 Salud',
    '👥 Staffing': '👥 Staffing',
    '🏠 Property': '🏠 Inmuebles',

    // GovCon vertical cards
    'GovCon — 01': 'GovCon — 01',
    'GovCon — 02': 'GovCon — 02',
    'GovCon — 03': 'GovCon — 03',
    'GovCon — 04': 'GovCon — 04',
    'Bid/no-bid scoring': 'Puntuación de bid / no-bid',
    'Score any SAM.gov opportunity across NAICS, set-aside, past performance, and deadline runway. Written rationale, human decision.':
      'Puntúa cualquier oportunidad de SAM.gov por NAICS, set-aside, desempeño pasado y plazo. Justificación escrita, decisión humana.',
    'Compliance matrix': 'Matriz de cumplimiento',
    'Extract Section L and M requirements. Map owners, evidence, and response locations. Export to Word with traceability intact.':
      'Extrae los requisitos de las Secciones L y M. Mapea responsables, evidencia y ubicaciones de respuesta. Exporta a Word con trazabilidad intacta.',
    'Proposal draft': 'Borrador de propuesta',
    'AI-generated sections grounded in your past-performance library. FAR-aware. All drafts require human review before submission.':
      'Secciones generadas por IA basadas en tu biblioteca de desempeño pasado. Conscientes de FAR. Todos los borradores requieren revisión humana antes del envío.',
    'Capture follow-up': 'Seguimiento de captura',
    'Q&A windows, amendment dates, stakeholder research, and action assignments tied to the solicitation calendar.':
      'Ventanas de preguntas y respuestas, fechas de enmiendas, investigación de stakeholders y asignaciones de acciones vinculadas al calendario de la solicitud.',

    // B2B Sales vertical cards
    'B2B Sales — 01': 'Ventas B2B — 01',
    'B2B Sales — 02': 'Ventas B2B — 02',
    'B2B Sales — 03': 'Ventas B2B — 03',
    'B2B Sales — 04': 'Ventas B2B — 04',
    'Lead scoring': 'Puntuación de leads',
    'Qualify inbound and outbound leads against your ICP. Score by firmographics, intent signals, and fit. Prioritize before your team invests time.':
      'Califica leads de entrada y salida contra tu ICP. Puntúa por firmográficos, señales de intención y ajuste. Prioriza antes de que tu equipo invierta tiempo.',
    'Outreach content': 'Contenido de outreach',
    'Generate personalized cold emails, follow-up sequences, and sales deck sections from your positioning and prospect context.':
      'Genera correos en frío personalizados, secuencias de seguimiento y secciones de presentaciones de ventas a partir de tu posicionamiento y el contexto del prospecto.',
    'Auto email responses': 'Respuestas automáticas de correo',
    'Draft replies to inbound inquiries automatically. Route and triage at volume without losing personal tone.':
      'Redacta respuestas a consultas entrantes de forma automática. Enruta y clasifica a gran escala sin perder el tono personal.',
    'Assign next steps, follow-up dates, and deal owners. Track every pursuit from first touch to close.':
      'Asigna próximos pasos, fechas de seguimiento y responsables de cada deal. Da seguimiento a cada oportunidad desde el primer contacto hasta el cierre.',

    // Healthcare vertical cards
    'Healthcare — 01': 'Salud — 01',
    'Healthcare — 02': 'Salud — 02',
    'Healthcare — 03': 'Salud — 03',
    'Healthcare — 04': 'Salud — 04',
    'Prospect research': 'Investigación de prospectos',
    'Find and qualify healthcare organizations actively buying your service category. Score by facility type and procurement signals.':
      'Encuentra y califica organizaciones de salud que actualmente compran tu categoría de servicio. Puntúa por tipo de instalación y señales de compra.',
    'Referral or contract outreach': 'Outreach de referidos o contratos',
    'Generate vendor pitch content, capability statements, and outreach sequences for hospital business development. No PHI involved.':
      'Genera contenido de pitch de proveedor, capability statements y secuencias de outreach para business development en hospitales. Sin PHI involucrada.',
    'Stakeholder mapping': 'Mapeo de stakeholders',
    'Map the buying constellation: CMO, procurement lead, and department sponsors. Know who approves and who influences.':
      'Mapea la constelación de compra: CMO, líder de compras y sponsors de departamento. Sabe quién aprueba y quién influye.',
    'Follow-up workflow': 'Flujo de seguimiento',
    'Track renewal windows, RFP cycles, and follow-up tasks across your full healthcare business development pipeline.':
      'Da seguimiento a ventanas de renovación, ciclos de RFP y tareas de seguimiento en todo tu pipeline de business development en salud.',

    // Staffing vertical cards
    'Staffing — 01': 'Staffing — 01',
    'Staffing — 02': 'Staffing — 02',
    'Staffing — 03': 'Staffing — 03',
    'Staffing — 04': 'Staffing — 04',
    'Client lead generation': 'Generación de leads de clientes',
    'Find companies actively hiring in your placement categories. Score by urgency, fit, and relationship depth.':
      'Encuentra empresas que están contratando activamente en tus categorías de colocación. Puntúa por urgencia, ajuste y profundidad de la relación.',
    'Candidate/client pitch content': 'Contenido de pitch para candidato/cliente',
    'Generate job descriptions, client capability pitches, and placement summaries from your firm\'s history and focus areas.':
      'Genera descripciones de puesto, pitches de capacidades para clientes y resúmenes de colocación a partir del historial y áreas de enfoque de tu firma.',
    'Auto follow-up': 'Seguimiento automático',
    'Outreach sequences for client development and candidate communication. Auto-draft responses to inbound inquiries.':
      'Secuencias de outreach para desarrollo de clientes y comunicación con candidatos. Borradores automáticos de respuestas a consultas entrantes.',
    'Placement pipeline': 'Pipeline de colocaciones',
    'Track every active search by client, deadline, and status. Assign follow-up tasks and close dates across your team.':
      'Da seguimiento a cada búsqueda activa por cliente, fecha límite y estado. Asigna tareas de seguimiento y fechas de cierre en todo tu equipo.',

    // Property vertical cards
    'Property — 01': 'Inmuebles — 01',
    'Property — 02': 'Inmuebles — 02',
    'Property — 03': 'Inmuebles — 03',
    'Property — 04': 'Inmuebles — 04',
    'Owner/tenant leads': 'Leads de propietarios/inquilinos',
    'Qualify incoming owner and tenant inquiries. Score by fit, timeline, and property type before investing team time.':
      'Califica consultas entrantes de propietarios e inquilinos. Puntúa por ajuste, cronograma y tipo de propiedad antes de invertir tiempo del equipo.',
    'Listing or service content': 'Contenido de listado o servicio',
    'Generate property listings, lease summaries, and tenant communications from your property details and standard terms.':
      'Genera listados de propiedades, resúmenes de arrendamiento y comunicaciones con inquilinos a partir de los detalles de la propiedad y términos estándar.',
    'Vendor follow-up': 'Seguimiento de proveedores',
    'Auto-draft responses to inquiries and follow-up sequences for showings, applications, and renewal conversations.':
      'Borradores automáticos de respuestas a consultas y secuencias de seguimiento para visitas, solicitudes y conversaciones de renovación.',
    'Invoice/work-order tracking': 'Seguimiento de facturas/órdenes de trabajo',
    'Generate invoices and work-order summaries. Track payment status and service history across your portfolio.':
      'Genera facturas y resúmenes de órdenes de trabajo. Da seguimiento al estado de pagos y al historial de servicios en todo tu portafolio.',

    // ============================================================
    // HOMEPAGE — PLATFORM CAPABILITIES
    // ============================================================
    'Platform': 'Plataforma',
    'One engine. Multiple workflows.': 'Un solo motor. Múltiples flujos de trabajo.',
    'Every vertical runs on the same core capabilities. Configured for your team\'s context.':
      'Cada vertical corre sobre las mismas capacidades centrales. Configurado al contexto de tu equipo.',
    'Intelligence': 'Inteligencia',
    'Creation': 'Creación',
    'Outreach': 'Outreach',
    'Proposals': 'Propuestas',
    'Templates': 'Plantillas',
    'Tracking': 'Seguimiento',
    'Billing': 'Facturación',
    'Automation': 'Automatización',
    'Helps qualify prospects and opportunities from public and internal data before committing team time.':
      'Ayuda a calificar prospectos y oportunidades a partir de datos públicos e internos antes de comprometer tiempo del equipo.',
    'Supports generating proposals, pitches, emails, listings, and job descriptions from your existing materials.':
      'Apoya la generación de propuestas, pitches, correos, listados y descripciones de puestos a partir de tus materiales existentes.',
    'Helps draft outreach sequences and auto-replies at volume. All sends reviewed by your team.':
      'Ayuda a redactar secuencias de outreach y respuestas automáticas a gran escala. Todos los envíos son revisados por tu equipo.',
    'Proposal and response drafts': 'Borradores de propuestas y respuestas',
    'Supports generating Section L/M matrices, RFP response sections, and vendor capability statements.':
      'Apoya la generación de matrices de Sección L/M, secciones de respuesta a RFP y capability statements de proveedor.',
    'Workflow packs': 'Paquetes de flujo de trabajo',
    'Pre-built workflow templates for common pursuit and intake patterns. Configurable per vertical.':
      'Plantillas de flujo de trabajo preconstruidas para patrones comunes de captura e ingreso. Configurables por vertical.',
    'Pipeline and task tracking': 'Seguimiento de pipeline y tareas',
    'Assigns actions, deadlines, and owners across every active pursuit. Nothing falls through.':
      'Asigna acciones, fechas límite y responsables en cada captura activa. Nada se pierde.',
    'Invoice and client follow-up': 'Facturación y seguimiento de clientes',
    'Supports generating invoices and tracking payment and service status for client-facing teams.':
      'Apoya la generación de facturas y el seguimiento del estado de pagos y servicios para equipos de cara al cliente.',
    'Webhooks and portal workflows': 'Webhooks y flujos de portal',
    'Supports connecting intake forms, portals, and external triggers to SourceDeck workflow events.':
      'Apoya la conexión de formularios de ingreso, portales y disparadores externos a los eventos del flujo de trabajo de SourceDeck.',

    // ============================================================
    // HOMEPAGE — GOVCON PROOF, AUDIENCE, PRICING TEASER, CTA
    // ============================================================
    'Flagship workflow': 'Flujo de trabajo insignia',
    'GovCon capture.': 'Captura de GovCon.',
    'SourceDeck\'s deepest workflow turns a government opportunity into a bid decision, compliance matrix, proposal draft, and capture actions.':
      'El flujo de trabajo más profundo de SourceDeck convierte una oportunidad de gobierno en una decisión de bid, matriz de cumplimiento, borrador de propuesta y acciones de captura.',
    'View GovCon sample →': 'Ver muestra GovCon →',
    'Who uses SourceDeck': 'Quién usa SourceDeck',
    'Built for pursuit-driven teams.': 'Hecho para equipos enfocados en captura.',
    '🏛️ GovCon teams': '🏛️ Equipos de GovCon',
    'SDVOSB, 8(a), WOSB, HUBZone, and small-business contractors qualifying and bidding federal opportunities.':
      'Contratistas SDVOSB, 8(a), WOSB, HUBZone y de pequeña empresa que califican y licitan oportunidades federales.',
    '📈 B2B sales teams': '📈 Equipos de ventas B2B',
    'Revenue teams generating, qualifying, and closing more pipeline without adding headcount.':
      'Equipos de ingresos que generan, califican y cierran más pipeline sin sumar personal.',
    '🏥 Healthcare vendors': '🏥 Proveedores de salud',
    'Vendors pursuing hospital and health system contracts who need pitch content and procurement intelligence.':
      'Proveedores que persiguen contratos con hospitales y sistemas de salud y que necesitan contenido de pitch e inteligencia de compras.',
    '👥 Staffing firms': '👥 Firmas de staffing',
    'Placement agencies developing new client relationships and managing high-volume outreach.':
      'Agencias de colocación que desarrollan nuevas relaciones con clientes y gestionan outreach de alto volumen.',
    '🏠 Property managers': '🏠 Administradores de propiedades',
    'Residential and commercial managers who need listing content, tenant communication, and invoice workflows.':
      'Administradores residenciales y comerciales que necesitan contenido de listados, comunicación con inquilinos y flujos de facturación.',
    '🔧 Any pursuit-driven team': '🔧 Cualquier equipo enfocado en captura',
    'If your team wins by outworking the competition on research, content, and follow-up — SourceDeck is for you.':
      'Si tu equipo gana superando a la competencia en investigación, contenido y seguimiento — SourceDeck es para ti.',
    'Simple tiers for lean teams.': 'Niveles simples para equipos ágiles.',
    'Start with one seat. Add team workflow when volume grows.':
      'Comienza con un asiento. Agrega flujos de trabajo en equipo cuando crezca el volumen.',
    'View pricing': 'Ver precios',
    'Built for careful work.': 'Hecho para trabajo cuidadoso.',
    'All AI drafts require human review before use. SourceDeck does not hold SOC 2, FedRAMP, CMMC, ISO 27001, HIPAA, or HITRUST certification. Do not submit regulated, classified, or PHI data. GovCon: follow solicitation communication rules and FAR Part 15 restrictions.':
      'Todos los borradores generados por IA requieren revisión humana antes de su uso. SourceDeck no cuenta con certificación SOC 2, FedRAMP, CMMC, ISO 27001, HIPAA ni HITRUST. No envíes datos regulados, clasificados ni PHI. GovCon: sigue las reglas de comunicación de las solicitudes y las restricciones de FAR Parte 15.',
    'Ready to run a workflow?': '¿Listo para ejecutar un flujo de trabajo?',
    'Tell us your team type and what you want SourceDeck to help with. We\'ll route the right workflow.':
      'Cuéntanos el tipo de equipo que tienes y en qué quieres que SourceDeck te ayude. Enrutaremos el flujo de trabajo correcto.',

    // ============================================================
    // PRICING PAGE
    // ============================================================
    'Subscription seats are separate from optional one-time implementation fees. Start with one seat; add team workflow when capture volume grows.':
      'Los asientos de suscripción son independientes de las tarifas opcionales únicas de implementación. Comienza con un asiento; agrega flujo de equipo cuando crezca el volumen de captura.',
    'Subscription — per seat per month': 'Suscripción — por asiento por mes',
    'Solo': 'Solo',
    'One user. Full capture workflow.': 'Un usuario. Flujo de captura completo.',
    'SAM.gov intake & parsing': 'Ingreso y parsing de SAM.gov',
    'Proposal draft sections': 'Secciones de borrador de propuesta',
    'Follow-up task tracking': 'Seguimiento de tareas',
    'Get started': 'Comenzar',
    'RECOMMENDED': 'RECOMENDADO',
    'Team': 'Equipo',
    'Shared workspace for capture and proposal teams.':
      'Espacio de trabajo compartido para equipos de captura y propuestas.',
    'Everything in Solo': 'Todo lo de Solo',
    'Shared pursuit workspace': 'Espacio de trabajo compartido para capturas',
    'Stakeholder graph & assignments': 'Grafo de stakeholders y asignaciones',
    'Amendment & Q&A calendar': 'Calendario de enmiendas y preguntas/respuestas',
    'BYOK AI inference option': 'Opción BYOK para inferencia de IA',
    'Request Team access': 'Solicitar acceso Team',
    'ENTERPRISE': 'ENTERPRISE',
    'Enterprise': 'Enterprise',
    'From $997': 'Desde $997',
    'Custom workflow, data handling, and support.':
      'Flujo de trabajo, manejo de datos y soporte personalizados.',
    'Everything in Team': 'Todo lo de Team',
    'Custom NAICS / agency filters': 'Filtros personalizados de NAICS / agencia',
    'CUI-aware data handling': 'Manejo de datos consciente de CUI',
    'Dedicated support': 'Soporte dedicado',
    'Volume pricing available': 'Precios por volumen disponibles',
    'Contact sales': 'Contactar ventas',
    'Contact sales →': 'Contactar ventas →',

    'Optional one-time implementation': 'Implementación opcional única',
    'Implementation is optional and separate from the subscription.':
      'La implementación es opcional e independiente de la suscripción.',
    'Choose it only if you want help standing up the workflow against your existing past-performance library and pursuit pipeline. You enter your own private credentials where required.':
      'Elígela solo si quieres ayuda para montar el flujo de trabajo sobre tu biblioteca de desempeño pasado y tu pipeline de captura existentes. Tú ingresas tus propias credenciales privadas donde se requieran.',
    'Self-install': 'Auto-instalación',
    'Core': 'Core',
    'one-time': 'pago único',
    'System access, install docs, and setup walkthroughs.':
      'Acceso al sistema, documentación de instalación y recorridos de configuración.',
    'Full install documentation': 'Documentación completa de instalación',
    'Setup walkthrough access': 'Acceso a los recorridos de configuración',
    'Core workflow assets': 'Activos del flujo de trabajo Core',
    'Get Core': 'Obtener Core',
    'Guided onboarding': 'Onboarding guiado',
    'Growth': 'Growth',
    'Everything in Core plus guided setup and connection.':
      'Todo lo de Core más configuración y conexión guiadas.',
    'Everything in Core': 'Todo lo de Core',
    'Live onboarding session': 'Sesión de onboarding en vivo',
    'Tool connection guidance': 'Guía para conectar herramientas',
    'Core workflow test during onboarding': 'Prueba del flujo Core durante el onboarding',
    'Choose Growth': 'Elegir Growth',
    'DONE-FOR-YOU': 'LLAVE EN MANO',
    'Full implementation': 'Implementación completa',
    'White-Glove': 'White-Glove',
    'Installed, connected, tested, and handed over ready to run.':
      'Instalado, conectado, probado y entregado listo para operar.',
    'Everything in Growth': 'Todo lo de Growth',
    'Full environment setup': 'Configuración completa del entorno',
    'Past-performance library integration': 'Integración con la biblioteca de desempeño pasado',
    'Workflow configuration & test': 'Configuración y prueba del flujo de trabajo',
    'Handover session': 'Sesión de entrega',
    'Get White-Glove': 'Obtener White-Glove',

    'Analyze one opportunity': 'Analizar una oportunidad',
    'View sample SourceDeck': 'Ver SourceDeck de muestra',
    'Your private credentials stay under your control. AI outputs require human review. No false certification claims.':
      'Tus credenciales privadas permanecen bajo tu control. Las salidas de IA requieren revisión humana. Sin reclamos falsos de certificación.',
    'Security & trust': 'Seguridad y confianza',

    // ============================================================
    // /app/ — access-controlled landing
    // ============================================================
    'Access by request': 'Acceso bajo solicitud',
    'SourceDeck is access-controlled.': 'SourceDeck es de acceso controlado.',
    'There is no public demo, no self-serve sign-up, and no public download. To learn what SourceDeck does or to request access for your team, contact us directly.':
      'No hay demo público, registro autoservicio ni descarga pública. Para conocer lo que hace SourceDeck o solicitar acceso para tu equipo, contáctanos directamente.',
    'We respond within one business day.': 'Respondemos en un día hábil.',
    'What this means': 'Qué significa esto',
    'Public visitors can read what SourceDeck does in our marketing pages, security page, and enterprise page.':
      'Los visitantes públicos pueden leer lo que hace SourceDeck en nuestras páginas de marketing, seguridad y enterprise.',
    'Agents, integrations, and workflows are described in our catalog but are not enabled for public visitors.':
      'Los agentes, integraciones y flujos de trabajo se describen en nuestro catálogo, pero no están habilitados para visitantes públicos.',
    'Demo workspaces, downloads, and trial accounts are issued only after a contact conversation.':
      'Los espacios de demostración, descargas y cuentas de prueba se otorgan únicamente después de una conversación de contacto.',
    'To request access, email': 'Para solicitar acceso, escribe a',
    'contact sales': 'contactar ventas',

    // ============================================================
    // ONBOARDING (5-step wizard)
    // ============================================================
    'Workspace setup': 'Configuración del espacio de trabajo',
    'Let\'s build your operator workspace.': 'Construyamos tu espacio de trabajo de operador.',
    'Five short steps. Every key stays local to your workspace. Takes about 4 minutes.':
      'Cinco pasos cortos. Cada clave permanece local a tu espacio de trabajo. Toma cerca de 4 minutos.',
    'Step 01 — Account verified': 'Paso 01 — Cuenta verificada',
    'Payment received. Workspace reserved.': 'Pago recibido. Espacio de trabajo reservado.',
    'Your Stripe checkout succeeded. A magic link has been sent to your billing email — open it to activate this workspace on every device. You can continue the setup here in the meantime.':
      'Tu pago en Stripe se completó. Se envió un enlace mágico a tu correo de facturación — ábrelo para activar este espacio de trabajo en todos tus dispositivos. Puedes continuar la configuración aquí mientras tanto.',
    'Step 02 — Workspace basics': 'Paso 02 — Datos básicos del espacio',
    'Name this workspace.': 'Nombra este espacio de trabajo.',
    'Workspaces are isolated. Each workspace keeps its own keys, leads, campaigns, and analytics — never shared with another tenant.':
      'Los espacios de trabajo están aislados. Cada uno mantiene sus propias claves, leads, campañas y analíticas — nunca se comparten con otro tenant.',
    'Workspace name': 'Nombre del espacio de trabajo',
    'Acme Operations': 'Acme Operations',
    'Your role': 'Tu rol',
    'Founder / CEO': 'Fundador / CEO',
    'Ops Lead': 'Líder de operaciones',
    'BD / Sales': 'BD / Ventas',
    'RevOps': 'RevOps',
    'Other': 'Otro',
    'Industry focus': 'Enfoque de industria',
    'Professional Services': 'Servicios profesionales',
    'Home Services': 'Servicios para el hogar',
    'Team size': 'Tamaño del equipo',
    '2–5': '2–5',
    '6–25': '6–25',
    '26–100': '26–100',
    '100+': '100+',
    'Continue →': 'Continuar →',
    'Step 03 — API keys & integrations': 'Paso 03 — Claves API e integraciones',
    'Bring your own keys. We never ship defaults.':
      'Trae tus propias claves. Nunca enviamos valores por defecto.',
    'SourceDeck is BYOK — you connect your own Airtable, Instantly, and optional enrichment providers. Keys are stored in your browser\'s workspace and never transmitted except as part of an outbound integration call.':
      'SourceDeck es BYOK — tú conectas tus propias claves de Airtable, Instantly y proveedores opcionales de enriquecimiento. Las claves se almacenan en el espacio de trabajo de tu navegador y nunca se transmiten salvo como parte de una llamada saliente de integración.',
    'Step 04 — Lead criteria': 'Paso 04 — Criterios de leads',
    'Tell SourceDeck who counts.': 'Dile a SourceDeck quién cuenta.',
    'Set NAICS / industry tags, target geography, and exclusion rules. The discovery engine enforces these on every run.':
      'Define etiquetas de NAICS / industria, geografía objetivo y reglas de exclusión. El motor de descubrimiento las aplica en cada ejecución.',
    'Step 05 — First campaign': 'Paso 05 — Primera campaña',
    'Launch with the default 4-step diagnosis sequence.':
      'Lanza con la secuencia de diagnóstico de 4 pasos por defecto.',
    'The factory sequence (Diagnosis Hook → Problem Exposure → Visual + System Intro → Pricing + Close) ships pre-loaded. You can edit any step before activating.':
      'La secuencia de fábrica (Gancho de diagnóstico → Exposición del problema → Visual + Introducción al sistema → Precios + Cierre) viene precargada. Puedes editar cualquier paso antes de activarla.',

    // ============================================================
    // COMMON BUTTONS / CTAs / EYEBROWS
    // ============================================================
    'Sign in': 'Iniciar sesión',
    'Sign up': 'Registrarse',
    'Log in': 'Iniciar sesión',
    'Log out': 'Cerrar sesión',
    'Continue': 'Continuar',
    'Back': 'Atrás',
    'Next': 'Siguiente',
    'Cancel': 'Cancelar',
    'Save': 'Guardar',
    'Submit': 'Enviar',
    'Send': 'Enviar',
    'Done': 'Listo',
    'Close': 'Cerrar',
    'Open': 'Abrir',
    'Edit': 'Editar',
    'Delete': 'Eliminar',
    'Remove': 'Quitar',
    'Connect': 'Conectar',
    'Disconnect': 'Desconectar',
    'Reconnect': 'Reconectar',
    'Try again': 'Intentar de nuevo',
    'Learn more': 'Aprender más',
    'Read more': 'Leer más',
    'See all': 'Ver todo',
    'View all': 'Ver todo',
    'Search': 'Buscar',
    'Filter': 'Filtrar',
    'Sort': 'Ordenar',
    'Loading…': 'Cargando…',
    'Loading...': 'Cargando…',
    'Coming soon': 'Próximamente',
    'New': 'Nuevo',
    'Beta': 'Beta',
    'Active': 'Activo',
    'Inactive': 'Inactivo',
    'Enabled': 'Habilitado',
    'Disabled': 'Deshabilitado',
    'Yes': 'Sí',
    'No': 'No',
    'OK': 'OK',
    'Required': 'Requerido',
    'Optional': 'Opcional',
    'Name': 'Nombre',
    'Email': 'Correo',
    'Phone': 'Teléfono',
    'Company': 'Empresa',
    'Website': 'Sitio web',
    'Address': 'Dirección',
    'Country': 'País',
    'Notes': 'Notas',
    'Status': 'Estado',
    'Description': 'Descripción',
    'Title': 'Título',
    'Date': 'Fecha',
    'Time': 'Hora',
    'Today': 'Hoy',
    'Yesterday': 'Ayer',
    'Tomorrow': 'Mañana',

    // ============================================================
    // STATUS PILLS
    // ============================================================
    'Healthy': 'Saludable',
    'Warning': 'Advertencia',
    'Blocked': 'Bloqueado',
    'Failed': 'Falló',
    'Waiting on client': 'Esperando al cliente',
    'Waiting on internal': 'Esperando internamente',
    'Automated': 'Automatizado',
    'Manual': 'Manual',
    'Approved': 'Aprobado',
    'Escalated': 'Escalado',

    // ============================================================
    // REQUEST ACCESS / SALES FORMS — recurring strings
    // ============================================================
    'Tell us about your team': 'Cuéntanos sobre tu equipo',
    'Tell us what you want SourceDeck to do': 'Cuéntanos qué quieres que haga SourceDeck',
    'Full name': 'Nombre completo',
    'Work email': 'Correo de trabajo',
    'Company name': 'Nombre de la empresa',
    'Industry': 'Industria',
    'How can we help?': '¿Cómo podemos ayudarte?',
    'Send request': 'Enviar solicitud',
    'Thanks — we\'ll be in touch.': 'Gracias — nos pondremos en contacto.',
    'Thank you': 'Gracias',
    'Thanks!': '¡Gracias!',

    // ============================================================
    // THANKS PAGE
    // ============================================================
    'Thanks for your purchase': 'Gracias por tu compra',
    'Check your email for the next steps.': 'Revisa tu correo para los próximos pasos.',
    'Go to onboarding': 'Ir al onboarding',

    // ============================================================
    // 404 / ERROR / EMPTY STATES
    // ============================================================
    'Page not found': 'Página no encontrada',
    '404': '404',
    'The page you\'re looking for doesn\'t exist.': 'La página que buscas no existe.',
    'Back to home': 'Volver al inicio',
    'Go home': 'Ir al inicio',
    'Something went wrong.': 'Algo salió mal.',
    'No results': 'Sin resultados',
    'No data yet.': 'Aún no hay datos.',

    // ============================================================
    // SECURITY / COMPLIANCE / FEDERAL — common phrases
    // ============================================================
    'Security and trust': 'Seguridad y confianza',
    'Security & trust': 'Seguridad y confianza',
    'How we handle your data': 'Cómo manejamos tus datos',
    'Data residency': 'Residencia de datos',
    'Encryption': 'Cifrado',
    'Access control': 'Control de acceso',
    'Backups': 'Respaldos',
    'Compliance': 'Cumplimiento',
    'Disclosures': 'Divulgaciones',
    'No false certification claims.': 'Sin reclamos falsos de certificación.',
    'Human review required for AI outputs.': 'Se requiere revisión humana de las salidas de IA.',

    // ============================================================
    // INTEGRATIONS / AGENTS / WEBHOOKS — common labels
    // ============================================================
    'Available integrations': 'Integraciones disponibles',
    'Available agents': 'Agentes disponibles',
    'Connect a tool': 'Conectar una herramienta',
    'Connector': 'Conector',
    'Trigger': 'Disparador',
    'Action': 'Acción',
    'Events': 'Eventos',
    'Webhook URL': 'URL del webhook',
    'Test event': 'Evento de prueba',

    // ============================================================
    // SETTINGS — common labels
    // ============================================================
    'Settings': 'Configuración',
    'Workspace': 'Espacio de trabajo',
    'Profile': 'Perfil',
    'Account': 'Cuenta',
    'Billing': 'Facturación',
    'Team members': 'Miembros del equipo',
    'Invite teammate': 'Invitar a un compañero',
    'Calendar': 'Calendario',
    'Calendar connections': 'Conexiones de calendario',
    'Calendar (Google · Microsoft · ICS)': 'Calendario (Google · Microsoft · ICS)',
    'Connect Google Calendar': 'Conectar Google Calendar',
    'Connect Microsoft 365': 'Conectar Microsoft 365',
    'Add ICS feed': 'Agregar feed ICS',
    'AI provider': 'Proveedor de IA',
    'Lead generator': 'Generador de leads',

    // ============================================================
    // SECTION HEADINGS — common eyebrows
    // ============================================================
    'Overview': 'Resumen',
    'How it works': 'Cómo funciona',
    'Features': 'Funcionalidades',
    'Capabilities': 'Capacidades',
    'Workflow': 'Flujo de trabajo',
    'Use cases': 'Casos de uso',
    'FAQ': 'Preguntas frecuentes',
    'Frequently asked questions': 'Preguntas frecuentes',
    'Compare plans': 'Comparar planes',
    'What\'s included': 'Qué incluye',
    'Get in touch': 'Ponte en contacto',
    'Contact us': 'Contáctanos',
    'About': 'Acerca de',
    'Changelog': 'Registro de cambios',

    // ============================================================
    // ALT TEXT (image alt attributes recurring on every page)
    // ============================================================
    'SourceDeck': 'SourceDeck',
    'SourceDeck logo': 'Logotipo de SourceDeck'
  };
})();
