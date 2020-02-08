# Résumé

Script opérant une copie des événements et des lieux d'un agenda vers un autre. Une opération de dédoublonnage des lieux est effectuée selon deux critères de similitude:

 * La proximité géographique des lieux
 * La distance levenshtein entre leurs noms

Un identifiant de lieu peut être saisi sur le formulaire d'édition des fiches événements liées depuis l'agenda source pour forcer une opération de dédoublonnage pour les lieux doublons qui n'auraient pas été identifiés automatiquement.

Un email est envoyé en fin d'execution avec une pièce jointe au format csv contenant la liste des lieux synchronisés.

# Lancement

Il faut au préalable installer les dépendences avec la commande suivante:

    yarn

Une série de paramètres de configuration sont nécessaires à la bonne execution du script. Ils sont soit demandés au début de l'execution un à un, soit chargés depuis un fichier json placé à la racine du dossier principal du projet, nommé selon l'environnement de développement: `dev.json` pour un environnement de développement, `prod.json` pour un environnement de production.

Pour un lancement avec chargement par saisie directe sur le terminal:

    yarn start

Pour un lancement en chargeant la configuraton depuis un fichier `prod.json`:

    NODE_ENV=production yarn start

Un exemple de fichier de contenu de fichier de configuration:

    {
      "publicKey": "clépubliquedecompteoa",
      "secretKey": "clésecretedecompteoa",
      "originAgendaUid": 1234,
      "destinationAgendaUid": 5678,
      "extendedFieldsToCopy": "thematique,public-vise,evenement",
      "dedupeDistanceThreshold": 100,
      "dedupeCertaintyThreshold": 80,
      "dedupeSimilarityThreshold": 100,
      "manualLocationIdField": "uniquelocationid",
      "forceLocationUpdates": false,
      "forceEventUpdates": false,
      "logNamespaces": [
        "run",
        "listOAEvents",
        "updateLocationsDb",
        "updateEventsDb",
        "updateDestinationLocations",
        "updateDestinationEvents",
        "extractLocationsFromEvents",
        "Store"
      ],
      "mailgunUser" : "postmaster@mail.yourdomain.com",
      "mailgunPassword" : "pwd1-pwd2-pwd3",
      "reportRecipients" : "email1@domain.com, email2@domain.com, email3@domain.com"
    }

# Dédoublonnage manuel

Si des doublons n'ont pas été identifiés par le script, un dédoublonnage manuel reste possible en partant du dernier rapport d'execution envoyé par email:

 1. Ouvrez le dernier rapport d'execution
 2. Identifiez un doublon qui n'a pas été dédoublonné automatiquement
 3. Pour ce doublon, reperez si un identifiant de dédoublonnage a été déjà été saisi pour ce lieu sur l'avant dernière colonne. Définissez-en un si ce n'est pas le cas - les initiales du lieu par exemple (mcna, tmn, mjjn...)
    Pour chaque ligne à dédoublonner, rendez-vous sur le formulaire accessible via le lien fourni en dernière colonne, précisez-y l'identifiant de dédoublonnage

Le script s'appuyera sur ces identifiants à sa prochaine execution pour effectuer un dédoublonnage.
