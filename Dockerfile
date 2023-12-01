FROM caddy

COPY Caddyfile /etc/caddy
COPY . /usr/share/caddy