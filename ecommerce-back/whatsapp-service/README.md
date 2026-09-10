# Servicio de WhatsApp (Baileys)

Microservicio Node que envía el aviso de WhatsApp cuando un cliente crea una
cotización/pedido desde el checkout. Laravel nunca habla con WhatsApp
directamente: le pasa el mensaje a este servicio por HTTP en `127.0.0.1`.

Réplica del mismo mecanismo que ya usa el proyecto `bautista`
(`whatsapp-service/`), adaptado a este proyecto.

## Cómo funciona

```
Cliente confirma el checkout (cotización + pedido)
  → CotizacionesController::crearCotizacionEcommerce guarda todo y responde al instante
  → encola NotificarCotizacionCreadaWhatsApp
  → el worker de colas arma el mensaje con la plantilla configurable
  → POST a este servicio
  → cola interna: 1 mensaje cada 4 segundos
```

El delay entre mensajes es deliberado. Baileys usa la API no oficial de
WhatsApp, y enviar en ráfaga es lo que dispara los bloqueos de número.

## Instalación en el servidor

```bash
cd /var/www/html/ecommerce-back/whatsapp-service
npm install --omit=dev
cp .env.example .env
# Genera un token y pégalo en WHATSAPP_TOKEN (acá y en el .env de Laravel, tienen que coincidir):
openssl rand -hex 32
```

Instala el daemon para que arranque solo y se reinicie si se cae:

```bash
cp ecommerce-whatsapp.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now ecommerce-whatsapp
```

Verifica:

```bash
systemctl status ecommerce-whatsapp
curl -s http://127.0.0.1:3334/estado
```

## Vincular el teléfono

Se hace desde el panel (**Configuración → WhatsApp**, si ya está armada esa
pantalla en el frontend) o, mientras tanto, directo con curl:

```bash
curl -s http://127.0.0.1:3334/estado
```

El QR sale también en el log del servicio (`journalctl -u ecommerce-whatsapp -f`
o el archivo `/var/log/ecommerce-whatsapp.log`) para escanearlo ahí si no hay
pantalla en el panel todavía. Se escanea desde el celular de la tienda en
*WhatsApp → Dispositivos vinculados*. La sesión queda guardada en
`auth_info/` y sobrevive a los reinicios; solo hay que repetirlo si alguien
cierra la sesión desde el teléfono.

## El worker de Laravel

Sin worker los avisos se encolan y nunca salen, y como el checkout responde
igual, el fallo pasa desapercibido. **Antes de instalar `ecommerce-queue.service`,
revisa si este servidor ya tiene un worker de colas corriendo** para
ecommerce-back (`systemctl list-units | grep -i queue`, o revisa si hay algo
en supervisor/cron) — instalar dos duplicaría el envío de cada mensaje.

Si no hay ninguno:

```bash
cp ecommerce-queue.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now ecommerce-queue
```

## Después de cada despliegue

```bash
php artisan migrate --force
php artisan db:seed --class=PlantillasNotificacionSeeder --force
php artisan optimize:clear
systemctl restart ecommerce-whatsapp ecommerce-queue
```

## Endpoints

| Método | Ruta | Uso |
|---|---|---|
| GET | `/estado` | Estado de conexión, QR y tamaño de la cola. Sin token |
| POST | `/enviar` | `{telefono, mensaje}`. Requiere `X-Token` |
| POST | `/desvincular` | Cierra sesión y fuerza un QR nuevo. Requiere `X-Token` |

## Variables

| Variable | Descripción |
|---|---|
| `WHATSAPP_PORT` | Puerto local (3334) |
| `WHATSAPP_TOKEN` | Debe coincidir con el `WHATSAPP_TOKEN` del `.env` de Laravel |
| `WHATSAPP_DELAY_MS` | Pausa entre mensajes (4000). No lo bajes |

## Si deja de enviar

1. `systemctl status ecommerce-whatsapp` — ¿está corriendo?
2. `curl -s http://127.0.0.1:3334/estado` — ¿dice `"estado":"conectado"`?
3. `tail -f /var/log/ecommerce-whatsapp.log` — `[ok]` o `[error]` por mensaje
4. `php artisan queue:failed` — jobs que fallaron

Si el estado quedó en "desconectado" y no vuelve solo, lo más probable es
que hayan cerrado la sesión desde el teléfono: hay que escanear otra vez.
