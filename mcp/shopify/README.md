# Shopify: una tienda por entrada

El conector oficial de Shopify sostiene una sola tienda a la vez. Con varias tiendas de clientes,
eso es un `switch-shop` que tarde o temprano se olvida. Aquí cada tienda es su propio servidor.

```bash
mkdir -p ~/.config/shopify-mcp && cd ~/.config/shopify-mcp
cp /ruta/al/repo/mcp/shopify/{run.sh,add-store.py,package.json} .
npm install                                   # trae shopify-mcp
python3 add-store.py mi-tienda                # pide dominio y token, prueba el token, registra shopify-mi-tienda
```

El token es el **Admin API access token** de una app privada de la tienda (`shpat_…`): admin →
Configuración → Apps y canales de venta → Desarrollar apps → Crear una app → Configurar Admin API
→ scopes `read_/write_` de products, customers y orders → Instalar app. Se muestra una sola vez.
Pertenece a la **tienda**, no a tu cuenta, así que sigue funcionando aunque te quiten de staff.

`add-store.py` lo lee a ciegas (no queda en el historial), lo prueba contra GraphQL Admin, lo
guarda en `env.<perfil>` con permisos 600 y registra el servidor. `run.sh` lo pasa por variable
de entorno, nunca como argumento, para que no aparezca en `ps`.

**Trampa de GraphQL:** al escribir contenido con acentos (blogs, descripciones) usa block strings
(`"""…"""`) en la mutación; los strings normales corrompen los acentos.
