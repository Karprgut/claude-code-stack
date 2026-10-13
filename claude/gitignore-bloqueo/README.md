# `.gitignore` por bloqueo, no por lista

Un `.gitignore` normal enumera lo prohibido. Falla con el primer nombre que nadie anticipó.
Dos fugas el mismo día me lo enseñaron:

- El patrón `.env*` no atrapó un archivo llamado `Copia de .env.local.bak` con 45 credenciales
  de clientes, porque el nombre no empieza con `.env`.
- El patrón `data/*.db` no atrapó `adintel.db.bak-20260918-153005`, porque no termina en `.db`.

El `.gitignore` de [gitignore.ejemplo](gitignore.ejemplo) está escrito **al revés**: bloquea todo
con `/*` y luego abre excepciones una por una. Lo nuevo queda fuera hasta que alguien decida lo
contrario. **Si agregas algo y no aparece en `git status`, el `.gitignore` está haciendo su
trabajo.** Ábrelo explícitamente si de verdad debe versionarse.

Es el `.gitignore` con el que respaldo `~/.claude/` en un repo privado: abre solo `skills/`,
`CLAUDE.md`, `README.md` y `projects/*/memory/`. Transcripciones, sesiones, cachés de auth y
snapshots de shell quedan fuera por construcción.

```bash
cd ~/.claude
cp /ruta/a/gitignore.ejemplo .gitignore
git init && git add -A && git status      # revisa que solo entre lo esperado
git commit -m "Respaldo de skills y memorias"
gh repo create <tu-usuario>/claude-skills-memorias --private --source . --push
```

El mismo patrón está en el `.gitignore` de este repo.
