// --- CONFIGURATION GLOBAL ---
const GITHUB_OWNER = 'Ghis2005'; 
const GITHUB_REPO = 'mes-cours';
const GITHUB_BRANCH = 'main'; 
const COURS_FOLDER = 'cours';
// ----------------------------

let cachedToken = ''; // Stocké uniquement en mémoire pendant la session d'administration

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('course-list')) {
        initIndex();
    }
    if (document.getElementById('btn-load-admin')) {
        initAdmin();
    }
});

/* Helper pour extraire le nom propre sans extension */
function getCleanName(filename) {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex !== -1 ? filename.substring(0, lastDotIndex) : filename;
}

/* =========================================================
   LOGIQUE DE LA PAGE D'ACCUEIL PUBLIC (index.html)
========================================================= */
let allFilesData = [];

async function initIndex() {
    const listContainer = document.getElementById('course-list');
    try {
        const treeUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/trees/${GITHUB_BRANCH}?recursive=1`;
        const response = await fetch(treeUrl);
        if (!response.ok) throw new Error("Impossible de récupérer l'arborescence publique.");

        const data = await response.json();
        const prefix = `${COURS_FOLDER}/`;
        const courseFiles = data.tree.filter(item => item.type === 'blob' && item.path.startsWith(prefix));

        allFilesData = courseFiles.map(file => parseGitPath(file));

        populateFilterOptions();
        
        // Affichage direct des cours
        await renderCourses(allFilesData);
        
        setupSearchAndFilterListeners();
        setupModal();
    } catch (error) {
        listContainer.innerHTML = `<p class="status-error" style="display:block;">Erreur : ${error.message}</p>`;
    }
}

function parseGitPath(file) {
    const relativePath = file.path.substring(`${COURS_FOLDER}/`.length);
    const parts = relativePath.split('/');
    const filename = parts[parts.length - 1];
    
    const annee = parts[0] || 'Non classe';
    const semestre = parts.length > 2 ? parts[1] : 'General';
    const matiere = parts.length > 3 ? parts[2] : (parts.length > 2 ? parts[1] : 'General');
    
    let theme = '';
    if (parts.length > 4) {
        theme = parts.slice(3, parts.length - 1).join(' > ');
    }

    const ext = filename.split('.').pop().toLowerCase();
    const downloadUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${file.path}`;

    return {
        sha: file.sha,
        fullPath: file.path,
        name: filename,
        cleanName: getCleanName(filename),
        annee: annee,
        semestre: semestre,
        matiere: matiere,
        theme: theme,
        extension: ext,
        downloadUrl: downloadUrl,
        searchString: `${filename} ${annee} ${semestre} ${matiere} ${theme}`.toLowerCase()
    };
}

function populateFilterOptions() {
    const annees = new Set(), semestres = new Set(), matieres = new Set();
    allFilesData.forEach(f => { annees.add(f.annee); semestres.add(f.semestre); matieres.add(f.matiere); });
    buildSelectOptions('filter-annee', annees);
    buildSelectOptions('filter-semestre', semestres);
    buildSelectOptions('filter-matiere', matieres);
}

function buildSelectOptions(elementId, setValues) {
    const select = document.getElementById(elementId);
    select.innerHTML = select.options[0].outerHTML; 
    Array.from(setValues).sort().forEach(val => {
        const opt = document.createElement('option');
        opt.value = val; opt.textContent = val; select.appendChild(opt);
    });
}

// Fonction d'affichage simplifiée (Zéro compteur, chargement instantané)
async function renderCourses(courses) {
    const listContainer = document.getElementById('course-list');
    listContainer.innerHTML = '';
    
    if (courses.length === 0) {
        listContainer.innerHTML = '<p class="text-muted">Aucun cours trouvé.</p>';
        return;
    }
    
    for (const course of courses) {
        // Gestion du bouton d'action selon l'extension sans appel d'API
        let actionBtn = '';
        if (course.extension === 'md') {
            actionBtn = `<button class="btn btn-primary" onclick="readMarkdown('${encodeURI(course.downloadUrl)}')">Lire en ligne</button>`;
        } else {
            actionBtn = `<a href="${course.downloadUrl}" target="_blank" class="btn btn-outline" download>Ouvrir / Télécharger</a>`;
        }

        // Génération visuelle de la carte épurée
        const card = document.createElement('div');
        card.className = 'card course-card';
        card.innerHTML = `
            <div>
                <div class="course-meta">
                    <span class="meta-tag">⚡ ${course.extension.toUpperCase()}</span>
                    <span class="meta-tag">🎓 ${course.annee}</span>
                    <span class="meta-tag">📅 ${course.semestre}</span>
                    <span class="meta-tag">📖 ${course.matiere}</span>
                    ${course.theme ? `<span class="meta-tag">📌 ${course.theme}</span>` : ''}
                </div>
                <h3>${course.cleanName}</h3>
            </div>
            ${actionBtn}
        `;
        listContainer.appendChild(card);
    }
}

function setupSearchAndFilterListeners() {
    const searchInput = document.getElementById('search-input');
    const filterAnnee = document.getElementById('filter-annee');
    const filterSemestre = document.getElementById('filter-semestre');
    const filterMatiere = document.getElementById('filter-matiere');
    const filterType = document.getElementById('filter-type');

    const runFiltering = async () => {
        const query = searchInput.value.trim().toLowerCase();
        const filtered = allFilesData.filter(f => {
            if (query && !f.searchString.includes(query)) return false;
            if (filterAnnee.value !== 'all' && f.annee !== filterAnnee.value) return false;
            if (filterSemestre.value !== 'all' && f.semestre !== filterSemestre.value) return false;
            if (filterMatiere.value !== 'all' && f.matiere !== filterMatiere.value) return false;
            if (filterType.value !== 'all') {
                if (filterType.value === 'md' && f.extension !== 'md') return false;
                if (filterType.value === 'pdf' && f.extension !== 'pdf') return false;
                if (filterType.value === 'image' && !['png','jpg','jpeg','gif'].includes(f.extension)) return false;
            }
            return true;
        });
        await renderCourses(filtered);
    };

    [searchInput, filterAnnee, filterSemestre, filterMatiere, filterType].forEach(el => el.addEventListener('input', runFiltering));
}

async function readMarkdown(url) {
    const viewer = document.getElementById('md-viewer');
    const modal = document.getElementById('course-modal');
    viewer.innerHTML = '<i>Chargement...</i>';
    modal.style.display = 'block';
    try {
        const response = await fetch(url);
        const mdText = await response.text();
        viewer.innerHTML = marked.parse(mdText);
        if (window.renderMathInElement) {
            renderMathInElement(viewer, {
                delimiters: [
                    {left: '$$', right: '$$', display: true}, {left: '$', right: '$', display: false},
                    {left: '\\(', right: '\\)', display: false}, {left: '\\[', right: '\\]', display: true}
                ], throwOnError: false
            });
        }
    } catch (e) { viewer.innerHTML = `<p class="status-error">Erreur de lecture.</p>`; }
}

function setupModal() {
    const modal = document.getElementById('course-modal');
    document.querySelector('.close-btn').onclick = () => modal.style.display = 'none';
    window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
}


/* =========================================================
   LOGIQUE DE L'ESPACE D'ADMINISTRATION (admin.html)
========================================================= */
let adminFilesList = [];

function initAdmin() {
    const btnLoad = document.getElementById('btn-load-admin');
    btnLoad.addEventListener('click', async () => {
        const patInput = document.getElementById('github-pat').value.trim();
        if (!patInput) { alert('Veuillez coller un Token.'); return; }
        cachedToken = patInput;
        await refreshAdminWorkspace();
    });

    // Formulaire d'upload direct
    document.getElementById('upload-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleUpload();
    });
}

async function refreshAdminWorkspace() {
    showGlobalStatus('Chargement des structures de données...', 'warning');
    try {
        const treeUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/trees/${GITHUB_BRANCH}?recursive=1`;
        const response = await fetch(treeUrl, {
            headers: { 'Authorization': `Bearer ${cachedToken}` }
        });

        if (!response.ok) throw new Error("Token invalide ou droits insuffisants sur le dépôt.");

        const data = await response.json();
        const prefix = `${COURS_FOLDER}/`;
        const courseFiles = data.tree.filter(item => item.type === 'blob' && item.path.startsWith(prefix));
        
        adminFilesList = courseFiles.map(file => parseGitPath(file));

        populateDatalists();
        renderAdminManagementList();

        document.getElementById('admin-workspace').style.display = 'block';
        showGlobalStatus('Espace d\'administration connecté et synchronisé.', 'success');
    } catch (err) {
        document.getElementById('admin-workspace').style.display = 'none';
        showGlobalStatus(`Erreur : ${err.message}`, 'error');
    }
}

function populateDatalists() {
    const annees = new Set(), semestres = new Set(), matieres = new Set(), themes = new Set();
    adminFilesList.forEach(f => {
        if(f.annee) annees.add(f.annee);
        if(f.semestre) semestres.add(f.semestre);
        if(f.matiere) matieres.add(f.matiere);
        if(f.theme) themes.add(f.theme);
    });

    fillDatalist('annees-list', annees);
    fillDatalist('semestres-list', semestres);
    fillDatalist('matieres-list', matieres);
    fillDatalist('themes-list', themes);
}

function fillDatalist(id, setValues) {
    const dl = document.getElementById(id);
    dl.innerHTML = '';
    Array.from(setValues).sort().forEach(val => {
        if(!val || val === 'General' || val === 'Non classe') return;
        const opt = document.createElement('option');
        opt.value = val;
        dl.appendChild(opt);
    });
}

function renderAdminManagementList() {
    const container = document.getElementById('admin-management-list');
    container.innerHTML = '';

    if (adminFilesList.length === 0) {
        container.innerHTML = '<p class="text-muted">Aucun fichier présent sur GitHub.</p>';
        return;
    }

    adminFilesList.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'management-item';
        item.innerHTML = `
            <div class="management-item-header">
                <div class="management-item-path">
                    <strong>[${file.extension.toUpperCase()}]</strong> 
                    ${file.annee} / ${file.semestre} / ${file.matiere} / ${file.theme ? file.theme + ' / ' : ''} <u>${file.name}</u>
                </div>
                <div class="management-actions">
                    <button class="btn btn-warning" onclick="toggleEditZone(${index})">Modifier / Déplacer</button>
                    <button class="btn btn-danger" onclick="deleteFile('${encodeURIComponent(file.fullPath)}', '${file.sha}')">Supprimer</button>
                </div>
            </div>
            
            <div id="edit-zone-${index}" class="edit-zone" style="display:none;">
                <div class="form-grid">
                    <div class="form-group">
                        <label>Nouvelle Année</label>
                        <input type="text" id="edit-annee-${index}" value="${file.annee}">
                    </div>
                    <div class="form-group">
                        <label>Nouveau Semestre</label>
                        <input type="text" id="edit-semestre-${index}" value="${file.semestre}">
                    </div>
                </div>
                <div class="form-grid">
                    <div class="form-group">
                        <label>Nouvelle Matière</label>
                        <input type="text" id="edit-matiere-${index}" value="${file.matiere}">
                    </div>
                    <div class="form-group">
                        <label>Nouveau Thème</label>
                        <input type="text" id="edit-theme-${index}" value="${file.theme}">
                    </div>
                </div>
                <div class="form-group" style="margin-bottom:10px;">
                    <label>Nom complet du fichier (avec extension)</label>
                    <input type="text" id="edit-name-${index}" value="${file.name}">
                </div>
                <button class="btn btn-primary" onclick="moveFile(${index})">Appliquer les changements</button>
            </div>
        `;
        container.appendChild(item);
    });
}

function toggleEditZone(index) {
    const zone = document.getElementById(`edit-zone-${index}`);
    zone.style.display = zone.style.display === 'none' ? 'block' : 'none';
}

async function deleteFile(encodedPath, sha) {
    const path = decodeURIComponent(encodedPath);
    if (!confirm(`Voulez-vous vraiment supprimer définitivement le cours : \n${path} ?`)) return;

    showGlobalStatus('Suppression en cours...', 'warning');
    try {
        const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(path)}`;
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${cachedToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Suppression via interface Admin : ${path}`,
                sha: sha,
                branch: GITHUB_BRANCH
            })
        });

        if (!response.ok) throw new Error("Échec de la suppression sur GitHub.");

        showGlobalStatus('Fichier supprimé avec succès !', 'success');
        await refreshAdminWorkspace();
    } catch (err) {
        showGlobalStatus(`Erreur de suppression : ${err.message}`, 'error');
    }
}

async function moveFile(index) {
    const oldFile = adminFilesList[index];
    
    const newAnnee = document.getElementById(`edit-annee-${index}`).value.trim();
    const newSemestre = document.getElementById(`edit-semestre-${index}`).value.trim();
    const newMatiere = document.getElementById(`edit-matiere-${index}`).value.trim();
    const newTheme = document.getElementById(`edit-theme-${index}`).value.trim();
    const newName = document.getElementById(`edit-name-${index}`).value.trim();

    let newPath = `${COURS_FOLDER}/${newAnnee}/${newSemestre}/${newMatiere}`;
    if (newTheme) newPath += `/${newTheme}`;
    newPath += `/${newName}`;

    if (oldFile.fullPath === newPath) {
        alert("Aucun changement détecté dans l'arborescence ou le nom.");
        return;
    }

    showGlobalStatus('Déplacement du fichier en cours...', 'warning');

    try {
        const getUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(oldFile.fullPath)}?ref=${GITHUB_BRANCH}`;
        const getResponse = await fetch(getUrl, {
            headers: { 'Authorization': `Bearer ${cachedToken}` }
        });
        if (!getResponse.ok) throw new Error("Impossible de lire le fichier d'origine.");
        const oldFileData = await getResponse.json();
        const base64Content = oldFileData.content;

        const putUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(newPath)}`;
        const putResponse = await fetch(putUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${cachedToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Déplacement de structure : ${oldFile.name} -> ${newPath}`,
                content: base64Content,
                branch: GITHUB_BRANCH
            })
        });
        if (!putResponse.ok) throw new Error("Impossible de créer le fichier à la nouvelle destination.");

        const deleteUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(oldFile.fullPath)}`;
        await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${cachedToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Nettoyage après déplacement : Suppression de ${oldFile.fullPath}`,
                sha: oldFile.sha,
                branch: GITHUB_BRANCH
            })
        });

        showGlobalStatus('Arborescence et fichier mis à jour avec succès !', 'success');
        await refreshAdminWorkspace();
    } catch (err) {
        showGlobalStatus(`Erreur lors du déplacement : ${err.message}`, 'error');
    }
}

async function handleUpload() {
    const annee = document.getElementById('course-annee').value.trim();
    const semestre = document.getElementById('course-semestre').value.trim();
    const matiere = document.getElementById('course-matiere').value.trim();
    const theme = document.getElementById('course-theme').value.trim();
    const fileInput = document.getElementById('file-input');
    const submitBtn = document.getElementById('submit-btn');

    if (!fileInput.files.length) return;
    const file = fileInput.files[0];

    submitBtn.disabled = true;
    submitBtn.textContent = 'Envoi...';
    showGlobalStatus('Téléversement du nouveau cours...', 'warning');

    let targetPath = `${COURS_FOLDER}/${annee}/${semestre}/${matiere}`;
    if (theme) targetPath += `/${theme}`;
    targetPath += `/${file.name}`;

    const reader = new FileReader();
    reader.onload = async (evt) => {
        const base64Content = evt.target.result.split(',')[1];
        try {
            const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(targetPath)}`;
            const response = await fetch(apiUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${cachedToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `Upload automatique : ${targetPath}`,
                    content: base64Content,
                    branch: GITHUB_BRANCH
                })
            });

            if (response.status === 201) {
                showGlobalStatus(`Succès ! Cours ajouté : ${file.name}`, 'success');
                document.getElementById('upload-form').reset();
                await refreshAdminWorkspace();
            } else if (response.status === 422) {
                throw new Error("Un fichier possède déjà exactement ce nom dans ce dossier.");
            } else {
                throw new Error("Erreur de réponse de l'API GitHub.");
            }
        } catch (err) {
            showGlobalStatus(`Erreur : ${err.message}`, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Publier le cours';
        }
    };
    reader.readAsDataURL(file);
}

function showGlobalStatus(text, type) {
    const msgDiv = document.getElementById('global-status-message');
    msgDiv.textContent = text;
    msgDiv.className = `status-box status-${type}`;
    msgDiv.style.display = 'block';
}
