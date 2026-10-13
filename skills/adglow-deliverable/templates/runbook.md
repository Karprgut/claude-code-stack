# {{Título del runbook}} — {{Cliente}} × Adglow

Runbook técnico para {{descripción de la sesión / setup}}.
Asume contexto previo. Foco: comandos exactos, no discusión.

**Owner:** {{nombre}}
**Fecha:** {{YYYY-MM-DD}}
**Audiencia:** {{quién ejecuta esto}}

---

## ⚠️ Notas previas (si aplica)

{{Bloque opcional para pivotes de arquitectura, decisiones recientes que cambian el plan, dependencias no obvias.}}

**Hechos de la fuente de datos / sistema:**
- {{Sistema}} — región `{{region}}`
- {{Endpoint / workgroup / cluster}}: `{{nombre}}`
- {{Database / schema}}: `{{nombre}}`
- Auth: {{IAM user, token, key, …}}

---

## State going in ({{fecha + hora}})

- ✅ {{Lo que ya está hecho — paso 1}}
- ✅ {{Paso 2 hecho}}
- ✅ {{Paso 3 hecho}}
- ❌ {{Pendiente — paso A, qué falta}}
- ❌ {{Pendiente — paso B}}
- ❌ {{Pendiente — paso C}}

---

## PART 1 — {{TONIGHT / antes de la call / preparación}} ({{N min}})

### 1.1 — {{Título de la tarea}}

```bash
# {{Comentario corto sobre qué hace el bloque}}
{{comando exacto}}

# Placeholder values — overwrite tomorrow
{{comando con TBD}}

# Verify
{{comando de verificación}}
```

### 1.2 — Pre-call email a {{Cliente}} (enviar {{hoy/ahora}})

> **Asunto:** {{Asunto corto y accionable}}
>
> Hola {{NOMBRE}},
>
> {{Cuerpo corto. Dos secciones: lo crítico para hacer ANTES, lo que cubrimos EN la call.}}
>
> **1. {{Acción crítica antes de la call}}**
>
> {{Explicación + checklist de lo que el cliente debe entregar.}}
>
> - **{{Item 1}}** ({{sugerencia de nombre o valor concreto}})
> - **{{Item 2}}:**
>   - {{Sub-permiso o detalle}}
>   - {{Sub-permiso o detalle}}
> - **{{Item 3}}** — {{canal seguro para entrega}}
>
> **2. En la call exploraremos {{X}}**
>
> {{Lista de queries / comandos / pasos que ejecutaremos juntos.}}
>
> - `{{comando 1}}`
> - `{{comando 2}}`
>
> Si pueden tener al {{rol técnico relevante}} en la call, ideal.
>
> **Agenda ({{60}} min):**
> 1. {{Paso}} ({{5 min}})
> 2. {{Paso}} ({{15 min}})
> 3. {{Paso}} ({{20 min}})
> 4. {{Próximos pasos}} ({{5 min}})
>
> Saludos,
> {{firma}}

---

## PART 2 — {{DURING the call / ejecución}} ({{N min}})

### 2.1 — {{Tarea}}

```bash
{{comando}}
```

**Esperado:** {{qué debe salir}}.
**Si falla:** {{plan B en una línea}}.

### 2.2 — {{Tarea}}

```sql
{{query SQL}}
```

### 2.3 — {{Tarea}}

```python
{{snippet Python}}
```

---

## PART 3 — {{POST call / cierre}} ({{N min}})

### 3.1 — {{Validación final}}

```bash
{{comando de validación}}
```

### 3.2 — Documentar credenciales / accesos creados

Guardar en {{1Password vault / secret scope / lugar acordado}}:

- {{Credencial 1}}
- {{Credencial 2}}
- {{Credencial 3}}

### 3.3 — Enviar handoff a {{cliente / equipo interno}}

> **Asunto:** {{X listo — siguiente paso}}
>
> {{Resumen ejecutivo: qué quedó listo, qué falta, cuándo retomamos.}}

---

## Troubleshooting

### Si {{síntoma 1}}

```bash
{{comando de diagnóstico}}
```

→ {{interpretación + fix}}.

### Si {{síntoma 2}}

→ {{fix en una línea}}.

---

## Referencias

- {{Doc interno o externo}}
- {{Repo path}}
- {{Conversación / decisión previa relevante}}
