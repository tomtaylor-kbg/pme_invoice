# Module Commandes — Imprimerie

## Objectif

Recoder le module **Commandes** de l’application de gestion de l’imprimerie avec un workflow simple centré sur deux acteurs :

- **Gestionnaire des commandes**
- **Opérateur**

La commande représente le travail demandé par un client et à traiter par l’imprimerie.

Le module doit rester simple. Ne pas mélanger inutilement les responsabilités des commandes avec celles des factures, paiements ou de la caisse.

---

## 1. Acteurs

### Gestionnaire des commandes

Responsable du pilotage des commandes.

Permissions :

- créer une commande ;
- consulter les commandes ;
- modifier les informations d’une commande avant son traitement ;
- définir la priorité ;
- définir la date prévue ;
- affecter une commande à un opérateur ;
- modifier l’opérateur affecté ;
- suivre l’avancement ;
- consulter les commandes terminées ;
- contrôler/valider le travail terminé ;
- éventuellement déclencher la suite du processus (BL/livraison selon les modules existants).

Question métier :

> Qu’est-ce qui doit être fait, par qui et pour quand ?

### Opérateur

Responsable de l’exécution du travail.

Permissions :

- consulter uniquement les commandes qui lui sont affectées ;
- consulter les détails nécessaires au traitement ;
- commencer le traitement ;
- signaler un problème/blocage ;
- terminer le traitement ;
- consulter l’historique de sa commande.

L’opérateur ne doit pas avoir accès aux fonctions financières simplement parce qu’il traite les commandes.

Question métier :

> Qu’est-ce que je dois faire et quel est l’état de mon travail ?

---

## 2. Données minimales d’une commande

Une commande doit contenir au minimum :

```text
Commande
├── id
├── numéro
├── client
├── date de création
├── date prévue
├── priorité
├── statut
├── description du travail
├── quantité
├── gestionnaire
├── opérateur affecté
└── notes
```

Ne pas ajouter de complexité inutile dans cette première version.

Les informations détaillées sur les produits/services, factures, paiements et BL doivent rester dans leurs modules respectifs et être reliées à la commande lorsque nécessaire.

---

## 3. Statuts

Workflow principal :

```text
EN_ATTENTE
    ↓
ASSIGNEE
    ↓
EN_COURS
    ↓
TERMINEE
    ↓
LIVREE
```

Prévoir également :

```text
BLOQUEE
ANNULEE
```

### Signification

- **EN_ATTENTE** : commande créée mais pas encore affectée.
- **ASSIGNEE** : un opérateur est affecté.
- **EN_COURS** : l’opérateur a commencé le travail.
- **BLOQUEE** : le traitement ne peut pas continuer ; l’opérateur doit fournir un motif.
- **TERMINEE** : le travail demandé est terminé par l’opérateur.
- **LIVREE** : le travail a été remis au client.
- **ANNULEE** : commande annulée.

Éviter les changements arbitraires de statut. Les transitions doivent respecter le workflow.

---

## 4. Flux métier

```text
Gestionnaire
    │
    │ crée / valide
    ▼
Commande EN_ATTENTE
    │
    │ affectation
    ▼
Commande ASSIGNEE
    │
    │ opérateur commence
    ▼
Commande EN_COURS
    │
    ├── problème ──► BLOQUEE
    │                  │
    │                  └── reprise ──► EN_COURS
    │
    ▼
TERMINEE
    │
    │ contrôle / livraison
    ▼
LIVREE
```

Le gestionnaire doit pouvoir voir clairement où se trouve chaque commande dans ce processus.

---

## 5. Interface — Gestionnaire

### Liste des commandes

Créer une page `Commandes` avec :

- bouton **Nouvelle commande** ;
- recherche ;
- filtre par statut ;
- filtre par priorité ;
- filtre par opérateur ;
- filtre par date ;
- tableau des commandes.

Colonnes recommandées :

```text
N° | Client | Travail | Échéance | Priorité | Opérateur | Statut | Action
```

Ajouter éventuellement des compteurs en haut :

```text
Toutes
En attente
En cours
Bloquées
Terminées
```

### Détail d’une commande

Afficher :

```text
Numéro
Client
Travail demandé
Quantité
Date de création
Date prévue
Priorité
Gestionnaire
Opérateur
Statut
Notes
```

Afficher également une progression visuelle :

```text
✓ En attente → ✓ Assignée → ● En cours → ○ Terminée → ○ Livrée
```

Actions selon le statut :

- Affecter
- Réaffecter
- Modifier
- Voir le détail
- Contrôler
- Marquer comme livrée
- Annuler si autorisé

---

## 6. Interface — Opérateur

Créer une vue **Mes commandes**.

L’opérateur ne voit que les commandes qui lui sont affectées.

Chaque commande doit afficher au minimum :

```text
N° commande
Client
Travail demandé
Quantité
Date prévue
Priorité
Statut
```

Actions :

### Commande ASSIGNEE

```text
[Commencer]
```

### Commande EN_COURS

```text
[Terminer]
[Signaler un problème]
```

### Commande BLOQUEE

Afficher le motif du blocage et permettre la reprise lorsque le problème est résolu.

L’interface opérateur doit être plus simple que celle du gestionnaire.

---

## 7. Historique / audit

Tracer les événements importants :

```text
Commande créée
Commande affectée à un opérateur
Opérateur changé
Statut changé
Commande bloquée
Commande reprise
Commande terminée
Commande livrée
Commande annulée
```

Chaque événement doit idéalement contenir :

```text
acteur
date/heure
ancienne valeur
nouvelle valeur
commentaire/motif si nécessaire
```

Ne pas supprimer silencieusement l’historique.

---

## 8. Règles métier

1. Une commande doit avoir un client.
2. Une commande créée commence en `EN_ATTENTE`.
3. Une commande `EN_ATTENTE` peut être affectée à un opérateur.
4. L’affectation fait passer la commande à `ASSIGNEE`.
5. Seul l’opérateur affecté peut démarrer le traitement.
6. L’opérateur peut signaler un blocage avec un motif.
7. L’opérateur peut terminer une commande qu’il traite.
8. Le gestionnaire peut contrôler et suivre les commandes.
9. Une commande annulée ne doit plus pouvoir être traitée normalement.
10. Les actions importantes doivent être enregistrées dans l’audit.
11. Ne pas donner à l’opérateur les permissions de facturation, paiement ou caisse.
12. Ne pas supprimer physiquement une commande terminée ou livrée sans règle métier explicite.

---

## 9. Architecture

Conserver l’architecture actuelle du projet.

Avant de modifier le code :

1. inspecter le modèle Prisma existant concernant les commandes ;
2. inspecter les rôles et permissions existants ;
3. inspecter les routes/API existantes ;
4. inspecter les composants UI existants ;
5. réutiliser les composants et conventions déjà présents ;
6. éviter de créer une nouvelle architecture si l’existant permet de faire le travail.

Ne pas casser les modules existants : clients, factures, paiements, reçus, caisse, BL, utilisateurs et audit.

---

## 10. Priorité d’implémentation

Implémenter dans cet ordre :

### Phase 1
- modèle de données ;
- rôles/permissions ;
- statuts ;
- API CRUD minimale.

### Phase 2
- page liste des commandes ;
- création ;
- détail ;
- affectation à un opérateur.

### Phase 3
- vue opérateur « Mes commandes » ;
- démarrage ;
- blocage ;
- reprise ;
- terminaison.

### Phase 4
- historique ;
- validation/contrôle par le gestionnaire ;
- livraison.

### Phase 5
- intégration avec BL/facturation si nécessaire.

---

## Principe général

Le module doit rester centré sur cette logique :

> **Le gestionnaire organise et contrôle.  
> L’opérateur exécute.**

La commande répond principalement à :

> **Qui a demandé quoi, pour quand, et qui doit le traiter ?**
