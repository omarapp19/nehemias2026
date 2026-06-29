# Despliegue en un VPS de Hostinger — paso a paso

Esta guía te lleva **desde cero**: comprar el VPS, blindar el servidor, instalar Docker, apuntar
el dominio, levantar Nehemías con HTTPS y dejar respaldos automáticos. No necesitas experiencia
previa; copia y pega los comandos en orden.

> Convención: cuando veas `midominio.org`, reemplázalo por tu dominio real. Cuando veas
> `TU_IP`, por la IP de tu VPS.

---

## Paso 0 · Comprar el VPS y el dominio

1. En **hostinger.com → VPS**, contrata un plan **KVM 2** (2 vCPU, 8 GB RAM) — suficiente y
   holgado. El **KVM 1** (1 vCPU, 4 GB) también funciona si el presupuesto es ajustado.
2. Sistema operativo: elige **Ubuntu 24.04 LTS** (plantilla limpia, sin panel).
3. Compra un **dominio** (en Hostinger o donde prefieras). Anota la **IP** del VPS (la ves en el
   panel de Hostinger, sección VPS).
4. En el panel de Hostinger, durante la creación, agrega tu **clave SSH pública** si ya tienes
   una. Si no, el Paso 1 te enseña a crearla.

---

## Paso 1 · Primer acceso y usuario seguro

Desde **tu computadora** (no el servidor). Si no tienes clave SSH, créala:

```bash
ssh-keygen -t ed25519 -C "nehemias"      # Enter a todo; crea ~/.ssh/id_ed25519(.pub)
```

Entra como root (Hostinger te da la contraseña inicial por correo/panel):

```bash
ssh root@TU_IP
```

Ya dentro del servidor, crea un usuario con permisos de administrador (no usaremos root a diario):

```bash
adduser nehemias                 # te pedirá una contraseña; guárdala
usermod -aG sudo nehemias        # le da permisos de sudo
```

Copia tu clave SSH al nuevo usuario:

```bash
mkdir -p /home/nehemias/.ssh
cp ~/.ssh/authorized_keys /home/nehemias/.ssh/ 2>/dev/null || true
# Si no existía, pega tu clave pública manualmente:
#   nano /home/nehemias/.ssh/authorized_keys   (pega el contenido de tu id_ed25519.pub)
chown -R nehemias:nehemias /home/nehemias/.ssh
chmod 700 /home/nehemias/.ssh && chmod 600 /home/nehemias/.ssh/authorized_keys
```

Prueba en **otra terminal** (sin cerrar la actual) que puedes entrar como el nuevo usuario:

```bash
ssh nehemias@TU_IP
```

Cuando confirmes que entra, **blinda el acceso SSH**. Edita la config:

```bash
sudo nano /etc/ssh/sshd_config
```

Asegúrate de tener estas líneas (cámbialas o agrégalas):

```
PermitRootLogin no
PasswordAuthentication no
```

Reinicia SSH:

```bash
sudo systemctl restart ssh
```

A partir de aquí entras siempre como `ssh nehemias@TU_IP`.

---

## Paso 2 · Blindaje del servidor

Actualiza el sistema e instala el cortafuegos y protección contra fuerza bruta:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ufw fail2ban unattended-upgrades
```

**Cortafuegos** — abre solo lo necesario (SSH, HTTP, HTTPS):

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable          # responde "y"
sudo ufw status
```

**fail2ban** (banea IPs que intentan adivinar la contraseña SSH) ya queda activo por defecto:

```bash
sudo systemctl enable --now fail2ban
```

**Actualizaciones de seguridad automáticas:**

```bash
sudo dpkg-reconfigure -plow unattended-upgrades   # elige "Yes"
```

(Opcional pero recomendado en planes de 4 GB) **memoria swap** de 2 GB:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## Paso 3 · Instalar Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker nehemias        # usar docker sin sudo
```

Cierra la sesión y vuelve a entrar (`exit` y `ssh nehemias@TU_IP`) para que el grupo `docker`
tome efecto. Verifica:

```bash
docker --version && docker compose version
```

---

## Paso 4 · Apuntar el dominio (DNS)

En tu proveedor de dominio (Hostinger: **Dominios → DNS / Nameservers**), crea estos registros
**A** apuntando a `TU_IP`:

| Tipo | Nombre | Valor   |
|------|--------|---------|
| A    | `@`    | TU_IP   |
| A    | `www`  | TU_IP   |
| A    | `api`  | TU_IP   |

`api.midominio.org` servirá la API; `midominio.org` y `www`, el sitio. La propagación tarda de
minutos a un par de horas. Verifica con `ping midominio.org`.

---

## Paso 5 · Traer el proyecto y configurarlo

```bash
sudo apt install -y git
cd ~ && git clone <URL_DE_TU_REPOSITORIO> nehemias
cd nehemias
cp .env.example .env
nano .env
```

Rellena el `.env` para producción (lo más importante):

```dotenv
POSTGRES_USER=nehemias
POSTGRES_PASSWORD=<una_clave_larga_y_aleatoria>
POSTGRES_DB=nehemias

# Genera el secreto con:  openssl rand -hex 48
JWT_SECRET=<secreto_largo_aleatorio>

# Dominios (con HTTPS, según el Paso 6)
WEB_ORIGIN=https://midominio.org
NEXT_PUBLIC_API_URL=https://api.midominio.org
COOKIE_DOMAIN=.midominio.org

# Admin inicial (lo crea el seed)
SEED_ADMIN_EMAIL=admin@midominio.org
SEED_ADMIN_PASSWORD=<clave_admin_segura>
SEED_ADMIN_NAME=Coordinación Nehemías
```

Levanta todo (la primera vez compila las imágenes; tarda unos minutos):

```bash
docker compose up -d --build
docker compose ps          # los 3 servicios deben estar "Up"/"healthy"
docker compose logs -f api # verás "Aplicando migraciones..." y luego "escuchando"
```

Las migraciones se aplican solas al arrancar el API, y el **administrador inicial se crea
automáticamente** con `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` del `.env` (entrarás al panel
con esas credenciales en `https://midominio.org/admin/login`). El sistema arranca **vacío**, listo
para cargar la información real desde el panel.

En este punto, `web` escucha en `127.0.0.1:3000` y `api` en `127.0.0.1:4000` (solo localhost).
Falta exponerlos al mundo con Nginx + HTTPS.

---

## Paso 6 · Nginx como proxy inverso + HTTPS (Let's Encrypt)

Instala Nginx y Certbot:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Crea la configuración del sitio:

```bash
sudo nano /etc/nginx/sites-available/nehemias
```

Pega esto (reemplaza el dominio):

```nginx
# Sitio público (Next.js)
server {
    server_name midominio.org www.midominio.org;
    client_max_body_size 12M;   # permite subir fotos/facturas

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

# API (Express)
server {
    server_name api.midominio.org;
    client_max_body_size 12M;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Activa el sitio y recarga Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/nehemias /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

Pide los certificados TLS (Certbot configura HTTPS y la redirección automática):

```bash
sudo certbot --nginx -d midominio.org -d www.midominio.org -d api.midominio.org
```

Elige “redirigir HTTP a HTTPS”. La renovación es automática; pruébala con:

```bash
sudo certbot renew --dry-run
```

Listo: tu sitio está en `https://midominio.org` y la API en `https://api.midominio.org`.

> Si cambiaste `NEXT_PUBLIC_API_URL` en el `.env` **después** de construir la web, reconstruye:
> `docker compose up -d --build web` (esa URL se incrusta en el navegador en tiempo de build).

---

## Paso 7 · Respaldos (no te saltes esto)

Los datos viven en dos volúmenes Docker: la base (`db_data`) y los archivos subidos
(`uploads_data`). Respáldalos a diario.

Crea el script de respaldo:

```bash
mkdir -p ~/backups
nano ~/backup-nehemias.sh
```

Contenido:

```bash
#!/bin/sh
set -e
DIR=~/backups
STAMP=$(date +%F)
cd ~/nehemias
# Base de datos
docker compose exec -T db pg_dump -U nehemias nehemias | gzip > "$DIR/db-$STAMP.sql.gz"
# Archivos subidos (facturas, fotos, comprobantes)
docker run --rm -v nehemias_uploads_data:/data -v "$DIR":/backup alpine \
  tar czf "/backup/uploads-$STAMP.tar.gz" -C /data .
# Conserva solo los últimos 14 días
find "$DIR" -name "*.gz" -mtime +14 -delete
```

Hazlo ejecutable y prográmalo todos los días a las 3 AM:

```bash
chmod +x ~/backup-nehemias.sh
crontab -e
# agrega esta línea:
0 3 * * * /home/nehemias/backup-nehemias.sh >> /home/nehemias/backups/backup.log 2>&1
```

**Restaurar** la base (si algún día hace falta):

```bash
gunzip -c ~/backups/db-FECHA.sql.gz | docker compose exec -T db psql -U nehemias -d nehemias
```

---

## Operación diaria

```bash
cd ~/nehemias

# Actualizar a una nueva versión del código
git pull
docker compose up -d --build

# Ver registros
docker compose logs -f api
docker compose logs -f web

# Reiniciar / detener
docker compose restart
docker compose down            # detiene (los datos persisten en los volúmenes)

# Crear otro administrador o cambiar contraseña: vuelve a sembrar con nuevas variables,
# o usa Prisma Studio temporalmente (solo en local, nunca expuesto).
```

## Resolución de problemas

- **502 Bad Gateway** en Nginx → los contenedores aún arrancan o fallaron. Revisa
  `docker compose ps` y `docker compose logs api`.
- **La web no muestra datos** → revisa que `API_INTERNAL_URL=http://api:4000` (interno) y que
  `NEXT_PUBLIC_API_URL` apunte al dominio público de la API con HTTPS.
- **No puedo iniciar sesión en el admin** → la cookie necesita `COOKIE_DOMAIN=.midominio.org` y
  que web y api compartan dominio raíz, ambos por HTTPS.
- **Las imágenes no cargan** → confirma que `api.midominio.org` responde por HTTPS y que el
  `client_max_body_size` de Nginx permite el tamaño de subida.
```
