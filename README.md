# 📚 Plateforme de Partage de Cours (GitHub / GitLab Backend)

Bienvenue sur cette plateforme de centralisation et de partage de cours ! Ce projet a été conçu pour permettre aux étudiants d'accéder facilement, rapidement et de manière structurée à l'ensemble des ressources pédagogiques (cours, TD, annales, TP).

Le site web utilise un dépôt **GitHub** (ou **GitLab**) comme base de données pour stocker les fichiers, et offre une interface web intuitive pour les consulter et les administrer.

---

## 🚀 Fonctionnalités

- **Visualisation claire :** Classement automatique des cours par Année (ex: 1ère Année), Semestre, Matière et Thème.
- **Espace Admin intégré :** Un panneau de gestion (`admin.html`) permet aux administrateurs/délégués d'uploader de nouveaux fichiers et de réorganiser les dossiers directement depuis l'interface web grâce à un *Personal Access Token*.
- **Suggestions dynamiques :** Lors de l'ajout d'un cours, le formulaire suggère automatiquement les dossiers déjà existants pour éviter les fautes de frappe et doublons.
- **Compteur de téléchargements :** Un indicateur visuel affiche le nombre de fois que chaque fichier a été consulté/téléchargé.

---

## 📖 Comment ça fonctionne pour les Étudiants ?

1. **Accès au site :** Ouvrez simplement le fichier `index.html` dans votre navigateur (ou accédez au lien si le site est hébergé en ligne).
2. **Navigation :** Filtrez les cours par année ou matière via les menus de navigation.
3. **Téléchargement :** Cliquez sur le bouton de téléchargement à côté du cours souhaité. Par mesure de sécurité, le fichier se téléchargera directement sur votre machine.

---

## ⚙️ Guide pour les Administrateurs (Ajouter / Modifier des cours)

Pour téléverser (uploader) des documents, vous devez utiliser la page `admin.html`.

### 1. Obtenir un Token d'accès (PAT)
Pour que la page web puisse modifier le dépôt à votre place, elle a besoin d'une clé d'autorisation (Token) :
- **Sur GitHub :** Allez dans *Settings* -> *Developer Settings* -> *Personal Access Tokens (classic)* -> *Generate new token*. Cochez la case **`repo`** et copiez le jeton généré (`ghp_...`).
- **Sur GitLab :** Allez dans *Preferences* -> *Access Tokens* -> *Add new token*. Cochez les scopes **`api`** ou **`write_repository`**.

### 2. Utiliser l'interface d'ajout
1. Ouvrez `admin.html`.
2. Collez votre Token dans le champ **GitHub Personal Access Token (PAT)** tout en haut.
3. Remplissez les informations du cours :
   - *Année / Semestre / Matière :* Vous pouvez taper ce que vous voulez, ou cliquer sur le champ pour voir et sélectionner les dossiers déjà existants (suggestions automatiques).
4. Sélectionnez le fichier sur votre ordinateur.
5. Cliquez sur **Publier le cours**. Le fichier sera automatiquement classé dans la bonne arborescence sur le dépôt !

---

## 🛠️ Structure du Projet

```text
├── index.html        # Page d'accueil publique (affichage et téléchargement des cours)
├── admin.html        # Interface de gestion (upload, modification, suppression)
├── css/
│   └── style.css     # Styles graphiques de l'application
└── js/
    └── app.js        # Logique JavaScript (Appels API GitHub/GitLab, compteurs, filtres)