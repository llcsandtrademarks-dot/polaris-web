# Alta de un prescriptor/afiliado nuevo

Proceso manual (no hay UI de administración — con pocos prescriptores no se justifica).

1. **Negociar condiciones.** Samir/Yadira acuerdan con el creador de contenido el % de descuento al cliente y el % de comisión que Polaris le paga. Es una decisión de negocio, fuera de cualquier sistema.

2. **Crear el Coupon + Promotion Code en Stripe.** En el dashboard de Stripe, crear un Coupon con el % de descuento acordado y un Promotion Code asociado con el texto exacto que usará el creador (ej. `MARIA10`). Este texto es el único lugar donde vive el % de descuento al cliente — Notion nunca lo duplica.

3. **Crear la fila en Notion → base "Prescriptores".**
   - Nombre
   - Email
   - Código corto — debe coincidir **exactamente** (mayúsculas/minúsculas incluidas) con el Promotion Code creado en el paso 2
   - % comisión — el % que Polaris paga al creador (no el % de descuento al cliente)
   - Fecha de alta

4. **Generar el token del portal.** Pídeselo a Claude Code o genéralo con cualquier generador de strings aleatorios seguro (largo, no adivinable — mismo criterio que los tokens de factura). Pégalo en el campo "Token del portal" de la fila creada en el paso 3.

5. **Compartir con el creador dos enlaces:**
   - `https://proyecto-polaris.com/precios-llc.html?presc=MARIA10` — para que lo difunda entre su audiencia
   - `https://proyecto-polaris.com/prescriptor.html?token=xxx` — su portal privado de comisiones (de solo lectura, sin login)

## Cómo se marca una comisión como pagada

Cuando Samir/Yadira pagan una comisión, cambian a mano el campo "Estado" de la fila correspondiente en Notion → base "Comisiones" de `Pendiente` a `Pagada`. El portal del prescriptor lo lee en vivo — no hace falta ninguna otra acción.

## Qué NO es esto

Este programa es independiente del programa de referidos de clientes ($10, `referidos.html`, parámetro `?ref=`). No lo toques al tocar esto ni viceversa.
