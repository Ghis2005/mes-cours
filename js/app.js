// --- CONFIGURATION GLOBAL ---
const GITHUB_OWNER = 'VOTRE_PSEUDO'; 
const GITHUB_REPO = 'VOTRE_REPO';
const GITHUB_BRANCH = 'main'; 
const COURS_FOLDER = 'cours';
// ----------------------------

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('course-list')) {
        initIndex();
    }
    if (document.getElementById('upload-form')) {
        initAdmin();
    }
});

/* =========================================================
   LOGIQUE CLIENT : INDEX.HTML (Recherche & Filtres)
========================================================= */
let allFilesData = [];

async function initIndex() {
    const listContainer = document.getElementById('course-list');
    
    try {
        // Utilisation de l'API Git Trees Récursive pour récupérer TOUTE l'arborescence d'un coup
        const treeUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/trees/${GITHUB_BRANCH}?recursive=1`;
        const response = await fetch(treeUrl);
        
        if (!response.ok) {
            throw new Error("Impossible de récupérer l'arborescence GitHub. Vérifiez la configuration.");
        }

        const data = await response.json();
        
        // Filtrer uniquement pour garder les fichiers situés dans le dossier "cours"
        const prefix = `${COURS_FOLDER}/`;
        const courseFiles = data.tree.filter(item => item.type === 'blob' && item.path.startsWith(prefix));

        // Parser les structures de dossiers de chaque fichier
        allFilesData = courseFiles.map(file => {
            const relativePath = file.path.substring(prefix.length); // supprime "cours/"
            const parts = relativePath.split('/');
            
            // Structure attendue : Annee / Semestre / Matiere / (Theme Optionnel) / NomFichier
            const filename = parts[parts.length - 1];
            const annee = parts[0] || 'Non classe';
            const semestre = parts.length > 2 ? parts[1] : 'General';
            const matiere = parts.length > 3 ? parts[2] : (parts.length > 2 ? parts[1] : 'General');
            
            // Le thème correspond à ce qui se trouve entre la matière et le fichier
            let theme = '';
            if (parts.length > 4) {
                theme = parts.slice(3, parts.length - 1).join(' > ');
            }

            const ext = filename.split('.').pop().toLowerCase();
            // Génération de l'URL directe de téléchargement/lecture brute (Raw Content)
            const downloadUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${file.path}`;

            return {
                name: filename,
                annee: annee,
                semestre: semestre,
                matiere: matiere,
                theme: theme,
                extension: ext,
                downloadUrl: downloadUrl,
                searchString: `${filename} ${annee} ${semestre} ${matiere} ${theme}`.toLowerCase()
            };
        });

        populateFilterOptions();
        renderCourses(allFilesData);
        setupSearchAndFilterListeners();
        setupModal();

    } catch (error) {
        listContainer.innerHTML = `<p class="status-error" style="display:block;">Erreur : ${error.message}</p>`;
    }
}

// Remplissage dynamique des balises <select> à partir des données réelles trouvées
function populateFilterOptions() {
    const annees = new Set();
    const semestres = new Set();
    const matieres = new Set();

    allFilesData.forEach(f => {
        annees.add(f.annee);
        semestres.add(f.semestre);
        matieres.add(f.matiere);
    });

    buildSelectOptions('filter-annee', annees);
    buildSelectOptions('filter-semestre', semestres);
    buildSelectOptions('filter-matiere', matieres);
}

function buildSelectOptions(elementId, setValues) {
    const select = document.getElementById(elementId);
    // Conserver uniquement l'option par défaut ("Tous")
    select.innerHTML = select.options[0].outerHTML; 
    
    Array.from(setValues).sort().forEach(val => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val;
        select.appendChild(opt);
    });
}

function renderCourses(courses) {
    const listContainer = document.getElementById('course-list');
    listContainer.innerHTML = '';

    if (courses.length === 0) {
        listContainer.innerHTML = '<p class="text-muted">Aucun cours ne correspond à vos critères ou à votre recherche.</p>';
        return;
    }

    courses.forEach(course => {
        let actionBtn = '';
        if (course.extension === 'md') {
            actionBtn = `<button class="btn btn-primary" onclick="readMarkdown('${encodeURI(course.downloadUrl)}')">Lire en ligne</button>`;
        } else {
            actionBtn = `<a href="${course.downloadUrl}" target="_blank" class="btn btn-outline">Ouvrir / Télécharger</a>`;
        }

        const themeBadge = course.theme ? `<span class="meta-tag">📌 ${course.theme}</span>` : '';

        const card = document.createElement('div');
        card.className = 'card course-card';
        card.innerHTML = `
            <div>
                <div class="course-meta">
                    <span class="meta-tag">🎓 ${course.annee}</span>
                    <span class="meta-tag">📅 ${course.semestre}</span>
                    <span class="meta-tag">📖 ${course.matiere}</span>
                    ${themeBadge}
                </div>
                <h3>${course.name}</h3>
            </div>
            ${actionBtn}
        `;
        listContainer.appendChild(card);
    });
}

// Écouteurs combinés (Recherche textuelle instantanée + Sélecteurs)
function setupSearchAndFilterListeners() {
    const searchInput = document.getElementById('search-input');
    const filterAnnee = document.getElementById('filter-annee');
    const filterSemestre = document.getElementById('filter-semestre');
    const filterMatiere = document.getElementById('filter-matiere');
    const filterType = document.getElementById('filter-type');

    const runFiltering = () => {
        const query = searchInput.value.trim().toLowerCase();
        const anneeVal = filterAnnee.value;
        const semestreVal = filterSemestre.value;
        const matiereVal = filterMatiere.value;
        const typeVal = filterType.value;

        const filtered = allFilesData.filter(f => {
            // Check recherche textuelle
            if (query && !f.searchString.includes(query)) return false;
            // Check Filtres sélecteurs
            if (anneeVal !== 'all' && f.annee !== anneeVal) return false;
            if (semestreVal !== 'all' && f.semestre !== semestreVal) return false;
            if (matiereVal !== 'all' && f.matiere !== matiereVal) return false;
            
            // Check Format de fichier
            if (typeVal !== 'all') {
                if (typeVal === 'md' && f.extension !== 'md') return false;
                if (typeVal === 'pdf' && f.extension !== 'pdf') return false;
                if (typeVal === 'image' && !['png', 'jpg', 'jpeg', 'gif'].includes(f.extension)) return false;
            }
            return true;
        });

        renderCourses(filtered);
    };

    searchInput.addEventListener('input', runFiltering);
    filterAnnee.addEventListener('change', runFiltering);
    filterSemestre.addEventListener('change', runFiltering);
    filterMatiere.addEventListener('change', runFiltering);
    filterType.addEventListener('change', runFiltering);
}

// Visualisation Markdown et conversion de formules KaTeX
async function readMarkdown(url) {
    const viewer = document.getElementById('md-viewer');
    const modal = document.getElementById('course-modal');
    
    viewer.innerHTML = '<i>Chargement du cours...</i>';
    modal.style.display = 'block';

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error();
        const mdText = await response.text();
        
        viewer.innerHTML = marked.parse(mdText);

        if (window.renderMathInElement) {
            renderMathInElement(viewer, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false},
                    {left: '\\(', right: '\\)', display: false},
                    {left: '\\[', right: '\\]', display: true}
                ],
                throwOnError: false
            });
        }
    } catch (e) {
        viewer.innerHTML = `<p class="status-error" style="display:block;">Erreur lors de la récupération ou de l'affichage du fichier Markdown.</p>`;
    }
}

function setupModal() {
    const modal = document.getElementById('course-modal');
    const closeBtn = document.querySelector('.close-btn');
    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
}


/* =========================================================
   LOGIQUE GESTION : ADMIN.HTML (Création de Dossiers & Upload)
========================================================= */
function initAdmin() {
    const form = document.getElementById('upload-form');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const pat = document.getElementById('github-pat').value.trim();
        const annee = document.getElementById('course-annee').value.trim();
        const semestre = document.getElementById('course-semestre').value.trim();
        const matiere = document.getElementById('course-matiere').value.trim();
        const theme = document.getElementById('course-theme').value.trim();
        const fileInput = document.getElementById('file-input');
        const submitBtn = document.getElementById('submit-btn');
        
        if (!fileInput.files.length) return;
        const file = fileInput.files[0];
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Téléversement en cours...';
        
        // Masquer le précédent statut s'il existe
        const msgDiv = document.getElementById('status-message');
        msgDiv.style.display = 'none';

        // Nettoyage des chaînes pour éviter les doubles slashes optionnels si le thème est vide
        let targetPath = `${COURS_FOLDER}/${annee}/${semestre}/${matiere}`;
        if (theme) {
            targetPath += `/${theme}`;
        }
        targetPath += `/${file.name}`;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            const base64Content = evt.target.result.split(',')[1];
            
            try {
                // Utilisation de l'URL encodée pour gérer les espaces et caractères spéciaux dans le nom des répertoires
                const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(targetPath)}`;
                
                const response = await fetch(apiUrl, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${pat}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: `Dépôt de cours automatique : ${targetPath}`,
                        content: base64Content,
                        branch: GITHUB_BRANCH
                    })
                });

                if (response.status === 201) {
                    msgDiv.textContent = `Succès ! Fichier classé et envoyé avec succès dans : ${targetPath}`;
                    msgDiv.className = 'status-success';
                    msgDiv.style.display = 'block';
                    form.reset();
                } else if (response.status === 422) {
                    throw new Error("Un fichier possède déjà exactement ce nom dans ce dossier précis.");
                } else {
                    const errData = await response.json();
                    throw new Error(errData.message || "Erreur lors de la communication avec l'API GitHub.");
                }
            } catch (err) {
                msgDiv.textContent = `Erreur : ${err.message}`;
                msgDiv.className = 'status-error';
                msgDiv.style.display = 'block';
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Publier le cours';
            }
        };
        
        reader.readAsDataURL(file);
    });
}