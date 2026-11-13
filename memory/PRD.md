# TUACARIGUA.COM – PRD

## Original problem
Portal web marketplace para la marca TUACARIGUA.COM (logo adjunto): venta de inmuebles (casas, apartamentos, terrenos), vehículos, motos y otros objetos. Panel administrativo en otra URL; solo el administrador publica (fotos, descripciones). Portal público: botón "Preguntar" abre WhatsApp con link al anuncio.

## User choices
- WhatsApp: +584245245770
- Moneda: USD o Bs, el admin elige por anuncio
- Sin login para el público; solo admin
- Extras: buscador/filtros (precio, zona, tipo), destacados en portada, marcar como VENDIDO

## Architecture
- FastAPI + MongoDB (listings, users, files, login_attempts); JWT Bearer admin auth (bcrypt, lockout 5 intentos/15 min por email)
- Emergent Object Storage para fotos, servidas por /api/files/{path}
- React (react-query, shadcn). Rutas: /, /buscar, /anuncio/:id, /admin (login), /admin/panel

## Implemented (2026-06)
- Home: hero con buscador, categorías, destacados, recientes
- Búsqueda con filtros (categoría, tipo, zona, moneda, precio mín/máx, texto, ocultar vendidos, orden)
- Detalle: galería, specs, WhatsApp con mensaje + link del anuncio, copiar enlace, aviso VENDIDO
- Admin: login, estadísticas, CRUD con subida múltiple de fotos/portada, toggles destacado/vendido, pestañas, búsqueda
- 9 anuncios de ejemplo (marcados "(Ejemplo)")

## Backlog
- P1: tasa de cambio USD/Bs para mostrar equivalente; contador de visitas
- P1: SEO/Open Graph previews para links compartidos en WhatsApp
- P2: alquiler vs venta; mapa de ubicación; marcar archivos borrados al eliminar anuncio
