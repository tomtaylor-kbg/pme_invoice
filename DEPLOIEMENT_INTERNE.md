1. Installe Docker Desktop avec le moteur WSL 2, démarre-le, puis ouvre PowerShell. Guide Docker Desktop pour Windows
  2. Récupère le commit poussé et place-toi dans le dépôt :

     cd chemin\vers\facturation
     git pull origin master

  3. À la racine du dépôt, crée un fichier .env avec tes propres identifiants :

     POSTGRES_PASSWORD=mot_de_passe_base_long_et_unique
     APP_USERNAME=admin
     APP_PASSWORD=mot_de_passe_admin_long_et_unique
     NODE_ENV=production

     Garde ce fichier privé et ne le pousse pas sur GitHub. Il configure le compte bootstrap et le mot de passe de PostgreSQL.

  4. Démarre l’application :

     docker compose up --build -d

     Le backend applique les migrations au démarrage. Compose construit les images puis démarre les services. Référence docker compose up

  5. Vérifie leur état, puis ouvre http://localhost:5173 :

     docker compose ps

  Pour une mise à jour ultérieure, lance git pull origin master, puis docker compose up --build -d. Pour arrêter les services sans supprimer les données, utilise
  docker compose stop — évite docker compose down -v, qui supprimerait le volume de la base.

  Limite de cette configuration : le frontend tourne avec le serveur de développement Vite et les ports sont liés à localhost. Cela convient pour tester
  l’application sur ce PC; ce n’est pas une configuration de production accessible aux autres postes ou depuis Internet.


---------------------------------------------------------------------------------------------------

Pour que les autres postes du réseau interne accèdent à l’application, il faut publier le port du frontend sur le réseau. Aujourd’hui, docker-compose.yml le lie à
  127.0.0.1, donc seul le PC Windows peut y accéder.

  Sur le PC Windows qui héberge Docker :

  1. Dans docker-compose.yml, remplace le port du frontend :

     - "127.0.0.1:${FRONTEND_PORT:-5173}:5173"

     par :

     - "${FRONTEND_PORT:-5173}:5173"

     L’API et PostgreSQL peuvent rester liés à 127.0.0.1 : le frontend transmet déjà ses requêtes à l’API via Docker.

  2. Dans PowerShell en administrateur, autorise le port 5173 depuis le sous-réseau local :

     New-NetFirewallRule -DisplayName "Facturation interne" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5173 -RemoteAddress LocalSubnet -Profile
     Private,Domain

     Restreindre la règle au réseau local évite d’ouvrir l’accès à tous les réseaux. Docker publie un port sur les interfaces réseau lorsqu’aucune adresse d’hôte
     n’est précisée; il faut donc limiter l’accès au réseau interne. Documentation Docker sur les ports publiés · Règles du pare-feu Windows

  3. Relance la stack depuis le dossier du projet :

     docker compose up -d

  4. Sur chaque autre poste du réseau, ouvre http://ADRESSE-IP-DU-PC-HOTE:5173. L’adresse IP du PC hôte se trouve avec ipconfig.



-------------


• J’ai ajouté une configuration de production séparée du mode développement :

  - Le frontend est compilé puis servi par Nginx, qui transmet /api au backend.
  - PostgreSQL et l’API ne publient pas de ports sur le réseau.
  - Seul le frontend est exposé, sur le port 8080 par défaut. Nginx sert le build; vite preview n’est pas utilisé comme serveur de production. Guide Vite

  Sur le PC Windows hôte, crée un fichier .env à la racine avec les mots de passe de production et l’adresse LAN réservée du PC, puis lance :

  docker compose -f docker-compose.production.yml up --build -d

  L’application sera accessible à http://<IP-LAN-DU-PC>:8080. Configure le pare-feu Windows pour n’autoriser que le sous-réseau interne. Pour un usage durable,
  place-la derrière un proxy HTTPS avec un certificat de l’entreprise. Les instructions détaillées sont dans README.md.

  La configuration Compose a été validée, mais je n’ai pas démarré cette stack de production : elle nécessite les secrets et le PC Windows hôte. Les nouveaux
  fichiers sont encore locaux et devront être commités et poussés avant que Windows puisse les récupérer.
