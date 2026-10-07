# Rapport journalier de caisse

## Objectif

Modifier le modèle de rapport journalier et mensuel (pour une date donnéee) dans l’application,  simple, lisible et adapté à la gestion multi-devises (USD et CDF).

## 1. En-tête

Afficher :

- **RAPPORT JOURNALIER DE CAISSE**
- La date du rapport, par exemple : `7 oct. 2026`

## 2. Synthèse

Afficher une seule ligne par devise présente dans la caisse.

| Devise | Entrées | Sorties | Solde |
|---|---:|---:|---:|
| USD | + 250,00 $US | − 0,00 $US | **250,00 $US** |
| CDF | + 0,00 CDF | − 0,00 CDF | **10 000,00 CDF** |

### Règles

- Le **solde** est la valeur visuellement dominante.
- Ne jamais convertir USD en CDF dans cette section.
- Chaque devise possède son propre solde.
- Une devise sans mouvement du jour doit quand même apparaître si elle possède un solde.
- Une devise sans mouvement et sans solde peut être masquée.

## 3. Opérations

Afficher toutes les opérations de caisse du jour.

| # | Opérateur | Description | Montant |
|---|---|---|---:|
| 1 | Ruth | Facture FACTURE-2026-0007, cash | + 250,00 $US |

### Colonnes pour le journalier

- #
- Opérateur
- Description
- Montant
### Colonnes pour le mensuel
 - # 
 - Date
 - Opérateur
 - Description
 - Montant

 | # |Date | Opérateur | Description | Montant |
|---|---| |---| ---|---:|
| 1| 2 juil. 26 |Ruth| | Facture FACTURE-2026-0007, cash | + 250,00 $US |


Le **mode de paiement** doit être intégré à la description et ne doit pas avoir sa propre colonne.

Exemple :

`Facture FACTURE-2026-0007, cash`

## 4. Tri

Les opérations doivent être triées par heure ou date croissante :

```text
08:15
09:30
11:42

2 juil.
3 juil.