# Résumé

Script opérant une copie des événements et des lieux d'un agenda vers un autre. Une opération de dédoublonnage des lieux est effectuée selon deux critères de similitude:

 * La proximité géographique des lieux
 * La distance levenshtein entre leurs noms

Un identifiant de lieu peut être saisi sur le formulaire d'édition des fiches événements liées depuis l'agenda source pour forcer une opération de dédoublonnage pour les lieux doublons qui n'auraient pas été identifiés automatiquement.

Un email est envoyé en fin d'execution avec une pièce jointe au format csv contenant la liste des lieux synchronisés.
