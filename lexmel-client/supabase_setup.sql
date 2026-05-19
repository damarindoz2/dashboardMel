create table milestones (
  id            serial primary key,
  codigo        text not null,
  nombre        text not null,
  fecha_inicio  date,
  fecha_fin     date,
  estado        text default 'Sin iniciar',
  pago          integer default 0,
  semanas       integer,
  objetivo      text,
  entregables   text
);

insert into milestones (codigo, nombre, fecha_inicio, fecha_fin, estado, pago, semanas, objetivo, entregables) values
('M1',  'Análisis y Diseño',                        '2026-01-19', '2026-03-24', 'Entregado',   5,  9, 'Definir y estructurar los requerimientos funcionales y técnicos mediante el ERS, modelo de datos, mapa de sitio, wireframes y diseño final de interfaz. Establecer la base conceptual y visual del sistema.', 'Diseño UI Final, ERS, Mapa de sitio, Modelo de datos, Wireframes'),
('M2',  'Base de Plataforma',                       '2026-03-25', '2026-04-24', 'Completado',  10, 4, 'Construir la base técnica del sistema: acceso, usuarios, permisos, seguridad y elementos iniciales que habilitan el uso del resto de módulos.', 'Login/SSO, Layout, Usuarios, Roles y permisos, Catálogos, Despacho, Sedes'),
('M3',  'Clientes y Tareas',                        '2026-04-27', '2026-05-15', 'Completado',  5,  3, 'Implementar el sistema documental fundamental para toda la plataforma.', 'Clientes, Tareas, Agenda'),
('M4',  'Métricas, Archivos y Garantías',           '2026-05-18', '2026-06-05', 'En progreso', 10, 3, 'Desarrollar módulos transversales del sistema, necesarios también en la función Crear Juicio.', 'Archivos, Garantías, Subgarantías, Métricas'),
('M5',  'Domicilios, Juicios y Bitácora',           '2026-06-08', '2026-07-10', 'Sin iniciar', 20, 5, 'Implementar los dos componentes faltantes para la creación de un juicio. Desarrollar todo el ciclo de vida de un juicio.', 'Domicilios, Bitácora de avances, Juicio'),
('M6',  'Alertas, Recordatorios y Notificaciones',  '2026-07-13', '2026-08-07', 'Sin iniciar', 10, 4, 'Crear los módulos para informar al usuario de las acciones del sistema.', 'Recordatorios, Notificaciones, Alertas, Notificaciones por correo'),
('M7',  'Visualización, Cartera y Timeline',  '2026-08-10', '2026-09-04', 'Sin iniciar', 15, 4, 'Integrar funciones complementarias y globales para completar la plataforma.', 'Dashboard de widgets, Cartera, Timeline de juicio, Comentarios del juicio'),
('M8',  'MBI 1.0',                                 '2026-09-07', '2026-10-09', 'Sin iniciar', 10, 5, 'Módulos adicionales al sistema para complementar el funcionamiento del MVP.', 'Chat, Solicitudes de cambio, Dictámenes, Formato de dictamen'),
('M9',  'Búsqueda, Importaciones y Papelera',       '2026-10-12', '2026-10-30', 'Sin iniciar', 5,  3, 'Implementar búsqueda global en el sistema y funcionalidades para importar datos en juicios.', 'Importar juicios, Búsqueda global, Filtros, Papelera, Comentarios en documentos'),
('M10', 'QA, Capacitación y Despliegue',            '2026-11-03', '2026-11-27', 'Sin iniciar', 5,  4, 'Asegurar la calidad final, corregir defectos, capacitar usuarios y desplegar el sistema.', 'QA completo, Correcciones, Despliegue, Capacitación 1:1, Documentación final');

alter table milestones enable row level security;
create policy "Lectura pública" on milestones for select using (true);
