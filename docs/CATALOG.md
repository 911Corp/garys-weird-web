# Catalogue

Contrôles du 2026-11-04, et du 2026-11-05 pour le tour 9 (GWW-0688 à GWW-0800). Chaque fiche porte la date du contrôle qui l'a validée.

## Statuts

| Statut | Sens |
| --- | --- |
| Vérifié | Page servie, comparée à sa fiche. HTTPS : rendue dans Chromium et regardée. |
| Vérifié via navigateur du propriétaire | Page ouverte depuis le navigateur intégré, titre et texte relevés (`owner-browser`). |
| HTTP seul | Texte relevé, pas de capture (`http-fetch`). |
| Owner approved | Publié à la demande du propriétaire sans contrôle : le site a bloqué tous les contrôles. L'app l'indique. |
| Quarantaine | Non publié, avec la raison dans `catalog/pending.json`. |

## Revue de sécurité et mobile

`safety_reviewed` veut dire : aucun pop-up, aucune boîte de dialogue, aucun téléchargement automatique pendant le chargement,
et domaine absent de la liste publique StevenBlack hosts. Ce contrôle est automatisé. Ce n'est ni un antivirus, ni un audit,
et il ne dit rien du contenu derrière un clic.

`mobile_checked` veut dire : page chargée en profil Pixel 7. `mobile_ok` vaut faux si la page annonce vouloir un ordinateur
ou déborde nettement de l'écran sans être un canvas. Rien n'a été essayé sur un vrai téléphone.

Une page qui répondait puis échoue au contrôle suivant (5xx) est retirée du tirage et porte `down_on_recheck`.

## Sites trop connus

La base évite les sites trop connus, sauf s'ils sont vraiment très originaux : ils ont alors un passe-droit.
Les fiches retirées sont listées dans `catalog/source/too-known.txt`. Leur ligne reste dans `entries.tsv` pour que les numéros de dossier ne bougent pas.
C'est un jugement éditorial : ajouter ou retirer une URL de ce fichier suffit à changer la décision.

## Sélection

Écartés : pages clignotantes (risque photosensible), sites surtout commerciaux, contenus vulgaires ou politiques peu adaptés
à un tirage aléatoire, doublons, domaines parqués ou rachetés, pages impossibles à juger.
Les raisons sont dans `catalog/source/not-selected.tsv`.

RANDOM ne tire pas les fiches de weirdness 1, qui restent consultables dans Archive.
